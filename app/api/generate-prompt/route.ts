import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { LLMProxyService } from '@/lib/llm/proxy/llm-proxy-service'
import { withTimeout } from '@/lib/middleware/timeout'
import { withRateLimit } from '@/lib/middleware/rate-limit'

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

// Input validation is now handled by the proxy service

const proxyService = new LLMProxyService();

async function generateWithProxy(
  workspaceId: string,
  provider: string,
  userPrompt: string,
  userId: string
): Promise<{ prompt: string; error?: string }> {
  try {
    const response = await proxyService.processRequest({
      provider: provider as 'openai' | 'anthropic',
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
    }, userId);

    const generatedPrompt = response.data.choices[0]?.message?.content?.trim();
    
    if (!generatedPrompt) {
      throw new Error('No prompt generated');
    }

    return { prompt: generatedPrompt };
  } catch (error) {
    console.error('[Generate Prompt] Error:', error);
    return {
      prompt: '',
      error: error instanceof Error ? error.message : 'Failed to generate prompt'
    };
  }
}

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
      .maybeSingle()

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
        api_key, 
        api_provider, 
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

    console.log('[Generate Prompt] Workspace found:', {
      id: workspace.id,
      hasApiKey: !!workspace.api_key,
      provider: workspace.api_provider
    })

    // The proxy will handle API key validation
    const provider = workspace.api_provider || 'openai'

    // Construct the user prompt
    const userPrompt = `Convert this to a prompt for an LLM-based software development agent.

Issue Title: ${title}
Issue Description: ${description}

${workspace.agents_content ? `Additional context from Agents.md:
${workspace.agents_content}` : ''}`

    // Generate the prompt using the proxy
    console.log('[Generate Prompt] Calling proxy service...')
    const result = await generateWithProxy(workspaceId, provider, userPrompt, user.id)

    if (result.error) {
      console.error('[Generate Prompt] Failed to generate prompt:', result.error)
      console.error('[Generate Prompt] Full error details:', {
        error: result.error,
        workspaceId,
        provider,
        hasApiKey: !!workspace.api_key
      })
      
      // Determine appropriate status code based on error
      let statusCode = 500
      if (result.error.includes('Invalid API key')) {
        statusCode = 401
      } else if (result.error.includes('rate limit')) {
        statusCode = 429
      }
      
      // Return error in the format expected by the client
      return NextResponse.json({ error: result.error }, { status: statusCode })
    }

    // Return only the generated prompt, not the API key
    return NextResponse.json({ prompt: result.prompt })

  } catch (error) {
    console.error('Error in generate-prompt route:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}

// Apply rate limiting and timeout protection
// Rate limits: 10 requests per minute, 100 per hour, 1000 per day
export const POST = withRateLimit(
  withTimeout(handlePOST, { timeoutMs: 30000 }),
  {
    limits: {
      minuteLimit: 10,
      hourLimit: 100,
      dayLimit: 1000
    },
    errorMessage: 'Too many prompt generation requests. Please try again later.'
  }
)