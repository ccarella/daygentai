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

  const handleSave = async () => {
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
          name: name,
          avatar_url: selectedAvatar || '👤'
        })

      if (insertError) {
        throw insertError
      }

      router.push('/CreateWorkspace')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const isValidName = name.length >= 3

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey && isValidName && !isLoading) {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <div className="bg-white p-4 md:p-6 lg:p-8 rounded-lg shadow-lg max-w-md w-full" onKeyDown={handleKeyDown}>
      <h1 className="text-2xl font-bold text-center mb-8">Complete Your Profile</h1>
      
      <div className="mb-4 md:mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Choose an Avatar (Optional)
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 md:gap-3">
          {AVATAR_OPTIONS.map((avatar) => (
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
          Your Name (Required)
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          autoComplete="name"
          autoCapitalize="words"
          className="w-full px-3 py-2 md:px-4 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {name.length > 0 && !isValidName && (
          <p className="mt-1 text-sm text-red-600">
            Name must be at least 3 characters long
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 p-2 md:p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={!isValidName || isLoading}
        className={`w-full py-2 px-4 md:py-2.5 md:px-5 rounded-lg font-medium transition-all ${
          isValidName && !isLoading
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isLoading ? 'Saving...' : 'Save'}
      </button>
    </div>
  )
}