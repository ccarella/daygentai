import { toast } from "@/components/ui/use-toast"

export type ErrorType = 
  | "network" 
  | "validation" 
  | "permission" 
  | "database" 
  | "ai" 
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
  database: "Database operation failed. Please try again.",
  ai: "AI service is temporarily unavailable.",
  unknown: "An unexpected error occurred. Please try again."
}

const errorTitles: Record<ErrorType, string> = {
  network: "Connection Error",
  validation: "Invalid Input",
  permission: "Access Denied",
  database: "Database Error",
  ai: "AI Service Error",
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
    toast({
      title: title || errorTitles[type],
      description: errorDetails || errorMessage,
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
        type: "permission",
        title: "Authentication Required",
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