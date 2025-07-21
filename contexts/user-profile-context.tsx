'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  name: string
  avatar_url: string | null
}

interface UserProfileContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined)

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef(false)
  const profileCacheRef = useRef<Map<string, UserProfile>>(new Map())
  
  const supabase = createClient()

  const fetchProfile = useCallback(async (userId: string) => {
    // Check cache first
    const cached = profileCacheRef.current.get(userId)
    if (cached) {
      setProfile(cached)
      return
    }

    // Prevent duplicate fetches
    if (fetchingRef.current) return
    fetchingRef.current = true

    try {
      const { data: profileData, error } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .eq('id', userId)
        .single()
      
      if (!error && profileData) {
        // Cache the profile
        profileCacheRef.current.set(userId, profileData)
        setProfile(profileData)
      }
    } finally {
      fetchingRef.current = false
    }
  }, [supabase])

  const refreshProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Clear cache for this user to force fresh fetch
      profileCacheRef.current.delete(user.id)
      await fetchProfile(user.id)
    }
  }, [supabase, fetchProfile])

  useEffect(() => {
    let mounted = true
    
    const initializeAuth = async () => {
      // Skip if already initializing
      if (fetchingRef.current) return
      
      setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!mounted) return
      
      setUser(user)
      
      if (user) {
        await fetchProfile(user.id)
      }
      
      setLoading(false)
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
        profileCacheRef.current.clear()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile, supabase])

  return (
    <UserProfileContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </UserProfileContext.Provider>
  )
}

export function useUserProfile() {
  const context = useContext(UserProfileContext)
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider')
  }
  return context
}