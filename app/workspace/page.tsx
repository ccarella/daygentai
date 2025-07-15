import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default async function WorkspaceLoadingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Check user profile and workspace
  const [profileResult, workspaceResult] = await Promise.all([
    supabase.from('users').select('id').eq('id', user.id).single(),
    supabase.from('workspaces').select('slug').eq('owner_id', user.id).single()
  ])

  if (!profileResult.data) {
    redirect('/CreateUser')
  } else if (!workspaceResult.data) {
    redirect('/CreateWorkspace')
  } else if (workspaceResult.data.slug) {
    redirect(`/${workspaceResult.data.slug}`)
  }

  // Fallback (should not reach here)
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <LoadingSpinner />
        <p className="text-muted-foreground">Loading your workspace...</p>
      </div>
    </div>
  )
}