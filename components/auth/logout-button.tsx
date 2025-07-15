'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LogoutButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    setLoading(true)
    
    const { error } = await supabase.auth.signOut()
    
    if (!error) {
      router.push('/')
      router.refresh()
    }
    
    setLoading(false)
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="px-6 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? 'Logging out...' : 'Logout'}
    </button>
  )
}