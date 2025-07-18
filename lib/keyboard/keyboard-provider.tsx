'use client'

import React, { useEffect } from 'react'
import { KeyboardManager } from './keyboard-manager'

interface KeyboardProviderProps {
  children: React.ReactNode
  debug?: boolean
}

export function KeyboardProvider({ children, debug = false }: KeyboardProviderProps) {
  useEffect(() => {
    const manager = KeyboardManager.getInstance()
    manager.initialize({
      debug: debug || process.env.NODE_ENV === 'development',
    })

    return () => {
      // Don't destroy on unmount as other components might still be using it
      // The manager will persist as a singleton
    }
  }, [debug])

  return <>{children}</>
}