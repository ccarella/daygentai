'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface WorkspaceData {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  owner_id: string
  hasApiKey: boolean
  apiProvider: string | null
  agentsContent: string | null
}

interface WorkspaceContextType {
  workspace: WorkspaceData | null
  currentUserRole: 'owner' | 'admin' | 'member' | 'viewer' | null
  isLoading: boolean
  refreshWorkspace: () => Promise<void>
  updateApiKeyStatus: (hasKey: boolean, provider?: string | null, agentsContent?: string | null) => void
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
      hasApiKey: false,
      apiProvider: null,
      agentsContent: null,
      ...initialWorkspace
    } : null
  )
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'admin' | 'member' | 'viewer' | null>(null)
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
          api_key, 
          api_provider, 
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
      
      // Extract user role from workspace_members array
      const userRole = workspaceData.workspace_members?.[0]?.role || null
      
      setWorkspace({
        id: workspaceData.id,
        name: workspaceData.name,
        slug: workspaceData.slug,
        avatar_url: workspaceData.avatar_url,
        owner_id: workspaceData.owner_id,
        hasApiKey: !!(workspaceData.api_key && workspaceData.api_key.length > 0),
        apiProvider: workspaceData.api_provider,
        agentsContent: workspaceData.agents_content
      })
      setCurrentUserRole(userRole)
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
      // If we have initial workspace data, we still need to check API key status
      const checkApiKey = async () => {
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
              api_key, 
              api_provider, 
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
            const userRole = workspaceData.workspace_members?.[0]?.role || null
            setWorkspace(prev => prev ? {
              ...prev,
              hasApiKey: !!(workspaceData.api_key && workspaceData.api_key.length > 0),
              apiProvider: workspaceData.api_provider,
              agentsContent: workspaceData.agents_content
            } : null)
            setCurrentUserRole(userRole)
          }
        } catch (error) {
          console.error('Error checking API key:', error)
        } finally {
          setIsLoading(false)
        }
      }
      
      checkApiKey()
    }
  }, [workspaceId, initialWorkspace])

  const refreshWorkspace = async () => {
    await fetchWorkspaceData()
  }

  const updateApiKeyStatus = (hasKey: boolean, provider?: string | null, agentsContent?: string | null) => {
    setWorkspace(prev => prev ? {
      ...prev,
      hasApiKey: hasKey,
      apiProvider: provider !== undefined ? provider : prev.apiProvider,
      agentsContent: agentsContent !== undefined ? agentsContent : prev.agentsContent
    } : null)
  }

  return (
    <WorkspaceContext.Provider value={{ workspace, currentUserRole, isLoading, refreshWorkspace, updateApiKeyStatus }}>
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