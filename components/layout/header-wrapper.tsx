'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from './header'

export function HeaderWrapper() {
  const [profile, setProfile] = useState<{ name: string; avatar_url: string | null } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }
      
      const { data: profile } = await supabase
        .from('users')
        .select('name, avatar_url')
        .eq('id', user.id)
        .single()
      
      setProfile(profile)
      setLoading(false)
    }

    fetchProfile()
  }, [])

  if (loading) return null
  if (!profile) return null
  
  return <Header initialProfile={profile} />
}