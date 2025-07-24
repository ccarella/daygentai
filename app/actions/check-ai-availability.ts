'use server'

import { createClient } from '@/lib/supabase/server'

interface CheckAIAvailabilityResult {
  available: boolean
  hasCentralizedKey: boolean
  hasWorkspaceKey: boolean
  provider?: string
  error?: string
}

export async function checkAIAvailability(workspaceId: string): Promise<CheckAIAvailabilityResult> {
  try {
    // Check for centralized API keys
    const hasCentralizedOpenAI = !!process.env['CENTRALIZED_OPENAI_API_KEY']
    const hasCentralizedAnthropic = !!process.env['CENTRALIZED_ANTHROPIC_API_KEY']
    const hasCentralizedKey = hasCentralizedOpenAI || hasCentralizedAnthropic
    
    // Get workspace settings
    const supabase = await createClient()
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select('api_key, api_provider')
      .eq('id', workspaceId)
      .single()
    
    if (error || !workspace) {
      return {
        available: hasCentralizedKey,
        hasCentralizedKey,
        hasWorkspaceKey: false,
        error: error?.message
      }
    }
    
    const hasWorkspaceKey = !!(workspace.api_key && workspace.api_key.length > 0)
    const provider = workspace.api_provider || (hasCentralizedOpenAI ? 'openai' : 'anthropic')
    
    return {
      available: hasCentralizedKey || hasWorkspaceKey,
      hasCentralizedKey,
      hasWorkspaceKey,
      provider
    }
  } catch (error) {
    console.error('Error checking AI availability:', error)
    return {
      available: false,
      hasCentralizedKey: false,
      hasWorkspaceKey: false,
      error: 'Failed to check AI availability'
    }
  }
}