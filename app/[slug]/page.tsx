'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { WorkspaceWithMobileNav } from '@/components/layout/workspace-with-mobile-nav'
import { WorkspaceContent, WorkspaceContentRef } from '@/components/workspace/workspace-content'
import { IssueCacheProvider } from '@/contexts/issue-cache-context'
import { CommandPaletteProvider } from '@/hooks/use-command-palette'
import dynamic from 'next/dynamic'

const CommandPalette = dynamic(
  () => import('@/components/command-palette/command-palette').then(mod => ({ default: mod.CommandPalette })),
  { 
    ssr: false,
    loading: () => null
  }
)
import { useGlobalShortcuts } from '@/hooks/use-global-shortcuts'

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

      // Fetch workspace data
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('*')
        .eq('slug', resolvedParams.slug)
        .eq('owner_id', user.id)
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

  // Use global shortcuts - must be called before any returns
  useGlobalShortcuts({
    workspaceSlug: workspace?.slug || '',
    onCreateIssue: handleCreateIssue,
    onToggleViewMode: handleToggleViewMode,
  })

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!workspace) return null

  return (
    <>
      <IssueCacheProvider>
        <WorkspaceWithMobileNav 
          workspace={workspace} 
          onIssueCreated={handleIssueCreated}
          onNavigateToIssues={handleNavigateToIssues}
          onNavigateToInbox={handleNavigateToInbox}
        >
          <WorkspaceContent 
            ref={contentRef}
            key={refreshKey} 
            workspace={workspace} 
          />
        </WorkspaceWithMobileNav>
      </IssueCacheProvider>
      {workspace && (
        <CommandPalette 
          workspaceSlug={workspace.slug}
          workspaceId={workspace.id}
          onCreateIssue={handleCreateIssue}
          onToggleViewMode={handleToggleViewMode}
          onToggleSearch={handleToggleSearch}
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