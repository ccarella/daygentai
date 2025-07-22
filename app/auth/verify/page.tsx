'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getVerificationToken, clearVerificationToken } from '@/lib/auth/token-storage'
import { 
  validateMagicLinkToken, 
  sanitizeUrlParam, 
  checkRateLimit, 
  clearRateLimit 
} from '@/lib/auth/token-validation'

export default function VerifyPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    const verifyToken = async () => {
      try {
        // Check rate limiting first
        const { allowed } = checkRateLimit()
        if (!allowed) {
          throw new Error('Too many verification attempts. Please try again later.')
        }
        
        // Check for token in URL params (for backward compatibility)
        const urlParams = new URLSearchParams(window.location.search)
        const rawUrlToken = urlParams.get('token')
        const rawUrlType = urlParams.get('type')
        
        let token: string | null = null
        let type: string | null = null
        
        if (rawUrlToken && rawUrlType) {
          // Sanitize URL parameters
          const urlToken = sanitizeUrlParam(rawUrlToken)
          const urlType = sanitizeUrlParam(rawUrlType)
          
          if (!urlToken || !urlType) {
            throw new Error('Invalid URL parameters')
          }
          
          // Validate token format
          const validation = validateMagicLinkToken(urlToken, urlType)
          if (!validation.isValid) {
            throw new Error(validation.error || 'Invalid token format')
          }
          
          token = validation.sanitizedToken!
          type = validation.tokenType!
        } else {
          // Otherwise, check sessionStorage (manual verification)
          const verificationData = getVerificationToken()
          
          if (verificationData) {
            // Validate stored token
            const validation = validateMagicLinkToken(
              verificationData.token, 
              verificationData.type
            )
            
            if (!validation.isValid) {
              clearVerificationToken()
              throw new Error(validation.error || 'Invalid stored token')
            }
            
            token = validation.sanitizedToken!
            type = validation.tokenType!
            
            // Clear the stored token immediately after reading
            clearVerificationToken()
          }
        }
        
        if (!token || !type) {
          throw new Error('No valid verification token found')
        }
        
        // Verify the token with Supabase
        const supabase = createClient()
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'magiclink',
        })
        
        if (error) {
          console.error('Verification error:', error)
          throw new Error(error.message || 'Failed to verify magic link')
        }
        
        // Success - clear rate limiting and redirect to workspace
        clearRateLimit()
        setStatus('success')
        router.push('/workspace')
      } catch (error) {
        console.error('Verification process failed:', error)
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : 'Verification failed')
        
        // Redirect to home with error after a delay
        setTimeout(() => {
          router.push('/?error=auth_failed')
        }, 3000)
      }
    }
    
    verifyToken()
  }, [router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Verifying your magic link...</h2>
          <p className="text-sm text-muted-foreground mt-2">Please wait while we log you in.</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-lg font-semibold text-destructive">Verification Failed</h2>
          <p className="text-sm text-muted-foreground mt-2">{errorMessage}</p>
          <p className="text-xs text-muted-foreground mt-4">Redirecting to home page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-green-600">Success!</h2>
        <p className="text-sm text-muted-foreground mt-2">Redirecting to your workspace...</p>
      </div>
    </div>
  )
}