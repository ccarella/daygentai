import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function WorkspaceLoadingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Check user profile
  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/CreateUser')
  }

  // Get user's first workspace from workspace_members
  const { data: workspaceMemberships } = await supabase
    .from('workspace_members')
    .select(`
      workspace:workspaces!inner(
        slug
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)

  if (!workspaceMemberships || workspaceMemberships.length === 0) {
    redirect('/CreateWorkspace')
  }

  // The query returns an object with a 'workspace' property
  const membership = workspaceMemberships[0] as { workspace?: { slug: string } | Array<{ slug: string }> }

  // Handle both array and object formats for workspace
  let workspaceSlug: string | undefined
  if (membership?.workspace) {
    if (Array.isArray(membership.workspace) && membership.workspace[0]?.slug) {
      // Handle array format (some queries return workspace as array)
      workspaceSlug = membership.workspace[0].slug
    } else if (!Array.isArray(membership.workspace) && membership.workspace.slug) {
      // Handle object format (most queries return workspace as object)  
      workspaceSlug = membership.workspace.slug
    }
  }

  if (workspaceSlug) {
    redirect(`/${workspaceSlug}`)
  }

  // Fallback - redirect to create workspace if we can't find a valid workspace
  redirect('/CreateWorkspace')
}