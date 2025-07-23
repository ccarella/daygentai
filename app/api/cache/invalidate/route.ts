import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { invalidateUserCache } from '@/middleware'
import { withTimeout, timeoutConfig } from '@/lib/middleware/timeout'
import { 
  withErrorHandler, 
  createUnauthorizedError, 
  createForbiddenError,
  createInternalServerError 
} from '@/lib/middleware/error-handler'

async function handlePOST(request: NextRequest) {
  try {
    // Create Supabase client to verify authentication
    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {
            // We don't need to set cookies for this endpoint
          },
        },
      }
    )

    // Verify the user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return createUnauthorizedError()
    }

    // Parse request body
    const body = await request.json()
    const { userId } = body

    // Only allow users to invalidate their own cache
    if (userId && userId !== user.id) {
      return createForbiddenError('Can only invalidate your own cache')
    }

    // Invalidate the cache
    invalidateUserCache(userId || user.id)

    // Also set a response header to signal cache invalidation
    const response = NextResponse.json({ success: true })
    response.headers.set('X-Cache-Invalidated', 'true')
    
    return response
  } catch (error) {
    console.error('Error in cache invalidation:', error)
    return createInternalServerError()
  }
}

// Export the wrapped handler with timeout and error handling
export const POST = withTimeout(withErrorHandler(handlePOST), timeoutConfig.quick)