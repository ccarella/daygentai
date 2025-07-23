import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LLMProxyService } from '@/lib/llm/proxy/llm-proxy-service';
import { UsageMonitor } from '@/lib/llm/usage/usage-monitor';
import { createClient } from '@/lib/supabase/server';
import { ProxyRequest } from '@/lib/llm/types';

// Mock dependencies
vi.mock('@/lib/llm/usage/usage-monitor');
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/llm/providers/openai-adapter');
vi.mock('@/lib/llm/cache/memory-cache');
vi.mock('@/lib/llm/rate-limit/rate-limiter');

describe('LLMProxyService - Quota Enforcement', () => {
  let proxyService: LLMProxyService;
  let mockSupabase: any;
  let mockCache: any;
  let mockRateLimiter: any;

  beforeEach(() => {
    // Mock cache
    mockCache = {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
    };
    
    // Mock rate limiter
    mockRateLimiter = {
      checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
      incrementCounter: vi.fn().mockResolvedValue(undefined),
    };
    
    mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase);
    
    // Set up centralized API key
    process.env['CENTRALIZED_OPENAI_API_KEY'] = 'test-api-key';
    
    proxyService = new LLMProxyService();
    // Manually set the cache and rate limiter properties
    (proxyService as any).cache = mockCache;
    (proxyService as any).rateLimiter = mockRateLimiter;
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env['CENTRALIZED_OPENAI_API_KEY'];
  });

  it('should allow request when under quota', async () => {
    const request: ProxyRequest = {
      provider: 'openai',
      workspaceId: 'ws-123',
      endpoint: '/v1/chat/completions',
      request: {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
      },
    };

    // Mock quota check - under limit
    vi.mocked(UsageMonitor.checkWorkspaceQuota).mockResolvedValue({
      allowed: true,
      usage: {
        workspaceId: 'ws-123',
        monthYear: '2025-07',
        totalCost: 5.0,
        limit: 10.0,
        limitEnabled: true,
        percentageUsed: 50,
        isOverLimit: false,
      },
    });

    // Mock OpenAI adapter
    const mockAdapter = {
      complete: vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      }),
    };

    const OpenAIAdapter = await import('@/lib/llm/providers/openai-adapter');
    vi.mocked(OpenAIAdapter.OpenAIAdapter).mockImplementation(() => mockAdapter as any);

    // Mock rate limiter
    const RateLimiter = await import('@/lib/llm/rate-limit/rate-limiter');
    vi.mocked(RateLimiter.RateLimiter).mockImplementation(() => mockRateLimiter as any);

    const response = await proxyService.processRequest(request, 'user-123');

    expect(response.data).toBeDefined();
    expect(UsageMonitor.checkWorkspaceQuota).toHaveBeenCalledWith('ws-123');
    expect(mockAdapter.complete).toHaveBeenCalled();
  });

  it('should block request when over quota', async () => {
    const request: ProxyRequest = {
      provider: 'openai',
      workspaceId: 'ws-123',
      endpoint: '/v1/chat/completions',
      request: {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
      },
    };

    // Mock quota check - over limit
    vi.mocked(UsageMonitor.checkWorkspaceQuota).mockResolvedValue({
      allowed: false,
      usage: {
        workspaceId: 'ws-123',
        monthYear: '2025-07',
        totalCost: 12.0,
        limit: 10.0,
        limitEnabled: true,
        percentageUsed: 120,
        isOverLimit: true,
      },
      message: 'Monthly usage limit exceeded. Current usage: $12.00',
    });

    await expect(
      proxyService.processRequest(request, 'user-123')
    ).rejects.toThrow('Monthly usage limit exceeded. Current usage: $12.00');

    expect(UsageMonitor.checkWorkspaceQuota).toHaveBeenCalledWith('ws-123');
  });

  it('should continue on quota check errors (not quota exceeded)', async () => {
    const request: ProxyRequest = {
      provider: 'openai',
      workspaceId: 'ws-123',
      endpoint: '/v1/chat/completions',
      request: {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
      },
    };

    // Mock quota check error (not quota issue)
    vi.mocked(UsageMonitor.checkWorkspaceQuota).mockRejectedValue(
      new Error('Database connection failed')
    );

    // Mock OpenAI adapter
    const mockAdapter = {
      complete: vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      }),
    };

    const OpenAIAdapter = await import('@/lib/llm/providers/openai-adapter');
    vi.mocked(OpenAIAdapter.OpenAIAdapter).mockImplementation(() => mockAdapter as any);

    // Mock rate limiter
    const RateLimiter = await import('@/lib/llm/rate-limit/rate-limiter');
    vi.mocked(RateLimiter.RateLimiter).mockImplementation(() => mockRateLimiter as any);

    // Should not throw - continues with warning
    const response = await proxyService.processRequest(request, 'user-123');
    expect(response.data).toBeDefined();
  });

  it('should use centralized API key when available', async () => {
    const request: ProxyRequest = {
      provider: 'openai',
      workspaceId: 'ws-123',
      endpoint: '/v1/chat/completions',
      request: {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
      },
    };

    vi.mocked(UsageMonitor.checkWorkspaceQuota).mockResolvedValue({
      allowed: true,
      usage: {
        workspaceId: 'ws-123',
        monthYear: '2025-07',
        totalCost: 0,
        limit: 10.0,
        limitEnabled: true,
        percentageUsed: 0,
        isOverLimit: false,
      },
    });

    // Spy on OpenAI adapter constructor
    let capturedApiKey: string | undefined;
    const mockAdapter = {
      complete: vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      }),
    };

    const OpenAIAdapter = await import('@/lib/llm/providers/openai-adapter');
    vi.mocked(OpenAIAdapter.OpenAIAdapter).mockImplementation((apiKey: string) => {
      capturedApiKey = apiKey;
      return mockAdapter as any;
    });

    // Mock rate limiter and cache
    const RateLimiter = await import('@/lib/llm/rate-limit/rate-limiter');
    vi.mocked(RateLimiter.RateLimiter).mockImplementation(() => ({
      checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
      incrementCounter: vi.fn().mockResolvedValue(undefined),
    }) as any);

    const cache = await import('@/lib/llm/cache/memory-cache');
    vi.mocked(cache.getLLMCache).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
    } as any);

    await proxyService.processRequest(request, 'user-123');

    // Should use centralized key
    expect(capturedApiKey).toBe('test-api-key');
    // The service will still make calls to record usage
    expect(mockSupabase.from).toHaveBeenCalledWith('api_usage');
  });
});