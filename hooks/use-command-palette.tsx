"use client"

import * as React from "react"

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

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setMode('normal')
        setIsOpen(prev => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

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