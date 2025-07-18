export type KeyboardShortcut = {
  key: string
  ctrl?: boolean
  cmd?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
}

export type ShortcutHandler = (event: KeyboardEvent) => void | boolean

export type ShortcutDefinition = {
  handler: ShortcutHandler
  description?: string
  preventDefault?: boolean
  stopPropagation?: boolean
}

export type KeyboardContext = {
  id: string
  priority: number
  enabled: boolean
  shortcuts: Record<string, ShortcutDefinition>
}

export type KeyboardContextRegistration = {
  context: KeyboardContext
  unregister: () => void
}

export enum KeyboardPriority {
  MODAL = 1,        // Highest priority - modals and dialogs
  FOCUSED = 2,      // Component-specific shortcuts when focused
  NAVIGATION = 3,   // Area navigation (sidebar, main content)
  GLOBAL = 4,       // Global application shortcuts
  DEFAULT = 5       // Lowest priority - default browser behavior
}

export type KeyboardManagerOptions = {
  debug?: boolean
  preventDefault?: boolean
  stopPropagation?: boolean
}

export type KeyboardEvent = globalThis.KeyboardEvent