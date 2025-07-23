'use client'

import { useProfile } from '@/contexts/profile-context'
import { Header } from './header'

export function HeaderWrapper() {
  const { profile, loading } = useProfile()

  if (loading) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-background border-b border-border z-50">
        <div className="w-full px-4 md:px-6 lg:px-8">
          <div className="flex items-center h-11">
            <div className="flex items-center flex-1">
              <div className="text-xl font-bold text-foreground">Daygent</div>
            </div>
            <div className="flex items-center flex-1 justify-end">
              <div className="w-11 h-11 md:w-10 md:h-10 rounded-full bg-secondary animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) return null
  
  return <Header initialProfile={profile} />
}