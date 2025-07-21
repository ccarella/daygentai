import { NextResponse } from 'next/server'

/**
 * Standard HTTP error codes for API responses
 */
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  
  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const

/**
 * Error response interface
 */
export interface ErrorResponse {
  error: string
  code: string
  details?: Record<string, unknown>
  timestamp?: string
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  message: string,
  code: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  const errorResponse: ErrorResponse = {
    error: message,
    code,
    timestamp: new Date().toISOString()
  }

  if (details) {
    errorResponse.details = details
  }

  return NextResponse.json(errorResponse, { status })
}

/**
 * Handles payload too large errors (413)
 */
export function createPayloadTooLargeError(
  sizeLimit: string = '1MB',
  actualSize?: number
): NextResponse<ErrorResponse> {
  const details: Record<string, unknown> = {
    sizeLimit,
    allowedFormats: ['application/json'],
    suggestion: 'Reduce the size of your request payload or split it into smaller requests'
  }

  if (actualSize) {
    details['actualSize'] = `${Math.round(actualSize / 1024 / 1024 * 100) / 100}MB`
  }

  return createErrorResponse(
    `Request payload exceeds the maximum allowed size of ${sizeLimit}`,
    'PAYLOAD_TOO_LARGE',
    HTTP_STATUS.PAYLOAD_TOO_LARGE,
    details
  )
}

/**
 * Handles request timeout errors (408)
 */
export function createTimeoutError(
  timeoutMs: number,
  operation: string = 'request'
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    `Request timeout - the ${operation} took too long to complete`,
    'REQUEST_TIMEOUT',
    HTTP_STATUS.REQUEST_TIMEOUT,
    {
      timeoutMs,
      suggestion: 'Try reducing the complexity of your request or contact support if the issue persists'
    }
  )
}

/**
 * Handles authentication errors (401)
 */
export function createUnauthorizedError(
  message: string = 'Authentication required'
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    message,
    'UNAUTHORIZED',
    HTTP_STATUS.UNAUTHORIZED,
    {
      suggestion: 'Please log in and try again'
    }
  )
}

/**
 * Handles authorization/permission errors (403)
 */
export function createForbiddenError(
  message: string = 'Access denied'
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    message,
    'FORBIDDEN',
    HTTP_STATUS.FORBIDDEN,
    {
      suggestion: 'You do not have permission to perform this action'
    }
  )
}

/**
 * Handles validation errors (400)
 */
export function createValidationError(
  message: string,
  validationDetails?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    message,
    'VALIDATION_ERROR',
    HTTP_STATUS.BAD_REQUEST,
    validationDetails
  )
}

/**
 * Handles not found errors (404)
 */
export function createNotFoundError(
  resource: string = 'Resource'
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    `${resource} not found`,
    'NOT_FOUND',
    HTTP_STATUS.NOT_FOUND
  )
}

/**
 * Handles internal server errors (500)
 */
export function createInternalServerError(
  message: string = 'Internal server error',
  includeTimestamp: boolean = true
): NextResponse<ErrorResponse> {
  const details = includeTimestamp ? {
    requestId: Math.random().toString(36).substring(2, 15),
    suggestion: 'Please try again later or contact support if the issue persists'
  } : undefined

  return createErrorResponse(
    message,
    'INTERNAL_SERVER_ERROR',
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    details
  )
}

/**
 * Handles rate limiting errors (429)
 */
export function createRateLimitError(
  retryAfter?: number
): NextResponse<ErrorResponse> {
  const response = createErrorResponse(
    'Too many requests. Please try again later.',
    'RATE_LIMIT_EXCEEDED',
    HTTP_STATUS.TOO_MANY_REQUESTS,
    {
      retryAfter: retryAfter || 60,
      suggestion: 'Wait before making additional requests'
    }
  )

  if (retryAfter) {
    response.headers.set('Retry-After', retryAfter.toString())
  }

  return response
}

/**
 * Checks if an error is a body size limit error from Next.js
 */
export function isBodySizeLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('body exceeded') ||
      message.includes('payload too large') ||
      message.includes('request entity too large') ||
      message.includes('body size limit')
    )
  }
  return false
}

/**
 * Enhanced error handler wrapper for API routes
 */
export function withErrorHandler<T extends (...args: never[]) => Promise<Response>>(
  handler: T
): T {
  const wrappedHandler = async (...args: Parameters<T>): Promise<Response> => {
    try {
      return await handler(...args)
    } catch (error) {
      // In production, avoid exposing stack traces
      const isDevelopment = process.env['NODE_ENV'] !== 'production'
      
      console.error('API route error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: isDevelopment && error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        environment: process.env['NODE_ENV'] || 'unknown'
      })

      // Check for specific error types
      if (isBodySizeLimitError(error)) {
        return createPayloadTooLargeError()
      }

      // Default to internal server error
      return createInternalServerError()
    }
  }

  return wrappedHandler as T
}