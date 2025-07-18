import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

// Function to sanitize user input
function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  // Remove null bytes and other control characters except newlines and carriage returns
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Escape special characters that could be used for template literal injection
  sanitized = sanitized
    .replace(/`/g, '\\`')  // Escape backticks to prevent template literal injection
    .replace(/\$/g, '\\$') // Escape dollar signs to prevent template literal interpolation

  // Truncate to reasonable length to prevent DoS
  const maxLength = 10000
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...'
  }

  return sanitized
}

// Function to validate input against whitelist
function validateInput(input: string): { isValid: boolean; error?: string } {
  if (!input || typeof input !== 'string') {
    return { isValid: false, error: 'Input must be a non-empty string' }
  }

  // Check length
  if (input.length > 10000) {
    return { isValid: false, error: 'Input exceeds maximum length of 10000 characters' }
  }

  // Check for suspicious patterns that might indicate injection attempts
  const suspiciousPatterns = [
    /<script/i,
    /<iframe/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /eval\s*\(/i,
    /new\s+Function/i,
    /import\s*\(/i,
    /require\s*\(/i,
    /__proto__/i,
    /constructor\s*\[/i,
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(input)) {
      return { isValid: false, error: 'Input contains potentially malicious content' }
    }
  }

  return { isValid: true }
}

async function generateWithOpenAI(userPrompt: string, apiKey: string): Promise<{ prompt: string; error?: string }> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `API request failed: ${response.status}`)
    }

    const data = await response.json()
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format from OpenAI API')
    }
    
    if (!Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error('No choices returned from OpenAI API')
    }
    
    const firstChoice = data.choices[0]
    if (!firstChoice || !firstChoice.message || typeof firstChoice.message.content !== 'string') {
      throw new Error('Invalid choice format in OpenAI API response')
    }
    
    const generatedPrompt = firstChoice.message.content.trim()
    
    if (!generatedPrompt) {
      throw new Error('No prompt generated')
    }

    return { prompt: generatedPrompt }
  } catch (error) {
    console.error('OpenAI API error:', error)
    return {
      prompt: '',
      error: error instanceof Error ? error.message : 'OpenAI API error'
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json() as GeneratePromptRequest
    const { title, description, workspaceId } = body

    // Validate required fields
    if (!title || !description || !workspaceId) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, or workspaceId' },
        { status: 400 }
      )
    }

    // Validate inputs
    const titleValidation = validateInput(title)
    if (!titleValidation.isValid) {
      return NextResponse.json(
        { error: `Invalid title: ${titleValidation.error}` },
        { status: 400 }
      )
    }

    const descriptionValidation = validateInput(description)
    if (!descriptionValidation.isValid) {
      return NextResponse.json(
        { error: `Invalid description: ${descriptionValidation.error}` },
        { status: 400 }
      )
    }

    // Create authenticated Supabase client
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user has access to the workspace
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, owner_id, api_key, api_provider, agents_content')
      .eq('id', workspaceId)
      .eq('owner_id', profile.id)
      .single()

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 403 }
      )
    }

    // Check if workspace has API key configured
    if (!workspace.api_key) {
      return NextResponse.json(
        { error: 'No API key configured for this workspace' },
        { status: 400 }
      )
    }

    // Sanitize inputs
    const sanitizedTitle = sanitizeInput(title)
    const sanitizedDescription = sanitizeInput(description)
    const sanitizedAgentsContent = workspace.agents_content ? sanitizeInput(workspace.agents_content) : undefined

    // Construct the user prompt with sanitized inputs
    const userPrompt = `Convert this to a prompt for an LLM-based software development agent.

Issue Title: ${sanitizedTitle}
Issue Description: ${sanitizedDescription}

${sanitizedAgentsContent ? `Additional context from Agents.md:
${sanitizedAgentsContent}` : ''}`

    // Generate the prompt using the appropriate provider
    let result: { prompt: string; error?: string }
    
    if (workspace.api_provider === 'openai' || !workspace.api_provider) {
      result = await generateWithOpenAI(userPrompt, workspace.api_key)
    } else {
      result = {
        prompt: '',
        error: `Provider ${workspace.api_provider} is not yet implemented`
      }
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // Return only the generated prompt, not the API key
    return NextResponse.json({ prompt: result.prompt })

  } catch (error) {
    console.error('Error in generate-prompt route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}