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
  createInternalServerError 
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
    const body = await request.json()
    const validation = validateIssueUpdate(body)
    
    if (!validation.valid) {
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
    const updateData: Record<string, string | number | null | undefined> = {
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
      console.error('Error updating issue:', {
        code: error.code,
        message: error.message,
        issueId: id,
        // Only log detailed info in development
        ...(process.env.NODE_ENV === 'development' && {
          details: error.details,
          hint: error.hint,
          updateData,
          workspaceId
        })
      })
      
      // Handle specific database errors
      if (error.code === '22P02' || error.message?.includes('invalid input syntax')) {
        return NextResponse.json(
          { 
            error: 'Invalid status value. Must be one of: todo, in_progress, in_review, done',
            code: 'INVALID_STATUS'
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to update issue',
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message || 'An unexpected error occurred'
        },
        { status: 500 }
      )
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