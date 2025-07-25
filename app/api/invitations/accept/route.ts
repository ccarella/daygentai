import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('workspace_invitations')
      .select('*')
      .eq('token', token)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
    }

    // Check if invitation is already accepted
    if (invitation.accepted_at) {
      return NextResponse.json({ error: 'Invitation has already been accepted' }, { status: 400 })
    }

    // Check if user email matches invitation email (optional - you might want to allow any authenticated user)
    // For now, we'll allow any authenticated user to accept
    // if (user.email !== invitation.email) {
    //   return NextResponse.json({ error: 'Email mismatch' }, { status: 403 })
    // }

    // Start a transaction to:
    // 1. Add user to workspace_members
    // 2. Mark invitation as accepted
    
    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', invitation.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      // User is already a member, just mark invitation as accepted
      const { error: updateError } = await supabase
        .from('workspace_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({ 
        success: true, 
        message: 'You are already a member of this workspace' 
      })
    }

    // Add user to workspace_members
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: invitation.workspace_id,
        user_id: user.id,
        role: invitation.role,
      })

    if (memberError) {
      console.error('Error adding member:', memberError)
      return NextResponse.json({ error: 'Failed to add member to workspace' }, { status: 500 })
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from('workspace_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    if (updateError) {
      console.error('Error updating invitation:', updateError)
      // Note: User is already added to workspace at this point
      // In production, you'd want proper transaction support
    }

    // Create user profile if it doesn't exist
    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email || invitation.email,
          name: user.user_metadata?.['name'] || user.email?.split('@')[0] || 'User',
        })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully joined workspace' 
    })

  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}