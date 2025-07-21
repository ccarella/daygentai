'use client'

import { useRef } from 'react'
import { WorkspaceLayout } from './workspace-layout'
import { useWorkspaceNavigation } from '@/hooks/use-workspace-navigation'
import { useMobileMenu } from '@/contexts/mobile-menu-context'
import { useUserWorkspaces } from '@/contexts/user-workspaces-context'
import { PageContainer } from './page-container'

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
  const { workspaces } = useUserWorkspaces()
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useMobileMenu()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)

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