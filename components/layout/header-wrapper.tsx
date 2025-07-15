import { createClient } from '@/lib/supabase/server'
import { Header } from './header'

export async function HeaderWrapper() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('users')
    .select('name, avatar_url')
    .eq('id', user.id)
    .single()
  
  if (!profile) return null
  
  return <Header initialProfile={profile} />
}