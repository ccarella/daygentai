import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/admin/usage/route';
import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/admin-check';
import { UsageMonitor } from '@/lib/llm/usage/usage-monitor';

// Mock dependencies
vi.mock('@/lib/admin/admin-check');
vi.mock('@/lib/llm/usage/usage-monitor');

describe('GET /api/admin/usage', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/usage');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return usage data for authorized admin', async () => {
    // Mock admin check
    vi.mocked(requireAdmin).mockResolvedValue({
      id: 'admin-123',
      email: 'admin@example.com',
    } as any);

    // Mock usage data
    const mockUsageData = {
      workspaces: [
        {
          id: 'ws-1',
          name: 'Workspace 1',
          slug: 'workspace-1',
          usage: {
            workspaceId: 'ws-1',
            monthYear: '2025-07',
            totalCost: 5.5,
            limit: 10,
            limitEnabled: true,
            percentageUsed: 55,
            isOverLimit: false,
          },
        },
      ],
      totalUsage: 5.5,
    };

    vi.mocked(UsageMonitor.getAllWorkspacesUsage).mockResolvedValue(mockUsageData);

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockUsageData);
    expect(UsageMonitor.getAllWorkspacesUsage).toHaveBeenCalledWith('2025-07');
  });

  it('should use specific month from query params', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/usage?month=2025-06');
    
    vi.mocked(requireAdmin).mockResolvedValue({
      id: 'admin-123',
      email: 'admin@example.com',
    } as any);

    vi.mocked(UsageMonitor.getAllWorkspacesUsage).mockResolvedValue({
      workspaces: [],
      totalUsage: 0,
    });

    await GET(mockRequest);

    expect(UsageMonitor.getAllWorkspacesUsage).toHaveBeenCalledWith('2025-06');
  });

  it('should return 403 for unauthorized access', async () => {
    vi.mocked(requireAdmin).mockRejectedValue(
      new Error('Unauthorized: Admin access required')
    );

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  it('should return 500 when admin emails not configured', async () => {
    vi.mocked(requireAdmin).mockRejectedValue(
      new Error('Admin access not configured. Set ADMIN_EMAILS environment variable.')
    );

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal server error' });
  });

  it('should return 500 for internal errors', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      id: 'admin-123',
      email: 'admin@example.com',
    } as any);

    vi.mocked(UsageMonitor.getAllWorkspacesUsage).mockRejectedValue(
      new Error('Database connection failed')
    );

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal server error' });
  });

  it('should handle empty usage data', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      id: 'admin-123',
      email: 'admin@example.com',
    } as any);

    vi.mocked(UsageMonitor.getAllWorkspacesUsage).mockResolvedValue({
      workspaces: [],
      totalUsage: 0,
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.workspaces).toHaveLength(0);
    expect(data.totalUsage).toBe(0);
  });
});