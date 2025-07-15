'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus } from 'lucide-react'
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
}

export function WorkspaceLayout({ workspace, children, onIssueCreated, onNavigateToIssues }: WorkspaceLayoutProps) {
  const [createIssueOpen, setCreateIssueOpen] = useState(false)
  const pathname = usePathname()

  const handleIssueCreated = () => {
    onIssueCreated?.()
    setCreateIssueOpen(false)
  }

  return (
    <>
      <div className="flex h-screen bg-white">
        {/* Left Sidebar */}
        <div className="w-64 border-r border-gray-200 flex flex-col">
          {/* Workspace Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <Link href={`/${workspace.slug}`} className="flex items-center space-x-3">
                <div className="text-2xl">{workspace.avatar_url || '🏢'}</div>
                <span className="font-semibold text-gray-900">{workspace.name}</span>
              </Link>
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
              href={`/${workspace.slug}/inbox`}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
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
            
            {onNavigateToIssues ? (
              <button
                onClick={onNavigateToIssues}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors mt-1 ${
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
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors mt-1 ${
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
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {children}
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