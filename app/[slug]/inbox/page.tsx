'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function InboxPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter()

  useEffect(() => {
    const redirect = async () => {
      const resolvedParams = await params
      // Redirect to the main workspace page with inbox view
      router.replace(`/${resolvedParams.slug}`)
    }
    redirect()
  }, [params, router])

  return null
}