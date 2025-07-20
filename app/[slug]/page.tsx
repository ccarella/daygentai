'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { WorkspaceWithMobileNav } from '@/components/layout/workspace-with-mobile-nav'
import { WorkspaceContent, WorkspaceContentRef } from '@/components/workspace/workspace-content'
import { IssueCacheProvider } from '@/contexts/issue-cache-context'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import { CommandPaletteProvider } from '@/hooks/use-command-palette'
import dynamic from 'next/dynamic'
import { WorkspacePageSkeleton } from '@/components/workspace/workspace-skeleton'

const AppCommandPalette = dynamic(
  () => import('@/components/layout/app-command-palette').then(mod => ({ default: mod.AppCommandPalette })),
  { 
    ssr: false,
    loading: () => null
  }
)

function WorkspacePageContent({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter()
  const contentRef = useRef<WorkspaceContentRef>(null)
  const [workspace, setWorkspace] = useState<{
    id: string
    name: string
    slug: string
    avatar_url: string | null
    owner_id: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const fetchWorkspace = async () => {
      const supabase = createClient()
      const resolvedParams = await params
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/')
        return
      }

      // Fetch workspace data - check if user is a member (owner or otherwise)
      const { data: workspace } = await supabase
        .from('workspaces')
        .select(`
          *,
          workspace_members!inner (
            user_id,
            role
          )
        `)
        .eq('slug', resolvedParams.slug)
        .eq('workspace_members.user_id', user.id)
        .single()

      if (!workspace) {
        router.push('/CreateWorkspace')
        return
      }

      setWorkspace(workspace)
      setLoading(false)
    }

    fetchWorkspace()
  }, [params, router])

  const handleIssueCreated = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleNavigateToIssues = () => {
    contentRef.current?.navigateToIssuesList()
  }

  const handleNavigateToInbox = () => {
    contentRef.current?.navigateToInbox()
  }

  const handleNavigateToCookbook = () => {
    contentRef.current?.navigateToCookbook()
  }

  const handleNavigateToSettings = () => {
    contentRef.current?.navigateToSettings()
  }

  // Handler to trigger create issue modal
  const handleCreateIssue = () => {
    // Find and click the create issue button in the sidebar
    const createButton = document.querySelector('[data-create-issue-button]') as HTMLButtonElement
    if (createButton) {
      createButton.click()
    }
  }

  // Handler to toggle view mode
  const handleToggleViewMode = () => {
    contentRef.current?.toggleViewMode()
  }

  // Handler to toggle search
  const handleToggleSearch = () => {
    contentRef.current?.toggleSearch()
  }

  // Handler to set status filter
  const handleSetStatusFilter = (status: string) => {
    contentRef.current?.setStatusFilter(status)
  }

  // Handler to get current view
  const getCurrentView = () => {
    return contentRef.current?.getCurrentView() || 'list'
  }


  // Global shortcuts are now handled by AppCommandPalette

  if (loading) {
    return <WorkspacePageSkeleton />
  }

  if (!workspace) return null

  return (
    <>
      <WorkspaceProvider workspaceId={workspace.id} initialWorkspace={workspace}>
        <IssueCacheProvider>
          <WorkspaceWithMobileNav 
            workspace={workspace} 
            onIssueCreated={handleIssueCreated}
            onNavigateToIssues={handleNavigateToIssues}
            onNavigateToInbox={handleNavigateToInbox}
            onNavigateToCookbook={handleNavigateToCookbook}
            onNavigateToSettings={handleNavigateToSettings}
          >
            <WorkspaceContent 
              ref={contentRef}
              key={refreshKey} 
              workspace={workspace}
            />
          </WorkspaceWithMobileNav>
        </IssueCacheProvider>
      </WorkspaceProvider>
      {workspace && (
        <AppCommandPalette 
          workspace={workspace}
          onCreateIssue={handleCreateIssue}
          onToggleViewMode={handleToggleViewMode}
          onToggleSearch={handleToggleSearch}
          onSetStatusFilter={handleSetStatusFilter}
          getCurrentView={getCurrentView}
          onNavigateToIssues={handleNavigateToIssues}
          onNavigateToInbox={handleNavigateToInbox}
        />
      )}
    </>
  )
}

export default function WorkspacePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <CommandPaletteProvider>
      <WorkspacePageContent params={params} />
    </CommandPaletteProvider>
  )
}