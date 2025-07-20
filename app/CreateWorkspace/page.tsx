import CreateWorkspaceForm from '@/components/auth/CreateWorkspaceForm'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { WorkspaceMemberSlugQueryResponse } from '@/types/supabase-helpers'

export default async function CreateWorkspacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Check if user has a profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!userProfile) {
    redirect('/CreateUser')
  }

  // Check if user already has any workspaces
  const { data: existingWorkspaces } = await supabase
    .from('workspace_members')
    .select(`
      workspace:workspaces!inner(
        slug
      )
    `)
    .eq('user_id', user.id)
    .limit(1)

  if (existingWorkspaces && existingWorkspaces.length > 0 && existingWorkspaces[0]) {
    const membership = existingWorkspaces[0] as WorkspaceMemberSlugQueryResponse
    const workspace = membership.workspace[0]
    if (workspace) {
      redirect(`/${workspace.slug}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <CreateWorkspaceForm />
    </div>
  )
}