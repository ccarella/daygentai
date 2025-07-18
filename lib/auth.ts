import { createClient } from './supabase/client'

export async function signInWithMagicLink(email: string, redirectURL: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      emailRedirectTo: redirectURL,
    },
  })
  
  return { data, error }
}