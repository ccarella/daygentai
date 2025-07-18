import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const workspaceId = searchParams.get('workspace_id')
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 100)

  if (!workspaceId) {
    return NextResponse.json(
      { error: 'workspace_id is required' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
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
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }
    
    // Workspace exists but user is not a member
    return NextResponse.json(
      { error: 'You do not have access to this workspace' },
      { status: 403 }
    )
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
      return NextResponse.json(
        { error: 'Failed to search issues' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}