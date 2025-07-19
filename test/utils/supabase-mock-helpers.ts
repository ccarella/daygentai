import { vi } from 'vitest'

/**
 * Creates a mock query builder that supports chained .eq() calls
 * This is needed because our workspace queries now use multiple .eq() calls
 * for checking workspace membership
 */
export function createMockQueryBuilder(resolvedData: any, error: any = null) {
  const mockQuery: any = {
    single: vi.fn().mockResolvedValue({
      data: resolvedData,
      error
    })
  }
  
  // Support chained .eq() calls
  mockQuery.eq = vi.fn(() => mockQuery)
  
  return mockQuery
}

/**
 * Creates a mock Supabase client with common methods
 */
export function createMockSupabaseClient(overrides: any = {}) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      }),
      ...overrides.auth
    },
    from: vi.fn(),
    ...overrides
  }
}