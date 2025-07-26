export type Environment = 'development' | 'staging' | 'production'

export function getEnvironment(): Environment {
  const env = process.env['NEXT_PUBLIC_APP_ENV'] as Environment
  return env || 'development'
}

export function getSupabaseConfig() {
  const environment = getEnvironment()
  
  // For production, use Vercel's auto-linked variables directly
  if (environment === 'production') {
    const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
    const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
    
    if (!url || !anonKey) {
      throw new Error(
        'Missing Supabase configuration for production. ' +
        'Please ensure Vercel x Supabase integration is properly connected.'
      )
    }
    
    return {
      url,
      anonKey,
      environment
    }
  }
  
  // For staging and development, use environment-specific variables
  const envSpecificUrl = process.env[`NEXT_PUBLIC_SUPABASE_URL_${environment.toUpperCase()}`]
  const envSpecificAnonKey = process.env[`NEXT_PUBLIC_SUPABASE_ANON_KEY_${environment.toUpperCase()}`]
  
  // Fall back to default variables for development
  const url = envSpecificUrl || process.env['NEXT_PUBLIC_SUPABASE_URL']
  const anonKey = envSpecificAnonKey || process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
  
  if (!url || !anonKey) {
    throw new Error(
      `Missing Supabase configuration for environment: ${environment}. ` +
      `Please set NEXT_PUBLIC_SUPABASE_URL_${environment.toUpperCase()} and ` +
      `NEXT_PUBLIC_SUPABASE_ANON_KEY_${environment.toUpperCase()}`
    )
  }
  
  return {
    url,
    anonKey,
    environment
  }
}

// Helper to log which environment is being used (useful for debugging)
export function logSupabaseEnvironment() {
  const config = getSupabaseConfig()
  console.log(`🚀 Using Supabase ${config.environment} environment:`, config.url)
}