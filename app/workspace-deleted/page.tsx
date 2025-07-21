import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { WorkspaceSwitcher } from '@/components/workspace/workspace-switcher'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { UserWorkspace } from '@/lib/supabase/workspaces'

export default async function WorkspaceDeletedPage() {
  const supabase = await createClient()
  
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

  // Fetch user's workspaces
  const { data: workspaceMemberships, error: workspacesError } = await supabase
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
  
  if (workspacesError) {
    console.error('Error fetching workspaces:', workspacesError)
  }
  
  // Transform workspaces data
  const workspaces: UserWorkspace[] = workspaceMemberships
    ? workspaceMemberships
        .map((item: { 
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
        })
        .filter((workspace): workspace is UserWorkspace => workspace !== null)
    : []

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen flex items-center justify-center p-4 md:p-6 lg:p-8 bg-background">
        <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-4 md:p-6 lg:p-8">
          <div className="text-center space-y-6">
            {/* Large Trash Icon */}
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <Trash2 className="w-12 h-12 text-red-600 dark:text-red-400" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-foreground">
              Your Workspace was successfully deleted.
            </h1>
            
            <p className="text-muted-foreground">
              All data associated with the workspace has been permanently removed.
            </p>

            <div className="pt-6 space-y-4">
              {workspaces.length > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Select another workspace or create a new one:
                  </p>
                  
                  <div className="flex justify-center">
                    <WorkspaceSwitcher 
                      currentWorkspace={null}
                      workspaces={workspaces}
                      collapsed={false}
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    You don&apos;t have any other workspaces. Create a new one to continue.
                  </p>
                  
                  <Link href="/CreateWorkspace">
                    <Button className="w-full">
                      Create New Workspace
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}