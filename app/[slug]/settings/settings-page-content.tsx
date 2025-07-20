'use client'

import { WorkspaceWithMobileNav } from '@/components/layout/workspace-with-mobile-nav'
import { ApiSettings } from '@/components/settings/api-settings'
import { CommandPaletteProvider } from '@/hooks/use-command-palette'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import dynamic from 'next/dynamic'

const AppCommandPalette = dynamic(
  () => import('@/components/layout/app-command-palette').then(mod => ({ default: mod.AppCommandPalette })),
  { ssr: false }
)

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

export function SettingsPageContent({ workspace, initialSettings }: SettingsPageContentProps) {
  // Filter out null values
  const settings: { api_key?: string; api_provider?: string; agents_content?: string } = {}
  if (initialSettings.api_key) settings.api_key = initialSettings.api_key
  if (initialSettings.api_provider) settings.api_provider = initialSettings.api_provider
  if (initialSettings.agents_content) settings.agents_content = initialSettings.agents_content

  return (
    <WorkspaceProvider workspaceId={workspace.id} initialWorkspace={workspace}>
      <CommandPaletteProvider>
        <WorkspaceWithMobileNav workspace={workspace}>
          <div className="max-w-4xl mx-auto p-6">
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-2">Workspace Settings</h1>
              <p className="text-muted-foreground">Manage your workspace configuration and integrations</p>
            </div>
            
            <ApiSettings 
              workspaceId={workspace.id}
              initialSettings={settings}
            />
          </div>
        </WorkspaceWithMobileNav>
        {workspace && <AppCommandPalette workspace={workspace} />}
      </CommandPaletteProvider>
    </WorkspaceProvider>
  )
}