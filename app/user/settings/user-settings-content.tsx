'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ProfileSettings } from '@/components/settings/profile-settings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Building2, Plus, Settings } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Workspace {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  owner_id: string
  userRole?: string
}

interface UserSettingsContentProps {
  user: {
    id: string
    email: string
    profile: {
      name: string
      avatar_url: string
    }
  }
  workspaces: Workspace[]
}

export function UserSettingsContent({ user, workspaces }: UserSettingsContentProps) {
  const [currentAvatar, setCurrentAvatar] = useState(user.profile.avatar_url)
  
  // Determine a default workspace for the back button
  const defaultWorkspace = workspaces.find(ws => ws.userRole === 'owner') || workspaces[0]
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {defaultWorkspace ? (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                >
                  <Link href={`/${defaultWorkspace.slug}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to {defaultWorkspace.name}
                  </Link>
                </Button>
              ) : (
                <h1 className="text-xl font-semibold">User Settings</h1>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentAvatar}</span>
              <span className="text-sm text-muted-foreground">{user.email}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-[250px_1fr]">
          {/* Sidebar Navigation */}
          <nav className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-2">Settings</h3>
              <ul className="space-y-1">
                <li>
                  <a
                    href="#profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-accent text-accent-foreground"
                  >
                    <Settings className="h-4 w-4" />
                    Profile
                  </a>
                </li>
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-sm font-semibold mb-2">Workspaces</h3>
              <ul className="space-y-1">
                {workspaces.length > 0 ? (
                  workspaces.map((workspace) => (
                    <li key={workspace.id}>
                      <Link
                        href={`/${workspace.slug}/settings`}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">
                            {workspace.avatar_url || '🏢'}
                          </span>
                          <span className="truncate">{workspace.name}</span>
                        </div>
                        {workspace.userRole && (
                          <Badge variant="outline" className="text-xs">
                            {workspace.userRole}
                          </Badge>
                        )}
                      </Link>
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    No workspaces found
                  </li>
                )}
                <li>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href="/CreateWorkspace">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Workspace
                    </Link>
                  </Button>
                </li>
              </ul>
            </div>
          </nav>
          
          {/* Main Settings Content */}
          <main>
            <div id="profile">
              <ProfileSettings onAvatarUpdate={setCurrentAvatar} />
            </div>
            
            {workspaces.length === 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    No Workspaces Yet
                  </CardTitle>
                  <CardDescription>
                    Create your first workspace to start managing your projects and collaborate with your team.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild>
                    <Link href="/CreateWorkspace">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Workspace
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}