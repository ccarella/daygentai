import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserWorkspaceRPCResponse } from '@/types/supabase-helpers'

export default async function WorkspaceLoadingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Check user profile
  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/CreateUser')
  }

  // Get user's first workspace using RPC function to bypass RLS recursion
  const { data: workspaces } = await supabase.rpc('get_user_first_workspace', {
    p_user_id: user.id
  })

  if (workspaces && workspaces.length > 0) {
    const firstWorkspace = workspaces[0] as UserWorkspaceRPCResponse
    if (firstWorkspace?.slug) {
      redirect(`/${firstWorkspace.slug}`)
    }
  }

  // No workspaces found - redirect to create one
  redirect('/CreateWorkspace')
}