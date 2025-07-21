'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Credenza,
  CredenzaContent,
  CredenzaDescription,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaBody,
  CredenzaFooter,
} from '@/components/ui/credenza'
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

      // Create workspace
      const { data: newWorkspace, error: insertError } = await supabase
        .from('workspaces')
        .insert({
          name: name,
          slug: slug,
          avatar_url: selectedAvatar || '🏢',
          owner_id: user.id
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      // Add user as owner in workspace_members
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: newWorkspace.id,
          user_id: user.id,
          role: 'owner'
        })

      if (memberError) {
        console.error('Error adding user to workspace_members:', memberError)
      }

      // Call the callback if provided
      if (onWorkspaceCreated) {
        onWorkspaceCreated(newWorkspace)
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
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaContent className="sm:max-w-lg">
        <CredenzaHeader>
          <CredenzaTitle>Create New Workspace</CredenzaTitle>
          <CredenzaDescription>
            Set up a new workspace for your team or project.
          </CredenzaDescription>
        </CredenzaHeader>

        <CredenzaBody>
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

          </form>
        </CredenzaBody>
        <CredenzaFooter>
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
            onClick={handleSubmit}
            disabled={!isValidForm || isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Workspace'}
          </Button>
        </CredenzaFooter>
      </CredenzaContent>
    </Credenza>
  )
}