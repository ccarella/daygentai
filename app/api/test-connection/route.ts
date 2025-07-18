import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey } = await request.json()

    if (!provider || !apiKey) {
      return NextResponse.json(
        { success: false, message: 'Provider and API key are required' },
        { status: 400 }
      )
    }

    // Test OpenAI connection
    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })

      if (response.ok) {
        return NextResponse.json({ 
          success: true, 
          message: 'Successfully connected to OpenAI' 
        })
      } else if (response.status === 401) {
        return NextResponse.json({ 
          success: false, 
          message: 'Invalid API key' 
        })
      } else {
        return NextResponse.json({ 
          success: false, 
          message: `Connection failed: ${response.statusText}` 
        })
      }
    }

    // Test Anthropic connection
    if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
        }),
      })

      if (response.ok) {
        return NextResponse.json({ 
          success: true, 
          message: 'Successfully connected to Anthropic' 
        })
      } else if (response.status === 401) {
        return NextResponse.json({ 
          success: false, 
          message: 'Invalid API key' 
        })
      } else {
        return NextResponse.json({ 
          success: false, 
          message: `Connection failed: ${response.statusText}` 
        })
      }
    }

    // Test OpenRouter connection
    if (provider === 'openrouter') {
      const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })

      if (response.ok) {
        return NextResponse.json({ 
          success: true, 
          message: 'Successfully connected to OpenRouter' 
        })
      } else if (response.status === 401) {
        return NextResponse.json({ 
          success: false, 
          message: 'Invalid API key' 
        })
      } else {
        return NextResponse.json({ 
          success: false, 
          message: `Connection failed: ${response.statusText}` 
        })
      }
    }

    // Test Grok connection
    if (provider === 'grok') {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'grok-beta',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
      })

      if (response.ok) {
        return NextResponse.json({ 
          success: true, 
          message: 'Successfully connected to Grok' 
        })
      } else if (response.status === 401) {
        return NextResponse.json({ 
          success: false, 
          message: 'Invalid API key' 
        })
      } else {
        return NextResponse.json({ 
          success: false, 
          message: `Connection failed: ${response.statusText}` 
        })
      }
    }

    // Test Kimi K2 connection
    if (provider === 'kimi-k2') {
      // Note: Kimi K2 API endpoint may need to be updated based on their documentation
      const response = await fetch('https://api.moonshot.cn/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })

      if (response.ok) {
        return NextResponse.json({ 
          success: true, 
          message: 'Successfully connected to Kimi K2' 
        })
      } else if (response.status === 401) {
        return NextResponse.json({ 
          success: false, 
          message: 'Invalid API key' 
        })
      } else {
        return NextResponse.json({ 
          success: false, 
          message: `Connection failed: ${response.statusText}` 
        })
      }
    }

    return NextResponse.json(
      { success: false, message: 'Provider not supported' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Test connection error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to test connection' },
      { status: 500 }
    )
  }
}