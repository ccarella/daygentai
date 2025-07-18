'use client'

import React from 'react'
import { useKeyboardContext, useKeyboardShortcut, KeyboardPriority } from '@/lib/keyboard'

// Example 1: Component with multiple shortcuts
export function ExampleComponent() {
  const [count, setCount] = React.useState(0)
  const [isModalOpen, setIsModalOpen] = React.useState(false)

  // Register multiple shortcuts for this component
  useKeyboardContext({
    id: 'example-component',
    priority: KeyboardPriority.FOCUSED,
    enabled: true,
    shortcuts: {
      // Single key shortcut
      '+': {
        handler: () => {
          setCount(c => c + 1)
          return true
        },
        description: 'Increment counter',
      },
      '-': {
        handler: () => {
          setCount(c => c - 1)
          return true
        },
        description: 'Decrement counter',
      },
      // Modified shortcuts
      'cmd+o': {
        handler: () => {
          setIsModalOpen(true)
          return true
        },
        description: 'Open modal',
      },
      'ctrl+o': {
        handler: () => {
          setIsModalOpen(true)
          return true
        },
        description: 'Open modal',
      },
      // Escape with conditional behavior
      'escape': {
        handler: () => {
          if (isModalOpen) {
            setIsModalOpen(false)
            return true // Handled, stop propagation
          }
          return false // Not handled, let other components process it
        },
        description: 'Close modal',
      },
    },
    deps: [isModalOpen], // Re-register when modal state changes
  })

  return (
    <div>
      <h2>Counter: {count}</h2>
      <p>Press + or - to change the counter</p>
      <p>Press Cmd/Ctrl+O to open modal</p>
      {isModalOpen && (
        <div>
          <h3>Modal is open!</h3>
          <p>Press Escape to close</p>
        </div>
      )}
    </div>
  )
}

// Example 2: Using the helper hook for a single shortcut
export function SaveButton({ onSave }: { onSave: () => void }) {
  useKeyboardShortcut('s', onSave, {
    cmd: true,
    description: 'Save document',
    priority: KeyboardPriority.GLOBAL,
  })

  return <button onClick={onSave}>Save (Cmd+S)</button>
}

// Example 3: Modal with high priority shortcuts
export function Modal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  useKeyboardContext({
    id: 'modal',
    priority: KeyboardPriority.MODAL, // Higher priority than other shortcuts
    enabled: isOpen, // Only active when modal is open
    shortcuts: {
      'escape': {
        handler: () => {
          onClose()
          return true
        },
        description: 'Close modal',
      },
      'enter': {
        handler: () => {
          console.log('Confirmed!')
          onClose()
          return true
        },
        description: 'Confirm and close',
      },
    },
    deps: [onClose],
  })

  if (!isOpen) return null

  return (
    <div className="modal">
      <h2>Modal Content</h2>
      <p>Press Enter to confirm or Escape to cancel</p>
    </div>
  )
}

// Example 4: Navigation with sequential shortcuts
export function Navigation() {
  const router = useRouter()

  useKeyboardContext({
    id: 'navigation',
    priority: KeyboardPriority.NAVIGATION,
    enabled: true,
    shortcuts: {
      // Sequential shortcuts (vim-style)
      'gi': {
        handler: () => {
          router.push('/issues')
          return true
        },
        description: 'Go to issues',
      },
      'gp': {
        handler: () => {
          router.push('/projects')
          return true
        },
        description: 'Go to projects',
      },
      'gh': {
        handler: () => {
          router.push('/')
          return true
        },
        description: 'Go home',
      },
      // Quick actions
      'n': {
        handler: () => {
          console.log('Create new item')
          return true
        },
        description: 'Create new',
      },
    },
  })

  return (
    <nav>
      <p>Press G then I for Issues</p>
      <p>Press G then P for Projects</p>
      <p>Press G then H for Home</p>
      <p>Press N to create new</p>
    </nav>
  )
}

// For Next.js, we need to import the router hook
function useRouter() {
  return {
    push: (path: string) => console.log(`Navigate to: ${path}`),
  }
}