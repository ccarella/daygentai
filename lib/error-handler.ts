import { toast } from "@/components/ui/use-toast"

export type ErrorType = 
  | "network" 
  | "validation" 
  | "permission"
  | "authentication"
  | "database" 
  | "ai"
  | "rate_limit"
  | "parsing"
  | "timeout"
  | "not_found"
  | "unknown"

export interface ErrorHandlerOptions {
  type?: ErrorType
  title?: string
  showToast?: boolean
  logToConsole?: boolean
  context?: Record<string, unknown>
}

const errorMessages: Record<ErrorType, string> = {
  network: "Network error occurred. Please check your connection.",
  validation: "Please check your input and try again.",
  permission: "You don't have permission to perform this action.",
  authentication: "Please sign in to continue.",
  database: "Database operation failed. Please try again.",
  ai: "AI service is temporarily unavailable.",
  rate_limit: "Too many requests. Please wait a moment and try again.",
  parsing: "Failed to process the response. Please try again.",
  timeout: "The operation timed out. Please try again.",
  not_found: "The requested resource was not found.",
  unknown: "An unexpected error occurred. Please try again."
}

const errorTitles: Record<ErrorType, string> = {
  network: "Connection Error",
  validation: "Invalid Input",
  permission: "Access Denied",
  authentication: "Authentication Required",
  database: "Database Error",
  ai: "AI Service Error",
  rate_limit: "Rate Limit Exceeded",
  parsing: "Processing Error",
  timeout: "Request Timeout",
  not_found: "Not Found",
  unknown: "Error"
}

/**
 * Centralized error handler that logs to console and shows user-friendly toast notifications
 */
export function handleError(
  error: unknown,
  options: ErrorHandlerOptions = {}
): void {
  const {
    type = "unknown",
    title,
    showToast = true,
    logToConsole = true,
    context = {}
  } = options

  // Determine error message
  const errorMessage = errorMessages[type]
  let errorDetails = ""

  if (error instanceof Error) {
    errorDetails = error.message
  } else if (typeof error === "string") {
    errorDetails = error
  } else if (error && typeof error === "object" && "message" in error) {
    errorDetails = String(error.message)
  }

  // Log to console for debugging
  if (logToConsole) {
    console.error("[Error Handler]", {
      type,
      error,
      context,
      message: errorDetails || errorMessage
    })
  }

  // Show toast notification to user
  if (showToast) {
    // Only show detailed error messages in development to avoid exposing sensitive information
    const safeDescription = process.env.NODE_ENV === 'development' 
      ? (errorDetails || errorMessage)
      : errorMessage
      
    toast({
      title: title || errorTitles[type],
      description: safeDescription,
      variant: "destructive",
    })
  }
}

/**
 * Helper function for handling API errors
 */
export function handleApiError(error: unknown, operation: string): void {
  if (error instanceof Response) {
    if (error.status === 401) {
      handleError(error, {
        type: "authentication",
        context: { operation }
      })
    } else if (error.status === 429) {
      handleError(error, {
        type: "rate_limit",
        context: { operation }
      })
    } else if (error.status === 404) {
      handleError(error, {
        type: "not_found",
        context: { operation }
      })
    } else if (error.status >= 500) {
      handleError(error, {
        type: "network",
        title: "Server Error",
        context: { operation, status: error.status }
      })
    } else {
      handleError(error, {
        type: "unknown",
        context: { operation, status: error.status }
      })
    }
  } else {
    handleError(error, {
      type: "network",
      context: { operation }
    })
  }
}

/**
 * Helper function for handling database errors
 */
export function handleDatabaseError(error: unknown, operation: string): void {
  handleError(error, {
    type: "database",
    title: `Failed to ${operation}`,
    context: { operation }
  })
}

/**
 * Helper function for handling AI/LLM errors
 */
export function handleAIError(error: unknown, feature: string): void {
  handleError(error, {
    type: "ai",
    title: `AI ${feature} Unavailable`,
    showToast: true,
    context: { feature }
  })
}

/**
 * Helper function for handling validation errors
 */
export function handleValidationError(message: string): void {
  handleError(message, {
    type: "validation",
    title: "Validation Error",
    showToast: true,
    logToConsole: false
  })
}

/**
 * Helper function for handling authentication errors
 */
export function handleAuthenticationError(error: unknown, context?: string): void {
  handleError(error, {
    type: "authentication",
    showToast: true,
    context: { context }
  })
}

/**
 * Helper function for handling rate limit errors
 */
export function handleRateLimitError(error: unknown, retryAfter?: number): void {
  handleError(error, {
    type: "rate_limit",
    showToast: true,
    context: { retryAfter }
  })
}

/**
 * Helper function for handling parsing errors
 */
export function handleParsingError(error: unknown, dataType: string): void {
  handleError(error, {
    type: "parsing",
    title: `Failed to parse ${dataType}`,
    showToast: true,
    context: { dataType }
  })
}

/**
 * Helper function for handling timeout errors
 */
export function handleTimeoutError(operation: string): void {
  handleError(new Error(`Operation timed out: ${operation}`), {
    type: "timeout",
    showToast: true,
    context: { operation }
  })
}

/**
 * Helper function for handling not found errors
 */
export function handleNotFoundError(resource: string): void {
  handleError(new Error(`${resource} not found`), {
    type: "not_found",
    title: `${resource} Not Found`,
    showToast: true,
    context: { resource }
  })
}