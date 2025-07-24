'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const AVATAR_OPTIONS = [
  '🐱', '🐶', '🦊', '🐻', '🐼', '🐨', '🐸', '🦁', 
  '🐵', '🦄', '🐙', '🦋', '🌟', '🎨', '🚀', '🌈'
]

export default function CreateUserForm() {
  const [name, setName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name || name.length < 3) {
      setError('Name must be at least 3 characters')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/')
        return
      }

      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          name: name.trim(),
          avatar_url: selectedAvatar || '👤'
        })

      if (insertError) {
        throw insertError
      }

      // Simple redirect - no cache invalidation needed
      router.push('/CreateWorkspace')
    } catch (err) {
      console.error('Error creating user:', err)
      setError(err instanceof Error ? err.message : 'Failed to create profile')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card p-8 rounded-lg shadow-lg max-w-md w-full">
      <h1 className="text-2xl font-bold text-center mb-8">Create Your Profile</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-foreground mb-2">
          Choose an Avatar
        </label>
        <div className="grid grid-cols-4 gap-3">
          {AVATAR_OPTIONS.map((avatar) => (
            <button
              key={avatar}
              type="button"
              onClick={() => setSelectedAvatar(avatar)}
              className={`p-3 text-2xl rounded-lg border-2 transition-all ${
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

      <div className="mb-6">
        <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
          Your Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          autoFocus
          disabled={isLoading}
          className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!name || name.length < 3 || isLoading}
        className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
          name && name.length >= 3 && !isLoading
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        }`}
      >
        {isLoading ? 'Creating...' : 'Continue'}
      </button>
    </form>
  )
}