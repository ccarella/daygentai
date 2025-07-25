'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CommandPalette } from '@/components/command-palette/command-palette'
import { useGlobalShortcuts } from '@/hooks/use-global-shortcuts'
import { useCommandPalette } from '@/hooks/use-command-palette'
import { emitIssueStatusUpdate } from '@/lib/events/issue-events'

interface AppCommandPaletteProps {
  workspace: {
    id: string
    slug: string
  }
  onCreateIssue?: () => void
  onToggleViewMode?: () => void
  onToggleSearch?: () => void
  onSetStatusFilter?: (status: string) => void
  getCurrentView?: () => 'list' | 'issue' | 'inbox' | 'cookbook' | 'recipe' | 'settings'
  onNavigateToIssues?: () => void
  onNavigateToInbox?: () => void
}

export function AppCommandPalette({ workspace, onCreateIssue, onToggleViewMode, onToggleSearch, onSetStatusFilter, getCurrentView, onNavigateToIssues, onNavigateToInbox }: AppCommandPaletteProps) {
  const pathname = usePathname()
  const { openWithMode } = useCommandPalette()
  const [currentIssue, setCurrentIssue] = useState<{
    id: string
    title: string
    status: string
  } | null>(null)

  // Check if we're on an issue page and extract the issue ID
  useEffect(() => {
    const issueMatch = pathname.match(/\/issue\/([a-f0-9-]+)$/)
    if (issueMatch && issueMatch[1]) {
      const issueId = issueMatch[1]
      fetchIssue(issueId)
    } else {
      setCurrentIssue(null)
    }
  }, [pathname, workspace.id])

  const fetchIssue = async (issueId: string) => {
    const supabase = createClient()
    const { data: issue, error } = await supabase
      .from('issues')
      .select('id, title, status, workspace_id')
      .eq('id', issueId)
      .eq('workspace_id', workspace.id)
      .single()
    
    if (issue && !error) {
      // Fetched issue - validated to belong to current workspace
      setCurrentIssue({
        id: issue.id,
        title: issue.title,
        status: issue.status
      })
    } else {
      // Issue not found or doesn't belong to workspace
      setCurrentIssue(null)
    }
  }

  const handleIssueStatusChange = async (newStatus: string) => {
    if (!currentIssue) return
    
    try {
      const response = await fetch(`/api/workspaces/${workspace.slug}/issues/${currentIssue.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        console.error('Failed to update issue status')
        return
      }

      setCurrentIssue({ ...currentIssue, status: newStatus })
      // Emit event to notify other components
      emitIssueStatusUpdate(currentIssue.id, newStatus)
    } catch (error) {
      console.error('Error updating issue status:', error)
    }
  }

  // Handler for showing help modal
  const handleShowHelp = () => {
    openWithMode('help')
  }

  // Use global shortcuts for issue status changes
  useGlobalShortcuts({
    workspaceSlug: workspace.slug,
    currentIssue,
    onIssueStatusChange: handleIssueStatusChange,
    onShowHelp: handleShowHelp,
    ...(onCreateIssue && { onCreateIssue }),
    ...(onToggleViewMode && { onToggleViewMode }),
    ...(onToggleSearch && { onToggleSearch }),
    ...(onNavigateToIssues && { onNavigateToIssues }),
    ...(onNavigateToInbox && { onNavigateToInbox })
  })

  return (
    <CommandPalette
      workspaceSlug={workspace.slug}
      workspaceId={workspace.id}
      {...(onCreateIssue && { onCreateIssue })}
      {...(onToggleViewMode && { onToggleViewMode })}
      {...(onToggleSearch && { onToggleSearch })}
      {...(onSetStatusFilter && { onSetStatusFilter })}
      {...(getCurrentView && { getCurrentView })}
      {...(onNavigateToIssues && { onNavigateToIssues })}
      {...(onNavigateToInbox && { onNavigateToInbox })}
      currentIssue={currentIssue}
      onIssueStatusChange={handleIssueStatusChange}
    />
  )
}