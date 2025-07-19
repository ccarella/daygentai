'use client'

import { useRouter } from 'next/navigation'
import { useCommandPalette } from '@/hooks/use-command-palette'
import { createClient } from '@/lib/supabase/client'
import { emitIssueStatusUpdate } from '@/lib/events/issue-events'
import { useKeyboardContext, KeyboardPriority } from '@/lib/keyboard'
import { useToast } from '@/components/ui/use-toast'

interface GlobalShortcutsProps {
  workspaceSlug: string
  onCreateIssue?: () => void
  onShowHelp?: () => void
  onToggleViewMode?: () => void
  currentIssue?: {
    id: string
    title: string
    status: string
  } | null
  onIssueStatusChange?: (newStatus: string) => void
}

export function useGlobalShortcuts({ 
  workspaceSlug, 
  onCreateIssue, 
  onShowHelp, 
  onToggleViewMode, 
  currentIssue, 
  onIssueStatusChange 
}: GlobalShortcutsProps) {
  const router = useRouter()
  const { setIsOpen: setCommandPaletteOpen } = useCommandPalette()
  const { toast } = useToast()

  const handleStatusChange = async (newStatus: string) => {
    console.log('Attempting status change:', { currentIssue, newStatus })
    if (!currentIssue || !onIssueStatusChange) return
    
    const supabase = createClient()
    
    const { error } = await supabase
      .from('issues')
      .update({ status: newStatus })
      .eq('id', currentIssue.id)

    if (!error) {
      onIssueStatusChange(newStatus)
      console.log('Status changed successfully to:', newStatus)
      emitIssueStatusUpdate(currentIssue.id, newStatus)
      toast({
        title: "Status updated",
        description: `Issue status changed to ${newStatus.toLowerCase().replace('_', ' ')}.`,
      })
    } else {
      console.error('Error changing status:', error)
      toast({
        title: "Failed to update status",
        description: error.message || "An error occurred while updating the issue status.",
        variant: "destructive",
      })
    }
  }

  // Register global keyboard shortcuts
  useKeyboardContext({
    id: 'global-shortcuts',
    priority: KeyboardPriority.GLOBAL,
    enabled: true,
    shortcuts: {
      // Command shortcuts
      'cmd+k': {
        handler: () => {
          // Command palette hook handles this, just prevent default
          return true
        },
        description: 'Open command palette',
      },
      'ctrl+k': {
        handler: () => {
          // Command palette hook handles this, just prevent default
          return true
        },
        description: 'Open command palette',
      },
      'cmd+b': {
        handler: () => {
          onToggleViewMode?.()
          return true
        },
        description: 'Toggle view mode',
      },
      'ctrl+b': {
        handler: () => {
          onToggleViewMode?.()
          return true
        },
        description: 'Toggle view mode',
      },
      'cmd+n': {
        handler: () => {
          setCommandPaletteOpen(true)
          setTimeout(() => {
            const nextIssueButton = document.querySelector('[data-command-id="next-issue"]') as HTMLElement
            if (nextIssueButton) {
              nextIssueButton.click()
            }
          }, 100)
          return true
        },
        description: 'Next issue recommendation',
      },
      'ctrl+n': {
        handler: () => {
          setCommandPaletteOpen(true)
          setTimeout(() => {
            const nextIssueButton = document.querySelector('[data-command-id="next-issue"]') as HTMLElement
            if (nextIssueButton) {
              nextIssueButton.click()
            }
          }, 100)
          return true
        },
        description: 'Next issue recommendation',
      },
      
      // Single key shortcuts
      'shift+?': {
        handler: () => {
          onShowHelp?.()
          return true
        },
        description: 'Show keyboard shortcuts',
      },
      'c': {
        handler: () => {
          onCreateIssue?.()
          return true
        },
        description: 'Create new issue',
      },
      
      // Sequential shortcuts - Navigation
      'gi': {
        handler: () => {
          router.push(`/${workspaceSlug}`)
          return true
        },
        description: 'Go to issues',
      },
      'gn': {
        handler: () => {
          router.push(`/${workspaceSlug}/inbox`)
          return true
        },
        description: 'Go to inbox',
      },
      
      // Sequential shortcuts - Status changes
      'st': {
        handler: () => {
          handleStatusChange('TODO')
          return true
        },
        description: 'Set status to Todo',
      },
      'sp': {
        handler: () => {
          handleStatusChange('IN_PROGRESS')
          return true
        },
        description: 'Set status to In Progress',
      },
      'sr': {
        handler: () => {
          handleStatusChange('IN_REVIEW')
          return true
        },
        description: 'Set status to In Review',
      },
      'sd': {
        handler: () => {
          handleStatusChange('DONE')
          return true
        },
        description: 'Set status to Done',
      },
    },
    deps: [workspaceSlug, onCreateIssue, onShowHelp, onToggleViewMode, currentIssue, onIssueStatusChange],
  })
}