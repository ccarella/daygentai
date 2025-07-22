'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ApiKeyDebugProps {
  workspaceId: string
}

export function ApiKeyDebug({ workspaceId }: ApiKeyDebugProps) {
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runDebug = async () => {
    setLoading(true)
    setError(null)
    setDebugInfo(null)

    try {
      const response = await fetch('/api/debug-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId })
      })

      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Debug failed')
      } else {
        setDebugInfo(data.debug)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  // Only show in development
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return null
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>API Key Debug</CardTitle>
        <CardDescription>Debug API key configuration (dev only)</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={runDebug} disabled={loading}>
          {loading ? 'Running...' : 'Run Debug'}
        </Button>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded">
            Error: {error}
          </div>
        )}
        
        {debugInfo && (
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <pre className="text-sm">{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}