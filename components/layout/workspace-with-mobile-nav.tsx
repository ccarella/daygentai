'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from './header'
import { WorkspaceLayout } from './workspace-layout'

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
}

export function WorkspaceWithMobileNav({ workspace, children, onIssueCreated, onNavigateToIssues, onNavigateToInbox }: WorkspaceWithMobileNavProps) {
  const [profile, setProfile] = useState<{ name: string; avatar_url: string | null } | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        >
          {children}
        </WorkspaceLayout>
      </div>
    </>
  )
}