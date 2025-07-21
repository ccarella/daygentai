'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MoreHorizontal, Trash2, Edit3 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useIssueCache } from '@/contexts/issue-cache-context'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { subscribeToIssueStatusUpdates } from '@/lib/events/issue-events'
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
  type: 'feature' | 'bug' | 'chore' | 'design' | 'non-technical'
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
  chore: '🔧',
  design: '🎨',
  'non-technical': '📝'
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
  { value: 'chore', label: 'Chore', icon: '🔧' },
  { value: 'design', label: 'Design', icon: '🎨' },
  { value: 'non-technical', label: 'Non-technical', icon: '📝' },
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(true)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

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
            .single()

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
      if (event.detail.issueId === issueId) {
        setIssue(prevIssue => {
          if (!prevIssue) return prevIssue
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
    
    const updatedIssue = { ...issue, status: newStatus as Issue['status'] }
    setIssue(updatedIssue)
    updateIssue(issue.id, { status: newStatus as Issue['status'] })
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
    
    const updatedIssue = { ...issue, type: newType as Issue['type'] }
    setIssue(updatedIssue)
    updateIssue(issue.id, { type: newType as Issue['type'] })
    toast({
      title: "Type updated",
      description: `Issue type changed to ${newType.toLowerCase()}.`,
    })
    
    setIsUpdatingType(false)
  }

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

  const handleIssueUpdated = async () => {
    // Refresh the issue data after update
    const supabase = createClient()
    const { data: updatedIssue } = await supabase
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
    
    if (updatedIssue) {
      setIssue(updatedIssue)
      updateIssue(issueId, updatedIssue)
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
            {/* Priority - now on its own */}
            <div className="flex items-center">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[issue.priority]}`}>
                {priorityLabels[issue.priority]}
              </span>
            </div>
            
            {/* Status and Type - responsive layout */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-muted-foreground text-sm">Status:</span>
                <Select
                  value={issue.status}
                  onValueChange={handleStatusChange}
                  disabled={isUpdatingStatus}
                >
                  <SelectTrigger className="h-7 w-auto border-0 p-0 hover:bg-accent focus:ring-0 focus:ring-offset-0">
                    <SelectValue>
                      <span className={`text-sm font-medium ${statusOptions.find(s => s.value === issue.status)?.color || 'text-muted-foreground'}`}>
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
                <span className="text-muted-foreground text-sm">Type:</span>
                <Select
                  value={issue.type}
                  onValueChange={handleTypeChange}
                  disabled={isUpdatingType}
                >
                  <SelectTrigger className="h-7 w-auto border-0 p-0 hover:bg-accent focus:ring-0 focus:ring-offset-0">
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