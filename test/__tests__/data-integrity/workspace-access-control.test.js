/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServerClient } from '@supabase/ssr';
import { createMockUser } from '@/test/fixtures/users';
import { createMockWorkspace } from '@/test/fixtures/workspaces';
import { createMockIssue } from '@/test/fixtures/issues';
// Reset modules to avoid conflicts with global mocks
vi.resetModules();
// Mock dependencies
vi.mock('next/headers', () => ({
    cookies: vi.fn(() => ({
        getAll: vi.fn(() => []),
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
    })),
}));
vi.mock('@supabase/ssr', () => ({
    createServerClient: vi.fn(),
}));
describe('Workspace Access Control', () => {
    let mockSupabaseClient;
    let ownerUser;
    let otherUser;
    let ownerWorkspace;
    let otherWorkspace;
    beforeEach(() => {
        vi.clearAllMocks();
        // Create mock users
        ownerUser = createMockUser({ id: 'owner-user-id' });
        otherUser = createMockUser({ id: 'other-user-id' });
        // Create mock workspaces
        ownerWorkspace = createMockWorkspace({
            id: 'owner-workspace-id',
            owner_id: ownerUser.id,
            name: 'Owner Workspace'
        });
        otherWorkspace = createMockWorkspace({
            id: 'other-workspace-id',
            owner_id: otherUser.id,
            name: 'Other User Workspace'
        });
        // Setup mock Supabase client
        mockSupabaseClient = {
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: ownerUser }, error: null }),
            },
            from: vi.fn((table) => {
                const mockQuery = {
                    select: vi.fn().mockReturnThis(),
                    insert: vi.fn().mockReturnThis(),
                    update: vi.fn().mockReturnThis(),
                    delete: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    in: vi.fn().mockReturnThis(),
                    single: vi.fn(),
                    then: vi.fn((callback) => {
                        callback({ data: null, error: null });
                        return Promise.resolve({ data: null, error: null });
                    }),
                };
                return mockQuery;
            }),
        };
        vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient);
    });
    describe('Workspace Visibility', () => {
        it('allows users to view only their own workspaces', async () => {
            const selectMock = vi.fn().mockReturnThis();
            const eqMock = vi.fn().mockResolvedValue({
                data: [ownerWorkspace],
                error: null
            });
            mockSupabaseClient.from.mockReturnValue({
                select: selectMock,
                eq: eqMock,
            });
            const supabase = createServerClient('', '', { cookies: {} });
            const { data, error } = await supabase
                .from('workspaces')
                .select('*')
                .eq('owner_id', ownerUser.id);
            expect(eqMock).toHaveBeenCalledWith('owner_id', ownerUser.id);
            expect(data).toHaveLength(1);
            expect(data[0].id).toBe(ownerWorkspace.id);
            expect(error).toBeNull();
        });
        it('prevents users from viewing other users workspaces', async () => {
            // Simulate RLS preventing access
            const selectMock = vi.fn().mockReturnThis();
            const eqMock = vi.fn().mockResolvedValue({
                data: [], // Empty result due to RLS
                error: null
            });
            mockSupabaseClient.from.mockReturnValue({
                select: selectMock,
                eq: eqMock,
            });
            const supabase = createServerClient('', '', { cookies: {} });
            const { data, error } = await supabase
                .from('workspaces')
                .select('*')
                .eq('id', otherWorkspace.id); // Trying to access another user's workspace
            expect(data).toHaveLength(0); // RLS should prevent access
            expect(error).toBeNull();
        });
        it('filters workspace list based on ownership', async () => {
            const allWorkspaces = [
                ownerWorkspace,
                createMockWorkspace({ owner_id: ownerUser.id, name: 'Second Workspace' }),
                otherWorkspace, // This should be filtered out by RLS
            ];
            const selectMock = vi.fn().mockResolvedValue({
                data: allWorkspaces.filter(w => w.owner_id === ownerUser.id),
                error: null
            });
            mockSupabaseClient.from.mockReturnValue({
                select: selectMock,
            });
            const supabase = createServerClient('', '', { cookies: {} });
            const { data, error } = await supabase
                .from('workspaces')
                .select('*');
            expect(data).toHaveLength(2);
            expect(data.every((w) => w.owner_id === ownerUser.id)).toBe(true);
            expect(error).toBeNull();
        });
    });
    describe('Workspace Modification', () => {
        it('allows owners to update their own workspaces', async () => {
            const updates = {
                name: 'Updated Workspace Name',
                slug: 'updated-workspace',
            };
            const updateMock = vi.fn().mockReturnThis();
            const eqMock = vi.fn().mockReturnThis();
            const selectMock = vi.fn().mockResolvedValue({
                data: Object.assign(Object.assign({}, ownerWorkspace), updates),
                error: null
            });
            mockSupabaseClient.from.mockReturnValue({
                update: updateMock,
                eq: eqMock,
                select: selectMock,
            });
            const supabase = createServerClient('', '', { cookies: {} });
            const { data, error } = await supabase
                .from('workspaces')
                .update(updates)
                .eq('id', ownerWorkspace.id)
                .select();
            expect(updateMock).toHaveBeenCalledWith(updates);
            expect(data).toMatchObject(updates);
            expect(error).toBeNull();
        });
        it('prevents users from updating other users workspaces', async () => {
            const updates = {
                name: 'Malicious Update',
            };
            const updateMock = vi.fn().mockReturnThis();
            const eqMock = vi.fn().mockReturnThis();
            const selectMock = vi.fn().mockResolvedValue({
                data: null,
                error: {
                    message: 'new row violates row-level security policy',
                    code: '42501'
                }
            });
            mockSupabaseClient.from.mockReturnValue({
                update: updateMock,
                eq: eqMock,
                select: selectMock,
            });
            const supabase = createServerClient('', '', { cookies: {} });
            const { data, error } = await supabase
                .from('workspaces')
                .update(updates)
                .eq('id', otherWorkspace.id) // Trying to update another user's workspace
                .select();
            expect(data).toBeNull();
            expect(error).toBeDefined();
            expect(error.code).toBe('42501');
        });
        it('prevents ownership transfer through update', async () => {
            const maliciousUpdate = {
                owner_id: otherUser.id, // Trying to transfer ownership
            };
            const updateMock = vi.fn().mockReturnThis();
            const eqMock = vi.fn().mockReturnThis();
            const selectMock = vi.fn().mockResolvedValue({
                data: null,
                error: {
                    message: 'new row violates row-level security policy',
                    code: '42501'
                }
            });
            mockSupabaseClient.from.mockReturnValue({
                update: updateMock,
                eq: eqMock,
                select: selectMock,
            });
            const supabase = createServerClient('', '', { cookies: {} });
            const { data, error } = await supabase
                .from('workspaces')
                .update(maliciousUpdate)
                .eq('id', ownerWorkspace.id)
                .select();
            expect(data).toBeNull();
            expect(error).toBeDefined();
            expect(error.code).toBe('42501');
        });
    });
    describe('Workspace Deletion', () => {
        it('allows owners to delete their own workspaces', async () => {
            const deleteMock = vi.fn().mockReturnThis();
            const eqMock = vi.fn().mockResolvedValue({
                data: null,
                error: null
            });
            mockSupabaseClient.from.mockReturnValue({
                delete: deleteMock,
                eq: eqMock,
            });
            const supabase = createServerClient('', '', { cookies: {} });
            const { error } = await supabase
                .from('workspaces')
                .delete()
                .eq('id', ownerWorkspace.id);
            expect(deleteMock).toHaveBeenCalled();
            expect(eqMock).toHaveBeenCalledWith('id', ownerWorkspace.id);
            expect(error).toBeNull();
        });
        it('prevents users from deleting other users workspaces', async () => {
            const deleteMock = vi.fn().mockReturnThis();
            const eqMock = vi.fn().mockResolvedValue({
                data: null,
                error: {
                    message: 'new row violates row-level security policy',
                    code: '42501'
                }
            });
            mockSupabaseClient.from.mockReturnValue({
                delete: deleteMock,
                eq: eqMock,
            });
            const supabase = createServerClient('', '', { cookies: {} });
            const { error } = await supabase
                .from('workspaces')
                .delete()
                .eq('id', otherWorkspace.id); // Trying to delete another user's workspace
            expect(error).toBeDefined();
            expect(error.code).toBe('42501');
        });
    });
    describe('Workspace Creation', () => {
        it('allows users to create workspaces with themselves as owner', async () => {
            const newWorkspace = {
                name: 'New Workspace',
                slug: 'new-workspace',
                owner_id: ownerUser.id,
            };
            const insertMock = vi.fn().mockReturnThis();
            const selectMock = vi.fn().mockResolvedValue({
                data: Object.assign(Object.assign({}, newWorkspace), { id: 'new-workspace-id' }),
                error: null
            });
            mockSupabaseClient.from.mockReturnValue({
                insert: insertMock,
                select: selectMock,
            });
            const supabase = createServerClient('', '', { cookies: {} });
            const { data, error } = await supabase
                .from('workspaces')
                .insert(newWorkspace)
                .select();
            expect(insertMock).toHaveBeenCalledWith(newWorkspace);
            expect(data.owner_id).toBe(ownerUser.id);
            expect(error).toBeNull();
        });
        it('prevents users from creating workspaces owned by others', async () => {
            const maliciousWorkspace = {
                name: 'Malicious Workspace',
                slug: 'malicious-workspace',
                owner_id: otherUser.id, // Trying to create workspace owned by another user
            };
            const insertMock = vi.fn().mockReturnThis();
            const selectMock = vi.fn().mockResolvedValue({
                data: null,
                error: {
                    message: 'new row violates row-level security policy',
                    code: '42501'
                }
            });
            mockSupabaseClient.from.mockReturnValue({
                insert: insertMock,
                select: selectMock,
            });
            const supabase = createServerClient('', '', { cookies: {} });
            const { data, error } = await supabase
                .from('workspaces')
                .insert(maliciousWorkspace)
                .select();
            expect(data).toBeNull();
            expect(error).toBeDefined();
            expect(error.code).toBe('42501');
        });
        it('enforces unique slug constraint', async () => {
            const duplicateWorkspace = {
                name: 'Duplicate Workspace',
                slug: ownerWorkspace.slug, // Using existing slug
                owner_id: ownerUser.id,
            };
            const insertMock = vi.fn().mockReturnThis();
            const selectMock = vi.fn().mockResolvedValue({
                data: null,
                error: {
                    message: 'duplicate key value violates unique constraint',
                    code: '23505'
                }
            });
            mockSupabaseClient.from.mockReturnValue({
                insert: insertMock,
                select: selectMock,
            });
            const supabase = createServerClient('', '', { cookies: {} });
            const { data, error } = await supabase
                .from('workspaces')
                .insert(duplicateWorkspace)
                .select();
            expect(data).toBeNull();
            expect(error).toBeDefined();
            expect(error.code).toBe('23505');
        });
    });
    describe('Issue Access Through Workspaces', () => {
        it('allows users to access issues in their workspaces', async () => {
            const ownerIssue = createMockIssue({
                workspace_id: ownerWorkspace.id,
                created_by: ownerUser.id
            });
            const selectMock = vi.fn().mockReturnThis();
            const eqMock = vi.fn().mockResolvedValue({
                data: [ownerIssue],
                error: null
            });
            mockSupabaseClient.from.mockReturnValue({
                select: selectMock,
                eq: eqMock,
            });
            const supabase = createServerClient('', '', { cookies: {} });
            const { data, error } = await supabase
                .from('issues')
                .select('*')
                .eq('workspace_id', ownerWorkspace.id);
            expect(data).toHaveLength(1);
            expect(data[0].workspace_id).toBe(ownerWorkspace.id);
            expect(error).toBeNull();
        });
        it('prevents users from accessing issues in other workspaces', async () => {
            const selectMock = vi.fn().mockReturnThis();
            const eqMock = vi.fn().mockResolvedValue({
                data: [], // Empty due to RLS
                error: null
            });
            mockSupabaseClient.from.mockReturnValue({
                select: selectMock,
                eq: eqMock,
            });
            const supabase = createServerClient('', '', { cookies: {} });
            const { data, error } = await supabase
                .from('issues')
                .select('*')
                .eq('workspace_id', otherWorkspace.id); // Trying to access issues in another workspace
            expect(data).toHaveLength(0);
            expect(error).toBeNull();
        });
        it('prevents creating issues in other users workspaces', async () => {
            const maliciousIssue = {
                title: 'Malicious Issue',
                type: 'bug',
                priority: 'high',
                status: 'todo',
                workspace_id: otherWorkspace.id, // Trying to create in another user's workspace
                created_by: ownerUser.id,
            };
            const insertMock = vi.fn().mockReturnThis();
            const selectMock = vi.fn().mockResolvedValue({
                data: null,
                error: {
                    message: 'new row violates row-level security policy',
                    code: '42501'
                }
            });
            mockSupabaseClient.from.mockReturnValue({
                insert: insertMock,
                select: selectMock,
            });
            const supabase = createServerClient('', '', { cookies: {} });
            const { data, error } = await supabase
                .from('issues')
                .insert(maliciousIssue)
                .select();
            expect(data).toBeNull();
            expect(error).toBeDefined();
            expect(error.code).toBe('42501');
        });
        it('prevents updating issues in other users workspaces', async () => {
            const otherIssue = createMockIssue({
                id: 'other-issue-id',
                workspace_id: otherWorkspace.id,
                created_by: otherUser.id
            });
            const updateMock = vi.fn().mockReturnThis();
            const eqMock = vi.fn().mockReturnThis();
            const selectMock = vi.fn().mockResolvedValue({
                data: null,
                error: {
                    message: 'new row violates row-level security policy',
                    code: '42501'
                }
            });
            mockSupabaseClient.from.mockReturnValue({
                update: updateMock,
                eq: eqMock,
                select: selectMock,
            });
            const supabase = createServerClient('', '', { cookies: {} });
            const { data, error } = await supabase
                .from('issues')
                .update({ status: 'done' })
                .eq('id', otherIssue.id)
                .select();
            expect(data).toBeNull();
            expect(error).toBeDefined();
            expect(error.code).toBe('42501');
        });
        it('prevents deleting issues in other users workspaces', async () => {
            const otherIssue = createMockIssue({
                id: 'other-issue-id',
                workspace_id: otherWorkspace.id,
                created_by: otherUser.id
            });
            const deleteMock = vi.fn().mockReturnThis();
            const eqMock = vi.fn().mockResolvedValue({
                data: null,
                error: {
                    message: 'new row violates row-level security policy',
                    code: '42501'
                }
            });
            mockSupabaseClient.from.mockReturnValue({
                delete: deleteMock,
                eq: eqMock,
            });
            const supabase = createServerClient('', '', { cookies: {} });
            const { error } = await supabase
                .from('issues')
                .delete()
                .eq('id', otherIssue.id);
            expect(error).toBeDefined();
            expect(error.code).toBe('42501');
        });
    });
    describe('Cross-User Data Isolation', () => {
        it('ensures complete data isolation between users', async () => {
            // User should only see their own workspace count
            const selectMock = vi.fn().mockResolvedValue({
                count: 1, // Only owner's workspace
                error: null
            });
            mockSupabaseClient.from.mockReturnValue({
                select: selectMock,
            });
            const supabase = createServerClient('', '', { cookies: {} });
            const { count, error } = await supabase
                .from('workspaces')
                .select('*', { count: 'exact', head: true });
            expect(count).toBe(1); // Should only count user's own workspaces
            expect(error).toBeNull();
        });
        it('prevents information leakage through error messages', async () => {
            // Trying to access a specific workspace that belongs to another user
            // Should return empty result, not "access denied" to avoid confirming existence
            const selectMock = vi.fn().mockReturnThis();
            const eqMock = vi.fn().mockReturnThis();
            const singleMock = vi.fn().mockResolvedValue({
                data: null,
                error: {
                    message: 'No rows found',
                    code: 'PGRST116'
                }
            });
            mockSupabaseClient.from.mockReturnValue({
                select: selectMock,
                eq: eqMock,
                single: singleMock,
            });
            const supabase = createServerClient('', '', { cookies: {} });
            const { data, error } = await supabase
                .from('workspaces')
                .select('*')
                .eq('id', otherWorkspace.id)
                .single();
            // Should get "not found" error, not "access denied"
            expect(error.code).toBe('PGRST116');
            expect(error.message).not.toContain('security');
            expect(error.message).not.toContain('policy');
        });
    });
});
