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
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'feature' | 'bug' | 'chore' | 'design' | 'non-technical'>('feature')
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium')
  const [createPrompt, setCreatePrompt] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  
  
  // Check if workspace has API key when modal opens
  useEffect(() => {
    const checkApiKey = async () => {
      if (!open || !workspaceId) {
        return
      }
      
      try {
        const supabase = createClient()
        
        // First ensure we have a valid session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session) {
          return
        }
        
        // Now fetch workspace with api_key
        const { data: workspace, error } = await supabase
          .from('workspaces')
          .select('id, name, api_key, api_provider')
          .eq('id', workspaceId)
          .single()
        
        if (error) {
          return
        }
        
        // Check if api_key exists and is not empty
        const hasKey = !!(workspace?.api_key && workspace.api_key.length > 0)
        
        setHasApiKey(hasKey)
        setCreatePrompt(hasKey) // Set default state based on API key presence
      } catch (error) {
        // Silent error handling
      }
    }
    
    checkApiKey()
  }, [open, workspaceId])

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('You must be logged in to create an issue')
        return
      }

      let generatedPrompt = null
      
      // Generate prompt if toggle is on and workspace has API key
      if (createPrompt && hasApiKey) {
        setIsGeneratingPrompt(true)
        try {
          // Fetch workspace data including API key and agents content
          const { data: workspace } = await supabase
            .from('workspaces')
            .select('api_key, api_provider, agents_content')
            .eq('id', workspaceId)
            .single()
          
          if (workspace?.api_key) {
            const { prompt, error: promptError } = await generateIssuePrompt({
              title: title.trim(),
              description: description.trim(),
              agentsContent: workspace.agents_content,
              apiKey: workspace.api_key,
              provider: workspace.api_provider || 'openai'
            })
            
            if (promptError) {
              console.error('Error generating prompt:', promptError)
              // Continue without prompt - don't block issue creation
            } else {
              generatedPrompt = prompt
            }
          }
        } catch (error) {
          console.error('Error generating prompt:', error)
          // Continue without prompt
        } finally {
          setIsGeneratingPrompt(false)
        }
      }
      
      // Create the issue with or without generated prompt
      const { error: insertError } = await supabase
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

      if (insertError) {
        setError('Failed to create issue: ' + insertError.message)
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
    } catch {
      setError('An unexpected error occurred')
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
              <div className="space-y-0.5">
                <Label htmlFor="create-prompt" className="text-base">
                  Create a prompt
                </Label>
                <div className="text-sm text-gray-500">
                  {hasApiKey 
                    ? 'Generate an AI prompt for development agents' 
                    : workspaceId 
                      ? 'API key required in workspace settings' 
                      : 'No workspace ID provided'}
                  {/* Debug info */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="text-xs text-gray-400 mt-1">
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
            {isGeneratingPrompt ? 'Generating prompt...' : 'Create issue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}