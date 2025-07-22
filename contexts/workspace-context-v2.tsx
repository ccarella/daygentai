'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface WorkspaceData {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  owner_id: string
  agentsContent: string | null
}

interface WorkspaceContextType {
  workspace: WorkspaceData | null
  isLoading: boolean
  refreshWorkspace: () => Promise<void>
  updateAgentsContent: (agentsContent: string | null) => void
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export function WorkspaceProvider({ 
  children, 
  workspaceId,
  initialWorkspace 
}: { 
  children: ReactNode
  workspaceId: string
  initialWorkspace?: Partial<WorkspaceData>
}) {
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(
    initialWorkspace ? {
      id: workspaceId,
      name: initialWorkspace.name || '',
      slug: initialWorkspace.slug || '',
      avatar_url: initialWorkspace.avatar_url || null,
      owner_id: initialWorkspace.owner_id || '',
      agentsContent: initialWorkspace.agentsContent || null,
      ...initialWorkspace
    } : null
  )
  const [isLoading, setIsLoading] = useState(!initialWorkspace)

  const fetchWorkspaceData = async () => {
    try {
      const supabase = createClient()
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        return
      }
      
      // Check if user has access to workspace through membership
      const { data: workspaceData, error } = await supabase
        .from('workspaces')
        .select(`
          id, 
          name, 
          slug, 
          avatar_url, 
          owner_id, 
          agents_content,
          workspace_members!inner (
            user_id,
            role
          )
        `)
        .eq('id', workspaceId)
        .eq('workspace_members.user_id', session.user.id)
        .single()
      
      if (error || !workspaceData) {
        return
      }
      
      setWorkspace({
        id: workspaceData.id,
        name: workspaceData.name,
        slug: workspaceData.slug,
        avatar_url: workspaceData.avatar_url,
        owner_id: workspaceData.owner_id,
        agentsContent: workspaceData.agents_content
      })
    } catch (error) {
      console.error('Error fetching workspace data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!initialWorkspace) {
      fetchWorkspaceData()
    } else {
      // If we have initial workspace data, we still need to fetch agents content
      const fetchAgentsContent = async () => {
        try {
          const supabase = createClient()
          
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          if (sessionError || !session) {
            return
          }
          
          // Check if user has access to workspace through membership
          const { data: workspaceData, error } = await supabase
            .from('workspaces')
            .select(`
              agents_content,
              workspace_members!inner (
                user_id,
                role
              )
            `)
            .eq('id', workspaceId)
            .eq('workspace_members.user_id', session.user.id)
            .single()
          
          if (!error && workspaceData) {
            setWorkspace(prev => prev ? {
              ...prev,
              agentsContent: workspaceData.agents_content
            } : null)
          }
        } catch (error) {
          console.error('Error fetching agents content:', error)
        } finally {
          setIsLoading(false)
        }
      }
      
      fetchAgentsContent()
    }
  }, [workspaceId, initialWorkspace])

  const refreshWorkspace = async () => {
    await fetchWorkspaceData()
  }

  const updateAgentsContent = (agentsContent: string | null) => {
    setWorkspace(prev => prev ? {
      ...prev,
      agentsContent: agentsContent
    } : null)
  }

  return (
    <WorkspaceContext.Provider value={{ workspace, isLoading, refreshWorkspace, updateAgentsContent }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}