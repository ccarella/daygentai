import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LLMProxyService } from '@/lib/llm/proxy/llm-proxy-service';
import { withTimeout } from '@/lib/middleware/timeout';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { ProxyRequest } from '@/lib/llm/types';

const proxyService = new LLMProxyService();

async function handler(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json() as ProxyRequest;
    
    // Validate workspace access
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', body.workspaceId)
      .eq('user_id', user.id)
      .single();
    
    if (memberError || !member) {
      return NextResponse.json(
        { error: 'You do not have access to this workspace' },
        { status: 403 }
      );
    }
    
    // Process the request through the proxy
    const response = await proxyService.processRequest(body, user.id);
    
    // Return the response with cache headers if applicable
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (response.cached) {
      headers['X-Cache'] = 'HIT';
      headers['Cache-Control'] = 'private, max-age=900'; // 15 minutes
    } else {
      headers['X-Cache'] = 'MISS';
    }
    
    headers['X-Request-ID'] = response.requestId;
    
    return NextResponse.json(response, { headers });
    
  } catch (error) {
    console.error('LLM proxy error:', error);
    
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('Rate limit exceeded')) {
        return NextResponse.json(
          { error: error.message },
          { status: 429 }
        );
      }
      
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply middleware
export const POST = withErrorHandler(withTimeout(handler, { timeoutMs: 60000 })); // 60 second timeout