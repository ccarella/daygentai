'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useIssueCache } from '@/contexts/issue-cache-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  workspace_id: string
}

interface IssueDetailsProps {
  issueId: string
  onBack: () => void
  onDeleted: () => void
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

const statusOptions = [
  { value: 'shaping', label: 'Shaping', color: 'text-gray-600' },
  { value: 'backlog', label: 'Backlog', color: 'text-blue-600' },
  { value: 'in_progress', label: 'In Progress', color: 'text-yellow-600' },
  { value: 'review', label: 'Review', color: 'text-purple-600' },
  { value: 'done', label: 'Done', color: 'text-green-600' },
]

export function IssueDetails({ issueId, onBack, onDeleted }: IssueDetailsProps) {
  const { getIssue } = useIssueCache()
  const [issue, setIssue] = useState<Issue | null>(null)
  const [loading, setLoading] = useState(true)
  const [creatorName, setCreatorName] = useState<string>('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  useEffect(() => {
    const fetchIssue = async () => {
      // Check cache first
      const cachedIssue = getIssue(issueId)
      if (cachedIssue) {
        setIssue(cachedIssue)
        setCreatorName(cachedIssue.creator?.name || '')
        setLoading(false)
        return
      }

      // If not in cache, fetch from database
      setLoading(true)
      const supabase = createClient()

      // Fetch issue data
      const { data: issue, error } = await supabase
        .from('issues')
        .select('*')
        .eq('id', issueId)
        .single()

      if (error || !issue) {
        onBack()
        return
      }

      setIssue(issue)

      // Fetch creator name
      const { data: creator } = await supabase
        .from('users')
        .select('name')
        .eq('id', issue.created_by)
        .single()

      if (creator) {
        setCreatorName(creator.name)
      }

      setLoading(false)
    }

    fetchIssue()
  }, [issueId, onBack, getIssue])

  const handleDelete = async () => {
    if (!issue) return
    
    const confirmed = window.confirm('Are you sure you want to delete this issue?')
    if (!confirmed) return

    const supabase = createClient()
    
    const { error } = await supabase
      .from('issues')
      .delete()
      .eq('id', issue.id)

    if (!error) {
      onDeleted()
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!issue || isUpdatingStatus) return
    
    setIsUpdatingStatus(true)
    const supabase = createClient()
    
    const { error } = await supabase
      .from('issues')
      .update({ status: newStatus })
      .eq('id', issue.id)

    if (!error) {
      setIssue({ ...issue, status: newStatus as Issue['status'] })
    }
    
    setIsUpdatingStatus(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading issue...</div>
      </div>
    )
  }

  if (!issue) {
    return null
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header with back button */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to issues
          </button>
        </div>

        {/* Issue Content */}
        <div className="space-y-6">
          {/* Title and Actions */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{typeIcons[issue.type]}</span>
              <h1 className="text-2xl font-semibold text-gray-900">{issue.title}</h1>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreHorizontal className="w-5 h-5 text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete issue
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Metadata */}
          <div className="flex items-center space-x-4 text-sm">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[issue.priority]}`}>
              {priorityLabels[issue.priority]}
            </span>
            <span className="text-gray-500">
              Created by {creatorName} {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500 text-sm">Status:</span>
              <Select
                value={issue.status}
                onValueChange={handleStatusChange}
                disabled={isUpdatingStatus}
              >
                <SelectTrigger className="h-7 w-auto border-0 p-0 hover:bg-gray-100 focus:ring-0 focus:ring-offset-0">
                  <SelectValue>
                    <span className={`text-sm font-medium ${statusOptions.find(s => s.value === issue.status)?.color || 'text-gray-600'}`}>
                      {statusOptions.find(s => s.value === issue.status)?.label || issue.status}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <span className={status.color}>{status.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="prose max-w-none">
            {issue.description ? (
              <div className="text-gray-700 whitespace-pre-wrap">{issue.description}</div>
            ) : (
              <p className="text-gray-500 italic">No description provided</p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-8"></div>

          {/* Activity Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Activity</h2>
            
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <p className="text-gray-500 text-sm">Activity timeline coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}