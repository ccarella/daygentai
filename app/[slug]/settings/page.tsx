import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsPageContent } from './settings-page-content'

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
    <SettingsPageContent
      workspace={workspace}
      initialSettings={{
        api_key: workspaceData.api_key,
        api_provider: workspaceData.api_provider,
        agents_content: workspaceData.agents_content
      }}
    />
  )
}