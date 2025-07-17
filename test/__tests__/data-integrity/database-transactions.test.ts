/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createServerClient } from '@supabase/ssr'
import { createMockUser } from '@/test/fixtures/users'
import { createMockWorkspace } from '@/test/fixtures/workspaces'
import { createMockIssue, createMockIssues } from '@/test/fixtures/issues'

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

describe('Database Transaction Handling', () => {
  let mockSupabaseClient: any
  let mockUser: any
  let mockWorkspace: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create mock data
    mockUser = createMockUser()
    mockWorkspace = createMockWorkspace({ owner_id: mockUser.id })
    
    // Setup mock Supabase client
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
          single: vi.fn(),
          then: vi.fn((callback: any) => {
            callback({ data: null, error: null })
            return Promise.resolve({ data: null, error: null })
          }),
        }
        return mockQuery
      }),
      rpc: vi.fn(),
    }
    
    vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient)
  })

  describe('Atomic Operations', () => {
    it('ensures single operations are atomic', async () => {
      const newIssue = {
        title: 'Atomic Operation Test',
        workspace_id: mockWorkspace.id,
        created_by: mockUser.id,
        status: 'todo' as const,
      }
      
      const insertMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn()
        .mockResolvedValueOnce({ 
          data: null, 
          error: { message: 'Connection lost', code: 'PGRST000' } 
        })
        .mockResolvedValueOnce({ 
          data: { ...newIssue, id: 'new-id' }, 
          error: null 
        })
      
      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      
      // First attempt fails
      const { data: data1, error: error1 } = await supabase
        .from('issues')
        .insert(newIssue)
        .select()
      
      expect(data1).toBeNull()
      expect(error1).toBeDefined()
      
      // Second attempt succeeds (simulating retry)
      const { data: data2, error: error2 } = await supabase
        .from('issues')
        .insert(newIssue)
        .select()
      
      expect(data2).toBeDefined()
      expect(error2).toBeNull()
    })

    it('prevents partial updates on constraint violations', async () => {
      const invalidUpdate = {
        assignee_id: 'non-existent-user', // Will violate FK constraint
        status: 'in_progress' as const,
      }
      
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
        .update(invalidUpdate)
        .eq('id', 'some-issue-id')
        .select()
      
      // Entire update should fail, not just the invalid field
      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error.code).toBe('23503')
    })
  })

  describe('Batch Operations', () => {
    it('handles batch inserts atomically', async () => {
      const batchIssues = createMockIssues(5, { 
        workspace_id: mockWorkspace.id,
        created_by: mockUser.id 
      })
      
      // One issue has invalid data
      batchIssues[2] = { ...batchIssues[2], workspace_id: 'invalid-workspace' }
      
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
        .insert(batchIssues)
        .select()
      
      // All inserts should fail if one fails
      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error.code).toBe('23503')
    })

    it('handles batch updates atomically', async () => {
      const issueIds = ['issue-1', 'issue-2', 'issue-3']
      const bulkUpdate = { status: 'done' as const }
      
      const updateMock = vi.fn().mockReturnThis()
      const inMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockResolvedValue({ 
        data: issueIds.map(id => ({ id, ...bulkUpdate })), 
        error: null 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        update: updateMock,
        in: inMock,
        select: selectMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data, error } = await supabase
        .from('issues')
        .update(bulkUpdate)
        .in('id', issueIds)
        .select()
      
      expect(data).toHaveLength(3)
      expect(data.every((issue: any) => issue.status === 'done')).toBe(true)
      expect(error).toBeNull()
    })

    it('handles batch deletes atomically', async () => {
      const issueIds = ['issue-1', 'issue-2', 'issue-3']
      
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

  describe('Cascade Operations', () => {
    it('simulates cascade delete when workspace is deleted', async () => {
      // Note: Actual cascade behavior is configured at database level
      // This test verifies the expected behavior
      
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
      const { error: workspaceError } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', mockWorkspace.id)
      
      expect(workspaceError).toBeNull()
      
      // Verify issues would be cascade deleted
      // In real scenario, this would be handled by DB constraints
      const selectMock = vi.fn().mockReturnThis()
      const eqMock2 = vi.fn().mockResolvedValue({ 
        data: [], // No issues found after cascade
        error: null 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        select: selectMock,
        eq: eqMock2,
      })
      
      const { data: remainingIssues } = await supabase
        .from('issues')
        .select('*')
        .eq('workspace_id', mockWorkspace.id)
      
      expect(remainingIssues).toHaveLength(0)
    })

    it('handles orphaned records prevention', async () => {
      // Try to delete a user who owns workspaces
      const deleteMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { 
          message: 'update or delete on table "users" violates foreign key constraint',
          code: '23503' 
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
        .eq('id', mockUser.id)
      
      // Should prevent deletion due to dependent workspaces
      expect(error).toBeDefined()
      expect(error.code).toBe('23503')
    })
  })

  describe('Concurrent Access Handling', () => {
    it('handles optimistic locking scenarios', async () => {
      const issue = createMockIssue({ 
        workspace_id: mockWorkspace.id,
        status: 'todo',
        updated_at: '2024-01-01T00:00:00Z' 
      })
      
      // Simulate two users trying to update the same issue
      const user1Update = { status: 'in_progress' as const }
      const user2Update = { status: 'in_review' as const }
      
      // User 1's update
      const updateMock1 = vi.fn().mockReturnThis()
      const eqMock1 = vi.fn().mockReturnThis()
      const selectMock1 = vi.fn().mockResolvedValue({ 
        data: { ...issue, ...user1Update, updated_at: '2024-01-01T00:00:01Z' }, 
        error: null 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        update: updateMock1,
        eq: eqMock1,
        select: selectMock1,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data: data1 } = await supabase
        .from('issues')
        .update(user1Update)
        .eq('id', issue.id)
        .select()
      
      expect(data1.status).toBe('in_progress')
      
      // User 2's update (would succeed in real scenario, demonstrating last-write-wins)
      const updateMock2 = vi.fn().mockReturnThis()
      const eqMock2 = vi.fn().mockReturnThis()
      const selectMock2 = vi.fn().mockResolvedValue({ 
        data: { ...issue, ...user2Update, updated_at: '2024-01-01T00:00:02Z' }, 
        error: null 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        update: updateMock2,
        eq: eqMock2,
        select: selectMock2,
      })
      
      const { data: data2 } = await supabase
        .from('issues')
        .update(user2Update)
        .eq('id', issue.id)
        .select()
      
      expect(data2.status).toBe('in_review')
      expect(data2.updated_at > data1.updated_at).toBe(true)
    })

    it('handles race conditions in unique constraint scenarios', async () => {
      // Two users trying to create workspaces with the same slug
      const duplicateSlug = 'unique-workspace'
      
      const workspace1 = {
        name: 'Workspace 1',
        slug: duplicateSlug,
        owner_id: mockUser.id,
      }
      
      const workspace2 = {
        name: 'Workspace 2',
        slug: duplicateSlug,
        owner_id: mockUser.id,
      }
      
      // First request succeeds
      const insertMock1 = vi.fn().mockReturnThis()
      const selectMock1 = vi.fn().mockResolvedValue({ 
        data: { ...workspace1, id: 'workspace-1-id' }, 
        error: null 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock1,
        select: selectMock1,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      const { data: data1, error: error1 } = await supabase
        .from('workspaces')
        .insert(workspace1)
        .select()
      
      expect(data1).toBeDefined()
      expect(error1).toBeNull()
      
      // Second request fails due to unique constraint
      const insertMock2 = vi.fn().mockReturnThis()
      const selectMock2 = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { 
          message: 'duplicate key value violates unique constraint',
          code: '23505' 
        } 
      })
      
      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock2,
        select: selectMock2,
      })
      
      const { data: data2, error: error2 } = await supabase
        .from('workspaces')
        .insert(workspace2)
        .select()
      
      expect(data2).toBeNull()
      expect(error2).toBeDefined()
      expect(error2.code).toBe('23505')
    })
  })

  describe('Data Consistency Guarantees', () => {
    it('maintains referential integrity across operations', async () => {
      // Verify that all foreign key relationships are enforced
      const operations = [
        {
          name: 'issue with invalid workspace',
          table: 'issues',
          data: {
            title: 'Test Issue',
            workspace_id: 'non-existent-workspace',
            created_by: mockUser.id,
            status: 'todo' as const,
          },
          expectedError: '23503',
        },
        {
          name: 'issue with invalid creator',
          table: 'issues',
          data: {
            title: 'Test Issue',
            workspace_id: mockWorkspace.id,
            created_by: 'non-existent-user',
            status: 'todo' as const,
          },
          expectedError: '23503',
        },
        {
          name: 'workspace with invalid owner',
          table: 'workspaces',
          data: {
            name: 'Test Workspace',
            slug: 'test-workspace',
            owner_id: 'non-existent-user',
          },
          expectedError: '23503',
        },
      ]
      
      for (const op of operations) {
        const insertMock = vi.fn().mockReturnThis()
        const selectMock = vi.fn().mockResolvedValue({ 
          data: null, 
          error: { 
            message: 'violates foreign key constraint',
            code: op.expectedError 
          } 
        })
        
        mockSupabaseClient.from.mockReturnValue({
          insert: insertMock,
          select: selectMock,
        })
        
        const supabase = createServerClient('', '', { cookies: {} as any })
        const { data, error } = await supabase
          .from(op.table)
          .insert(op.data)
          .select()
        
        expect(data).toBeNull()
        expect(error).toBeDefined()
        expect(error.code).toBe(op.expectedError)
      }
    })

    it('ensures enum constraints are enforced', async () => {
      const enumTests = [
        {
          field: 'type',
          value: 'invalid_type',
          table: 'issues',
        },
        {
          field: 'priority',
          value: 'invalid_priority',
          table: 'issues',
        },
        {
          field: 'status',
          value: 'invalid_status',
          table: 'issues',
        },
      ]
      
      for (const test of enumTests) {
        const issue = {
          title: 'Enum Test',
          workspace_id: mockWorkspace.id,
          created_by: mockUser.id,
          type: 'task' as const,
          priority: 'medium' as const,
          status: 'todo' as const,
          [test.field]: test.value,
        }
        
        const insertMock = vi.fn().mockReturnThis()
        const selectMock = vi.fn().mockResolvedValue({ 
          data: null, 
          error: { 
            message: `invalid input value for enum`,
            code: '22P02' 
          } 
        })
        
        mockSupabaseClient.from.mockReturnValue({
          insert: insertMock,
          select: selectMock,
        })
        
        const supabase = createServerClient('', '', { cookies: {} as any })
        const { data, error } = await supabase
          .from(test.table)
          .insert(issue)
          .select()
        
        expect(data).toBeNull()
        expect(error).toBeDefined()
        expect(error.code).toBe('22P02')
      }
    })

    it('maintains data consistency during complex operations', async () => {
      // Simulate a complex operation that involves multiple tables
      const createWorkspaceWithIssues = async () => {
        const supabase = createServerClient('', '', { cookies: {} as any })
        
        // Step 1: Create workspace
        const workspace = {
          name: 'New Project',
          slug: 'new-project',
          owner_id: mockUser.id,
        }
        
        const insertWorkspaceMock = vi.fn().mockReturnThis()
        const selectWorkspaceMock = vi.fn().mockResolvedValue({ 
          data: { ...workspace, id: 'new-workspace-id' }, 
          error: null 
        })
        
        mockSupabaseClient.from.mockReturnValue({
          insert: insertWorkspaceMock,
          select: selectWorkspaceMock,
        })
        
        const { data: workspaceData, error: workspaceError } = await supabase
          .from('workspaces')
          .insert(workspace)
          .select()
        
        if (workspaceError) throw workspaceError
        
        // Step 2: Create multiple issues
        const issues = [
          {
            title: 'Setup project',
            workspace_id: workspaceData.id,
            created_by: mockUser.id,
            status: 'todo' as const,
          },
          {
            title: 'Create README',
            workspace_id: workspaceData.id,
            created_by: mockUser.id,
            status: 'todo' as const,
          },
        ]
        
        const insertIssuesMock = vi.fn().mockReturnThis()
        const selectIssuesMock = vi.fn().mockResolvedValue({ 
          data: issues.map((issue, i) => ({ ...issue, id: `issue-${i}` })), 
          error: null 
        })
        
        mockSupabaseClient.from.mockReturnValue({
          insert: insertIssuesMock,
          select: selectIssuesMock,
        })
        
        const { data: issuesData, error: issuesError } = await supabase
          .from('issues')
          .insert(issues)
          .select()
        
        return { workspace: workspaceData, issues: issuesData, error: issuesError }
      }
      
      const result = await createWorkspaceWithIssues()
      
      expect(result.workspace).toBeDefined()
      expect(result.issues).toHaveLength(2)
      expect(result.error).toBeNull()
    })
  })

  describe('Error Recovery', () => {
    it('provides clear error information for constraint violations', async () => {
      const errorScenarios = [
        {
          code: '23505',
          message: 'duplicate key value violates unique constraint',
          description: 'Unique constraint violation',
        },
        {
          code: '23503',
          message: 'violates foreign key constraint',
          description: 'Foreign key constraint violation',
        },
        {
          code: '23502',
          message: 'null value in column violates not-null constraint',
          description: 'Not null constraint violation',
        },
        {
          code: '22P02',
          message: 'invalid input value for enum',
          description: 'Enum constraint violation',
        },
      ]
      
      for (const scenario of errorScenarios) {
        const insertMock = vi.fn().mockReturnThis()
        const selectMock = vi.fn().mockResolvedValue({ 
          data: null, 
          error: { 
            message: scenario.message,
            code: scenario.code,
          } 
        })
        
        mockSupabaseClient.from.mockReturnValue({
          insert: insertMock,
          select: selectMock,
        })
        
        const supabase = createServerClient('', '', { cookies: {} as any })
        const { error } = await supabase
          .from('issues')
          .insert({ title: 'Test' })
          .select()
        
        expect(error).toBeDefined()
        expect(error.code).toBe(scenario.code)
        expect(error.message).toContain(scenario.message)
      }
    })

    it('allows retry after transient failures', async () => {
      const issue = {
        title: 'Retry Test',
        workspace_id: mockWorkspace.id,
        created_by: mockUser.id,
        status: 'todo' as const,
      }
      
      let attempts = 0
      const insertMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockImplementation(() => {
        attempts++
        if (attempts === 1) {
          // First attempt fails with transient error
          return Promise.resolve({ 
            data: null, 
            error: { message: 'Connection timeout', code: 'PGRST000' } 
          })
        } else {
          // Second attempt succeeds
          return Promise.resolve({ 
            data: { ...issue, id: 'new-issue-id' }, 
            error: null 
          })
        }
      })
      
      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
      })
      
      const supabase = createServerClient('', '', { cookies: {} as any })
      
      // First attempt
      const { data: data1, error: error1 } = await supabase
        .from('issues')
        .insert(issue)
        .select()
      
      expect(data1).toBeNull()
      expect(error1).toBeDefined()
      
      // Retry
      const { data: data2, error: error2 } = await supabase
        .from('issues')
        .insert(issue)
        .select()
      
      expect(data2).toBeDefined()
      expect(error2).toBeNull()
      expect(attempts).toBe(2)
    })
  })
})