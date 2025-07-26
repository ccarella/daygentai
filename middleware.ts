import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseConfig } from './lib/supabase/config'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Early exit for static assets and API routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') || // Any file with extension
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const config = getSupabaseConfig()
  const supabase = createServerClient(
    config.url,
    config.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes that require authentication
  const protectedRoutes = ['/CreateUser', '/CreateWorkspace']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  // Check if this is a workspace route (dynamic routes)
  const isWorkspaceRoute = pathname !== '/' && 
    !pathname.startsWith('/auth') && 
    !pathname.startsWith('/CreateUser') && 
    !pathname.startsWith('/CreateWorkspace') && 
    !pathname.startsWith('/checkemail')

  // If accessing protected route or workspace without auth, redirect to home
  if ((isProtectedRoute || isWorkspaceRoute) && !user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}