import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  console.log('[Auth Callback] Starting auth callback')
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  
  console.log('[Auth Callback] Request URL:', requestUrl.toString())
  console.log('[Auth Callback] Code:', code ? 'Present' : 'Missing')
  console.log('[Auth Callback] Origin:', origin)

  if (code) {
    console.log('[Auth Callback] Exchanging code for session')
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      console.log('[Auth Callback] Code exchange successful')
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser()
      console.log('[Auth Callback] User:', user ? `Found (${user.id})` : 'Not found')
      
      if (user) {
        // Check if user has a profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single()
        
        console.log('[Auth Callback] Profile check:', profile ? 'Found' : 'Not found', profileError ? `Error: ${profileError.message}` : '')
        
        if (profile) {
          // Check if user has a workspace
          const { data: workspace, error: workspaceError } = await supabase
            .from('workspaces')
            .select('slug')
            .eq('owner_id', user.id)
            .single()
          
          console.log('[Auth Callback] Workspace check:', workspace ? `Found (${workspace.slug})` : 'Not found', workspaceError ? `Error: ${workspaceError.message}` : '')
          
          if (workspace) {
            // User has both profile and workspace, redirect to workspace
            console.log('[Auth Callback] Redirecting to workspace:', `${origin}/${workspace.slug}`)
            return NextResponse.redirect(`${origin}/${workspace.slug}`)
          } else {
            // User has profile but no workspace
            console.log('[Auth Callback] Redirecting to CreateWorkspace')
            return NextResponse.redirect(`${origin}/CreateWorkspace`)
          }
        }
      }
    } else {
      console.error('[Auth Callback] Code exchange failed:', error.message)
    }
  } else {
    console.log('[Auth Callback] No code parameter found')
  }

  // Default: redirect to create user (for new users)
  console.log('[Auth Callback] Redirecting to CreateUser (default)')
  return NextResponse.redirect(`${origin}/CreateUser`)
}