'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import Link from 'next/link'
import { MoreHorizontal, Trash2, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Issue {
  id: string
  title: string
  description: string | null
  type: 'bug' | 'feature' | 'task' | 'epic' | 'spike'
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'shaping' | 'backlog' | 'in_progress' | 'review' | 'done'
  created_at: string
  created_by: string
  assignee_id: string | null
  workspace_id: string
}

interface Workspace {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  owner_id: string
}

const typeIcons = {
  bug: '🐛',
  feature: '✨',
  task: '📋',
  epic: '🎯',
  spike: '🔍'
}

const priorityColors = {
  critical: 'text-red-600 bg-red-50',
  high: 'text-orange-600 bg-orange-50',
  medium: 'text-yellow-600 bg-yellow-50',
  low: 'text-green-600 bg-green-50'
}

const priorityLabels = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
}

export default function IssueDetailsPage({ 
  params 
}: { 
  params: Promise<{ slug: string; issueId: string }> 
}) {
  const router = useRouter()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [issue, setIssue] = useState<Issue | null>(null)
  const [loading, setLoading] = useState(true)
  const [creatorName, setCreatorName] = useState<string>('')

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

      // Fetch issue data
      const { data: issue, error } = await supabase
        .from('issues')
        .select('*')
        .eq('id', resolvedParams.issueId)
        .eq('workspace_id', workspace.id)
        .single()

      if (error || !issue) {
        router.push(`/${resolvedParams.slug}`)
        return
      }

      setIssue(issue)

      // Fetch creator name
      const { data: creator } = await supabase
        .from('users')
        .select('name')
        .eq('id', issue.created_by)
        .single()

      if (creator) {
        setCreatorName(creator.name)
      }

      setLoading(false)
    }

    fetchData()
  }, [params, router])

  const handleDelete = async () => {
    if (!issue || !workspace) return
    
    const confirmed = window.confirm('Are you sure you want to delete this issue?')
    if (!confirmed) return

    const supabase = createClient()
    
    const { error } = await supabase
      .from('issues')
      .delete()
      .eq('id', issue.id)

    if (!error) {
      router.push(`/${workspace.slug}`)
    }
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

  if (!workspace || !issue) {
    return null
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
                <div className="text-2xl">{workspace.avatar_url || '🏢'}</div>
                <span className="font-semibold text-gray-900">{workspace.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-1 hover:bg-gray-100 rounded">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <Plus className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2">
            <Link
              href={`/${workspace.slug}/inbox`}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <span>Inbox</span>
            </Link>
            
            <Link
              href={`/${workspace.slug}/issues`}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 mt-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Issues</span>
            </Link>
          </nav>
        </div>

        {/* Main Content - Issue Details */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">
            {/* Header with back button */}
            <div className="mb-6">
              <Link
                href={`/${workspace.slug}`}
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to issues
              </Link>
            </div>

            {/* Issue Content */}
            <div className="space-y-6">
              {/* Title and Actions */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{typeIcons[issue.type]}</span>
                  <h1 className="text-2xl font-semibold text-gray-900">{issue.title}</h1>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreHorizontal className="w-5 h-5 text-gray-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={handleDelete}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete issue
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Metadata */}
              <div className="flex items-center space-x-4 text-sm">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[issue.priority]}`}>
                  {priorityLabels[issue.priority]}
                </span>
                <span className="text-gray-500">
                  Created by {creatorName} {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
                </span>
                <span className="text-gray-500 capitalize">
                  Status: {issue.status.replace('_', ' ')}
                </span>
              </div>

              {/* Description */}
              <div className="prose max-w-none">
                {issue.description ? (
                  <div className="text-gray-700 whitespace-pre-wrap">{issue.description}</div>
                ) : (
                  <p className="text-gray-500 italic">No description provided</p>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-8"></div>

              {/* Activity Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Activity</h2>
                
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <p className="text-gray-500 text-sm">Activity timeline coming soon...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}