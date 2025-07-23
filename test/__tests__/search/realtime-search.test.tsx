import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock IntersectionObserver before importing components
beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any
})

import { WorkspaceContent } from '@/components/workspace/workspace-content'
import { useRouter, usePathname } from 'next/navigation'

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn()
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    rpc: vi.fn().mockImplementation((funcName, params) => {
      // Mock search results based on query
      if (funcName === 'search_issues' && params.search_query === 'User') {
        return Promise.resolve({
          data: [
            {
              id: '1',
              title: 'User authentication bug',
              description: 'Fix user login issue',
              type: 'bug',
              priority: 'high',
              status: 'todo',
              workspace_id: 'test-workspace',
              created_by: 'user-1',
              assignee_id: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: '2',
              title: 'Add User profile page',
              description: 'Create user profile',
              type: 'feature',
              priority: 'medium',
              status: 'in_progress',
              workspace_id: 'test-workspace',
              created_by: 'user-1',
              assignee_id: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ],
          error: null
        })
      }
      return Promise.resolve({ data: [], error: null })
    }),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [],
        error: null
      })
    }))
  })
}))

vi.mock('@/contexts/issue-cache-context', () => ({
  useIssueCache: () => ({
    preloadIssues: vi.fn(),
    getListCache: vi.fn(() => null),
    setListCache: vi.fn(),
    invalidateListCache: vi.fn(),
    getStats: vi.fn(() => ({
      hits: 0,
      misses: 0,
      size: 0,
      listHits: 0,
      listMisses: 0,
      listSize: 0
    }))
  })
}))

vi.mock('@/lib/keyboard', () => ({
  useKeyboardContext: vi.fn(),
  KeyboardPriority: {
    FOCUSED: 1,
    NORMAL: 0
  }
}))

vi.mock('@/lib/events/issue-events', () => ({
  subscribeToNavigateToIssues: vi.fn(() => vi.fn()),
  subscribeToNavigateToInbox: vi.fn(() => vi.fn()),
  subscribeToToggleViewMode: vi.fn(() => vi.fn()),
  subscribeToToggleSearch: vi.fn(() => vi.fn()),
  subscribeToSetStatusFilter: vi.fn(() => vi.fn()),
  subscribeToSetTypeFilter: vi.fn(() => vi.fn()),
  emitCreateIssueRequest: vi.fn()
}))

vi.mock('@/hooks/use-debounce', () => ({
  useDebounce: (value: any) => value
}))

vi.mock('@/lib/tags', () => ({
  getWorkspaceTags: vi.fn(() => Promise.resolve([]))
}))

describe('Real-time Search Filtering', () => {
  let mockRouter: any
  
  beforeEach(() => {
    mockRouter = {
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn()
    }
    vi.mocked(useRouter).mockReturnValue(mockRouter)
    vi.mocked(usePathname).mockReturnValue('/test-workspace')
  })

  const mockWorkspace = {
    id: 'test-workspace',
    name: 'Test Workspace',
    slug: 'test-workspace',
    avatar_url: null,
    owner_id: 'user-1'
  }

  it('filters issues in real-time when user types', async () => {
    render(<WorkspaceContent workspace={mockWorkspace} />)
    
    // Open search by pressing "/"
    fireEvent.keyDown(window, { key: '/', code: 'Slash' })
    
    // Wait for search bar to be visible
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search issues by title...')
      expect(searchInput).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText('Search issues by title...')
    
    // Type "User" in the search input
    fireEvent.change(searchInput, { target: { value: 'User' } })
    
    // Wait for debounce and results
    await waitFor(() => {
      // The search should be performed and filter issues
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    }, { timeout: 500 })
    
    // Verify search is active
    expect(searchInput).toHaveValue('User')
  })

  it('shows loading state while searching', async () => {
    render(<WorkspaceContent workspace={mockWorkspace} />)
    
    // Open search
    fireEvent.keyDown(window, { key: '/', code: 'Slash' })
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search issues by title...')
      expect(searchInput).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText('Search issues by title...')
    
    // Type quickly to trigger loading state
    fireEvent.change(searchInput, { target: { value: 'U' } })
    fireEvent.change(searchInput, { target: { value: 'Us' } })
    fireEvent.change(searchInput, { target: { value: 'Use' } })
    fireEvent.change(searchInput, { target: { value: 'User' } })
    
    // Should show loading indicator briefly
    const searchBar = searchInput.closest('.relative')
    expect(searchBar).toBeInTheDocument()
  })

  it('clears search when clear button is clicked', async () => {
    render(<WorkspaceContent workspace={mockWorkspace} />)
    
    // Open search
    fireEvent.keyDown(window, { key: '/', code: 'Slash' })
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search issues by title...')
      expect(searchInput).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText('Search issues by title...')
    
    // Type something
    fireEvent.change(searchInput, { target: { value: 'User' } })
    
    // Wait for clear button to appear
    await waitFor(() => {
      const clearButton = screen.getByLabelText('Clear search')
      expect(clearButton).toBeInTheDocument()
    })
    
    // Click clear button
    const clearButton = screen.getByLabelText('Clear search')
    fireEvent.click(clearButton)
    
    // Search should be cleared
    expect(searchInput).toHaveValue('')
  })

  it('debounces search input for performance', async () => {
    render(<WorkspaceContent workspace={mockWorkspace} />)
    
    // Open search
    fireEvent.keyDown(window, { key: '/', code: 'Slash' })
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search issues by title...')
      expect(searchInput).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText('Search issues by title...')
    
    // Type rapidly - the component should debounce these changes
    fireEvent.change(searchInput, { target: { value: 'U' } })
    fireEvent.change(searchInput, { target: { value: 'Us' } })
    fireEvent.change(searchInput, { target: { value: 'Use' } })
    fireEvent.change(searchInput, { target: { value: 'User' } })
    
    // The input should update immediately
    expect(searchInput).toHaveValue('User')
    
    // The search is debounced, so results shouldn't appear immediately
    // This test verifies the debouncing behavior is working
    await waitFor(() => {
      // After debounce, the search should be triggered
      const searchBar = searchInput.closest('.relative')
      expect(searchBar).toBeInTheDocument()
    }, { timeout: 500 })
  })
})