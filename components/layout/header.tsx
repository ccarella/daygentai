'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialProfile || null)
  const dropdownRef = useRef<HTMLDivElement>(null)
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
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
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
            <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center justify-center w-11 h-11 md:w-10 md:h-10 rounded-full bg-secondary hover:bg-secondary/80 transition-colors text-xl"
            >
              {userProfile.avatar_url || '👤'}
            </button>
            
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-background rounded-lg shadow-lg border border-border py-1 md:py-1.5">
                <div className="px-3 py-1.5 md:px-4 md:py-2 border-b border-border">
                  <p className="text-sm font-medium text-foreground">{userProfile.name}</p>
                </div>
                
                <button
                  onClick={() => {
                    setIsDropdownOpen(false)
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
                  className="block w-full text-left px-4 py-3 md:px-4 md:py-2 text-sm text-muted-foreground hover:bg-accent"
                >
                  Profile Settings
                </button>
                
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-3 md:px-4 md:py-2 text-sm text-muted-foreground hover:bg-accent"
                >
                  Logout
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}