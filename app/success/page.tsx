import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { SuccessRedirect } from '@/components/auth/SuccessRedirect'
import type { WorkspaceMemberDetailsQueryResponse } from '@/types/supabase-helpers'

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
    .maybeSingle()

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
    // Use a client-side redirect with a small delay to ensure cache invalidation has propagated
    return <SuccessRedirect workspaceSlug={workspace.slug} />
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen flex items-center justify-center p-4 md:p-6 lg:p-8 bg-background">
        <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-4 md:p-6 lg:p-8">
          <div className="text-center space-y-6">
            <h1 className="text-3xl font-bold text-foreground">
              Welcome!
            </h1>
            
            <div className="flex flex-col items-center space-y-4">
              <div className="text-6xl">
                {profile.avatar_url || '👤'}
              </div>
              
              <div className="space-y-2">
                <p className="text-xl font-semibold text-foreground">
                  {profile.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="pt-4 md:pt-6 border-t border-border">
              <h2 className="text-lg font-semibold text-foreground mb-4">Your Workspace</h2>
              
              <div className="flex items-center space-x-3 mb-4">
                <div className="text-3xl">
                  {workspace.avatar_url || '🏢'}
                </div>
                <div>
                  <p className="font-medium text-foreground">{workspace.name}</p>
                  <a 
                    href={`/${workspace.slug}`}
                    className="text-sm text-primary hover:text-primary"
                  >
                    daygent.ai/{workspace.slug}
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-4 md:pt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                You have successfully set up your profile and workspace.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}