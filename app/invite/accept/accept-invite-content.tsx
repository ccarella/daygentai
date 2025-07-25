'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Loader2, Users, LogIn } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface AcceptInviteContentProps {
  invitation: {
    id: string
    email: string
    role: string
    workspace: {
      id: string
      name: string
      slug: string
      avatar_url: string | null
    }
  }
  token: string
  isAuthenticated: boolean
  userEmail?: string | undefined
}

export function AcceptInviteContent({
  invitation,
  token,
  isAuthenticated,
  userEmail,
}: AcceptInviteContentProps) {
  const [accepting, setAccepting] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const handleAccept = async () => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      const returnUrl = `/invite/accept?token=${token}`
      router.push(`/?returnUrl=${encodeURIComponent(returnUrl)}`)
      return
    }

    setAccepting(true)

    try {
      // Call API to accept invitation
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation')
      }

      toast({
        title: 'Success',
        description: `You've joined ${invitation.workspace.name}!`,
      })

      // Redirect to the workspace
      router.push(`/${invitation.workspace.slug}`)
    } catch (error) {
      console.error('Error accepting invitation:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to accept invitation',
        variant: 'destructive',
      })
      setAccepting(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'secondary'
      case 'viewer':
        return 'outline'
      default:
        return 'default'
    }
  }

  const emailMismatch = isAuthenticated && userEmail && userEmail !== invitation.email

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={invitation.workspace.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                {getInitials(invitation.workspace.name)}
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="text-2xl">Join {invitation.workspace.name}</CardTitle>
          <CardDescription>
            You&apos;ve been invited to collaborate as a{' '}
            <Badge variant={getRoleBadgeVariant(invitation.role)} className="ml-1">
              {invitation.role}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>This invitation was sent to:</p>
            <p className="font-medium text-foreground mt-1">{invitation.email}</p>
          </div>

          {emailMismatch && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                You&apos;re currently signed in as <strong>{userEmail}</strong>. 
                To accept this invitation, please sign in with <strong>{invitation.email}</strong>.
              </p>
            </div>
          )}

          <div className="pt-2">
            <h4 className="text-sm font-medium mb-2">As a {invitation.role}, you can:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {invitation.role === 'admin' && (
                <>
                  <li>• Manage workspace settings</li>
                  <li>• Invite and remove team members</li>
                  <li>• Create and manage all issues</li>
                </>
              )}
              {invitation.role === 'member' && (
                <>
                  <li>• Create and manage issues</li>
                  <li>• Collaborate with team members</li>
                  <li>• View workspace analytics</li>
                </>
              )}
              {invitation.role === 'viewer' && (
                <>
                  <li>• View all issues and comments</li>
                  <li>• Access workspace analytics</li>
                  <li>• Read-only access to content</li>
                </>
              )}
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {!isAuthenticated ? (
            <>
              <Button 
                onClick={handleAccept} 
                className="w-full"
                size="lg"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign in to Accept
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                You&apos;ll need to sign in with {invitation.email} to join this workspace
              </p>
            </>
          ) : emailMismatch ? (
            <>
              <Button 
                onClick={() => {
                  // Sign out and redirect to login
                  supabase.auth.signOut().then(() => {
                    router.push(`/?returnUrl=${encodeURIComponent(`/invite/accept?token=${token}`)}`)
                  })
                }}
                className="w-full"
                size="lg"
              >
                Sign in with Different Account
              </Button>
              <Link href="/" className="w-full">
                <Button variant="outline" className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Button 
                onClick={handleAccept} 
                disabled={accepting}
                className="w-full"
                size="lg"
              >
                {accepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Users className="mr-2 h-4 w-4" />
                Accept Invitation
              </Button>
              <Link href="/" className="w-full">
                <Button variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}