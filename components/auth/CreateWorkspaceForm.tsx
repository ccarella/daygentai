'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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

export default function CreateWorkspaceForm() {
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

  const handleNext = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (!user || userError) {
        router.push('/')
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

      // Invalidate middleware cache for this user
      if (typeof window !== 'undefined') {
        try {
          await fetch('/api/cache/invalidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id })
          })
        } catch (cacheError) {
          console.warn('Failed to invalidate cache:', cacheError)
        }
      }

      router.push(`/${slug}`)
    } catch (err) {
      console.error('Workspace creation error:', err)
      
      // Provide more detailed error messages based on the error type
      if (err instanceof Error) {
        // Check for specific Supabase error codes
        if (err.message.includes('duplicate key')) {
          setError('This workspace URL is already taken. Please choose a different one.')
        } else if (err.message.includes('violates row-level security policy')) {
          setError('You do not have permission to create a workspace. Please ensure you are logged in.')
        } else if (err.message.includes('null value in column')) {
          setError('Missing required information. Please fill in all fields.')
        } else {
          setError(`Error creating workspace: ${err.message}`)
        }
      } else {
        setError('An unexpected error occurred while creating your workspace. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const isValidForm = name.length >= 3 && validateSlug(slug) && !slugError

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && isValidForm && !isLoading) {
      e.preventDefault()
      handleNext()
    }
  }

  return (
    <div className="bg-white p-4 md:p-6 lg:p-8 rounded-lg shadow-lg max-w-md w-full" onKeyDown={handleKeyDown}>
      <h1 className="text-2xl font-bold text-center mb-8">Create Your Workspace</h1>
      
      <div className="mb-4 md:mb-6">
        <label className="block text-sm font-medium text-foreground mb-2">
          Choose a Workspace Avatar (Optional)
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 md:gap-3">
          {WORKSPACE_AVATARS.map((avatar) => (
            <button
              key={avatar}
              onClick={() => setSelectedAvatar(avatar)}
              className={`min-h-[44px] min-w-[44px] p-2 md:p-3 text-2xl rounded-lg border-2 transition-all ${
                selectedAvatar === avatar
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-border'
              }`}
            >
              {avatar}
            </button>
          ))}
        </div>
        {selectedAvatar && (
          <p className="mt-2 text-sm text-muted-foreground">
            Selected: {selectedAvatar}
          </p>
        )}
      </div>

      <div className="mb-4 md:mb-6">
        <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
          Workspace Name (Required)
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Awesome Workspace"
          autoComplete="organization"
          autoCapitalize="words"
          className="w-full px-3 py-2 md:px-4 md:py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {name.length > 0 && name.length < 3 && (
          <p className="mt-1 text-sm text-red-600">
            Name must be at least 3 characters long
          </p>
        )}
      </div>

      <div className="mb-4 md:mb-6">
        <label htmlFor="slug" className="block text-sm font-medium text-foreground mb-2">
          Workspace URL (Required)
        </label>
        <div className="flex items-center">
          <span className="text-muted-foreground text-sm mr-1">daygent.ai/</span>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder={name ? generateSlug(name) : "workspace-url"}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 px-3 py-2 md:px-4 md:py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {slugError && (
          <p className="mt-1 text-sm text-red-600">
            {slugError}
          </p>
        )}
        {slug && !slugError && (
          <p className="mt-1 text-sm text-green-600">
            Your workspace will be available at: daygent.ai/{slug}
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 p-2 md:p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <button
        onClick={handleNext}
        disabled={!isValidForm || isLoading}
        className={`w-full py-2 px-4 md:py-2.5 md:px-5 rounded-lg font-medium transition-all ${
          isValidForm && !isLoading
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        }`}
      >
        {isLoading ? 'Creating...' : 'Next'}
      </button>
    </div>
  )
}