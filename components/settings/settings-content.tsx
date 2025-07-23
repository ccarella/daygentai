'use client'

import { ApiSettings } from '@/components/settings/api-settings'
import { DangerZoneSettings } from '@/components/settings/danger-zone-settings'
import { useWorkspace } from '@/contexts/workspace-context'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

interface SettingsContentProps {
  workspaceSlug: string
}

export function SettingsContent({ }: SettingsContentProps) {
  const { workspace } = useWorkspace()
  const [settings, setSettings] = useState<{
    api_key?: string | null | undefined
    api_provider?: string | null | undefined
    agents_content?: string | null | undefined
  }>({})
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    async function fetchSettings() {
      if (!workspace) return
      
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return
      
      // Check if user is owner
      setIsOwner(workspace.owner_id === user.id)
      
      // Fetch settings
      const { data } = await supabase
        .from('workspaces')
        .select('api_key, api_provider, agents_content')
        .eq('id', workspace.id)
        .single()
      
      if (data) {
        setSettings(data)
      }
    }
    
    fetchSettings()
  }, [workspace])

  if (!workspace) return null

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Settings</h1>
        <p className="text-muted-foreground">
          Manage your workspace settings and preferences
        </p>
      </div>
      
      <ApiSettings 
        workspaceId={workspace.id}
        {...(Object.keys(settings).length > 0 && {
          initialSettings: {
            ...(settings.api_key && { api_key: settings.api_key }),
            ...(settings.api_provider && { api_provider: settings.api_provider }),
            ...(settings.agents_content && { agents_content: settings.agents_content })
          }
        })}
      />
      
      {isOwner && (
        <DangerZoneSettings workspaceId={workspace.id} />
      )}
    </div>
  )
}