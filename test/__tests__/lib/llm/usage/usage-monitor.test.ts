import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UsageMonitor } from '@/lib/llm/usage/usage-monitor';
import { createClient } from '@/lib/supabase/server';

// Mock the Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('UsageMonitor', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
          order: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('checkWorkspaceQuota', () => {
    it('should allow usage when under limit', async () => {
      // Mock workspace data
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                usage_limit_monthly: 10.0,
                usage_limit_enabled: true,
              },
              error: null,
            }),
          }),
        }),
      });

      // Mock usage data
      mockSupabase.rpc.mockResolvedValue({
        data: 5.5, // $5.50 used
        error: null,
      });

      const result = await UsageMonitor.checkWorkspaceQuota('workspace-123');

      expect(result.allowed).toBe(true);
      expect(result.usage.totalCost).toBe(5.5);
      expect(result.usage.limit).toBe(10.0);
      expect(result.usage.percentageUsed).toBeCloseTo(55, 0);
      expect(result.usage.isOverLimit).toBe(false);
    });

    it('should deny usage when over limit', async () => {
      // Mock workspace data
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                usage_limit_monthly: 10.0,
                usage_limit_enabled: true,
              },
              error: null,
            }),
          }),
        }),
      });

      // Mock usage data - over limit
      mockSupabase.rpc.mockResolvedValue({
        data: 12.5, // $12.50 used
        error: null,
      });

      const result = await UsageMonitor.checkWorkspaceQuota('workspace-123');

      expect(result.allowed).toBe(false);
      expect(result.usage.totalCost).toBe(12.5);
      expect(result.usage.isOverLimit).toBe(true);
      expect(result.message).toContain('Monthly usage limit of $10 exceeded');
    });

    it('should always allow when limits are disabled', async () => {
      // Mock workspace data with limits disabled
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                usage_limit_monthly: 10.0,
                usage_limit_enabled: false,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await UsageMonitor.checkWorkspaceQuota('workspace-123');

      expect(result.allowed).toBe(true);
      expect(result.usage.limitEnabled).toBe(false);
      expect(mockSupabase.rpc).not.toHaveBeenCalled(); // Should not check usage
    });

    it('should handle workspace not found error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      await expect(
        UsageMonitor.checkWorkspaceQuota('non-existent')
      ).rejects.toThrow('Failed to fetch workspace: Not found');
    });

    it('should handle usage query errors gracefully', async () => {
      // Mock workspace data
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                usage_limit_monthly: 10.0,
                usage_limit_enabled: true,
              },
              error: null,
            }),
          }),
        }),
      });

      // Mock usage query error
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await UsageMonitor.checkWorkspaceQuota('workspace-123');

      // Should default to 0 usage on error
      expect(result.allowed).toBe(true);
      expect(result.usage.totalCost).toBe(0);
    });
  });

  describe('getWorkspaceUsageForMonth', () => {
    it('should return usage for current month by default', async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      mockSupabase.rpc.mockResolvedValue({
        data: 7.25,
        error: null,
      });

      const result = await UsageMonitor.getWorkspaceUsageForMonth('workspace-123');

      expect(result.totalCost).toBe(7.25);
      expect(result.monthYear).toBe(currentMonth);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_workspace_monthly_usage', {
        p_workspace_id: 'workspace-123',
        p_month_year: currentMonth,
      });
    });

    it('should return usage for specific month', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: 15.75,
        error: null,
      });

      const result = await UsageMonitor.getWorkspaceUsageForMonth(
        'workspace-123',
        '2025-06'
      );

      expect(result.totalCost).toBe(15.75);
      expect(result.monthYear).toBe('2025-06');
    });

    it('should handle null data', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await UsageMonitor.getWorkspaceUsageForMonth('workspace-123');

      expect(result.totalCost).toBe(0);
    });
  });

  describe('updateWorkspaceLimit', () => {
    it('should update workspace limit successfully', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      await expect(
        UsageMonitor.updateWorkspaceLimit('workspace-123', 25.0, true)
      ).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith('workspaces');
    });

    it('should handle update errors', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Update failed' },
          }),
        }),
      });

      await expect(
        UsageMonitor.updateWorkspaceLimit('workspace-123', 25.0)
      ).rejects.toThrow('Failed to update workspace limit: Update failed');
    });

    it('should default enabled to true', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      await UsageMonitor.updateWorkspaceLimit('workspace-123', 20.0);

      expect(mockSupabase.from).toHaveBeenCalledWith('workspaces');
    });
  });

  describe('checkUsageAlerts', () => {
    it('should not alert when usage is below 80%', async () => {
      // Mock workspace and usage data
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                usage_limit_monthly: 10.0,
                usage_limit_enabled: true,
              },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.rpc.mockResolvedValue({
        data: 7.5, // 75% usage
        error: null,
      });

      const result = await UsageMonitor.checkUsageAlerts('workspace-123');

      expect(result.shouldAlert).toBe(false);
      expect(result.percentage).toBe(75);
    });

    it('should alert at 80% usage', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                usage_limit_monthly: 10.0,
                usage_limit_enabled: true,
              },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.rpc.mockResolvedValue({
        data: 8.0, // 80% usage
        error: null,
      });

      const result = await UsageMonitor.checkUsageAlerts('workspace-123');

      expect(result.shouldAlert).toBe(true);
      expect(result.percentage).toBe(80);
      expect(result.message).toContain('80% of its monthly limit');
    });

    it('should alert at 90% usage', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                usage_limit_monthly: 10.0,
                usage_limit_enabled: true,
              },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.rpc.mockResolvedValue({
        data: 9.0, // 90% usage
        error: null,
      });

      const result = await UsageMonitor.checkUsageAlerts('workspace-123');

      expect(result.shouldAlert).toBe(true);
      expect(result.percentage).toBe(90);
      expect(result.message).toContain('90% of its monthly limit');
    });

    it('should alert at 100% usage', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                usage_limit_monthly: 10.0,
                usage_limit_enabled: true,
              },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.rpc.mockResolvedValue({
        data: 10.0, // 100% usage
        error: null,
      });

      const result = await UsageMonitor.checkUsageAlerts('workspace-123');

      expect(result.shouldAlert).toBe(true);
      expect(result.percentage).toBe(100);
      expect(result.message).toContain('reached its monthly usage limit');
    });

    it('should not alert when limits are disabled', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                usage_limit_monthly: 10.0,
                usage_limit_enabled: false,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await UsageMonitor.checkUsageAlerts('workspace-123');

      expect(result.shouldAlert).toBe(false);
      expect(result.percentage).toBe(0);
    });
  });

  describe('getAllWorkspacesUsage', () => {
    it('should return usage for all workspaces', async () => {
      // Mock workspaces list
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'ws-1',
                name: 'Workspace 1',
                slug: 'workspace-1',
                usage_limit_monthly: 10.0,
                usage_limit_enabled: true,
              },
              {
                id: 'ws-2',
                name: 'Workspace 2',
                slug: 'workspace-2',
                usage_limit_monthly: 20.0,
                usage_limit_enabled: true,
              },
            ],
            error: null,
          }),
        }),
      });

      // Mock usage for each workspace
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: 5.0, error: null }) // ws-1
        .mockResolvedValueOnce({ data: 15.0, error: null }); // ws-2

      const result = await UsageMonitor.getAllWorkspacesUsage();

      expect(result.workspaces).toHaveLength(2);
      expect(result.totalUsage).toBe(20.0);

      expect(result.workspaces[0]?.usage.totalCost).toBe(5.0);
      expect(result.workspaces[0]?.usage.percentageUsed).toBe(50);
      expect(result.workspaces[0]?.usage.isOverLimit).toBe(false);

      expect(result.workspaces[1]?.usage.totalCost).toBe(15.0);
      expect(result.workspaces[1]?.usage.percentageUsed).toBe(75);
      expect(result.workspaces[1]?.usage.isOverLimit).toBe(false);
    });

    it('should handle workspace query errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      });

      await expect(
        UsageMonitor.getAllWorkspacesUsage()
      ).rejects.toThrow('Failed to fetch workspaces: Database error');
    });

    it('should handle specific month queries', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const result = await UsageMonitor.getAllWorkspacesUsage('2025-06');

      expect(result.workspaces).toHaveLength(0);
      expect(result.totalUsage).toBe(0);
    });
  });
});