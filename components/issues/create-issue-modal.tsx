'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MarkdownEditor } from '@/components/ui/markdown-editor'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import { generateIssuePrompt } from '@/lib/llm/prompt-generator'
import { useToast } from '@/components/ui/use-toast'
import { useWorkspace } from '@/contexts/workspace-context'
import { useIssueCache } from '@/contexts/issue-cache-context'
import { TagInput, type TagOption } from '@/components/ui/tag-input'
import { handleAIError } from '@/lib/error-handler'
import { getWorkspaceTags, createTag, updateIssueTags } from '@/lib/tags'

interface CreateIssueModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  onIssueCreated?: () => void
}

export function CreateIssueModal({
  open,
  onOpenChange,
  workspaceId,
  onIssueCreated,
}: CreateIssueModalProps) {
  const { toast } = useToast()
  const { workspace } = useWorkspace()
  const { invalidateListCache } = useIssueCache()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'feature' | 'bug' | 'chore' | 'design' | 'non-technical'>('feature')
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium')
  const [createPrompt, setCreatePrompt] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  const [selectedTags, setSelectedTags] = useState<TagOption[]>([])
  const [availableTags, setAvailableTags] = useState<TagOption[]>([])
  
  const hasApiKey = workspace?.hasApiKey || false
  
  // Set default createPrompt state when modal opens or API key status changes
  useEffect(() => {
    if (open) {
      setCreatePrompt(hasApiKey)
      // Load available tags
      loadTags()
    }
  }, [open, hasApiKey])
  
  const loadTags = async () => {
    const tags = await getWorkspaceTags(workspaceId)
    setAvailableTags(tags)
  }
  
  const handleCreateTag = async (name: string): Promise<TagOption> => {
    const newTag = await createTag(workspaceId, name)
    if (newTag) {
      const tagOption = { id: newTag.id, name: newTag.name, color: newTag.color }
      setAvailableTags([...availableTags, tagOption])
      return tagOption
    }
    // Return a temporary tag if creation fails
    return { id: `temp-${Date.now()}`, name, color: 'var(--primary)' }
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Validation error",
        description: "Title is required",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "You must be logged in to create an issue",
          variant: "destructive",
        })
        return
      }

      let generatedPrompt = null
      
      // Generate prompt if toggle is on and workspace has API key
      if (createPrompt && hasApiKey) {
        setIsGeneratingPrompt(true)
        try {
          const { prompt, error: promptError } = await generateIssuePrompt({
            title: title.trim(),
            description: description.trim(),
            workspaceId: workspaceId
          })
          
          if (promptError) {
            // Show error to user but continue without prompt
            handleAIError(promptError, "issue prompt generation")
          } else {
            generatedPrompt = prompt
          }
        } catch (error) {
          // Show error to user but continue without prompt
          handleAIError(error, "issue prompt generation")
        } finally {
          setIsGeneratingPrompt(false)
        }
      }
      
      // Create the issue with or without generated prompt
      const { data: issue, error: insertError } = await supabase
        .from('issues')
        .insert({
          title: title.trim(),
          description: description.trim(),
          type,
          priority,
          status: 'todo',
          workspace_id: workspaceId,
          created_by: user.id,
          generated_prompt: generatedPrompt,
        })
        .select()
        .single()

      if (insertError) {
        toast({
          title: "Failed to create issue",
          description: insertError.message,
          variant: "destructive",
        })
        return
      }
      
      // Add tags to the issue
      if (issue && selectedTags.length > 0) {
        const tagIds = selectedTags.map(tag => tag.id).filter(id => !id.startsWith('temp-'))
        if (tagIds.length > 0) {
          await updateIssueTags(issue.id, tagIds)
        }
      }

      // Reset form
      setTitle('')
      setDescription('')
      setType('feature')
      setPriority('medium')
      setCreatePrompt(false)
      setSelectedTags([])
      
      // Invalidate list cache for this workspace
      invalidateListCache(workspaceId)
      
      onOpenChange(false)
      onIssueCreated?.()
      
      // Show success toast
      toast({
        title: "Issue created",
        description: "Your new issue has been created successfully.",
      })
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isSubmitting && title.trim()) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-2xl flex flex-col overflow-hidden max-h-[90vh] sm:max-h-[85vh] relative !fixed sm:!inset-auto sm:!left-[50%] sm:!top-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%]"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>New issue</DialogTitle>
          <DialogDescription>Create a new issue for your workspace</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 -mx-6 scrollbar-thin">
          <div className="space-y-4 md:space-y-5 py-3 md:py-4 px-6">
            <div className="space-y-2">
              <Label htmlFor="title">Issue title</Label>
              <Input
                id="title"
                placeholder="Issue title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <MarkdownEditor
                value={description}
                onChange={setDescription}
                placeholder="Add description... (markdown supported)"
                rows={8}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Issue Type</Label>
                <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feature">✨ Feature</SelectItem>
                    <SelectItem value="bug">🐛 Bug</SelectItem>
                    <SelectItem value="chore">🔧 Chore</SelectItem>
                    <SelectItem value="design">🎨 Design</SelectItem>
                    <SelectItem value="non-technical">📝 Non-technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(value) => setPriority(value as typeof priority)}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">🔴 Critical</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="low">🟢 Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <TagInput
                value={selectedTags}
                onChange={setSelectedTags}
                availableTags={availableTags}
                onCreateTag={handleCreateTag}
                placeholder="Select or create tags..."
              />
            </div>

            <div className="flex items-center justify-between space-x-2 rounded-lg border p-3 md:p-4">
              <div className="space-y-0.5">
                <Label htmlFor="create-prompt" className="text-base">
                  Create a prompt
                </Label>
                <div className="text-sm text-muted-foreground">
                  {hasApiKey 
                    ? 'Generate an AI prompt for development agents' 
                    : workspaceId 
                      ? 'API key required in workspace settings' 
                      : 'No workspace ID provided'}
                  {/* Debug info */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Debug: workspaceId={workspaceId ? workspaceId.substring(0, 8) + '...' : 'none'}
                    </div>
                  )}
                </div>
              </div>
              <Switch
                id="create-prompt"
                checked={createPrompt}
                onCheckedChange={setCreatePrompt}
                disabled={!hasApiKey}
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 md:p-3 rounded-md">
                {error}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isGeneratingPrompt ? 'Generating prompt...' : 'Create issue'}
          </Button>
        </DialogFooter>
        
        {/* Loading overlay */}
        {(isSubmitting || isGeneratingPrompt) && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-lg z-50">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                {isGeneratingPrompt ? 'Generating AI prompt...' : 'Creating issue...'}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}