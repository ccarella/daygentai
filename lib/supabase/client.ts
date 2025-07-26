import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseConfig } from './config'

export function createClient() {
  const config = getSupabaseConfig()
  
  return createBrowserClient(
    config.url,
    config.anonKey
  )
}