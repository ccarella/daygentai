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
  type: 'feature' | 'bug' | 'chore' | 'design' | 'non-technical'
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'todo' | 'in_progress' | 'in_review' | 'done'
  created_at: string
  created_by: string
  assignee_id: string | null
  workspace_id: string
  creator?: {
    full_name: string | null
  }
  issue_tags?: Array<{ tags: TagData }>
}

interface KanbanBoardProps {
  workspaceId: string
  onIssueClick: (issueId: string) => void
  statusFilter?: string
  priorityFilter?: string
  typeFilter?: string
  tagFilter?: string
  searchQuery?: string
}

const columns = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-50' },
  { id: 'in_review', title: 'In Review', color: 'bg-yellow-50' },
  { id: 'done', title: 'Done', color: 'bg-green-50' }
]

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
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-gray-100 text-gray-800 border-gray-200'
}

export function KanbanBoard({ 
  workspaceId, 
  onIssueClick,
  statusFilter = 'all',
  priorityFilter = 'all',
  typeFilter = 'all',
  tagFilter = 'all',
  searchQuery = ''
}: KanbanBoardProps) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const supabase = createClient()
  const { preloadIssues } = useIssueCache()
  const loadingMoreRef = useRef(false)

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
          const validTypes = ['feature', 'bug', 'chore', 'design', 'non-technical']
          if (validTypes.includes(typeFilter)) {
            filteredData = filteredData.filter(issue => issue.type === typeFilter)
          }
        }
        
        if (tagFilter !== 'all') {
          filteredData = filteredData.filter(issue => 
            issue.issue_tags && issue.issue_tags.some(({ tags }) => tags.id === tagFilter)
          )
        }
        
        // Apply pagination on filtered results
        data = filteredData.slice(from, to + 1)
      }
    } else {
      // Original query logic for non-search cases
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
        .order('created_at', { ascending: false })
        .range(from, to)

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
        const validTypes = ['feature', 'bug', 'chore', 'design', 'non-technical']
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
  }, [workspaceId, statusFilter, priorityFilter, typeFilter, tagFilter, searchQuery, preloadIssues])

  useEffect(() => {
    setLoading(true)
    setPage(0)
    fetchIssues(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter, typeFilter, tagFilter, searchQuery, workspaceId])

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
    
    const { error } = await supabase
      .from('issues')
      .update({ status: newStatus })
      .eq('id', issueId)

    if (!error) {
      setIssues(prev => prev.map(issue => 
        issue.id === issueId ? { ...issue, status: newStatus as Issue['status'] } : issue
      ))
    }
  }

  const getIssuesByStatus = (status: string) => {
    return issues.filter(issue => issue.status === status)
  }

  if (loading) {
    return <KanbanBoardSkeleton />
  }

  return (
    <div className="h-full flex flex-col mt-3">
      {hasMore && (
        <div className="flex items-center justify-end mb-4 text-sm">
          <button
            onClick={loadMore}
            className="text-blue-600 hover:text-blue-800"
            disabled={loadingMoreRef.current}
          >
            {loadingMoreRef.current ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
      
      <div className="flex gap-4 h-full overflow-x-auto pb-4 px-4">
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
                <h3 className="font-medium text-gray-900">
                  {column.title}
                  <span className="ml-2 text-sm text-gray-500">
                    ({columnIssues.length})
                  </span>
                </h3>
              </div>
              
              <div 
                className="bg-gray-50 border border-t-0 rounded-b-lg min-h-[400px] max-h-[calc(100vh-300px)] overflow-y-auto p-2 space-y-2"
              >
                {columnIssues.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">
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
                      className="bg-white p-3 rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
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
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {issue.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-end text-xs text-gray-500">
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