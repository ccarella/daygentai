import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserSettingsContent } from './user-settings-content'

interface Workspace {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  owner_id: string
  userRole?: string
}

export default async function UserSettingsPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/')
  }
  
  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('id, name, avatar_url')
    .eq('id', user.id)
    .maybeSingle()
  
  if (!profile) {
    redirect('/CreateUser')
  }
  
  // Get all workspaces where user is a member (owner or otherwise)
  const { data: workspaceMembers } = await supabase
    .from('workspace_members')
    .select(`
      workspace_id,
      role,
      workspaces!inner (
        id,
        name,
        slug,
        avatar_url,
        owner_id
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  
  // Transform the data to a flat array of workspaces with user's role
  let workspaces: Workspace[] = []
  
  if (workspaceMembers && workspaceMembers.length > 0) {
    workspaces = workspaceMembers.map((member) => {
      const workspace = member.workspaces as unknown as {
        id: string
        name: string
        slug: string
        avatar_url: string | null
        owner_id: string
      }
      return {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        avatar_url: workspace.avatar_url,
        owner_id: workspace.owner_id,
        userRole: member.role
      }
    })
  }
  
  // If no workspaces via workspace_members, check for owned workspaces directly
  // (for backward compatibility if workspace_members isn't populated)
  if (workspaces.length === 0) {
    const { data: ownedWorkspaces } = await supabase
      .from('workspaces')
      .select('id, name, slug, avatar_url, owner_id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
    
    if (ownedWorkspaces && ownedWorkspaces.length > 0) {
      const ownedWorkspacesWithRole = ownedWorkspaces.map(ws => ({
        ...ws,
        userRole: 'owner'
      }))
      workspaces = ownedWorkspacesWithRole
    }
  }
  
  return (
    <UserSettingsContent
      user={{
        id: user.id,
        email: user.email || '',
        profile: {
          name: profile.name || '',
          avatar_url: profile.avatar_url || '👤'
        }
      }}
      workspaces={workspaces}
    />
  )
}