'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus, ChevronLeft, ChevronRight, HelpCircle, Settings, Terminal, BookOpen } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { UserWorkspace } from '@/lib/supabase/workspaces'
import { subscribeToCreateIssueRequests } from '@/lib/events/issue-events'

const CreateIssueModal = dynamic(
  () => import('@/components/issues/create-issue-modal').then(mod => ({ default: mod.CreateIssueModal })),
  { 
    ssr: false,
    loading: () => null
  }
)
const WorkspaceSwitcher = dynamic(
  () => import('@/components/workspace/workspace-switcher').then(mod => ({ default: mod.WorkspaceSwitcher })),
  { 
    ssr: false,
    loading: () => null
  }
)
import { useCommandPalette } from '@/hooks/use-command-palette'

interface WorkspaceLayoutProps {
  workspace: {
    id: string
    name: string
    slug: string
    avatar_url: string | null
    owner_id: string
  }
  workspaces?: UserWorkspace[]
  children: React.ReactNode
  onIssueCreated?: () => void
  onNavigateToIssues?: () => void
  onNavigateToInbox?: () => void
  onNavigateToCookbook?: () => void
  isMobileMenuOpen?: boolean
  setIsMobileMenuOpen?: (open: boolean) => void
  sidebarRef?: React.RefObject<HTMLDivElement | null>
}

export function WorkspaceLayout({ 
  workspace, 
  workspaces = [],
  children, 
  onIssueCreated, 
  onNavigateToIssues,
  onNavigateToInbox,
  onNavigateToCookbook,
  isMobileMenuOpen: propIsMobileMenuOpen,
  setIsMobileMenuOpen: propSetIsMobileMenuOpen,
  sidebarRef: propSidebarRef
}: WorkspaceLayoutProps) {
  const [createIssueOpen, setCreateIssueOpen] = useState(false)
  const [localIsMobileMenuOpen, setLocalIsMobileMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const pathname = usePathname()
  const { openWithMode } = useCommandPalette()
  const localSidebarRef = useRef<HTMLDivElement>(null)
  const sidebarRef = propSidebarRef || localSidebarRef
  
  // Use prop values if provided, otherwise use local state
  const isMobileMenuOpen = propIsMobileMenuOpen !== undefined ? propIsMobileMenuOpen : localIsMobileMenuOpen
  const setIsMobileMenuOpen = propSetIsMobileMenuOpen || setLocalIsMobileMenuOpen

  const handleIssueCreated = () => {
    onIssueCreated?.()
    setCreateIssueOpen(false)
  }

  // Navigation is now handled by parent component

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

  // Subscribe to create issue requests from command palette
  useEffect(() => {
    const unsubscribe = subscribeToCreateIssueRequests(() => {
      setCreateIssueOpen(true)
    })
    
    return unsubscribe
  }, [])

  const SidebarContent = () => {
    return (
    <div className="flex flex-col h-full">
      {/* Workspace Header */}
      <div className="p-3 md:p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <WorkspaceSwitcher 
            currentWorkspace={workspace} 
            workspaces={workspaces}
            collapsed={false}
          />
          <button 
            className="hidden md:flex min-h-[40px] min-w-[40px] p-2 md:p-1 hover:bg-accent rounded items-center justify-center"
            onClick={() => setCreateIssueOpen(true)}
            data-create-issue-button
          >
            <Plus className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Navigation - scrollable on mobile */}
      <nav ref={sidebarRef} className="flex-1 p-1.5 md:p-2 overflow-y-auto scrollbar-thin">
        {/* Create Issue button - mobile only */}
        <button
          data-sidebar-item
          onClick={() => setCreateIssueOpen(true)}
          className="md:hidden w-full flex items-center space-x-2 px-3 min-h-[44px] rounded-lg transition-colors hover:bg-accent text-foreground mb-1 focus:outline-none"
        >
          <Plus className="w-5 h-5" />
          <span>Create Issue</span>
        </button>
        
        {onNavigateToInbox ? (
          <button
            data-sidebar-item
            onClick={onNavigateToInbox}
            className={`w-full flex items-center space-x-2 md:space-x-3 px-3 md:px-3 min-h-[44px] md:min-h-0 md:py-2 rounded-lg transition-colors focus:outline-none ${
              pathname === `/${workspace.slug}/inbox` 
                ? 'bg-accent text-foreground' 
                : 'hover:bg-accent text-foreground'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <span>Inbox</span>
          </button>
        ) : (
          <Link
            data-sidebar-item
            href={`/${workspace.slug}/inbox`}
            className={`flex items-center space-x-2 md:space-x-3 px-3 md:px-3 min-h-[44px] md:min-h-0 md:py-2 rounded-lg transition-colors focus:outline-none ${
              pathname === `/${workspace.slug}/inbox` 
                ? 'bg-accent text-foreground' 
                : 'hover:bg-accent text-foreground'
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
            data-sidebar-item
            onClick={onNavigateToIssues}
            className={`w-full flex items-center space-x-2 md:space-x-3 px-3 md:px-3 min-h-[44px] md:min-h-0 md:py-2 rounded-lg transition-colors mt-1 focus:outline-none ${
              pathname === `/${workspace.slug}` || pathname.startsWith(`/${workspace.slug}/issue/`)
                ? 'bg-accent text-foreground' 
                : 'hover:bg-accent text-foreground'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Issues</span>
          </button>
        ) : (
          <Link
            data-sidebar-item
            href={`/${workspace.slug}`}
            className={`flex items-center space-x-2 md:space-x-3 px-3 md:px-3 min-h-[44px] md:min-h-0 md:py-2 rounded-lg transition-colors mt-1 focus:outline-none ${
              pathname === `/${workspace.slug}` || pathname.startsWith(`/${workspace.slug}/issue/`)
                ? 'bg-accent text-foreground' 
                : 'hover:bg-accent text-foreground'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Issues</span>
          </Link>
        )}
        
        {/* Cookbook */}
        {onNavigateToCookbook ? (
          <button
            data-sidebar-item
            onClick={onNavigateToCookbook}
            className={`w-full flex items-center space-x-2 md:space-x-3 px-3 md:px-3 min-h-[44px] md:min-h-0 md:py-2 rounded-lg transition-colors mt-1 focus:outline-none ${
              pathname === `/${workspace.slug}/cookbook` 
                ? 'bg-accent text-foreground' 
                : 'hover:bg-accent text-foreground'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span>Cookbook</span>
          </button>
        ) : (
          <Link
            data-sidebar-item
            href={`/${workspace.slug}/cookbook`}
            className={`flex items-center space-x-2 md:space-x-3 px-3 md:px-3 min-h-[44px] md:min-h-0 md:py-2 rounded-lg transition-colors mt-1 focus:outline-none ${
              pathname === `/${workspace.slug}/cookbook` 
                ? 'bg-accent text-foreground' 
                : 'hover:bg-accent text-foreground'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span>Cookbook</span>
          </Link>
        )}
        
        {/* Command Palette */}
        <button
          data-sidebar-item
          onClick={() => openWithMode('normal')}
          className="w-full flex items-center space-x-2 md:space-x-3 px-3 md:px-3 min-h-[44px] md:min-h-0 md:py-2 rounded-lg transition-colors mt-1 focus:outline-none hover:bg-accent text-foreground"
        >
          <Terminal className="w-5 h-5" />
          <span>Commands</span>
        </button>
        
        <Link
          data-sidebar-item
          href={`/${workspace.slug}/settings`}
          className={`flex items-center space-x-2 md:space-x-3 px-3 md:px-3 min-h-[44px] md:min-h-0 md:py-2 rounded-lg transition-colors mt-1 focus:outline-none ${
            pathname === `/${workspace.slug}/settings` 
              ? 'bg-accent text-foreground' 
              : 'hover:bg-accent text-foreground'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </Link>
      </nav>

      {/* Info Icon at Bottom - Hidden on mobile */}
      <div className="hidden md:block p-2 border-t border-border">
        <button
          data-sidebar-item
          onClick={() => openWithMode('help')}
          className="w-full flex items-center justify-center p-2 rounded-lg transition-colors hover:bg-accent focus:outline-none"
          title="Help & Keyboard shortcuts"
        >
          <HelpCircle className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </div>
    )
  }

  return (
    <>
      <div className="flex h-screen bg-background">
        {/* Desktop Sidebar */}
        <div className={`hidden lg:flex bg-sidebar border-r border-border flex-col relative transition-all duration-300 ${
          isSidebarCollapsed ? 'w-16' : 'w-[224px]'
        }`}>
          {!isSidebarCollapsed && <SidebarContent />}
          
          {/* Collapse Toggle Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3 top-8 bg-background border border-border rounded-full p-1 hover:bg-accent shadow-sm z-10"
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          
          {/* Collapsed State Icons */}
          {isSidebarCollapsed && (
            <div className="flex flex-col items-center py-4">
              <div className="mb-4">
                <WorkspaceSwitcher 
                  currentWorkspace={workspace} 
                  workspaces={workspaces}
                  collapsed={true}
                />
              </div>
              <button 
                className="p-2 hover:bg-accent rounded mb-2"
                onClick={() => setCreateIssueOpen(true)}
              >
                <Plus className="w-5 h-5 text-muted-foreground" />
              </button>
              {onNavigateToInbox ? (
                <button
                  onClick={onNavigateToInbox}
                  className={`p-2 rounded mb-2 transition-colors ${
                    pathname === `/${workspace.slug}/inbox` 
                      ? 'bg-accent' 
                      : 'hover:bg-accent'
                  }`}
                >
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </button>
              ) : (
                <Link
                  href={`/${workspace.slug}/inbox`}
                  className={`p-2 rounded mb-2 transition-colors ${
                    pathname === `/${workspace.slug}/inbox` 
                      ? 'bg-accent' 
                      : 'hover:bg-accent'
                  }`}
                >
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </Link>
              )}
              {onNavigateToIssues ? (
                <button
                  onClick={onNavigateToIssues}
                  className={`p-2 rounded mb-2 transition-colors ${
                    pathname === `/${workspace.slug}` || pathname.startsWith(`/${workspace.slug}/issue/`)
                      ? 'bg-accent' 
                      : 'hover:bg-accent'
                  }`}
                >
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              ) : (
                <Link
                  href={`/${workspace.slug}`}
                  className={`p-2 rounded mb-2 transition-colors ${
                    pathname === `/${workspace.slug}` || pathname.startsWith(`/${workspace.slug}/issue/`)
                      ? 'bg-accent' 
                      : 'hover:bg-accent'
                  }`}
                >
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Link>
              )}
              {onNavigateToCookbook ? (
                <button
                  onClick={onNavigateToCookbook}
                  className={`p-2 rounded mb-2 transition-colors ${
                    pathname === `/${workspace.slug}/cookbook` 
                      ? 'bg-accent' 
                      : 'hover:bg-accent'
                  }`}
                  title="Cookbook"
                >
                  <BookOpen className="w-5 h-5 text-muted-foreground" />
                </button>
              ) : (
                <Link
                  href={`/${workspace.slug}/cookbook`}
                  className={`p-2 rounded mb-2 transition-colors ${
                    pathname === `/${workspace.slug}/cookbook` 
                      ? 'bg-accent' 
                      : 'hover:bg-accent'
                  }`}
                  title="Cookbook"
                >
                  <BookOpen className="w-5 h-5 text-muted-foreground" />
                </Link>
              )}
              <button
                onClick={() => openWithMode('normal')}
                className="p-2 rounded mb-2 hover:bg-accent transition-colors"
                title="Commands"
              >
                <Terminal className="w-5 h-5 text-muted-foreground" />
              </button>
              <Link
                href={`/${workspace.slug}/settings`}
                className={`p-2 rounded transition-colors ${
                  pathname === `/${workspace.slug}/settings` 
                    ? 'bg-accent' 
                    : 'hover:bg-accent'
                }`}
                title="Settings"
              >
                <Settings className="w-5 h-5 text-muted-foreground" />
              </Link>
              <button
                onClick={() => openWithMode('help')}
                className="p-2 rounded hover:bg-accent mt-auto"
                title="Help & Keyboard shortcuts"
              >
                <HelpCircle className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div className="fixed inset-0 bg-foreground bg-opacity-75" aria-hidden="true" />
            <div className="relative flex max-w-xs w-full bg-background mobile-menu pt-11">
              <SidebarContent />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {pathname === `/${workspace.slug}/cookbook` ? (
            <div className="flex-1 overflow-auto">
              {children}
            </div>
          ) : (
            <div className="bg-background rounded-lg shadow-sm border border-border flex-1 overflow-auto mx-3 mb-6 mt-3">
              {children}
            </div>
          )}
        </div>
      </div>


      {createIssueOpen && (
        <CreateIssueModal
          open={createIssueOpen}
          onOpenChange={setCreateIssueOpen}
          workspaceId={workspace.id}
          onIssueCreated={handleIssueCreated}
        />
      )}
    </>
  )
}