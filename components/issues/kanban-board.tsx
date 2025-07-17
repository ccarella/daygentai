'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useIssueCache } from '@/contexts/issue-cache-context'
import { formatDistanceToNow } from 'date-fns'
import { Loader2 } from 'lucide-react'

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
}

interface KanbanBoardProps {
  workspaceId: string
  onIssueClick: (issueId: string) => void
  statusFilter?: string
  priorityFilter?: string
  typeFilter?: string
}

const columns = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-50' },
  { id: 'in_review', title: 'In Review', color: 'bg-yellow-50' },
  { id: 'done', title: 'Done', color: 'bg-green-50' }
]

const typeIcons = {
  bug: '🐛',
  feature: '✨',
  chore: '🔧',
  design: '🎨',
  'non-technical': '📝'
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
  statusFilter = 'exclude_done',
  priorityFilter = 'all',
  typeFilter = 'all'
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

    let query = supabase
      .from('issues')
      .select('*')
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

    const { data, error } = await query

    if (error) {
      console.error('Error fetching issues:', error.message || error)
      console.error('Full error details:', JSON.stringify(error, null, 2))
      loadingMoreRef.current = false
      setLoading(false)
      return
    }

    const newIssues = data || []
    
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
  }, [workspaceId, statusFilter, priorityFilter, typeFilter, preloadIssues])

  useEffect(() => {
    setLoading(true)
    setPage(0)
    fetchIssues(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter, typeFilter, workspaceId])

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
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
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
        {columns.map(column => {
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
              
              <div className="bg-gray-50 border border-t-0 rounded-b-lg min-h-[400px] max-h-[calc(100vh-300px)] overflow-y-auto p-2 space-y-2">
                {columnIssues.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">
                    No issues
                  </p>
                ) : (
                  columnIssues.map(issue => (
                    <div
                      key={issue.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, issue.id)}
                      onClick={() => onIssueClick(issue.id)}
                      className="bg-white p-3 rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-lg" title={issue.type}>
                          {typeIcons[issue.type] || '📌'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full border ${priorityColors[issue.priority]}`}>
                          {issue.priority}
                        </span>
                      </div>
                      
                      <h4 className="font-medium text-gray-900 mb-1 line-clamp-2">
                        {issue.title}
                      </h4>
                      
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