'use server'

import { createClient } from '@/lib/supabase/server'
import { encryptApiKey, getEncryptionSecret } from '@/lib/crypto/api-key-encryption'

interface UpdateApiSettingsParams {
  workspaceId: string
  apiKey: string
  apiProvider: string
  agentsContent: string
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