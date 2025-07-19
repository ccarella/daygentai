import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { WorkspaceMemberSlugQueryResponse } from '@/types/supabase-helpers'

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
  } else if (workspaceMemberships[0]) {
    const membership = workspaceMemberships[0] as WorkspaceMemberSlugQueryResponse
    const workspace = membership.workspace[0]
    if (workspace) {
      redirect(`/${workspace.slug}`)
    }
  }

  // Fallback (should not reach here)
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <LoadingSpinner />
        <p className="text-muted-foreground">Loading your workspace...</p>
      </div>
    </div>
  )
}