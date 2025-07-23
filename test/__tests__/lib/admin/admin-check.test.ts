import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from '@/lib/supabase/server';

// Mock the Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('Admin Access Control', () => {
  let mockSupabase: any;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules to ensure clean state
    vi.resetModules();
    
    // Reset environment variables
    process.env = { ...originalEnv };
    
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('isAdmin', () => {
    it('should return false when userId is not provided', async () => {
      const { isAdmin } = await import('@/lib/admin/admin-check');
      const result = await isAdmin(null);
      expect(result).toBe(false);
    });

    it('should return false when no admin emails are configured', async () => {
      process.env['ADMIN_EMAILS'] = '';
      const { isAdmin } = await import('@/lib/admin/admin-check');
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
      });

      const result = await isAdmin('user-123');
      expect(result).toBe(false);
    });

    it('should return true when user email is in admin list', async () => {
      process.env['ADMIN_EMAILS'] = 'admin@example.com,test@example.com';
      const { isAdmin } = await import('@/lib/admin/admin-check');
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
      });

      const result = await isAdmin('user-123');
      expect(result).toBe(true);
    });

    it('should return false when user email is not in admin list', async () => {
      process.env['ADMIN_EMAILS'] = 'admin@example.com,other@example.com';
      const { isAdmin } = await import('@/lib/admin/admin-check');
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
      });

      const result = await isAdmin('user-123');
      expect(result).toBe(false);
    });

    it('should handle whitespace in admin emails list', async () => {
      process.env['ADMIN_EMAILS'] = ' admin@example.com , test@example.com ';
      const { isAdmin } = await import('@/lib/admin/admin-check');
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
      });

      const result = await isAdmin('user-123');
      expect(result).toBe(true);
    });

    it('should return false when user ID does not match', async () => {
      process.env['ADMIN_EMAILS'] = 'test@example.com';
      const { isAdmin } = await import('@/lib/admin/admin-check');
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'different-user',
            email: 'test@example.com',
          },
        },
      });

      const result = await isAdmin('user-123');
      expect(result).toBe(false);
    });

    it('should return false when user has no email', async () => {
      process.env['ADMIN_EMAILS'] = 'test@example.com';
      const { isAdmin } = await import('@/lib/admin/admin-check');
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: null,
          },
        },
      });

      const result = await isAdmin('user-123');
      expect(result).toBe(false);
    });
  });

  describe('requireAdmin', () => {
    it('should throw when no admin emails are configured', async () => {
      process.env['ADMIN_EMAILS'] = '';
      const { requireAdmin } = await import('@/lib/admin/admin-check');
      
      await expect(requireAdmin()).rejects.toThrow(
        'Admin access not configured. Set ADMIN_EMAILS environment variable.'
      );
    });

    it('should throw when user is not authenticated', async () => {
      process.env['ADMIN_EMAILS'] = 'admin@example.com';
      const { requireAdmin } = await import('@/lib/admin/admin-check');
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      await expect(requireAdmin()).rejects.toThrow(
        'Unauthorized: Admin access required'
      );
    });

    it('should throw when user is not an admin', async () => {
      process.env['ADMIN_EMAILS'] = 'admin@example.com';
      const { requireAdmin } = await import('@/lib/admin/admin-check');
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'notadmin@example.com',
          },
        },
      });

      await expect(requireAdmin()).rejects.toThrow(
        'Unauthorized: Admin access required'
      );
    });

    it('should return user when authenticated as admin', async () => {
      process.env['ADMIN_EMAILS'] = 'admin@example.com';
      const { requireAdmin } = await import('@/lib/admin/admin-check');
      
      const adminUser = {
        id: 'admin-123',
        email: 'admin@example.com',
      };
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: adminUser },
      });

      const result = await requireAdmin();
      expect(result).toEqual(adminUser);
    });

    it('should handle multiple admin emails', async () => {
      process.env['ADMIN_EMAILS'] = 'admin1@example.com,admin2@example.com,admin3@example.com';
      const { requireAdmin } = await import('@/lib/admin/admin-check');
      
      const adminUser = {
        id: 'admin-2',
        email: 'admin2@example.com',
      };
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: adminUser },
      });

      const result = await requireAdmin();
      expect(result).toEqual(adminUser);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty strings in admin list', async () => {
      process.env['ADMIN_EMAILS'] = 'admin@example.com,,test@example.com,';
      const { isAdmin } = await import('@/lib/admin/admin-check');
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
      });

      const result = await isAdmin('user-123');
      expect(result).toBe(true);
    });

    it('should handle undefined ADMIN_EMAILS', async () => {
      delete process.env['ADMIN_EMAILS'];
      const { isAdmin } = await import('@/lib/admin/admin-check');
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
      });

      const result = await isAdmin('user-123');
      expect(result).toBe(false);
    });

    it('should be case-sensitive for email matching', async () => {
      process.env['ADMIN_EMAILS'] = 'Admin@Example.com';
      const { isAdmin } = await import('@/lib/admin/admin-check');
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'admin@example.com', // lowercase
          },
        },
      });

      const result = await isAdmin('user-123');
      expect(result).toBe(false); // Should not match due to case
    });
  });
});