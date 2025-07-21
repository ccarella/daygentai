'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Menu, X, Settings, LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface UserProfile {
  name: string
  avatar_url: string | null
}

interface HeaderProps {
  initialProfile?: UserProfile
  onMenuToggle?: () => void
  isMobileMenuOpen?: boolean
}

export function Header({ initialProfile, onMenuToggle, isMobileMenuOpen }: HeaderProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialProfile || null)
  const settingsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const fetchUserProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('name, avatar_url')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        setUserProfile(profile)
      }
    }
  }, [supabase])

  useEffect(() => {
    if (!initialProfile) {
      fetchUserProfile()
    }
  }, [initialProfile, fetchUserProfile])

  useEffect(() => {
    return () => {
      // Clear timeout on unmount
      if (settingsTimeoutRef.current) {
        clearTimeout(settingsTimeoutRef.current)
      }
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!userProfile) {
    return null
  }

  return (
    <header className="fixed top-0 left-0 right-0 bg-background border-b border-border z-50">
      <div className="w-full px-4 md:px-6 lg:px-8">
        <div className="flex items-center h-11 relative isolate">
          {/* Left Section - Logo */}
          <div className="flex items-center flex-1">
            {onMenuToggle && (
              <button
                onClick={onMenuToggle}
                className="mr-2 md:mr-4 p-1.5 md:p-2 rounded-md hover:bg-accent lg:hidden"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <Menu className="h-6 w-6 text-muted-foreground" />
                )}
              </button>
            )}
            <Link href="/daygent" className="text-xl font-bold text-foreground">
              Daygent
            </Link>
          </div>
          
          {/* Center Section - Spacer for balanced layout */}
          <div className="flex-1 hidden md:block"></div>
          
          {/* Right Section - Avatar */}
          <div className="flex items-center flex-1 justify-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center justify-center w-11 h-11 md:w-10 md:h-10 rounded-full bg-secondary hover:bg-secondary/80 transition-colors text-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {userProfile.avatar_url || '👤'}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="font-medium">
                  {userProfile.name}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    // Clear any existing timeout
                    if (settingsTimeoutRef.current) {
                      clearTimeout(settingsTimeoutRef.current)
                    }
                    // Click the settings button in the sidebar after a small delay to ensure dropdown closes
                    settingsTimeoutRef.current = setTimeout(() => {
                      const settingsButtons = document.querySelectorAll('[data-sidebar-item]')
                      settingsButtons.forEach(button => {
                        const span = button.querySelector('span')
                        if (span && span.textContent === 'Settings') {
                          (button as HTMLElement).click()
                        }
                      })
                      settingsTimeoutRef.current = null
                    }, 100)
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}