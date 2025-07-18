'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from './header'
import { WorkspaceLayout } from './workspace-layout'
import { useWorkspaceNavigation } from '@/hooks/use-workspace-navigation'

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
  const [profile, setProfile] = useState<{ name: string; avatar_url: string | null } | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return
      
      const { data: profile } = await supabase
        .from('users')
        .select('name, avatar_url')
        .eq('id', user.id)
        .single()
      
      setProfile(profile)
    }

    fetchProfile()
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
          initialProfile={profile} 
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