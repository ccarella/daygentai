import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMProxyService } from '@/lib/llm/proxy/llm-proxy-service';
import { ProxyRequest } from '@/lib/llm/types';

// Mock dependencies
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/llm/cache/memory-cache');
vi.mock('@/lib/llm/rate-limit/rate-limiter');
vi.mock('@/lib/llm/providers/openai-adapter');
vi.mock('@/lib/crypto/api-key-encryption');

describe('LLMProxyService', () => {
  const userId = 'test-user-id';
  const workspaceId = 'test-workspace-id';
  
  const mockRequest: ProxyRequest = {
    provider: 'openai',
    workspaceId,
    request: {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello' }
      ],
      temperature: 0.7,
      max_tokens: 100
    },
    endpoint: '/test-endpoint'
  };

  const mockLLMResponse = {
    id: 'test-response-id',
    choices: [{
      message: { role: 'assistant', content: 'Hello! How can I help?' },
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

  // Create a single mock cache instance to be used across tests
  const mockCache = {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
    getStats: vi.fn()
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset cache mock behavior
    mockCache.get.mockReturnValue(null);
    mockCache.set.mockImplementation(() => {});
    
    // Setup default mocks
    const memoryCache = await import('@/lib/llm/cache/memory-cache');
    vi.mocked(memoryCache.getLLMCache).mockReturnValue(mockCache as any);

    const rateLimiter = await import('@/lib/llm/rate-limit/rate-limiter');
    vi.mocked(rateLimiter.RateLimiter).mockImplementation(() => ({
      checkRateLimit: vi.fn(() => Promise.resolve({
        allowed: true,
        remaining: { minute: 10, hour: 50, day: 500 },
        resetAt: {
          minute: new Date(Date.now() + 60000),
          hour: new Date(Date.now() + 3600000),
          day: new Date(Date.now() + 86400000)
        }
      })),
      incrementCounter: vi.fn(() => Promise.resolve())
    }) as any);
  });

  describe('processRequest', () => {
    it('should process a valid request successfully', async () => {
      // Mock dependencies for this test
      const supabase = await import('@/lib/supabase/server');
      vi.mocked(supabase.createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { api_key: 'sk-test123', api_provider: 'openai' },
                error: null
              }))
            }))
          })),
          insert: vi.fn(() => Promise.resolve({ error: null }))
        }))
      } as any);

      const encryption = await import('@/lib/crypto/api-key-encryption');
      vi.mocked(encryption.isEncryptedApiKey).mockReturnValue(false); // Unencrypted key
      
      const openaiAdapter = await import('@/lib/llm/providers/openai-adapter');
      vi.mocked(openaiAdapter.OpenAIAdapter).mockImplementation(() => ({
        complete: vi.fn(() => Promise.resolve(mockLLMResponse))
      }) as any);

      const proxyService = new LLMProxyService();
      const result = await proxyService.processRequest(mockRequest, userId);

      expect(result).toMatchObject({
        data: mockLLMResponse,
        usage: {
          inputTokens: 10,
          outputTokens: 8,
          totalTokens: 18,
          estimatedCost: expect.any(Number)
        },
        cached: false,
        requestId: expect.any(String)
      });
    });

    it('should return cached response when available', async () => {
      // Set up cache to return a response
      mockCache.get.mockReturnValue(mockLLMResponse);

      const proxyService = new LLMProxyService();
      const result = await proxyService.processRequest(mockRequest, userId);

      expect(result).toMatchObject({
        data: mockLLMResponse,
        cached: true,
        usage: {
          inputTokens: 10,
          outputTokens: 8,
          totalTokens: 18,
          estimatedCost: 0 // No cost for cached responses
        }
      });

      // Should not make API call
      const openaiAdapter = await import('@/lib/llm/providers/openai-adapter');
      const OpenAIAdapter = vi.mocked(openaiAdapter.OpenAIAdapter);
      expect(OpenAIAdapter).not.toHaveBeenCalled();
    });

    it('should enforce rate limits', async () => {
      const rateLimiter = await import('@/lib/llm/rate-limit/rate-limiter');
      vi.mocked(rateLimiter.RateLimiter).mockImplementation(() => ({
        checkRateLimit: vi.fn(() => Promise.resolve({
          allowed: false,
          remaining: { minute: 0, hour: 0, day: 0 },
          resetAt: {
            minute: new Date(Date.now() + 60000),
            hour: new Date(Date.now() + 3600000),
            day: new Date(Date.now() + 86400000)
          }
        })),
        incrementCounter: vi.fn()
      }) as any);

      // Create new instance to use updated mock
      const service = new LLMProxyService();
      await expect(service.processRequest(mockRequest, userId))
        .rejects.toThrow('Rate limit exceeded');
    });

    it('should decrypt encrypted API keys', async () => {
      const supabase = await import('@/lib/supabase/server');
      vi.mocked(supabase.createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { api_key: 'encrypted-key-data', api_provider: 'openai' },
                error: null
              }))
            }))
          })),
          insert: vi.fn(() => Promise.resolve({ error: null }))
        }))
      } as any);

      const encryption = await import('@/lib/crypto/api-key-encryption');
      vi.mocked(encryption.isEncryptedApiKey).mockReturnValue(true);
      vi.mocked(encryption.getEncryptionSecret).mockReturnValue('test-secret-key');
      vi.mocked(encryption.decryptApiKey).mockReturnValue('sk-decrypted-key');

      const openaiAdapter = await import('@/lib/llm/providers/openai-adapter');
      const mockAdapter = {
        complete: vi.fn(() => Promise.resolve(mockLLMResponse))
      };
      vi.mocked(openaiAdapter.OpenAIAdapter).mockImplementation(() => mockAdapter as any);

      const proxyService = new LLMProxyService();
      await proxyService.processRequest(mockRequest, userId);

      expect(encryption.decryptApiKey).toHaveBeenCalledWith('encrypted-key-data', 'test-secret-key');
      expect(openaiAdapter.OpenAIAdapter).toHaveBeenCalledWith('sk-decrypted-key');
    });

    it('should handle missing API key', async () => {
      const supabase = await import('@/lib/supabase/server');
      vi.mocked(supabase.createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { api_key: null, api_provider: 'openai' },
                error: null
              }))
            }))
          }))
        }))
      } as any);

      const proxyService = new LLMProxyService();
      await expect(proxyService.processRequest(mockRequest, userId))
        .rejects.toThrow('No API key configured');
    });

    it('should handle provider mismatch', async () => {
      const supabase = await import('@/lib/supabase/server');
      vi.mocked(supabase.createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { api_key: 'sk-test', api_provider: 'anthropic' },
                error: null
              }))
            }))
          }))
        }))
      } as any);

      const proxyService = new LLMProxyService();
      await expect(proxyService.processRequest(mockRequest, userId))
        .rejects.toThrow('This workspace is configured for anthropic, not openai');
    });

    it('should handle API errors gracefully', async () => {
      const supabase = await import('@/lib/supabase/server');
      vi.mocked(supabase.createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { api_key: 'sk-test123', api_provider: 'openai' },
                error: null
              }))
            }))
          })),
          insert: vi.fn(() => Promise.resolve({ error: null }))
        }))
      } as any);

      const openaiAdapter = await import('@/lib/llm/providers/openai-adapter');
      vi.mocked(openaiAdapter.OpenAIAdapter).mockImplementation(() => ({
        complete: vi.fn(() => Promise.reject(new Error('API rate limit exceeded')))
      }) as any);

      const proxyService = new LLMProxyService();
      await expect(proxyService.processRequest(mockRequest, userId))
        .rejects.toThrow('API rate limit exceeded. Please try again later.');
    });

    it('should cache non-streaming responses with usage data', async () => {
      const supabase = await import('@/lib/supabase/server');
      vi.mocked(supabase.createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { api_key: 'sk-test123', api_provider: 'openai' },
                error: null
              }))
            }))
          })),
          insert: vi.fn(() => Promise.resolve({ error: null }))
        }))
      } as any);

      const openaiAdapter = await import('@/lib/llm/providers/openai-adapter');
      vi.mocked(openaiAdapter.OpenAIAdapter).mockImplementation(() => ({
        complete: vi.fn(() => Promise.resolve(mockLLMResponse))
      }) as any);

      const proxyService = new LLMProxyService();
      await proxyService.processRequest(mockRequest, userId);

      expect(mockCache.set).toHaveBeenCalledWith(
        'openai',
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
          messages: expect.any(Array)
        }),
        workspaceId,
        mockLLMResponse
      );
    });

    it('should not cache streaming requests', async () => {
      const streamRequest = {
        ...mockRequest,
        request: { ...mockRequest.request, stream: true }
      };

      const supabase = await import('@/lib/supabase/server');
      vi.mocked(supabase.createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { api_key: 'sk-test123', api_provider: 'openai' },
                error: null
              }))
            }))
          })),
          insert: vi.fn(() => Promise.resolve({ error: null }))
        }))
      } as any);

      const openaiAdapter = await import('@/lib/llm/providers/openai-adapter');
      vi.mocked(openaiAdapter.OpenAIAdapter).mockImplementation(() => ({
        complete: vi.fn(() => Promise.resolve(mockLLMResponse))
      }) as any);

      const proxyService = new LLMProxyService();
      await proxyService.processRequest(streamRequest, userId);

      expect(mockCache.get).not.toHaveBeenCalled(); // Streaming requests don't check cache
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it('should calculate costs correctly', async () => {
      const supabase = await import('@/lib/supabase/server');
      vi.mocked(supabase.createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { api_key: 'sk-test123', api_provider: 'openai' },
                error: null
              }))
            }))
          })),
          insert: vi.fn(() => Promise.resolve({ error: null }))
        }))
      } as any);

      const openaiAdapter = await import('@/lib/llm/providers/openai-adapter');
      vi.mocked(openaiAdapter.OpenAIAdapter).mockImplementation(() => ({
        complete: vi.fn(() => Promise.resolve(mockLLMResponse))
      }) as any);

      const proxyService = new LLMProxyService();
      const result = await proxyService.processRequest(mockRequest, userId);

      // For gpt-3.5-turbo: $0.50 per 1M input tokens, $1.50 per 1M output tokens
      // 10 input tokens = 10 * 0.50 / 1,000,000 = 0.000005
      // 8 output tokens = 8 * 1.50 / 1,000,000 = 0.000012
      // Total = 0.000017
      expect(result.usage.estimatedCost).toBeCloseTo(0.000017, 6);
    });

    it('should log usage to database', async () => {
      const mockInsert = vi.fn(() => Promise.resolve({ error: null }));
      const supabase = await import('@/lib/supabase/server');
      vi.mocked(supabase.createClient).mockResolvedValue({
        from: vi.fn((table) => {
          if (table === 'workspaces') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({
                    data: { api_key: 'sk-test123', api_provider: 'openai' },
                    error: null
                  }))
                }))
              }))
            };
          }
          if (table === 'api_usage') {
            return { insert: mockInsert };
          }
          return {};
        })
      } as any);

      const openaiAdapter = await import('@/lib/llm/providers/openai-adapter');
      vi.mocked(openaiAdapter.OpenAIAdapter).mockImplementation(() => ({
        complete: vi.fn(() => Promise.resolve(mockLLMResponse))
      }) as any);

      const proxyService = new LLMProxyService();
      await proxyService.processRequest(mockRequest, userId);

      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        workspace_id: workspaceId,
        user_id: userId,
        model: 'gpt-3.5-turbo',
        provider: 'openai',
        input_tokens: 10,
        output_tokens: 8,
        total_tokens: 18,
        estimated_cost: expect.any(Number),
        endpoint: '/test-endpoint',
        request_id: expect.any(String),
        response_time_ms: expect.any(Number),
        cache_hit: false
      }));
    });

    it('should increment rate limit counter after successful request', async () => {
      const supabase = await import('@/lib/supabase/server');
      vi.mocked(supabase.createClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { api_key: 'sk-test123', api_provider: 'openai' },
                error: null
              }))
            }))
          })),
          insert: vi.fn(() => Promise.resolve({ error: null }))
        }))
      } as any);

      const rateLimiter = await import('@/lib/llm/rate-limit/rate-limiter');
      const mockIncrement = vi.fn(() => Promise.resolve());
      vi.mocked(rateLimiter.RateLimiter).mockImplementation(() => ({
        checkRateLimit: vi.fn(() => Promise.resolve({
          allowed: true,
          remaining: { minute: 10, hour: 50, day: 500 },
          resetAt: {
            minute: new Date(Date.now() + 60000),
            hour: new Date(Date.now() + 3600000),
            day: new Date(Date.now() + 86400000)
          }
        })),
        incrementCounter: mockIncrement
      }) as any);

      const openaiAdapter = await import('@/lib/llm/providers/openai-adapter');
      vi.mocked(openaiAdapter.OpenAIAdapter).mockImplementation(() => ({
        complete: vi.fn(() => Promise.resolve(mockLLMResponse))
      }) as any);

      const service = new LLMProxyService();
      await service.processRequest(mockRequest, userId);

      expect(mockIncrement).toHaveBeenCalledWith(workspaceId);
    });
  });
});