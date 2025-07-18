'use client'

import { useState, useImperativeHandle, forwardRef, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { IssuesList } from '@/components/issues/issues-list'
import dynamic from 'next/dynamic'

const KanbanBoard = dynamic(
  () => import('@/components/issues/kanban-board').then(mod => ({ default: mod.KanbanBoard })),
  { 
    ssr: false,
    loading: () => <div className="flex h-full items-center justify-center"><div className="text-gray-500">Loading Kanban view...</div></div>
  }
)
const IssueDetails = dynamic(
  () => import('@/components/issues/issue-details').then(mod => ({ default: mod.IssueDetails })),
  { 
    ssr: false,
    loading: () => <div className="flex h-full items-center justify-center"><div className="text-gray-500">Loading issue...</div></div>
  }
)
import { Inbox } from '@/components/inbox/inbox'
const Cookbook = dynamic(
  () => import('@/components/cookbook/cookbook').then(mod => ({ default: mod.Cookbook })),
  { 
    ssr: false,
    loading: () => <div className="flex h-full items-center justify-center"><div className="text-gray-500">Loading cookbook...</div></div>
  }
)
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LayoutGrid, List, Filter } from 'lucide-react'
import { SearchBar } from '@/components/workspace/search-bar'

interface WorkspaceContentProps {
  workspace: {
    id: string
    name: string
    slug: string
    avatar_url: string | null
    owner_id: string
  }
  initialView?: 'list' | 'issue' | 'inbox' | 'cookbook'
  initialIssueId?: string
}

export interface WorkspaceContentRef {
  navigateToIssuesList: () => void
  navigateToInbox: () => void
  navigateToCookbook: () => void
  toggleViewMode: () => void
  getCurrentViewMode: () => 'list' | 'kanban'
  toggleSearch: () => void
  isSearchVisible: () => boolean
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
    if (pathname.includes('/cookbook')) return 'cookbook'
    if (pathname.includes('/issue/')) return 'issue'
    return 'list'
  }
  
  const [currentView, setCurrentView] = useState<'list' | 'issue' | 'inbox' | 'cookbook'>(getInitialView())
  const [currentIssueId, setCurrentIssueId] = useState<string | null>(initialIssueId || getIssueIdFromPath() || null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [issuesViewMode, setIssuesViewMode] = useState<'list' | 'kanban'>('list')
  
  // Filter states - default excludes done status
  const [statusFilter, setStatusFilter] = useState<string>('exclude_done')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false)
  const [isFiltersVisible, setIsFiltersVisible] = useState<boolean>(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  // TODO: Pass searchQuery to IssuesList and KanbanBoard components when search functionality is implemented
  console.log('Search query:', searchQuery) // Temporary to avoid unused variable warning

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle search visibility when "/" is pressed
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Don't trigger if user is typing in an input/textarea
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return
        }
        
        e.preventDefault()
        setIsSearchVisible(prev => !prev)
      }
      
      // Close search on Escape
      if (e.key === 'Escape' && isSearchVisible) {
        setIsSearchVisible(false)
        setSearchQuery('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSearchVisible])

  // Auto-focus search input when it becomes visible
  useEffect(() => {
    if (isSearchVisible && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchVisible])

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

  const handleNavigateToCookbook = () => {
    setCurrentView('cookbook')
    setCurrentIssueId(null)
    // Update URL without page refresh
    window.history.pushState({}, '', `/${workspace.slug}/cookbook`)
  }

  // Handler to toggle between list and kanban views
  const handleToggleViewMode = () => {
    setIssuesViewMode(prev => prev === 'list' ? 'kanban' : 'list')
  }

  // Expose method to parent component
  useImperativeHandle(ref, () => ({
    navigateToIssuesList: handleBackToList,
    navigateToInbox: handleNavigateToInbox,
    navigateToCookbook: handleNavigateToCookbook,
    toggleViewMode: handleToggleViewMode,
    getCurrentViewMode: () => issuesViewMode,
    toggleSearch: () => setIsSearchVisible(prev => !prev),
    isSearchVisible: () => isSearchVisible
  }))

  const handleIssueDeleted = () => {
    handleBackToList()
    setRefreshKey(prev => prev + 1)
  }


  return (
    <>
      {/* Search Bar - Only show for issues list view and when visible */}
      <div className={`bg-white border-b border-gray-200 transition-all duration-200 ease-in-out overflow-hidden ${
        currentView === 'list' && isSearchVisible ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="px-3 sm:px-6 py-6 sm:py-8">
          <SearchBar 
            ref={searchInputRef}
            onSearch={setSearchQuery}
            placeholder="Search issues..."
            onEscape={() => {
              setIsSearchVisible(false)
              setSearchQuery('')
            }}
          />
        </div>
      </div>
      
      {/* Filters - Only show for issues list view */}
      {currentView === 'list' && (
        <div className="border-b border-gray-200 bg-white overflow-hidden relative">
          {/* Mobile and Desktop Filter Header */}
          <div className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-3">
            {/* Left side - Search hint and desktop filters */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              {/* Search hint when search is hidden */}
              {!isSearchVisible && (
                <div className="text-sm text-gray-500 hidden sm:block">
                  Press <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border border-gray-200 rounded">/</kbd> to search
                </div>
              )}
              
              {/* Desktop filters - always visible on sm+ screens */}
              <div className="hidden sm:flex items-center gap-3 flex-1 min-w-0">
                <span className="text-sm text-gray-500 flex-shrink-0">Filter by:</span>
                
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
            
            {/* Right side - Mobile filter toggle and view mode toggle */}
            <div className="flex items-center gap-2">
              {/* Mobile filter toggle - only visible on small screens */}
              <button
                onClick={() => setIsFiltersVisible(!isFiltersVisible)}
                className="sm:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
                title="Toggle filters"
              >
                <Filter className="h-4 w-4" />
              </button>
              
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
            </div>
          </div>
          
          {/* Mobile filters - only visible when toggled on small screens */}
          <div className={`sm:hidden border-t border-gray-200 transition-all duration-200 ease-in-out overflow-hidden ${
            isFiltersVisible ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="px-3 py-4 space-y-3">
              <div className="text-sm text-gray-500 font-medium">Filter by:</div>
              
              {/* Status Filter */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full h-8 text-sm">
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
              </div>
              
              {/* Priority Filter */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Priority</label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-full h-8 text-sm">
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
              </div>
              
              {/* Type Filter */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full h-8 text-sm">
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
      ) : currentView === 'cookbook' ? (
        <Cookbook />
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