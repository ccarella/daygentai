import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileSettingsPageContent } from './profile-settings-page-content'

export default async function ProfileSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/')
  }
  
  // Get workspace with user membership check
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select(`
      id, 
      name, 
      slug, 
      avatar_url, 
      owner_id,
      workspace_members!inner (
        user_id,
        role
      )
    `)
    .eq('slug', slug)
    .eq('workspace_members.user_id', user.id)
    .single()
  
  if (error || !workspace) {
    redirect('/')
  }
  
  return <ProfileSettingsPageContent workspace={workspace} />
}