'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface SuccessRedirectProps {
  workspaceSlug: string
}

export function SuccessRedirect({ workspaceSlug }: SuccessRedirectProps) {
  const router = useRouter()

  useEffect(() => {
    // Add a small delay to ensure cache invalidation has propagated
    const timer = setTimeout(() => {
      router.push(`/${workspaceSlug}`)
    }, 1000)

    return () => clearTimeout(timer)
  }, [workspaceSlug, router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Setting up your workspace...</p>
      </div>
    </div>
  )
}