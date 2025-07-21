import { NextRequest } from 'next/server'
import { createTimeoutError } from './error-handler'

export interface TimeoutConfig {
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 30000 // 30 seconds

// Request tracking to prevent memory leaks
// Using WeakMap ensures automatic garbage collection when requests are no longer referenced
// This prevents DoS attacks that could exhaust memory by creating many AbortControllers
const activeRequests = new WeakMap<NextRequest, {
  controller: AbortController
  timeoutId: NodeJS.Timeout
  startTime: number
}>()

// Cleanup function to ensure resources are freed
function cleanupRequest(req: NextRequest) {
  const tracking = activeRequests.get(req)
  if (tracking) {
    clearTimeout(tracking.timeoutId)
    activeRequests.delete(req)
  }
}

/**
 * Creates a timeout wrapper for API route handlers
 * @param handler - The original API route handler
 * @param config - Timeout configuration options
 * @returns Wrapped handler with timeout functionality
 */
export function withTimeout<T extends (...args: never[]) => Promise<Response>>(
  handler: T,
  config: TimeoutConfig = {}
): T {
  const { timeoutMs = DEFAULT_TIMEOUT_MS } = config

  const wrappedHandler = async (...args: Parameters<T>): Promise<Response> => {
    const req = (args as unknown[])[0] as NextRequest
    
    // Check if request is already being tracked (shouldn't happen in normal flow)
    if (activeRequests.has(req)) {
      console.warn('Request already has active timeout tracking')
      cleanupRequest(req)
    }
    
    // Create an AbortController for cancellation
    const controller = new AbortController()
    
    // Set up the timeout
    const timeoutId = setTimeout(() => {
      controller.abort()
      // Ensure cleanup happens after abort
      cleanupRequest(req)
    }, timeoutMs)
    
    // Track the request
    activeRequests.set(req, {
      controller,
      timeoutId,
      startTime: Date.now()
    })

    try {
      // Create a promise that rejects on timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('TIMEOUT'))
        })
      })

      // Race between the handler and timeout
      const response = await Promise.race([
        handler(...args),
        timeoutPromise
      ])

      // Clear timeout and tracking if request completed successfully
      cleanupRequest(req)
      
      return response
    } catch (error) {
      // Ensure cleanup on any error
      cleanupRequest(req)
      
      // Check if error is timeout-related
      if (error instanceof Error && error.message === 'TIMEOUT') {
        const tracking = activeRequests.get(req)
        const duration = tracking ? Date.now() - tracking.startTime : timeoutMs
        
        console.warn(`API request timeout after ${duration}ms:`, {
          method: req.method,
          url: req.url,
          userAgent: req.headers.get('user-agent'),
          timestamp: new Date().toISOString(),
          configured: timeoutMs
        })
        
        return createTimeoutError(timeoutMs, 'operation')
      }
      
      // Re-throw non-timeout errors
      throw error
    }
  }

  return wrappedHandler as T
}

/**
 * Creates a timeout for external API calls (like OpenAI)
 * @param promise - The promise to add timeout to
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Custom error message
 * @returns Promise that rejects if timeout is reached
 */
export async function withExternalTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 60000, // 60 seconds for external APIs
  errorMessage: string = 'External API request timeout'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(errorMessage))
    }, timeoutMs)
  })

  return Promise.race([promise, timeoutPromise])
}

/**
 * Pre-configured timeout wrapper for different types of operations
 */
export const timeoutConfig = {
  // Standard API operations (database queries, etc.)
  standard: { timeoutMs: 30000 },
  
  // Quick operations (cache, validation, etc.)
  quick: { timeoutMs: 10000 },
  
  // External API calls (LLM, third-party services)
  external: { timeoutMs: 60000 },
  
  // File operations
  file: { timeoutMs: 45000 }
} as const