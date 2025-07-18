'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

interface UserSettingsProps {
  user: User
}

const AVATAR_OPTIONS = [
  '🐱', '🐶', '🦊', '🐻', '🐼', '🐨', '🐸', '🦁', 
  '🐵', '🦄', '🐙', '🦋', '🌟', '🎨', '🚀', '🌈'
]

export function UserSettings({ user }: UserSettingsProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState(user.email || '')
  const [selectedAvatar, setSelectedAvatar] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const supabase = createClient()

  // Load existing user profile
  useEffect(() => {
    async function loadUserProfile() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('users')
          .select('name, avatar_url')
          .eq('id', user.id)
          .single()

        if (error) throw error
        
        if (data) {
          setName(data.name || '')
          setSelectedAvatar(data.avatar_url || '')
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
        setMessage({ type: 'error', text: 'Failed to load profile' })
      } finally {
        setLoading(false)
      }
    }

    loadUserProfile()
  }, [user.id, supabase])

  // Validate email format
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Save user profile
  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    
    // Validate inputs
    if (!name || name.length < 3) {
      setMessage({ type: 'error', text: 'Name must be at least 3 characters long' })
      setSaving(false)
      return
    }

    if (!validateEmail(email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' })
      setSaving(false)
      return
    }
    
    try {
      // Update user profile
      const { error: profileError } = await supabase
        .from('users')
        .update({ 
          name: name,
          avatar_url: selectedAvatar || '👤'
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Update email if changed
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email
        })

        if (emailError) throw emailError

        setMessage({ 
          type: 'success', 
          text: 'Profile updated! Check your new email for verification.' 
        })
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      setMessage({ type: 'error', text: 'Failed to save profile' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded w-1/4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-1">User Profile</h2>
        <p className="text-sm text-gray-600">
          Update your personal information and preferences.
        </p>
      </div>

      {/* Avatar Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Avatar
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {AVATAR_OPTIONS.map((avatar) => (
            <button
              key={avatar}
              onClick={() => setSelectedAvatar(avatar)}
              className={`p-2 text-2xl rounded-lg border-2 transition-all ${
                selectedAvatar === avatar
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              disabled={saving}
            >
              {avatar}
            </button>
          ))}
        </div>
      </div>

      {/* Name Input */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={saving}
        />
        {name.length > 0 && name.length < 3 && (
          <p className="mt-1 text-sm text-red-600">
            Name must be at least 3 characters long
          </p>
        )}
      </div>

      {/* Email Input */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={saving}
        />
        {email && !validateEmail(email) && (
          <p className="mt-1 text-sm text-red-600">
            Please enter a valid email address
          </p>
        )}
        {email !== user.email && (
          <p className="mt-1 text-sm text-gray-600">
            You&apos;ll need to verify your new email address
          </p>
        )}
      </div>

      {/* Save Button and Messages */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={handleSave}
          disabled={saving || !name || name.length < 3 || !validateEmail(email)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        
        {message && (
          <div className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}