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
  type: 'feature' | 'bug' | 'design' | 'product'
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'todo' | 'in_progress' | 'in_review' | 'done'
  created_at: string
  created_by: string
  assignee_id: string | null
  workspace_id: string
  position: number
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

export interface ListCacheKey {
  workspaceId: string
  statusFilter: string
  priorityFilter: string
  typeFilter: string
  tagFilter: string
  sortBy: string
  searchQuery: string
  page: number
}

interface IssueCacheContextType {
  // Individual issue methods
  getIssue: (issueId: string, workspaceId?: string) => IssueWithCreator | null
  preloadIssue: (issueId: string, workspaceId?: string) => Promise<void>
  preloadIssues: (issueIds: string[], workspaceId?: string) => Promise<void>
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
        
        // Cache hydrated successfully
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

  const getIssue = useCallback((issueId: string, workspaceId?: string): IssueWithCreator | null => {
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
        // Issue loaded from localStorage
      }
    }
    
    // Validate workspace if provided
    if (issue && workspaceId && issue.workspace_id !== workspaceId) {
      // Issue does not belong to the requested workspace
      setCacheStats(prev => ({
        ...prev,
        misses: prev.misses + 1,
        lastMiss: `${issueId} (wrong workspace)`
      }))
      return null
    }
    
    if (issue) {
      // Cache hit
      setCacheStats(prev => ({
        ...prev,
        hits: prev.hits + 1,
        lastHit: issueId
      }))
    } else {
      // Cache miss
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
        // List cache loaded from localStorage
      }
    }
    
    if (entry) {
      // List cache hit
      setCacheStats(prev => ({
        ...prev,
        listHits: prev.listHits + 1
      }))
      return entry
    } else {
      // List cache miss
      setCacheStats(prev => ({
        ...prev,
        listMisses: prev.listMisses + 1
      }))
      return null
    }
  }, [listCache, isHydrated])

  const setListCache = useCallback((key: ListCacheKey, data: ListCacheEntry) => {
    const cacheKey = generateListCacheKey(key)
    // Setting list cache
    
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
    
    // Update cache size using previous state to avoid stale closure
    setCacheStats(prev => ({ ...prev, size: prev.size + issuesToStore.length }))
  }, [cache])

  const invalidateListCache = useCallback((workspaceId: string) => {
    // Invalidating list cache for workspace
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

  const preloadIssue = useCallback(async (issueId: string, workspaceId?: string) => {
    // Skip if already cached or currently loading
    if (loadingIssues.has(issueId)) {
      return
    }
    
    // If already cached, check workspace match
    const cachedIssue = cache.get(issueId)
    if (cachedIssue) {
      if (!workspaceId || cachedIssue.workspace_id === workspaceId) {
        return
      }
      // Issue exists but wrong workspace - don't load
      return
    }

    setLoadingIssues(prev => new Set(prev).add(issueId))
    
    try {
      const supabase = createClient()

      // Build query
      let query = supabase
        .from('issues')
        .select(`
          *,
          creator:creator_id (
            name,
            avatar_url
          )
        `)
        .eq('id', issueId)
      
      // Add workspace filter if provided
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId)
      }
      
      const { data: issue, error } = await query.single()

      if (!error && issue) {
        // Issue loaded successfully
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

  const preloadIssues = useCallback(async (issueIds: string[], workspaceId?: string) => {
    // Filter out already cached or loading issues
    const issuesToLoad = issueIds.filter(id => {
      if (loadingIssues.has(id)) return false
      
      const cachedIssue = cache.get(id)
      if (cachedIssue) {
        // If workspace specified, only skip if it matches
        if (workspaceId && cachedIssue.workspace_id !== workspaceId) {
          return false // Don't load issues from wrong workspace
        }
        return false // Already cached
      }
      return true
    })

    if (issuesToLoad.length === 0) return

    // Mark all issues as loading
    setLoadingIssues(prev => {
      const newSet = new Set(prev)
      issuesToLoad.forEach(id => newSet.add(id))
      return newSet
    })

    try {
      const supabase = createClient()

      // Build query
      let query = supabase
        .from('issues')
        .select(`
          *,
          creator:creator_id (
            name,
            avatar_url
          )
        `)
        .in('id', issuesToLoad)
      
      // Add workspace filter if provided
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId)
      }

      const { data: issues, error } = await query

      if (!error && issues) {
        // Batch load completed
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
    // Clearing all cache
    setCache(new Map())
    setListCacheState(new Map())
    setCacheStats({ hits: 0, misses: 0, size: 0, listHits: 0, listMisses: 0, listSize: 0 })
    // Clear localStorage
    clearAllCache()
  }, [])

  const warmCache = useCallback(async (workspaceId: string) => {
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
        // Cache warming completed
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
          sortBy: 'newest',
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
    // Updating issue in cache
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
    // Removing issue from cache
    
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
export type { Issue, IssueWithCreator, ListCacheEntry }