# Keyboard Manager Migration Guide

This guide explains how to migrate from direct event listeners to the new centralized keyboard management system.

## Benefits of Migration

- **Conflict Prevention**: Automatic detection and resolution of keyboard shortcut conflicts
- **Better Performance**: Single global event listener instead of multiple listeners
- **Debug Mode**: Visual overlay showing all active shortcuts (Ctrl+Shift+K)
- **Priority System**: Clear hierarchy for handling shortcuts in different contexts
- **Consistent Behavior**: Standardized input field detection and event handling

## Migration Steps

### 1. Remove Direct Event Listeners

**Before:**
```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === '/') {
      e.preventDefault()
      // handle shortcut
    }
  }
  
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [])
```

**After:**
```tsx
import { useKeyboardContext, KeyboardPriority } from '@/lib/keyboard'

useKeyboardContext({
  id: 'my-component',
  priority: KeyboardPriority.FOCUSED,
  enabled: true,
  shortcuts: {
    '/': {
      handler: () => {
        // handle shortcut
        return true // Return true to stop propagation
      },
      description: 'Open search',
    },
  },
})
```

### 2. Use Priority Levels

```typescript
enum KeyboardPriority {
  MODAL = 1,        // Modals, dialogs, overlays
  FOCUSED = 2,      // Component-specific when focused
  NAVIGATION = 3,   // Navigation between areas
  GLOBAL = 4,       // Global app shortcuts
  DEFAULT = 5       // Default browser behavior
}
```

### 3. Handle Sequential Shortcuts

**Before:**
```tsx
const [keySequence, setKeySequence] = useState<string[]>([])
// Complex sequential handling logic...
```

**After:**
```tsx
useKeyboardContext({
  id: 'navigation',
  shortcuts: {
    'gi': {
      handler: () => router.push('/issues'),
      description: 'Go to issues',
    },
    'gn': {
      handler: () => router.push('/inbox'),
      description: 'Go to inbox',
    },
  },
})
```

### 4. Use Helper Hooks

For simple shortcuts:
```tsx
import { useKeyboardShortcut } from '@/lib/keyboard'

useKeyboardShortcut('s', handleSave, {
  cmd: true,
  description: 'Save changes',
})
```

For sequential shortcuts:
```tsx
import { useSequentialShortcut } from '@/lib/keyboard'

useSequentialShortcut('gi', () => router.push('/issues'), {
  description: 'Go to issues',
})
```

## Complete Example

Here's a complete migration example:

**Before:**
```tsx
export function MyComponent() {
  const [isOpen, setIsOpen] = useState(false)
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if in input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }
      
      // Handle Cmd+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
      
      // Handle Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])
  
  return <div>...</div>
}
```

**After:**
```tsx
import { useKeyboardContext, KeyboardPriority } from '@/lib/keyboard'

export function MyComponent() {
  const [isOpen, setIsOpen] = useState(false)
  
  useKeyboardContext({
    id: 'my-component',
    priority: KeyboardPriority.FOCUSED,
    enabled: true,
    shortcuts: {
      'cmd+k': {
        handler: () => {
          setIsOpen(prev => !prev)
          return true
        },
        description: 'Toggle component',
      },
      'ctrl+k': {
        handler: () => {
          setIsOpen(prev => !prev)
          return true
        },
        description: 'Toggle component',
      },
      'escape': {
        handler: () => {
          if (isOpen) {
            setIsOpen(false)
            return true
          }
          return false // Let other handlers process Escape
        },
        description: 'Close component',
      },
    },
    deps: [isOpen],
  })
  
  return <div>...</div>
}
```

## Debugging

Enable debug mode to see all active shortcuts:
- Press `Ctrl+Shift+K` to toggle the debug overlay
- View console logs with `debug: true` option
- Check for conflicts in the console warnings

## Notes

- The keyboard manager automatically handles input field detection
- Return `true` from handlers to stop propagation
- Return `false` to allow other handlers to process the event
- Use the `deps` array to re-register when dependencies change
- The manager persists as a singleton across the app