"use client"

import * as React from "react"
import { useKeyboardContext, KeyboardPriority } from '@/lib/keyboard'

interface CommandPaletteContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  mode: 'normal' | 'help'
  setMode: (mode: 'normal' | 'help') => void
  openWithMode: (mode: 'normal' | 'help') => void
}

const CommandPaletteContext = React.createContext<CommandPaletteContextType | undefined>(undefined)

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [mode, setMode] = React.useState<'normal' | 'help'>('normal')

  const openWithMode = React.useCallback((newMode: 'normal' | 'help') => {
    setMode(newMode)
    setIsOpen(true)
  }, [])

  // Register keyboard shortcut for command palette
  useKeyboardContext({
    id: 'command-palette-toggle',
    priority: KeyboardPriority.MODAL, // High priority since it's a modal
    enabled: true,
    shortcuts: {
      'cmd+k': {
        handler: () => {
          setMode('normal')
          setIsOpen(prev => !prev)
          return true
        },
        description: 'Toggle command palette',
      },
      'ctrl+k': {
        handler: () => {
          setMode('normal')
          setIsOpen(prev => !prev)
          return true
        },
        description: 'Toggle command palette',
      },
    },
    deps: [],
  })

  // Reset mode to normal when closing
  React.useEffect(() => {
    if (!isOpen) {
      setMode('normal')
    }
  }, [isOpen])

  return (
    <CommandPaletteContext.Provider value={{ isOpen, setIsOpen, mode, setMode, openWithMode }}>
      {children}
    </CommandPaletteContext.Provider>
  )
}

export function useCommandPalette() {
  const context = React.useContext(CommandPaletteContext)
  if (!context) {
    throw new Error("useCommandPalette must be used within a CommandPaletteProvider")
  }
  return context
}