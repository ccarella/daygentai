'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from './header'
import { WorkspaceLayout } from './workspace-layout'
import { useWorkspaceNavigation } from '@/hooks/use-workspace-navigation'
import type { UserWorkspace } from '@/lib/supabase/workspaces'
import type { WorkspaceMemberQueryResponse } from '@/types/supabase-helpers'

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
  onNavigateToSettings?: () => void
  userAvatar?: string | null
}

export function WorkspaceWithMobileNav({ workspace, children, onIssueCreated, onNavigateToIssues, onNavigateToInbox, onNavigateToCookbook, onNavigateToSettings, userAvatar }: WorkspaceWithMobileNavProps) {
  const [profile, setProfile] = useState<{ name: string; avatar_url: string | null } | null>(null)
  const [workspaces, setWorkspaces] = useState<UserWorkspace[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return
      
      // Fetch profile
      const { data: profile } = await supabase
        .from('users')
        .select('name, avatar_url')
        .eq('id', user.id)
        .single()
      
      setProfile(profile)
      
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
      
      console.log('[WorkspaceWithMobileNav] Workspaces data:', {
        workspacesData,
        rawData: JSON.stringify(workspacesData, null, 2)
      })
      
      if (workspacesData) {
        const transformedWorkspaces = workspacesData
          .map((item: any) => {
            console.log('[WorkspaceWithMobileNav] Processing item:', {
              item,
              workspace: item.workspace,
              isArray: Array.isArray(item.workspace)
            })
            
            // Handle both array and object formats for workspace
            let workspace: any
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
        
        console.log('[WorkspaceWithMobileNav] Transformed workspaces:', transformedWorkspaces)
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

  return (
    <>
      {profile ? (
        <Header 
          initialProfile={{
            ...profile,
            avatar_url: userAvatar || profile.avatar_url
          }} 
          onMenuToggle={handleMenuToggle}
          isMobileMenuOpen={isMobileMenuOpen}
        />
      ) : (
        <Header 
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
          {...(onNavigateToSettings && { onNavigateToSettings })}
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