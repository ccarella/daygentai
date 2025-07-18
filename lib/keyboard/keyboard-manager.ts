import {
  KeyboardContext,
  KeyboardContextRegistration,
  KeyboardManagerOptions,
} from './types'

export class KeyboardManager {
  private static instance: KeyboardManager | null = null
  private contexts: Map<string, KeyboardContext> = new Map()
  private listener: ((event: KeyboardEvent) => void) | null = null
  private options: KeyboardManagerOptions = {
    debug: false,
    preventDefault: true,
    stopPropagation: true,
  }
  private keySequence: string[] = []
  private sequenceTimeout: NodeJS.Timeout | null = null
  private debugOverlay: HTMLDivElement | null = null

  private constructor() {}

  static getInstance(): KeyboardManager {
    if (!KeyboardManager.instance) {
      KeyboardManager.instance = new KeyboardManager()
    }
    return KeyboardManager.instance
  }

  initialize(options?: KeyboardManagerOptions): void {
    this.options = { ...this.options, ...options }
    
    if (this.listener) {
      window.removeEventListener('keydown', this.listener)
    }

    this.listener = this.handleKeyDown.bind(this)
    window.addEventListener('keydown', this.listener)

    if (this.options.debug && typeof window !== 'undefined') {
      this.initDebugMode()
    }
  }

  destroy(): void {
    if (this.listener) {
      window.removeEventListener('keydown', this.listener)
      this.listener = null
    }
    this.contexts.clear()
    this.destroyDebugMode()
  }

  register(context: KeyboardContext): KeyboardContextRegistration {
    if (this.options.debug) {
      this.checkForConflicts(context)
    }

    this.contexts.set(context.id, context)
    this.updateDebugOverlay()

    return {
      context,
      unregister: () => {
        this.contexts.delete(context.id)
        this.updateDebugOverlay()
      },
    }
  }

  private shouldIgnoreEvent(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement
    
    // Standard input field checks
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return true
    }

    // Check for dialog or ignore markers (with safety check for test environment)
    if (target.closest && typeof target.closest === 'function') {
      if (
        target.closest('[role="dialog"]') !== null ||
        target.closest('[data-keyboard-ignore="true"]') !== null
      ) {
        return true
      }
    }

    return false
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (this.shouldIgnoreEvent(event)) {
      return
    }

    const key = this.normalizeKey(event)
    const contexts = this.getActiveContextsSorted()

    if (this.options.debug) {
      console.log('[KeyboardManager] Key pressed:', key, 'Active contexts:', contexts.map(c => c.id))
    }

    // Handle sequential shortcuts
    if (this.keySequence.length > 0) {
      this.keySequence.push(event.key.toLowerCase())
      const sequence = this.keySequence.join('')
      
      for (const context of contexts) {
        const shortcut = context.shortcuts[sequence]
        if (shortcut) {
          if (this.options.debug) {
            console.log(`[KeyboardManager] Sequential shortcut matched: ${sequence} in context: ${context.id}`)
          }
          
          if (shortcut.preventDefault ?? this.options.preventDefault) {
            event.preventDefault()
          }
          if (shortcut.stopPropagation ?? this.options.stopPropagation) {
            event.stopPropagation()
          }
          
          const result = shortcut.handler(event)
          this.clearKeySequence()
          
          if (result !== false) {
            return
          }
        }
      }
      
      // Clear sequence if too long or no match after timeout
      if (this.keySequence.length > 2) {
        this.clearKeySequence()
      }
    }

    // Check for sequential shortcut starters (like 'g' or 's')
    const sequenceStarters = ['g', 's']
    if (sequenceStarters.includes(event.key.toLowerCase()) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      this.startKeySequence(event.key.toLowerCase())
      event.preventDefault()
      return
    }

    // Handle regular shortcuts
    for (const context of contexts) {
      const shortcut = context.shortcuts[key]
      if (shortcut) {
        if (this.options.debug) {
          console.log(`[KeyboardManager] Shortcut matched: ${key} in context: ${context.id}`)
        }
        
        if (shortcut.preventDefault ?? this.options.preventDefault) {
          event.preventDefault()
        }
        if (shortcut.stopPropagation ?? this.options.stopPropagation) {
          event.stopPropagation()
        }
        
        const result = shortcut.handler(event)
        
        // If handler returns false, continue to next context
        if (result !== false) {
          return
        }
      }
    }
  }

  private normalizeKey(event: KeyboardEvent): string {
    const parts: string[] = []
    
    if (event.ctrlKey) parts.push('ctrl')
    if (event.metaKey) parts.push('cmd')
    if (event.altKey) parts.push('alt')
    if (event.shiftKey) parts.push('shift')
    
    parts.push(event.key.toLowerCase())
    
    return parts.join('+')
  }

  private getActiveContextsSorted(): KeyboardContext[] {
    return Array.from(this.contexts.values())
      .filter(context => context.enabled)
      .sort((a, b) => a.priority - b.priority)
  }

  private startKeySequence(key: string): void {
    this.keySequence = [key]
    
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout)
    }
    
    this.sequenceTimeout = setTimeout(() => {
      this.clearKeySequence()
    }, 1500) // 1.5 second timeout for sequences
  }

  private clearKeySequence(): void {
    this.keySequence = []
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout)
      this.sequenceTimeout = null
    }
  }

  private checkForConflicts(newContext: KeyboardContext): void {
    const conflicts: string[] = []
    
    for (const [contextId, context] of this.contexts) {
      if (context.priority === newContext.priority && context.enabled) {
        const existingKeys = Object.keys(context.shortcuts)
        const newKeys = Object.keys(newContext.shortcuts)
        
        const conflictingKeys = existingKeys.filter(key => newKeys.includes(key))
        
        if (conflictingKeys.length > 0) {
          conflicts.push(
            `Context "${newContext.id}" conflicts with "${contextId}" on keys: ${conflictingKeys.join(', ')}`
          )
        }
      }
    }
    
    if (conflicts.length > 0) {
      console.warn('[KeyboardManager] Conflicts detected:', conflicts)
    }
  }

  private initDebugMode(): void {
    this.debugOverlay = document.createElement('div')
    this.debugOverlay.id = 'keyboard-debug-overlay'
    this.debugOverlay.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      max-width: 400px;
      max-height: 300px;
      overflow-y: auto;
      z-index: 99999;
      display: none;
    `
    document.body.appendChild(this.debugOverlay)
    
    // Toggle with Ctrl+Shift+K
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'K') {
        e.preventDefault()
        if (this.debugOverlay) {
          this.debugOverlay.style.display = 
            this.debugOverlay.style.display === 'none' ? 'block' : 'none'
          this.updateDebugOverlay()
        }
      }
    })
  }

  private updateDebugOverlay(): void {
    if (!this.debugOverlay) return
    
    const contexts = this.getActiveContextsSorted()
    let html = '<h3 style="margin: 0 0 10px 0;">Active Keyboard Contexts</h3>'
    
    if (this.keySequence.length > 0) {
      html += `<div style="color: #ffcc00; margin-bottom: 10px;">Sequence: ${this.keySequence.join(' → ')}</div>`
    }
    
    for (const context of contexts) {
      html += `<div style="margin-bottom: 10px;">
        <strong style="color: #4CAF50;">${context.id}</strong> (priority: ${context.priority})
        <ul style="margin: 5px 0; padding-left: 20px;">`
      
      for (const [key, shortcut] of Object.entries(context.shortcuts)) {
        html += `<li>${key}${shortcut.description ? `: ${shortcut.description}` : ''}</li>`
      }
      
      html += '</ul></div>'
    }
    
    this.debugOverlay.innerHTML = html
  }

  private destroyDebugMode(): void {
    if (this.debugOverlay && this.debugOverlay.parentNode) {
      this.debugOverlay.parentNode.removeChild(this.debugOverlay)
      this.debugOverlay = null
    }
  }
}