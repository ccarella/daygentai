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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center">
          <div className="text-6xl">🤖</div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Daygent</h1>
          <p className="text-xl text-gray-600">Issue not found</p>
        </div>
        
        <div className="pt-4">
          <Link
            href={`/${workspaceSlug}`}
            className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors"
            aria-label="Return to Dashboard"
          >
            Return to Dashboard
          </Link>
        </div>
        
        <p className="text-sm text-gray-500 mt-4">
          Press <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Enter</kbd> or <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Space</kbd> to return
        </p>
      </div>
    </div>
  )
}