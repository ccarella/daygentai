'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useIssueCache, type ListCacheKey } from '@/contexts/issue-cache-context'
import { stripMarkdown } from '@/lib/markdown-utils'
import { IssueListSkeleton } from './issue-skeleton'
import { Tag as TagComponent } from '@/components/ui/tag'
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
  type: 'feature' | 'bug' | 'chore' | 'design' | 'non-technical'
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'todo' | 'in_progress' | 'in_review' | 'done'
  created_at: string
  created_by: string
  assignee_id: string | null
  issue_tags?: Array<{ tags: TagData }>
}

interface IssuesListProps {
  workspaceId: string
  workspaceSlug: string
  onIssueClick?: (issueId: string) => void
  statusFilter?: string
  priorityFilter?: string
  typeFilter?: string
  tagFilter?: string
  searchQuery?: string
  onSearchResultsChange?: (count: number) => void
}

const typeColors = {
  feature: 'text-primary bg-primary/10 border border-primary/20',
  bug: 'text-destructive bg-destructive/10 border border-destructive/20',
  chore: 'text-primary bg-primary/10 border border-primary/20',
  design: 'text-primary bg-primary/10 border border-primary/20',
  'non-technical': 'text-muted-foreground bg-muted border border-border'
}

const typeLabels = {
  feature: 'Feature',
  bug: 'Bug',
  chore: 'Chore',
  design: 'Design',
  'non-technical': 'Non-technical'
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

const ISSUES_PER_PAGE = 50

export function IssuesList({ 
  workspaceId, 
  workspaceSlug, 
  onIssueClick,
  statusFilter = 'exclude_done',
  priorityFilter = 'all',
  typeFilter = 'all',
  tagFilter = 'all',
  searchQuery = '',
  onSearchResultsChange
}: IssuesListProps) {
  const router = useRouter()
  const { preloadIssues, getListCache, setListCache } = useIssueCache()
  const [issues, setIssues] = useState<Issue[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [isStale, setIsStale] = useState(false)
  const isLoadingRef = useRef(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const preloadedIssuesRef = useRef<Set<string>>(new Set())
  const listContainerRef = useRef<HTMLDivElement>(null)
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchIssues = useCallback(async (pageNum: number, append = false, skipCache = false) => {
    if (isLoadingRef.current && !skipCache) return { issues: [], hasMore: false, totalCount: 0 }
    
    const startTime = Date.now()
    
    // Generate cache key
    const cacheKey: ListCacheKey = {
      workspaceId,
      statusFilter,
      priorityFilter,
      typeFilter,
      tagFilter,
      searchQuery,
      page: pageNum
    }
    
    // Check cache first (unless skipping cache)
    if (!skipCache && !append) {
      const cachedData = getListCache(cacheKey)
      if (cachedData) {
        // Check if cache is fresh (less than 30 seconds old)
        const isFresh = Date.now() - cachedData.timestamp < 30000
        console.log(`[Performance] List loaded from cache in ${Date.now() - startTime}ms (${isFresh ? 'fresh' : 'stale'})`)
        
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
        filteredResults = filteredResults.filter((issue: Issue) => issue.type === typeFilter)
      }

      if (tagFilter !== 'all') {
        filteredResults = filteredResults.filter((issue: Issue) => 
          issue.issue_tags && issue.issue_tags.some(({ tags }) => tags.id === tagFilter)
        )
      }

      // Apply pagination to filtered results
      const start = pageNum * ISSUES_PER_PAGE
      const paginatedResults = filteredResults.slice(start, start + ISSUES_PER_PAGE)
      const hasMorePages = filteredResults.length > start + ISSUES_PER_PAGE
      
      return { issues: paginatedResults, hasMore: hasMorePages, totalCount: filteredResults.length }
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
      countQuery = countQuery.eq('type', typeFilter)
    }

    const { count: totalFilteredCount } = await countQuery

    // Now fetch the actual data
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
      query = query.eq('type', typeFilter)
    }

    // Apply ordering
    query = query.order('created_at', { ascending: false })

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
      console.log(`[Performance] List fetched from database in ${Date.now() - startTime}ms`)
      setListCache(cacheKey, {
        ...result,
        timestamp: Date.now()
      })
      setIsStale(false)
    }
    
    return result
  }, [workspaceId, statusFilter, priorityFilter, typeFilter, tagFilter, searchQuery, preloadIssues, getListCache, setListCache])

  // Initial load when component mounts or filters change
  useEffect(() => {
    let cancelled = false

    const loadInitialData = async () => {
      const startTime = Date.now()
      
      // First, try to load from cache
      const cacheKey: ListCacheKey = {
        workspaceId,
        statusFilter,
        priorityFilter,
        typeFilter,
        tagFilter,
        searchQuery,
        page: 0
      }
      
      const cachedData = getListCache(cacheKey)
      if (cachedData) {
        // Show cached data immediately
        console.log(`[Performance] Showing cached list data immediately (${Date.now() - startTime}ms)`)
        setIssues(cachedData.issues)
        setHasMore(cachedData.hasMore)
        setTotalCount(cachedData.totalCount)
        setPage(0)
        setInitialLoading(false)
        
        if (searchQuery && onSearchResultsChange) {
          onSearchResultsChange(cachedData.totalCount)
        }
        
        // Check if cache is stale (older than 30 seconds)
        const isStale = Date.now() - cachedData.timestamp > 30000
        if (isStale) {
          console.log('[Performance] Cache is stale, fetching fresh data in background...')
          setIsStale(true)
          
          // Fetch fresh data in background
          const { issues: freshIssues, hasMore: freshHasMore, totalCount: freshTotal } = await fetchIssues(0, false, true)
          
          if (!cancelled) {
            console.log(`[Performance] Fresh data loaded, updating UI (${Date.now() - startTime}ms total)`)
            setIssues(freshIssues)
            setHasMore(freshHasMore)
            setTotalCount(freshTotal)
            
            if (searchQuery && onSearchResultsChange) {
              onSearchResultsChange(freshTotal)
            }
          }
        }
      } else {
        // No cache, show loading state
        setInitialLoading(true)
        
        const { issues: newIssues, hasMore: moreAvailable, totalCount: total } = await fetchIssues(0)
        
        if (!cancelled) {
          setIssues(newIssues)
          setHasMore(moreAvailable)
          setTotalCount(total)
          setPage(0)
          setInitialLoading(false)
          
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
  }, [workspaceId, statusFilter, priorityFilter, typeFilter, tagFilter, searchQuery, getListCache]) // Added getListCache dependency

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any pending preload timeout on unmount
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current)
      }
    }
  }, [])

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

  const truncateDescription = (description: string | null, maxLength: number = 100) => {
    if (!description) return ''
    const plainText = stripMarkdown(description)
    if (plainText.length <= maxLength) return plainText
    return plainText.substring(0, maxLength).trim() + '...'
  }

  if (initialLoading) {
    return <IssueListSkeleton count={5} />
  }

  if (issues.length === 0 && !initialLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <svg className="w-24 h-24 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="absolute -top-2 -right-2">
                <svg className="w-8 h-8 text-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
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
        {/* Stale data indicator */}
        {isStale && (
          <div className="px-6 py-2 bg-muted/50 border-b border-border flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
            <span>Refreshing data...</span>
          </div>
        )}
        
        {/* Header with count */}
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-muted-foreground">
            {totalCount > 0 && issues.length < totalCount ? (
              <>Showing {issues.length} of {totalCount} {totalCount === 1 ? 'issue' : 'issues'}</>
            ) : (
              <>{issues.length} {issues.length === 1 ? 'issue' : 'issues'}</>
            )}
          </h2>
        </div>
        
        {/* Issues List */}
        <div className="divide-y divide-border">
          {issues.map((issue) => (
            <div
              key={issue.id}
              data-issue-row
              data-issue-id={issue.id}
              ref={(el) => {
                if (el && observerRef.current) {
                  observerRef.current.observe(el)
                }
              }}
              className="px-6 py-4 hover:bg-accent cursor-pointer transition-colors"
              onClick={(e) => {
                // Prevent event from bubbling if clicking on interactive elements
                const target = e.target as HTMLElement
                if (target.tagName === 'A' || target.tagName === 'BUTTON') {
                  return
                }
                
                if (onIssueClick) {
                  onIssueClick(issue.id)
                } else {
                  router.push(`/${workspaceSlug}/issue/${issue.id}`)
                }
              }}
            >
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
                  {/* Type */}
                  <span className={`inline-flex items-center px-2 py-1 rounded-md font-medium ${typeColors[issue.type]}`}>
                    {typeLabels[issue.type]}
                  </span>
                  
                  {/* Priority */}
                  <span className={`inline-flex items-center px-2 py-1 rounded-md font-medium ${priorityColors[issue.priority]}`}>
                    {priorityLabels[issue.priority]}
                  </span>
                  
                  {/* Status */}
                  <span className="text-muted-foreground capitalize ml-2">
                    {issue.status.replace('_', ' ')}
                  </span>
                  
                  {/* Tags */}
                  {issue.issue_tags && issue.issue_tags.length > 0 && (
                    <div className="flex items-center gap-1 ml-2">
                      {issue.issue_tags.map(({ tags }) => (
                        <TagComponent
                          key={tags.id}
                          color={tags.color}
                          className="text-xs"
                        >
                          {tags.name}
                        </TagComponent>
                      ))}
                    </div>
                  )}
                  
                  {/* Created Date - Hidden on mobile */}
                  <span className="hidden sm:inline text-muted-foreground ml-2">
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