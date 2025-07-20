'use client'

import { useState, useRef } from 'react'
import { WorkspaceWithMobileNav } from '@/components/layout/workspace-with-mobile-nav'
import { WorkspaceContent, WorkspaceContentRef } from '@/components/workspace/workspace-content'
import { useWorkspace } from '@/contexts/workspace-context'
import { use } from 'react'

export default function WorkspacePage({ params }: { params: Promise<{ slug: string }> }) {
  use(params) // Resolve params promise
  const { workspace } = useWorkspace()
  const contentRef = useRef<WorkspaceContentRef>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [userAvatar, setUserAvatar] = useState<string | null>(null)

  const handleIssueCreated = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleNavigateToIssues = () => {
    contentRef.current?.navigateToIssuesList()
  }

  const handleNavigateToInbox = () => {
    contentRef.current?.navigateToInbox()
  }

  const handleNavigateToCookbook = () => {
    contentRef.current?.navigateToCookbook()
  }

  const handleNavigateToSettings = () => {
    contentRef.current?.navigateToSettings()
  }

  // These handlers were previously used with AppCommandPalette
  // which is now handled at the layout level

  const handleAvatarUpdate = (newAvatar: string) => {
    setUserAvatar(newAvatar)
  }

  if (!workspace) return null

  return (
    <WorkspaceWithMobileNav 
      workspace={workspace} 
      onIssueCreated={handleIssueCreated}
      onNavigateToIssues={handleNavigateToIssues}
      onNavigateToInbox={handleNavigateToInbox}
      onNavigateToCookbook={handleNavigateToCookbook}
      onNavigateToSettings={handleNavigateToSettings}
      userAvatar={userAvatar}
    >
      <WorkspaceContent 
        ref={contentRef}
        key={refreshKey} 
        workspace={workspace}
        onAvatarUpdate={handleAvatarUpdate}
      />
    </WorkspaceWithMobileNav>
  )
}