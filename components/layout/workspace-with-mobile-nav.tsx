'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WorkspaceLayout } from './workspace-layout'
import { useWorkspaceNavigation } from '@/hooks/use-workspace-navigation'
import { useMobileMenu } from '@/contexts/mobile-menu-context'
import { PageContainer } from './page-container'
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
  const [workspaces, setWorkspaces] = useState<UserWorkspace[]>([])
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useMobileMenu()
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

  // Set up unified workspace navigation
  useWorkspaceNavigation({
    sidebarRef,
    mainContentRef,
  })

  return (
    <PageContainer>
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
    </PageContainer>
  )
}