import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { IssueCacheProvider, useIssueCache } from '@/contexts/issue-cache-context'
import { createClient } from '@/lib/supabase/client'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn()
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
global.localStorage = localStorageMock as any

describe('Issue Cache Security Tests', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn()
            })),
            single: vi.fn()
          })),
          in: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }))
    }
    
    vi.mocked(createClient).mockReturnValue(mockSupabase)
  })

  describe('getIssue with workspace validation', () => {
    it('should return null when issue does not belong to specified workspace', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IssueCacheProvider>{children}</IssueCacheProvider>
      )
      
      const { result } = renderHook(() => useIssueCache(), { wrapper })
      
      // Manually add an issue to the cache
      act(() => {
        result.current.updateIssue('issue-1', {
          id: 'issue-1',
          title: 'Test Issue',
          workspace_id: 'workspace-1',
          description: null,
          type: 'feature',
          priority: 'medium',
          status: 'todo',
          created_at: new Date().toISOString(),
          created_by: 'user-1',
          assignee_id: null
        })
      })
      
      // Try to get the issue with a different workspace ID
      const issue = result.current.getIssue('issue-1', 'workspace-2')
      
      expect(issue).toBeNull()
    })

    it('should return the issue when it belongs to specified workspace', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IssueCacheProvider>{children}</IssueCacheProvider>
      )
      
      const { result } = renderHook(() => useIssueCache(), { wrapper })
      
      const testIssue = {
        id: 'issue-1',
        title: 'Test Issue',
        workspace_id: 'workspace-1',
        description: null,
        type: 'feature' as const,
        priority: 'medium' as const,
        status: 'todo' as const,
        created_at: new Date().toISOString(),
        created_by: 'user-1',
        assignee_id: null,
        creator: { name: 'Test User', avatar_url: null }
      }
      
      // Mock the preloadIssue call to populate cache
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: testIssue, error: null })
            })
          })
        })
      })
      
      // Preload the issue
      await act(async () => {
        await result.current.preloadIssue('issue-1', 'workspace-1')
      })
      
      // Get the issue with the correct workspace ID
      const issue = result.current.getIssue('issue-1', 'workspace-1')
      
      expect(issue).toEqual(testIssue)
    })

    it('should return the issue when no workspace ID is specified', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IssueCacheProvider>{children}</IssueCacheProvider>
      )
      
      const { result } = renderHook(() => useIssueCache(), { wrapper })
      
      const testIssue = {
        id: 'issue-1',
        title: 'Test Issue',
        workspace_id: 'workspace-1',
        description: null,
        type: 'feature' as const,
        priority: 'medium' as const,
        status: 'todo' as const,
        created_at: new Date().toISOString(),
        created_by: 'user-1',
        assignee_id: null,
        creator: { name: 'Test User', avatar_url: null }
      }
      
      // Mock the preloadIssue call
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: testIssue, error: null })
          })
        })
      })
      
      // Preload the issue without workspace validation
      await act(async () => {
        await result.current.preloadIssue('issue-1')
      })
      
      // Get the issue without workspace validation
      const issue = result.current.getIssue('issue-1')
      
      expect(issue).toEqual(testIssue)
    })
  })

  describe('preloadIssue with workspace validation', () => {
    it('should not load issue from wrong workspace', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IssueCacheProvider>{children}</IssueCacheProvider>
      )
      
      const { result } = renderHook(() => useIssueCache(), { wrapper })
      
      // Mock Supabase to return an issue from workspace-1
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'issue-1',
                  title: 'Test Issue',
                  workspace_id: 'workspace-1',
                  description: null,
                  type: 'feature',
                  priority: 'medium',
                  status: 'todo',
                  created_at: new Date().toISOString(),
                  created_by: 'user-1',
                  assignee_id: null,
                  creator: { name: 'Test User', avatar_url: null }
                },
                error: null
              })
            })
          })
        })
      })
      
      // Try to preload with workspace-2
      await act(async () => {
        await result.current.preloadIssue('issue-1', 'workspace-2')
      })
      
      // Issue should not be in cache
      const issue = result.current.getIssue('issue-1', 'workspace-2')
      expect(issue).toBeNull()
    })

    it('should load issue when workspace matches', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IssueCacheProvider>{children}</IssueCacheProvider>
      )
      
      const { result } = renderHook(() => useIssueCache(), { wrapper })
      
      const testIssue = {
        id: 'issue-1',
        title: 'Test Issue',
        workspace_id: 'workspace-1',
        description: null,
        type: 'feature',
        priority: 'medium',
        status: 'todo',
        created_at: new Date().toISOString(),
        created_by: 'user-1',
        assignee_id: null,
        creator: { name: 'Test User', avatar_url: null }
      }
      
      // Mock Supabase to return the issue
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: testIssue,
                error: null
              })
            })
          })
        })
      })
      
      // Preload with correct workspace
      await act(async () => {
        await result.current.preloadIssue('issue-1', 'workspace-1')
      })
      
      // Issue should be in cache
      const issue = result.current.getIssue('issue-1', 'workspace-1')
      expect(issue).toEqual(testIssue)
    })
  })

  describe('preloadIssues with workspace validation', () => {
    it('should only load issues from specified workspace', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IssueCacheProvider>{children}</IssueCacheProvider>
      )
      
      const { result } = renderHook(() => useIssueCache(), { wrapper })
      
      const issues = [
        {
          id: 'issue-1',
          title: 'Issue 1',
          workspace_id: 'workspace-1',
          description: null,
          type: 'feature',
          priority: 'medium',
          status: 'todo',
          created_at: new Date().toISOString(),
          created_by: 'user-1',
          assignee_id: null,
          creator: { name: 'Test User', avatar_url: null }
        },
        {
          id: 'issue-2',
          title: 'Issue 2',
          workspace_id: 'workspace-2',
          description: null,
          type: 'bug',
          priority: 'high',
          status: 'todo',
          created_at: new Date().toISOString(),
          created_by: 'user-1',
          assignee_id: null,
          creator: { name: 'Test User', avatar_url: null }
        }
      ]
      
      // Mock Supabase to filter by workspace
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((field, value) => {
              if (field === 'workspace_id' && value === 'workspace-1') {
                return Promise.resolve({
                  data: [issues[0]], // Only return issue from workspace-1
                  error: null
                })
              }
              return Promise.resolve({ data: [], error: null })
            })
          })
        })
      })
      
      // Preload with workspace-1
      await act(async () => {
        await result.current.preloadIssues(['issue-1', 'issue-2'], 'workspace-1')
      })
      
      // Only issue-1 should be in cache
      const issue1 = result.current.getIssue('issue-1', 'workspace-1')
      const issue2 = result.current.getIssue('issue-2', 'workspace-1')
      
      expect(issue1).toBeTruthy()
      expect(issue2).toBeNull()
    })
  })
})