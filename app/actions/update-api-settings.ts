'use server'

import { createClient } from '@/lib/supabase/server'
import { encryptApiKey, getEncryptionSecret } from '@/lib/crypto/api-key-encryption'

interface UpdateApiSettingsParams {
  workspaceId: string
  apiKey: string
  apiProvider: string
  agentsContent: string
}

async function validateApiKey(apiKey: string, provider: string): Promise<{ valid: boolean; error?: string }> {
  try {
    if (provider === 'openai') {
      // Test the OpenAI API key with a minimal request
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      })
      
      if (!response.ok) {
        const data = await response.json()
        return { 
          valid: false, 
          error: data.error?.message || `Invalid API key (${response.status})`
        }
      }
      
      return { valid: true }
    } else if (provider === 'anthropic') {
      // Test the Anthropic API key
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1
        })
      })
      
      if (response.status === 401) {
        return { valid: false, error: 'Invalid API key' }
      }
      
      // Other errors (like rate limits) don't mean the key is invalid
      return { valid: true }
    }
    
    // For unknown providers, skip validation
    return { valid: true }
  } catch (error) {
    console.error('Error validating API key:', error)
    // Network errors don't mean the key is invalid
    return { valid: true }
  }
}

export async function updateApiSettings({
  workspaceId,
  apiKey,
  apiProvider,
  agentsContent
}: UpdateApiSettingsParams) {
  try {
    const supabase = await createClient()
    
    // Verify user has access to workspace
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Check if user is a member of the workspace
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !member) {
      return { error: 'Access denied to workspace' }
    }

    // Only owners and admins can update API settings
    if (member.role !== 'owner' && member.role !== 'admin') {
      return { error: 'Only workspace owners and admins can update API settings' }
    }

    // Validate the API key if provided
    if (apiKey && apiProvider) {
      const validation = await validateApiKey(apiKey, apiProvider)
      if (!validation.valid) {
        return { error: validation.error || 'Invalid API key' }
      }
    }

    // Encrypt the API key if provided
    let encryptedApiKey = ''
    if (apiKey) {
      const encryptionSecret = getEncryptionSecret()
      encryptedApiKey = encryptApiKey(apiKey, encryptionSecret)
    }

    // Update workspace settings
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({
        api_key: encryptedApiKey,
        api_provider: apiProvider,
        agents_content: agentsContent
      })
      .eq('id', workspaceId)

    if (updateError) {
      console.error('Error updating workspace:', updateError)
      return { error: 'Failed to update API settings' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in updateApiSettings:', error)
    return { error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}