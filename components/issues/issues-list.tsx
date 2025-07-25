'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useIssueCache, type ListCacheKey } from '@/contexts/issue-cache-context'
import { stripMarkdown } from '@/lib/markdown-utils'
import { IssueListSkeleton } from './issue-skeleton'
import { Tag as TagComponent } from '@/components/ui/tag'
import { useSortableList } from '@/hooks/use-sortable-list'
import { GripVertical } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
// Navigation is now handled by useWorkspaceNavigation in the parent component

interface TagData {
  id: string
  name: string
  color?: string
}

interface Issue {
  id: string
  title: string
  description: string | null
  type: 'feature' | 'bug' | 'design' | 'product'
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'todo' | 'in_progress' | 'in_review' | 'done'
  created_at: string
  created_by: string
  assignee_id: string | null
  position: number
  issue_tags?: Array<{ tags: TagData }>
  creator?: {
    name: string
    avatar_url?: string | null
  }
}

interface IssuesListProps {
  workspaceId: string
  workspaceSlug: string
  onIssueClick?: (issueId: string) => void
  statusFilter?: string
  priorityFilter?: string
  typeFilter?: string
  tagFilter?: string
  sortBy?: string
  searchQuery?: string
  onSearchResultsChange?: (count: number) => void
  onSearchingChange?: (isSearching: boolean) => void
}

const typeColors = {
  feature: 'text-primary bg-primary/10 border border-primary/20',
  bug: 'text-destructive bg-destructive/10 border border-destructive/20',
  design: 'text-primary bg-primary/10 border border-primary/20',
  product: 'text-muted-foreground bg-muted border border-border'
}

const typeLabels = {
  feature: 'Feature',
  bug: 'Bug',
  design: 'Design',
  product: 'Product'
}

const priorityColors = {
  critical: 'text-destructive bg-destructive/10 border border-destructive/20',
  high: 'text-destructive bg-destructive/10 border border-destructive/20',
  medium: 'text-muted-foreground bg-muted border border-border',
  low: 'text-chart-1 bg-chart-1/10 border border-chart-1/20'
}

const priorityLabels = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
}

const statusColors = {
  todo: 'text-muted-foreground bg-muted border border-border',
  in_progress: 'text-primary bg-primary/10 border border-primary/20',
  in_review: 'text-yellow-700 bg-yellow-50 border border-yellow-200',
  done: 'text-green-700 bg-green-50 border border-green-200'
}

const statusLabels = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done'
}

const ISSUES_PER_PAGE = 50

export function IssuesList({ 
  workspaceId, 
  workspaceSlug, 
  onIssueClick,
  statusFilter = 'exclude_done',
  priorityFilter = 'all',
  typeFilter = 'all',
  tagFilter = 'all',
  sortBy = 'newest',
  searchQuery = '',
  onSearchResultsChange,
  onSearchingChange
}: IssuesListProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { preloadIssues, getListCache, setListCache } = useIssueCache()
  const [issues, setIssues] = useState<Issue[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [isStale, setIsStale] = useState(false)
  const isLoadingRef = useRef(false)
  const [isSearching, setIsSearching] = useState(false)
  const previousSearchQuery = useRef(searchQuery)
  const hasInitiallyLoaded = useRef(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const preloadedIssuesRef = useRef<Set<string>>(new Set())
  const listContainerRef = useRef<HTMLDivElement>(null)
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Handle position updates
  const handleReorder = useCallback(async (updates: { id: string; position: number }[]) => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/issues/update-positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      })

      if (!response.ok) {
        throw new Error('Failed to update positions')
      }

      toast({
        title: 'Issues reordered',
        description: 'The issue order has been updated.',
      })
    } catch (error) {
      console.error('Failed to reorder issues:', error)
      toast({
        title: 'Failed to reorder',
        description: 'There was an error updating the issue order. Please try again.',
        variant: 'destructive',
      })
      throw error // Re-throw to trigger revert in the hook
    }
  }, [workspaceSlug, toast])

  // Initialize sortable list hook
  const {
    items: sortableIssues,
    getDragHandleProps,
    getDropZoneProps,
    draggedItemId,
    dragOverIndex
  } = useSortableList({
    items: issues,
    getItemId: (issue) => issue.id,
    onReorder: handleReorder,
    onError: (error) => {
      console.error('Drag and drop error:', error)
    }
  })

  // Check if drag and drop should be enabled
  const isDragEnabled = sortBy === '' && !searchQuery && !initialLoading

  const fetchIssues = useCallback(async (pageNum: number, append = false, skipCache = false) => {
    if (isLoadingRef.current && !skipCache) return { issues: [], hasMore: false, totalCount: 0 }
    
    // Generate cache key
    const cacheKey: ListCacheKey = {
      workspaceId,
      statusFilter,
      priorityFilter,
      typeFilter,
      tagFilter,
      sortBy,
      searchQuery,
      page: pageNum
    }
    
    // Check cache first (unless skipping cache)
    if (!skipCache && !append) {
      const cachedData = getListCache(cacheKey)
      if (cachedData) {
        // Check if cache is fresh (less than 30 seconds old)
        const isFresh = Date.now() - cachedData.timestamp < 30000
        // List loaded from cache
        
        if (isFresh) {
          // Return fresh cached data immediately
          return cachedData
        } else {
          // Return stale data but mark for background refresh
          setIsStale(true)
          // Continue to fetch fresh data below
        }
      }
    }
    
    isLoadingRef.current = true
    const supabase = createClient()
    
    // If there's a search query, use the search function
    if (searchQuery && searchQuery.trim() !== '') {
      // Call the search function via RPC
      const { data, error } = await supabase
        .rpc('search_issues', {
          search_query: searchQuery.trim(),
          p_workspace_id: workspaceId,
          limit_count: ISSUES_PER_PAGE + (pageNum * ISSUES_PER_PAGE)
        })

      isLoadingRef.current = false

      if (error) {
        console.error('Error searching issues:', error)
        return { issues: [], hasMore: false, totalCount: 0 }
      }

      const allSearchResults = data || []
      
      // Apply client-side filters on search results
      let filteredResults = allSearchResults
      
      if (statusFilter === 'exclude_done') {
        filteredResults = filteredResults.filter((issue: Issue) => issue.status !== 'done')
      } else if (statusFilter !== 'all') {
        filteredResults = filteredResults.filter((issue: Issue) => issue.status === statusFilter)
      }

      if (priorityFilter !== 'all') {
        filteredResults = filteredResults.filter((issue: Issue) => issue.priority === priorityFilter)
      }

      if (typeFilter !== 'all') {
        // Handle multiple types separated by comma
        if (typeFilter.includes(',')) {
          const types = typeFilter.split(',')
          filteredResults = filteredResults.filter((issue: Issue) => types.includes(issue.type))
        } else {
          filteredResults = filteredResults.filter((issue: Issue) => issue.type === typeFilter)
        }
      }

      if (tagFilter !== 'all') {
        filteredResults = filteredResults.filter((issue: Issue) => 
          issue.issue_tags && issue.issue_tags.some(({ tags }) => tags.id === tagFilter)
        )
      }

      // Apply sorting to filtered results
      const sortedResults = [...filteredResults].sort((a, b) => {
        switch (sortBy) {
          case 'oldest':
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          case 'priority_high':
            // Priority order: critical(0) > high(1) > medium(2) > low(3)
            const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
            return (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4)
          case 'priority_low':
            // Priority order: low(0) > medium(1) > high(2) > critical(3)
            const priorityOrderReverse: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 }
            return (priorityOrderReverse[a.priority] || 4) - (priorityOrderReverse[b.priority] || 4)
          case 'type':
            return a.type.localeCompare(b.type)
          case 'tag':
            // Get first tag name for each issue (or empty string if no tags)
            const aTagName = a.issue_tags && a.issue_tags.length > 0 && a.issue_tags[0]?.tags ? a.issue_tags[0].tags.name : ''
            const bTagName = b.issue_tags && b.issue_tags.length > 0 && b.issue_tags[0]?.tags ? b.issue_tags[0].tags.name : ''
            return aTagName.localeCompare(bTagName)
          case 'newest':
          default:
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
      })

      // Apply pagination to sorted results
      const start = pageNum * ISSUES_PER_PAGE
      const paginatedResults = sortedResults.slice(start, start + ISSUES_PER_PAGE)
      const hasMorePages = sortedResults.length > start + ISSUES_PER_PAGE
      
      return { issues: paginatedResults, hasMore: hasMorePages, totalCount: sortedResults.length }
    }
    
    // Original query logic for non-search cases
    // First, get the total count with filters applied
    let countQuery = supabase
      .from('issues')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)

    // Apply filters for count query
    if (statusFilter === 'exclude_done') {
      countQuery = countQuery.neq('status', 'done')
    } else if (statusFilter !== 'all') {
      countQuery = countQuery.eq('status', statusFilter)
    }

    if (priorityFilter !== 'all') {
      countQuery = countQuery.eq('priority', priorityFilter)
    }

    if (typeFilter !== 'all') {
      // Handle multiple types separated by comma
      if (typeFilter.includes(',')) {
        const types = typeFilter.split(',')
        countQuery = countQuery.in('type', types)
      } else {
        countQuery = countQuery.eq('type', typeFilter)
      }
    }

    const { count: totalFilteredCount } = await countQuery

    // Now fetch the actual data with creator info
    let query = supabase
      .from('issues')
      .select(`
        *,
        issue_tags (
          tags (
            id,
            name,
            color
          )
        ),
        creator:creator_id (
          name,
          avatar_url
        )
      `)
      .eq('workspace_id', workspaceId)

    // Apply filters
    if (statusFilter === 'exclude_done') {
      query = query.neq('status', 'done')
    } else if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (priorityFilter !== 'all') {
      query = query.eq('priority', priorityFilter)
    }

    if (typeFilter !== 'all') {
      // Handle multiple types separated by comma
      if (typeFilter.includes(',')) {
        const types = typeFilter.split(',')
        query = query.in('type', types)
      } else {
        query = query.eq('type', typeFilter)
      }
    }

    // Apply ordering based on sortBy
    switch (sortBy) {
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      case 'priority_high':
        // Order by priority: critical > high > medium > low
        query = query.order('priority', { ascending: true })
        break
      case 'priority_low':
        // Order by priority: low > medium > high > critical
        query = query.order('priority', { ascending: false })
        break
      case 'type':
        // Order by type alphabetically
        query = query.order('type', { ascending: true })
        break
      case 'tag':
        // For tag sorting, we'll need to sort client-side after fetching
        // since Supabase doesn't support ordering by joined table data directly
        query = query.order('position', { ascending: true })
        break
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      default:
        // Default to position-based ordering for custom sort
        query = query.order('position', { ascending: true })
        break
    }

    // Apply range for pagination
    const start = pageNum * ISSUES_PER_PAGE
    const end = start + ISSUES_PER_PAGE - 1
    query = query.range(start, end)

    const { data, error } = await query

    isLoadingRef.current = false

    if (error) {
      console.error('Error fetching issues:', error)
      return { issues: [], hasMore: false, totalCount: 0 }
    }

    let newIssues = data || []
    
    // Apply tag filter on the client side
    if (tagFilter !== 'all') {
      newIssues = newIssues.filter((issue: Issue) => 
        issue.issue_tags && issue.issue_tags.some(({ tags }) => tags.id === tagFilter)
      )
    }
    
    // Apply client-side sorting for tag option
    if (sortBy === 'tag') {
      newIssues = [...newIssues].sort((a, b) => {
        const aTagName = a.issue_tags && a.issue_tags.length > 0 && a.issue_tags[0]?.tags ? a.issue_tags[0].tags.name : ''
        const bTagName = b.issue_tags && b.issue_tags.length > 0 && b.issue_tags[0]?.tags ? b.issue_tags[0].tags.name : ''
        return aTagName.localeCompare(bTagName)
      })
    }
    
    const totalCount = totalFilteredCount || 0
    const hasMorePages = (pageNum + 1) * ISSUES_PER_PAGE < totalCount
    

    // Only preload if we have issues and not appending
    if (newIssues.length > 0 && !append) {
      // Clear any existing timeout
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current)
      }
      // Preload visible issues based on viewport
      // Assuming approximately 10 issues fit in a typical viewport
      preloadTimeoutRef.current = setTimeout(() => {
        const visibleCount = Math.min(10, newIssues.length)
        const issuesToPreload = newIssues.slice(0, visibleCount).map(issue => issue.id)
        if (issuesToPreload.length > 0) {
          preloadIssues(issuesToPreload)
        }
        preloadTimeoutRef.current = null
      }, 500)
    }

    const result = { issues: newIssues, hasMore: hasMorePages, totalCount }
    
    // Cache the result
    if (!append) {
      // List fetched from database
      setListCache(cacheKey, {
        ...result,
        timestamp: Date.now()
      })
      setIsStale(false)
    }
    
    return result
  }, [workspaceId, statusFilter, priorityFilter, typeFilter, tagFilter, sortBy, searchQuery, preloadIssues, getListCache, setListCache])

  // Initial load when component mounts or filters change
  useEffect(() => {
    let cancelled = false

    const loadInitialData = async () => {
      // Check if this is a search query change
      const isSearchChange = searchQuery !== previousSearchQuery.current
      previousSearchQuery.current = searchQuery

      // First, try to load from cache
      const cacheKey: ListCacheKey = {
        workspaceId,
        statusFilter,
        priorityFilter,
        typeFilter,
        tagFilter,
        sortBy,
        searchQuery,
        page: 0
      }
      
      const cachedData = getListCache(cacheKey)
      if (cachedData) {
        // Show cached data immediately
        // Showing cached list data immediately
        setIssues(cachedData.issues)
        setHasMore(cachedData.hasMore)
        setTotalCount(cachedData.totalCount)
        setPage(0)
        if (!isSearchChange || !hasInitiallyLoaded.current) {
          setInitialLoading(false)
          hasInitiallyLoaded.current = true
        }
        
        if (searchQuery && onSearchResultsChange) {
          onSearchResultsChange(cachedData.totalCount)
        }
        
        // Check if cache is stale (older than 30 seconds)
        const isStale = Date.now() - cachedData.timestamp > 30000
        if (isStale) {
          // Cache is stale, fetching fresh data in background
          setIsStale(true)
          if (isSearchChange) {
            setIsSearching(true)
          }
          
          // Fetch fresh data in background
          const { issues: freshIssues, hasMore: freshHasMore, totalCount: freshTotal } = await fetchIssues(0, false, true)
          
          if (!cancelled) {
            // Fresh data loaded, updating UI
            setIssues(freshIssues)
            setHasMore(freshHasMore)
            setTotalCount(freshTotal)
            setIsSearching(false)
            
            if (searchQuery && onSearchResultsChange) {
              onSearchResultsChange(freshTotal)
            }
          }
        }
      } else {
        // No cache
        if (!isSearchChange) {
          // Only show loading state if not a search change
          setInitialLoading(true)
        } else {
          // For search changes, show search loading indicator
          setIsSearching(true)
        }
        
        const { issues: newIssues, hasMore: moreAvailable, totalCount: total } = await fetchIssues(0)
        
        if (!cancelled) {
          setIssues(newIssues)
          setHasMore(moreAvailable)
          setTotalCount(total)
          setPage(0)
          setInitialLoading(false)
          setIsSearching(false)
          hasInitiallyLoaded.current = true
          
          if (searchQuery && onSearchResultsChange) {
            onSearchResultsChange(total)
          }
        }
      }
    }

    loadInitialData()

    return () => {
      cancelled = true
      isLoadingRef.current = false
      // Clear preload timeout
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current)
      }
    }
  }, [workspaceId, statusFilter, priorityFilter, typeFilter, tagFilter, sortBy, searchQuery, getListCache]) // Added getListCache dependency

  // Setup IntersectionObserver for viewport-based preloading
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const issueId = entry.target.getAttribute('data-issue-id')
            if (issueId && !preloadedIssuesRef.current.has(issueId)) {
              preloadedIssuesRef.current.add(issueId)
              preloadIssues([issueId])
            }
          }
        })
      },
      {
        root: null,
        rootMargin: '100px', // Start preloading 100px before the item comes into view
        threshold: 0
      }
    )

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [preloadIssues])

  // Load more issues handler
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || isLoadingRef.current) return

    setLoadingMore(true)
    const nextPage = page + 1
    
    const { issues: newIssues, hasMore: moreAvailable, totalCount: total } = await fetchIssues(nextPage, true)
    
    if (newIssues.length > 0) {
      setIssues(prev => [...prev, ...newIssues])
      setPage(nextPage)
      setHasMore(moreAvailable)
      setTotalCount(total)
    }
    
    setLoadingMore(false)
  }

  // Hover handlers for prefetching
  const handleMouseEnter = useCallback((issueId: string) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    
    // Set a new timeout for prefetching after 150ms
    hoverTimeoutRef.current = setTimeout(() => {
      if (!preloadedIssuesRef.current.has(issueId)) {
        console.log('[Performance] Hover prefetch triggered for issue:', issueId)
        preloadedIssuesRef.current.add(issueId)
        preloadIssues([issueId])
      }
    }, 150) // 150ms delay to avoid prefetching during quick mouse movements
  }, [preloadIssues])

  const handleMouseLeave = useCallback(() => {
    // Clear the timeout if mouse leaves before prefetch triggers
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
  }, [])

  // Set up keyboard navigation prefetching
  useEffect(() => {
    if (!listContainerRef.current) return

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      
      // Check if the focused element is an issue row
      if (target.hasAttribute('data-issue-row')) {
        const issueId = target.getAttribute('data-issue-id')
        if (issueId && !preloadedIssuesRef.current.has(issueId)) {
          console.log('[Performance] Keyboard focus prefetch triggered for issue:', issueId)
          preloadedIssuesRef.current.add(issueId)
          preloadIssues([issueId])
          
          // Also prefetch adjacent issues for smoother navigation
          const allRows = listContainerRef.current?.querySelectorAll('[data-issue-row]')
          if (allRows) {
            const currentIndex = Array.from(allRows).findIndex(row => row === target)
            
            // Prefetch next issue
            if (currentIndex < allRows.length - 1) {
              const nextRow = allRows[currentIndex + 1] as HTMLElement
              const nextId = nextRow.getAttribute('data-issue-id')
              if (nextId && !preloadedIssuesRef.current.has(nextId)) {
                console.log('[Performance] Prefetching next issue:', nextId)
                preloadedIssuesRef.current.add(nextId)
                preloadIssues([nextId])
              }
            }
            
            // Prefetch previous issue
            if (currentIndex > 0) {
              const prevRow = allRows[currentIndex - 1] as HTMLElement
              const prevId = prevRow.getAttribute('data-issue-id')
              if (prevId && !preloadedIssuesRef.current.has(prevId)) {
                console.log('[Performance] Prefetching previous issue:', prevId)
                preloadedIssuesRef.current.add(prevId)
                preloadIssues([prevId])
              }
            }
          }
        }
      }
    }

    const container = listContainerRef.current
    container.addEventListener('focusin', handleFocusIn)

    return () => {
      container.removeEventListener('focusin', handleFocusIn)
    }
  }, [preloadIssues])

  // Combined cleanup effect for all timeouts on unmount
  useEffect(() => {
    return () => {
      // Clear any pending preload timeout
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current)
      }
      // Clear any pending hover timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  // Notify parent of searching state changes
  useEffect(() => {
    onSearchingChange?.(isSearching)
  }, [isSearching, onSearchingChange])

  const truncateDescription = (description: string | null, maxLength: number = 100) => {
    if (!description) return ''
    const plainText = stripMarkdown(description)
    if (plainText.length <= maxLength) return plainText
    return plainText.substring(0, maxLength).trim() + '...'
  }

  // Show skeleton only on very first load
  if (initialLoading && !hasInitiallyLoaded.current) {
    return <IssueListSkeleton count={5} />
  }

  if (issues.length === 0 && !initialLoading && !isSearching) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <svg className="w-24 h-24 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No issues found</h3>
          <p className="text-sm text-muted-foreground">
            {statusFilter !== 'all' || priorityFilter !== 'all' || typeFilter !== 'all' || tagFilter !== 'all'
              ? 'Try adjusting your filters' 
              : 'Create your first issue to get started'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div ref={listContainerRef} className="">
        {/* Search indicator */}
        {isSearching && (
          <div className="px-6 py-2 bg-muted/50 border-b border-border flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span>Searching...</span>
          </div>
        )}
        
        {/* Stale data indicator - only show if not searching */}
        {isStale && !isSearching && (
          <div className="px-6 py-2 bg-muted/50 border-b border-border flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
            <span>Refreshing data...</span>
          </div>
        )}
        
        {/* Header with count */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              {totalCount > 0 && issues.length < totalCount ? (
                <>Showing {issues.length} of {totalCount} {totalCount === 1 ? 'issue' : 'issues'}</>
              ) : (
                <>{issues.length} {issues.length === 1 ? 'issue' : 'issues'}</>
              )}
            </h2>
            {isDragEnabled && issues.length > 1 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <GripVertical className="h-3 w-3" />
                Drag to reorder
              </p>
            )}
          </div>
        </div>
        
        {/* Issues List */}
        <div className="divide-y divide-border">
          {sortableIssues.map((issue, index) => (
            <div
              key={issue.id}
              data-issue-row
              data-issue-id={issue.id}
              ref={(el) => {
                if (el && observerRef.current) {
                  observerRef.current.observe(el)
                }
              }}
              {...(isDragEnabled ? getDropZoneProps(index) : {})}
              className={`px-6 py-4 hover:bg-accent cursor-pointer transition-colors flex items-start gap-3 ${
                dragOverIndex === index ? 'bg-accent' : ''
              } ${draggedItemId === issue.id ? 'opacity-50' : ''}`}
              onClick={(e) => {
                // Prevent event from bubbling if clicking on interactive elements
                const target = e.target as HTMLElement
                if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.getAttribute('data-drag-handle')) {
                  return
                }
                
                if (onIssueClick) {
                  onIssueClick(issue.id)
                } else {
                  router.push(`/${workspaceSlug}/issue/${issue.id}`)
                }
              }}
              onMouseEnter={() => handleMouseEnter(issue.id)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Drag Handle */}
              {isDragEnabled && (
                <div
                  {...getDragHandleProps(issue, index)}
                  className="flex-shrink-0 pt-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <GripVertical className="h-4 w-4" />
                </div>
              )}
              
              {/* Issue Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-medium text-foreground">
                    {issue.title}
                  </h3>
                </div>
                
                {issue.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {truncateDescription(issue.description, 150)}
                  </p>
                )}
                
                <div className="mt-2 flex items-center gap-2 text-xs">
                  {/* Priority */}
                  <span className={`inline-flex items-center px-2 py-1 rounded-md font-medium ${priorityColors[issue.priority]}`}>
                    {priorityLabels[issue.priority]}
                  </span>
                  
                  {/* Type */}
                  <span className={`inline-flex items-center px-2 py-1 rounded-md font-medium ${typeColors[issue.type]}`}>
                    {typeLabels[issue.type]}
                  </span>
                  
                  {/* Tags */}
                  {issue.issue_tags && issue.issue_tags.length > 0 && (
                    <>
                      {issue.issue_tags.map(({ tags }) => (
                        <TagComponent
                          key={tags.id}
                          color={tags.color}
                          className="text-xs"
                        >
                          {tags.name}
                        </TagComponent>
                      ))}
                    </>
                  )}
                  
                  {/* Status */}
                  <span className={`inline-flex items-center px-2 py-1 rounded-md font-medium ${statusColors[issue.status]}`}>
                    {statusLabels[issue.status]}
                  </span>
                  
                  {/* Created Date - Hidden on mobile */}
                  <span className="hidden sm:inline text-muted-foreground ml-auto">
                    {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Load more button */}
        {hasMore && !initialLoading && (
          <div className="px-6 py-8 flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                loadingMore
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-background text-foreground border border-border hover:bg-accent hover:border-border'
              }`}
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
        
        {/* End of list message */}
        {!hasMore && issues.length > 0 && (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            All issues loaded
          </div>
        )}
      </div>
    </div>
  )
}