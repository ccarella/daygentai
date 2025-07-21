'use client'

import React from 'react'
import { KeyboardManager } from './keyboard-manager'

export function KeyboardShortcutsHelp() {
  const [shortcuts, setShortcuts] = React.useState<Array<{
    context: string
    priority: number
    shortcuts: Array<{ key: string; description?: string }>
  }>>([])

  React.useEffect(() => {
    const manager = KeyboardManager.getInstance()
    
    // Get all registered contexts
    // Access private property for displaying all shortcuts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contexts = (manager as any).contexts as Map<string, any>
    
    const shortcutsList = Array.from(contexts.values())
      .filter(context => context.enabled)
      .map(context => ({
        context: context.id,
        priority: context.priority,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        shortcuts: Object.entries(context.shortcuts).map(([key, def]: [string, any]) => ({
          key,
          description: def.description,
        })),
      }))
      .sort((a, b) => a.priority - b.priority)
    
    setShortcuts(shortcutsList)
  }, [])

  const formatKey = (key: string): string => {
    return key
      .split('+')
      .map(part => {
        switch (part) {
          case 'cmd': return '⌘'
          case 'ctrl': return 'Ctrl'
          case 'alt': return 'Alt'
          case 'shift': return '⇧'
          case 'escape': return 'Esc'
          default: return part.charAt(0).toUpperCase() + part.slice(1)
        }
      })
      .join(' + ')
  }

  const groupedShortcuts = React.useMemo(() => {
    const groups: Record<string, typeof shortcuts> = {
      'Navigation': [],
      'Actions': [],
      'Status': [],
      'Other': [],
    }
    
    shortcuts.forEach(context => {
      context.shortcuts.forEach(shortcut => {
        let group = 'Other'
        
        if (shortcut.key.startsWith('g')) {
          group = 'Navigation'
        } else if (shortcut.key.startsWith('s')) {
          group = 'Status'
        } else if (['c', 'cmd+k', 'ctrl+k', 'cmd+b', 'ctrl+b', 'cmd+shift+;', 'ctrl+shift+;', 'cmd+n', 'ctrl+n', '/'].includes(shortcut.key)) {
          group = 'Actions'
        }
        
        if (!groups[group]) groups[group] = []
        groups[group]!.push({
          context: context.context,
          priority: context.priority,
          shortcuts: [shortcut],
        })
      })
    })
    
    return groups
  }, [shortcuts])

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Press <kbd className="px-2 py-1 text-xs bg-muted rounded">Ctrl</kbd> + <kbd className="px-2 py-1 text-xs bg-muted rounded">Shift</kbd> + <kbd className="px-2 py-1 text-xs bg-muted rounded">K</kbd> to toggle debug overlay
      </div>
      
      {Object.entries(groupedShortcuts).map(([group, contexts]) => (
        contexts.length > 0 && (
          <div key={group}>
            <h3 className="text-sm font-semibold mb-2">{group}</h3>
            <div className="space-y-1">
              {contexts.flatMap(context => 
                context.shortcuts.map((shortcut, idx) => (
                  <div key={`${context.context}-${shortcut.key}-${idx}`} className="flex items-center justify-between py-1">
                    <span className="text-sm text-muted-foreground">
                      {shortcut.description || shortcut.key}
                    </span>
                    <kbd className="px-2 py-1 text-xs bg-muted rounded font-mono">
                      {formatKey(shortcut.key)}
                    </kbd>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      ))}
    </div>
  )
}