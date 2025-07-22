import { createClient } from '@/lib/supabase/server';
import { OpenAIAdapter } from '../providers/openai-adapter';
import { AnthropicAdapter } from '../providers/anthropic-adapter';
import { getLLMCache } from '../cache/memory-cache';
import { RateLimiter } from '../rate-limit/rate-limiter';
import { validateAndSanitizeRequest } from '../validators/request-validator';
import { decryptApiKey, getEncryptionSecret, isEncryptedApiKey } from '@/lib/crypto/api-key-encryption';
import { 
  ProxyRequest, 
  ProxyResponse, 
  LLMResponse,
  calculateCost 
} from '../types';

export class LLMProxyService {
  private cache = getLLMCache();
  private rateLimiter = new RateLimiter();
  
  async processRequest(
    request: ProxyRequest,
    userId: string
  ): Promise<ProxyResponse> {
    console.log('[LLM Proxy] Processing request:', {
      provider: request.provider,
      workspaceId: request.workspaceId,
      endpoint: request.endpoint,
      model: request.request.model
    });
    
    // Validate and sanitize the request
    const sanitizedRequest = validateAndSanitizeRequest(request.request);
    
    // Check rate limits (with graceful fallback if table doesn't exist)
    try {
      const rateLimitStatus = await this.rateLimiter.checkRateLimit(request.workspaceId);
      if (!rateLimitStatus.allowed) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
    } catch (rateLimitError) {
      // If rate limit check fails (e.g., table doesn't exist), log but continue
      console.warn('[LLM Proxy] Rate limit check failed, continuing without rate limiting:', rateLimitError);
    }
    
    // Check cache first (only for non-streaming requests)
    if (!sanitizedRequest.stream) {
      const cachedResponse = this.cache.get(
        request.provider,
        sanitizedRequest,
        request.workspaceId
      );
      
      if (cachedResponse) {
        console.log('[LLM Proxy] Cache hit');
        return {
          data: cachedResponse,
          usage: {
            inputTokens: cachedResponse.usage?.prompt_tokens || 0,
            outputTokens: cachedResponse.usage?.completion_tokens || 0,
            totalTokens: cachedResponse.usage?.total_tokens || 0,
            estimatedCost: 0, // No cost for cached responses
          },
          cached: true,
          requestId: crypto.randomUUID(),
        };
      }
    }
    
    // Get the centralized API key from app settings
    const apiKey = await this.getAppApiKey(request.provider);
    
    // Make the actual API call
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    let response: LLMResponse;
    try {
      const adapter = this.getAdapter(request.provider, apiKey);
      response = await adapter.complete(sanitizedRequest);
    } catch (error) {
      // Log the error but don't expose API details
      console.error('[LLM Proxy] API error:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          throw new Error('Invalid API key. Please contact your administrator.');
        }
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          throw new Error('API rate limit exceeded. Please try again later.');
        }
        if (error.message.includes('timeout')) {
          throw new Error('Request timed out. Please try again.');
        }
      }
      
      throw new Error('Failed to process LLM request. Please contact your administrator.');
    }
    
    const responseTime = Date.now() - startTime;
    
    // Cache the response
    if (!sanitizedRequest.stream && response.usage) {
      this.cache.set(
        request.provider,
        sanitizedRequest,
        request.workspaceId,
        response
      );
    }
    
    // Calculate cost
    const usage = {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
      estimatedCost: calculateCost(
        sanitizedRequest.model,
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0
      ),
    };
    
    // Log usage to database (with graceful fallback)
    try {
      await this.logUsage({
        workspaceId: request.workspaceId,
        userId,
        model: sanitizedRequest.model,
        provider: request.provider,
        ...usage,
        endpoint: request.endpoint,
        requestId,
        responseTimeMs: responseTime,
        cacheHit: false,
      });
    } catch (error) {
      console.warn('[LLM Proxy] Failed to log usage (table may not exist):', error);
    }
    
    // Increment rate limit counter (with graceful fallback)
    try {
      await this.rateLimiter.incrementCounter(request.workspaceId);
    } catch (error) {
      console.warn('[LLM Proxy] Failed to increment rate limit counter:', error);
    }
    
    return {
      data: response,
      usage,
      cached: false,
      requestId,
    };
  }
  
  private async getAppApiKey(provider: string): Promise<string> {
    console.log('[LLM Proxy] Getting app-wide API key for provider:', provider);
    
    // First check environment variables (fallback for easier deployment)
    const envKey = provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY';
    const envApiKey = process.env[envKey];
    
    if (envApiKey) {
      console.log('[LLM Proxy] Using API key from environment variable');
      return envApiKey;
    }
    
    // Otherwise, fetch from database
    const supabase = await createClient();
    
    const settingKey = provider === 'openai' ? 'openai_api_key' : 'anthropic_api_key';
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', settingKey)
      .single();
    
    if (error || !data || !data.setting_value) {
      console.error('[LLM Proxy] App settings query error:', error);
      throw new Error(`No API key configured for ${provider}. Please contact your administrator.`);
    }
    
    console.log('[LLM Proxy] App settings data:', {
      hasApiKey: !!data.setting_value,
      apiKeyLength: data.setting_value?.length,
    });
    
    // Check if the API key looks encrypted (base64 with minimum length)
    if (!isEncryptedApiKey(data.setting_value)) {
      console.warn('[LLM Proxy] API key does not appear to be encrypted. Consider re-saving it.');
      // For backward compatibility, return the key as-is
      return data.setting_value;
    }
    
    // Decrypt the API key
    try {
      console.log('[LLM Proxy] Attempting to decrypt API key...');
      const encryptionSecret = getEncryptionSecret();
      console.log('[LLM Proxy] Got encryption secret, length:', encryptionSecret.length);
      const decryptedKey = decryptApiKey(data.setting_value, encryptionSecret);
      console.log('[LLM Proxy] Successfully decrypted API key');
      return decryptedKey;
    } catch (error) {
      console.error('[LLM Proxy] Failed to decrypt API key:', error);
      console.error('[LLM Proxy] Decryption error details:', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        hasEncryptionSecret: !!process.env['API_KEY_ENCRYPTION_SECRET'],
        encryptedKeyLength: data.setting_value.length
      });
      throw new Error(`Failed to decrypt API key for ${provider}. Please contact your administrator.`);
    }
  }
  
  private getAdapter(provider: string, apiKey: string) {
    switch (provider) {
      case 'openai':
        return new OpenAIAdapter(apiKey);
      case 'anthropic':
        return new AnthropicAdapter(apiKey);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
  
  private async logUsage(usage: {
    workspaceId: string;
    userId: string;
    model: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
    endpoint: string;
    requestId: string;
    responseTimeMs: number;
    cacheHit: boolean;
  }) {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('llm_usage_logs')
      .insert({
        workspace_id: usage.workspaceId,
        user_id: usage.userId,
        model: usage.model,
        provider: usage.provider,
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens, 
        total_tokens: usage.totalTokens,
        estimated_cost: usage.estimatedCost,
        endpoint: usage.endpoint,
        request_id: usage.requestId,
        response_time_ms: usage.responseTimeMs,
        cache_hit: usage.cacheHit,
      });
    
    if (error) {
      console.error('[LLM Proxy] Failed to log usage:', error);
      // Don't throw - logging failures shouldn't break the request
    }
  }
}

// Export a singleton instance
export const llmProxyService = new LLMProxyService();