'use client'

import { useState } from 'react'
import { IssuesList } from '@/components/issues/issues-list'
import { IssueDetails } from '@/components/issues/issue-details'

interface WorkspaceContentProps {
  workspace: {
    id: string
    name: string
    slug: string
    avatar_url: string | null
    owner_id: string
  }
  initialView?: 'list' | 'issue'
  initialIssueId?: string
}

export function WorkspaceContent({ workspace, initialView = 'list', initialIssueId }: WorkspaceContentProps) {
  const [currentView, setCurrentView] = useState<'list' | 'issue'>(initialView)
  const [currentIssueId, setCurrentIssueId] = useState<string | null>(initialIssueId || null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleIssueClick = (issueId: string) => {
    setCurrentIssueId(issueId)
    setCurrentView('issue')
    // Update URL without page refresh
    window.history.pushState({}, '', `/${workspace.slug}/issue/${issueId}`)
  }

  const handleBackToList = () => {
    setCurrentView('list')
    setCurrentIssueId(null)
    // Update URL without page refresh
    window.history.pushState({}, '', `/${workspace.slug}`)
  }

  const handleIssueDeleted = () => {
    handleBackToList()
    setRefreshKey(prev => prev + 1)
  }


  return (
    <>
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by describing your issue..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Dynamic Content */}
      {currentView === 'list' ? (
        <IssuesList 
          key={refreshKey}
          workspaceId={workspace.id} 
          workspaceSlug={workspace.slug}
          onIssueClick={handleIssueClick}
        />
      ) : currentIssueId ? (
        <IssueDetails
          issueId={currentIssueId}
          onBack={handleBackToList}
          onDeleted={handleIssueDeleted}
        />
      ) : null}
    </>
  )
}