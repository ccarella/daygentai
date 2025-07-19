/**
 * Platform detection and keyboard shortcut formatting utilities
 */

export type Platform = 'mac' | 'windows' | 'linux' | 'unknown'

/**
 * Detects the user's operating system platform
 */
export function detectPlatform(): Platform {
  if (typeof window === 'undefined') {
    return 'unknown'
  }

  const userAgent = window.navigator.userAgent.toLowerCase()
  const platform = window.navigator.platform?.toLowerCase() || ''

  // Check for Mac
  if (platform.includes('mac') || userAgent.includes('mac')) {
    return 'mac'
  }

  // Check for Windows
  if (platform.includes('win') || userAgent.includes('windows')) {
    return 'windows'
  }

  // Check for Linux
  if (platform.includes('linux') || userAgent.includes('linux')) {
    return 'linux'
  }

  return 'unknown'
}

/**
 * Get the platform-specific modifier key symbol
 */
export function getModifierSymbol(platform: Platform): string {
  switch (platform) {
    case 'mac':
      return '⌘'
    case 'windows':
    case 'linux':
    default:
      return 'Ctrl'
  }
}

/**
 * Format a keyboard shortcut for the current platform
 * @param shortcut - The shortcut string (e.g., "⌘N", "Ctrl+N")
 * @returns The formatted shortcut for the current platform
 */
export function formatShortcut(shortcut: string): string {
  const platform = detectPlatform()
  
  // Replace Mac-specific symbols with platform-appropriate ones
  if (platform !== 'mac') {
    return shortcut
      .replace(/⌘/g, 'Ctrl')
      .replace(/⌥/g, 'Alt')
      .replace(/⇧/g, 'Shift')
  }
  
  // For Mac, ensure we're using the right symbols
  return shortcut
    .replace(/Ctrl\+/gi, '⌘')
    .replace(/Alt\+/gi, '⌥')
    .replace(/Shift\+/gi, '⇧')
}

/**
 * Get platform-specific shortcut display
 * @param macShortcut - The Mac version of the shortcut
 * @param winLinuxShortcut - The Windows/Linux version of the shortcut (optional, will be derived if not provided)
 */
export function getPlatformShortcut(macShortcut: string, winLinuxShortcut?: string): string {
  const platform = detectPlatform()
  
  if (platform === 'mac') {
    return macShortcut
  }
  
  // If Windows/Linux shortcut is explicitly provided, use it
  if (winLinuxShortcut) {
    return winLinuxShortcut
  }
  
  // Otherwise, convert Mac shortcut to Windows/Linux format
  return macShortcut
    .replace(/⌘/g, 'Ctrl+')
    .replace(/⌥/g, 'Alt+')
    .replace(/⇧/g, 'Shift+')
    // Handle cases where modifiers are already spelled out
    .replace(/Cmd\+/gi, 'Ctrl+')
    .replace(/Command\+/gi, 'Ctrl+')
    // Clean up any double plus signs
    .replace(/\+\+/g, '+')
}

/**
 * Hook to get platform-aware shortcuts
 */
export function usePlatformShortcuts() {
  const platform = detectPlatform()
  const modifierKey = getModifierSymbol(platform)
  
  return {
    platform,
    modifierKey,
    formatShortcut,
    getPlatformShortcut,
  }
}