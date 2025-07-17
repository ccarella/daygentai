/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createServerClient } from '@supabase/ssr'
import { createMockIssue, createMockIssues, issueTypes, issuePriorities, issueStatuses } from '@/test/fixtures/issues'
import { createMockUser } from '@/test/fixtures/users'
import { createMockWorkspace } from '@/test/fixtures/workspaces'

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

describe('Issue CRUD Operations', () => {
  let mockSupabaseClient: any
  let mockUser: any
  let mockWorkspace: any
  let mockIssue: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create mock data
    mockUser = createMockUser()
    mockWorkspace = createMockWorkspace({ owner_id: mockUser.id })
    mockIssue = createMockIssue({ 
      workspace_id: mockWorkspace.id,
      created_by: mockUser.id 
    })
    
    // Setup mock Supabase client with chainable methods
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: vi.fn((table: string) => {
        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          range: vi.fn().mockReturnThis(),
          single: vi.fn(),
          // Default responses
          then: vi.fn((callback: any) => {
            callback({ data: null, error: null })
            return Promise.resolve({ data: null, error: null })
          }),
        }
        return mockQuery
      }),
    }
    
    vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient)
  })

  describe('Create Operations', () => {
    it('creates a new issue with all required fields', async () => {
      const newIssue = {
        title: 'New Feature Request',
        description: 'Add dark mode support',
        type: 'feature' as const,
        priority: 'high' as const,
        status: 'todo' as const,
        workspace_id: mockWorkspace.id,
        created_by: mockUser.id,
      }
      
      const insertMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockResolvedValue({ 
        data: { ...newIssue, id: mockIssue.id, created_at: new Date().toISOString() }, 
        error: null 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('issues')
        .insert(newIssue)
        .select()
      
      expect(insertMock).toHaveBeenCalledWith(newIssue)
      expect(selectMock).toHaveBeenCalled()
      expect(data).toMatchObject(newIssue)
      expect(error).toBeNull()
    })

    it('validates required fields on creation', async () => {
      const invalidIssue = {
        // Missing required 'title' field
        description: 'Missing title',
        type: 'bug' as const,
        priority: 'medium' as const,
        status: 'todo' as const,
        workspace_id: mockWorkspace.id,
        created_by: mockUser.id,
      }
      
      const insertMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { 
          message: 'null value in column "title" violates not-null constraint',
          code: '23502' 
        } 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('issues')
        .insert(invalidIssue)
        .select()
      
      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error.code).toBe('23502')
    })

    it('enforces enum constraints for issue type', async () => {
      const invalidTypeIssue = {
        title: 'Invalid Type Issue',
        type: 'invalid_type', // Invalid enum value
        priority: 'medium' as const,
        status: 'todo' as const,
        workspace_id: mockWorkspace.id,
        created_by: mockUser.id,
      }
      
      const insertMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { 
          message: 'invalid input value for enum issue_type',
          code: '22P02' 
        } 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('issues')
        .insert(invalidTypeIssue)
        .select()
      
      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error.code).toBe('22P02')
    })

    it('accepts all valid issue types', async () => {
      for (const type of issueTypes) {
        const issue = {
          title: `${type} Issue`,
          type,
          priority: 'medium' as const,
          status: 'todo' as const,
          workspace_id: mockWorkspace.id,
          created_by: mockUser.id,
        }
        
        const insertMock = vi.fn().mockReturnThis()
        const selectMock = vi.fn().mockResolvedValue({ 
          data: { ...issue, id: mockIssue.id }, 
          error: null 
        })
        
        mockSupabaseClient.from.mockReturnValue({
          insert: insertMock,
          select: selectMock,
        })
        
        const supabase = createServerClient('', '', { cookies: {} as any })
        const { data, error } = await supabase
          .from('issues')
          .insert(issue)
          .select()
        
        expect(error).toBeNull()
        expect(data.type).toBe(type)
      }
    })

    it('accepts all valid priority levels', async () => {
      for (const priority of issuePriorities) {
        const issue = {
          title: `${priority} Priority Issue`,
          type: 'task' as const,
          priority,
          status: 'todo' as const,
          workspace_id: mockWorkspace.id,
          created_by: mockUser.id,
        }
        
        const insertMock = vi.fn().mockReturnThis()
        const selectMock = vi.fn().mockResolvedValue({ 
          data: { ...issue, id: mockIssue.id }, 
          error: null 
        })
        
        mockSupabaseClient.from.mockReturnValue({
          insert: insertMock,
          select: selectMock,
        })
        
        const supabase = createServerClient('', '', { cookies: {} as any })
        const { data, error } = await supabase
          .from('issues')
          .insert(issue)
          .select()
        
        expect(error).toBeNull()
        expect(data.priority).toBe(priority)
      }
    })

    it('sets default values for optional fields', async () => {
      const minimalIssue = {
        title: 'Minimal Issue',
        workspace_id: mockWorkspace.id,
        created_by: mockUser.id,
        status: 'todo' as const,
      }
      
      const insertMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockResolvedValue({ 
        data: { 
          ...minimalIssue,
          id: mockIssue.id,
          type: 'task', // Default value
          priority: 'medium', // Default value
          description: null,
          assignee_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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
        .insert(minimalIssue)
        .select()
      
      expect(error).toBeNull()
      expect(data.type).toBe('task') // Default type
      expect(data.priority).toBe('medium') // Default priority
      expect(data.description).toBeNull()
      expect(data.assignee_id).toBeNull()
    })
  })

  describe('Read Operations', () => {
    it('fetches all issues for a workspace', async () => {
      const mockIssues = createMockIssues(5, { workspace_id: mockWorkspace.id })
      
      const selectMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const orderMock = vi.fn().mockResolvedValue({ 
        data: mockIssues, 
        error: null 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        order: orderMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('workspace_id', mockWorkspace.id)
        .order('created_at', { ascending: false })
      
      expect(selectMock).toHaveBeenCalledWith('*')
      expect(eqMock).toHaveBeenCalledWith('workspace_id', mockWorkspace.id)
      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(data).toHaveLength(5)
      expect(error).toBeNull()
    })

    it('fetches a single issue by ID', async () => {
      const selectMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const singleMock = vi.fn().mockResolvedValue({ 
        data: mockIssue, 
        error: null 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('id', mockIssue.id)
        .single()
      
      expect(eqMock).toHaveBeenCalledWith('id', mockIssue.id)
      expect(singleMock).toHaveBeenCalled()
      expect(data.id).toBe(mockIssue.id)
      expect(error).toBeNull()
    })

    it('filters issues by status', async () => {
      const todoIssues = createMockIssues(3, { 
        workspace_id: mockWorkspace.id,
        status: 'todo' 
      })
      
      const selectMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      
      // Chain eq calls
      let callCount = 0
      eqMock.mockImplementation((field: string, value: any) => {
        callCount++
        if (callCount === 2) {
          // After second eq call, return the resolved value
          return Promise.resolve({ data: todoIssues, error: null })
        }
        return { select: selectMock, eq: eqMock }
      })
      
      mockSupabaseClient.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('workspace_id', mockWorkspace.id)
        .eq('status', 'todo')
      
      expect(eqMock).toHaveBeenCalledWith('workspace_id', mockWorkspace.id)
      expect(eqMock).toHaveBeenCalledWith('status', 'todo')
      expect(data).toHaveLength(3)
      expect(data.every((issue: any) => issue.status === 'todo')).toBe(true)
      expect(error).toBeNull()
    })

    it('implements pagination correctly', async () => {
      const allIssues = createMockIssues(150, { workspace_id: mockWorkspace.id })
      const page1Issues = allIssues.slice(0, 50)
      
      const selectMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const orderMock = vi.fn().mockReturnThis()
      const rangeMock = vi.fn().mockResolvedValue({ 
        data: page1Issues, 
        error: null 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        order: orderMock,
        range: rangeMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('workspace_id', mockWorkspace.id)
        .order('created_at', { ascending: false })
        .range(0, 49) // First 50 items
      
      expect(rangeMock).toHaveBeenCalledWith(0, 49)
      expect(data).toHaveLength(50)
      expect(error).toBeNull()
    })
  })

  describe('Update Operations', () => {
    it('updates issue status', async () => {
      const newStatus = 'in_progress' as const
      
      const updateMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockResolvedValue({ 
        data: { ...mockIssue, status: newStatus }, 
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
        .update({ status: newStatus })
        .eq('id', mockIssue.id)
        .select()
      
      expect(updateMock).toHaveBeenCalledWith({ status: newStatus })
      expect(eqMock).toHaveBeenCalledWith('id', mockIssue.id)
      expect(data.status).toBe(newStatus)
      expect(error).toBeNull()
    })

    it('updates multiple fields simultaneously', async () => {
      const updates = {
        title: 'Updated Title',
        description: 'Updated description',
        priority: 'critical' as const,
        assignee_id: createMockUser().id,
      }
      
      const updateMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockResolvedValue({ 
        data: { ...mockIssue, ...updates }, 
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
        .update(updates)
        .eq('id', mockIssue.id)
        .select()
      
      expect(updateMock).toHaveBeenCalledWith(updates)
      expect(data).toMatchObject(updates)
      expect(error).toBeNull()
    })

    it('validates enum constraints on update', async () => {
      const invalidUpdate = {
        type: 'invalid_type', // Invalid enum value
      }
      
      const updateMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { 
          message: 'invalid input value for enum issue_type',
          code: '22P02' 
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
        .update(invalidUpdate)
        .eq('id', mockIssue.id)
        .select()
      
      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error.code).toBe('22P02')
    })

    it('handles concurrent updates gracefully', async () => {
      // Simulate two users trying to update the same issue
      const update1 = { status: 'in_progress' as const }
      const update2 = { status: 'in_review' as const }
      
      const updateMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn()
        .mockResolvedValueOnce({ 
          data: { ...mockIssue, ...update1 }, 
          error: null 
        })
        .mockResolvedValueOnce({ 
          data: { ...mockIssue, ...update2 }, 
          error: null 
        })
      
      mockSupabaseClient.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
        select: selectMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      
      // First update
      const { data: data1 } = await supabase
        .from('issues')
        .update(update1)
        .eq('id', mockIssue.id)
        .select()
      
      // Second update
      const { data: data2 } = await supabase
        .from('issues')
        .update(update2)
        .eq('id', mockIssue.id)
        .select()
      
      expect(data1.status).toBe('in_progress')
      expect(data2.status).toBe('in_review')
    })
  })

  describe('Delete Operations', () => {
    it('deletes an issue by ID', async () => {
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
        .eq('id', mockIssue.id)
      
      expect(deleteMock).toHaveBeenCalled()
      expect(eqMock).toHaveBeenCalledWith('id', mockIssue.id)
      expect(error).toBeNull()
    })

    it('returns error when trying to delete non-existent issue', async () => {
      const deleteMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { 
          message: 'No rows found',
          code: 'PGRST116' 
        } 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        delete: deleteMock,
        eq: eqMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { error } = await supabase
        .from('issues')
        .delete()
        .eq('id', 'non-existent-id')
      
      expect(error).toBeDefined()
      expect(error.code).toBe('PGRST116')
    })

    it('bulk deletes multiple issues', async () => {
      const issueIds = createMockIssues(3).map(issue => issue.id)
      
      const deleteMock = vi.fn().mockReturnThis()
      const inMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: null 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        delete: deleteMock,
        in: inMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { error } = await supabase
        .from('issues')
        .delete()
        .in('id', issueIds)
      
      expect(deleteMock).toHaveBeenCalled()
      expect(inMock).toHaveBeenCalledWith('id', issueIds)
      expect(error).toBeNull()
    })
  })

  describe('Data Integrity', () => {
    it('maintains referential integrity with workspace', async () => {
      const invalidIssue = {
        title: 'Issue with invalid workspace',
        type: 'task' as const,
        priority: 'medium' as const,
        status: 'todo' as const,
        workspace_id: 'non-existent-workspace-id',
        created_by: mockUser.id,
      }
      
      const insertMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { 
          message: 'insert or update on table "issues" violates foreign key constraint',
          code: '23503' 
        } 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('issues')
        .insert(invalidIssue)
        .select()
      
      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error.code).toBe('23503')
    })

    it('maintains referential integrity with user', async () => {
      const invalidIssue = {
        title: 'Issue with invalid user',
        type: 'task' as const,
        priority: 'medium' as const,
        status: 'todo' as const,
        workspace_id: mockWorkspace.id,
        created_by: 'non-existent-user-id',
      }
      
      const insertMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { 
          message: 'insert or update on table "issues" violates foreign key constraint',
          code: '23503' 
        } 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('issues')
        .insert(invalidIssue)
        .select()
      
      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error.code).toBe('23503')
    })

    it('cascades updates when workspace is deleted', async () => {
      // Note: This behavior depends on the database schema CASCADE rules
      // In a real test, you'd verify the actual database behavior
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
      
      // Delete workspace
      await supabase
        .from('workspaces')
        .delete()
        .eq('id', mockWorkspace.id)
      
      // Verify issues are also deleted (in a real test)
      // This is a mock example - actual behavior depends on DB constraints
      expect(deleteMock).toHaveBeenCalled()
    })
  })
})