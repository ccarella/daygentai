'use client'

import { useEffect, useRef } from 'react'
import { KeyboardManager } from './keyboard-manager'
import { KeyboardContext, KeyboardPriority, ShortcutDefinition } from './types'

export type UseKeyboardContextOptions = {
  id: string
  priority?: number
  enabled?: boolean
  shortcuts: Record<string, ShortcutDefinition>
  deps?: React.DependencyList
}

export function useKeyboardContext({
  id,
  priority = KeyboardPriority.GLOBAL,
  enabled = true,
  shortcuts,
  deps = [],
}: UseKeyboardContextOptions): void {
  const registrationRef = useRef<{ unregister: () => void } | null>(null)
  const manager = useRef<KeyboardManager | null>(null)

  useEffect(() => {
    // Get or initialize the keyboard manager
    if (!manager.current) {
      manager.current = KeyboardManager.getInstance()
      // Initialize on first use
      if (typeof window !== 'undefined') {
        manager.current.initialize({
          debug: process.env.NODE_ENV === 'development',
        })
      }
    }

    // Clean up previous registration
    if (registrationRef.current) {
      registrationRef.current.unregister()
    }

    // Register new context
    const context: KeyboardContext = {
      id,
      priority,
      enabled,
      shortcuts,
    }

    registrationRef.current = manager.current.register(context)

    // Cleanup on unmount
    return () => {
      if (registrationRef.current) {
        registrationRef.current.unregister()
        registrationRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, priority, enabled, ...deps])
}

// Helper hook for sequential shortcuts
export function useSequentialShortcut(
  sequence: string,
  handler: () => void,
  options?: {
    enabled?: boolean
    description?: string
    priority?: number
  }
): void {
  useKeyboardContext({
    id: `sequential-${sequence}`,
    priority: options?.priority ?? KeyboardPriority.GLOBAL,
    enabled: options?.enabled ?? true,
    shortcuts: {
      [sequence]: {
        handler: () => {
          handler()
          return true
        },
        ...(options?.description && { description: options.description }),
        preventDefault: true,
        stopPropagation: true,
      },
    },
    deps: [handler],
  })
}

// Helper hook for single key shortcuts
export function useKeyboardShortcut(
  key: string,
  handler: () => void,
  options?: {
    ctrl?: boolean
    cmd?: boolean
    shift?: boolean
    alt?: boolean
    enabled?: boolean
    description?: string
    priority?: number
  }
): void {
  const normalizedKey = [
    options?.ctrl && 'ctrl',
    options?.cmd && 'cmd',
    options?.alt && 'alt',
    options?.shift && 'shift',
    key.toLowerCase(),
  ]
    .filter(Boolean)
    .join('+')

  useKeyboardContext({
    id: `shortcut-${normalizedKey}`,
    priority: options?.priority ?? KeyboardPriority.GLOBAL,
    enabled: options?.enabled ?? true,
    shortcuts: {
      [normalizedKey]: {
        handler: () => {
          handler()
          return true
        },
        ...(options?.description && { description: options.description }),
        preventDefault: true,
        stopPropagation: true,
      },
    },
    deps: [handler],
  })
}