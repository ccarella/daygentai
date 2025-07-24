'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MoreHorizontal, Trash2, Edit3 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useIssueCache } from '@/contexts/issue-cache-context'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { subscribeToIssueStatusUpdates, emitIssueStatusUpdate } from '@/lib/events/issue-events'
import { CommentList } from './comment-list'
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
import { IssueDetailsSkeleton } from './issue-skeleton'
import { Tag as TagComponent } from '@/components/ui/tag'

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user: {
    name: string;
    avatar_url: string | null;
  };
}

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
  generated_prompt?: string | null
  issue_tags?: Array<{ tags: TagData }>
  creator?: {
    name: string
    avatar_url?: string | null
  }
}

interface IssueDetailsProps {
  issueId: string
  workspaceSlug: string
  onBack: () => void
  onDeleted: () => void
}

const typeIcons = {
  feature: '✨',
  bug: '🐛',
  design: '🎨',
  product: '📝'
}

const priorityColors = {
  critical: 'text-destructive bg-destructive/10',
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
  { value: 'todo', label: 'Todo', color: 'text-muted-foreground' },
  { value: 'in_progress', label: 'In Progress', color: 'text-yellow-600' },
  { value: 'in_review', label: 'In Review', color: 'text-purple-600' },
  { value: 'done', label: 'Done', color: 'text-green-600' },
]

const typeOptions = [
  { value: 'feature', label: 'Feature', icon: '✨' },
  { value: 'bug', label: 'Bug', icon: '🐛' },
  { value: 'design', label: 'Design', icon: '🎨' },
  { value: 'product', label: 'Product', icon: '📝' },
]

export function IssueDetails({ issueId, workspaceSlug, onBack, onDeleted }: IssueDetailsProps) {
  const { toast } = useToast()
  const { getIssue, updateIssue, removeIssue } = useIssueCache()
  const [issue, setIssue] = useState<Issue | null>(null)
  const [loading, setLoading] = useState(true)
  const [creatorName, setCreatorName] = useState<string>('')
  const [creatorAvatar, setCreatorAvatar] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<string>('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isUpdatingType, setIsUpdatingType] = useState(false)
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(true)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  // Debounce timer refs
  const statusChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const typeChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const priorityChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Abort controller refs for cancelling in-flight requests
  const statusAbortControllerRef = useRef<AbortController | null>(null)
  const typeAbortControllerRef = useRef<AbortController | null>(null)
  const priorityAbortControllerRef = useRef<AbortController | null>(null)
  
  // Track the source of updates to prevent feedback loops
  const updateSourceRef = useRef<string | null>(null)
  const componentIdRef = useRef(`issue-details-${Math.random().toString(36).substr(2, 9)}`)

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
  
  // Cleanup timeouts and abort controllers on unmount
  useEffect(() => {
    return () => {
      // Clear timeouts
      if (statusChangeTimeoutRef.current) {
        clearTimeout(statusChangeTimeoutRef.current)
      }
      if (typeChangeTimeoutRef.current) {
        clearTimeout(typeChangeTimeoutRef.current)
      }
      if (priorityChangeTimeoutRef.current) {
        clearTimeout(priorityChangeTimeoutRef.current)
      }
      
      // Abort any in-flight requests
      if (statusAbortControllerRef.current) {
        statusAbortControllerRef.current.abort()
      }
      if (typeAbortControllerRef.current) {
        typeAbortControllerRef.current.abort()
      }
      if (priorityAbortControllerRef.current) {
        priorityAbortControllerRef.current.abort()
      }
    }
  }, [])

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }
    getCurrentUser()
  }, [])

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      setIsLoadingComments(true)
      const supabase = createClient()
      
      // First get workspace ID from slug
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('id')
        .eq('slug', workspaceSlug)
        .single()
      
      if (workspaceError || !workspace) {
        setComments([])
        setIsLoadingComments(false)
        return
      }
      
      // Then verify the issue belongs to the current workspace
      const { data: issueData, error: issueError } = await supabase
        .from('issues')
        .select('id, workspace_id')
        .eq('id', issueId)
        .eq('workspace_id', workspace.id)
        .single()
      
      if (issueError || !issueData) {
        // Issue doesn't exist or doesn't belong to workspace
        setComments([])
        setIsLoadingComments(false)
        return
      }
      
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          user:users!user_id (
            name,
            avatar_url
          )
        `)
        .eq('issue_id', issueId)
        .order('created_at', { ascending: true })
      
      if (!error && data) {
        // Transform the data to ensure user is an object, not an array
        const formattedComments: Comment[] = data.map((comment) => {
          const userObj = Array.isArray(comment.user) ? comment.user[0] : comment.user
          return {
            id: comment.id as string,
            content: comment.content as string,
            created_at: comment.created_at as string,
            user_id: comment.user_id as string,
            user: userObj || { name: 'Unknown', avatar_url: null }
          }
        })
        setComments(formattedComments)
      }
      setIsLoadingComments(false)
    }
    
    fetchComments()
  }, [issueId, workspaceSlug])

  useEffect(() => {
    const fetchIssue = async () => {
      // First get workspace ID from slug
      const supabase = createClient()
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('id')
        .eq('slug', workspaceSlug)
        .single()
      
      if (workspaceError || !workspace) {
        setLoading(false)
        return
      }
      
      // Check cache first with workspace validation
      const cachedIssue = getIssue(issueId, workspace.id)
      if (cachedIssue) {
        // Issue loaded from cache and validated for workspace
        setIssue(cachedIssue)
        setCreatedAt(cachedIssue.created_at)
        
        // Use creator info from cache if available
        if (cachedIssue.creator) {
          setCreatorName(cachedIssue.creator.name?.trim() || 'Unknown')
          setCreatorAvatar(cachedIssue.creator.avatar_url || null)
        } else {
          // Fallback: fetch creator info if not in cache
          const supabase = createClient()
          const { data: user } = await supabase
            .from('users')
            .select('name, avatar_url')
            .eq('id', cachedIssue.created_by)
            .maybeSingle()

          if (user) {
            setCreatorName(user.name.trim() || 'Unknown')
            setCreatorAvatar(user.avatar_url)
          } else {
            setCreatorName('Unknown')
            setCreatorAvatar(null)
          }
        }
        
        setLoading(false)
        // Issue fully loaded with creator
        return
      }

      // If not in cache, fetch from API (which validates workspace access)
      // Issue not in cache, fetching from API
      setLoading(true)
      
      try {
        const response = await fetch(`/api/workspaces/${workspaceSlug}/issues/${issueId}`)
        
        if (!response.ok) {
          // Don't redirect, let the page handle the error
          setLoading(false)
          return
        }

        const { issue, creator } = await response.json()

        // Transform issue data to include issue_tags in expected format
        const transformedIssue = {
          ...issue,
          issue_tags: issue.issue_tags || []
        }

        setIssue(transformedIssue)
        setCreatedAt(issue.created_at)

        // Use creator info from API response
        if (creator) {
          setCreatorName(creator.name?.trim() || 'Unknown')
          setCreatorAvatar(creator.avatar_url || null)
        } else {
          setCreatorName('Unknown')
          setCreatorAvatar(null)
        }

        setLoading(false)
        // Issue loaded from API
      } catch (error) {
        console.error('Error fetching issue:', error)
        setLoading(false)
      }
    }

    fetchIssue()
  }, [issueId, workspaceSlug, onBack, getIssue])

  // Subscribe to status updates
  useEffect(() => {
    const unsubscribe = subscribeToIssueStatusUpdates((event) => {
      // Only react to external status updates, not our own
      if (event.detail.issueId === issueId && 
          updateSourceRef.current !== componentIdRef.current) {
        setIssue(prevIssue => {
          if (!prevIssue || prevIssue.status === event.detail.newStatus) return prevIssue
          
          // Cancel any pending status changes to prevent conflicts
          if (statusChangeTimeoutRef.current) {
            clearTimeout(statusChangeTimeoutRef.current)
            statusChangeTimeoutRef.current = null
          }
          
          // Abort any in-flight status requests
          if (statusAbortControllerRef.current) {
            statusAbortControllerRef.current.abort()
            statusAbortControllerRef.current = null
          }
          
          // Reset updating state since external update takes precedence
          setIsUpdatingStatus(false)
          
          return { ...prevIssue, status: event.detail.newStatus as Issue['status'] }
        })
        // Update cache after state update
        updateIssue(issueId, { status: event.detail.newStatus as Issue['status'] })
      }
    })

    return unsubscribe
  }, [issueId, updateIssue])

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
      removeIssue(issue.id)
      onDeleted()
    }
  }

  const handleStatusChange = useCallback((newStatus: string) => {
    if (!issue || newStatus === issue.status) return
    
    // Clear any pending status change
    if (statusChangeTimeoutRef.current) {
      clearTimeout(statusChangeTimeoutRef.current)
    }
    
    // Abort any in-flight request
    if (statusAbortControllerRef.current) {
      statusAbortControllerRef.current.abort()
    }
    
    // Mark this component as the source of the update
    updateSourceRef.current = componentIdRef.current
    
    // Store previous status for rollback
    const previousStatus = issue.status
    
    // Immediate optimistic update
    setIssue(prev => prev ? { ...prev, status: newStatus as Issue['status'] } : prev)
    updateIssue(issue.id, { status: newStatus as Issue['status'] })
    setIsUpdatingStatus(true)
    
    // Debounce the API call
    statusChangeTimeoutRef.current = setTimeout(async () => {
      // Create new abort controller for this request
      statusAbortControllerRef.current = new AbortController()
      
      try {
        const response = await fetch(`/api/workspaces/${workspaceSlug}/issues/${issue.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus.trim() }),
          signal: statusAbortControllerRef.current.signal
        })

        if (!response.ok) {
          let errorData
          try {
            errorData = await response.json()
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError)
            errorData = { error: 'Failed to parse server error response' }
          }
          
          throw new Error(errorData.error || errorData.message || 'Failed to update status')
        }

        const { issue: updatedIssue } = await response.json()
        
        // Update with server response to ensure consistency
        setIssue(updatedIssue)
        updateIssue(issue.id, updatedIssue)
        
        // Emit the status update event after successful update
        emitIssueStatusUpdate(issue.id, newStatus)
        
        toast({
          title: "Status updated",
          description: `Issue status changed to ${newStatus.toLowerCase().replace('_', ' ')}.`,
        })
      } catch (error) {
        // Don't show error or rollback if request was aborted
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }
        
        // Rollback on error
        setIssue(prev => prev ? { ...prev, status: previousStatus } : prev)
        updateIssue(issue.id, { status: previousStatus })
        
        console.error('Failed to update issue status:', error)
        toast({
          title: "Failed to update status",
          description: error instanceof Error ? error.message : "An error occurred while updating the issue status.",
          variant: "destructive",
        })
      } finally {
        setIsUpdatingStatus(false)
        statusChangeTimeoutRef.current = null
        statusAbortControllerRef.current = null
        // Clear the update source after a short delay
        setTimeout(() => {
          updateSourceRef.current = null
        }, 100)
      }
    }, 300) // 300ms debounce
  }, [issue, workspaceSlug, updateIssue, toast])

  const handleTypeChange = useCallback((newType: string) => {
    if (!issue || newType === issue.type) return
    
    // Clear any pending type change
    if (typeChangeTimeoutRef.current) {
      clearTimeout(typeChangeTimeoutRef.current)
    }
    
    // Abort any in-flight request
    if (typeAbortControllerRef.current) {
      typeAbortControllerRef.current.abort()
    }
    
    // Store previous type for rollback
    const previousType = issue.type
    
    // Immediate optimistic update
    setIssue(prev => prev ? { ...prev, type: newType as Issue['type'] } : prev)
    updateIssue(issue.id, { type: newType as Issue['type'] })
    
    // Debounce the API call
    typeChangeTimeoutRef.current = setTimeout(async () => {
      // Create new abort controller for this request
      typeAbortControllerRef.current = new AbortController()
      setIsUpdatingType(true)
      
      try {
        const response = await fetch(`/api/workspaces/${workspaceSlug}/issues/${issue.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type: newType }),
          signal: typeAbortControllerRef.current.signal
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update type')
        }

        const { issue: updatedIssue } = await response.json()
        
        // Update with server response to ensure consistency
        setIssue(updatedIssue)
        updateIssue(issue.id, updatedIssue)
        
        toast({
          title: "Type updated",
          description: `Issue type changed to ${newType.toLowerCase()}.`,
        })
      } catch (error) {
        // Don't show error or rollback if request was aborted
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }
        
        // Rollback on error
        setIssue(prev => prev ? { ...prev, type: previousType } : prev)
        updateIssue(issue.id, { type: previousType })
        
        console.error('Failed to update issue type:', error)
        toast({
          title: "Failed to update type",
          description: error instanceof Error ? error.message : "An error occurred while updating the issue type.",
          variant: "destructive",
        })
      } finally {
        setIsUpdatingType(false)
        typeChangeTimeoutRef.current = null
        typeAbortControllerRef.current = null
      }
    }, 300) // 300ms debounce
  }, [issue, workspaceSlug, updateIssue, toast])

  const handlePriorityChange = useCallback((newPriority: string) => {
    if (!issue || newPriority === issue.priority) return
    
    // Clear any pending priority change
    if (priorityChangeTimeoutRef.current) {
      clearTimeout(priorityChangeTimeoutRef.current)
    }
    
    // Abort any in-flight request
    if (priorityAbortControllerRef.current) {
      priorityAbortControllerRef.current.abort()
    }
    
    // Store previous priority for rollback
    const previousPriority = issue.priority
    
    // Immediate optimistic update
    setIssue(prev => prev ? { ...prev, priority: newPriority as Issue['priority'] } : prev)
    updateIssue(issue.id, { priority: newPriority as Issue['priority'] })
    
    // Debounce the API call
    priorityChangeTimeoutRef.current = setTimeout(async () => {
      // Create new abort controller for this request
      priorityAbortControllerRef.current = new AbortController()
      setIsUpdatingPriority(true)
      
      try {
        const response = await fetch(`/api/workspaces/${workspaceSlug}/issues/${issue.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ priority: newPriority }),
          signal: priorityAbortControllerRef.current.signal
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update priority')
        }

        const { issue: updatedIssue } = await response.json()
        
        // Update with server response to ensure consistency
        setIssue(updatedIssue)
        updateIssue(issue.id, updatedIssue)
        
        toast({
          title: "Priority updated",
          description: `Issue priority changed to ${newPriority.toLowerCase()}.`,
        })
      } catch (error) {
        // Don't show error or rollback if request was aborted
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }
        
        // Rollback on error
        setIssue(prev => prev ? { ...prev, priority: previousPriority } : prev)
        updateIssue(issue.id, { priority: previousPriority })
        
        console.error('Failed to update issue priority:', error)
        toast({
          title: "Failed to update priority",
          description: error instanceof Error ? error.message : "An error occurred while updating the issue priority.",
          variant: "destructive",
        })
      } finally {
        setIsUpdatingPriority(false)
        priorityChangeTimeoutRef.current = null
        priorityAbortControllerRef.current = null
      }
    }, 300) // 300ms debounce
  }, [issue, workspaceSlug, updateIssue, toast])

  const handleEdit = () => {
    setIsEditModalOpen(true)
  }

  const handleAddComment = async (content: string) => {
    if (!currentUserId || !issue) return
    
    setIsSubmittingComment(true)
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('comments')
      .insert({
        issue_id: issue.id,
        user_id: currentUserId,
        content
      })
      .select(`
        id,
        content,
        created_at,
        user_id,
        user:users!user_id (
          name,
          avatar_url
        )
      `)
      .single()
    
    if (!error && data) {
      // Transform the data to ensure user is an object, not an array
      const userData = Array.isArray(data.user) ? data.user[0] : data.user
      const formattedComment: Comment = {
        id: data.id,
        content: data.content,
        created_at: data.created_at,
        user_id: data.user_id,
        user: userData || { name: 'Unknown', avatar_url: null }
      }
      setComments([...comments, formattedComment])
      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully.",
      })
    } else {
      toast({
        title: "Failed to add comment",
        description: error?.message || "An error occurred while posting your comment.",
        variant: "destructive",
      })
    }
    
    setIsSubmittingComment(false)
  }

  const handleIssueUpdated = async (updatedIssue?: Issue) => {
    if (updatedIssue) {
      // Use the updated issue data directly from the modal
      setIssue(updatedIssue)
      updateIssue(issueId, updatedIssue)
    } else {
      // Fallback to refetching if no updated issue is provided
      const supabase = createClient()
      const { data: refetchedIssue } = await supabase
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
        .eq('id', issueId)
        .single()
      
      if (refetchedIssue) {
        setIssue(refetchedIssue)
        updateIssue(issueId, refetchedIssue)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <IssueDetailsSkeleton />
        </div>
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
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
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
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground break-words">{issue.title}</h1>
            </div>
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 hover:bg-accent rounded-lg transition-colors">
                    <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit issue
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete issue
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          </div>

          {/* Metadata */}
          <div className="space-y-3">
            {/* Priority with inline editing */}
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground text-sm">Priority:</span>
              <div className="relative inline-flex items-center">
                <Select
                  value={issue.priority}
                  onValueChange={handlePriorityChange}
                  disabled={isUpdatingPriority}
                >
                  <SelectTrigger className={`h-7 w-auto border-0 p-0 hover:bg-accent focus:ring-0 focus:ring-offset-0 [&>span]:line-clamp-none transition-all duration-200 ${isUpdatingPriority ? 'pointer-events-none' : ''}`}>
                    <SelectValue>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-200 ${priorityColors[issue.priority]} ${isUpdatingPriority ? 'opacity-60' : ''}`}>
                        {isUpdatingPriority && (
                          <svg className="h-3 w-3 animate-spin mr-1" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                        {priorityLabels[issue.priority]}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors.critical}`}>
                        {priorityLabels.critical}
                      </span>
                    </SelectItem>
                    <SelectItem value="high">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors.high}`}>
                        {priorityLabels.high}
                      </span>
                    </SelectItem>
                    <SelectItem value="medium">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors.medium}`}>
                        {priorityLabels.medium}
                      </span>
                    </SelectItem>
                    <SelectItem value="low">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors.low}`}>
                        {priorityLabels.low}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Status and Type - responsive layout */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-muted-foreground text-sm">Status:</span>
                <div className="relative inline-flex items-center">
                  <Select
                    value={issue.status}
                    onValueChange={handleStatusChange}
                    disabled={isUpdatingStatus}
                  >
                    <SelectTrigger className={`h-7 w-auto border-0 p-0 px-2 hover:bg-accent focus:ring-0 focus:ring-offset-0 [&>span]:line-clamp-none transition-all duration-200 ${isUpdatingStatus ? 'bg-accent/50' : ''}`}>
                      <SelectValue>
                        <span className={`text-sm font-medium transition-colors duration-200 ${statusOptions.find(s => s.value === issue.status)?.color || 'text-muted-foreground'}`}>
                          {isUpdatingStatus ? (
                            <span className="inline-flex items-center gap-1.5">
                              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              {statusOptions.find(s => s.value === issue.status)?.label || issue.status}
                            </span>
                          ) : (
                            statusOptions.find(s => s.value === issue.status)?.label || issue.status
                          )}
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
              <div className="flex items-center space-x-2">
                <span className="text-muted-foreground text-sm">Type:</span>
                <div className="relative inline-flex items-center">
                  <Select
                    value={issue.type}
                    onValueChange={handleTypeChange}
                    disabled={isUpdatingType}
                  >
                    <SelectTrigger className={`h-7 w-auto border-0 p-0 px-2 hover:bg-accent focus:ring-0 focus:ring-offset-0 [&>span]:line-clamp-none transition-all duration-200 ${isUpdatingType ? 'bg-accent/50' : ''}`}>
                      <SelectValue>
                        <span className="text-sm font-medium flex items-center gap-1 transition-opacity duration-200">
                          {isUpdatingType && (
                            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          )}
                          <span className={isUpdatingType ? 'opacity-60' : ''}>{typeOptions.find(t => t.value === issue.type)?.icon || '📌'}</span>
                          <span className={`hidden sm:inline ${isUpdatingType ? 'opacity-60' : ''}`}>{typeOptions.find(t => t.value === issue.type)?.label || issue.type}</span>
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
            
            {/* Tags */}
            {issue.issue_tags && issue.issue_tags.length > 0 && (
              <div className="flex items-center flex-wrap gap-2 mt-3">
                <span className="text-muted-foreground text-sm">Tags:</span>
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
          </div>

          {/* AI Generated Prompt */}
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
            <p className="text-muted-foreground italic">No description provided</p>
          )}

          {/* Divider */}
          <div className="border-t border-border my-8"></div>

          {/* Activity Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-foreground">Activity</h2>
            
            <div className="space-y-4">
              {/* Created by info */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {creatorAvatar && creatorAvatar.startsWith('http') ? (
                      <img 
                        src={creatorAvatar} 
                        alt={creatorName}
                        className="h-full w-full object-cover"
                      />
                    ) : creatorAvatar && creatorAvatar.length <= 2 ? (
                      <span className="text-lg">{creatorAvatar}</span>
                    ) : (
                      <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{creatorName}</span>
                    <span className="text-muted-foreground"> created this issue</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {createdAt && formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              
              {/* Comments Section */}
              <div className="mt-6">
                {currentUserId && (
                  <CommentList
                    comments={comments}
                    onAddComment={handleAddComment}
                    isLoading={isLoadingComments}
                    isSubmitting={isSubmittingComment}
                  />
                )}
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