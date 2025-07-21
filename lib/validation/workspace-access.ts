import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Validates that a user has access to a workspace
 * @param workspaceId - The workspace ID to check
 * @param userId - The user ID to validate (optional, uses current user if not provided)
 * @returns true if user has access, false otherwise
 */
export async function validateWorkspaceAccess(
  workspaceId: string,
  userId?: string
): Promise<boolean> {
  const supabase = await createClient()
  
  // Get current user if not provided
  if (!userId) {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return false
    userId = user.id
  }

  // Check if user is a member of the workspace
  const { data: member, error } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  return !error && !!member
}

/**
 * Validates that an issue belongs to a specific workspace
 * @param issueId - The issue ID to check
 * @param workspaceId - The workspace ID the issue should belong to
 * @returns true if issue belongs to workspace, false otherwise
 */
export async function validateIssueWorkspace(
  issueId: string,
  workspaceId: string
): Promise<boolean> {
  const supabase = await createClient()
  
  const { data: issue, error } = await supabase
    .from('issues')
    .select('id')
    .eq('id', issueId)
    .eq('workspace_id', workspaceId)
    .single()

  return !error && !!issue
}

/**
 * Validates that a user can access an issue (checks both workspace membership and issue ownership)
 * @param issueId - The issue ID to check
 * @param userId - The user ID to validate (optional, uses current user if not provided)
 * @returns Object with access status and workspace ID if accessible
 */
export async function validateIssueAccess(
  issueId: string,
  userId?: string
): Promise<{ hasAccess: boolean; workspaceId?: string }> {
  const supabase = await createClient()
  
  // Get current user if not provided
  if (!userId) {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return { hasAccess: false }
    userId = user.id
  }

  // Get issue with workspace info
  const { data: issue, error: issueError } = await supabase
    .from('issues')
    .select('id, workspace_id')
    .eq('id', issueId)
    .single()

  if (issueError || !issue) {
    return { hasAccess: false }
  }

  // Check workspace access
  const hasAccess = await validateWorkspaceAccess(issue.workspace_id, userId)
  
  return {
    hasAccess,
    workspaceId: hasAccess ? issue.workspace_id : undefined
  }
}

/**
 * Client-side validation helper
 * Validates that an issue belongs to a workspace using client Supabase instance
 */
export async function validateIssueWorkspaceClient(
  supabase: SupabaseClient,
  issueId: string,
  workspaceId: string
): Promise<boolean> {
  const { data: issue, error } = await supabase
    .from('issues')
    .select('id')
    .eq('id', issueId)
    .eq('workspace_id', workspaceId)
    .single()

  return !error && !!issue
}

/**
 * Gets workspace ID from slug with validation
 * @param slug - The workspace slug
 * @param userId - The user ID to validate access (optional)
 * @returns Workspace ID if valid and accessible, null otherwise
 */
export async function getWorkspaceIdFromSlug(
  slug: string,
  userId?: string
): Promise<string | null> {
  const supabase = await createClient()
  
  // Get workspace by slug
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .single()

  if (error || !workspace) {
    return null
  }

  // If userId provided, validate access
  if (userId) {
    const hasAccess = await validateWorkspaceAccess(workspace.id, userId)
    if (!hasAccess) return null
  }

  return workspace.id
}