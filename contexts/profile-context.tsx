'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UserProfile {
  id: string
  name: string
  avatar_url: string | null
}

interface ProfileContextType {
  profile: UserProfile | null
  loading: boolean
  error: string | null
  refreshProfile: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchInProgress = useRef(false)

  const fetchProfile = async () => {
    if (fetchInProgress.current) return
    fetchInProgress.current = true
    
    try {
      setError(null)
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        throw new Error(`Authentication failed: ${authError.message}`)
      }
      
      if (!user) {
        setProfile(null)
        return
      }
      
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .eq('id', user.id)
        .single()
      
      if (profileError) {
        throw new Error(`Failed to fetch profile: ${profileError.message}`)
      }
      
      if (userProfile) {
        setProfile(userProfile)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      console.error('Error fetching profile:', error)
      setError(errorMessage)
      setProfile(null)
    } finally {
      fetchInProgress.current = false
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()

    const supabase = createClient()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile()
      } else {
        setProfile(null)
        setError(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const refreshProfile = async () => {
    setLoading(true)
    setError(null)
    await fetchProfile()
  }

  return (
    <ProfileContext.Provider value={{ profile, loading, error, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}