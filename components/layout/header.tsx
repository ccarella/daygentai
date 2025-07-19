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
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
      <div className="w-full px-4 md:px-6 lg:px-8">
        <div className="flex items-center h-11 relative isolate">
          {/* Left Section - Logo */}
          <div className="flex items-center flex-1">
            {onMenuToggle && (
              <button
                onClick={onMenuToggle}
                className="mr-2 md:mr-4 p-1.5 md:p-2 rounded-md hover:bg-gray-100 lg:hidden"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6 text-gray-600" />
                ) : (
                  <Menu className="h-6 w-6 text-gray-600" />
                )}
              </button>
            )}
            <Link href="/daygent" className="text-xl font-bold text-gray-900">
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
              className="flex items-center justify-center w-11 h-11 md:w-10 md:h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-xl"
            >
              {userProfile.avatar_url || '👤'}
            </button>
            
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 md:py-1.5">
                <div className="px-3 py-1.5 md:px-4 md:py-2 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{userProfile.name}</p>
                </div>
                
                <button
                  onClick={() => {
                    setIsDropdownOpen(false)
                    // Click the settings button in the sidebar after a small delay to ensure dropdown closes
                    setTimeout(() => {
                      const settingsButtons = document.querySelectorAll('[data-sidebar-item]')
                      settingsButtons.forEach(button => {
                        const span = button.querySelector('span')
                        if (span && span.textContent === 'Settings') {
                          (button as HTMLElement).click()
                        }
                      })
                    }, 100)
                  }}
                  className="block w-full text-left px-4 py-3 md:px-4 md:py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Profile Settings
                </button>
                
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-3 md:px-4 md:py-2 text-sm text-gray-700 hover:bg-gray-100"
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