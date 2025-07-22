'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { storeVerificationToken } from '@/lib/auth/token-storage'

export default function ManualVerifyPage() {
  const [magicLinkUrl, setMagicLinkUrl] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleVerify = () => {
    if (!magicLinkUrl) return

    try {
      const url = new URL(magicLinkUrl)
      const token = url.searchParams.get('token')
      const type = url.searchParams.get('type')
      
      if (token && type === 'magiclink') {
        setIsVerifying(true)
        
        // Store token securely using our utility
        // This prevents token exposure in server logs and browser history
        storeVerificationToken(token, type)
        
        // Redirect without token in URL
        router.push('/auth/verify')
      } else {
        toast({
          title: "Invalid Link",
          description: "The URL doesn't contain a valid magic link token.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Invalid URL",
        description: "Please paste the complete URL from your email.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Manual Magic Link Verification</CardTitle>
          <CardDescription>
            For local development: Paste your magic link URL here
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="magic-link">Magic Link URL</Label>
            <Input
              id="magic-link"
              type="text"
              value={magicLinkUrl}
              onChange={(e) => setMagicLinkUrl(e.target.value)}
              placeholder="https://bhbrqmpkzelhxlthigkx.supabase.co/auth/v1/verify?token=..."
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Copy the entire URL from your email link
            </p>
          </div>
          
          <Button 
            onClick={handleVerify} 
            className="w-full"
            disabled={isVerifying || !magicLinkUrl}
          >
            {isVerifying ? 'Verifying...' : 'Verify Magic Link'}
          </Button>
          
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3 text-xs">
            <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
              Why is this needed?
            </p>
            <p className="text-amber-700 dark:text-amber-300">
              The Supabase email template is configured to redirect to production (daygent.ai). 
              This page extracts the token from the production URL and verifies it locally.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}