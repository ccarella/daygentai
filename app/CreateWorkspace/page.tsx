import CreateWorkspaceForm from '@/components/auth/CreateWorkspaceForm'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CreateWorkspacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Check if user has a profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!userProfile) {
    redirect('/CreateUser')
  }

  // Check if user already has a workspace
  const { data: existingWorkspace } = await supabase
    .from('workspaces')
    .select('slug')
    .eq('owner_id', user.id)
    .single()

  if (existingWorkspace) {
    redirect(`/${existingWorkspace.slug}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <CreateWorkspaceForm />
    </div>
  )
}