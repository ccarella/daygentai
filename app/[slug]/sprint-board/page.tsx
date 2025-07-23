'use client'

import { useState, useRef } from 'react'
import { WorkspaceWithMobileNav } from '@/components/layout/workspace-with-mobile-nav'
import { WorkspaceContent, WorkspaceContentRef } from '@/components/workspace/workspace-content'
import { useWorkspace } from '@/contexts/workspace-context'
import { use } from 'react'

export default function SprintBoardPage({ params }: { params: Promise<{ slug: string }> }) {
  use(params) // Resolve params promise
  const { workspace } = useWorkspace()
  const contentRef = useRef<WorkspaceContentRef>(null)
  const [refreshKey, setRefreshKey] = useState(0)

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

  if (!workspace) return null

  return (
    <WorkspaceWithMobileNav 
      workspace={workspace} 
      onIssueCreated={handleIssueCreated}
      onNavigateToIssues={handleNavigateToIssues}
      onNavigateToInbox={handleNavigateToInbox}
      onNavigateToCookbook={handleNavigateToCookbook}
    >
      <WorkspaceContent 
        ref={contentRef}
        key={refreshKey} 
        workspace={workspace}
        initialView="sprint-board"
        typeFilter="feature,bug"
      />
    </WorkspaceWithMobileNav>
  )
}