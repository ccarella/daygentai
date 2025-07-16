'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Menu, X, Search } from 'lucide-react'

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
        <div className="flex items-center h-16 relative isolate">
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
          
          {/* Center Section - Search Bar */}
          <div className="flex-1 flex justify-center px-4 min-w-0">
            <div className="w-full max-w-[600px] hidden md:block">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search issues..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                />
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>
          
          {/* Right Section - Mobile Search & Avatar */}
          <div className="flex items-center flex-1 justify-end gap-2">
            {/* Mobile Search Button */}
            <button className="p-2 rounded-md hover:bg-gray-100 md:hidden">
              <Search className="w-5 h-5 text-gray-600" />
            </button>
            
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
                
                <Link
                  href="/success?debug=true"
                  onClick={() => setIsDropdownOpen(false)}
                  className="block px-4 py-3 md:px-4 md:py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Debug
                </Link>
                
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