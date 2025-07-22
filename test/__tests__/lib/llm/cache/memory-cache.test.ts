import { describe, it, expect, beforeEach } from 'vitest';
import { LLMMemoryCache } from '@/lib/llm/cache/memory-cache';
import { LLMRequest, LLMResponse } from '@/lib/llm/types';

describe('LLM Memory Cache', () => {
  let cache: LLMMemoryCache;

  const mockRequest: LLMRequest = {
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a helpful assistant' },
      { role: 'user', content: 'Hello' }
    ],
    temperature: 0.7,
    max_tokens: 100
  };

  const mockResponse: LLMResponse = {
    id: 'test-id',
    choices: [{
      message: { role: 'assistant', content: 'Hello! How can I help you?' },
      finish_reason: 'stop'
    }],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 8,
      total_tokens: 18
    },
    model: 'gpt-3.5-turbo',
    created: Date.now()
  };

  beforeEach(() => {
    cache = new LLMMemoryCache({ maxSize: 10, ttl: 1000 * 60 }); // 1 minute TTL
  });

  describe('get and set', () => {
    it('should cache and retrieve a response', () => {
      cache.set('openai', mockRequest, 'workspace-1', mockResponse);
      const cached = cache.get('openai', mockRequest, 'workspace-1');
      
      expect(cached).toEqual(mockResponse);
    });

    it('should return null for cache miss', () => {
      const cached = cache.get('openai', mockRequest, 'workspace-1');
      expect(cached).toBeNull();
    });

    it('should generate different cache keys for different providers', () => {
      cache.set('openai', mockRequest, 'workspace-1', mockResponse);
      
      const cachedOpenAI = cache.get('openai', mockRequest, 'workspace-1');
      const cachedAnthropic = cache.get('anthropic', mockRequest, 'workspace-1');
      
      expect(cachedOpenAI).toEqual(mockResponse);
      expect(cachedAnthropic).toBeNull();
    });

    it('should generate different cache keys for different workspaces', () => {
      cache.set('openai', mockRequest, 'workspace-1', mockResponse);
      
      const cached1 = cache.get('openai', mockRequest, 'workspace-1');
      const cached2 = cache.get('openai', mockRequest, 'workspace-2');
      
      expect(cached1).toEqual(mockResponse);
      expect(cached2).toBeNull();
    });

    it('should generate different cache keys for different messages', () => {
      const request2 = { ...mockRequest, messages: [{ role: 'user' as const, content: 'Hi' }] };
      
      cache.set('openai', mockRequest, 'workspace-1', mockResponse);
      
      const cached1 = cache.get('openai', mockRequest, 'workspace-1');
      const cached2 = cache.get('openai', request2, 'workspace-1');
      
      expect(cached1).toEqual(mockResponse);
      expect(cached2).toBeNull();
    });

    it('should consider temperature in cache key', () => {
      const request2 = { ...mockRequest, temperature: 0.9 };
      
      cache.set('openai', mockRequest, 'workspace-1', mockResponse);
      
      const cached1 = cache.get('openai', mockRequest, 'workspace-1');
      const cached2 = cache.get('openai', request2, 'workspace-1');
      
      expect(cached1).toEqual(mockResponse);
      expect(cached2).toBeNull();
    });

    it('should not cache streaming requests', () => {
      const streamRequest = { ...mockRequest, stream: true };
      
      cache.set('openai', streamRequest, 'workspace-1', mockResponse);
      const cached = cache.get('openai', streamRequest, 'workspace-1');
      
      expect(cached).toBeNull();
    });

    it('should not retrieve cache for streaming requests', () => {
      cache.set('openai', mockRequest, 'workspace-1', mockResponse);
      
      const streamRequest = { ...mockRequest, stream: true };
      const cached = cache.get('openai', streamRequest, 'workspace-1');
      
      expect(cached).toBeNull();
    });

    it('should not cache responses without usage data', () => {
      const responseWithoutUsage = { ...mockResponse };
      delete responseWithoutUsage.usage;
      
      cache.set('openai', mockRequest, 'workspace-1', responseWithoutUsage);
      const cached = cache.get('openai', mockRequest, 'workspace-1');
      
      expect(cached).toBeNull();
    });
  });

  describe('TTL behavior', () => {
    it('should expire entries after TTL', async () => {
      const shortTTLCache = new LLMMemoryCache({ maxSize: 10, ttl: 100 }); // 100ms TTL
      
      shortTTLCache.set('openai', mockRequest, 'workspace-1', mockResponse);
      
      // Should be cached initially
      expect(shortTTLCache.get('openai', mockRequest, 'workspace-1')).toEqual(mockResponse);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be expired
      expect(shortTTLCache.get('openai', mockRequest, 'workspace-1')).toBeNull();
    });
  });

  describe('LRU behavior', () => {
    it('should evict least recently used items when full', () => {
      const smallCache = new LLMMemoryCache({ maxSize: 2, ttl: 1000 * 60 });
      
      const request1 = { ...mockRequest, messages: [{ role: 'user' as const, content: 'Request 1' }] };
      const request2 = { ...mockRequest, messages: [{ role: 'user' as const, content: 'Request 2' }] };
      const request3 = { ...mockRequest, messages: [{ role: 'user' as const, content: 'Request 3' }] };
      
      const response1 = { ...mockResponse, id: 'response-1' };
      const response2 = { ...mockResponse, id: 'response-2' };
      const response3 = { ...mockResponse, id: 'response-3' };
      
      // Add first two
      smallCache.set('openai', request1, 'workspace-1', response1);
      smallCache.set('openai', request2, 'workspace-1', response2);
      
      // Both should be cached
      expect(smallCache.get('openai', request1, 'workspace-1')).toEqual(response1);
      expect(smallCache.get('openai', request2, 'workspace-1')).toEqual(response2);
      
      // Add third, should evict first
      smallCache.set('openai', request3, 'workspace-1', response3);
      
      // First should be evicted, second and third should remain
      expect(smallCache.get('openai', request1, 'workspace-1')).toBeNull();
      expect(smallCache.get('openai', request2, 'workspace-1')).toEqual(response2);
      expect(smallCache.get('openai', request3, 'workspace-1')).toEqual(response3);
    });

    it('should update age on get', () => {
      const smallCache = new LLMMemoryCache({ maxSize: 2, ttl: 1000 * 60 });
      
      const request1 = { ...mockRequest, messages: [{ role: 'user' as const, content: 'Request 1' }] };
      const request2 = { ...mockRequest, messages: [{ role: 'user' as const, content: 'Request 2' }] };
      const request3 = { ...mockRequest, messages: [{ role: 'user' as const, content: 'Request 3' }] };
      
      const response1 = { ...mockResponse, id: 'response-1' };
      const response2 = { ...mockResponse, id: 'response-2' };
      const response3 = { ...mockResponse, id: 'response-3' };
      
      // Add first two
      smallCache.set('openai', request1, 'workspace-1', response1);
      smallCache.set('openai', request2, 'workspace-1', response2);
      
      // Access first to make it more recently used
      smallCache.get('openai', request1, 'workspace-1');
      
      // Add third, should evict second (not first)
      smallCache.set('openai', request3, 'workspace-1', response3);
      
      // First and third should remain, second should be evicted
      expect(smallCache.get('openai', request1, 'workspace-1')).toEqual(response1);
      expect(smallCache.get('openai', request2, 'workspace-1')).toBeNull();
      expect(smallCache.get('openai', request3, 'workspace-1')).toEqual(response3);
    });
  });

  describe('clear', () => {
    it('should clear all cached entries', () => {
      cache.set('openai', mockRequest, 'workspace-1', mockResponse);
      
      expect(cache.get('openai', mockRequest, 'workspace-1')).toEqual(mockResponse);
      
      cache.clear();
      
      expect(cache.get('openai', mockRequest, 'workspace-1')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      const stats = cache.getStats();
      expect(stats).toHaveProperty('size', 0);
      expect(stats).toHaveProperty('calculatedSize');
      
      cache.set('openai', mockRequest, 'workspace-1', mockResponse);
      
      const newStats = cache.getStats();
      expect(newStats.size).toBe(1);
    });
  });
});