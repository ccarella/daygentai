import { createClient } from '@/lib/supabase/server'

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
  return data?.map((item: any) => ({
    id: item.workspace.id,
    name: item.workspace.name,
    slug: item.workspace.slug,
    avatar_url: item.workspace.avatar_url,
    role: item.role,
    created_at: item.created_at
  })) || []
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