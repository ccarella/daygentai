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

// Type guard to check if the first argument is a NextRequest
function isNextRequest(arg: unknown): arg is NextRequest {
  return (
    arg !== null &&
    typeof arg === 'object' &&
    'method' in arg &&
    'url' in arg &&
    'headers' in arg
  )
}

/**
 * Creates a timeout wrapper for API route handlers
 * @param handler - The original API route handler
 * @param config - Timeout configuration options
 * @returns Wrapped handler with timeout functionality
 * 
 * Note: Handlers should check for req.signal?.aborted to properly cancel operations
 */
export function withTimeout<T extends (...args: never[]) => Promise<Response>>(
  handler: T,
  config: TimeoutConfig = {}
): T {
  const { timeoutMs = DEFAULT_TIMEOUT_MS } = config

  const wrappedHandler = async (...args: Parameters<T>): Promise<Response> => {
    // Safely extract the request with type guard
    const firstArg = args[0]
    if (!isNextRequest(firstArg)) {
      console.error('withTimeout: First argument is not a NextRequest')
      throw new Error('Invalid handler signature for timeout middleware')
    }
    const req: NextRequest = firstArg
    
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

    // Save request details for error logging
    const requestDetails = {
      method: req.method,
      pathname: new URL(req.url).pathname,
      userAgent: req.headers.get('user-agent')
    }

    // Create a modified request with the abort signal
    // This allows handlers to check req.signal?.aborted and cancel operations
    const modifiedReq = Object.assign(Object.create(Object.getPrototypeOf(req)), req, {
      signal: controller.signal
    })

    // Replace the original request with the modified one in args
    const modifiedArgs = [...args] as unknown[]
    modifiedArgs[0] = modifiedReq

    try {
      // Create a promise that rejects on timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('TIMEOUT'))
        })
      })

      // Race between the handler and timeout
      const response = await Promise.race([
        handler(...(modifiedArgs as Parameters<T>)),
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
        
        // Only log detailed information in development
        const isDevelopment = process.env['NODE_ENV'] !== 'production'
        
        console.warn(`API request timeout after ${duration}ms:`, {
          method: requestDetails.method,
          path: requestDetails.pathname,
          userAgent: isDevelopment ? requestDetails.userAgent : undefined,
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