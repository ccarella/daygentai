import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workspaceId } = body

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Missing workspaceId' },
        { status: 400 }
      )
    }

    // Create authenticated Supabase client
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}