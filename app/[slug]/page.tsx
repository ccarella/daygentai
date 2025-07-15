'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import Link from 'next/link'
import { CreateIssueModal } from '@/components/issues/create-issue-modal'
import { IssuesList } from '@/components/issues/issues-list'
import { Plus } from 'lucide-react'

export default function WorkspacePage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter()
  const [workspace, setWorkspace] = useState<{
    id: string
    name: string
    slug: string
    avatar_url: string | null
    owner_id: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [createIssueOpen, setCreateIssueOpen] = useState(false)
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

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex h-screen items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="flex h-screen bg-white">
        {/* Left Sidebar */}
        <div className="w-64 border-r border-gray-200 flex flex-col">
          {/* Workspace Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{workspace?.avatar_url || '🏢'}</div>
                <span className="font-semibold text-gray-900">{workspace?.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-1 hover:bg-gray-100 rounded">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <button 
                  className="p-1 hover:bg-gray-100 rounded"
                  onClick={() => setCreateIssueOpen(true)}
                >
                  <Plus className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2">
            <Link
              href={`/${workspace?.slug}/inbox`}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <span>Inbox</span>
            </Link>
            
            <Link
              href={`/${workspace?.slug}/issues`}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 mt-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Issues</span>
            </Link>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by describing your issue..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Issues List */}
          <IssuesList key={refreshKey} workspaceId={workspace?.id || ''} workspaceSlug={workspace?.slug || ''} />
        </div>
      </div>

      <CreateIssueModal
        open={createIssueOpen}
        onOpenChange={setCreateIssueOpen}
        workspaceId={workspace?.id || ''}
        onIssueCreated={() => {
          setRefreshKey(prev => prev + 1)
        }}
      />
    </AuthenticatedLayout>
  )
}