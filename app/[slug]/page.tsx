'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { WorkspaceLayout } from '@/components/layout/workspace-layout'
import { WorkspaceContent, WorkspaceContentRef } from '@/components/workspace/workspace-content'

export default function WorkspacePage({ params }: { params: Promise<{ slug: string }> }) {
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

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex h-screen items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (!workspace) return null

  return (
    <AuthenticatedLayout>
      <WorkspaceLayout 
        workspace={workspace} 
        onIssueCreated={handleIssueCreated}
        onNavigateToIssues={handleNavigateToIssues}
      >
        <WorkspaceContent 
          ref={contentRef}
          key={refreshKey} 
          workspace={workspace} 
        />
      </WorkspaceLayout>
    </AuthenticatedLayout>
  )
}