'use client'

import { useState, useImperativeHandle, forwardRef } from 'react'
import { usePathname } from 'next/navigation'
import { IssuesList } from '@/components/issues/issues-list'
import { KanbanBoard } from '@/components/issues/kanban-board'
import { IssueDetails } from '@/components/issues/issue-details'
import { Inbox } from '@/components/inbox/inbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LayoutGrid, List } from 'lucide-react'

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
  toggleViewMode: () => void
  getCurrentViewMode: () => 'list' | 'kanban'
}

const statusOptions = [
  { value: 'all', label: 'All' },
  { value: 'exclude_done', label: 'Active' },
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
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
  const [issuesViewMode, setIssuesViewMode] = useState<'list' | 'kanban'>('list')
  
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

  // Handler to toggle between list and kanban views
  const handleToggleViewMode = () => {
    setIssuesViewMode(prev => prev === 'list' ? 'kanban' : 'list')
  }

  // Expose method to parent component
  useImperativeHandle(ref, () => ({
    navigateToIssuesList: handleBackToList,
    navigateToInbox: handleNavigateToInbox,
    toggleViewMode: handleToggleViewMode,
    getCurrentViewMode: () => issuesViewMode
  }))

  const handleIssueDeleted = () => {
    handleBackToList()
    setRefreshKey(prev => prev + 1)
  }


  return (
    <>
      {/* Filters - Only show for issues list view */}
      {currentView === 'list' && (
        <div className="border-b border-gray-200 bg-white overflow-hidden relative">
          <div className="px-3 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center gap-2 sm:gap-3 relative z-0">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 border rounded-md p-1">
              <button
                onClick={() => setIssuesViewMode('list')}
                className={`p-1 rounded ${issuesViewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIssuesViewMode('kanban')}
                className={`p-1 rounded ${issuesViewMode === 'kanban' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                title="Kanban view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            
            <span className="text-sm text-gray-500 flex-shrink-0">Filter by:</span>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-8 text-sm">
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
              <SelectTrigger className="w-full sm:w-[140px] h-8 text-sm">
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
              <SelectTrigger className="w-full sm:w-[140px] h-8 text-sm">
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
        issuesViewMode === 'list' ? (
          <IssuesList 
            key={refreshKey}
            workspaceId={workspace.id} 
            workspaceSlug={workspace.slug}
            onIssueClick={handleIssueClick}
            statusFilter={statusFilter}
            priorityFilter={priorityFilter}
            typeFilter={typeFilter}
          />
        ) : (
          <KanbanBoard
            key={refreshKey}
            workspaceId={workspace.id}
            onIssueClick={handleIssueClick}
            statusFilter={statusFilter}
            priorityFilter={priorityFilter}
            typeFilter={typeFilter}
          />
        )
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