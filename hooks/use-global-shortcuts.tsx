'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useCommandPalette } from '@/hooks/use-command-palette'
import { emitIssueStatusUpdate, emitToggleViewMode } from '@/lib/events/issue-events'
import { useKeyboardContext, KeyboardPriority } from '@/lib/keyboard'
import { useToast } from '@/components/ui/use-toast'

interface GlobalShortcutsProps {
  workspaceSlug: string
  onCreateIssue?: () => void
  onShowHelp?: () => void
  onToggleViewMode?: () => void
  onToggleSearch?: () => void
  currentIssue?: {
    id: string
    title: string
    status: string
  } | null
  onIssueStatusChange?: (newStatus: string) => void
  onNavigateToIssues?: () => void
  onNavigateToInbox?: () => void
}

export function useGlobalShortcuts({ 
  workspaceSlug, 
  onCreateIssue, 
  onShowHelp, 
  onToggleViewMode, 
  onToggleSearch,
  currentIssue, 
  onIssueStatusChange,
  onNavigateToIssues,
  onNavigateToInbox 
}: GlobalShortcutsProps) {
  const router = useRouter()
  const nextIssueTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined)
  const isExecutingNextIssue = React.useRef(false)
  const { setIsOpen: setCommandPaletteOpen } = useCommandPalette()
  const { toast } = useToast()

  const handleStatusChange = async (newStatus: string) => {
    // Attempting status change
    if (!currentIssue || !onIssueStatusChange) return
    
    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/issues/${currentIssue.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update status')
      }

      onIssueStatusChange(newStatus)
      // Status changed successfully
      emitIssueStatusUpdate(currentIssue.id, newStatus)
      toast({
        title: "Status updated",
        description: `Issue status changed to ${newStatus.toLowerCase().replace('_', ' ')}.`,
      })
    } catch (error) {
      console.error('Error changing status:', error)
      toast({
        title: "Failed to update status",
        description: error instanceof Error ? error.message : "An error occurred while updating the issue status.",
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
          emitToggleViewMode()
          return true
        },
        description: 'Toggle view mode',
      },
      'ctrl+b': {
        handler: () => {
          emitToggleViewMode()
          return true
        },
        description: 'Toggle view mode',
      },
      'cmd+n': {
        handler: () => {
          // Prevent multiple simultaneous executions
          if (isExecutingNextIssue.current) {
            return true
          }
          
          // Clear any existing timeout
          if (nextIssueTimeoutRef.current) {
            clearTimeout(nextIssueTimeoutRef.current)
          }
          
          isExecutingNextIssue.current = true
          setCommandPaletteOpen(true)
          
          nextIssueTimeoutRef.current = setTimeout(() => {
            const nextIssueButton = document.querySelector('[data-command-id="next-issue"]') as HTMLElement
            if (nextIssueButton) {
              nextIssueButton.click()
            }
            isExecutingNextIssue.current = false
            nextIssueTimeoutRef.current = undefined
          }, 100)
          return true
        },
        description: 'Next issue recommendation',
      },
      'ctrl+n': {
        handler: () => {
          // Prevent multiple simultaneous executions
          if (isExecutingNextIssue.current) {
            return true
          }
          
          // Clear any existing timeout
          if (nextIssueTimeoutRef.current) {
            clearTimeout(nextIssueTimeoutRef.current)
          }
          
          isExecutingNextIssue.current = true
          setCommandPaletteOpen(true)
          
          nextIssueTimeoutRef.current = setTimeout(() => {
            const nextIssueButton = document.querySelector('[data-command-id="next-issue"]') as HTMLElement
            if (nextIssueButton) {
              nextIssueButton.click()
            }
            isExecutingNextIssue.current = false
            nextIssueTimeoutRef.current = undefined
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
      '/': {
        handler: () => {
          onToggleSearch?.()
          return true
        },
        description: 'Toggle search bar',
      },
      
      // Sequential shortcuts - Navigation
      'gi': {
        handler: () => {
          if (onNavigateToIssues) {
            onNavigateToIssues()
          } else {
            router.push(`/${workspaceSlug}`)
          }
          return true
        },
        description: 'Go to all issues',
      },
      'gs': {
        handler: () => {
          router.push(`/${workspaceSlug}/sprint-board`)
          return true
        },
        description: 'Go to sprint board',
      },
      'gd': {
        handler: () => {
          router.push(`/${workspaceSlug}/design`)
          return true
        },
        description: 'Go to design',
      },
      'gp': {
        handler: () => {
          router.push(`/${workspaceSlug}/product`)
          return true
        },
        description: 'Go to product',
      },
      'gr': {
        handler: () => {
          router.push(`/${workspaceSlug}/cookbook`)
          return true
        },
        description: 'Go to recipes',
      },
      /* Go to inbox shortcut - hidden for now but preserved for future use
      'gn': {
        handler: () => {
          if (onNavigateToInbox) {
            onNavigateToInbox()
          } else {
            router.push(`/${workspaceSlug}/inbox`)
          }
          return true
        },
        description: 'Go to inbox',
      },
      */
      
      // Sequential shortcuts - Status changes
      'st': {
        handler: () => {
          handleStatusChange('todo')
          return true
        },
        description: 'Set status to Todo',
      },
      'sp': {
        handler: () => {
          handleStatusChange('in_progress')
          return true
        },
        description: 'Set status to In Progress',
      },
      'sr': {
        handler: () => {
          handleStatusChange('in_review')
          return true
        },
        description: 'Set status to In Review',
      },
      'sd': {
        handler: () => {
          handleStatusChange('done')
          return true
        },
        description: 'Set status to Done',
      },
    },
    deps: [workspaceSlug, onCreateIssue, onShowHelp, onToggleViewMode, onToggleSearch, currentIssue, onIssueStatusChange, onNavigateToIssues, onNavigateToInbox],
  })
  
  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (nextIssueTimeoutRef.current) {
        clearTimeout(nextIssueTimeoutRef.current)
      }
    }
  }, [])
}