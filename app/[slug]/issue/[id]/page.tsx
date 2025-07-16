'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function IssuePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const router = useRouter()

  useEffect(() => {
    const redirect = async () => {
      const resolvedParams = await params
      // Redirect to the main workspace page with issue view
      router.replace(`/${resolvedParams.slug}`)
    }
    redirect()
  }, [params, router])

  return null
}