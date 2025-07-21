import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { withTimeout, timeoutConfig } from '@/lib/middleware/timeout'
import { 
  withErrorHandler, 
  createUnauthorizedError, 
  createValidationError,
  createNotFoundError,
  createForbiddenError,
  createInternalServerError 
} from '@/lib/middleware/error-handler'

async function handleGET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const workspaceId = searchParams.get('workspace_id')
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 100)

  if (!workspaceId) {
    return createValidationError(
      'workspace_id is required',
      { requiredFields: ['workspace_id'] }
    )
  }

  const supabase = await createClient()
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return createUnauthorizedError()
  }
  
  // Check authorization - verify user has access to this workspace
  // Check if user is a member of the workspace (owner, admin, member, or viewer)
  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()
    
  if (membershipError || !membership) {
    // If not a member, check if the workspace exists
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .single()
      
    if (workspaceError || !workspace) {
      return createNotFoundError('Workspace')
    }
    
    // Workspace exists but user is not a member
    return createForbiddenError('You do not have access to this workspace')
  }

  try {
    // Call the search_issues function
    const { data, error } = await supabase.rpc('search_issues', {
      search_query: query,
      p_workspace_id: workspaceId,
      limit_count: limit
    })

    if (error) {
      console.error('Search error:', error)
      return createInternalServerError('Failed to search issues')
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Search error:', error)
    return createInternalServerError()
  }
}

// Export the wrapped handler with timeout and error handling
export const GET = withTimeout(withErrorHandler(handleGET), timeoutConfig.standard)