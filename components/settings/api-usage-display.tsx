'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Zap, RefreshCw, TrendingUp } from 'lucide-react'
import { WorkspaceUsage } from '@/lib/llm/usage/usage-monitor'

interface ApiUsageDisplayProps {
  workspaceId: string
}

export function ApiUsageDisplay({ workspaceId }: ApiUsageDisplayProps) {
  const [usage, setUsage] = useState<WorkspaceUsage | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUsage = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/workspace/${workspaceId}/usage`)
      if (response.ok) {
        const data = await response.json()
        setUsage(data.usage)
      }
    } catch (error) {
      console.error('Error fetching usage:', error)
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchUsage()
  }, [workspaceId, fetchUsage])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            AI Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!usage) {
    return null
  }

  const getStatusColor = () => {
    if (usage.isOverLimit) return 'destructive'
    if (usage.percentageUsed >= 80) return 'secondary'
    return 'default'
  }

  const getStatusText = () => {
    if (usage.isOverLimit) return 'Over Limit'
    if (usage.percentageUsed >= 80) return 'Warning'
    return 'Active'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          AI Usage
        </CardTitle>
        <CardDescription>
          Track your AI feature usage and limits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Monthly Usage</span>
            <span className="font-medium">
              ${usage.totalCost.toFixed(2)} / ${usage.limit.toFixed(2)}
            </span>
          </div>
          <Progress value={usage.percentageUsed} className="h-2" />
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>{usage.percentageUsed.toFixed(1)}% used</span>
            <Badge variant={getStatusColor() as 'default' | 'destructive' | 'secondary'}>{getStatusText()}</Badge>
          </div>
        </div>

        {usage.isOverLimit && (
          <div className="p-3 bg-destructive/10 rounded-md">
            <p className="text-sm text-destructive">
              Your workspace has exceeded its monthly AI usage limit. 
              AI features are temporarily disabled until the next billing cycle.
            </p>
          </div>
        )}

        {usage.percentageUsed >= 80 && !usage.isOverLimit && (
          <div className="p-3 bg-secondary/10 rounded-md">
            <p className="text-sm text-secondary-foreground">
              You&apos;ve used {usage.percentageUsed.toFixed(1)}% of your monthly limit. 
              Consider monitoring your usage to avoid interruptions.
            </p>
          </div>
        )}

        <div className="pt-4 space-y-4">
          <Button onClick={fetchUsage} variant="outline" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Usage
          </Button>
          
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              AI Features Available
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Next Issue AI recommendations in Command Palette (⌘K)</li>
              <li>• Automatic prompt generation for new issues</li>
              <li>• AI-powered issue prioritization</li>
            </ul>
          </div>
          
          {!usage.limitEnabled && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">
                Usage limits are currently disabled for this workspace.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}