import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RateLimiter } from '@/lib/llm/rate-limit/rate-limiter'

export interface RateLimitOptions {
  /**
   * Rate limits per time window
   */
  limits?: {
    minuteLimit?: number
    hourLimit?: number
    dayLimit?: number
  }
  /**
   * Custom error message
   */
  errorMessage?: string
  /**
   * Whether to use workspace-based rate limiting (default: true)
   */
  useWorkspaceLimit?: boolean
  /**
   * Function to extract workspace ID from request
   */
  getWorkspaceId?: (req: NextRequest) => string | null
}

/**
 * Rate limiting middleware for API endpoints
 * 
 * @param handler - The request handler function
 * @param options - Rate limiting options
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: RateLimitOptions = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const {
      limits = {},
      errorMessage = 'Too many requests. Please try again later.',
      useWorkspaceLimit = true,
      getWorkspaceId
    } = options

    try {
      // Get authenticated user
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      let rateLimitKey: string

      if (useWorkspaceLimit) {
        // Get workspace ID using custom function or default methods
        let workspaceId: string | null = null
        
        if (getWorkspaceId) {
          // Use custom workspace ID extractor
          workspaceId = getWorkspaceId(req)
        } else {
          // Default: try query params first (doesn't consume body)
          const { searchParams } = new URL(req.url)
          workspaceId = searchParams.get('workspaceId')
          
          // If not in query params, try to extract from body
          if (!workspaceId) {
            try {
              const body = await req.clone().json()
              workspaceId = body.workspaceId
            } catch {
              // Body parsing failed, continue without workspace ID
            }
          }
        }

        if (!workspaceId) {
          return NextResponse.json(
            { error: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        // Verify user has access to workspace
        const { data: member } = await supabase
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('user_id', user.id)
          .single()

        if (!member) {
          return NextResponse.json(
            { error: 'Access denied to workspace' },
            { status: 403 }
          )
        }

        rateLimitKey = workspaceId
      } else {
        // Use user ID for rate limiting
        rateLimitKey = user.id
      }

      // Create rate limiter with custom limits
      const rateLimiter = new RateLimiter(limits)
      
      // Check rate limits
      const rateLimitStatus = await rateLimiter.checkRateLimit(rateLimitKey)
      
      if (!rateLimitStatus.allowed) {
        // Find which limit was exceeded
        const exceededLimits = []
        if (rateLimitStatus.remaining.minute === 0) exceededLimits.push('minute')
        if (rateLimitStatus.remaining.hour === 0) exceededLimits.push('hour')
        if (rateLimitStatus.remaining.day === 0) exceededLimits.push('day')
        
        const resetTime = exceededLimits.includes('minute') 
          ? rateLimitStatus.resetAt.minute
          : exceededLimits.includes('hour')
          ? rateLimitStatus.resetAt.hour
          : rateLimitStatus.resetAt.day

        return NextResponse.json(
          { 
            error: errorMessage,
            retryAfter: Math.ceil((resetTime.getTime() - Date.now()) / 1000)
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': String(limits.minuteLimit || 10),
              'X-RateLimit-Remaining': String(rateLimitStatus.remaining.minute),
              'X-RateLimit-Reset': String(Math.floor(resetTime.getTime() / 1000)),
              'Retry-After': String(Math.ceil((resetTime.getTime() - Date.now()) / 1000))
            }
          }
        )
      }

      // Increment rate limit counter BEFORE processing request
      // This prevents abuse through failed requests
      await rateLimiter.incrementCounter(rateLimitKey)
      
      // Process the request
      let response: NextResponse
      try {
        response = await handler(req)
      } catch (handlerError) {
        // Even if the handler fails, the rate limit was already counted
        // This prevents retry abuse
        throw handlerError
      }
      
      // Add rate limit headers to successful response
      const headers = new Headers(response.headers)
      headers.set('X-RateLimit-Limit', String(limits.minuteLimit || 10))
      headers.set('X-RateLimit-Remaining', String(rateLimitStatus.remaining.minute))
      headers.set('X-RateLimit-Reset', String(Math.floor(rateLimitStatus.resetAt.minute.getTime() / 1000)))
      
      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      })
      
    } catch (error) {
      // Log error but don't expose internal details
      console.error('[Rate Limit Middleware] Error:', error)
      
      // If it's a known error response, return it
      if (error instanceof NextResponse) {
        return error
      }
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}