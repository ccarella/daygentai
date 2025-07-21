import CreateUserForm from '@/components/auth/CreateUserForm'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'

export default async function CreateUserPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Check if user already has a profile
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  if (existingUser) {
    redirect('/CreateWorkspace')
  }

  return (
    <PageContainer>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <CreateUserForm />
      </div>
    </PageContainer>
  )
}