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
      // Successfully authenticated, redirect to workspace loading page
      // which will handle the routing based on user's profile/workspace status
      return NextResponse.redirect(`${origin}/workspace`)
    }
  }

  // Authentication failed or no code, redirect to home
  return NextResponse.redirect(`${origin}/`)
}