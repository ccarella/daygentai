import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { validateWorkspaceAccess } from '@/lib/validation/workspace-access'

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { status, type, priority, title, description, generated_prompt } = body

    // Validate workspace access and issue ownership
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Validate workspace access for the user
    const hasAccess = await validateWorkspaceAccess(workspace.id, user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify issue belongs to workspace before updating
    const { data: existingIssue } = await supabase
      .from('issues')
      .select('id, workspace_id')
      .eq('id', id)
      .eq('workspace_id', workspace.id)
      .single()

    if (!existingIssue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    // Build update object with only provided fields
    const updateData: Record<string, string | null | undefined> = {}
    if (status !== undefined) updateData['status'] = status
    if (type !== undefined) updateData['type'] = type
    if (priority !== undefined) updateData['priority'] = priority
    if (title !== undefined) updateData['title'] = title
    if (description !== undefined) updateData['description'] = description
    if (generated_prompt !== undefined) updateData['generated_prompt'] = generated_prompt

    // Add updated timestamp
    updateData['updated_at'] = new Date().toISOString()

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
      return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 })
    }

    return NextResponse.json({ issue: updatedIssue })
  } catch (error) {
    console.error('Error updating issue:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}