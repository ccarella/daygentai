"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useCommandPalette } from "./use-command-palette"
import { createClient } from "@/lib/supabase/client"
import { emitIssueStatusUpdate } from "@/lib/events/issue-events"

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

export function useGlobalShortcuts({ workspaceSlug, onCreateIssue, onShowHelp, onToggleViewMode, currentIssue, onIssueStatusChange }: GlobalShortcutsProps) {
  const router = useRouter()
  const { setIsOpen: setCommandPaletteOpen } = useCommandPalette()
  const [keySequence, setKeySequence] = React.useState<string[]>([])
  const sequenceTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined)

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
      // Emit event for other components
      emitIssueStatusUpdate(currentIssue.id, newStatus)
    } else {
      console.error('Error changing status:', error)
    }
  }

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true" ||
        target.closest('[role="dialog"]') // Ignore if a dialog is open
      ) {
        return
      }

      // Handle Cmd/Ctrl + K (already handled by command palette hook, but prevent default)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        return
      }

      // Handle Cmd/Ctrl + B for toggling view mode
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault()
        onToggleViewMode?.()
        return
      }

      // Handle Cmd/Ctrl + N for Next Issue recommendation
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault()
        // Trigger command palette with Next Issue command
        setCommandPaletteOpen(true)
        // After a small delay, trigger the Next Issue command
        setTimeout(() => {
          const nextIssueButton = document.querySelector('[data-command-id="next-issue"]') as HTMLElement
          if (nextIssueButton) {
            nextIssueButton.click()
          }
        }, 100)
        return
      }

      // Forward slash is now handled by search bar in workspace-content.tsx
      // Commented out to allow search bar toggle functionality
      // if (e.key === "/") {
      //   e.preventDefault()
      //   setCommandPaletteOpen(true)
      //   return
      // }

      // Handle question mark for help
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault()
        onShowHelp?.()
        return
      }

      // Handle single key shortcuts
      const key = e.key.toLowerCase()

      // Check for sequential shortcuts
      if (keySequence.length > 0) {
        const sequence = [...keySequence, key].join("")
        console.log('Key sequence detected:', sequence)
        
        // G then I - Go to Issues
        if (sequence === "gi") {
          e.preventDefault()
          router.push(`/${workspaceSlug}`)
          setKeySequence([])
          return
        }
        
        // G then N - Go to Inbox
        if (sequence === "gn") {
          e.preventDefault()
          router.push(`/${workspaceSlug}/inbox`)
          setKeySequence([])
          return
        }

        // Status change shortcuts (only on issue details page)
        if (currentIssue && onIssueStatusChange) {
          // S then T - Change to Todo
          if (sequence === "st") {
            e.preventDefault()
            handleStatusChange("todo")
            setKeySequence([])
            return
          }
          
          // S then P - Change to In Progress
          if (sequence === "sp") {
            e.preventDefault()
            handleStatusChange("in_progress")
            setKeySequence([])
            return
          }
          
          // S then R - Change to In Review
          if (sequence === "sr") {
            e.preventDefault()
            handleStatusChange("in_review")
            setKeySequence([])
            return
          }
          
          // S then D - Change to Done
          if (sequence === "sd") {
            e.preventDefault()
            handleStatusChange("done")
            setKeySequence([])
            return
          }
        }

        // Clear sequence if no match
        setKeySequence([])
        clearTimeout(sequenceTimeoutRef.current)
      }

      // Start a sequence with G or S
      if (key === "g" || (key === "s" && currentIssue)) {
        e.preventDefault()
        setKeySequence([key])
        
        // Clear sequence after 1 second if no follow-up
        clearTimeout(sequenceTimeoutRef.current)
        sequenceTimeoutRef.current = setTimeout(() => {
          setKeySequence([])
        }, 1000)
        return
      }

      // Single key shortcuts (only if no modifier keys are pressed)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        switch (key) {
          case "c":
            e.preventDefault()
            onCreateIssue?.()
            break
          case "f":
            e.preventDefault()
            // TODO: Implement filter
            console.log("Filter shortcut pressed")
            break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      clearTimeout(sequenceTimeoutRef.current)
    }
  }, [workspaceSlug, router, onCreateIssue, onShowHelp, onToggleViewMode, setCommandPaletteOpen, keySequence, currentIssue, handleStatusChange])

  return { keySequence }
}