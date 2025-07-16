'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { CreateIssueModal } from '@/components/issues/create-issue-modal'

interface WorkspaceLayoutProps {
  workspace: {
    id: string
    name: string
    slug: string
    avatar_url: string | null
    owner_id: string
  }
  children: React.ReactNode
  onIssueCreated?: () => void
  onNavigateToIssues?: () => void
  onNavigateToInbox?: () => void
  isMobileMenuOpen?: boolean
  setIsMobileMenuOpen?: (open: boolean) => void
}

export function WorkspaceLayout({ 
  workspace, 
  children, 
  onIssueCreated, 
  onNavigateToIssues,
  onNavigateToInbox,
  isMobileMenuOpen: propIsMobileMenuOpen,
  setIsMobileMenuOpen: propSetIsMobileMenuOpen
}: WorkspaceLayoutProps) {
  const [createIssueOpen, setCreateIssueOpen] = useState(false)
  const [localIsMobileMenuOpen, setLocalIsMobileMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const pathname = usePathname()
  
  // Use prop values if provided, otherwise use local state
  const isMobileMenuOpen = propIsMobileMenuOpen !== undefined ? propIsMobileMenuOpen : localIsMobileMenuOpen
  const setIsMobileMenuOpen = propSetIsMobileMenuOpen || setLocalIsMobileMenuOpen

  const handleIssueCreated = () => {
    onIssueCreated?.()
    setCreateIssueOpen(false)
  }

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (isMobileMenuOpen && !target.closest('.mobile-menu') && !target.closest('button[aria-label="Toggle menu"]')) {
        setIsMobileMenuOpen(false)
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
    return undefined
  }, [isMobileMenuOpen])

  const SidebarContent = () => {
    return (
    <div className="flex flex-col h-full">
      {/* Workspace Header */}
      <div className="p-3 md:p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <Link href={`/${workspace.slug}`} className="flex items-center space-x-3">
            <div className="text-2xl">{workspace.avatar_url || '🏢'}</div>
            <span className="font-semibold text-gray-900">{workspace.name}</span>
          </Link>
          <button 
            className="hidden md:flex min-h-[40px] min-w-[40px] p-2 md:p-1 hover:bg-gray-100 rounded items-center justify-center"
            onClick={() => setCreateIssueOpen(true)}
          >
            <Plus className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Navigation - scrollable on mobile */}
      <nav className="flex-1 p-1.5 md:p-2 overflow-y-auto">
        {onNavigateToInbox ? (
          <button
            onClick={onNavigateToInbox}
            className={`w-full flex items-center space-x-2 md:space-x-3 px-3 md:px-3 min-h-[44px] md:min-h-0 md:py-2 rounded-lg transition-colors ${
              pathname === `/${workspace.slug}/inbox` 
                ? 'bg-gray-100 text-gray-900' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <span>Inbox</span>
          </button>
        ) : (
          <Link
            href={`/${workspace.slug}/inbox`}
            className={`flex items-center space-x-2 md:space-x-3 px-3 md:px-3 min-h-[44px] md:min-h-0 md:py-2 rounded-lg transition-colors ${
              pathname === `/${workspace.slug}/inbox` 
                ? 'bg-gray-100 text-gray-900' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <span>Inbox</span>
          </Link>
        )}
        
        {onNavigateToIssues ? (
          <button
            onClick={onNavigateToIssues}
            className={`w-full flex items-center space-x-2 md:space-x-3 px-3 md:px-3 min-h-[44px] md:min-h-0 md:py-2 rounded-lg transition-colors mt-1 ${
              pathname === `/${workspace.slug}` || pathname.startsWith(`/${workspace.slug}/issue/`)
                ? 'bg-gray-100 text-gray-900' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Issues</span>
          </button>
        ) : (
          <Link
            href={`/${workspace.slug}`}
            className={`flex items-center space-x-2 md:space-x-3 px-3 md:px-3 min-h-[44px] md:min-h-0 md:py-2 rounded-lg transition-colors mt-1 ${
              pathname === `/${workspace.slug}` || pathname.startsWith(`/${workspace.slug}/issue/`)
                ? 'bg-gray-100 text-gray-900' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Issues</span>
          </Link>
        )}
      </nav>

      {/* Mobile sticky footer with create issue */}
      <div className="md:hidden border-t border-gray-200 bg-white">
        <button 
          className="w-full min-h-[44px] p-3 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
          onClick={() => setCreateIssueOpen(true)}
        >
          <Plus className="w-5 h-5" />
          <span className="ml-2">Create Issue</span>
        </button>
      </div>
    </div>
    )
  }

  return (
    <>
      <div className="flex h-screen bg-gray-50">
        {/* Desktop Sidebar */}
        <div className={`hidden lg:flex bg-white border-r border-gray-200 flex-col relative transition-all duration-300 ${
          isSidebarCollapsed ? 'w-16' : 'w-[280px]'
        }`}>
          {!isSidebarCollapsed && <SidebarContent />}
          
          {/* Collapse Toggle Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3 top-8 bg-white border border-gray-200 rounded-full p-1 hover:bg-gray-50 shadow-sm z-10"
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            )}
          </button>
          
          {/* Collapsed State Icons */}
          {isSidebarCollapsed && (
            <div className="flex flex-col items-center py-4">
              <Link href={`/${workspace.slug}`} className="p-2 hover:bg-gray-100 rounded mb-4">
                <div className="text-2xl">{workspace.avatar_url || '🏢'}</div>
              </Link>
              <button 
                className="p-2 hover:bg-gray-100 rounded mb-2"
                onClick={() => setCreateIssueOpen(true)}
              >
                <Plus className="w-5 h-5 text-gray-600" />
              </button>
              {onNavigateToInbox ? (
                <button
                  onClick={onNavigateToInbox}
                  className={`p-2 rounded mb-2 transition-colors ${
                    pathname === `/${workspace.slug}/inbox` 
                      ? 'bg-gray-100' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </button>
              ) : (
                <Link
                  href={`/${workspace.slug}/inbox`}
                  className={`p-2 rounded mb-2 transition-colors ${
                    pathname === `/${workspace.slug}/inbox` 
                      ? 'bg-gray-100' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </Link>
              )}
              <Link
                href={`/${workspace.slug}`}
                className={`p-2 rounded transition-colors ${
                  pathname === `/${workspace.slug}` || pathname.startsWith(`/${workspace.slug}/issue/`)
                    ? 'bg-gray-100' 
                    : 'hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" aria-hidden="true" />
            <div className="relative flex max-w-xs w-full bg-white mobile-menu">
              <SidebarContent />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <div className="w-full max-w-[1200px] mx-auto flex flex-col flex-1 p-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col">
              {children}
            </div>
          </div>
        </div>
      </div>


      <CreateIssueModal
        open={createIssueOpen}
        onOpenChange={setCreateIssueOpen}
        workspaceId={workspace.id}
        onIssueCreated={handleIssueCreated}
      />
    </>
  )
}