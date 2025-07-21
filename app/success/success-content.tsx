'use client'

import Link from 'next/link'
import { sanitizeImageUrl } from '@/lib/url-validation'

interface SuccessContentProps {
  profile: {
    name: string
    avatar_url: string | null
  }
  user: {
    email?: string | null
  }
  workspace: {
    name: string
    slug: string
    avatar_url: string | null
  }
}

export function SuccessContent({ profile, user, workspace }: SuccessContentProps) {
  const safeProfileAvatarUrl = sanitizeImageUrl(profile.avatar_url)
  const safeWorkspaceAvatarUrl = sanitizeImageUrl(workspace.avatar_url)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-4 md:p-6 lg:p-8">
        <div className="text-center space-y-6">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome!
          </h1>
          
          <div className="flex flex-col items-center space-y-4">
            <div className="text-6xl">
              {safeProfileAvatarUrl ? (
                <img 
                  src={safeProfileAvatarUrl} 
                  alt={profile.name}
                  className="h-16 w-16 object-cover rounded-full"
                />
              ) : profile.avatar_url && profile.avatar_url.length <= 2 ? (
                profile.avatar_url
              ) : (
                '👤'
              )}
            </div>
            
            <div className="space-y-2">
              <p className="text-xl font-semibold text-foreground">
                {profile.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>

          <div className="pt-4 md:pt-6 border-t border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Your Workspace</h2>
            
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-3xl">
                {safeWorkspaceAvatarUrl ? (
                  <img 
                    src={safeWorkspaceAvatarUrl} 
                    alt={workspace.name}
                    className="h-8 w-8 object-cover rounded"
                  />
                ) : workspace.avatar_url && workspace.avatar_url.length <= 2 ? (
                  workspace.avatar_url
                ) : (
                  '🏢'
                )}
              </div>
              <div>
                <p className="font-medium text-foreground">{workspace.name}</p>
                <a 
                  href={`/${workspace.slug}`}
                  className="text-sm text-primary hover:text-primary"
                >
                  daygent.ai/{workspace.slug}
                </a>
              </div>
            </div>
            
            <Link
              href={`/${workspace.slug}`}
              className="block w-full px-4 py-3 mt-6 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-center font-medium min-h-[44px]"
            >
              Go to Workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}