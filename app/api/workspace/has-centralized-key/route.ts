import { NextResponse } from 'next/server'

export async function GET() {
  // Check for centralized API keys in environment variables
  const hasCentralizedKey = !!(
    process.env['CENTRALIZED_OPENAI_API_KEY'] || 
    process.env['CENTRALIZED_ANTHROPIC_API_KEY']
  )
  
  return NextResponse.json({ 
    hasCentralizedKey 
  })
}