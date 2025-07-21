import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateWorkspaceAccess, validateIssueWorkspace, validateIssueAccess } from '@/lib/validation/workspace-access'
import { createClient } from '@/lib/supabase/server'

// Mock the Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

describe('Cross-Workspace Security Tests', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: vi.fn()
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn()
            })),
            single: vi.fn()
          }))
        }))
      }))
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase)
  })

  describe('validateWorkspaceAccess', () => {
    it('should return true when user is a member of the workspace', async () => {
      const mockMember = { id: 'member-1' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockMember, error: null })
            })
          })
        })
      })

      const result = await validateWorkspaceAccess('workspace-1')
      expect(result).toBe(true)
    })

    it('should return false when user is not a member of the workspace', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
            })
          })
        })
      })

      const result = await validateWorkspaceAccess('workspace-1')
      expect(result).toBe(false)
    })

    it('should return false when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })

      const result = await validateWorkspaceAccess('workspace-1')
      expect(result).toBe(false)
    })
  })

  describe('validateIssueWorkspace', () => {
    it('should return true when issue belongs to the workspace', async () => {
      const mockIssue = { id: 'issue-1' }
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockIssue, error: null })
            })
          })
        })
      })

      const result = await validateIssueWorkspace('issue-1', 'workspace-1')
      expect(result).toBe(true)
    })

    it('should return false when issue does not belong to the workspace', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
            })
          })
        })
      })

      const result = await validateIssueWorkspace('issue-1', 'workspace-2')
      expect(result).toBe(false)
    })
  })

  describe('validateIssueAccess', () => {
    it('should return access true when user has access to issue workspace', async () => {
      const mockIssue = { id: 'issue-1', workspace_id: 'workspace-1' }
      const mockMember = { id: 'member-1' }
      
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
      
      // First call to get issue
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockIssue, error: null })
          })
        })
      })
      
      // Second call to check membership
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockMember, error: null })
            })
          })
        })
      })

      const result = await validateIssueAccess('issue-1')
      expect(result.hasAccess).toBe(true)
      expect(result.workspaceId).toBe('workspace-1')
    })

    it('should return access false when user does not have access to issue workspace', async () => {
      const mockIssue = { id: 'issue-1', workspace_id: 'workspace-1' }
      
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
      
      // First call to get issue
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockIssue, error: null })
          })
        })
      })
      
      // Second call to check membership - no access
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
            })
          })
        })
      })

      const result = await validateIssueAccess('issue-1')
      expect(result.hasAccess).toBe(false)
      expect(result.workspaceId).toBeUndefined()
    })

    it('should return access false when issue does not exist', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
          })
        })
      })

      const result = await validateIssueAccess('non-existent-issue')
      expect(result.hasAccess).toBe(false)
      expect(result.workspaceId).toBeUndefined()
    })
  })
})