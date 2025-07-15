'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'

interface Issue {
  id: string
  title: string
  description: string | null
  type: 'bug' | 'feature' | 'task' | 'epic' | 'spike'
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'shaping' | 'backlog' | 'in_progress' | 'review' | 'done'
  created_at: string
  created_by: string
  assignee_id: string | null
}

interface IssuesListProps {
  workspaceId: string
  workspaceSlug: string
}

const typeIcons = {
  bug: '🐛',
  feature: '✨',
  task: '📋',
  epic: '🎯',
  spike: '🔍'
}

const priorityColors = {
  critical: 'text-red-600 bg-red-50',
  high: 'text-orange-600 bg-orange-50',
  medium: 'text-yellow-600 bg-yellow-50',
  low: 'text-green-600 bg-green-50'
}

const priorityLabels = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
}

export function IssuesList({ workspaceId, workspaceSlug }: IssuesListProps) {
  const router = useRouter()
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchIssues = async () => {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching issues:', error)
      } else {
        setIssues(data || [])
      }
      
      setLoading(false)
    }

    fetchIssues()
  }, [workspaceId])

  const truncateDescription = (description: string | null, maxLength: number = 100) => {
    if (!description) return ''
    if (description.length <= maxLength) return description
    return description.substring(0, maxLength).trim() + '...'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading issues...</div>
      </div>
    )
  }

  if (issues.length === 0) {
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No issues in this workspace yet</h3>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-4">
        {/* Header with count */}
        <div className="py-3 border-b border-gray-200">
          <h2 className="text-sm font-medium text-gray-700">
            {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
          </h2>
        </div>
        
        {/* Issues List */}
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="border-b border-gray-200 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => router.push(`/${workspaceSlug}/issue/${issue.id}`)}
          >
            <div className="flex items-start space-x-3">
              {/* Type Icon */}
              <div className="flex-shrink-0 text-2xl">
                {typeIcons[issue.type]}
              </div>
              
              {/* Issue Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {issue.title}
                  </h3>
                </div>
                
                {issue.description && (
                  <p className="mt-1 text-sm text-gray-500">
                    {truncateDescription(issue.description)}
                  </p>
                )}
                
                <div className="mt-2 flex items-center space-x-4 text-xs">
                  {/* Priority */}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded ${priorityColors[issue.priority]}`}>
                    {priorityLabels[issue.priority]}
                  </span>
                  
                  {/* Created Date */}
                  <span className="text-gray-500">
                    {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
                  </span>
                  
                  {/* Status */}
                  <span className="text-gray-500 capitalize">
                    {issue.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}