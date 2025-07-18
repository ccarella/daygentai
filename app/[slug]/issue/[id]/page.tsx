'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { WorkspaceWithMobileNav } from '@/components/layout/workspace-with-mobile-nav'
import { IssueDetails } from '@/components/issues/issue-details'
import { IssueCacheProvider } from '@/contexts/issue-cache-context'
import { CommandPaletteProvider } from '@/hooks/use-command-palette'
import dynamic from 'next/dynamic'

const AppCommandPalette = dynamic(
  () => import('@/components/layout/app-command-palette').then(mod => ({ default: mod.AppCommandPalette })),
  { 
    ssr: false,
    loading: () => null
  }
)

export default function IssuePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const router = useRouter()
  const { slug, id } = use(params)
  const [workspace, setWorkspace] = useState<{
    id: string
    name: string
    slug: string
    avatar_url: string | null
    owner_id: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    console.log('IssuePage effect running for issue:', id)
    const fetchWorkspace = async () => {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/')
        return
      }

      // Fetch workspace data
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('*')
        .eq('slug', slug)
        .single()

      if (!workspace) {
        router.push('/')
        return
      }

      setWorkspace(workspace)
      setLoading(false)
    }

    fetchWorkspace()
  }, [slug, id, router])
  
  const handleBack = () => {
    router.push(`/${slug}`)
  }
  
  const handleDeleted = () => {
    router.push(`/${slug}`)
  }

  if (loading || !workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }
  
  return (
    <CommandPaletteProvider>
      <IssueCacheProvider>
        <WorkspaceWithMobileNav workspace={workspace}>
          <div className="flex-1 overflow-y-auto">
            <div className="container mx-auto max-w-6xl p-6">
              <IssueDetails 
                issueId={id}
                onBack={handleBack}
                onDeleted={handleDeleted}
              />
            </div>
          </div>
        </WorkspaceWithMobileNav>
      </IssueCacheProvider>
      {workspace && (
        <AppCommandPalette 
          workspace={workspace}
        />
      )}
    </CommandPaletteProvider>
  )
}