import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AcceptInviteContent } from './accept-invite-content'

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  
  if (!token) {
    redirect('/')
  }

  const supabase = await createClient()
  
  // Get the invitation details
  const { data: invitation, error } = await supabase
    .from('workspace_invitations')
    .select(`
      id,
      email,
      role,
      expires_at,
      accepted_at,
      workspace_id,
      workspaces!inner (
        id,
        name,
        slug,
        avatar_url
      )
    `)
    .eq('token', token)
    .single() as { data: { 
        id: string; 
        email: string; 
        role: string; 
        expires_at: string; 
        accepted_at: string | null; 
        workspace_id: string;
        workspaces: { 
          id: string; 
          name: string; 
          slug: string; 
          avatar_url: string | null 
        } 
      } | null; error: unknown }

  if (error || !invitation) {
    redirect('/?error=invalid_invitation')
  }

  // Check if invitation is expired
  if (new Date(invitation.expires_at) < new Date()) {
    redirect('/?error=invitation_expired')
  }

  // Check if invitation is already accepted
  if (invitation.accepted_at) {
    redirect(`/${invitation.workspaces.slug}`)
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <AcceptInviteContent
      invitation={{
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        workspace: {
          id: invitation.workspace_id,
          name: invitation.workspaces.name,
          slug: invitation.workspaces.slug,
          avatar_url: invitation.workspaces.avatar_url
        }
      }}
      token={token}
      isAuthenticated={!!user}
      userEmail={user?.email}
    />
  )
}