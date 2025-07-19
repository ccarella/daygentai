import { createClient } from '@/lib/supabase/client'

export interface Tag {
  id: string
  name: string
  color?: string | undefined
  workspace_id: string
}

export async function getWorkspaceTags(workspaceId: string): Promise<Tag[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('name', { ascending: true })
  
  if (error) {
    console.error('Error fetching tags:', error)
    return []
  }
  
  return data || []
}

export async function createTag(workspaceId: string, name: string, color?: string): Promise<Tag | null> {
  const supabase = createClient()
  
  // Generate a random color if not provided
  const tagColor = color || generateRandomColor()
  
  const { data, error } = await supabase
    .from('tags')
    .insert({
      name: name.trim(),
      color: tagColor,
      workspace_id: workspaceId,
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating tag:', error)
    return null
  }
  
  return data
}

export async function getIssueTags(issueId: string): Promise<Tag[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('issue_tags')
    .select(`
      tag_id,
      tags!inner (
        id,
        name,
        color,
        workspace_id
      )
    `)
    .eq('issue_id', issueId)
  
  if (error) {
    console.error('Error fetching issue tags:', error)
    return []
  }
  
  // Type assertion needed because Supabase doesn't infer the join correctly
  type IssueTagRow = { tag_id: string; tags: Tag }
  return (data as unknown as IssueTagRow[])?.map(item => item.tags).filter(Boolean) || []
}

export async function updateIssueTags(issueId: string, tagIds: string[]): Promise<boolean> {
  const supabase = createClient()
  
  // First, delete existing tags
  const { error: deleteError } = await supabase
    .from('issue_tags')
    .delete()
    .eq('issue_id', issueId)
  
  if (deleteError) {
    console.error('Error deleting issue tags:', deleteError)
    return false
  }
  
  // If no tags to add, we're done
  if (tagIds.length === 0) {
    return true
  }
  
  // Insert new tags
  const { error: insertError } = await supabase
    .from('issue_tags')
    .insert(
      tagIds.map(tagId => ({
        issue_id: issueId,
        tag_id: tagId,
      }))
    )
  
  if (insertError) {
    console.error('Error inserting issue tags:', insertError)
    return false
  }
  
  return true
}

function generateRandomColor(): string {
  const colors = [
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#ef4444', // red
    '#f59e0b', // amber
    '#10b981', // emerald
    '#3b82f6', // blue
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
  ]
  
  return colors[Math.floor(Math.random() * colors.length)]!
}