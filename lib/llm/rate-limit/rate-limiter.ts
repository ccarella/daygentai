import { createClient } from '@/lib/supabase/server';
import { DEFAULT_RATE_LIMITS, RateLimitConfig } from '../types';

export class RateLimiter {
  private config: RateLimitConfig;
  
  constructor(config?: Partial<RateLimitConfig>) {
    this.config = { ...DEFAULT_RATE_LIMITS, ...config };
  }
  
  /**
   * Check if a request is within rate limits
   */
  async checkRateLimit(workspaceId: string): Promise<{
    allowed: boolean;
    remaining: {
      minute: number;
      hour: number;
      day: number;
    };
    resetAt: {
      minute: Date;
      hour: Date;
      day: Date;
    };
  }> {
    const supabase = await createClient();
    const now = new Date();
    
    // Define time windows
    const windows = {
      minute: {
        start: new Date(now.getTime() - 60 * 1000),
        type: 'minute' as const,
        limit: this.config.minuteLimit,
      },
      hour: {
        start: new Date(now.getTime() - 60 * 60 * 1000),
        type: 'hour' as const,
        limit: this.config.hourLimit,
      },
      day: {
        start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        type: 'day' as const,
        limit: this.config.dayLimit,
      },
    };
    
    // Check counts for each window
    const counts = await Promise.all(
      Object.entries(windows).map(async ([key, window]) => {
        const { data, error } = await supabase
          .from('api_rate_limits')
          .select('request_count')
          .eq('workspace_id', workspaceId)
          .eq('window_type', window.type)
          .gte('window_start', window.start.toISOString())
          .order('window_start', { ascending: false })
          .limit(1)
          .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error(`Rate limit check error for ${key}:`, error);
          return { key, count: 0, limit: window.limit };
        }
        
        return { 
          key, 
          count: data?.request_count || 0, 
          limit: window.limit 
        };
      })
    );
    
    // Check if any limit is exceeded
    const allowed = counts.every(({ count, limit }) => count < limit);
    
    // Calculate remaining and reset times
    const remaining = counts.reduce((acc, { key, count, limit }) => {
      acc[key as keyof typeof windows] = Math.max(0, limit - count);
      return acc;
    }, {} as Record<keyof typeof windows, number>);
    
    const resetAt = {
      minute: new Date(now.getTime() + 60 * 1000),
      hour: new Date(now.getTime() + 60 * 60 * 1000),
      day: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    };
    
    return { allowed, remaining, resetAt };
  }
  
  /**
   * Increment the rate limit counter
   */
  async incrementCounter(workspaceId: string): Promise<void> {
    const supabase = await createClient();
    const now = new Date();
    
    // Update counters for all windows
    const windows = [
      { type: 'minute', start: new Date(Math.floor(now.getTime() / 60000) * 60000) },
      { type: 'hour', start: new Date(Math.floor(now.getTime() / 3600000) * 3600000) },
      { type: 'day', start: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
    ];
    
    await Promise.all(
      windows.map(async (window) => {
        const { error } = await supabase.rpc('increment_rate_limit', {
          p_workspace_id: workspaceId,
          p_window_start: window.start.toISOString(),
          p_window_type: window.type,
        });
        
        if (error) {
          console.error(`Failed to increment rate limit for ${window.type}:`, error);
        }
      })
    );
  }
}