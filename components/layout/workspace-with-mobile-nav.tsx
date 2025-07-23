'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from './header'
import { WorkspaceLayout } from './workspace-layout'
import { useWorkspaceNavigation } from '@/hooks/use-workspace-navigation'
import { useProfile } from '@/contexts/profile-context'
import type { UserWorkspace } from '@/lib/supabase/workspaces'

interface WorkspaceWithMobileNavProps {
  workspace: {
    id: string
    name: string
    slug: string
    avatar_url: string | null
    owner_id: string
  }
  children: React.ReactNode
  onIssueCreated?: () => void
  onNavigateToIssues?: () => void
  onNavigateToInbox?: () => void
  onNavigateToCookbook?: () => void
}

export function WorkspaceWithMobileNav({ workspace, children, onIssueCreated, onNavigateToIssues, onNavigateToInbox, onNavigateToCookbook }: WorkspaceWithMobileNavProps) {
  const { profile, loading: profileLoading } = useProfile()
  const [workspaces, setWorkspaces] = useState<UserWorkspace[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return
      
      // Fetch workspaces
      const { data: workspacesData, error: workspacesError } = await supabase
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
      
      if (workspacesData) {
        const transformedWorkspaces = workspacesData
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
        
        setWorkspaces(transformedWorkspaces)
      }
    }

    fetchData()
  }, [])

  const handleMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  // Set up unified workspace navigation
  useWorkspaceNavigation({
    sidebarRef,
    mainContentRef,
  })

  if (profileLoading) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 bg-background border-b border-border z-50">
          <div className="w-full px-4 md:px-6 lg:px-8">
            <div className="flex items-center h-11">
              <div className="flex items-center flex-1">
                <div className="text-xl font-bold text-foreground">Daygent</div>
              </div>
              <div className="flex items-center flex-1 justify-end">
                <div className="w-11 h-11 md:w-10 md:h-10 rounded-full bg-secondary animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        <div className="pt-11">
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {profile && (
        <Header 
          initialProfile={profile} 
          onMenuToggle={handleMenuToggle}
          isMobileMenuOpen={isMobileMenuOpen}
        />
      )}
      <div className="pt-11">
        <WorkspaceLayout 
          workspace={workspace}
          workspaces={workspaces}
          {...(onIssueCreated && { onIssueCreated })}
          {...(onNavigateToIssues && { onNavigateToIssues })}
          {...(onNavigateToInbox && { onNavigateToInbox })}
          {...(onNavigateToCookbook && { onNavigateToCookbook })}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          sidebarRef={sidebarRef}
        >
          <div ref={mainContentRef}>
            {children}
          </div>
        </WorkspaceLayout>
      </div>
    </>
  )
}