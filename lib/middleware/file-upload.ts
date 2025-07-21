import { NextRequest } from 'next/server'
import { 
  createPayloadTooLargeError, 
  createValidationError
} from './error-handler'

/**
 * File upload configuration
 */
export interface FileUploadConfig {
  maxFileSize: number
  allowedMimeTypes: readonly string[]
  allowedExtensions?: readonly string[]
}

/**
 * Default configurations for different file types
 */
export const fileUploadConfigs: Record<string, FileUploadConfig> = {
  avatar: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  },
  document: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.txt', '.md']
  },
  image: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
  },
  general: {
    maxFileSize: 10 * 1024 * 1024, // 10MB default
    allowedMimeTypes: ['*/*'], // Allow all by default
    allowedExtensions: []
  }
}

/**
 * Validates content type for file uploads
 */
export function validateContentType(
  contentType: string | null,
  allowedTypes: readonly string[]
): boolean {
  if (!contentType) return false
  
  // Check if wildcard is allowed
  if (allowedTypes.includes('*/*')) return true
  
  // Check exact match
  if (allowedTypes.includes(contentType)) return true
  
  // Check wildcard patterns (e.g., image/*)
  const contentMainType = contentType.split('/')[0]
  return allowedTypes.some(allowed => {
    if (allowed.endsWith('/*')) {
      const allowedMainType = allowed.split('/')[0]
      return allowedMainType === contentMainType
    }
    return false
  })
}

/**
 * Extracts filename from Content-Disposition header
 */
export function extractFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null
  
  // Try to extract filename from Content-Disposition header
  const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
  if (filenameMatch && filenameMatch[1]) {
    let filename = filenameMatch[1]
    // Remove surrounding quotes if present
    if ((filename.startsWith('"') && filename.endsWith('"')) || 
        (filename.startsWith("'") && filename.endsWith("'"))) {
      filename = filename.slice(1, -1)
    }
    return filename
  }
  
  return null
}

/**
 * Validates file extension
 */
export function validateFileExtension(
  filename: string,
  allowedExtensions: readonly string[]
): boolean {
  if (!allowedExtensions || allowedExtensions.length === 0) return true
  
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0]
  if (!ext) return false
  
  return allowedExtensions.some(allowed => 
    allowed.toLowerCase() === ext.toLowerCase()
  )
}

/**
 * Creates a size limit configuration for specific routes
 */
export function createRouteSizeLimit(sizeInMB: number): string {
  return `${sizeInMB}mb`
}

/**
 * Validates file upload request
 */
export async function validateFileUpload(
  req: NextRequest,
  config: FileUploadConfig
): Promise<{ valid: true } | { valid: false; error: Response }> {
  const contentType = req.headers.get('content-type')
  const contentLength = req.headers.get('content-length')
  const contentDisposition = req.headers.get('content-disposition')
  
  // Validate content type
  if (!contentType) {
    return {
      valid: false,
      error: createValidationError(
        'Content-Type header is required for file uploads',
        { requiredHeader: 'Content-Type' }
      )
    }
  }
  
  // For multipart uploads, extract the boundary
  const isMultipart = contentType.includes('multipart/form-data')
  if (isMultipart) {
    // Multipart validation is handled separately
    return { valid: true }
  }
  
  // Validate MIME type for direct uploads
  if (!validateContentType(contentType, config.allowedMimeTypes)) {
    return {
      valid: false,
      error: createValidationError(
        'File type not allowed',
        { 
          providedType: contentType,
          allowedTypes: config.allowedMimeTypes,
          suggestion: 'Please upload a file with an allowed type'
        }
      )
    }
  }
  
  // Validate content length if provided
  if (contentLength) {
    const size = parseInt(contentLength, 10)
    if (isNaN(size)) {
      return {
        valid: false,
        error: createValidationError(
          'Invalid Content-Length header',
          { providedValue: contentLength }
        )
      }
    }
    
    if (size > config.maxFileSize) {
      return {
        valid: false,
        error: createPayloadTooLargeError(
          `${Math.round(config.maxFileSize / 1024 / 1024)}MB`,
          size
        )
      }
    }
  }
  
  // Validate file extension if filename is provided
  const filename = extractFilename(contentDisposition)
  if (filename && config.allowedExtensions && config.allowedExtensions.length > 0) {
    if (!validateFileExtension(filename, config.allowedExtensions)) {
      return {
        valid: false,
        error: createValidationError(
          'File extension not allowed',
          {
            filename,
            allowedExtensions: config.allowedExtensions,
            suggestion: 'Please upload a file with an allowed extension'
          }
        )
      }
    }
  }
  
  return { valid: true }
}

/**
 * Parse multipart form data boundary from content-type
 */
export function parseMultipartBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;,\s]+))/)
  return match ? (match[1] || match[2] || null) : null
}

// Default file upload config
const DEFAULT_FILE_UPLOAD_CONFIG: FileUploadConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB default
  allowedMimeTypes: ['*/*'], // Allow all by default
  allowedExtensions: []
}

/**
 * Middleware to handle file upload size limits
 * This should be used in conjunction with route-specific configurations
 */
export function withFileUpload<T extends (...args: never[]) => Promise<Response>>(
  handler: T,
  config: FileUploadConfig = DEFAULT_FILE_UPLOAD_CONFIG
): T {
  const wrappedHandler = async (...args: Parameters<T>): Promise<Response> => {
    const req = (args as unknown[])[0] as NextRequest
    
    // Only validate if this looks like a file upload
    const contentType = req.headers.get('content-type')
    if (contentType && (
      contentType.includes('multipart/form-data') ||
      contentType.includes('application/octet-stream') ||
      contentType.startsWith('image/') ||
      contentType.startsWith('video/') ||
      contentType.startsWith('audio/') ||
      contentType === 'application/pdf'
    )) {
      const validation = await validateFileUpload(req, config)
      if (!validation.valid) {
        return validation.error
      }
    }
    
    try {
      return await handler(...args)
    } catch (error) {
      // Check if it's a body size error
      if (error instanceof Error) {
        const message = error.message.toLowerCase()
        if (message.includes('body exceeded') || 
            message.includes('payload too large') ||
            message.includes('request entity too large')) {
          return createPayloadTooLargeError(
            `${Math.round(config.maxFileSize / 1024 / 1024)}MB`
          )
        }
      }
      throw error
    }
  }
  
  return wrappedHandler as T
}

/**
 * Helper to create file upload response headers
 */
export function createFileUploadHeaders(
  filename: string,
  contentType: string
): Headers {
  const headers = new Headers()
  headers.set('Content-Type', contentType)
  headers.set('Content-Disposition', `attachment; filename="${filename}"`)
  return headers
}