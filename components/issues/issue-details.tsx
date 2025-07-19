'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MoreHorizontal, Trash2, Edit3, AlertCircle, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useIssueCache } from '@/contexts/issue-cache-context'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { subscribeToIssueStatusUpdates } from '@/lib/events/issue-events'
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
import { EditIssueModal } from './edit-issue-modal'
import { PromptDisplay } from './prompt-display'
import { useToast } from '@/components/ui/use-toast'

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
  generated_prompt?: string | null
  prompt_generation_status?: 'pending' | 'completed' | 'failed' | null
  prompt_generation_error?: string | null
}

interface IssueDetailsProps {
  issueId: string
  onBack: () => void
  onDeleted: () => void
}

const typeIcons = {
  feature: '✨',
  bug: '🐛',
  chore: '🔧',
  design: '🎨',
  'non-technical': '📝'
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
  { value: 'todo', label: 'Todo', color: 'text-gray-600' },
  { value: 'in_progress', label: 'In Progress', color: 'text-yellow-600' },
  { value: 'in_review', label: 'In Review', color: 'text-purple-600' },
  { value: 'done', label: 'Done', color: 'text-green-600' },
]

const typeOptions = [
  { value: 'feature', label: 'Feature', icon: '✨' },
  { value: 'bug', label: 'Bug', icon: '🐛' },
  { value: 'chore', label: 'Chore', icon: '🔧' },
  { value: 'design', label: 'Design', icon: '🎨' },
  { value: 'non-technical', label: 'Non-technical', icon: '📝' },
]

export function IssueDetails({ issueId, onBack, onDeleted }: IssueDetailsProps) {
  const { toast } = useToast()
  const { getIssue } = useIssueCache()
  const [issue, setIssue] = useState<Issue | null>(null)
  const [loading, setLoading] = useState(true)
  const [creatorName, setCreatorName] = useState<string>('')
  const [creatorAvatar, setCreatorAvatar] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<string>('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isUpdatingType, setIsUpdatingType] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Handle ESC key to navigate back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isEditModalOpen) {
        e.preventDefault()
        onBack()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onBack, isEditModalOpen])

  useEffect(() => {
    const fetchIssue = async () => {
      // Check cache first
      const cachedIssue = getIssue(issueId)
      if (cachedIssue) {
        setIssue(cachedIssue)
        setCreatedAt(cachedIssue.created_at)
        
        // Still need to fetch creator info if not in cache
        const supabase = createClient()
        const { data: user } = await supabase
          .from('users')
          .select('name, avatar_url')
          .eq('id', cachedIssue.created_by)
          .single()

        if (user) {
          setCreatorName(user.name.trim() || 'Unknown')
          setCreatorAvatar(user.avatar_url)
        } else {
          setCreatorName('Unknown')
          setCreatorAvatar(null)
        }
        
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
      setCreatedAt(issue.created_at)

      // Fetch creator info
      const { data: user } = await supabase
        .from('users')
        .select('name, avatar_url')
        .eq('id', issue.created_by)
        .single()

      if (user) {
        setCreatorName(user.name.trim() || 'Unknown')
        setCreatorAvatar(user.avatar_url)
      } else {
        setCreatorName('Unknown')
        setCreatorAvatar(null)
      }

      setLoading(false)
    }

    fetchIssue()
  }, [issueId, onBack, getIssue])

  // Subscribe to status updates
  useEffect(() => {
    const unsubscribe = subscribeToIssueStatusUpdates((event) => {
      if (issue && event.detail.issueId === issue.id) {
        setIssue({ ...issue, status: event.detail.newStatus as Issue['status'] })
      }
    })

    return unsubscribe
  }, [issue])

  // Subscribe to real-time updates for prompt generation
  useEffect(() => {
    if (!issue?.id) return

    const supabase = createClient()
    const channel = supabase
      .channel(`issue-${issue.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'issues',
          filter: `id=eq.${issue.id}`
        },
        (payload) => {
          if (payload.new) {
            setIssue(prev => ({
              ...prev!,
              ...payload.new,
            }))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [issue?.id])

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

    if (error) {
      console.error('Failed to update issue status:', error)
      toast({
        title: "Failed to update status",
        description: error.message || "An error occurred while updating the issue status.",
        variant: "destructive",
      })
      setIsUpdatingStatus(false)
      return
    }
    
    setIssue({ ...issue, status: newStatus as Issue['status'] })
    toast({
      title: "Status updated",
      description: `Issue status changed to ${newStatus.toLowerCase().replace('_', ' ')}.`,
    })
    
    setIsUpdatingStatus(false)
  }

  const handleTypeChange = async (newType: string) => {
    if (!issue || isUpdatingType) return
    
    setIsUpdatingType(true)
    const supabase = createClient()
    
    const { error } = await supabase
      .from('issues')
      .update({ type: newType })
      .eq('id', issue.id)

    if (error) {
      console.error('Failed to update issue type:', error)
      toast({
        title: "Failed to update type",
        description: error.message || "An error occurred while updating the issue type.",
        variant: "destructive",
      })
      setIsUpdatingType(false)
      return
    }
    
    setIssue({ ...issue, type: newType as Issue['type'] })
    toast({
      title: "Type updated",
      description: `Issue type changed to ${newType.toLowerCase()}.`,
    })
    
    setIsUpdatingType(false)
  }

  const handleEdit = () => {
    setIsEditModalOpen(true)
  }

  const handleIssueUpdated = async () => {
    // Refresh the issue data after update
    const supabase = createClient()
    const { data: updatedIssue } = await supabase
      .from('issues')
      .select('*')
      .eq('id', issueId)
      .single()
    
    if (updatedIssue) {
      setIssue(updatedIssue)
    }
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
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
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
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
              <span className="text-xl sm:text-2xl flex-shrink-0">{typeIcons[issue.type]}</span>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 break-words">{issue.title}</h1>
            </div>
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit issue
                  </DropdownMenuItem>
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
          <div className="space-y-3">
            {/* Priority - now on its own */}
            <div className="flex items-center">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[issue.priority]}`}>
                {priorityLabels[issue.priority]}
              </span>
            </div>
            
            {/* Status and Type - responsive layout */}
            <div className="flex flex-wrap items-center gap-4">
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
              <div className="flex items-center space-x-2">
                <span className="text-gray-500 text-sm">Type:</span>
                <Select
                  value={issue.type}
                  onValueChange={handleTypeChange}
                  disabled={isUpdatingType}
                >
                  <SelectTrigger className="h-7 w-auto border-0 p-0 hover:bg-gray-100 focus:ring-0 focus:ring-offset-0">
                    <SelectValue>
                      <span className="text-sm font-medium flex items-center gap-1">
                        <span>{typeOptions.find(t => t.value === issue.type)?.icon || '📌'}</span>
                        <span className="hidden sm:inline">{typeOptions.find(t => t.value === issue.type)?.label || issue.type}</span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          <span>{type.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* AI Generated Prompt */}
          {issue.prompt_generation_status === 'pending' && (
            <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
                <div>
                  <p className="font-medium text-purple-900">Generating AI Prompt...</p>
                  <p className="text-sm text-purple-700 mt-1">
                    The AI is creating a development prompt for this issue. It will appear here when ready.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {issue.prompt_generation_status === 'failed' && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">Prompt Generation Failed</p>
                  <p className="text-sm text-red-700 mt-1">
                    {issue.prompt_generation_error || 'Unable to generate AI prompt. Please check your API settings.'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {issue.generated_prompt && (
            <PromptDisplay prompt={issue.generated_prompt} className="mt-6" />
          )}

          {/* Description */}
          {issue.description ? (
            <div className="prose prose-sm sm:prose max-w-none break-words">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {issue.description}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-gray-500 italic">No description provided</p>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 my-8"></div>

          {/* Activity Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Activity</h2>
            
            <div className="space-y-4">
              {/* Created by info */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {creatorAvatar && creatorAvatar.startsWith('http') ? (
                      <img 
                        src={creatorAvatar} 
                        alt={creatorName}
                        className="h-full w-full object-cover"
                      />
                    ) : creatorAvatar && creatorAvatar.length <= 2 ? (
                      <span className="text-lg">{creatorAvatar}</span>
                    ) : (
                      <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{creatorName}</span>
                    <span className="text-gray-500"> created this issue</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    {createdAt && formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Edit Issue Modal */}
      <EditIssueModal 
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        issue={issue}
        onIssueUpdated={handleIssueUpdated}
      />
    </div>
  )
}