import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { validateWorkspaceAccessOptimized } from '@/lib/validation/workspace-access-optimized'
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
  
  // Optimized workspace access validation - single query instead of two
  const accessResult = await validateWorkspaceAccessOptimized(
    supabase,
    workspaceId,
    user.id,
    false // workspaceId is an ID, not a slug
  )

  if (!accessResult.workspaceExists) {
    return createNotFoundError('Workspace')
  }

  if (!accessResult.hasAccess) {
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