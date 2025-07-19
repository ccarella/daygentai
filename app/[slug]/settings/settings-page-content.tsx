'use client'

import { WorkspaceWithMobileNav } from '@/components/layout/workspace-with-mobile-nav'
import { ApiSettings } from '@/components/settings/api-settings'
import { ProfileSettings } from '@/components/settings/profile-settings'
import { CommandPaletteProvider } from '@/hooks/use-command-palette'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
    <CommandPaletteProvider>
      <WorkspaceWithMobileNav workspace={workspace}>
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Settings</h1>
            <p className="text-gray-600">Manage your profile and workspace configuration</p>
          </div>
          
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="workspace">Workspace</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="mt-6">
              <ProfileSettings />
            </TabsContent>
            
            <TabsContent value="workspace" className="mt-6">
              <ApiSettings 
                workspaceId={workspace.id}
                initialSettings={settings}
              />
            </TabsContent>
          </Tabs>
        </div>
      </WorkspaceWithMobileNav>
      {workspace && <AppCommandPalette workspace={workspace} />}
    </CommandPaletteProvider>
  )
}