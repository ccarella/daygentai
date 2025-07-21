import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import type { WorkspaceMemberDetailsQueryResponse } from '@/types/supabase-helpers'
import { SuccessContent } from './success-content'

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>
}) {
  const supabase = await createClient()
  const resolvedSearchParams = await searchParams
  const isDebugMode = resolvedSearchParams.debug === 'true'
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/')
  }

  // Fetch user profile data
  const { data: profile } = await supabase
    .from('users')
    .select('name, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/CreateUser')
  }

  // Fetch user's first workspace from workspace_members
  const { data: workspaceMemberships } = await supabase
    .from('workspace_members')
    .select(`
      workspace:workspaces(
        name,
        slug,
        avatar_url
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)

  if (!workspaceMemberships || workspaceMemberships.length === 0) {
    redirect('/CreateWorkspace')
  }

  const membership = workspaceMemberships[0] as WorkspaceMemberDetailsQueryResponse
  const workspace = membership.workspace[0]

  if (!workspace) {
    redirect('/CreateWorkspace')
  }

  // If user has a workspace and not in debug mode, redirect to workspace
  if (!isDebugMode) {
    redirect(`/${workspace.slug}`)
  }

  return (
    <AuthenticatedLayout>
      <SuccessContent profile={profile} user={user} workspace={workspace} />
    </AuthenticatedLayout>
  )
}