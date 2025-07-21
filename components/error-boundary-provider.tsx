'use client'

import { ReactNode } from 'react'
import { ErrorBoundary } from './error-boundary'

interface ErrorBoundaryProviderProps {
  children: ReactNode
  fallback?: ReactNode
}

export function ErrorBoundaryProvider({ children, fallback }: ErrorBoundaryProviderProps) {
  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  )
}

// Specific error boundaries for different parts of the app
export function IssueListErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Failed to load issues. Please try refreshing the page.</p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

export function WorkspaceErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Failed to load workspace. Please try refreshing the page.</p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}