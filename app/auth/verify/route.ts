import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token = requestUrl.searchParams.get('token')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') || '/workspace'
  
  if (!token || type !== 'magiclink') {
    return NextResponse.redirect(`${requestUrl.origin}/?error=invalid_link`)
  }

  const supabase = await createClient()
  
  const { error } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: 'magiclink',
  })
  
  if (error) {
    console.error('Magic link verification error:', error)
    return NextResponse.redirect(`${requestUrl.origin}/?error=auth_failed`)
  }

  // Successful authentication
  return NextResponse.redirect(`${requestUrl.origin}${next}`)
}