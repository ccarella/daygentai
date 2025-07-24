import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/?error=auth_failed`)
    }

    // If next parameter is provided, use it
    if (next) {
      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    }

    // Otherwise, check if user has profile and workspaces
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.redirect(`${requestUrl.origin}/?error=no_user`)
    }

    // Check if user has a profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!userProfile) {
      // No profile - redirect to create profile
      return NextResponse.redirect(`${requestUrl.origin}/CreateUser`)
    }

    // Check if user has workspaces
    const { data: workspaces } = await supabase
      .from('workspace_members')
      .select(`
        workspace:workspaces!inner(
          slug
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1) as { data: Array<{ workspace: { slug: string } | Array<{ slug: string }> }> | null }

    if (!workspaces || workspaces.length === 0) {
      // Has profile but no workspaces - redirect to create workspace
      return NextResponse.redirect(`${requestUrl.origin}/CreateWorkspace`)
    }

    // Has profile and workspaces - redirect to first workspace
    const firstWorkspace = workspaces[0]
    if (firstWorkspace && firstWorkspace.workspace) {
      const workspaceSlug = Array.isArray(firstWorkspace.workspace) 
        ? firstWorkspace.workspace[0]?.slug 
        : firstWorkspace.workspace.slug

      if (workspaceSlug) {
        return NextResponse.redirect(`${requestUrl.origin}/${workspaceSlug}`)
      }
    }

    // Fallback to create workspace if something went wrong
    return NextResponse.redirect(`${requestUrl.origin}/CreateWorkspace`)
  }

  // No code provided - redirect to home with error
  return NextResponse.redirect(`${requestUrl.origin}/?error=no_code`)
}