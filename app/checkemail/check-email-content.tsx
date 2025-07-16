'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function CheckEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const supabase = createClient()

  const handleResend = async () => {
    if (!email) return
    
    setResending(true)
    setResendMessage(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error

      setResendMessage('Email sent successfully!')
    } catch (error) {
      setResendMessage('Failed to send email. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 lg:p-8">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-6">
          {/* Mail icon */}
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          {/* Main heading */}
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Check your email to continue
          </h1>

          {/* Main message */}
          <div className="space-y-3">
            <p className="text-lg text-muted-foreground">
              We've sent a login link to
            </p>
            {email && (
              <p className="text-lg font-medium text-foreground">
                {email}
              </p>
            )}
            <p className="text-base text-muted-foreground">
              Click the link in your email to sign in to your account.
            </p>
          </div>

          {/* Resend section */}
          {email && (
            <div className="pt-4 space-y-4">
              <div className="text-sm text-muted-foreground">
                Didn't receive the email?
              </div>
              <Button
                variant="outline"
                onClick={handleResend}
                disabled={resending}
                className="w-full"
              >
                {resending ? 'Sending...' : 'Resend login link'}
              </Button>
              {resendMessage && (
                <div
                  className={`p-3 rounded-md text-sm ${
                    resendMessage.includes('success')
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}
                >
                  {resendMessage}
                </div>
              )}
            </div>
          )}

          {/* Back to home link */}
          <div className="pt-6">
            <a
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              ← Back to login
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}