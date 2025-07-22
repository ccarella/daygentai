import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter } from '@/lib/llm/rate-limit/rate-limiter';

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}));

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  const workspaceId = 'test-workspace-id';

  // Helper to create a mock Supabase client with chained methods
  const createMockSupabase = (queryResult: any) => ({
    from: vi.fn(() => ({
      select: vi.fn(() => {
        const chain = {
          eq: vi.fn(() => chain),
          gte: vi.fn(() => chain),
          order: vi.fn(() => chain),
          limit: vi.fn(() => chain),
          single: vi.fn(() => Promise.resolve(queryResult))
        };
        return chain;
      })
    })),
    rpc: vi.fn(() => Promise.resolve({ error: null }))
  });

  beforeEach(() => {
    vi.clearAllMocks();
    rateLimiter = new RateLimiter();
  });

  describe('checkRateLimit', () => {
    it('should allow requests when under all limits', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = createMockSupabase({ 
        data: { request_count: 5 }, 
        error: null 
      });
      
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      
      const result = await rateLimiter.checkRateLimit(workspaceId);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining.minute).toBe(15); // 20 - 5
      expect(result.remaining.hour).toBe(95); // 100 - 5
      expect(result.remaining.day).toBe(995); // 1000 - 5
    });

    it('should deny requests when minute limit is exceeded', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      let callCount = 0;
      
      // Create a mock that returns different values for each call
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => {
            const chain = {
              eq: vi.fn(() => chain),
              gte: vi.fn(() => chain),
              order: vi.fn(() => chain),
              limit: vi.fn(() => chain),
              single: vi.fn(() => {
                callCount++;
                // First call (minute window) - exceeds limit
                if (callCount === 1) {
                  return Promise.resolve({ 
                    data: { request_count: 25 }, 
                    error: null 
                  });
                }
                // Other calls (hour/day windows)
                return Promise.resolve({ 
                  data: { request_count: 50 }, 
                  error: null 
                });
              })
            };
            return chain;
          })
        })),
        rpc: vi.fn(() => Promise.resolve({ error: null }))
      };
      
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      
      const result = await rateLimiter.checkRateLimit(workspaceId);
      
      expect(result.allowed).toBe(false);
      expect(result.remaining.minute).toBe(0);
    });

    it('should handle no previous rate limit data', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = createMockSupabase({ 
        data: null, 
        error: { code: 'PGRST116' } // No rows found
      });
      
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      
      const result = await rateLimiter.checkRateLimit(workspaceId);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining.minute).toBe(20);
      expect(result.remaining.hour).toBe(100);
      expect(result.remaining.day).toBe(1000);
    });

    it('should handle database errors gracefully', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = createMockSupabase({ 
        data: null, 
        error: { code: 'INTERNAL_ERROR', message: 'Database error' }
      });
      
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await rateLimiter.checkRateLimit(workspaceId);
      
      // Should default to allowing requests on error
      expect(result.allowed).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('should calculate correct reset times', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = createMockSupabase({ 
        data: { request_count: 5 }, 
        error: null 
      });
      
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      
      const now = Date.now();
      const result = await rateLimiter.checkRateLimit(workspaceId);
      
      // Reset times should be in the future
      expect(result.resetAt.minute.getTime()).toBeGreaterThan(now);
      expect(result.resetAt.hour.getTime()).toBeGreaterThan(now);
      expect(result.resetAt.day.getTime()).toBeGreaterThan(now);
      
      // Check approximate time differences
      const minuteDiff = result.resetAt.minute.getTime() - now;
      const hourDiff = result.resetAt.hour.getTime() - now;
      const dayDiff = result.resetAt.day.getTime() - now;
      
      expect(minuteDiff).toBeGreaterThan(50 * 1000); // > 50 seconds
      expect(minuteDiff).toBeLessThan(70 * 1000); // < 70 seconds
      expect(hourDiff).toBeGreaterThan(50 * 60 * 1000); // > 50 minutes
      expect(dayDiff).toBeGreaterThan(20 * 60 * 60 * 1000); // > 20 hours
    });
  });

  describe('incrementCounter', () => {
    it('should increment counters for all windows', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockRpc = vi.fn(() => Promise.resolve({ error: null }));
      const mockSupabase = {
        rpc: mockRpc
      };
      
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      
      await rateLimiter.incrementCounter(workspaceId);
      
      // Should call rpc 3 times (minute, hour, day)
      expect(mockRpc).toHaveBeenCalledTimes(3);
      
      // Check that it was called with correct parameters
      expect(mockRpc).toHaveBeenCalledWith('increment_rate_limit', expect.objectContaining({
        p_workspace_id: workspaceId,
        p_window_type: 'minute'
      }));
      expect(mockRpc).toHaveBeenCalledWith('increment_rate_limit', expect.objectContaining({
        p_workspace_id: workspaceId,
        p_window_type: 'hour'
      }));
      expect(mockRpc).toHaveBeenCalledWith('increment_rate_limit', expect.objectContaining({
        p_workspace_id: workspaceId,
        p_window_type: 'day'
      }));
    });

    it('should handle RPC errors gracefully', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockRpc = vi.fn(() => Promise.resolve({ 
        error: { message: 'RPC error' } 
      }));
      const mockSupabase = {
        rpc: mockRpc
      };
      
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Should not throw
      await expect(rateLimiter.incrementCounter(workspaceId)).resolves.not.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('custom rate limits', () => {
    it('should use custom rate limits when provided', async () => {
      const customLimiter = new RateLimiter({
        minuteLimit: 10,
        hourLimit: 50,
        dayLimit: 500
      });
      
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = createMockSupabase({ 
        data: { request_count: 8 }, 
        error: null 
      });
      
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      
      const result = await customLimiter.checkRateLimit(workspaceId);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining.minute).toBe(2); // 10 - 8
      expect(result.remaining.hour).toBe(42); // 50 - 8
      expect(result.remaining.day).toBe(492); // 500 - 8
    });
  });
});