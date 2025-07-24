'use client'

import { useState } from 'react'
import { signInWithMagicLink } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import styles from './email-login.module.css'

export function EmailLogin() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Use NEXT_PUBLIC_SITE_URL if set (for specific environments), 
      // otherwise use window.location.origin (for dynamic environments like Vercel previews)
      const baseUrl = process.env['NEXT_PUBLIC_SITE_URL'] || window.location.origin
      const redirectURL = `${baseUrl}/auth/callback`
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
    <div className="w-full max-w-md mx-auto relative">
      <div className={styles['scanlineEffect']} />
      <form onSubmit={handleLogin} onKeyDown={handleKeyDown} className={`space-y-4 md:space-y-5 ${styles['cyberpunkForm']}`}>
        <div className="space-y-2">
          <Label htmlFor="email" className={styles['cyberpunkLabel']}>Email address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@cyberspace.net"
            required
            autoComplete="email"
            autoCapitalize="off"
            autoCorrect="off"
            disabled={loading}
            className={styles['cyberpunkInput']}
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className={`w-full ${styles['cyberpunkButton']}`}
        >
          <span className={styles['glitchText']} data-text={loading ? 'INITIALIZING...' : 'JACK IN'}>
            {loading ? 'INITIALIZING...' : 'JACK IN'}
          </span>
        </Button>
      </form>
    </div>
  )
}