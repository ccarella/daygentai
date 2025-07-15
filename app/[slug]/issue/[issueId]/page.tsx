'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { WorkspaceLayout } from '@/components/layout/workspace-layout'
import { WorkspaceContent } from '@/components/workspace/workspace-content'

export default function IssueDetailsPage({ 
  params 
}: { 
  params: Promise<{ slug: string; issueId: string }> 
}) {
  const router = useRouter()
  const [workspace, setWorkspace] = useState<{
    id: string
    name: string
    slug: string
    avatar_url: string | null
    owner_id: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [issueId, setIssueId] = useState<string>('')

  useEffect(() => {
    const fetchData = async () => {
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
      setIssueId(resolvedParams.issueId)
      setLoading(false)
    }

    fetchData()
  }, [params, router])

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
      <WorkspaceLayout workspace={workspace}>
        <WorkspaceContent 
          workspace={workspace} 
          initialView="issue" 
          initialIssueId={issueId}
        />
      </WorkspaceLayout>
    </AuthenticatedLayout>
  )
}