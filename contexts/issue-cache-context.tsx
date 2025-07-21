'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  storeIssue,
  getStoredIssue,
  storeListCache,
  getStoredListCache,
  clearAllCache,
  storeIssues,
  invalidateWorkspaceListCache,
  generateListCacheKey,
  getCachedListKeys
} from '@/lib/cache-storage'

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
    avatar_url?: string | null
  }
}

interface CacheStats {
  hits: number
  misses: number
  size: number
  listHits: number
  listMisses: number
  listSize: number
  lastHit?: string
  lastMiss?: string
}

interface ListCacheEntry {
  issues: Issue[]
  hasMore: boolean
  totalCount: number
  timestamp: number
}

interface ListCacheKey {
  workspaceId: string
  statusFilter: string
  priorityFilter: string
  typeFilter: string
  tagFilter: string
  searchQuery: string
  page: number
}

interface IssueCacheContextType {
  // Individual issue methods
  getIssue: (issueId: string) => IssueWithCreator | null
  preloadIssue: (issueId: string) => Promise<void>
  preloadIssues: (issueIds: string[]) => Promise<void>
  updateIssue: (issueId: string, updates: Partial<IssueWithCreator>) => void
  removeIssue: (issueId: string) => void
  
  // List cache methods
  getListCache: (key: ListCacheKey) => ListCacheEntry | null
  setListCache: (key: ListCacheKey, data: ListCacheEntry) => void
  invalidateListCache: (workspaceId: string) => void
  
  // General methods
  clearCache: () => void
  warmCache: (workspaceId: string) => Promise<void>
  getCacheStats: () => CacheStats
}

const IssueCacheContext = createContext<IssueCacheContextType | undefined>(undefined)


export function IssueCacheProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<Map<string, IssueWithCreator>>(new Map())
  const [listCache, setListCacheState] = useState<Map<string, ListCacheEntry>>(new Map())
  const [loadingIssues, setLoadingIssues] = useState<Set<string>>(new Set())
  const [isHydrated, setIsHydrated] = useState(false)
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    hits: 0,
    misses: 0,
    size: 0,
    listHits: 0,
    listMisses: 0,
    listSize: 0
  })

  // Hydrate cache from localStorage on mount - using requestIdleCallback for performance
  useEffect(() => {
    if (isHydrated) return
    
    const hydrateStart = Date.now()
    let hydratedIssues = 0
    let hydratedLists = 0
    
    const hydrateCache = () => {
      try {
        // Get cached list keys from metadata (much faster than iterating all localStorage)
        const cachedListKeys = getCachedListKeys()
        
        cachedListKeys.forEach(listKey => {
          const entry = getStoredListCache(listKey)
          if (entry) {
            const cacheKey = generateListCacheKey(listKey)
            setListCacheState(prev => {
              const newCache = new Map(prev)
              newCache.set(cacheKey, entry)
              return newCache
            })
            hydratedLists++
            
            // Also hydrate individual issues from list
            entry.issues.forEach(issue => {
              setCache(prev => {
                const newCache = new Map(prev)
                if (!newCache.has(issue.id)) {
                  newCache.set(issue.id, issue as IssueWithCreator)
                  hydratedIssues++
                }
                return newCache
              })
            })
          }
        })
        
        // Update stats
        setCacheStats(prev => ({
          ...prev,
          size: hydratedIssues,
          listSize: hydratedLists
        }))
        
        console.log(`[Cache HYDRATED] ${hydratedIssues} issues and ${hydratedLists} lists in ${Date.now() - hydrateStart}ms`)
      } catch (error) {
        console.error('Error hydrating cache:', error)
      } finally {
        setIsHydrated(true)
      }
    }
    
    // Use requestIdleCallback for non-blocking hydration
    if ('requestIdleCallback' in window) {
      requestIdleCallback(hydrateCache)
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(hydrateCache, 0)
    }
  }, [isHydrated])

  const getIssue = useCallback((issueId: string): IssueWithCreator | null => {
    // Try memory cache first
    let issue = cache.get(issueId)
    
    // If not in memory, try localStorage
    if (!issue && isHydrated) {
      const storedIssue = getStoredIssue(issueId)
      if (storedIssue) {
        issue = storedIssue
        // Restore to memory cache
        setCache(prev => {
          const newCache = new Map(prev)
          newCache.set(issueId, storedIssue)
          return newCache
        })
        console.log(`[Cache HIT - localStorage] Issue ${issueId}`)
      }
    }
    
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
  }, [cache, isHydrated])

  const getListCache = useCallback((key: ListCacheKey): ListCacheEntry | null => {
    const cacheKey = generateListCacheKey(key)
    // Try memory cache first
    let entry = listCache.get(cacheKey)
    
    // If not in memory, try localStorage
    if (!entry && isHydrated) {
      const storedEntry = getStoredListCache(key)
      if (storedEntry) {
        entry = storedEntry
        // Restore to memory cache
        setListCacheState(prev => {
          const newCache = new Map(prev)
          newCache.set(cacheKey, storedEntry)
          return newCache
        })
        console.log(`[List Cache HIT - localStorage] Key: ${cacheKey}`)
      }
    }
    
    if (entry) {
      const age = Date.now() - entry.timestamp
      console.log(`[List Cache HIT] Key: ${cacheKey}, Age: ${age}ms`)
      setCacheStats(prev => ({
        ...prev,
        listHits: prev.listHits + 1
      }))
      return entry
    } else {
      console.log(`[List Cache MISS] Key: ${cacheKey}`)
      setCacheStats(prev => ({
        ...prev,
        listMisses: prev.listMisses + 1
      }))
      return null
    }
  }, [listCache, isHydrated])

  const setListCache = useCallback((key: ListCacheKey, data: ListCacheEntry) => {
    const cacheKey = generateListCacheKey(key)
    console.log(`[List Cache SET] Key: ${cacheKey}, Issues: ${data.issues.length}`)
    
    setListCacheState(prev => {
      const newCache = new Map(prev)
      newCache.set(cacheKey, data)
      setCacheStats(prev => ({ ...prev, listSize: newCache.size }))
      return newCache
    })
    
    // Store in localStorage
    storeListCache(key, data)
    
    // Also update individual issue cache
    const issuesToStore: IssueWithCreator[] = []
    data.issues.forEach(issue => {
      setCache(prev => {
        const newCache = new Map(prev)
        if (!newCache.has(issue.id)) {
          newCache.set(issue.id, issue as IssueWithCreator)
          issuesToStore.push(issue as IssueWithCreator)
        }
        return newCache
      })
    })
    
    // Batch store issues in localStorage
    if (issuesToStore.length > 0) {
      storeIssues(issuesToStore)
    }
    
    // Capture size before setState to avoid stale closure
    const newCacheSize = cache.size + issuesToStore.length
    setCacheStats(prev => ({ ...prev, size: newCacheSize }))
  }, [cache])

  const invalidateListCache = useCallback((workspaceId: string) => {
    console.log(`[List Cache INVALIDATE] Workspace: ${workspaceId}`)
    setListCacheState(prev => {
      const newCache = new Map()
      prev.forEach((value, key) => {
        if (!key.startsWith(workspaceId)) {
          newCache.set(key, value)
        }
      })
      setCacheStats(prev => ({ ...prev, listSize: newCache.size }))
      return newCache
    })
    
    // Also invalidate in localStorage
    invalidateWorkspaceListCache(workspaceId)
  }, [])

  const preloadIssue = useCallback(async (issueId: string) => {
    // Skip if already cached or currently loading
    if (cache.has(issueId) || loadingIssues.has(issueId)) {
      return
    }

    setLoadingIssues(prev => new Set(prev).add(issueId))

    const startTime = Date.now()
    
    try {
      const supabase = createClient()

      // Fetch issue with creator info
      const { data: issue, error } = await supabase
        .from('issues')
        .select(`
          *,
          creator:creator_id (
            name,
            avatar_url
          )
        `)
        .eq('id', issueId)
        .single()

      if (!error && issue) {
        console.log(`[Cache LOADED] Issue ${issueId} loaded in ${Date.now() - startTime}ms`)
        const issueWithCreator = issue as IssueWithCreator
        setCache(prev => {
          const newCache = new Map(prev)
          newCache.set(issueId, issueWithCreator)
          // Capture size before setState
          const newSize = newCache.size
          setCacheStats(prev => ({ ...prev, size: newSize }))
          return newCache
        })
        // Store in localStorage
        storeIssue(issueWithCreator)
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

      // Batch fetch all issues with creator info
      const { data: issues, error } = await supabase
        .from('issues')
        .select(`
          *,
          creator:creator_id (
            name,
            avatar_url
          )
        `)
        .in('id', issuesToLoad)

      if (!error && issues) {
        console.log(`[Cache BATCH LOADED] ${issues.length} issues loaded in ${Date.now() - startTime}ms`)
        const issuesWithCreator = issues as IssueWithCreator[]
        setCache(prev => {
          const newCache = new Map(prev)
          issuesWithCreator.forEach(issue => {
            newCache.set(issue.id, issue)
          })
          // Capture size before setState
          const newSize = newCache.size
          setCacheStats(prev => ({ ...prev, size: newSize }))
          return newCache
        })
        // Batch store in localStorage
        storeIssues(issuesWithCreator)
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
    setListCacheState(new Map())
    setCacheStats({ hits: 0, misses: 0, size: 0, listHits: 0, listMisses: 0, listSize: 0 })
    // Clear localStorage
    clearAllCache()
  }, [])

  const warmCache = useCallback(async (workspaceId: string) => {
    const startTime = Date.now()
    
    try {
      const supabase = createClient()
      
      // Fetch first 50 most recent issues for cache warming with creator info
      const { data: issues, error } = await supabase
        .from('issues')
        .select(`
          *,
          creator:creator_id (
            name,
            avatar_url
          )
        `)
        .eq('workspace_id', workspaceId)
        .neq('status', 'done')
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && issues) {
        console.log(`[Cache WARMED] ${issues.length} issues pre-loaded in ${Date.now() - startTime}ms`)
        const issuesWithCreator = issues as IssueWithCreator[]
        setCache(prev => {
          const newCache = new Map(prev)
          issuesWithCreator.forEach(issue => {
            newCache.set(issue.id, issue)
          })
          // Capture size before setState
          const newSize = newCache.size
          setCacheStats(prev => ({ ...prev, size: newSize }))
          return newCache
        })
        // Batch store in localStorage
        storeIssues(issuesWithCreator)
        
        // Also cache this as the first page of default list view
        const defaultKey: ListCacheKey = {
          workspaceId,
          statusFilter: 'exclude_done',
          priorityFilter: 'all',
          typeFilter: 'all',
          tagFilter: 'all',
          searchQuery: '',
          page: 0
        }
        setListCache(defaultKey, {
          issues: issues as Issue[],
          hasMore: issues.length === 50,
          totalCount: issues.length,
          timestamp: Date.now()
        })
      }
    } catch (error) {
      console.error('Error warming cache:', error)
    }
  }, [setListCache])

  const updateIssue = useCallback((issueId: string, updates: Partial<IssueWithCreator>) => {
    console.log(`[Cache UPDATE] Issue ${issueId}`)
    let updatedIssue: IssueWithCreator | null = null
    
    setCache(prev => {
      const existing = prev.get(issueId)
      if (!existing) return prev
      
      const newCache = new Map(prev)
      updatedIssue = { ...existing, ...updates }
      newCache.set(issueId, updatedIssue)
      return newCache
    })
    
    // Store updated issue in localStorage
    if (updatedIssue) {
      storeIssue(updatedIssue)
    }
    
    // Invalidate list cache for the workspace
    const issue = cache.get(issueId)
    if (issue) {
      invalidateListCache(issue.workspace_id)
    }
  }, [cache, invalidateListCache])

  const removeIssue = useCallback((issueId: string) => {
    console.log(`[Cache REMOVE] Issue ${issueId}`)
    
    // Get workspace ID before removing
    const issue = cache.get(issueId)
    const workspaceId = issue?.workspace_id
    
    setCache(prev => {
      const newCache = new Map(prev)
      newCache.delete(issueId)
      // Capture size before setState
      const newSize = newCache.size
      setCacheStats(prev => ({ ...prev, size: newSize }))
      return newCache
    })
    
    // Invalidate list cache for the workspace
    if (workspaceId) {
      invalidateListCache(workspaceId)
    }
  }, [cache, invalidateListCache])

  const getCacheStats = useCallback(() => cacheStats, [cacheStats])

  return (
    <IssueCacheContext.Provider value={{ 
      getIssue, 
      preloadIssue, 
      preloadIssues, 
      clearCache, 
      warmCache, 
      updateIssue, 
      removeIssue, 
      getCacheStats,
      getListCache,
      setListCache,
      invalidateListCache
    }}>
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

// Export types for use in other components
export type { Issue, IssueWithCreator, ListCacheKey, ListCacheEntry }