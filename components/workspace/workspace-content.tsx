'use client'

import { useState, useImperativeHandle, forwardRef } from 'react'
import { usePathname } from 'next/navigation'
import { IssuesList } from '@/components/issues/issues-list'
import { IssueDetails } from '@/components/issues/issue-details'
import { Inbox } from '@/components/inbox/inbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface WorkspaceContentProps {
  workspace: {
    id: string
    name: string
    slug: string
    avatar_url: string | null
    owner_id: string
  }
  initialView?: 'list' | 'issue' | 'inbox'
  initialIssueId?: string
}

export interface WorkspaceContentRef {
  navigateToIssuesList: () => void
  navigateToInbox: () => void
}

const statusOptions = [
  { value: 'all', label: 'All' },
  { value: 'exclude_done', label: 'Active' },
  { value: 'shaping', label: 'Shaping' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
]

const priorityOptions = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const typeOptions = [
  { value: 'all', label: 'All' },
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'task', label: 'Task' },
  { value: 'epic', label: 'Epic' },
  { value: 'spike', label: 'Spike' },
]

export const WorkspaceContent = forwardRef<WorkspaceContentRef, WorkspaceContentProps>(
  function WorkspaceContent({ workspace, initialView = 'list', initialIssueId }, ref) {
  const pathname = usePathname()
  
  // Extract issue ID from URL if present
  const getIssueIdFromPath = () => {
    const match = pathname.match(/\/issue\/([a-zA-Z0-9-]+)/)
    return match ? match[1] : null
  }
  
  // Determine initial view based on URL if not provided
  const getInitialView = () => {
    if (initialView !== 'list') return initialView
    if (pathname.includes('/inbox')) return 'inbox'
    if (pathname.includes('/issue/')) return 'issue'
    return 'list'
  }
  
  const [currentView, setCurrentView] = useState<'list' | 'issue' | 'inbox'>(getInitialView())
  const [currentIssueId, setCurrentIssueId] = useState<string | null>(initialIssueId || getIssueIdFromPath() || null)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Filter states - default excludes done status
  const [statusFilter, setStatusFilter] = useState<string>('exclude_done')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

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

  const handleNavigateToInbox = () => {
    setCurrentView('inbox')
    setCurrentIssueId(null)
    // Update URL without page refresh
    window.history.pushState({}, '', `/${workspace.slug}/inbox`)
  }

  // Expose method to parent component
  useImperativeHandle(ref, () => ({
    navigateToIssuesList: handleBackToList,
    navigateToInbox: handleNavigateToInbox
  }))

  const handleIssueDeleted = () => {
    handleBackToList()
    setRefreshKey(prev => prev + 1)
  }


  return (
    <>
      {/* Filters - Only show for issues list view */}
      {currentView === 'list' && (
        <div className="border-b border-gray-200 bg-white">
          <div className="px-6 py-4 flex items-center space-x-3">
            <span className="text-sm text-gray-500">Filter by:</span>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Dynamic Content */}
      {currentView === 'list' ? (
        <IssuesList 
          key={refreshKey}
          workspaceId={workspace.id} 
          workspaceSlug={workspace.slug}
          onIssueClick={handleIssueClick}
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          typeFilter={typeFilter}
        />
      ) : currentView === 'inbox' ? (
        <Inbox />
      ) : currentIssueId ? (
        <IssueDetails
          issueId={currentIssueId}
          onBack={handleBackToList}
          onDeleted={handleIssueDeleted}
        />
      ) : null}
    </>
  )
})