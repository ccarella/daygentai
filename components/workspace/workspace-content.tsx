'use client'

import { useState, useImperativeHandle, forwardRef, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { IssuesList } from '@/components/issues/issues-list'
import dynamic from 'next/dynamic'
import { useDebounce } from '@/hooks/use-debounce'
import { useKeyboardContext, KeyboardPriority } from '@/lib/keyboard'
import { KanbanBoardSkeleton } from '@/components/issues/kanban-skeleton'
import { IssueDetailsSkeleton } from '@/components/issues/issue-skeleton'
import { ContentSkeleton } from '@/components/ui/content-skeleton'
import { 
  subscribeToNavigateToIssues,
  subscribeToNavigateToInbox,
  subscribeToToggleViewMode,
  subscribeToToggleSearch,
  subscribeToSetStatusFilter,
  emitCreateIssueRequest
} from '@/lib/events/issue-events'

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
const RecipeDetails = dynamic(
  () => import('@/components/cookbook/recipe-details').then(mod => ({ default: mod.RecipeDetails })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <ContentSkeleton />
        </div>
      </div>
    )
  }
)
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LayoutGrid, List, Filter, X, Plus, ArrowUpDown } from 'lucide-react'
import { SearchBar, SearchBarRef } from '@/components/workspace/search-bar'
import { getWorkspaceTags } from '@/lib/tags'
import { Tag as TagComponent } from '@/components/ui/tag'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface WorkspaceContentProps {
  workspace: {
    id: string
    name: string
    slug: string
    avatar_url: string | null
    owner_id: string
  }
  initialView?: 'list' | 'issue' | 'inbox' | 'cookbook' | 'recipe'
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
  setStatusFilter: (status: string) => void
  getCurrentView: () => 'list' | 'issue' | 'inbox' | 'cookbook' | 'recipe'
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
  { value: 'chore', label: 'Chore' },
  { value: 'design', label: 'Design' },
  { value: 'non-technical', label: 'Non-technical' },
]

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'priority_high', label: 'Severity (High)' },
  { value: 'priority_low', label: 'Severity (Low)' },
  { value: 'type', label: 'Type' },
  { value: 'tag', label: 'Tag' },
]

export const WorkspaceContent = forwardRef<WorkspaceContentRef, WorkspaceContentProps>(
  function WorkspaceContent({ workspace, initialView = 'list', initialIssueId }, ref) {
  const pathname = usePathname()
  
  // Extract issue ID from URL if present
  const getIssueIdFromPath = () => {
    const match = pathname.match(/\/issue\/([a-zA-Z0-9-]+)/)
    return match ? match[1] : null
  }
  
  // Extract recipe ID from URL if present
  const getRecipeIdFromPath = () => {
    const match = pathname.match(/\/recipe\/([a-zA-Z0-9-]+)/)
    return match ? match[1] : null
  }
  
  // Determine initial view based on URL if not provided
  const getInitialView = () => {
    if (initialView !== 'list') return initialView
    if (pathname.includes('/inbox')) return 'inbox'
    if (pathname.includes('/cookbook')) return 'cookbook'
    if (pathname.includes('/issue/')) return 'issue'
    if (pathname.includes('/recipe/')) return 'recipe'
    return 'list'
  }
  
  const [currentView, setCurrentView] = useState<'list' | 'issue' | 'inbox' | 'cookbook' | 'recipe'>(getInitialView())
  const [currentIssueId, setCurrentIssueId] = useState<string | null>(initialIssueId || getIssueIdFromPath() || null)
  const [currentRecipeId, setCurrentRecipeId] = useState<string | null>(getRecipeIdFromPath() || null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [issuesViewMode, setIssuesViewMode] = useState<'list' | 'kanban'>('list')
  
  // Filter states - default based on view mode
  // List view defaults to Active (exclude_done), Kanban defaults to All
  const [statusFilter, setStatusFilter] = useState<string>('exclude_done')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false)
  const [isFiltersVisible, setIsFiltersVisible] = useState<boolean>(false)
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const [searchResultCount, setSearchResultCount] = useState<number>(0)
  const searchInputRef = useRef<SearchBarRef>(null)
  const [availableTags, setAvailableTags] = useState<Array<{id: string, name: string, color?: string | undefined}>>([])
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState<boolean>(false)
  const [isSortPopoverOpen, setIsSortPopoverOpen] = useState<boolean>(false)
  
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
        setCurrentRecipeId(null)
      } else if (pathname.includes('/cookbook')) {
        setCurrentView('cookbook')
        setCurrentIssueId(null)
        setCurrentRecipeId(null)
      } else if (pathname.includes('/issue/')) {
        const issueId = getIssueIdFromPath()
        if (issueId) {
          setCurrentView('issue')
          setCurrentIssueId(issueId)
          setCurrentRecipeId(null)
        }
      } else if (pathname.includes('/recipe/')) {
        const recipeId = getRecipeIdFromPath()
        if (recipeId) {
          setCurrentView('recipe')
          setCurrentRecipeId(recipeId)
          setCurrentIssueId(null)
        }
      } else if (pathname.endsWith(`/${workspace.slug}`)) {
        setCurrentView('list')
        setCurrentIssueId(null)
        setCurrentRecipeId(null)
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
      'f': {
        handler: () => {
          setIsFilterPopoverOpen(prev => !prev)
          return true
        },
        description: 'Toggle filter',
      },
      's': {
        handler: () => {
          setIsSortPopoverOpen(prev => !prev)
          return true
        },
        description: 'Toggle sort',
      },
      'escape': {
        handler: () => {
          if (isSearchVisible) {
            setIsSearchVisible(false)
            setSearchQuery('')
            return true
          }
          if (isFilterPopoverOpen) {
            setIsFilterPopoverOpen(false)
            return true
          }
          if (isSortPopoverOpen) {
            setIsSortPopoverOpen(false)
            return true
          }
          return false // Let other handlers process Escape if nothing is open
        },
        description: 'Close search/filter/sort',
      },
    },
    deps: [isSearchVisible, isFilterPopoverOpen, isSortPopoverOpen],
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
    setCurrentRecipeId(null)
    setCurrentView('issue')
    // Update URL without page refresh
    window.history.pushState({}, '', `/${workspace.slug}/issue/${issueId}`)
  }

  const handleRecipeClick = (recipeId: string) => {
    setCurrentRecipeId(recipeId)
    setCurrentIssueId(null)
    setCurrentView('recipe')
    // Update URL without page refresh
    window.history.pushState({}, '', `/${workspace.slug}/recipe/${recipeId}`)
  }

  const handleBackToList = useCallback(() => {
    setCurrentView('list')
    setCurrentIssueId(null)
    setCurrentRecipeId(null)
    // Update URL without page refresh
    window.history.pushState({}, '', `/${workspace.slug}`)
  }, [workspace.slug])

  const handleBackToCookbook = useCallback(() => {
    setCurrentView('cookbook')
    setCurrentRecipeId(null)
    setCurrentIssueId(null)
    // Update URL without page refresh
    window.history.pushState({}, '', `/${workspace.slug}/cookbook`)
  }, [workspace.slug])

  const handleNavigateToInbox = useCallback(() => {
    setCurrentView('inbox')
    setCurrentIssueId(null)
    setCurrentRecipeId(null)
    // Update URL without page refresh
    window.history.pushState({}, '', `/${workspace.slug}/inbox`)
  }, [workspace.slug])

  const handleNavigateToCookbook = useCallback(() => {
    setCurrentView('cookbook')
    setCurrentIssueId(null)
    setCurrentRecipeId(null)
    // Update URL without page refresh
    window.history.pushState({}, '', `/${workspace.slug}/cookbook`)
  }, [workspace.slug])


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
  const handleToggleViewMode = useCallback(() => {
    setIssuesViewMode(prev => {
      const newMode = prev === 'list' ? 'kanban' : 'list'
      updateFiltersForViewMode(newMode)
      return newMode
    })
  }, [])

  // Expose method to parent component
  useImperativeHandle(ref, () => ({
    navigateToIssuesList: handleBackToList,
    navigateToInbox: handleNavigateToInbox,
    navigateToCookbook: handleNavigateToCookbook,
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

  // Subscribe to navigation events from command palette
  useEffect(() => {
    const unsubscribeNavigateToIssues = subscribeToNavigateToIssues(() => {
      handleBackToList()
    })
    
    const unsubscribeNavigateToInbox = subscribeToNavigateToInbox(() => {
      handleNavigateToInbox()
    })
    
    const unsubscribeToggleViewMode = subscribeToToggleViewMode(() => {
      handleToggleViewMode()
    })
    
    const unsubscribeToggleSearch = subscribeToToggleSearch(() => {
      setIsSearchVisible(prev => !prev)
    })
    
    const unsubscribeSetStatusFilter = subscribeToSetStatusFilter((event) => {
      setStatusFilter(event.detail.status)
    })
    
    return () => {
      unsubscribeNavigateToIssues()
      unsubscribeNavigateToInbox()
      unsubscribeToggleViewMode()
      unsubscribeToggleSearch()
      unsubscribeSetStatusFilter()
    }
  }, [handleBackToList, handleNavigateToInbox, handleToggleViewMode, setIsSearchVisible, setStatusFilter])


  return (
    <>
      {/* Search Bar - Only show for issues list view and when visible */}
      <div className={`bg-background border-b border-border transition-all duration-200 ease-in-out overflow-hidden ${
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
        <div className="border-b border-border bg-background overflow-hidden relative">
          {/* Mobile and Desktop Filter Header */}
          <div className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-3">
            {/* Left side - Create issue button (mobile) and search indicators */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              {/* Create Issue Button - Mobile Only */}
              <button
                onClick={() => emitCreateIssueRequest()}
                className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-accent transition-colors text-sm font-medium"
                title="Create issue"
                aria-label="Create issue"
              >
                <Plus className="h-4 w-4" />
                <span>Create issue</span>
              </button>
              
              {/* Search hint when search is hidden */}
              {!isSearchVisible && !debouncedSearchQuery && (
                <div className="text-sm text-muted-foreground">
                  Press <kbd className="px-1.5 py-0.5 text-xs bg-muted border border-border rounded">/</kbd> to search
                </div>
              )}
              
              {/* Active search indicator */}
              {!isSearchVisible && debouncedSearchQuery && (
                <div className="text-sm text-primary font-medium flex items-center gap-2">
                  <span>Searching: &ldquo;{debouncedSearchQuery}&rdquo;</span>
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSearchResultCount(0)
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            
            {/* Right side - Filter, sort, and view mode controls */}
            <div className="flex items-center gap-2">
              {/* Mobile filter toggle - only visible on small screens */}
              <button
                onClick={() => setIsFiltersVisible(!isFiltersVisible)}
                className="sm:hidden p-2 rounded-md hover:bg-accent transition-colors"
                title="Toggle filters"
              >
                <Filter className="h-4 w-4" />
              </button>
              
              {/* Desktop Filter Popover - hidden on mobile */}
              <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="hidden sm:flex p-2 rounded-md hover:bg-accent transition-colors relative"
                    title="Filter (F)"
                    aria-label="Filter"
                  >
                    <Filter className="h-4 w-4" />
                    {/* Show indicator when any filter differs from default values
                        Default: statusFilter='exclude_done', others='all' */}
                    {(statusFilter !== 'exclude_done' || priorityFilter !== 'all' || typeFilter !== 'all' || tagFilter !== 'all') && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end">
                  <div className="space-y-4">
                    <div className="font-medium text-sm">Filter by</div>
                    
                    {/* Status Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
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
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Priority</label>
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
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Type</label>
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
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Tag</label>
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
                </PopoverContent>
              </Popover>
              
              {/* Desktop Sort Popover - hidden on mobile */}
              <Popover open={isSortPopoverOpen} onOpenChange={setIsSortPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="hidden sm:flex p-2 rounded-md hover:bg-accent transition-colors"
                    title="Sort (S)"
                    aria-label="Sort"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                  <div className="space-y-1">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value)
                          setIsSortPopoverOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors ${
                          sortBy === option.value ? 'bg-accent' : ''
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 border rounded-md p-1">
                <button
                  onClick={() => {
                    if (issuesViewMode !== 'list') {
                      setIssuesViewMode('list')
                      updateFiltersForViewMode('list')
                    }
                  }}
                  className={`p-1 rounded ${issuesViewMode === 'list' ? 'bg-accent' : 'hover:bg-accent'}`}
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
                  className={`p-1 rounded ${issuesViewMode === 'kanban' ? 'bg-accent' : 'hover:bg-accent'}`}
                  title="Kanban view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Mobile filters - only visible when toggled on small screens */}
          <div className={`sm:hidden border-t border-border transition-all duration-200 ease-in-out overflow-hidden ${
            isFiltersVisible ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="px-3 py-4 space-y-3">
              <div className="text-sm text-muted-foreground font-medium">Filter by:</div>
              
              {/* Status Filter */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Status</label>
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
                <label className="text-sm font-medium text-foreground">Priority</label>
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
                <label className="text-sm font-medium text-foreground">Type</label>
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
                  <label className="text-sm font-medium text-foreground">Tag</label>
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
              
              {/* Sort By Filter */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Sort by</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
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
            key={`list-${refreshKey}`}
            workspaceId={workspace.id} 
            workspaceSlug={workspace.slug}
            onIssueClick={handleIssueClick}
            statusFilter={statusFilter}
            priorityFilter={priorityFilter}
            typeFilter={typeFilter}
            tagFilter={tagFilter}
            sortBy={sortBy}
            searchQuery={debouncedSearchQuery}
            onSearchResultsChange={setSearchResultCount}
            onSearchingChange={setIsSearching}
          />
        ) : (
          <KanbanBoard
            key={`kanban-${refreshKey}`}
            workspaceId={workspace.id}
            workspaceSlug={workspace.slug}
            onIssueClick={handleIssueClick}
            statusFilter={statusFilter}
            priorityFilter={priorityFilter}
            typeFilter={typeFilter}
            tagFilter={tagFilter}
            sortBy={sortBy}
            searchQuery={debouncedSearchQuery}
          />
        )
      ) : currentView === 'inbox' ? (
        <Inbox />
      ) : currentView === 'cookbook' ? (
        <Cookbook 
          workspaceId={workspace.id} 
          workspaceSlug={workspace.slug} 
          onRecipeClick={handleRecipeClick}
        />
      ) : currentView === 'recipe' && currentRecipeId ? (
        <RecipeDetails
          recipeId={currentRecipeId}
          onBack={handleBackToCookbook}
        />
      ) : currentIssueId ? (
        <IssueDetails
          issueId={currentIssueId}
          workspaceSlug={workspace.slug}
          onBack={handleBackToList}
          onDeleted={handleIssueDeleted}
        />
      ) : null}
    </>
  )
})