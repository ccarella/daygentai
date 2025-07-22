/**
 * Token validation utilities for secure authentication
 */

// Supabase magic link tokens are base64url encoded and typically 40-60 characters
const TOKEN_MIN_LENGTH = 32
const TOKEN_MAX_LENGTH = 128
// Base64url alphabet (no +, /, or = padding)
const TOKEN_REGEX = /^[A-Za-z0-9_-]+$/

// Known valid token types
const VALID_TOKEN_TYPES = ['magiclink', 'recovery', 'invite'] as const
type TokenType = typeof VALID_TOKEN_TYPES[number]

export interface ValidationResult {
  isValid: boolean
  error?: string
  sanitizedToken?: string
  tokenType?: TokenType
}

/**
 * Validates and sanitizes a magic link token
 * @param token - The token to validate
 * @param type - The token type
 * @returns Validation result with sanitized token or error
 */
export function validateMagicLinkToken(
  token: unknown,
  type: unknown
): ValidationResult {
  // Type validation
  if (typeof token !== 'string' || typeof type !== 'string') {
    return {
      isValid: false,
      error: 'Invalid token or type format',
    }
  }

  // Trim whitespace
  const trimmedToken = token.trim()
  const trimmedType = type.trim().toLowerCase() as TokenType

  // Type validation
  if (!VALID_TOKEN_TYPES.includes(trimmedType)) {
    return {
      isValid: false,
      error: `Invalid token type. Expected one of: ${VALID_TOKEN_TYPES.join(', ')}`,
    }
  }

  // Length validation
  if (trimmedToken.length < TOKEN_MIN_LENGTH) {
    return {
      isValid: false,
      error: 'Token is too short',
    }
  }

  if (trimmedToken.length > TOKEN_MAX_LENGTH) {
    return {
      isValid: false,
      error: 'Token is too long',
    }
  }

  // Format validation - must be base64url
  if (!TOKEN_REGEX.test(trimmedToken)) {
    return {
      isValid: false,
      error: 'Token contains invalid characters',
    }
  }

  // Additional security checks
  // Check for common SQL injection patterns
  const sqlInjectionPatterns = [
    'SELECT',
    'DROP',
    'INSERT',
    'UPDATE',
    'DELETE',
    'UNION',
    '--',
    '/*',
    '*/',
    'xp_',
    'sp_',
  ]

  const upperToken = trimmedToken.toUpperCase()
  for (const pattern of sqlInjectionPatterns) {
    if (upperToken.includes(pattern)) {
      return {
        isValid: false,
        error: 'Token contains suspicious patterns',
      }
    }
  }

  // Check for common XSS patterns
  const xssPatterns = [
    '<script',
    'javascript:',
    'onerror=',
    'onload=',
    'onclick=',
    'alert(',
    'document.',
    'window.',
  ]

  const lowerToken = trimmedToken.toLowerCase()
  for (const pattern of xssPatterns) {
    if (lowerToken.includes(pattern)) {
      return {
        isValid: false,
        error: 'Token contains suspicious patterns',
      }
    }
  }

  return {
    isValid: true,
    sanitizedToken: trimmedToken,
    tokenType: trimmedType,
  }
}

/**
 * Sanitizes a URL parameter to prevent injection attacks
 * @param param - The parameter to sanitize
 * @returns Sanitized parameter or null if invalid
 */
export function sanitizeUrlParam(param: string | null): string | null {
  if (!param) return null
  
  // Remove any control characters
  const sanitized = param.replace(/[\x00-\x1F\x7F]/g, '')
  
  // Limit length to prevent DoS
  if (sanitized.length > TOKEN_MAX_LENGTH) {
    return null
  }
  
  return sanitized
}

/**
 * Rate limiting check for token verification attempts
 * Uses sessionStorage to track attempts
 */
const RATE_LIMIT_KEY = 'auth-verify-attempts'
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

interface RateLimitData {
  attempts: number
  firstAttempt: number
}

export function checkRateLimit(): { allowed: boolean; remainingAttempts: number } {
  const now = Date.now()
  const storedData = sessionStorage.getItem(RATE_LIMIT_KEY)
  
  let data: RateLimitData = {
    attempts: 0,
    firstAttempt: now,
  }
  
  if (storedData) {
    try {
      data = JSON.parse(storedData)
      
      // Reset if window has passed
      if (now - data.firstAttempt > WINDOW_MS) {
        data = {
          attempts: 0,
          firstAttempt: now,
        }
      }
    } catch {
      // Invalid data, reset
    }
  }
  
  data.attempts++
  sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data))
  
  return {
    allowed: data.attempts <= MAX_ATTEMPTS,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - data.attempts),
  }
}

/**
 * Clears rate limit data (call on successful auth)
 */
export function clearRateLimit(): void {
  sessionStorage.removeItem(RATE_LIMIT_KEY)
}