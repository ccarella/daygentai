import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const workspaceId = searchParams.get('workspace_id')
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  if (!workspaceId) {
    return NextResponse.json(
      { error: 'workspace_id is required' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

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