'use client'

import { useState, useRef } from 'react'
import { use } from 'react'
import { notFound } from 'next/navigation'
import { WorkspaceWithMobileNav } from '@/components/layout/workspace-with-mobile-nav'
import { WorkspaceContent, WorkspaceContentRef } from '@/components/workspace/workspace-content'
import { useWorkspace } from '@/contexts/workspace-context'
import { IssueType } from '@/lib/validation/issue-validation'

const VALID_ISSUE_TYPES = ['features', 'bugs', 'design', 'non-technical'] as const

type ValidIssueType = typeof VALID_ISSUE_TYPES[number]

const typeMapping: Record<ValidIssueType, IssueType> = {
  'features': 'feature',
  'bugs': 'bug',
  'design': 'design',
  'non-technical': 'non-technical'
}

export default function IssueTypePage({ 
  params 
}: { 
  params: Promise<{ slug: string; type: string }> 
}) {
  const resolvedParams = use(params)
  const { workspace } = useWorkspace()
  const contentRef = useRef<WorkspaceContentRef>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Validate the issue type
  if (!VALID_ISSUE_TYPES.includes(resolvedParams.type as ValidIssueType)) {
    notFound()
  }

  const issueType = typeMapping[resolvedParams.type as ValidIssueType]

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
        initialTypeFilter={issueType}
      />
    </WorkspaceWithMobileNav>
  )
}