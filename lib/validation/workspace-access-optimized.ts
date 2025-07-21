import { SupabaseClient } from '@supabase/supabase-js'

export interface WorkspaceAccessResult {
  hasAccess: boolean
  workspaceExists: boolean
  role?: string
  workspaceId?: string
}

/**
 * Optimized workspace access validation that combines multiple queries into one
 * This reduces database round trips and improves performance
 */
export async function validateWorkspaceAccessOptimized(
  supabase: SupabaseClient,
  workspaceIdOrSlug: string,
  userId: string,
  isSlug = false
): Promise<WorkspaceAccessResult> {
  if (isSlug) {
    // When using slug, we need to join workspaces table to get the ID
    const { data, error } = await supabase
      .from('workspaces')
      .select(`
        id,
        workspace_members!inner (
          role,
          user_id
        )
      `)
      .eq('slug', workspaceIdOrSlug)
      .eq('workspace_members.user_id', userId)
      .single()

    if (error || !data) {
      // Check if workspace exists without access
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('slug', workspaceIdOrSlug)
        .single()

      return {
        hasAccess: false,
        workspaceExists: !!workspace,
        workspaceId: workspace?.id
      }
    }

    return {
      hasAccess: true,
      workspaceExists: true,
      role: data.workspace_members[0]?.role,
      workspaceId: data.id
    }
  } else {
    // When using ID directly, single query with left join
    const { data, error } = await supabase
      .from('workspace_members')
      .select(`
        role,
        workspace:workspaces!workspace_members_workspace_id_fkey (
          id
        )
      `)
      .eq('workspace_id', workspaceIdOrSlug)
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      // Check if workspace exists without access
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('id', workspaceIdOrSlug)
        .single()

      return {
        hasAccess: false,
        workspaceExists: !!workspace,
        workspaceId: workspace?.id
      }
    }

    return {
      hasAccess: true,
      workspaceExists: true,
      role: data.role,
      workspaceId: workspaceIdOrSlug
    }
  }
}

/**
 * Batch validate access for multiple workspaces in a single query
 * Useful for listing operations
 */
export async function batchValidateWorkspaceAccess(
  supabase: SupabaseClient,
  workspaceIds: string[],
  userId: string
): Promise<Map<string, WorkspaceAccessResult>> {
  const { data } = await supabase
    .from('workspace_members')
    .select(`
      workspace_id,
      role
    `)
    .in('workspace_id', workspaceIds)
    .eq('user_id', userId)

  const accessMap = new Map<string, WorkspaceAccessResult>()

  // Initialize all workspaces as no access
  workspaceIds.forEach(id => {
    accessMap.set(id, {
      hasAccess: false,
      workspaceExists: true,
      workspaceId: id
    })
  })

  // Update with actual access
  data?.forEach(member => {
    accessMap.set(member.workspace_id, {
      hasAccess: true,
      workspaceExists: true,
      role: member.role,
      workspaceId: member.workspace_id
    })
  })

  return accessMap
}