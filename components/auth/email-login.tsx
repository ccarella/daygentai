'use client'

import { useState } from 'react'
import { signInWithMagicLink } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

export function EmailLogin() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Use window.location.origin to get the current deployment URL
      const redirectURL = `${window.location.origin}/auth/callback`
      const { error } = await signInWithMagicLink(email, redirectURL)

      if (error) throw error

      // Show success toast
      toast({
        title: "Check your email",
        description: "We've sent you a login link. Please check your inbox.",
      })

      // Redirect to the check email page with the email as a parameter
      router.push(`/checkemail?email=${encodeURIComponent(email)}`)
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : 'Something went wrong!',
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !loading && email) {
      e.preventDefault()
      const formEvent = new Event('submit', { bubbles: true, cancelable: true }) as unknown as React.FormEvent
      handleLogin(formEvent)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleLogin} onKeyDown={handleKeyDown} className="space-y-4 md:space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            autoCapitalize="off"
            autoCorrect="off"
            className="w-full px-3 py-2 md:px-4 md:py-2.5 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 md:px-5 md:py-2.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Sending...' : 'Send login link'}
        </button>
      </form>
    </div>
  )
}