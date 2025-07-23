'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ProfileSettingsProps {
  onAvatarUpdate?: (newAvatar: string) => void
}

export function ProfileSettings({ onAvatarUpdate }: ProfileSettingsProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarEmoji, setAvatarEmoji] = useState('👤')
  
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Cleanup function to clear timeout on unmount
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setError('Not authenticated')
          return
        }

        // Fetch user profile data
        const { data: profile, error } = await supabase
          .from('users')
          .select('name, avatar_url')
          .eq('id', user.id)
          .maybeSingle()

        if (error) throw error

        setEmail(user.email || '')
        if (profile) {
          setName(profile.name || '')
          setAvatarEmoji(profile.avatar_url || '👤')
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
        setError('Failed to load user data')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [supabase])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validate inputs
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      // Update user profile
      const { error: profileError } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          avatar_url: avatarEmoji
        })
        .eq('id', user.id)

      if (profileError) throw profileError

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

      // Update email if changed
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email
        })

        if (emailError) throw emailError
      }

      // Call the callback to update avatar in header
      if (onAvatarUpdate) {
        onAvatarUpdate(avatarEmoji)
      }

      setSuccess(true)
      // Clear any existing timeout
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current)
      }
      // Set new timeout
      successTimeoutRef.current = setTimeout(() => {
        setSuccess(false)
        successTimeoutRef.current = null
      }, 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      setError(error instanceof Error ? error.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const emojiOptions = ['👤', '😀', '😎', '🤖', '🦄', '🚀', '⭐', '🎯', '💡', '🎨']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Update your personal information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">
                  Profile updated successfully!
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar</Label>
              <div className="flex gap-2 flex-wrap">
                {emojiOptions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setAvatarEmoji(emoji)}
                    className={`w-12 h-12 rounded-full text-2xl flex items-center justify-center transition-all ${
                      avatarEmoji === emoji
                        ? 'bg-primary/10 ring-2 ring-primary'
                        : 'bg-muted hover:bg-accent'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
              {email !== '' && !validateEmail(email) && (
                <p className="text-sm text-destructive">Please enter a valid email address</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}