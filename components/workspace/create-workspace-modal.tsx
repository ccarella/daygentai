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

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('You must be logged in to create a workspace')
        setIsLoading(false)
        return
      }

      // Check if slug is already taken
      const { data: existingWorkspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('slug', slug)
        .single()

      if (existingWorkspace) {
        setError('This workspace URL is already taken. Please choose a different one.')
        setIsLoading(false)
        return
      }

      // Create workspace using the RPC function
      const { data: result, error: createError } = await supabase.rpc('create_workspace', {
        p_name: name,
        p_slug: slug,
        p_avatar_url: selectedAvatar || '🏢'
      })

      if (createError || !result?.success) {
        // Check for duplicate slug error
        if (result?.detail === 'DUPLICATE_SLUG') {
          setError('This workspace URL is already taken. Please choose a different one.')
          setIsLoading(false)
          return
        }
        throw createError || new Error(result?.error || 'Failed to create workspace')
      }

      // Fetch the created workspace for the callback
      if (onWorkspaceCreated) {
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
      setError(err instanceof Error ? err.message : 'Something went wrong')
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