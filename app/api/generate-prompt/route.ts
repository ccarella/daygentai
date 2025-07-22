import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { LLMProxyService } from '@/lib/llm/proxy/llm-proxy-service'

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
    // Parse request body
    const body = await req.json() as GeneratePromptRequest
    const { title, description, workspaceId } = body

    // Validate required fields
    if (!title || !description || !workspaceId) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, description, or workspaceId' 
      }, { status: 400 })
    }

    // Basic validation
    if (title.length > 10000 || description.length > 10000) {
      return NextResponse.json({ 
        error: 'Input exceeds maximum length of 10000 characters' 
      }, { status: 400 })
    }

    // Create authenticated Supabase client
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

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
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select(`
        id, 
        owner_id, 
        api_key, 
        api_provider, 
        agents_content,
        workspace_members!inner (
          user_id,
          role
        )
      `)
      .eq('id', workspaceId)
      .eq('workspace_members.user_id', user.id)
      .single()

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found or access denied' }, { status: 403 })
    }

    // The proxy will handle API key validation
    const provider = workspace.api_provider || 'openai'

    // Construct the user prompt
    const userPrompt = `Convert this to a prompt for an LLM-based software development agent.

Issue Title: ${title}
Issue Description: ${description}

${workspace.agents_content ? `Additional context from Agents.md:
${workspace.agents_content}` : ''}`

    // Generate the prompt using the proxy
    const result = await generateWithProxy(workspaceId, provider, userPrompt, user.id)

    if (result.error) {
      console.error('[Generate Prompt] Failed to generate prompt:', result.error)
      
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

// Export the handler directly for now to debug the issue
// TODO: Re-enable timeout protection after fixing the API issue
export const POST = handlePOST