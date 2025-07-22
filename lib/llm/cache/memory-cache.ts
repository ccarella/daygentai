import { LRUCache } from 'lru-cache';
import crypto from 'crypto';
import { LLMRequest, LLMResponse } from '../types';

interface CacheEntry {
  response: LLMResponse;
  timestamp: number;
}

export class LLMMemoryCache {
  private cache: LRUCache<string, CacheEntry>;
  
  constructor(options?: {
    maxSize?: number;
    ttl?: number;
  }) {
    this.cache = new LRUCache<string, CacheEntry>({
      max: options?.maxSize || 100, // Maximum number of items
      ttl: options?.ttl || 1000 * 60 * 15, // 15 minutes default TTL
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    });
  }
  
  /**
   * Generates a cache key from the request
   */
  private generateCacheKey(
    provider: string,
    request: LLMRequest,
    workspaceId: string
  ): string {
    const keyData = {
      provider,
      workspaceId,
      model: request.model,
      messages: request.messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.max_tokens,
    };
    
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex');
      
    return `llm:${provider}:${hash}`;
  }
  
  /**
   * Get a cached response if available
   */
  get(
    provider: string,
    request: LLMRequest,
    workspaceId: string
  ): LLMResponse | null {
    // Don't cache streaming requests
    if (request.stream) {
      return null;
    }
    
    const key = this.generateCacheKey(provider, request, workspaceId);
    const entry = this.cache.get(key);
    
    if (entry) {
      return entry.response;
    }
    
    return null;
  }
  
  /**
   * Set a cache entry
   */
  set(
    provider: string,
    request: LLMRequest,
    workspaceId: string,
    response: LLMResponse
  ): void {
    // Don't cache streaming requests or requests without usage data
    if (request.stream || !response.usage) {
      return;
    }
    
    const key = this.generateCacheKey(provider, request, workspaceId);
    const entry: CacheEntry = {
      response,
      timestamp: Date.now(),
    };
    
    this.cache.set(key, entry);
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      calculatedSize: this.cache.calculatedSize,
    };
  }
}

// Global cache instance
let cacheInstance: LLMMemoryCache | null = null;

export function getLLMCache(): LLMMemoryCache {
  if (!cacheInstance) {
    cacheInstance = new LLMMemoryCache();
  }
  return cacheInstance;
}