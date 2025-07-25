'use client'

import { WorkspaceWithMobileNav } from '@/components/layout/workspace-with-mobile-nav'
import { ApiUsageDisplay } from '@/components/settings/api-usage-display'
import { DangerZoneSettings } from '@/components/settings/danger-zone-settings'
import { TeamMembers } from '@/components/settings/team-members'
import { useWorkspace } from '@/contexts/workspace-context'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

interface SettingsPageContentProps {
  workspace: {
    id: string
    name: string
    slug: string
    avatar_url: string | null
    owner_id: string
  }
  initialSettings: {
    api_key?: string | null
    api_provider?: string | null
    agents_content?: string | null
  }
}

export function SettingsPageContent({ workspace: serverWorkspace, initialSettings }: SettingsPageContentProps) {
  const { workspace, currentUserRole } = useWorkspace()
  const [isOwner, setIsOwner] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  
  // Use the workspace from context if available, otherwise fall back to server data
  const currentWorkspace = workspace || serverWorkspace
  
  // Check if current user is the owner
  useEffect(() => {
    const checkOwnership = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        setIsOwner(user.id === currentWorkspace?.owner_id)
      }
    }
    
    if (currentWorkspace) {
      checkOwnership()
    }
  }, [currentWorkspace])
  
  if (!currentWorkspace) return null
  
  // Filter out null values
  const settings: { api_key?: string; api_provider?: string; agents_content?: string } = {}
  if (initialSettings.api_key) settings.api_key = initialSettings.api_key
  if (initialSettings.api_provider) settings.api_provider = initialSettings.api_provider
  if (initialSettings.agents_content) settings.agents_content = initialSettings.agents_content

  return (
    <WorkspaceWithMobileNav workspace={currentWorkspace}>
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Workspace Settings</h1>
          <p className="text-muted-foreground">Manage your workspace configuration and integrations</p>
        </div>
        
        <TeamMembers
          workspaceId={currentWorkspace.id}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole || 'member'}
        />
        
        <ApiUsageDisplay workspaceId={currentWorkspace.id} />
        
        {isOwner && (
          <DangerZoneSettings workspaceId={currentWorkspace.id} />
        )}
      </div>
    </WorkspaceWithMobileNav>
  )
}