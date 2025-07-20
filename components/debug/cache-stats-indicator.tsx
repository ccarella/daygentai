'use client'

import { useIssueCache } from '@/contexts/issue-cache-context'
import { useEffect, useState } from 'react'

export function CacheStatsIndicator() {
  const { getCacheStats } = useIssueCache()
  const [stats, setStats] = useState(getCacheStats())
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Update stats every 500ms
    const interval = setInterval(() => {
      setStats(getCacheStats())
    }, 500)

    return () => clearInterval(interval)
  }, [getCacheStats])

  // Toggle visibility with keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setVisible(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!visible) return null

  const hitRate = stats.hits + stats.misses > 0 
    ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1)
    : '0.0'
    
  const listHitRate = stats.listHits + stats.listMisses > 0 
    ? ((stats.listHits / (stats.listHits + stats.listMisses)) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="fixed bottom-4 right-4 bg-background/95 backdrop-blur border rounded-lg p-4 shadow-lg z-50 font-mono text-sm max-w-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <h3 className="font-semibold">Cache Stats</h3>
      </div>
      
      <div className="space-y-1 text-xs">
        <div className="text-muted-foreground font-semibold mb-1">Individual Issues:</div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Cache Size:</span>
          <span className="font-medium">{stats.size} items</span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Hits:</span>
          <span className="font-medium text-green-600">{stats.hits}</span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Misses:</span>
          <span className="font-medium text-red-600">{stats.misses}</span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Hit Rate:</span>
          <span className="font-medium">{hitRate}%</span>
        </div>
        
        <div className="text-muted-foreground font-semibold mt-2 mb-1">List Queries:</div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Cache Size:</span>
          <span className="font-medium">{stats.listSize || 0} queries</span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Hits:</span>
          <span className="font-medium text-green-600">{stats.listHits || 0}</span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Misses:</span>
          <span className="font-medium text-red-600">{stats.listMisses || 0}</span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Hit Rate:</span>
          <span className="font-medium">{listHitRate}%</span>
        </div>
        
        {stats.lastHit && (
          <div className="mt-2 pt-2 border-t text-[10px]">
            <div className="text-green-600">Last hit: {stats.lastHit.slice(0, 8)}...</div>
          </div>
        )}
        
        {stats.lastMiss && (
          <div className="text-[10px]">
            <div className="text-red-600">Last miss: {stats.lastMiss.slice(0, 8)}...</div>
          </div>
        )}
      </div>
      
      <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground">
        Press Ctrl+Shift+D to toggle
      </div>
    </div>
  )
}