import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/workspace'
  
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/?error=auth_failed`)
    }

    return NextResponse.redirect(`${requestUrl.origin}${next}`)
  }

  // No code provided - redirect to home with error
  return NextResponse.redirect(`${requestUrl.origin}/?error=no_code`)
}