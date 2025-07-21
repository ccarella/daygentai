import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const CACHE_VERSION = 1

interface CacheEntry<T> {
  data: T
  timestamp: number
  version: number
}

interface UserProfile {
  id: string
  hasProfile: boolean
  hasWorkspace: boolean
}

// Simple in-memory LRU cache implementation
class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map()
  private maxSize: number
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize
    this.startPeriodicCleanup()
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if expired or wrong version
    const age = Date.now() - entry.timestamp
    if (age > CACHE_TTL || entry.version !== CACHE_VERSION) {
      this.cache.delete(key)
      return null
    }

    // Move to end (most recently used) atomically
    // JavaScript Map operations are synchronous, so this is safe
    // We store the data first to avoid any potential issues
    const data = entry.data
    
    // Delete and re-insert to move to end of iteration order
    this.cache.delete(key)
    this.cache.set(key, entry)
    
    return data
  }

  set(key: string, data: T): void {
    // Check if key already exists (update scenario)
    const isUpdate = this.cache.has(key)
    
    // Only need to make room if adding new key and at capacity
    if (!isUpdate && this.cache.size >= this.maxSize) {
      // Remove oldest entries until we have room
      // In practice, we only need to remove one, but this ensures size limit
      while (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value
        if (firstKey) {
          this.cache.delete(firstKey)
        } else {
          break // Safety check to prevent infinite loop
        }
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION
    })
    
    // Ensure we never exceed maxSize (defensive check)
    if (this.cache.size > this.maxSize) {
      console.error(`Cache size ${this.cache.size} exceeds max ${this.maxSize}`)
    }
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }

    // Remove entries matching pattern
    // Use exact matching to prevent unintended invalidations
    // e.g., "user:123" won't match "user:1234"
    for (const key of this.cache.keys()) {
      if (key === pattern || key.startsWith(pattern + ':')) {
        this.cache.delete(key)
      }
    }
  }

  private startPeriodicCleanup(): void {
    // Run cleanup every minute
    const CLEANUP_INTERVAL = 60 * 1000 // 1 minute
    
    // Clear any existing interval (safety measure)
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    // Set up periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.removeExpiredEntries()
    }, CLEANUP_INTERVAL)
    
    // In Node.js environments, allow the process to exit even if interval is active
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }
  
  private removeExpiredEntries(): void {
    const now = Date.now()
    let removedCount = 0
    
    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp
      if (age > CACHE_TTL || entry.version !== CACHE_VERSION) {
        this.cache.delete(key)
        removedCount++
      }
    }
    
    // Log cleanup activity (only if entries were removed)
    if (removedCount > 0) {
      console.log(`Cache cleanup: removed ${removedCount} expired entries`)
    }
  }
  
  // Clean up method for graceful shutdown
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.cache.clear()
  }
}

// Global cache instance (persists across requests in the same process)
const userCache = new LRUCache<UserProfile>()

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

  const supabase = createServerClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
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
  const protectedRoutes = ['/success', '/CreateUser', '/CreateWorkspace']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  // Check if this is a workspace route (not one of the special routes)
  const isWorkspaceRoute = pathname !== '/' && 
    !pathname.startsWith('/auth') && 
    !pathname.startsWith('/CreateUser') && 
    !pathname.startsWith('/CreateWorkspace') && 
    !pathname.startsWith('/success') &&
    !pathname.startsWith('/checkemail')

  if ((isProtectedRoute || isWorkspaceRoute) && !user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If user is authenticated, check their profile and workspace status
  if (user) {
    const cacheKey = `user:${user.id}`
    
    // Try to get from cache first
    let userProfile = userCache.get(cacheKey)
    
    if (!userProfile) {
      // Cache miss - fetch from database
      try {
        const [profileResult, workspaceResult] = await Promise.all([
          supabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .single(),
          supabase
            .from('workspace_members')
            .select('workspace_id')
            .eq('user_id', user.id)
            .limit(1)
        ])

        userProfile = {
          id: user.id,
          hasProfile: !!profileResult.data,
          hasWorkspace: (workspaceResult.data?.length ?? 0) > 0
        }

        // Store in cache only if queries succeeded
        userCache.set(cacheKey, userProfile)
      } catch (error) {
        // Database error - log and continue without caching
        console.error('Middleware database error:', error)
        
        // Fallback: assume user has no profile/workspace to force onboarding flow
        // This is the safest default that won't lock users out
        userProfile = {
          id: user.id,
          hasProfile: false,
          hasWorkspace: false
        }
        
        // Don't cache error states
      }
    }

    const { hasProfile, hasWorkspace } = userProfile

    // Redirect logic based on user's progress
    if (pathname === '/CreateUser' && hasProfile) {
      // User already has profile, send to workspace creation or success
      return NextResponse.redirect(new URL(hasWorkspace ? '/success' : '/CreateWorkspace', request.url))
    }

    if (pathname === '/CreateWorkspace') {
      // If no profile, redirect to create user first
      if (!hasProfile) {
        return NextResponse.redirect(new URL('/CreateUser', request.url))
      }
      // If already has workspace, redirect to success
      if (hasWorkspace) {
        return NextResponse.redirect(new URL('/success', request.url))
      }
    }

    if (pathname === '/success') {
      // Ensure user has both profile and workspace
      if (!hasProfile) {
        return NextResponse.redirect(new URL('/CreateUser', request.url))
      }
      if (!hasWorkspace) {
        return NextResponse.redirect(new URL('/CreateWorkspace', request.url))
      }
    }

    // If accessing a workspace route, ensure user has profile
    if (isWorkspaceRoute) {
      if (!hasProfile) {
        return NextResponse.redirect(new URL('/CreateUser', request.url))
      }
      // For workspace routes, we'll check access in the page components
      // Don't require workspace ownership here since users can be members of workspaces they don't own
    }
    
    // If authenticated user is on home page, redirect to workspace loading page
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/workspace', request.url))
    }
  }

  return supabaseResponse
}

// Export cache invalidation function for use in API routes
export function invalidateUserCache(userId?: string) {
  if (userId) {
    userCache.invalidate(`user:${userId}`)
  } else {
    userCache.invalidate()
  }
}

// Export cache for testing purposes
export const _testUserCache = userCache

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