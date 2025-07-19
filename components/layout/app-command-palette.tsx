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
  getCurrentView?: () => 'list' | 'issue' | 'inbox' | 'cookbook' | 'settings'
}

export function AppCommandPalette({ workspace, onCreateIssue, onToggleViewMode, onToggleSearch, onSetStatusFilter, getCurrentView }: AppCommandPaletteProps) {
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
  }, [pathname])

  const fetchIssue = async (issueId: string) => {
    const supabase = createClient()
    const { data: issue, error } = await supabase
      .from('issues')
      .select('id, title, status')
      .eq('id', issueId)
      .single()
    
    if (issue && !error) {
      console.log('AppCommandPalette - Fetched issue:', issue)
      setCurrentIssue(issue)
    }
  }

  const handleIssueStatusChange = async (newStatus: string) => {
    if (!currentIssue) return
    
    const supabase = createClient()
    const { error } = await supabase
      .from('issues')
      .update({ status: newStatus })
      .eq('id', currentIssue.id)

    if (!error) {
      setCurrentIssue({ ...currentIssue, status: newStatus })
      // Emit event to notify other components
      emitIssueStatusUpdate(currentIssue.id, newStatus)
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
    ...(onToggleSearch && { onToggleSearch })
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
      currentIssue={currentIssue}
      onIssueStatusChange={handleIssueStatusChange}
    />
  )
}