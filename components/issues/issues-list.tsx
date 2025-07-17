'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useIssueCache } from '@/contexts/issue-cache-context'
import { stripMarkdown } from '@/lib/markdown-utils'

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
}

interface IssuesListProps {
  workspaceId: string
  workspaceSlug: string
  onIssueClick?: (issueId: string) => void
  statusFilter?: string
  priorityFilter?: string
  typeFilter?: string
}

const typeColors = {
  feature: 'text-purple-700 bg-purple-50 border border-purple-200',
  bug: 'text-red-700 bg-red-50 border border-red-200',
  chore: 'text-blue-700 bg-blue-50 border border-blue-200',
  design: 'text-pink-700 bg-pink-50 border border-pink-200',
  'non-technical': 'text-gray-700 bg-gray-50 border border-gray-200'
}

const typeLabels = {
  feature: 'Feature',
  bug: 'Bug',
  chore: 'Chore',
  design: 'Design',
  'non-technical': 'Non-technical'
}

const priorityColors = {
  critical: 'text-red-700 bg-red-50 border border-red-200',
  high: 'text-orange-700 bg-orange-50 border border-orange-200',
  medium: 'text-yellow-700 bg-yellow-50 border border-yellow-200',
  low: 'text-green-700 bg-green-50 border border-green-200'
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
  typeFilter = 'all'
}: IssuesListProps) {
  const router = useRouter()
  const { preloadIssues } = useIssueCache()
  const [issues, setIssues] = useState<Issue[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const isLoadingRef = useRef(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const preloadedIssuesRef = useRef<Set<string>>(new Set())

  const fetchIssues = useCallback(async (pageNum: number, append = false) => {
    if (isLoadingRef.current) return { issues: [], hasMore: false, totalCount: 0 }
    
    isLoadingRef.current = true
    const supabase = createClient()
    
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
      .select('*')
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

    const newIssues = data || []
    const totalCount = totalFilteredCount || 0
    const hasMorePages = (pageNum + 1) * ISSUES_PER_PAGE < totalCount
    

    // Only preload if we have issues and not appending
    if (newIssues.length > 0 && !append) {
      // Preload visible issues based on viewport
      // Assuming approximately 10 issues fit in a typical viewport
      setTimeout(() => {
        const visibleCount = Math.min(10, newIssues.length)
        const issuesToPreload = newIssues.slice(0, visibleCount).map(issue => issue.id)
        if (issuesToPreload.length > 0) {
          preloadIssues(issuesToPreload)
        }
      }, 500)
    }

    return { issues: newIssues, hasMore: hasMorePages, totalCount }
  }, [workspaceId, statusFilter, priorityFilter, typeFilter, preloadIssues])

  // Initial load when component mounts or filters change
  useEffect(() => {
    let cancelled = false

    const loadInitialData = async () => {
      // Only show loading state on first mount, not on filter changes
      if (issues.length === 0) {
        setInitialLoading(true)
      }
      
      const { issues: newIssues, hasMore: moreAvailable, totalCount: total } = await fetchIssues(0)
      
      if (!cancelled) {
        setIssues(newIssues)
        setHasMore(moreAvailable)
        setTotalCount(total)
        setPage(0)
        setInitialLoading(false)
      }
    }

    loadInitialData()

    return () => {
      cancelled = true
      isLoadingRef.current = false
    }
  }, [workspaceId, statusFilter, priorityFilter, typeFilter]) // Removed fetchIssues dependency

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

  const truncateDescription = (description: string | null, maxLength: number = 100) => {
    if (!description) return ''
    const plainText = stripMarkdown(description)
    if (plainText.length <= maxLength) return plainText
    return plainText.substring(0, maxLength).trim() + '...'
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading issues...</div>
      </div>
    )
  }

  if (issues.length === 0 && !initialLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="absolute -top-2 -right-2">
                <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No issues found</h3>
          <p className="text-sm text-gray-500">
            {statusFilter !== 'all' || priorityFilter !== 'all' || typeFilter !== 'all' 
              ? 'Try adjusting your filters' 
              : 'Create your first issue to get started'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="">
        {/* Header with count */}
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-600">
            {totalCount > 0 && issues.length < totalCount ? (
              <>Showing {issues.length} of {totalCount} {totalCount === 1 ? 'issue' : 'issues'}</>
            ) : (
              <>{issues.length} {issues.length === 1 ? 'issue' : 'issues'}</>
            )}
          </h2>
        </div>
        
        {/* Issues List */}
        <div className="divide-y divide-gray-100">
          {issues.map((issue) => (
            <div
              key={issue.id}
              data-issue-id={issue.id}
              ref={(el) => {
                if (el && observerRef.current) {
                  observerRef.current.observe(el)
                }
              }}
              className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => {
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
                  <h3 className="text-sm font-medium text-gray-900">
                    {issue.title}
                  </h3>
                </div>
                
                {issue.description && (
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">
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
                  <span className="text-gray-500 capitalize ml-2">
                    {issue.status.replace('_', ' ')}
                  </span>
                  
                  {/* Created Date */}
                  <span className="text-gray-400 ml-2">
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
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
        
        {/* End of list message */}
        {!hasMore && issues.length > 0 && (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            All issues loaded
          </div>
        )}
      </div>
    </div>
  )
}