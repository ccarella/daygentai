'use client'

import React, { useState, useEffect } from 'react'
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
import { Loader2, Sparkles, Info } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useWorkspace } from '@/contexts/workspace-context'
import { createIssue } from '@/app/actions/create-issue'

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
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'feature' | 'bug' | 'chore' | 'design' | 'non-technical'>('feature')
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium')
  const [createPrompt, setCreatePrompt] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  const hasApiKey = workspace?.hasApiKey || false
  
  // Set default createPrompt state when modal opens or API key status changes
  useEffect(() => {
    if (open) {
      setCreatePrompt(hasApiKey)
    }
  }, [open, hasApiKey])

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
      const result = await createIssue({
        title,
        description,
        type,
        priority,
        workspaceId,
        generatePrompt: createPrompt && hasApiKey
      })

      if (!result.success) {
        toast({
          title: "Failed to create issue",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      // Reset form
      setTitle('')
      setDescription('')
      setType('feature')
      setPriority('medium')
      setCreatePrompt(false)
      
      onOpenChange(false)
      onIssueCreated?.()
      
      // Show success toast with appropriate message
      if (createPrompt && hasApiKey) {
        toast({
          title: "Issue created",
          description: "Your issue has been created. The AI prompt will be generated in the background and appear in your inbox when ready.",
          duration: 5000,
        })
      } else {
        toast({
          title: "Issue created",
          description: "Your new issue has been created successfully.",
        })
      }
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
        className="sm:max-w-2xl flex flex-col overflow-hidden max-h-[90vh] sm:max-h-[85vh]"
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

            <div className="flex items-center justify-between space-x-2 rounded-lg border p-3 md:p-4">
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <Label htmlFor="create-prompt" className="text-base">
                    Generate AI prompt
                  </Label>
                </div>
                <div className="text-sm text-gray-500">
                  {hasApiKey 
                    ? 'Generate an AI prompt for development agents in the background' 
                    : workspaceId 
                      ? 'API key required in workspace settings' 
                      : 'No workspace ID provided'}
                </div>
                {createPrompt && hasApiKey && (
                  <div className="flex items-start gap-2 mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>The prompt will be generated after issue creation and appear in your inbox when ready</span>
                  </div>
                )}
              </div>
              <Switch
                id="create-prompt"
                checked={createPrompt}
                onCheckedChange={setCreatePrompt}
                disabled={!hasApiKey}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 md:p-3 rounded-md">
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
            Create issue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}