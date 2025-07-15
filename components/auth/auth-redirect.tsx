'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function AuthRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    const checkAndRedirect = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        // User is authenticated, check their profile and workspace status
        const [profileResult, workspaceResult] = await Promise.all([
          supabase.from('users').select('id').eq('id', session.user.id).single(),
          supabase.from('workspaces').select('slug').eq('owner_id', session.user.id).single()
        ])
        
        if (!profileResult.data) {
          router.push('/CreateUser')
        } else if (!workspaceResult.data) {
          router.push('/CreateWorkspace')
        } else if (workspaceResult.data.slug) {
          router.push(`/${workspaceResult.data.slug}`)
        }
      }
    }
    
    // Check immediately
    checkAndRedirect()
    
    // Also listen for auth state changes (when magic link is processed)
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        checkAndRedirect()
      }
    })
    
    return () => subscription.unsubscribe()
  }, [router])
  
  return null
}