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
  refreshProfile: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchInProgress = useRef(false)

  const fetchProfile = async () => {
    if (fetchInProgress.current) return
    fetchInProgress.current = true
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setProfile(null)
        return
      }
      
      const { data: userProfile } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .eq('id', user.id)
        .single()
      
      if (userProfile) {
        setProfile(userProfile)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
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
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const refreshProfile = async () => {
    setLoading(true)
    await fetchProfile()
  }

  return (
    <ProfileContext.Provider value={{ profile, loading, refreshProfile }}>
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