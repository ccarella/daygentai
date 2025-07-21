import { createClient } from '@/lib/supabase/client'
import { handleDatabaseError } from '@/lib/error-handler'

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
    handleDatabaseError(error, 'fetch workspace tags')
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
    handleDatabaseError(error, 'create tag')
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
    handleDatabaseError(error, 'fetch issue tags')
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
    handleDatabaseError(deleteError, 'delete issue tags')
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
    handleDatabaseError(insertError, 'insert issue tags')
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