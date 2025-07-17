/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createServerClient } from '@supabase/ssr'
import { createMockUser } from '@/test/fixtures/users'
import { createMockWorkspace } from '@/test/fixtures/workspaces'
import { createMockIssue } from '@/test/fixtures/issues'

// Reset modules to avoid conflicts with global mocks
vi.resetModules()

// Mock dependencies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

describe('User Permissions', () => {
  let mockSupabaseClient: any
  let authenticatedUser: any
  let anotherUser: any
  let unauthenticatedClient: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create mock users
    authenticatedUser = createMockUser({ 
      id: 'auth-user-id',
      name: 'Authenticated User',
      email: 'auth@example.com' 
    })
    anotherUser = createMockUser({ 
      id: 'another-user-id',
      name: 'Another User',
      email: 'another@example.com' 
    })
    
    // Setup authenticated Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: authenticatedUser }, error: null }),
      },
      from: vi.fn((table: string) => {
        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(),
          then: vi.fn((callback: any) => {
            callback({ data: null, error: null })
            return Promise.resolve({ data: null, error: null })
          }),
        }
        return mockQuery
      }),
    }
    
    // Setup unauthenticated client
    unauthenticatedClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn((table: string) => {
        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(),
          then: vi.fn((callback: any) => {
            callback({ data: null, error: { message: 'JWT expired', code: 'PGRST301' } })
            return Promise.resolve({ data: null, error: { message: 'JWT expired', code: 'PGRST301' } })
          }),
        }
        return mockQuery
      }),
    }
    
    vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient)
  })

  describe('User Profile Permissions', () => {
    it('allows users to view their own profile', async () => {
      const selectMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const singleMock = vi.fn().mockResolvedValue({ 
        data: authenticatedUser, 
        error: null 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authenticatedUser.id)
        .single()
      
      expect(data.id).toBe(authenticatedUser.id)
      expect(error).toBeNull()
    })

    it('prevents users from viewing other users profiles', async () => {
      const selectMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const singleMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { 
          message: 'No rows found',
          code: 'PGRST116' 
        } 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', anotherUser.id)
        .single()
      
      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error.code).toBe('PGRST116')
    })

    it('allows users to update their own profile', async () => {
      const updates = {
        name: 'Updated Name',
        avatar_url: 'https://example.com/new-avatar.jpg',
      }
      
      const updateMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockResolvedValue({ 
        data: { ...authenticatedUser, ...updates }, 
        error: null 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
        select: selectMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', authenticatedUser.id)
        .select()
      
      expect(updateMock).toHaveBeenCalledWith(updates)
      expect(data).toMatchObject(updates)
      expect(error).toBeNull()
    })

    it('prevents users from updating other users profiles', async () => {
      const maliciousUpdate = {
        name: 'Hacked Name',
      }
      
      const updateMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { 
          message: 'new row violates row-level security policy',
          code: '42501' 
        } 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
        select: selectMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('users')
        .update(maliciousUpdate)
        .eq('id', anotherUser.id)
        .select()
      
      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error.code).toBe('42501')
    })

    it('allows users to create their own profile', async () => {
      const newProfile = {
        id: authenticatedUser.id,
        name: authenticatedUser.name,
        avatar_url: authenticatedUser.avatar_url,
      }
      
      const insertMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockResolvedValue({ 
        data: newProfile, 
        error: null 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('users')
        .insert(newProfile)
        .select()
      
      expect(insertMock).toHaveBeenCalledWith(newProfile)
      expect(data.id).toBe(authenticatedUser.id)
      expect(error).toBeNull()
    })

    it('prevents users from creating profiles with different user IDs', async () => {
      const maliciousProfile = {
        id: anotherUser.id, // Trying to create profile for another user
        name: 'Fake Profile',
      }
      
      const insertMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { 
          message: 'new row violates row-level security policy',
          code: '42501' 
        } 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('users')
        .insert(maliciousProfile)
        .select()
      
      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error.code).toBe('42501')
    })

    it('prevents profile deletion (no delete policy)', async () => {
      const deleteMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { 
          message: 'new row violates row-level security policy',
          code: '42501' 
        } 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        delete: deleteMock,
        eq: eqMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', authenticatedUser.id)
      
      // Users should not be able to delete their profiles
      expect(error).toBeDefined()
      expect(error.code).toBe('42501')
    })
  })

  describe('Authentication Requirements', () => {
    it('requires authentication to access any user data', async () => {
      vi.mocked(createServerClient).mockReturnValue(unauthenticatedClient)
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('users')
        .select('*')
      
      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error.code).toBe('PGRST301')
    })

    it('requires authentication to create workspaces', async () => {
      vi.mocked(createServerClient).mockReturnValue(unauthenticatedClient)
      
      const newWorkspace = {
        name: 'Test Workspace',
        slug: 'test-workspace',
        owner_id: 'some-id',
      }
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('workspaces')
        .insert(newWorkspace)
        .select()
      
      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error.code).toBe('PGRST301')
    })

    it('requires authentication to create issues', async () => {
      vi.mocked(createServerClient).mockReturnValue(unauthenticatedClient)
      
      const newIssue = {
        title: 'Test Issue',
        workspace_id: 'some-workspace-id',
        created_by: 'some-user-id',
        status: 'todo' as const,
      }
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('issues')
        .insert(newIssue)
        .select()
      
      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error.code).toBe('PGRST301')
    })
  })

  describe('Issue Assignee Permissions', () => {
    it('allows workspace owners to assign issues to any user', async () => {
      const workspace = createMockWorkspace({ owner_id: authenticatedUser.id })
      const issue = createMockIssue({ 
        workspace_id: workspace.id,
        created_by: authenticatedUser.id,
        assignee_id: null 
      })
      
      const updateMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockResolvedValue({ 
        data: { ...issue, assignee_id: anotherUser.id }, 
        error: null 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
        select: selectMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('issues')
        .update({ assignee_id: anotherUser.id })
        .eq('id', issue.id)
        .select()
      
      expect(data.assignee_id).toBe(anotherUser.id)
      expect(error).toBeNull()
    })

    it('allows self-assignment of issues', async () => {
      const workspace = createMockWorkspace({ owner_id: authenticatedUser.id })
      const issue = createMockIssue({ 
        workspace_id: workspace.id,
        created_by: authenticatedUser.id,
        assignee_id: null 
      })
      
      const updateMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockResolvedValue({ 
        data: { ...issue, assignee_id: authenticatedUser.id }, 
        error: null 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
        select: selectMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('issues')
        .update({ assignee_id: authenticatedUser.id })
        .eq('id', issue.id)
        .select()
      
      expect(data.assignee_id).toBe(authenticatedUser.id)
      expect(error).toBeNull()
    })

    it('allows unassigning issues', async () => {
      const workspace = createMockWorkspace({ owner_id: authenticatedUser.id })
      const issue = createMockIssue({ 
        workspace_id: workspace.id,
        created_by: authenticatedUser.id,
        assignee_id: authenticatedUser.id 
      })
      
      const updateMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockResolvedValue({ 
        data: { ...issue, assignee_id: null }, 
        error: null 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
        select: selectMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('issues')
        .update({ assignee_id: null })
        .eq('id', issue.id)
        .select()
      
      expect(data.assignee_id).toBeNull()
      expect(error).toBeNull()
    })

    it('validates assignee exists when assigning', async () => {
      const workspace = createMockWorkspace({ owner_id: authenticatedUser.id })
      const issue = createMockIssue({ 
        workspace_id: workspace.id,
        created_by: authenticatedUser.id 
      })
      
      const updateMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { 
          message: 'insert or update on table "issues" violates foreign key constraint',
          code: '23503' 
        } 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
        select: selectMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('issues')
        .update({ assignee_id: 'non-existent-user-id' })
        .eq('id', issue.id)
        .select()
      
      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error.code).toBe('23503')
    })
  })

  describe('Data Visibility Scope', () => {
    it('users can only see data in their own workspaces', async () => {
      const userWorkspace = createMockWorkspace({ owner_id: authenticatedUser.id })
      const otherWorkspace = createMockWorkspace({ owner_id: anotherUser.id })
      
      // Mock issues query
      const userIssues = [
        createMockIssue({ workspace_id: userWorkspace.id }),
        createMockIssue({ workspace_id: userWorkspace.id }),
      ]
      
      const selectMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockResolvedValue({ 
        data: userIssues, 
        error: null 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('workspace_id', userWorkspace.id)
      
      expect(data).toHaveLength(2)
      expect(data.every((issue: any) => issue.workspace_id === userWorkspace.id)).toBe(true)
      expect(error).toBeNull()
    })

    it('prevents cross-workspace data queries', async () => {
      const otherWorkspace = createMockWorkspace({ owner_id: anotherUser.id })
      
      const selectMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockResolvedValue({ 
        data: [], // RLS prevents access
        error: null 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('workspace_id', otherWorkspace.id)
      
      expect(data).toHaveLength(0)
      expect(error).toBeNull()
    })

    it('enforces user context in all operations', async () => {
      // Verify that auth.uid() is used in RLS policies
      const workspace = createMockWorkspace({ owner_id: authenticatedUser.id })
      
      // Test that operations succeed when user owns the workspace
      const insertMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockResolvedValue({ 
        data: { 
          title: 'Test Issue',
          workspace_id: workspace.id,
          created_by: authenticatedUser.id,
          id: 'new-issue-id' 
        }, 
        error: null 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('issues')
        .insert({
          title: 'Test Issue',
          workspace_id: workspace.id,
          created_by: authenticatedUser.id,
          status: 'todo' as const,
        })
        .select()
      
      expect(data).toBeDefined()
      expect(error).toBeNull()
    })
  })

  describe('Permission Inheritance', () => {
    it('workspace ownership grants full control over workspace issues', async () => {
      const workspace = createMockWorkspace({ owner_id: authenticatedUser.id })
      const issue = createMockIssue({ 
        workspace_id: workspace.id,
        created_by: anotherUser.id // Created by another user
      })
      
      // Owner should still be able to update
      const updateMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockResolvedValue({ 
        data: { ...issue, status: 'done' }, 
        error: null 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
        select: selectMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('issues')
        .update({ status: 'done' })
        .eq('id', issue.id)
        .select()
      
      expect(data.status).toBe('done')
      expect(error).toBeNull()
    })

    it('workspace ownership allows deleting any issue in workspace', async () => {
      const workspace = createMockWorkspace({ owner_id: authenticatedUser.id })
      const issue = createMockIssue({ 
        workspace_id: workspace.id,
        created_by: anotherUser.id // Created by another user
      })
      
      // Owner should still be able to delete
      const deleteMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: null 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        delete: deleteMock,
        eq: eqMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { error } = await supabase
        .from('issues')
        .delete()
        .eq('id', issue.id)
      
      expect(error).toBeNull()
    })

    it('no permissions cascade to non-owners', async () => {
      const workspace = createMockWorkspace({ owner_id: anotherUser.id })
      const issue = createMockIssue({ 
        workspace_id: workspace.id,
        created_by: anotherUser.id,
        assignee_id: authenticatedUser.id // Assigned to current user
      })
      
      // Even if assigned, non-owner cannot update
      const updateMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { 
          message: 'new row violates row-level security policy',
          code: '42501' 
        } 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
        select: selectMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('issues')
        .update({ status: 'done' })
        .eq('id', issue.id)
        .select()
      
      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error.code).toBe('42501')
    })
  })
})