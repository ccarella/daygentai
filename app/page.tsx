import { EmailLogin } from '@/components/auth/email-login'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaces } from '@/lib/supabase/workspaces'

export default async function Home(props: {
  searchParams: Promise<{ code?: string }>
}) {
  const searchParams = await props.searchParams
  
  // If there's an auth code in the URL, redirect to the callback route
  if (searchParams.code) {
    redirect(`/auth/callback?code=${searchParams.code}`)
  }
  
  // Check if user is authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    // Check if user has a profile
    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      redirect('/CreateUser')
    }
    
    // Check if user has workspaces
    const workspaces = await getUserWorkspaces()
    
    if (!workspaces || workspaces.length === 0) {
      redirect('/CreateWorkspace')
    }
    
    // Redirect to first workspace (we know workspaces[0] exists from the check above)
    const firstWorkspace = workspaces[0]
    if (firstWorkspace) {
      redirect(`/${firstWorkspace.slug}`)
    }
    
    // Fallback to CreateWorkspace if somehow no workspace exists
    redirect('/CreateWorkspace')
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 lg:p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Daygent
          </h1>
          <p className="text-lg text-muted-foreground">
            A Product Management Tool to work with your software developer agents.
          </p>
        </div>
        
        <div className="mt-12">
          <EmailLogin />
        </div>
      </div>
    </div>
  )
}