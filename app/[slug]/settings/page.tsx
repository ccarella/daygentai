import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WorkspaceWithMobileNav } from '@/components/layout/workspace-with-mobile-nav'
import { ApiSettings } from '@/components/settings/api-settings'

interface SettingsPageProps {
  params: Promise<{ slug: string }>
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { slug } = await params
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    notFound()
  }
  
  // Get workspace
  const { data: workspaceData, error } = await supabase
    .from('workspaces')
    .select('id, name, slug, avatar_url, owner_id, api_key, api_provider, agents_content')
    .eq('slug', slug)
    .single()
  
  if (error || !workspaceData) {
    notFound()
  }
  
  const workspace = {
    id: workspaceData.id,
    name: workspaceData.name,
    slug: workspaceData.slug,
    avatar_url: workspaceData.avatar_url,
    owner_id: workspaceData.owner_id
  }
  
  return (
    <WorkspaceWithMobileNav 
      workspace={workspace}
      mobileNavOpen={false}
      onMobileNavToggle={() => {}}
    >
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Workspace Settings</h1>
          <p className="text-gray-600">Manage your workspace configuration and integrations</p>
        </div>
        
        <ApiSettings 
          workspaceId={workspace.id}
          initialSettings={{
            api_key: workspaceData.api_key,
            api_provider: workspaceData.api_provider,
            agents_content: workspaceData.agents_content
          }}
        />
      </div>
    </WorkspaceWithMobileNav>
  )
}