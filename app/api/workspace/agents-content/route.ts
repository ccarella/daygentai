import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withTimeout, timeoutConfig } from '@/lib/middleware/timeout'
import { 
  withErrorHandler, 
  createUnauthorizedError, 
  createValidationError,
  createInternalServerError 
} from '@/lib/middleware/error-handler'

async function handlePOST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workspaceId } = body

    if (!workspaceId) {
      return createValidationError(
        'Missing workspaceId',
        { requiredFields: ['workspaceId'] }
      )
    }

    // Create authenticated Supabase client
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createUnauthorizedError()
    }

    // Get workspace agents content if user has access
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select(`
        id,
        agents_content,
        workspace_members!inner (
          user_id,
          role
        )
      `)
      .eq('id', workspaceId)
      .eq('workspace_members.user_id', user.id)
      .single()

    if (workspaceError || !workspace) {
      // User doesn't have access to this workspace
      return NextResponse.json(
        { agentsContent: null },
        { status: 200 }
      )
    }

    // Return the agents content
    return NextResponse.json({ 
      agentsContent: workspace.agents_content || null 
    })

  } catch (error) {
    console.error('Error fetching workspace agents content:', error)
    return createInternalServerError()
  }
}

// Export the wrapped handler with timeout and error handling
export const POST = withTimeout(withErrorHandler(handlePOST), timeoutConfig.standard)