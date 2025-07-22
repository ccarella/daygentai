/**
 * Secure token storage utilities for authentication
 * Uses sessionStorage to prevent token exposure in URLs
 */

const STORAGE_KEY = 'supabase-auth-verification'
const TOKEN_EXPIRY = 60 * 60 * 1000 // 1 hour in milliseconds

export interface VerificationData {
  token: string
  type: string
  timestamp: number
}

/**
 * Stores verification token securely in sessionStorage
 */
export function storeVerificationToken(token: string, type: string): void {
  const data: VerificationData = {
    token,
    type,
    timestamp: Date.now(),
  }
  
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

/**
 * Retrieves and validates stored verification token
 * Automatically clears expired tokens
 */
export function getVerificationToken(): VerificationData | null {
  const storedData = sessionStorage.getItem(STORAGE_KEY)
  
  if (!storedData) {
    return null
  }
  
  try {
    const data: VerificationData = JSON.parse(storedData)
    
    // Check if token has expired
    const age = Date.now() - data.timestamp
    if (age > TOKEN_EXPIRY) {
      clearVerificationToken()
      return null
    }
    
    return data
  } catch (error) {
    console.error('Failed to parse verification data:', error)
    clearVerificationToken()
    return null
  }
}

/**
 * Clears stored verification token
 */
export function clearVerificationToken(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}

/**
 * Checks if a verification token exists and is valid
 */
export function hasValidVerificationToken(): boolean {
  const token = getVerificationToken()
  return token !== null
}