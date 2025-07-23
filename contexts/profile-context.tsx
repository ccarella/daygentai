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

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchInProgress = useRef(false)
  const lastFetchTime = useRef<number>(0)
  const cachedUserId = useRef<string | null>(null)

  const fetchProfile = async (force = false) => {
    if (fetchInProgress.current) return
    
    const now = Date.now()
    const isCacheValid = profile && 
                        cachedUserId.current === profile.id && 
                        !force && 
                        (now - lastFetchTime.current) < CACHE_DURATION
    
    if (isCacheValid) {
      setLoading(false)
      return
    }
    
    fetchInProgress.current = true
    
    try {
      setError(null)
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        // User is not authenticated, which is fine for public pages
        setProfile(null)
        return
      }
      
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()
      
      if (profileError) {
        throw new Error(`Failed to fetch profile: ${profileError.message}`)
      }
      
      if (userProfile) {
        setProfile(userProfile)
        cachedUserId.current = user.id
        lastFetchTime.current = Date.now()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      console.error('Error fetching profile:', error)
      setError(errorMessage)
      setProfile(null)
      cachedUserId.current = null
    } finally {
      fetchInProgress.current = false
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()

    const supabase = createClient()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Force refresh on sign in or user update events
        const shouldForceRefresh = event === 'SIGNED_IN' || event === 'USER_UPDATED'
        fetchProfile(shouldForceRefresh)
      } else {
        setProfile(null)
        setError(null)
        setLoading(false)
        cachedUserId.current = null
        lastFetchTime.current = 0
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const refreshProfile = async () => {
    setLoading(true)
    setError(null)
    await fetchProfile(true) // Force refresh, bypass cache
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