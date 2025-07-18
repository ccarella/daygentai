import { createClient } from './supabase/client'
import { getURL } from './helpers'

export async function signInWithMagicLink(email) {
  const supabase = createClient()
  
  // This is the magic - getURL() automatically uses the right domain
  const redirectURL = `${getURL()}/auth/callback`
  
  const { data, error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      emailRedirectTo: redirectURL,
    },
  })
  
  return { data, error }
}