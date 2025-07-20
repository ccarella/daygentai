'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

interface IssueNotFoundProps {
  workspaceSlug: string
}

export function IssueNotFound({ workspaceSlug }: IssueNotFoundProps) {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        router.push(`/${workspaceSlug}`)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router, workspaceSlug])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center">
          <div className="text-6xl">🤖</div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Daygent</h1>
          <p className="text-xl text-muted-foreground">Issue not found</p>
        </div>
        
        <div className="pt-4">
          <Link
            href={`/${workspaceSlug}`}
            className="inline-flex items-center px-6 py-3 text-base font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            aria-label="Return to Dashboard"
          >
            Return to Dashboard
          </Link>
        </div>
        
        <p className="text-sm text-muted-foreground mt-4">
          Press <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded">Enter</kbd> or <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded">Space</kbd> to return
        </p>
      </div>
    </div>
  )
}