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

    // Check if user has access to workspace and if it has an API key
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select(`
        id,
        api_key,
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
        { hasApiKey: false },
        { status: 200 }
      )
    }

    // Check for centralized API key in environment variables
    const hasCentralizedKey = !!(
      process.env['CENTRALIZED_OPENAI_API_KEY'] || 
      process.env['CENTRALIZED_ANTHROPIC_API_KEY']
    )
    
    // Return whether the workspace has an API key configured (either workspace-specific or centralized)
    return NextResponse.json({ 
      hasApiKey: !!workspace.api_key || hasCentralizedKey
    })

  } catch (error) {
    console.error('Error checking workspace API key:', error)
    return createInternalServerError()
  }
}

// Export the wrapped handler with timeout and error handling
export const POST = withTimeout(withErrorHandler(handlePOST), timeoutConfig.quick)