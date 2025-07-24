import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaces } from '@/lib/supabase/workspaces'
import LandingPageClient from './landing-page-client'

export default async function Home(props: {
  searchParams: Promise<{ code?: string }>
}) {
  const searchParams = await props.searchParams
  
  // If there's an auth code in the URL, redirect to the callback route
  if (searchParams.code) {
    redirect(`/auth/callback?code=${searchParams.code}`)
  }
  
  // Check if user is authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    // Check if user has a profile
    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      redirect('/CreateUser')
    }
    
    // Check if user has workspaces
    const workspaces = await getUserWorkspaces()
    
    if (!workspaces || workspaces.length === 0) {
      redirect('/CreateWorkspace')
    }
    
    // Redirect to first workspace (we know workspaces[0] exists from the check above)
    const firstWorkspace = workspaces[0]
    if (firstWorkspace) {
      redirect(`/${firstWorkspace.slug}`)
    }
    
    // Fallback to CreateWorkspace if somehow no workspace exists
    redirect('/CreateWorkspace')
  }
  
  return <LandingPageClient />;
}