'use client'

import { ProfileSettings } from '@/components/settings/profile-settings'
import { WorkspaceWithMobileNav } from '@/components/layout/workspace-with-mobile-nav'
import { CommandPaletteProvider } from '@/hooks/use-command-palette'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'

const AppCommandPalette = dynamic(
  () => import('@/components/layout/app-command-palette').then(mod => ({ default: mod.AppCommandPalette })),
  { ssr: false }
)

export default function UserSettingsPage() {
  const [workspace, setWorkspace] = useState<{
    id: string
    name: string
    slug: string
    avatar_url: string | null
    owner_id: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDefaultWorkspace = async () => {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        notFound()
      }

      // Get user's first workspace (for navigation context)
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('id, name, slug, avatar_url, owner_id')
        .eq('owner_id', user.id)
        .limit(1)
        .single()

      if (workspaces) {
        setWorkspace(workspaces)
      }
      setLoading(false)
    }

    fetchDefaultWorkspace()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!workspace) {
    notFound()
  }

  return (
    <CommandPaletteProvider>
      <WorkspaceWithMobileNav workspace={workspace}>
        <div className="max-w-4xl mx-auto p-6">
          <ProfileSettings />
        </div>
      </WorkspaceWithMobileNav>
      {workspace && <AppCommandPalette workspace={workspace} />}
    </CommandPaletteProvider>
  )
}