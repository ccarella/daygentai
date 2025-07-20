'use client'

import { IssueWithCreator, ListCacheEntry, ListCacheKey } from '@/contexts/issue-cache-context'

// Cache version - increment this to invalidate all caches
const CACHE_VERSION = 1
const CACHE_PREFIX = 'daygent_cache_'
const TTL_MS = 30 * 60 * 1000 // 30 minutes
const MAX_CACHE_SIZE = 10 * 1024 * 1024 // 10MB limit

interface StoredCacheEntry<T> {
  data: T
  timestamp: number
  version: number
}

interface CacheMetadata {
  version: number
  lastCleanup: number
  totalSize: number
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

// Get all cache keys
const getAllCacheKeys = (): string[] => {
  if (!isLocalStorageAvailable()) return []
  
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(CACHE_PREFIX)) {
      keys.push(key)
    }
  }
  return keys
}

// Clean up expired entries and manage cache size
const cleanupCache = () => {
  if (!isLocalStorageAvailable()) return
  
  const now = Date.now()
  const keys = getAllCacheKeys()
  let totalSize = 0
  const entries: { key: string; size: number; timestamp: number }[] = []
  
  // First pass: remove expired entries and collect info
  keys.forEach(key => {
    try {
      const stored = localStorage.getItem(key)
      if (!stored) return
      
      const entry = JSON.parse(stored) as StoredCacheEntry<unknown>
      const age = now - entry.timestamp
      
      // Remove if expired or wrong version
      if (age > TTL_MS || entry.version !== CACHE_VERSION) {
        localStorage.removeItem(key)
      } else {
        const size = getDataSize(stored)
        totalSize += size
        entries.push({ key, size, timestamp: entry.timestamp })
      }
    } catch {
      // Remove corrupted entries
      localStorage.removeItem(key)
    }
  })
  
  // Second pass: remove oldest entries if over size limit
  if (totalSize > MAX_CACHE_SIZE) {
    // Sort by timestamp, oldest first
    entries.sort((a, b) => a.timestamp - b.timestamp)
    
    while (totalSize > MAX_CACHE_SIZE * 0.8 && entries.length > 0) { // Keep 80% to avoid frequent cleanups
      const oldest = entries.shift()!
      localStorage.removeItem(oldest.key)
      totalSize -= oldest.size
    }
  }
  
  // Update metadata
  const metadata: CacheMetadata = {
    version: CACHE_VERSION,
    lastCleanup: now,
    totalSize
  }
  localStorage.setItem(`${CACHE_PREFIX}metadata`, JSON.stringify(metadata))
}

// Check if cleanup is needed
const shouldCleanup = (): boolean => {
  if (!isLocalStorageAvailable()) return false
  
  try {
    const metadataStr = localStorage.getItem(`${CACHE_PREFIX}metadata`)
    if (!metadataStr) return true
    
    const metadata = JSON.parse(metadataStr) as CacheMetadata
    const timeSinceCleanup = Date.now() - metadata.lastCleanup
    
    // Cleanup if: version mismatch, over 1 hour since last cleanup, or size too large
    return metadata.version !== CACHE_VERSION || 
           timeSinceCleanup > 60 * 60 * 1000 ||
           metadata.totalSize > MAX_CACHE_SIZE
  } catch {
    return true
  }
}

// Store data in localStorage with TTL
export const storeInCache = <T>(key: string, data: T): boolean => {
  if (!isLocalStorageAvailable()) return false
  
  // Run cleanup if needed
  if (shouldCleanup()) {
    cleanupCache()
  }
  
  const entry: StoredCacheEntry<T> = {
    data,
    timestamp: Date.now(),
    version: CACHE_VERSION
  }
  
  try {
    const storageKey = `${CACHE_PREFIX}${key}`
    localStorage.setItem(storageKey, JSON.stringify(entry))
    return true
  } catch (e) {
    console.warn('Failed to store in localStorage:', e)
    // Try cleanup and retry once
    cleanupCache()
    try {
      const storageKey = `${CACHE_PREFIX}${key}`
      localStorage.setItem(storageKey, JSON.stringify(entry))
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
      return null
    }
    
    // Check TTL
    const age = Date.now() - entry.timestamp
    if (age > TTL_MS) {
      localStorage.removeItem(storageKey)
      return null
    }
    
    return entry.data
  } catch (e) {
    console.warn('Failed to retrieve from localStorage:', e)
    return null
  }
}

// Remove data from localStorage
export const removeFromCache = (key: string): void => {
  if (!isLocalStorageAvailable()) return
  
  const storageKey = `${CACHE_PREFIX}${key}`
  localStorage.removeItem(storageKey)
}

// Clear all cache entries
export const clearAllCache = (): void => {
  if (!isLocalStorageAvailable()) return
  
  const keys = getAllCacheKeys()
  keys.forEach(key => localStorage.removeItem(key))
  localStorage.removeItem(`${CACHE_PREFIX}metadata`)
}

// Store issue in cache
export const storeIssue = (issue: IssueWithCreator): boolean => {
  return storeInCache(`issue_${issue.id}`, issue)
}

// Get issue from cache
export const getStoredIssue = (issueId: string): IssueWithCreator | null => {
  return getFromCache<IssueWithCreator>(`issue_${issueId}`)
}

// Store list cache entry
export const storeListCache = (key: ListCacheKey, entry: ListCacheEntry): boolean => {
  const cacheKey = generateListCacheKey(key)
  return storeInCache(`list_${cacheKey}`, entry)
}

// Get list cache entry
export const getStoredListCache = (key: ListCacheKey): ListCacheEntry | null => {
  const cacheKey = generateListCacheKey(key)
  return getFromCache<ListCacheEntry>(`list_${cacheKey}`)
}

// Helper function to generate cache key (same as in context)
function generateListCacheKey(key: ListCacheKey): string {
  return `${key.workspaceId}-${key.statusFilter}-${key.priorityFilter}-${key.typeFilter}-${key.tagFilter}-${key.searchQuery}-${key.page}`
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

// Get all stored issue IDs for a workspace
export const getStoredIssueIds = (workspaceId: string): string[] => {
  if (!isLocalStorageAvailable()) return []
  
  const ids: string[] = []
  const keys = getAllCacheKeys()
  
  keys.forEach(key => {
    if (key.includes('issue_')) {
      try {
        const stored = localStorage.getItem(key)
        if (!stored) return
        
        const entry = JSON.parse(stored) as StoredCacheEntry<IssueWithCreator>
        if (entry.data.workspace_id === workspaceId && entry.version === CACHE_VERSION) {
          const age = Date.now() - entry.timestamp
          if (age <= TTL_MS) {
            ids.push(entry.data.id)
          }
        }
      } catch {
        // Ignore corrupted entries
      }
    }
  })
  
  return ids
}

// Invalidate all list caches for a workspace
export const invalidateWorkspaceListCache = (workspaceId: string): void => {
  if (!isLocalStorageAvailable()) return
  
  const keys = getAllCacheKeys()
  keys.forEach(key => {
    if (key.includes(`list_${workspaceId}-`)) {
      localStorage.removeItem(key)
    }
  })
}