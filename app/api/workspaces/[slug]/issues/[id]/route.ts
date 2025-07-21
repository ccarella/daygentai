import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { validateWorkspaceAccess } from '@/lib/validation/workspace-access'
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

    // Verify workspace access
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!workspace) {
      return createNotFoundError('Workspace')
    }

    // Fetch issue data with creator info
    const { data: issue, error } = await supabase
      .from('issues')
      .select(`
        *,
        creator:creator_id (name, avatar_url)
      `)
      .eq('id', id)
      .eq('workspace_id', workspace.id)
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

    // Validate workspace access and issue ownership
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!workspace) {
      return createNotFoundError('Workspace')
    }

    // Validate workspace access for the user
    const hasAccess = await validateWorkspaceAccess(workspace.id, user.id)
    if (!hasAccess) {
      return createForbiddenError('Access denied')
    }

    // Verify issue belongs to workspace before updating
    const { data: existingIssue } = await supabase
      .from('issues')
      .select('id, workspace_id')
      .eq('id', id)
      .eq('workspace_id', workspace.id)
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
      .eq('workspace_id', workspace.id)
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