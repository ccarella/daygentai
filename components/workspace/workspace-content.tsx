'use client'

import { useState, useImperativeHandle, forwardRef, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { IssuesList } from '@/components/issues/issues-list'
import dynamic from 'next/dynamic'
import { useDebounce } from '@/hooks/use-debounce'
import { useKeyboardContext, KeyboardPriority } from '@/lib/keyboard'
import { KanbanBoardSkeleton } from '@/components/issues/kanban-skeleton'
import { IssueDetailsSkeleton } from '@/components/issues/issue-skeleton'
import { ContentSkeleton } from '@/components/ui/content-skeleton'
import { ProfileSettingsSkeleton } from '@/components/settings/settings-skeleton'

const KanbanBoard = dynamic(
  () => import('@/components/issues/kanban-board').then(mod => ({ default: mod.KanbanBoard })),
  { 
    ssr: false,
    loading: () => <KanbanBoardSkeleton />
  }
)
const IssueDetails = dynamic(
  () => import('@/components/issues/issue-details').then(mod => ({ default: mod.IssueDetails })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <IssueDetailsSkeleton />
        </div>
      </div>
    )
  }
)
import { Inbox } from '@/components/inbox/inbox'
const Cookbook = dynamic(
  () => import('@/components/cookbook/cookbook').then(mod => ({ default: mod.Cookbook })),
  { 
    ssr: false,
    loading: () => <ContentSkeleton />
  }
)
const ProfileSettings = dynamic(
  () => import('@/components/settings/profile-settings').then(mod => ({ default: mod.ProfileSettings })),
  { 
    ssr: false,
    loading: () => <ProfileSettingsSkeleton />
  }
)
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LayoutGrid, List, Filter, X } from 'lucide-react'
import { SearchBar, SearchBarRef } from '@/components/workspace/search-bar'
import { getWorkspaceTags } from '@/lib/tags'
import { Tag as TagComponent } from '@/components/ui/tag'

interface WorkspaceContentProps {
  workspace: {
    id: string
    name: string
    slug: string
    avatar_url: string | null
    owner_id: string
  }
  initialView?: 'list' | 'issue' | 'inbox' | 'cookbook' | 'settings'
  initialIssueId?: string
  onAvatarUpdate?: (newAvatar: string) => void
}

export interface WorkspaceContentRef {
  navigateToIssuesList: () => void
  navigateToInbox: () => void
  navigateToCookbook: () => void
  navigateToSettings: () => void
  toggleViewMode: () => void
  getCurrentViewMode: () => 'list' | 'kanban'
  toggleSearch: () => void
  isSearchVisible: () => boolean
  setStatusFilter: (status: string) => void
  getCurrentView: () => 'list' | 'issue' | 'inbox' | 'cookbook' | 'settings'
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
  function WorkspaceContent({ workspace, initialView = 'list', initialIssueId, onAvatarUpdate }, ref) {
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
    if (pathname.includes('/settings')) return 'settings'
    if (pathname.includes('/issue/')) return 'issue'
    return 'list'
  }
  
  const [currentView, setCurrentView] = useState<'list' | 'issue' | 'inbox' | 'cookbook' | 'settings'>(getInitialView())
  const [currentIssueId, setCurrentIssueId] = useState<string | null>(initialIssueId || getIssueIdFromPath() || null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [issuesViewMode, setIssuesViewMode] = useState<'list' | 'kanban'>('list')
  
  // Filter states - default based on view mode
  // List view defaults to Active (exclude_done), Kanban defaults to All
  const [statusFilter, setStatusFilter] = useState<string>('exclude_done')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false)
  const [isFiltersVisible, setIsFiltersVisible] = useState<boolean>(false)
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const [searchResultCount, setSearchResultCount] = useState<number>(0)
  const searchInputRef = useRef<SearchBarRef>(null)
  const [availableTags, setAvailableTags] = useState<Array<{id: string, name: string, color?: string | undefined}>>([])
  
  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  
  // Fetch available tags
  useEffect(() => {
    const loadTags = async () => {
      const tags = await getWorkspaceTags(workspace.id)
      setAvailableTags(tags)
    }
    loadTags()
  }, [workspace.id])
  
  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname
      if (pathname.includes('/inbox')) {
        setCurrentView('inbox')
        setCurrentIssueId(null)
      } else if (pathname.includes('/cookbook')) {
        setCurrentView('cookbook')
        setCurrentIssueId(null)
      } else if (pathname.includes('/settings')) {
        setCurrentView('settings')
        setCurrentIssueId(null)
      } else if (pathname.includes('/issue/')) {
        const issueId = getIssueIdFromPath()
        if (issueId) {
          setCurrentView('issue')
          setCurrentIssueId(issueId)
        }
      } else if (pathname.endsWith(`/${workspace.slug}`)) {
        setCurrentView('list')
        setCurrentIssueId(null)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [workspace.slug])

  // Handle keyboard shortcuts using the new keyboard manager
  useKeyboardContext({
    id: 'workspace-search',
    priority: KeyboardPriority.FOCUSED,
    enabled: true,
    shortcuts: {
      '/': {
        handler: () => {
          setIsSearchVisible(prev => !prev)
          return true
        },
        description: 'Toggle search',
      },
      'escape': {
        handler: () => {
          if (isSearchVisible) {
            setIsSearchVisible(false)
            setSearchQuery('')
            return true
          }
          return false // Let other handlers process Escape if search is not visible
        },
        description: 'Close search',
      },
    },
    deps: [isSearchVisible],
  })

  // Auto-focus search input when it becomes visible
  useEffect(() => {
    if (isSearchVisible && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchVisible])
  
  // Track search state
  useEffect(() => {
    if (searchQuery !== debouncedSearchQuery) {
      setIsSearching(true)
    } else {
      setIsSearching(false)
    }
  }, [searchQuery, debouncedSearchQuery])

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

  const handleNavigateToSettings = () => {
    setCurrentView('settings')
    setCurrentIssueId(null)
    // Update URL without page refresh
    window.history.pushState({}, '', `/${workspace.slug}/settings`)
  }

  // Shared function to update filters based on view mode
  const updateFiltersForViewMode = (viewMode: 'list' | 'kanban') => {
    if (viewMode === 'list') {
      // List view default: Active issues (exclude done)
      setStatusFilter('exclude_done')
    } else {
      // Kanban view default: All issues
      setStatusFilter('all')
    }
    // Reset other filters to default
    setPriorityFilter('all')
    setTypeFilter('all')
  }

  // Handler to toggle between list and kanban views
  const handleToggleViewMode = () => {
    setIssuesViewMode(prev => {
      const newMode = prev === 'list' ? 'kanban' : 'list'
      updateFiltersForViewMode(newMode)
      return newMode
    })
  }

  // Expose method to parent component
  useImperativeHandle(ref, () => ({
    navigateToIssuesList: handleBackToList,
    navigateToInbox: handleNavigateToInbox,
    navigateToCookbook: handleNavigateToCookbook,
    navigateToSettings: handleNavigateToSettings,
    toggleViewMode: handleToggleViewMode,
    getCurrentViewMode: () => issuesViewMode,
    toggleSearch: () => setIsSearchVisible(prev => !prev),
    isSearchVisible: () => isSearchVisible,
    setStatusFilter: (status: string) => setStatusFilter(status),
    getCurrentView: () => currentView
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
            placeholder="Search issues by title..."
            isSearching={isSearching}
            showResultCount={true}
            resultCount={searchResultCount}
            onEscape={() => {
              setIsSearchVisible(false)
              setSearchQuery('')
              setSearchResultCount(0)
            }}
          />
        </div>
      </div>
      
      {/* Filters - Show for both list views (list and kanban) */}
      {currentView === 'list' && (issuesViewMode === 'list' || issuesViewMode === 'kanban') && (
        <div className="border-b border-gray-200 bg-white overflow-hidden relative">
          {/* Mobile and Desktop Filter Header */}
          <div className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-3">
            {/* Left side - Search hint and desktop filters */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              {/* Search hint when search is hidden */}
              {!isSearchVisible && !debouncedSearchQuery && (
                <div className="text-sm text-gray-500 hidden sm:block">
                  Press <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border border-gray-200 rounded">/</kbd> to search
                </div>
              )}
              
              {/* Active search indicator */}
              {!isSearchVisible && debouncedSearchQuery && (
                <div className="text-sm text-blue-600 font-medium hidden sm:flex items-center gap-2">
                  <span>Searching: &ldquo;{debouncedSearchQuery}&rdquo;</span>
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSearchResultCount(0)
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
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
                
                {/* Tag Filter */}
                {availableTags.length > 0 && (
                  <Select value={tagFilter} onValueChange={setTagFilter}>
                    <SelectTrigger className="w-[140px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tags</SelectItem>
                      {availableTags.map((tag) => (
                        <SelectItem key={tag.id} value={tag.id}>
                          <div className="flex items-center gap-2">
                            <TagComponent color={tag.color} className="text-xs">
                              {tag.name}
                            </TagComponent>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
                  onClick={() => {
                    if (issuesViewMode !== 'list') {
                      setIssuesViewMode('list')
                      updateFiltersForViewMode('list')
                    }
                  }}
                  className={`p-1 rounded ${issuesViewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                  title="List view"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (issuesViewMode !== 'kanban') {
                      setIssuesViewMode('kanban')
                      updateFiltersForViewMode('kanban')
                    }
                  }}
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
              
              {/* Tag Filter */}
              {availableTags.length > 0 && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Tag</label>
                  <Select value={tagFilter} onValueChange={setTagFilter}>
                    <SelectTrigger className="w-full h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tags</SelectItem>
                      {availableTags.map((tag) => (
                        <SelectItem key={tag.id} value={tag.id}>
                          <div className="flex items-center gap-2">
                            <TagComponent color={tag.color} className="text-xs">
                              {tag.name}
                            </TagComponent>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Content */}
      {currentView === 'list' ? (
        issuesViewMode === 'list' ? (
          <IssuesList 
            key={`list-${refreshKey}`}
            workspaceId={workspace.id} 
            workspaceSlug={workspace.slug}
            onIssueClick={handleIssueClick}
            statusFilter={statusFilter}
            priorityFilter={priorityFilter}
            typeFilter={typeFilter}
            tagFilter={tagFilter}
            searchQuery={debouncedSearchQuery}
            onSearchResultsChange={setSearchResultCount}
          />
        ) : (
          <KanbanBoard
            key={`kanban-${refreshKey}`}
            workspaceId={workspace.id}
            onIssueClick={handleIssueClick}
            statusFilter={statusFilter}
            priorityFilter={priorityFilter}
            typeFilter={typeFilter}
            tagFilter={tagFilter}
            searchQuery={debouncedSearchQuery}
          />
        )
      ) : currentView === 'inbox' ? (
        <Inbox />
      ) : currentView === 'cookbook' ? (
        <Cookbook workspaceId={workspace.id} workspaceSlug={workspace.slug} />
      ) : currentView === 'settings' ? (
        <ProfileSettings {...(onAvatarUpdate && { onAvatarUpdate })} />
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