import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { validateWorkspaceAccessOptimized } from '@/lib/validation/workspace-access-optimized'
import { validateIssueUpdate } from '@/lib/validation/issue-validation'
import { withTimeout, timeoutConfig } from '@/lib/middleware/timeout'
import { 
  withErrorHandler, 
  createUnauthorizedError, 
  createNotFoundError,
  createForbiddenError,
  createInternalServerError,
  createValidationError
} from '@/lib/middleware/error-handler'

async function handleGET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return createUnauthorizedError()
    }

    // Optimized: Verify workspace access and get workspace ID in one query
    const accessResult = await validateWorkspaceAccessOptimized(
      supabase,
      slug,
      user.id,
      true // slug is a slug, not an ID
    )

    if (!accessResult.workspaceExists) {
      return createNotFoundError('Workspace')
    }

    if (!accessResult.hasAccess) {
      return createForbiddenError('Access denied')
    }

    // Fetch issue data with creator info using the workspace ID from access check
    const { data: issue, error } = await supabase
      .from('issues')
      .select(`
        *,
        creator:creator_id (name, avatar_url)
      `)
      .eq('id', id)
      .eq('workspace_id', accessResult.workspaceId!)
      .single()

    if (error || !issue) {
      return createNotFoundError('Issue')
    }

    return NextResponse.json({ 
      issue,
      creator: issue.creator || { name: 'Unknown', avatar_url: null }
    })
  } catch (error) {
    console.error('Error fetching issue:', error)
    return createInternalServerError()
  }
}

async function handlePATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return createUnauthorizedError()
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch (error) {
      console.error('Failed to parse request body:', error)
      return createValidationError('Invalid JSON in request body')
    }
    
    const validation = validateIssueUpdate(body)
    
    if (!validation.valid) {
      console.error('Issue update validation failed:', {
        body,
        error: validation.error
      })
      return validation.error
    }
    
    const validatedData = validation.data

    // Optimized: Validate workspace access and get workspace ID in one query
    const accessResult = await validateWorkspaceAccessOptimized(
      supabase,
      slug,
      user.id,
      true // slug is a slug, not an ID
    )

    if (!accessResult.workspaceExists) {
      return createNotFoundError('Workspace')
    }

    if (!accessResult.hasAccess) {
      return createForbiddenError('Access denied')
    }

    const workspaceId = accessResult.workspaceId!

    // Verify issue belongs to workspace before updating
    const { data: existingIssue } = await supabase
      .from('issues')
      .select('id, workspace_id')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (!existingIssue) {
      return createNotFoundError('Issue')
    }

    // Build update object from validated data
    const updateData: Record<string, string | null | undefined> = {
      ...validatedData,
      updated_at: new Date().toISOString()
    }

    // Update the issue with workspace validation
    const { data: updatedIssue, error } = await supabase
      .from('issues')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      console.error('Error updating issue:', error)
      return createInternalServerError('Failed to update issue')
    }

    return NextResponse.json({ issue: updatedIssue })
  } catch (error) {
    console.error('Error updating issue:', error)
    return createInternalServerError()
  }
}

// Export the wrapped handlers with timeout and error handling
export const GET = withTimeout(withErrorHandler(handleGET), timeoutConfig.standard)
export const PATCH = withTimeout(withErrorHandler(handlePATCH), timeoutConfig.standard)