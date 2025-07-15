'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function AuthDebug() {
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      console.log('[AuthDebug] Current session:', session ? 'Active' : 'None')
      if (session) {
        console.log('[AuthDebug] User ID:', session.user.id)
        console.log('[AuthDebug] User email:', session.user.email)
      }
      
      // Check URL for auth callback
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.has('code')) {
        console.log('[AuthDebug] Auth code detected in URL')
      }
    }
    
    checkAuth()
    
    // Listen for auth changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthDebug] Auth state changed:', event)
      console.log('[AuthDebug] New session:', session ? 'Active' : 'None')
    })
    
    return () => subscription.unsubscribe()
  }, [])
  
  return null
}