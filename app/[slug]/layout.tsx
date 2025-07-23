'use client'

import { IssueCacheProvider, useIssueCache } from '@/contexts/issue-cache-context'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import { CommandPaletteProvider } from '@/hooks/use-command-palette'
import { createClient } from '@/lib/supabase/client'
import { notFound, useRouter } from 'next/navigation'
import { use, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const AppCommandPalette = dynamic(
  () => import('@/components/layout/app-command-palette').then(mod => ({ default: mod.AppCommandPalette })),
  { 
    ssr: false,
    loading: () => null
  }
)

const CacheStatsIndicator = dynamic(
  () => import('@/components/debug/cache-stats-indicator').then(mod => ({ default: mod.CacheStatsIndicator })),
  { 
    ssr: false,
    loading: () => null
  }
)

interface WorkspaceLayoutProps {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default function WorkspaceLayout({ children, params }: WorkspaceLayoutProps) {
  const router = useRouter()
  const { slug } = use(params)
  const [workspace, setWorkspace] = useState<{
    id: string
    name: string
    slug: string
    avatar_url: string | null
    owner_id: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const supabase = createClient()
        
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/')
          return
        }

        // Fetch workspace data - check if user is a member
        const { data: workspace, error: workspaceError } = await supabase
          .from('workspaces')
          .select(`
            *,
            workspace_members!inner (
              user_id,
              role
            )
          `)
          .eq('slug', slug)
          .eq('workspace_members.user_id', user.id)
          .single()

        if (workspaceError || !workspace) {
          setError('Workspace not found')
          notFound()
          return
        }

        setWorkspace(workspace)
      } catch (err) {
        console.error('Error fetching workspace:', err)
        setError('Failed to load workspace')
      } finally {
        setLoading(false)
      }
    }

    fetchWorkspace()
  }, [slug, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    )
  }

  if (error || !workspace) {
    return null
  }

  return (
    <CommandPaletteProvider>
      <WorkspaceProvider workspaceId={workspace.id} initialWorkspace={workspace}>
        <IssueCacheProvider>
          <WorkspaceLayoutInner workspace={workspace}>
            {children}
          </WorkspaceLayoutInner>
          <AppCommandPalette workspace={workspace} />
          <CacheStatsIndicator />
        </IssueCacheProvider>
      </WorkspaceProvider>
    </CommandPaletteProvider>
  )
}

// Inner component that has access to the cache context
function WorkspaceLayoutInner({ children, workspace }: { children: React.ReactNode, workspace: { id: string } }) {
  const { warmCache } = useIssueCache()
  
  useEffect(() => {
    // Warm the cache with initial issues when workspace loads
    warmCache(workspace.id)
  }, [workspace.id, warmCache])
  
  return (
    <div className="transition-opacity duration-200 ease-in-out animate-in fade-in">
      {children}
    </div>
  )
}