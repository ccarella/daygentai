import { describe, it, expect, vi, afterEach } from 'vitest';
import { POST } from '@/app/api/admin/workspace-limits/route';
import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/admin-check';
import { UsageMonitor } from '@/lib/llm/usage/usage-monitor';

// Mock dependencies
vi.mock('@/lib/admin/admin-check');
vi.mock('@/lib/llm/usage/usage-monitor');

describe('POST /api/admin/workspace-limits', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should update workspace limit for authorized admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      id: 'admin-123',
      email: 'admin@example.com',
    } as any);

    vi.mocked(UsageMonitor.updateWorkspaceLimit).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/admin/workspace-limits', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: 'ws-123',
        limit: 25.0,
        enabled: true,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(UsageMonitor.updateWorkspaceLimit).toHaveBeenCalledWith('ws-123', 25.0, true);
  });

  it('should handle disabled limits', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      id: 'admin-123',
      email: 'admin@example.com',
    } as any);

    vi.mocked(UsageMonitor.updateWorkspaceLimit).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/admin/workspace-limits', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: 'ws-123',
        limit: 0,
        enabled: false,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(UsageMonitor.updateWorkspaceLimit).toHaveBeenCalledWith('ws-123', 0, false);
  });

  it('should return 400 for missing workspaceId', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      id: 'admin-123',
      email: 'admin@example.com',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/admin/workspace-limits', {
      method: 'POST',
      body: JSON.stringify({
        limit: 25.0,
        enabled: true,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Invalid request data' });
  });

  it('should return 400 for invalid limit type', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      id: 'admin-123',
      email: 'admin@example.com',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/admin/workspace-limits', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: 'ws-123',
        limit: 'invalid',
        enabled: true,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Invalid request data' });
  });

  it('should return 403 for unauthorized access', async () => {
    vi.mocked(requireAdmin).mockRejectedValue(
      new Error('Unauthorized: Admin access required')
    );

    const request = new NextRequest('http://localhost:3000/api/admin/workspace-limits', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: 'ws-123',
        limit: 25.0,
        enabled: true,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  it('should return 500 for update errors', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      id: 'admin-123',
      email: 'admin@example.com',
    } as any);

    vi.mocked(UsageMonitor.updateWorkspaceLimit).mockRejectedValue(
      new Error('Database error')
    );

    const request = new NextRequest('http://localhost:3000/api/admin/workspace-limits', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: 'ws-123',
        limit: 25.0,
        enabled: true,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal server error' });
  });

  it('should handle malformed JSON', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      id: 'admin-123',
      email: 'admin@example.com',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/admin/workspace-limits', {
      method: 'POST',
      body: 'invalid json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal server error' });
  });

  it('should handle negative limits', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      id: 'admin-123',
      email: 'admin@example.com',
    } as any);

    vi.mocked(UsageMonitor.updateWorkspaceLimit).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/admin/workspace-limits', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: 'ws-123',
        limit: -10.0,
        enabled: true,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    // Should accept negative values (business logic decision)
    expect(UsageMonitor.updateWorkspaceLimit).toHaveBeenCalledWith('ws-123', -10.0, true);
  });
});