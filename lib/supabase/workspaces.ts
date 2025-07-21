import { createClient } from '@/lib/supabase/server'
import { handleDatabaseError } from '@/lib/error-handler'

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
    handleDatabaseError(error, 'fetch user workspaces')
    return []
  }

  // Transform the data to flatten the workspace object
  return data?.map((item: { 
    workspace: { id: string; name: string; slug: string; avatar_url: string | null } | 
              Array<{ id: string; name: string; slug: string; avatar_url: string | null }>;
    role: string;
    created_at: string;
  }) => {
    // Handle both array and object formats for workspace
    let workspace: { id: string; name: string; slug: string; avatar_url: string | null } | undefined
    if (Array.isArray(item.workspace)) {
      workspace = item.workspace[0]
    } else {
      workspace = item.workspace
    }
    
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
    handleDatabaseError(error, 'add user to workspace')
    throw error
  }
}