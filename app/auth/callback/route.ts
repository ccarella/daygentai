import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Check if user has a profile
        const { data: profile } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          // Check if user has a workspace
          const { data: workspace } = await supabase
            .from('workspaces')
            .select('slug')
            .eq('owner_id', user.id)
            .single()
          
          if (workspace) {
            // User has both profile and workspace, redirect to workspace
            return NextResponse.redirect(`${origin}/${workspace.slug}`)
          } else {
            // User has profile but no workspace
            return NextResponse.redirect(`${origin}/CreateWorkspace`)
          }
        }
      }
    }
  }

  // Default: redirect to create user (for new users)
  return NextResponse.redirect(`${origin}/CreateUser`)
}