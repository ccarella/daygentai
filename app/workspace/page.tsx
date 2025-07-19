import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default async function WorkspaceLoadingPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  console.log('[WorkspaceLoadingPage] Auth check:', { userId: user?.id, authError })

  if (!user) {
    redirect('/')
  }

  // Check user profile
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  console.log('[WorkspaceLoadingPage] Profile check:', { profile, profileError })

  if (!profile) {
    redirect('/CreateUser')
  }

  // Get user's first workspace from workspace_members
  const { data: workspaceMemberships, error: workspaceError } = await supabase
    .from('workspace_members')
    .select(`
      workspace:workspaces!inner(
        slug
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)

  console.log('[WorkspaceLoadingPage] Workspace memberships:', { 
    workspaceMemberships, 
    workspaceError,
    rawData: JSON.stringify(workspaceMemberships, null, 2)
  })

  if (!workspaceMemberships || workspaceMemberships.length === 0) {
    console.log('[WorkspaceLoadingPage] No workspaces found, redirecting to CreateWorkspace')
    redirect('/CreateWorkspace')
  }

  // The query returns an object with a 'workspace' property
  const membership = workspaceMemberships[0] as any
  console.log('[WorkspaceLoadingPage] Membership data:', {
    membership,
    hasWorkspace: !!membership?.workspace,
    workspaceType: typeof membership?.workspace
  })

  // Handle both array and object formats for workspace
  let workspaceSlug: string | undefined
  if (membership?.workspace) {
    if (Array.isArray(membership.workspace) && membership.workspace[0]?.slug) {
      // Handle array format (some queries return workspace as array)
      workspaceSlug = membership.workspace[0].slug
    } else if (membership.workspace.slug) {
      // Handle object format (most queries return workspace as object)
      workspaceSlug = membership.workspace.slug
    }
  }

  if (workspaceSlug) {
    console.log('[WorkspaceLoadingPage] Redirecting to workspace:', workspaceSlug)
    redirect(`/${workspaceSlug}`)
  }

  // Log the unexpected data structure
  console.error('[WorkspaceLoadingPage] Could not find workspace slug:', {
    membership,
    workspace: membership?.workspace
  })

  // Fallback - redirect to create workspace if we can't find a valid workspace
  redirect('/CreateWorkspace')
}