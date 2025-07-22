import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isEncryptedApiKey, getEncryptionSecret, decryptApiKey } from '@/lib/crypto/api-key-encryption'

interface DebugRequest {
  workspaceId: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as DebugRequest
    const { workspaceId } = body

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, owner_id, api_key, api_provider')
      .eq('id', workspaceId)
      .single()

    if (workspaceError || !workspace) {
      return NextResponse.json({ 
        error: 'Workspace not found',
        details: workspaceError?.message 
      }, { status: 404 })
    }

    // Check access
    const isOwner = workspace.owner_id === user.id
    if (!isOwner) {
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single()
      
      if (!membership || membership.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }

    // Debug info
    const debugInfo: Record<string, unknown> = {
      workspaceId: workspace.id,
      hasApiKey: !!workspace.api_key,
      apiProvider: workspace.api_provider,
      apiKeyLength: workspace.api_key?.length || 0,
      isEncrypted: workspace.api_key ? isEncryptedApiKey(workspace.api_key) : false,
      hasEncryptionSecret: !!process.env['API_KEY_ENCRYPTION_SECRET'],
      encryptionSecretLength: process.env['API_KEY_ENCRYPTION_SECRET']?.length || 0,
      environment: process.env['NODE_ENV'],
      vercelEnv: process.env['VERCEL_ENV']
    }

    // Try to decrypt if encrypted
    if (workspace.api_key && isEncryptedApiKey(workspace.api_key)) {
      try {
        const secret = getEncryptionSecret()
        const decrypted = decryptApiKey(workspace.api_key, secret)
        debugInfo['decryptionSuccess'] = true
        debugInfo['decryptedKeyPrefix'] = decrypted.substring(0, 7) + '...'
      } catch (error) {
        debugInfo['decryptionSuccess'] = false
        debugInfo['decryptionError'] = error instanceof Error ? error.message : 'Unknown error'
      }
    }

    return NextResponse.json({ debug: debugInfo })

  } catch (error) {
    console.error('Debug API key error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}