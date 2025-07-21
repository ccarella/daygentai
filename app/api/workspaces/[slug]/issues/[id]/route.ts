import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify workspace access
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
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
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      issue,
      creator: issue.creator || { name: 'Unknown', avatar_url: null }
    })
  } catch (error) {
    console.error('Error fetching issue:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}