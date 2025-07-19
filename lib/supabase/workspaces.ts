import { createClient } from '@/lib/supabase/server'
import type { WorkspaceMemberQueryResponse } from '@/types/supabase-helpers'

export interface UserWorkspace {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  role: string
  created_at: string
}

export async function getUserWorkspaces(): Promise<UserWorkspace[]> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('workspace_members')
    .select(`
      role,
      created_at,
      workspace:workspaces!inner(
        id,
        name,
        slug,
        avatar_url
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching user workspaces:', error)
    return []
  }

  // Transform the data to flatten the workspace object
  return data?.map((item: WorkspaceMemberQueryResponse) => {
    const workspace = item.workspace[0]
    if (!workspace) return null
    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      avatar_url: workspace.avatar_url,
      role: item.role,
      created_at: item.created_at
    }
  }).filter((workspace): workspace is UserWorkspace => workspace !== null) || []
}

export async function addUserToWorkspace(workspaceId: string, userId: string, role: string = 'member') {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      role: role
    })

  if (error) {
    console.error('Error adding user to workspace:', error)
    throw error
  }
}