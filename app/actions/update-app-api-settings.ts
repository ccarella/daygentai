'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { encryptApiKey, getEncryptionSecret } from '@/lib/crypto/api-key-encryption'

export async function updateAppApiSettings(
  provider: 'openai' | 'anthropic',
  apiKey: string
) {
  const supabase = await createClient()
  
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('You must be logged in to update API settings')
  }

  // Check if user is a super admin (owns at least one workspace)
  const { data: workspaces, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)

  if (workspaceError || !workspaces || workspaces.length === 0) {
    throw new Error('You must be a workspace owner to update app-wide API settings')
  }

  // Encrypt the API key before storing
  const encryptionSecret = getEncryptionSecret()
  const encryptedApiKey = encryptApiKey(apiKey, encryptionSecret)
  
  const settingKey = provider === 'openai' ? 'openai_api_key' : 'anthropic_api_key'
  
  // Update the app settings
  const { error: updateError } = await supabase
    .from('app_settings')
    .upsert({
      setting_key: settingKey,
      setting_value: encryptedApiKey,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'setting_key'
    })

  if (updateError) {
    console.error('Error updating app API settings:', updateError)
    throw new Error('Failed to update API settings')
  }

  // Update the default provider if needed
  if (provider === 'openai' || provider === 'anthropic') {
    await supabase
      .from('app_settings')
      .upsert({
        setting_key: 'default_api_provider',
        setting_value: provider,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_key'
      })
  }

  // Revalidate the admin page
  revalidatePath('/admin/api-settings')
  
  return { success: true }
}

export async function getAppApiSettings() {
  const supabase = await createClient()
  
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('You must be logged in to view API settings')
  }

  // Check if user is a super admin
  const { data: workspaces, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)

  if (workspaceError || !workspaces || workspaces.length === 0) {
    throw new Error('You must be a workspace owner to view app-wide API settings')
  }

  // Get the app settings
  const { data: settings, error: settingsError } = await supabase
    .from('app_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['openai_api_key', 'anthropic_api_key', 'default_api_provider'])

  if (settingsError) {
    console.error('Error fetching app API settings:', settingsError)
    throw new Error('Failed to fetch API settings')
  }

  // Transform the settings into a more usable format
  const settingsMap = settings?.reduce((acc, setting) => {
    if (setting.setting_key === 'openai_api_key') {
      acc.hasOpenAIKey = !!setting.setting_value
    } else if (setting.setting_key === 'anthropic_api_key') {
      acc.hasAnthropicKey = !!setting.setting_value
    } else if (setting.setting_key === 'default_api_provider') {
      acc.defaultProvider = setting.setting_value as 'openai' | 'anthropic'
    }
    return acc
  }, {
    hasOpenAIKey: false,
    hasAnthropicKey: false,
    defaultProvider: 'openai' as 'openai' | 'anthropic'
  })

  return settingsMap
}