import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  
  const pathname = request.nextUrl.pathname

  // Protected routes that require authentication
  const protectedRoutes = ['/success', '/CreateUser', '/CreateWorkspace']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  // Check if this is a workspace route (not one of the special routes)
  const isWorkspaceRoute = pathname !== '/' && 
    !pathname.startsWith('/auth') && 
    !pathname.startsWith('/CreateUser') && 
    !pathname.startsWith('/CreateWorkspace') && 
    !pathname.startsWith('/success') &&
    !pathname.startsWith('/_next') &&
    !pathname.includes('.')

  if ((isProtectedRoute || isWorkspaceRoute) && !user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If user is authenticated, check their profile and workspace status
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    // Redirect logic based on user's progress
    if (pathname === '/CreateUser' && profile) {
      // User already has profile, send to workspace creation or success
      return NextResponse.redirect(new URL(workspace ? '/success' : '/CreateWorkspace', request.url))
    }

    if (pathname === '/CreateWorkspace') {
      // If no profile, redirect to create user first
      if (!profile) {
        return NextResponse.redirect(new URL('/CreateUser', request.url))
      }
      // If already has workspace, redirect to success
      if (workspace) {
        return NextResponse.redirect(new URL('/success', request.url))
      }
    }

    if (pathname === '/success') {
      // Ensure user has both profile and workspace
      if (!profile) {
        return NextResponse.redirect(new URL('/CreateUser', request.url))
      }
      if (!workspace) {
        return NextResponse.redirect(new URL('/CreateWorkspace', request.url))
      }
    }

    // If accessing a workspace route, ensure user has profile and workspace
    if (isWorkspaceRoute) {
      if (!profile) {
        return NextResponse.redirect(new URL('/CreateUser', request.url))
      }
      if (!workspace) {
        return NextResponse.redirect(new URL('/CreateWorkspace', request.url))
      }
    }
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