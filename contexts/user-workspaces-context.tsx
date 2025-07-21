'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUserProfile } from './user-profile-context'
import type { UserWorkspace } from '@/lib/supabase/workspaces'

interface UserWorkspacesContextType {
  workspaces: UserWorkspace[]
  loading: boolean
  refreshWorkspaces: () => Promise<void>
}

const UserWorkspacesContext = createContext<UserWorkspacesContextType | undefined>(undefined)

export function UserWorkspacesProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<UserWorkspace[]>([])
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef(false)
  const lastFetchRef = useRef<number>(0)
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  
  const { user } = useUserProfile()
  const supabase = createClient()

  const fetchWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([])
      setLoading(false)
      return
    }

    // Check if we recently fetched
    const now = Date.now()
    if (now - lastFetchRef.current < CACHE_DURATION && workspaces.length > 0) {
      return
    }

    // Prevent duplicate fetches
    if (fetchingRef.current) return
    fetchingRef.current = true
    
    try {
      setLoading(true)
      
      const { data: workspacesData, error } = await supabase
        .from('workspace_members')
        .select(`
          role,
          created_at,
          workspace:workspaces!inner(
            id,
            name,
            slug,
            avatar_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('Error fetching workspaces:', error)
        return
      }
      
      if (workspacesData) {
        const transformedWorkspaces = workspacesData
          .map((item: { 
            workspace: { id: string; name: string; slug: string; avatar_url: string | null } | 
                      Array<{ id: string; name: string; slug: string; avatar_url: string | null }>;
            role: string;
            created_at: string;
          }) => {
            // Handle both array and object formats for workspace
            let workspace: { id: string; name: string; slug: string; avatar_url: string | null } | undefined
            if (Array.isArray(item.workspace)) {
              workspace = item.workspace[0]
            } else {
              workspace = item.workspace
            }
            
            if (!workspace) return null
            return {
              id: workspace.id,
              name: workspace.name,
              slug: workspace.slug,
              avatar_url: workspace.avatar_url,
              role: item.role,
              created_at: item.created_at
            }
          })
          .filter((workspace): workspace is UserWorkspace => workspace !== null)
        
        setWorkspaces(transformedWorkspaces)
        lastFetchRef.current = now
      }
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [user, supabase, workspaces.length])

  const refreshWorkspaces = useCallback(async () => {
    // Force refresh by clearing the cache time
    lastFetchRef.current = 0
    await fetchWorkspaces()
  }, [fetchWorkspaces])

  useEffect(() => {
    fetchWorkspaces()
  }, [user?.id]) // Only refetch when user ID changes

  // Subscribe to workspace changes
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('workspace-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_members',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          refreshWorkspaces()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspaces'
        },
        () => {
          refreshWorkspaces()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, supabase, refreshWorkspaces])

  return (
    <UserWorkspacesContext.Provider value={{ workspaces, loading, refreshWorkspaces }}>
      {children}
    </UserWorkspacesContext.Provider>
  )
}

export function useUserWorkspaces() {
  const context = useContext(UserWorkspacesContext)
  if (context === undefined) {
    throw new Error('useUserWorkspaces must be used within a UserWorkspacesProvider')
  }
  return context
}