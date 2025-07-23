import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/workspace/[workspaceId]/usage/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UsageMonitor } from '@/lib/llm/usage/usage-monitor';

// Mock dependencies
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/llm/usage/usage-monitor');

describe('GET /api/workspace/[workspaceId]/usage', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
      from: vi.fn(),
    };

    // Set up the chained mock for workspace_members query
    const workspaceMembersQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    };

    // Set up the chained mock for workspaces query
    const workspacesQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    };

    // Configure from() to return appropriate query based on table name
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'workspace_members') {
        return workspaceMembersQuery;
      } else if (table === 'workspaces') {
        return workspacesQuery;
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };
    });

    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return usage for workspace member', async () => {
    const workspaceId = 'ws-123';
    const userId = 'user-123';

    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: userId,
          email: 'user@example.com',
        },
      },
    });

    // Mock workspace membership - user is a member
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'workspace_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'member-123' },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };
    });

    // Mock usage data
    const mockUsage = {
      workspaceId,
      monthYear: '2025-07',
      totalCost: 7.5,
      limit: 10,
      limitEnabled: true,
      percentageUsed: 75,
      isOverLimit: false,
    };

    vi.mocked(UsageMonitor.checkWorkspaceQuota).mockResolvedValue({
      allowed: true,
      usage: mockUsage,
    });

    const request = new NextRequest('http://localhost:3000/api/workspace/ws-123/usage');
    const response = await GET(request, { params: Promise.resolve({ workspaceId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.usage).toEqual(mockUsage);
  });

  it('should return usage for workspace owner', async () => {
    const workspaceId = 'ws-123';
    const userId = 'owner-123';

    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: userId,
          email: 'owner@example.com',
        },
      },
    });

    // User is not a member but is the owner
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'workspace_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' },
                }),
              }),
            }),
          }),
        };
      } else if (table === 'workspaces') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { owner_id: userId },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };
    });

    const mockUsage = {
      workspaceId,
      monthYear: '2025-07',
      totalCost: 3.25,
      limit: 10,
      limitEnabled: true,
      percentageUsed: 32.5,
      isOverLimit: false,
    };

    vi.mocked(UsageMonitor.checkWorkspaceQuota).mockResolvedValue({
      allowed: true,
      usage: mockUsage,
    });

    const request = new NextRequest('http://localhost:3000/api/workspace/ws-123/usage');
    const response = await GET(request, { params: Promise.resolve({ workspaceId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.usage).toEqual(mockUsage);
  });

  it('should return 401 for unauthenticated requests', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const request = new NextRequest('http://localhost:3000/api/workspace/ws-123/usage');
    const response = await GET(request, { params: Promise.resolve({ workspaceId: 'ws-123' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  it('should return 403 for non-member non-owner', async () => {
    const workspaceId = 'ws-123';
    const userId = 'other-user';

    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: userId,
          email: 'other@example.com',
        },
      },
    });

    // Not a member and not the owner
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'workspace_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' },
                }),
              }),
            }),
          }),
        };
      } else if (table === 'workspaces') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { owner_id: 'different-owner' },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };
    });

    const request = new NextRequest('http://localhost:3000/api/workspace/ws-123/usage');
    const response = await GET(request, { params: Promise.resolve({ workspaceId }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data).toEqual({ error: 'Forbidden' });
  });

  it('should return 403 when workspace not found', async () => {
    const workspaceId = 'non-existent';
    const userId = 'user-123';

    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: userId,
          email: 'user@example.com',
        },
      },
    });

    // Not a member and workspace doesn't exist
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'workspace_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' },
                }),
              }),
            }),
          }),
        };
      } else if (table === 'workspaces') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };
    });

    const request = new NextRequest('http://localhost:3000/api/workspace/non-existent/usage');
    const response = await GET(request, { params: Promise.resolve({ workspaceId }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data).toEqual({ error: 'Forbidden' });
  });

  it('should handle usage monitor errors', async () => {
    const workspaceId = 'ws-123';
    const userId = 'user-123';

    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: userId,
          email: 'user@example.com',
        },
      },
    });

    // User is a member
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'workspace_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'member-123' },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };
    });

    vi.mocked(UsageMonitor.checkWorkspaceQuota).mockRejectedValue(
      new Error('Database error')
    );

    const request = new NextRequest('http://localhost:3000/api/workspace/ws-123/usage');
    const response = await GET(request, { params: Promise.resolve({ workspaceId }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal server error' });
  });

  it('should handle workspace over limit', async () => {
    const workspaceId = 'ws-123';
    const userId = 'user-123';

    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: userId,
          email: 'user@example.com',
        },
      },
    });

    // User is a member
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'workspace_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'member-123' },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };
    });

    const mockUsage = {
      workspaceId,
      monthYear: '2025-07',
      totalCost: 15.0,
      limit: 10,
      limitEnabled: true,
      percentageUsed: 150,
      isOverLimit: true,
    };

    vi.mocked(UsageMonitor.checkWorkspaceQuota).mockResolvedValue({
      allowed: false,
      usage: mockUsage,
      message: 'Monthly usage limit of $10 exceeded',
    });

    const request = new NextRequest('http://localhost:3000/api/workspace/ws-123/usage');
    const response = await GET(request, { params: Promise.resolve({ workspaceId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.usage).toEqual(mockUsage);
    expect(data.usage.isOverLimit).toBe(true);
  });
});