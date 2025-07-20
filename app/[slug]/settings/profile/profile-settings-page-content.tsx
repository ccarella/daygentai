'use client'

import { WorkspaceWithMobileNav } from '@/components/layout/workspace-with-mobile-nav'
import { ProfileSettings } from '@/components/settings/profile-settings'
import { CommandPaletteProvider } from '@/hooks/use-command-palette'
import dynamic from 'next/dynamic'

const AppCommandPalette = dynamic(
  () => import('@/components/layout/app-command-palette').then(mod => ({ default: mod.AppCommandPalette })),
  { ssr: false }
)

interface ProfileSettingsPageContentProps {
  workspace: {
    id: string
    name: string
    slug: string
    avatar_url: string | null
    owner_id: string
  }
}

export function ProfileSettingsPageContent({ workspace }: ProfileSettingsPageContentProps) {
  return (
    <CommandPaletteProvider>
      <WorkspaceWithMobileNav workspace={workspace}>
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Profile Settings</h1>
            <p className="text-gray-600">Manage your personal information and preferences</p>
          </div>
          
          <ProfileSettings />
        </div>
      </WorkspaceWithMobileNav>
      {workspace && <AppCommandPalette workspace={workspace} />}
    </CommandPaletteProvider>
  )
}