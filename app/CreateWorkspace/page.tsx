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

export default function CreateWorkspacePage() {
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
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
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

      const { error: insertError } = await supabase
        .from('workspaces')
        .insert({
          name: name,
          slug: slug,
          avatar_url: selectedAvatar || '🏢',
          owner_id: user.id
        })

      if (insertError) {
        throw insertError
      }

      router.push(`/${slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const isValidForm = name.length >= 3 && validateSlug(slug) && !slugError

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-4 md:p-6 lg:p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-8">Create Your Workspace</h1>
        
        <div className="mb-4 md:mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Choose a Workspace Avatar (Optional)
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 md:gap-3">
            {WORKSPACE_AVATARS.map((avatar) => (
              <button
                key={avatar}
                onClick={() => setSelectedAvatar(avatar)}
                className={`min-h-[44px] min-w-[44px] p-2 md:p-3 text-2xl rounded-lg border-2 transition-all ${
                  selectedAvatar === avatar
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {avatar}
              </button>
            ))}
          </div>
          {selectedAvatar && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {selectedAvatar}
            </p>
          )}
        </div>

        <div className="mb-4 md:mb-6">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
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
            className="w-full px-3 py-2 md:px-4 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {name.length > 0 && name.length < 3 && (
            <p className="mt-1 text-sm text-red-600">
              Name must be at least 3 characters long
            </p>
          )}
        </div>

        <div className="mb-4 md:mb-6">
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
            Workspace URL (Required)
          </label>
          <div className="flex items-center">
            <span className="text-gray-500 text-sm mr-1">daygent.ai/</span>
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
              className="flex-1 px-3 py-2 md:px-4 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? 'Creating...' : 'Next'}
        </button>
      </div>
    </div>
  )
}