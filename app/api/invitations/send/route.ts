import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { invitationId, email, token } = await request.json()

    const supabase = await createClient()
    
    // Verify the user has permission to send this invitation
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the invitation exists and belongs to a workspace the user can manage
    const { data: invitation, error: inviteError } = await supabase
      .from('workspace_invitations')
      .select(`
        id,
        workspace_id,
        workspaces!inner (
          id,
          name,
          slug
        )
      `)
      .eq('id', invitationId)
      .single() as { data: { id: string; workspace_id: string; workspaces: { id: string; name: string; slug: string } } | null; error: unknown }

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
    }

    // Get the inviter's name (kept for future email implementation)
    // const { data: inviterData } = await supabase
    //   .from('users')
    //   .select('name')
    //   .eq('id', user.id)
    //   .single()

    // const inviterName = inviterData?.name || user.email || 'A team member'
    // const workspaceName = invitation.workspaces.name
    const inviteUrl = `${process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000'}/invite/accept?token=${token}`

    // Send email using Supabase Auth's email service
    // Note: In production, you might want to use a proper email service like Resend, SendGrid, etc.
    // For now, we'll use Supabase's built-in email functionality
    // Email HTML template (kept for reference)
    /* const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">You're invited to join ${workspaceName}</h2>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          ${inviterName} has invited you to collaborate on <strong>${workspaceName}</strong> workspace.
        </p>
        
        ${message ? `
          <div style="background: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin-bottom: 20px;">
            <p style="color: #666; margin: 0; font-style: italic;">"${message}"</p>
            <p style="color: #999; margin: 10px 0 0 0; font-size: 14px;">- ${inviterName}</p>
          </div>
        ` : ''}
        
        <a href="${inviteUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-bottom: 20px;">
          Accept Invitation
        </a>
        
        <p style="color: #999; font-size: 14px; line-height: 1.6;">
          Or copy and paste this link into your browser:<br>
          <a href="${inviteUrl}" style="color: #007bff; word-break: break-all;">${inviteUrl}</a>
        </p>
        
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          This invitation will expire in 7 days. If you don't want to join this workspace, you can safely ignore this email.
        </p>
      </div>
    ` */

    // Send invitation email
    // NOTE: To enable email sending:
    // 1. Install Resend: npm install resend
    // 2. Get an API key from https://resend.com
    // 3. Add RESEND_API_KEY to your .env.local
    // 4. Uncomment the import and function call below
    
    // import { sendInvitationEmail } from '@/lib/email/resend-implementation'
    
    // const emailResult = await sendInvitationEmail({
    //   to: email,
    //   inviterName: inviter.name || inviter.email || 'A team member',
    //   workspaceName: workspace.name,
    //   inviteUrl,
    //   role,
    //   personalMessage
    // })
    
    // if (!emailResult.success) {
    //   console.error('Failed to send invitation email:', emailResult.error)
    //   // Note: We don't fail the invitation creation if email fails
    //   // The invitation is still valid and can be shared manually
    // }
    
    // For development, log the invitation URL
    console.log('Invitation created for:', email)
    console.log('Invitation URL:', inviteUrl)
    return NextResponse.json({ 
      success: true, 
      message: 'Invitation created successfully',
      inviteUrl // Return the URL for development/testing
    })

  } catch (error) {
    console.error('Error sending invitation:', error)
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    )
  }
}