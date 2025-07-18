import { createClient } from './supabase/client'

export async function signInWithMagicLink(email, redirectURL) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      emailRedirectTo: redirectURL,
    },
  })
  
  return { data, error }
}