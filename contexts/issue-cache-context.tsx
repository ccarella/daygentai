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

interface IssueCacheContextType {
  getIssue: (issueId: string) => IssueWithCreator | null
  preloadIssue: (issueId: string) => Promise<void>
  preloadIssues: (issueIds: string[]) => Promise<void>
  clearCache: () => void
}

const IssueCacheContext = createContext<IssueCacheContextType | undefined>(undefined)

export function IssueCacheProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<Map<string, IssueWithCreator>>(new Map())
  const [loadingIssues, setLoadingIssues] = useState<Set<string>>(new Set())

  const getIssue = useCallback((issueId: string): IssueWithCreator | null => {
    return cache.get(issueId) || null
  }, [cache])

  const preloadIssue = useCallback(async (issueId: string) => {
    // Skip if already cached or currently loading
    if (cache.has(issueId) || loadingIssues.has(issueId)) {
      return
    }

    setLoadingIssues(prev => new Set(prev).add(issueId))

    try {
      const supabase = createClient()

      // Fetch issue
      const { data: issue, error } = await supabase
        .from('issues')
        .select('*')
        .eq('id', issueId)
        .single()

      if (!error && issue) {
        setCache(prev => new Map(prev).set(issueId, issue as IssueWithCreator))
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

    try {
      const supabase = createClient()

      // Batch fetch all issues
      const { data: issues, error } = await supabase
        .from('issues')
        .select('*')
        .in('id', issuesToLoad)

      if (!error && issues) {
        setCache(prev => {
          const newCache = new Map(prev)
          issues.forEach(issue => {
            newCache.set(issue.id, issue as IssueWithCreator)
          })
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
    setCache(new Map())
  }, [])

  return (
    <IssueCacheContext.Provider value={{ getIssue, preloadIssue, preloadIssues, clearCache }}>
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