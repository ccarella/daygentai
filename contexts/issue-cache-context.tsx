'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Issue {
  id: string
  title: string
  description: string | null
  type: 'feature' | 'bug' | 'chore' | 'design' | 'non-technical'
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'todo' | 'in_progress' | 'in_review' | 'done'
  created_at: string
  created_by: string
  assignee_id: string | null
  workspace_id: string
}

interface IssueWithCreator extends Issue {
  creator?: {
    name: string
  }
}

interface CacheStats {
  hits: number
  misses: number
  size: number
  lastHit?: string
  lastMiss?: string
}

interface IssueCacheContextType {
  getIssue: (issueId: string) => IssueWithCreator | null
  preloadIssue: (issueId: string) => Promise<void>
  preloadIssues: (issueIds: string[]) => Promise<void>
  clearCache: () => void
  warmCache: (workspaceId: string) => Promise<void>
  updateIssue: (issueId: string, updates: Partial<IssueWithCreator>) => void
  removeIssue: (issueId: string) => void
  getCacheStats: () => CacheStats
}

const IssueCacheContext = createContext<IssueCacheContextType | undefined>(undefined)

export function IssueCacheProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<Map<string, IssueWithCreator>>(new Map())
  const [loadingIssues, setLoadingIssues] = useState<Set<string>>(new Set())
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    hits: 0,
    misses: 0,
    size: 0
  })

  const getIssue = useCallback((issueId: string): IssueWithCreator | null => {
    const issue = cache.get(issueId)
    
    if (issue) {
      console.log(`[Cache HIT] Issue ${issueId}`)
      setCacheStats(prev => ({
        ...prev,
        hits: prev.hits + 1,
        lastHit: issueId
      }))
    } else {
      console.log(`[Cache MISS] Issue ${issueId}`)
      setCacheStats(prev => ({
        ...prev,
        misses: prev.misses + 1,
        lastMiss: issueId
      }))
    }
    
    return issue || null
  }, [cache])

  const preloadIssue = useCallback(async (issueId: string) => {
    // Skip if already cached or currently loading
    if (cache.has(issueId) || loadingIssues.has(issueId)) {
      return
    }

    setLoadingIssues(prev => new Set(prev).add(issueId))

    const startTime = Date.now()
    
    try {
      const supabase = createClient()

      // Fetch issue
      const { data: issue, error } = await supabase
        .from('issues')
        .select('*')
        .eq('id', issueId)
        .single()

      if (!error && issue) {
        console.log(`[Cache LOADED] Issue ${issueId} loaded in ${Date.now() - startTime}ms`)
        setCache(prev => {
          const newCache = new Map(prev)
          newCache.set(issueId, issue as IssueWithCreator)
          setCacheStats(prev => ({ ...prev, size: newCache.size }))
          return newCache
        })
      }
    } catch (error) {
      console.error('Error preloading issue:', error)
    } finally {
      setLoadingIssues(prev => {
        const newSet = new Set(prev)
        newSet.delete(issueId)
        return newSet
      })
    }
  }, [cache, loadingIssues])

  const preloadIssues = useCallback(async (issueIds: string[]) => {
    // Filter out already cached or loading issues
    const issuesToLoad = issueIds.filter(
      id => !cache.has(id) && !loadingIssues.has(id)
    )

    if (issuesToLoad.length === 0) return

    // Mark all issues as loading
    setLoadingIssues(prev => {
      const newSet = new Set(prev)
      issuesToLoad.forEach(id => newSet.add(id))
      return newSet
    })

    const startTime = Date.now()
    
    try {
      const supabase = createClient()

      // Batch fetch all issues
      const { data: issues, error } = await supabase
        .from('issues')
        .select('*')
        .in('id', issuesToLoad)

      if (!error && issues) {
        console.log(`[Cache BATCH LOADED] ${issues.length} issues loaded in ${Date.now() - startTime}ms`)
        setCache(prev => {
          const newCache = new Map(prev)
          issues.forEach(issue => {
            newCache.set(issue.id, issue as IssueWithCreator)
          })
          setCacheStats(prev => ({ ...prev, size: newCache.size }))
          return newCache
        })
      }
    } catch (error) {
      console.error('Error preloading issues:', error)
    } finally {
      setLoadingIssues(prev => {
        const newSet = new Set(prev)
        issuesToLoad.forEach(id => newSet.delete(id))
        return newSet
      })
    }
  }, [cache, loadingIssues])

  const clearCache = useCallback(() => {
    console.log('[Cache CLEARED]')
    setCache(new Map())
    setCacheStats({ hits: 0, misses: 0, size: 0 })
  }, [])

  const warmCache = useCallback(async (workspaceId: string) => {
    const startTime = Date.now()
    
    try {
      const supabase = createClient()
      
      // Fetch first 50 most recent issues for cache warming
      const { data: issues, error } = await supabase
        .from('issues')
        .select('*')
        .eq('workspace_id', workspaceId)
        .neq('status', 'done')
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && issues) {
        console.log(`[Cache WARMED] ${issues.length} issues pre-loaded in ${Date.now() - startTime}ms`)
        setCache(prev => {
          const newCache = new Map(prev)
          issues.forEach(issue => {
            newCache.set(issue.id, issue as IssueWithCreator)
          })
          setCacheStats(prev => ({ ...prev, size: newCache.size }))
          return newCache
        })
      }
    } catch (error) {
      console.error('Error warming cache:', error)
    }
  }, [])

  const updateIssue = useCallback((issueId: string, updates: Partial<IssueWithCreator>) => {
    console.log(`[Cache UPDATE] Issue ${issueId}`)
    setCache(prev => {
      const existing = prev.get(issueId)
      if (!existing) return prev
      
      const newCache = new Map(prev)
      newCache.set(issueId, { ...existing, ...updates })
      return newCache
    })
  }, [])

  const removeIssue = useCallback((issueId: string) => {
    console.log(`[Cache REMOVE] Issue ${issueId}`)
    setCache(prev => {
      const newCache = new Map(prev)
      newCache.delete(issueId)
      setCacheStats(prev => ({ ...prev, size: newCache.size }))
      return newCache
    })
  }, [])

  const getCacheStats = useCallback(() => cacheStats, [cacheStats])

  return (
    <IssueCacheContext.Provider value={{ getIssue, preloadIssue, preloadIssues, clearCache, warmCache, updateIssue, removeIssue, getCacheStats }}>
      {children}
    </IssueCacheContext.Provider>
  )
}

export function useIssueCache() {
  const context = useContext(IssueCacheContext)
  if (!context) {
    throw new Error('useIssueCache must be used within an IssueCacheProvider')
  }
  return context
}