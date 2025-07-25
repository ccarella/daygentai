'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, UserPlus, Mail, MoreVertical, Trash2, Shield } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InviteMemberDialog } from './invite-member-dialog'
import { useToast } from '@/hooks/use-toast'

interface TeamMember {
  id: string
  user_id: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  user: {
    id: string
    email: string
    name?: string
    avatar_url?: string
  }
}

interface WorkspaceInvitation {
  id: string
  email: string
  role: string
  expires_at: string
  invited_by: string
  created_at: string
}

interface TeamMembersProps {
  workspaceId: string
  currentUserId: string
  currentUserRole: string
}

export function TeamMembers({ workspaceId, currentUserId, currentUserRole }: TeamMembersProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin'

  useEffect(() => {
    fetchMembers()
    if (canManageMembers) {
      fetchInvitations()
    }
  }, [workspaceId])

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('workspace_members')
      .select(`
        id,
        user_id,
        role,
        user:users!inner(
          id,
          email,
          name,
          avatar_url
        )
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true }) as { data: Array<{
        id: string;
        user_id: string;
        role: 'owner' | 'admin' | 'member' | 'viewer';
        user: {
          id: string;
          email: string;
          name?: string;
          avatar_url?: string;
        }
      }> | null; error: unknown }

    if (error) {
      console.error('Error fetching members:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch team members',
        variant: 'destructive',
      })
    } else {
      setMembers(data || [])
    }
    setLoading(false)
  }

  const fetchInvitations = async () => {
    const { data, error } = await supabase
      .from('workspace_invitations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('accepted_at', null)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (!error && data) {
      setInvitations(data)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    const { error } = await supabase
      .from('workspace_members')
      .update({ role: newRole })
      .eq('id', memberId)

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update member role',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: 'Member role updated',
      })
      fetchMembers()
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', memberId)

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: 'Member removed from workspace',
      })
      fetchMembers()
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    const { error } = await supabase
      .from('workspace_invitations')
      .delete()
      .eq('id', invitationId)

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel invitation',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: 'Invitation cancelled',
      })
      fetchInvitations()
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default'
      case 'admin':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return email?.slice(0, 2).toUpperCase() || '??'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                Manage your workspace team members and permissions
              </CardDescription>
            </div>
            {canManageMembers && (
              <Button onClick={() => setIsInviteOpen(true)} size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Active Members ({members.length})</h3>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.user.avatar_url || undefined} />
                      <AvatarFallback>
                        {getInitials(member.user.name, member.user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {member.user.name || member.user.email}
                      </p>
                      {member.user.name && (
                        <p className="text-sm text-muted-foreground">
                          {member.user.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {member.role}
                    </Badge>
                    {canManageMembers && member.user_id !== currentUserId && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {member.role !== 'owner' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleRoleChange(member.id, 'admin')}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Make Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRoleChange(member.id, 'member')}
                              >
                                <Users className="h-4 w-4 mr-2" />
                                Make Member
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRoleChange(member.id, 'viewer')}
                              >
                                <Users className="h-4 w-4 mr-2" />
                                Make Viewer
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove from workspace
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {canManageMembers && invitations.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Pending Invitations ({invitations.length})</h3>
              <div className="space-y-2">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Invited {new Date(invitation.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{invitation.role}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCancelInvitation(invitation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <InviteMemberDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        workspaceId={workspaceId}
        onInviteSent={() => {
          fetchInvitations()
          setIsInviteOpen(false)
        }}
      />
    </>
  )
}