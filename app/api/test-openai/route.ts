import { NextRequest, NextResponse } from 'next/server'

// Test endpoint to verify OpenAI API key
// POST /api/test-openai with { apiKey: "sk-..." }

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json()
    
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'API key is required' 
      }, { status: 400 })
    }
    
    // Test the API key with a minimal request
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Say "test successful"' }
        ],
        max_tokens: 10
      })
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: data.error?.message || `API error: ${response.status}`,
        status: response.status
      })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'API key is valid',
      response: data.choices[0].message.content
    })
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Test failed' 
    }, { status: 500 })
  }
}