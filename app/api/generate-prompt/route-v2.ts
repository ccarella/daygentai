import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { llmProxyService } from '@/lib/llm/proxy/llm-proxy-service-v2'

interface GeneratePromptRequest {
  title: string
  description: string
  workspaceId: string
}

const SYSTEM_PROMPT = `Convert this to a prompt for an LLM-based software development agent.

Format the response as follows:
- What to do: [one line summary]
- How: [2-5 key technical points]

Keep the prompt concise and actionable.`

async function handlePOST(req: NextRequest) {
  try {
    console.log('[Generate Prompt] Starting request processing')
    
    // Parse request body
    const body = await req.json() as GeneratePromptRequest
    const { title, description, workspaceId } = body

    console.log('[Generate Prompt] Request params:', { 
      hasTitle: !!title, 
      hasDescription: !!description, 
      workspaceId 
    })

    // Validate required fields
    if (!title || !description || !workspaceId) {
      console.error('[Generate Prompt] Missing required fields')
      return NextResponse.json({ 
        error: 'Missing required fields: title, description, or workspaceId' 
      }, { status: 400 })
    }

    // Basic validation
    if (title.length > 10000 || description.length > 10000) {
      console.error('[Generate Prompt] Input exceeds max length')
      return NextResponse.json({ 
        error: 'Input exceeds maximum length of 10000 characters' 
      }, { status: 400 })
    }

    // Create authenticated Supabase client
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[Generate Prompt] Auth error:', authError?.message || 'No user')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('[Generate Prompt] User authenticated:', user.id)

    // Verify user has access to the workspace
    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if user has access to workspace (either as owner or member)
    console.log('[Generate Prompt] Checking workspace access for:', { workspaceId, userId: user.id })
    
    // First, get the workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select(`
        id, 
        owner_id, 
        agents_content
      `)
      .eq('id', workspaceId)
      .single()

    if (workspaceError || !workspace) {
      console.error('[Generate Prompt] Workspace query error:', workspaceError?.message || 'No workspace found')
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Check if user is owner or member
    const isOwner = workspace.owner_id === user.id
    
    if (!isOwner) {
      // Check if user is a member
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('user_id, role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single()
      
      if (!membership) {
        console.error('[Generate Prompt] User has no access to workspace')
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    console.log('[Generate Prompt] Access verified:', { isOwner, workspaceId })

    // Get default provider from app settings
    const { data: providerSetting } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'default_api_provider')
      .single()
    
    const provider = (providerSetting?.setting_value as 'openai' | 'anthropic') || 'openai'

    // Construct the user prompt
    const userPrompt = `Convert this to a prompt for an LLM-based software development agent.

Issue Title: ${title}
Issue Description: ${description}

${workspace.agents_content ? `Additional context from Agents.md:
${workspace.agents_content}` : ''}`

    // Generate the prompt using the centralized proxy
    console.log('[Generate Prompt] Calling centralized proxy service...')
    
    try {
      const response = await llmProxyService.processRequest({
        provider,
        workspaceId,
        request: {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 500
        },
        endpoint: '/api/generate-prompt'
      }, user.id)

      const generatedPrompt = response.data.choices[0]?.message?.content?.trim()
      
      if (!generatedPrompt) {
        throw new Error('No prompt generated')
      }

      // Return the generated prompt
      return NextResponse.json({ prompt: generatedPrompt })
      
    } catch (error) {
      console.error('[Generate Prompt] Failed to generate prompt:', error)
      
      // Determine appropriate status code based on error
      let statusCode = 500
      let errorMessage = 'Failed to generate prompt'
      
      if (error instanceof Error) {
        errorMessage = error.message
        if (error.message.includes('Invalid API key')) {
          statusCode = 401
        } else if (error.message.includes('rate limit')) {
          statusCode = 429
        }
      }
      
      return NextResponse.json({ error: errorMessage }, { status: statusCode })
    }

  } catch (error) {
    console.error('Error in generate-prompt route:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}

export const POST = handlePOST