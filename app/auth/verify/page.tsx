'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getVerificationToken, clearVerificationToken } from '@/lib/auth/token-storage'

export default function VerifyPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    const verifyToken = async () => {
      try {
        // Check for token in URL params (for backward compatibility)
        const urlParams = new URLSearchParams(window.location.search)
        const urlToken = urlParams.get('token')
        const urlType = urlParams.get('type')
        
        let token: string | null = null
        let type: string | null = null
        
        if (urlToken && urlType) {
          // Use URL params if available (direct links)
          token = urlToken
          type = urlType
        } else {
          // Otherwise, check sessionStorage (manual verification)
          const verificationData = getVerificationToken()
          
          if (verificationData) {
            token = verificationData.token
            type = verificationData.type
            
            // Clear the stored token immediately after reading
            clearVerificationToken()
          }
        }
        
        if (!token || type !== 'magiclink') {
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
        
        // Success - redirect to workspace
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