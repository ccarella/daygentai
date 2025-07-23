'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const WORKSPACE_AVATARS = [
  '🏢', '🚀', '💼', '🎯', '🌟', '💡', '🔧', '🎨',
  '📊', '🌐', '⚡', '🔥', '🌈', '🎪', '🏗️', '🎭'
]

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
}

interface CreateWorkspaceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onWorkspaceCreated?: (workspace: { id: string; name: string; slug: string; avatar_url: string }) => void
}

export function CreateWorkspaceModal({ open, onOpenChange, onWorkspaceCreated }: CreateWorkspaceModalProps) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slugError, setSlugError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (name) {
      const generatedSlug = generateSlug(name)
      setSlug(generatedSlug)
    } else {
      setSlug('')
    }
  }, [name])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setName('')
      setSlug('')
      setSelectedAvatar('')
      setError(null)
      setSlugError(null)
    }
  }, [open])

  const validateSlug = (value: string): boolean => {
    if (!value) return false
    if (value.length < 3) return false
    if (!/^[a-z0-9-]+$/.test(value)) return false
    if (value.startsWith('-') || value.endsWith('-')) return false
    return true
  }

  const handleSlugChange = (value: string) => {
    setSlug(value.toLowerCase())
    
    if (value && !validateSlug(value)) {
      setSlugError('Slug must be at least 3 characters, contain only lowercase letters, numbers, and hyphens')
    } else {
      setSlugError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Set a timeout for the operation
    const timeoutId = setTimeout(() => {
      setError('The request is taking longer than expected. Please check your connection and try again.')
      setIsLoading(false)
    }, 30000) // 30 second timeout

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        clearTimeout(timeoutId)
        setError('You must be logged in to create a workspace')
        return
      }

      // Create workspace using the RPC function - rely on its atomic validation
      const { data: result, error: createError } = await supabase.rpc('create_workspace', {
        p_name: name,
        p_slug: slug,
        p_avatar_url: selectedAvatar || '🏢'
      })

      clearTimeout(timeoutId)

      if (createError) {
        // Handle Supabase RPC errors
        console.error('RPC error:', createError)
        
        if (createError.message?.includes('duplicate key') || 
            createError.message?.includes('already exists')) {
          setError('This workspace URL is already taken. Please choose a different one.')
        } else if (createError.message?.includes('violates row-level security')) {
          setError('You do not have permission to create a workspace. Please ensure you are logged in.')
        } else if (createError.message?.includes('timeout') || 
                   createError.message?.includes('network')) {
          setError('Network error. Please check your connection and try again.')
        } else {
          setError(`Error creating workspace: ${createError.message}`)
        }
        return
      }

      if (!result?.success) {
        // Handle RPC function's custom error responses
        if (result?.detail === 'DUPLICATE_SLUG') {
          setError('This workspace URL is already taken. Please choose a different one.')
        } else if (result?.error === 'Not authenticated') {
          setError('You must be logged in to create a workspace.')
        } else {
          setError(result?.error || 'Failed to create workspace. Please try again.')
        }
        return
      }

      // Fetch the created workspace for the callback
      if (onWorkspaceCreated && result.workspace_id) {
        const { data: newWorkspace } = await supabase
          .from('workspaces')
          .select('id, name, slug, avatar_url')
          .eq('id', result.workspace_id)
          .single()
          
        if (newWorkspace) {
          onWorkspaceCreated(newWorkspace)
        }
      }

      // Navigate to the new workspace
      router.push(`/${slug}`)
      onOpenChange(false)
    } catch (err) {
      clearTimeout(timeoutId)
      console.error('Workspace creation error:', err)
      
      // Provide more detailed error messages based on the error type
      if (err instanceof Error) {
        if (err.name === 'AbortError' || err.message.includes('aborted')) {
          setError('Request was cancelled. Please try again.')
        } else if (err.message.includes('fetch failed') || 
                   err.message.includes('network') ||
                   err.message.includes('ERR_INTERNET_DISCONNECTED')) {
          setError('Network connection error. Please check your internet connection and try again.')
        } else if (err.message.includes('timeout')) {
          setError('The request timed out. Please try again.')
        } else {
          setError('An unexpected error occurred. Please try again.')
        }
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const isValidForm = name.length >= 3 && validateSlug(slug) && !slugError

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
          <DialogDescription>
            Set up a new workspace for your team or project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Choose a Workspace Avatar (Optional)</Label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {WORKSPACE_AVATARS.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`p-2 text-2xl rounded-lg border-2 transition-all ${
                    selectedAvatar === avatar
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-border'
                  }`}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Workspace Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Workspace"
              autoComplete="organization"
              autoCapitalize="words"
              required
            />
            {name.length > 0 && name.length < 3 && (
              <p className="text-sm text-destructive">
                Name must be at least 3 characters long
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Workspace URL</Label>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground mr-1">daygent.ai/</span>
              <Input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder={name ? generateSlug(name) : "workspace-url"}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="flex-1"
                required
              />
            </div>
            {slugError && (
              <p className="text-sm text-destructive">
                {slugError}
              </p>
            )}
            {slug && !slugError && (
              <p className="text-sm text-green-600">
                Your workspace will be available at: daygent.ai/{slug}
              </p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValidForm || isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Workspace'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}