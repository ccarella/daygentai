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

    // Set a timeout for the operation
    const timeoutId = setTimeout(() => {
      setError('The request is taking longer than expected. Please check your connection and try again.')
      setIsLoading(false)
    }, 30000) // 30 second timeout

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (!user || userError) {
        clearTimeout(timeoutId)
        router.push('/')
        return
      }

      // Create workspace - rely on RPC function's atomic validation
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
          router.push('/')
        } else {
          setError(result?.error || 'Failed to create workspace. Please try again.')
        }
        return
      }

      // Success - invalidate middleware cache for this user
      if (typeof window !== 'undefined') {
        try {
          await Promise.race([
            fetch('/api/cache/invalidate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id })
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Cache invalidation timeout')), 5000)
            )
          ])
        } catch (cacheError) {
          // Don't block navigation on cache invalidation failure
          console.warn('Failed to invalidate cache:', cacheError)
        }
      }

      // Navigate to success page first to ensure cache is properly invalidated
      // The success page will then redirect to the workspace
      router.push('/success')
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