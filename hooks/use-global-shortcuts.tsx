"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useCommandPalette } from "./use-command-palette"

interface GlobalShortcutsProps {
  workspaceSlug: string
  onCreateIssue?: () => void
  onShowHelp?: () => void
  onToggleViewMode?: () => void
}

export function useGlobalShortcuts({ workspaceSlug, onCreateIssue, onShowHelp, onToggleViewMode }: GlobalShortcutsProps) {
  const router = useRouter()
  const { setIsOpen: setCommandPaletteOpen } = useCommandPalette()
  const [keySequence, setKeySequence] = React.useState<string[]>([])
  const sequenceTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined)

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

        // Clear sequence if no match
        setKeySequence([])
        clearTimeout(sequenceTimeoutRef.current)
      }

      // Start a sequence with G
      if (key === "g") {
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
  }, [workspaceSlug, router, onCreateIssue, onShowHelp, onToggleViewMode, setCommandPaletteOpen, keySequence])

  return { keySequence }
}