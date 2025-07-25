'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useIssueCache } from '@/contexts/issue-cache-context'
import { formatDistanceToNow } from 'date-fns'
import { KanbanBoardSkeleton } from './kanban-skeleton'
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
  type: 'feature' | 'bug' | 'design' | 'product'
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'todo' | 'in_progress' | 'in_review' | 'done'
  created_at: string
  created_by: string
  assignee_id: string | null
  workspace_id: string
  creator?: {
    name: string
    avatar_url?: string | null
  }
  issue_tags?: Array<{ tags: TagData }>
}

interface KanbanBoardProps {
  workspaceId: string
  workspaceSlug: string
  onIssueClick: (issueId: string) => void
  statusFilter?: string
  priorityFilter?: string
  typeFilter?: string
  tagFilter?: string
  sortBy?: string
  searchQuery?: string
}

const columns = [
  { id: 'todo', title: 'To Do', color: 'bg-muted' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-primary/10' },
  { id: 'in_review', title: 'In Review', color: 'bg-yellow-50' },
  { id: 'done', title: 'Done', color: 'bg-green-50' }
]

const typeColors = {
  feature: 'text-purple-700 bg-purple-50 border border-purple-200',
  bug: 'text-destructive bg-destructive/10 border border-destructive/20',
  design: 'text-pink-700 bg-pink-50 border border-pink-200',
  product: 'text-muted-foreground bg-muted border border-border'
}

const typeLabels = {
  feature: 'Feature',
  bug: 'Bug',
  design: 'Design',
  product: 'Product'
}

const priorityColors = {
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-muted text-muted-foreground border-border'
}

export function KanbanBoard({ 
  workspaceId,
  workspaceSlug, 
  onIssueClick,
  statusFilter = 'all',
  priorityFilter = 'all',
  typeFilter = 'all',
  tagFilter = 'all',
  sortBy = 'newest',
  searchQuery = ''
}: KanbanBoardProps) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const supabase = createClient()
  const { preloadIssues, updateIssue: updateCachedIssue } = useIssueCache()
  const loadingMoreRef = useRef(false)
  const kanbanContainerRef = useRef<HTMLDivElement>(null)
  const preloadedIssuesRef = useRef<Set<string>>(new Set())
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchIssues = useCallback(async (pageNum: number, append = false) => {
    if (loadingMoreRef.current && append) return
    loadingMoreRef.current = true
    
    const pageSize = 100 // Larger page size for Kanban
    const from = pageNum * pageSize
    const to = from + pageSize - 1

    let data: Issue[] | null = null
    let error: Error | null = null

    // If there's a search query, use the search function
    if (searchQuery && searchQuery.trim() !== '') {
      const response = await supabase
        .rpc('search_issues', {
          search_query: searchQuery.trim(),
          p_workspace_id: workspaceId,
          limit_count: to + 1 // Request more to handle pagination
        })
      
      data = response.data
      error = response.error
      
      // Apply client-side filters on search results
      if (data && !error) {
        let filteredData = data
        
        if (statusFilter !== 'all') {
          if (statusFilter === 'exclude_done') {
            filteredData = filteredData.filter(issue => issue.status !== 'done')
          } else {
            filteredData = filteredData.filter(issue => issue.status === statusFilter)
          }
        }
        
        if (priorityFilter !== 'all') {
          filteredData = filteredData.filter(issue => issue.priority === priorityFilter)
        }
        
        if (typeFilter !== 'all') {
          const validTypes = ['feature', 'bug', 'design', 'product']
          if (validTypes.includes(typeFilter)) {
            filteredData = filteredData.filter(issue => issue.type === typeFilter)
          }
        }
        
        if (tagFilter !== 'all') {
          filteredData = filteredData.filter(issue => 
            issue.issue_tags && issue.issue_tags.some(({ tags }) => tags.id === tagFilter)
          )
        }
        
        // Apply sorting to filtered results
        const sortedData = [...filteredData].sort((a, b) => {
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
        
        // Apply pagination on sorted results
        data = sortedData.slice(from, to + 1)
      }
    } else {
      // Original query logic for non-search cases with creator info
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
          query = query.order('created_at', { ascending: false })
          break
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false })
          break
      }
      
      query = query.range(from, to)

      if (statusFilter !== 'all') {
        if (statusFilter === 'exclude_done') {
          query = query.neq('status', 'done')
        } else {
          query = query.eq('status', statusFilter)
        }
      }
      
      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter)
      }

      if (typeFilter !== 'all') {
        // Only apply type filter if it's a valid type
        const validTypes = ['feature', 'bug', 'design', 'product']
        if (validTypes.includes(typeFilter)) {
          query = query.eq('type', typeFilter)
        }
      }
      
      const response = await query
      data = response.data
      error = response.error
    }

    if (error) {
      console.error('Error fetching issues:', error.message || error)
      console.error('Full error details:', JSON.stringify(error, null, 2))
      loadingMoreRef.current = false
      setLoading(false)
      return
    }

    let newIssues = data || []
    
    // Apply tag filter on the client side for non-search queries
    if (tagFilter !== 'all' && !searchQuery) {
      newIssues = newIssues.filter((issue: Issue) => 
        issue.issue_tags && issue.issue_tags.some(({ tags }) => tags.id === tagFilter)
      )
    }
    
    // Apply client-side sorting for tag option
    if (sortBy === 'tag' && !searchQuery) {
      newIssues = [...newIssues].sort((a, b) => {
        const aTagName = a.issue_tags && a.issue_tags.length > 0 && a.issue_tags[0]?.tags ? a.issue_tags[0].tags.name : ''
        const bTagName = b.issue_tags && b.issue_tags.length > 0 && b.issue_tags[0]?.tags ? b.issue_tags[0].tags.name : ''
        return aTagName.localeCompare(bTagName)
      })
    }
    
    if (append) {
      setIssues(prev => [...prev, ...newIssues])
    } else {
      setIssues(newIssues)
    }
    
    setHasMore(newIssues.length === pageSize)
    setLoading(false)
    loadingMoreRef.current = false

    // Preload all issues for better performance
    if (newIssues.length > 0) {
      const issueIds = newIssues.map(issue => issue.id)
      preloadIssues(issueIds)
    }
  }, [workspaceId, statusFilter, priorityFilter, typeFilter, tagFilter, sortBy, searchQuery, preloadIssues])

  useEffect(() => {
    setLoading(true)
    setPage(0)
    fetchIssues(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter, typeFilter, tagFilter, sortBy, searchQuery, workspaceId])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchIssues(nextPage, true)
  }

  const handleDragStart = (e: React.DragEvent, issueId: string) => {
    e.dataTransfer.setData('issueId', issueId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    const issueId = e.dataTransfer.getData('issueId')
    
    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/issues/${issueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        console.error('Failed to update issue status')
        return
      }

      setIssues(prev => prev.map(issue => 
        issue.id === issueId ? { ...issue, status: newStatus as Issue['status'] } : issue
      ))
      
      // Update cache to maintain consistency across components
      updateCachedIssue(issueId, { status: newStatus as Issue['status'] })
    } catch (error) {
      console.error('Error updating issue status:', error)
    }
  }

  const getIssuesByStatus = (status: string) => {
    return issues.filter(issue => issue.status === status)
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
        console.log('[Performance] Hover prefetch triggered for kanban issue:', issueId)
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
    if (!kanbanContainerRef.current) return

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      
      // Check if the focused element is an issue card
      if (target.hasAttribute('data-issue-card')) {
        const issueId = target.getAttribute('data-issue-id')
        if (issueId && !preloadedIssuesRef.current.has(issueId)) {
          console.log('[Performance] Keyboard focus prefetch triggered for kanban issue:', issueId)
          preloadedIssuesRef.current.add(issueId)
          preloadIssues([issueId])
          
          // Find all visible issue cards to prefetch adjacent ones
          const allCards = kanbanContainerRef.current?.querySelectorAll('[data-issue-card]')
          if (allCards) {
            const cardsArray = Array.from(allCards)
            const currentIndex = cardsArray.findIndex(card => card === target)
            
            // Prefetch next 2 and previous 2 cards for smoother navigation
            const adjacentIndices = [
              currentIndex - 2,
              currentIndex - 1,
              currentIndex + 1,
              currentIndex + 2
            ]
            
            adjacentIndices.forEach(index => {
              if (index >= 0 && index < cardsArray.length) {
                const card = cardsArray[index] as HTMLElement
                const adjacentId = card.getAttribute('data-issue-id')
                if (adjacentId && !preloadedIssuesRef.current.has(adjacentId)) {
                  console.log('[Performance] Prefetching adjacent kanban issue:', adjacentId)
                  preloadedIssuesRef.current.add(adjacentId)
                  preloadIssues([adjacentId])
                }
              }
            })
          }
        }
      }
    }

    const container = kanbanContainerRef.current
    container.addEventListener('focusin', handleFocusIn)

    return () => {
      container.removeEventListener('focusin', handleFocusIn)
    }
  }, [preloadIssues])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  if (loading) {
    return <KanbanBoardSkeleton />
  }

  // Check if there are no issues at all
  const hasNoIssues = issues.length === 0

  if (hasNoIssues) {
    // Check if filters are at their default values (Kanban defaults to 'all' for status)
    const isDefaultFilters = statusFilter === 'all' && priorityFilter === 'all' && typeFilter === 'all' && tagFilter === 'all'
    
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {!isDefaultFilters ? (
          // Show normal empty state when filters have been changed from defaults
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <svg className="w-24 h-24 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No issues found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          // Show YouTube video when no filters are active and no issues exist
          <div className="w-full max-w-4xl">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
                src="https://www.youtube.com/embed/Y71kISHrNLE"
                title="Getting Started with Daygent"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="mt-6 text-center">
              <h3 className="text-lg font-medium text-foreground mb-2">Welcome to Daygent!</h3>
              <p className="text-sm text-muted-foreground">
                Watch this video to learn how to get started, or create your first issue above.
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col mt-3">
      {hasMore && (
        <div className="flex items-center justify-end mb-4 text-sm">
          <button
            onClick={loadMore}
            className="text-primary hover:text-primary"
            disabled={loadingMoreRef.current}
          >
            {loadingMoreRef.current ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
      
      <div ref={kanbanContainerRef} className="flex gap-4 h-full overflow-x-auto pb-4 px-4">
        {columns.map((column) => {
          const columnIssues = getIssuesByStatus(column.id)
          
          return (
            <div
              key={column.id}
              className="flex-shrink-0 w-72"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className={`${column.color} rounded-t-lg p-3 border border-b-0`}>
                <h3 className="font-medium text-foreground">
                  {column.title}
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({columnIssues.length})
                  </span>
                </h3>
              </div>
              
              <div 
                className="bg-muted border border-t-0 rounded-b-lg min-h-[400px] max-h-[calc(100vh-300px)] overflow-y-auto p-2 space-y-2"
              >
                {columnIssues.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    No issues
                  </p>
                ) : (
                  columnIssues.map(issue => (
                    <div
                      key={issue.id}
                      data-issue-card
                      data-issue-id={issue.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, issue.id)}
                      onClick={() => onIssueClick(issue.id)}
                      onMouseEnter={() => handleMouseEnter(issue.id)}
                      onMouseLeave={handleMouseLeave}
                      className="bg-card p-3 rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <h4 className="font-medium text-foreground mb-2 line-clamp-2">
                        {issue.title}
                      </h4>
                      
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs px-2 py-1 rounded-md font-medium ${typeColors[issue.type]}`}>
                          {typeLabels[issue.type]}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full border ${priorityColors[issue.priority]}`}>
                          {issue.priority}
                        </span>
                      </div>
                      
                      {issue.issue_tags && issue.issue_tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mb-2">
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
                      
                      {issue.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {issue.description}
                        </p>
                      )}
                      
                      <div className="hidden sm:flex items-center justify-end text-xs text-muted-foreground">
                        <span>{formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}