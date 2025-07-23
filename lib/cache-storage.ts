'use client'

import { IssueWithCreator, ListCacheEntry, ListCacheKey } from '@/contexts/issue-cache-context'

// Cache version - increment this to invalidate all caches
const CACHE_VERSION = 1
const CACHE_PREFIX = 'daygent_cache_'
const TTL_MS = 30 * 60 * 1000 // 30 minutes
const MAX_CACHE_SIZE = 10 * 1024 * 1024 // 10MB limit
const CLEANUP_CHUNK_SIZE = 10 // Process 10 items at a time

interface StoredCacheEntry<T> {
  data: T
  timestamp: number
  version: number
}

interface CacheMetadata {
  version: number
  lastCleanup: number
  totalSize: number
  cacheKeys: {
    issues: string[]
    lists: string[]
  }
}

// Check if localStorage is available
const isLocalStorageAvailable = () => {
  try {
    const test = '__localStorage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

// Calculate approximate size of data in bytes
const getDataSize = (data: unknown): number => {
  return new Blob([JSON.stringify(data)]).size
}

// Get metadata with cache keys index
const getMetadata = (): CacheMetadata | null => {
  if (!isLocalStorageAvailable()) return null
  
  try {
    const metadataStr = localStorage.getItem(`${CACHE_PREFIX}metadata`)
    if (!metadataStr) return null
    return JSON.parse(metadataStr) as CacheMetadata
  } catch {
    return null
  }
}

// Update metadata
const updateMetadata = (updates: Partial<CacheMetadata>) => {
  if (!isLocalStorageAvailable()) return
  
  const current = getMetadata() || {
    version: CACHE_VERSION,
    lastCleanup: Date.now(),
    totalSize: 0,
    cacheKeys: { issues: [], lists: [] }
  }
  
  const updated = { ...current, ...updates }
  localStorage.setItem(`${CACHE_PREFIX}metadata`, JSON.stringify(updated))
}

// Add key to metadata index
const addKeyToIndex = (key: string, type: 'issue' | 'list') => {
  const metadata = getMetadata()
  if (!metadata) return
  
  const keyType = type === 'issue' ? 'issues' : 'lists'
  if (!metadata.cacheKeys[keyType].includes(key)) {
    metadata.cacheKeys[keyType].push(key)
    updateMetadata({ cacheKeys: metadata.cacheKeys })
  }
}

// Remove key from metadata index
const removeKeyFromIndex = (key: string) => {
  const metadata = getMetadata()
  if (!metadata) return
  
  metadata.cacheKeys.issues = metadata.cacheKeys.issues.filter(k => k !== key)
  metadata.cacheKeys.lists = metadata.cacheKeys.lists.filter(k => k !== key)
  updateMetadata({ cacheKeys: metadata.cacheKeys })
}

// Asynchronous cleanup with requestIdleCallback
const cleanupCacheAsync = () => {
  if (!isLocalStorageAvailable()) return
  
  const metadata = getMetadata()
  if (!metadata) return
  
  const now = Date.now()
  const allKeys = [...metadata.cacheKeys.issues, ...metadata.cacheKeys.lists]
  let currentIndex = 0
  let totalSize = 0
  const entries: { key: string; size: number; timestamp: number }[] = []
  const keysToRemove: string[] = []
  
  const processChunk = (deadline: IdleDeadline) => {
    while (currentIndex < allKeys.length && deadline.timeRemaining() > 0) {
      const endIndex = Math.min(currentIndex + CLEANUP_CHUNK_SIZE, allKeys.length)
      
      for (let i = currentIndex; i < endIndex; i++) {
        const key = allKeys[i]
        if (!key) continue
        try {
          const stored = localStorage.getItem(key)
          if (!stored) {
            keysToRemove.push(key)
            continue
          }
          
          const entry = JSON.parse(stored) as StoredCacheEntry<unknown>
          const age = now - entry.timestamp
          
          // Remove if expired or wrong version
          if (age > TTL_MS || entry.version !== CACHE_VERSION) {
            localStorage.removeItem(key)
            keysToRemove.push(key)
          } else {
            const size = getDataSize(entry.data)
            totalSize += size
            entries.push({ key, size, timestamp: entry.timestamp })
          }
        } catch {
          // Remove corrupted entries
          if (key) {
            localStorage.removeItem(key)
            keysToRemove.push(key)
          }
        }
      }
      
      currentIndex = endIndex
    }
    
    // If we're done processing all keys
    if (currentIndex >= allKeys.length) {
      // Remove keys from index
      keysToRemove.forEach(key => removeKeyFromIndex(key))
      
      // Check if we need to evict more entries due to size
      if (totalSize > MAX_CACHE_SIZE) {
        // Sort by timestamp, oldest first
        entries.sort((a, b) => a.timestamp - b.timestamp)
        
        while (totalSize > MAX_CACHE_SIZE * 0.8 && entries.length > 0) {
          const oldest = entries.shift()!
          localStorage.removeItem(oldest.key)
          removeKeyFromIndex(oldest.key)
          totalSize -= oldest.size
        }
      }
      
      // Update metadata
      updateMetadata({
        lastCleanup: now,
        totalSize
      })
    } else {
      // Schedule next chunk
      if ('requestIdleCallback' in window) {
        requestIdleCallback(processChunk)
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => processChunk({ timeRemaining: () => 10, didTimeout: false } as IdleDeadline), 0)
      }
    }
  }
  
  // Start processing
  if ('requestIdleCallback' in window) {
    requestIdleCallback(processChunk)
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => processChunk({ timeRemaining: () => 10, didTimeout: false } as IdleDeadline), 0)
  }
}

// Check if cleanup is needed
const shouldCleanup = (): boolean => {
  const metadata = getMetadata()
  if (!metadata) return true
  
  const timeSinceCleanup = Date.now() - metadata.lastCleanup
  
  // Cleanup if: version mismatch, over 1 hour since last cleanup, or size over 80% of max
  return metadata.version !== CACHE_VERSION || 
         timeSinceCleanup > 60 * 60 * 1000 ||
         metadata.totalSize > MAX_CACHE_SIZE * 0.8
}

// Store data in localStorage with TTL
export const storeInCache = <T>(key: string, data: T, type: 'issue' | 'list' = 'issue'): boolean => {
  if (!isLocalStorageAvailable()) return false
  
  // Run cleanup if needed (async)
  if (shouldCleanup()) {
    cleanupCacheAsync()
  }
  
  const entry: StoredCacheEntry<T> = {
    data,
    timestamp: Date.now(),
    version: CACHE_VERSION
  }
  
  try {
    const storageKey = `${CACHE_PREFIX}${key}`
    localStorage.setItem(storageKey, JSON.stringify(entry))
    addKeyToIndex(storageKey, type)
    return true
  } catch (e) {
    console.warn('Failed to store in localStorage:', e)
    // Emergency cleanup: remove just a few oldest items synchronously
    const metadata = getMetadata()
    if (metadata) {
      const allCacheKeys = [...metadata.cacheKeys.issues, ...metadata.cacheKeys.lists]
      
      // Only process first 10 items to find oldest ones quickly
      const sampleSize = Math.min(10, allCacheKeys.length)
      const entries: { key: string; timestamp: number }[] = []
      
      for (let i = 0; i < sampleSize; i++) {
        const k = allCacheKeys[i]
        if (!k) continue
        try {
          const stored = localStorage.getItem(k)
          if (stored) {
            const entry = JSON.parse(stored) as StoredCacheEntry<unknown>
            entries.push({ key: k, timestamp: entry.timestamp })
          }
        } catch {
          // Remove corrupted entry immediately
          localStorage.removeItem(k)
          removeKeyFromIndex(k)
        }
      }
      
      // Remove only 1-3 oldest items for minimal UI blocking
      if (entries.length > 0) {
        entries.sort((a, b) => a.timestamp - b.timestamp)
        const itemsToRemove = Math.min(3, Math.max(1, Math.ceil(entries.length * 0.3)))
        
        for (let i = 0; i < itemsToRemove && i < entries.length; i++) {
          const entry = entries[i]
          if (entry) {
            localStorage.removeItem(entry.key)
            removeKeyFromIndex(entry.key)
          }
        }
      }
      
      // Queue comprehensive async cleanup
      setTimeout(() => cleanupCacheAsync(), 0)
    }
    
    try {
      const storageKey = `${CACHE_PREFIX}${key}`
      localStorage.setItem(storageKey, JSON.stringify(entry))
      addKeyToIndex(storageKey, type)
      return true
    } catch {
      return false
    }
  }
}

// Retrieve data from localStorage
export const getFromCache = <T>(key: string): T | null => {
  if (!isLocalStorageAvailable()) return null
  
  try {
    const storageKey = `${CACHE_PREFIX}${key}`
    const stored = localStorage.getItem(storageKey)
    if (!stored) return null
    
    const entry = JSON.parse(stored) as StoredCacheEntry<T>
    
    // Check version
    if (entry.version !== CACHE_VERSION) {
      localStorage.removeItem(storageKey)
      removeKeyFromIndex(storageKey)
      return null
    }
    
    // Check TTL
    const age = Date.now() - entry.timestamp
    if (age > TTL_MS) {
      localStorage.removeItem(storageKey)
      removeKeyFromIndex(storageKey)
      return null
    }
    
    return entry.data
  } catch (e) {
    console.warn('Failed to retrieve from localStorage:', e)
    return null
  }
}

// Clear all cache entries
export const clearAllCache = (): void => {
  if (!isLocalStorageAvailable()) return
  
  const metadata = getMetadata()
  if (metadata) {
    [...metadata.cacheKeys.issues, ...metadata.cacheKeys.lists].forEach(key => {
      localStorage.removeItem(key)
    })
  }
  localStorage.removeItem(`${CACHE_PREFIX}metadata`)
}

// Store issue in cache
export const storeIssue = (issue: IssueWithCreator): boolean => {
  return storeInCache(`issue_${issue.id}`, issue, 'issue')
}

// Get issue from cache
export const getStoredIssue = (issueId: string): IssueWithCreator | null => {
  return getFromCache<IssueWithCreator>(`issue_${issueId}`)
}

// Export the cache key generator
export function generateListCacheKey(key: ListCacheKey): string {
  // Use JSON for more robust parsing
  return JSON.stringify({
    w: key.workspaceId,
    s: key.statusFilter,
    p: key.priorityFilter,
    t: key.typeFilter,
    g: key.tagFilter,
    b: key.sortBy,
    q: key.searchQuery,
    n: key.page
  })
}

// Parse list cache key from JSON
export function parseListCacheKey(jsonKey: string): ListCacheKey | null {
  try {
    const parsed = JSON.parse(jsonKey)
    return {
      workspaceId: parsed.w,
      statusFilter: parsed.s,
      priorityFilter: parsed.p,
      typeFilter: parsed.t,
      tagFilter: parsed.g,
      sortBy: parsed.b || 'newest',
      searchQuery: parsed.q,
      page: parsed.n
    }
  } catch {
    return null
  }
}

// Store list cache entry
export const storeListCache = (key: ListCacheKey, entry: ListCacheEntry): boolean => {
  const cacheKey = generateListCacheKey(key)
  return storeInCache(`list_${cacheKey}`, entry, 'list')
}

// Get list cache entry
export const getStoredListCache = (key: ListCacheKey): ListCacheEntry | null => {
  const cacheKey = generateListCacheKey(key)
  return getFromCache<ListCacheEntry>(`list_${cacheKey}`)
}

// Batch store multiple issues
export const storeIssues = (issues: IssueWithCreator[]): number => {
  if (!isLocalStorageAvailable()) return 0
  
  let stored = 0
  issues.forEach(issue => {
    if (storeIssue(issue)) {
      stored++
    }
  })
  
  return stored
}

// Get cached list keys for hydration
export const getCachedListKeys = (): ListCacheKey[] => {
  const metadata = getMetadata()
  if (!metadata) return []
  
  const keys: ListCacheKey[] = []
  metadata.cacheKeys.lists.forEach(storageKey => {
    // Extract the JSON part after 'list_'
    const prefix = `${CACHE_PREFIX}list_`
    if (storageKey.startsWith(prefix)) {
      const jsonKey = storageKey.substring(prefix.length)
      const parsed = parseListCacheKey(jsonKey)
      if (parsed) {
        keys.push(parsed)
      }
    }
  })
  
  return keys
}

// Invalidate all list caches for a workspace
export const invalidateWorkspaceListCache = (workspaceId: string): void => {
  if (!isLocalStorageAvailable()) return
  
  const metadata = getMetadata()
  if (!metadata) return
  
  const keysToRemove: string[] = []
  metadata.cacheKeys.lists.forEach(key => {
    // Parse the key to check workspace
    const prefix = `${CACHE_PREFIX}list_`
    if (key.startsWith(prefix)) {
      const jsonKey = key.substring(prefix.length)
      const parsed = parseListCacheKey(jsonKey)
      if (parsed && parsed.workspaceId === workspaceId) {
        localStorage.removeItem(key)
        keysToRemove.push(key)
      }
    }
  })
  
  // Update metadata
  if (keysToRemove.length > 0) {
    metadata.cacheKeys.lists = metadata.cacheKeys.lists.filter(k => !keysToRemove.includes(k))
    updateMetadata({ cacheKeys: metadata.cacheKeys })
  }
}