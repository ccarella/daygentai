import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SearchBar } from '@/components/workspace/search-bar'

// Mock dependencies
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    rpc: vi.fn().mockResolvedValue({
      data: [
        {
          id: '1',
          title: 'Test Issue 1',
          description: 'Description 1',
          type: 'feature',
          priority: 'medium',
          status: 'todo',
          workspace_id: 'workspace-1',
          created_by: 'user-1',
          assignee_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          generated_prompt: null
        },
        {
          id: '2',
          title: 'Bug Test Issue',
          description: 'Bug description',
          type: 'bug',
          priority: 'high',
          status: 'in_progress',
          workspace_id: 'workspace-1',
          created_by: 'user-1',
          assignee_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          generated_prompt: null
        }
      ],
      error: null
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

describe('Search Integration', () => {
  let mockOnSearch: ReturnType<typeof vi.fn>
  let mockOnEscape: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnSearch = vi.fn()
    mockOnEscape = vi.fn()
  })

  it('renders search bar correctly', () => {
    render(
      <SearchBar
        onSearch={mockOnSearch}
        placeholder="Search issues..."
        onEscape={mockOnEscape}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search issues...')
    expect(searchInput).toBeInTheDocument()
  })

  it('calls onSearch when user types', async () => {
    render(
      <SearchBar
        onSearch={mockOnSearch}
        placeholder="Search issues..."
        onEscape={mockOnEscape}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search issues...')
    fireEvent.change(searchInput, { target: { value: 'test' } })

    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('test')
    })
  })

  it('calls onEscape when Escape key is pressed', async () => {
    render(
      <SearchBar
        onSearch={mockOnSearch}
        placeholder="Search issues..."
        onEscape={mockOnEscape}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search issues...')
    fireEvent.keyDown(searchInput, { key: 'Escape' })

    await waitFor(() => {
      expect(mockOnEscape).toHaveBeenCalled()
    })
  })

  it('clears search input when Escape is pressed with text', async () => {
    render(
      <SearchBar
        onSearch={mockOnSearch}
        placeholder="Search issues..."
        onEscape={mockOnEscape}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search issues...') as HTMLInputElement
    
    // Type something
    fireEvent.change(searchInput, { target: { value: 'test query' } })
    expect(searchInput.value).toBe('test query')
    
    // Press Escape - when there's text, it clears the input
    fireEvent.keyDown(searchInput, { key: 'Escape' })
    
    await waitFor(() => {
      // The value should be cleared
      expect(searchInput.value).toBe('')
      expect(mockOnSearch).toHaveBeenCalledWith('')
      // onEscape should NOT be called when there's text (it just clears)
      expect(mockOnEscape).not.toHaveBeenCalled()
    })
  })
  
  it('calls onEscape when Escape is pressed with empty input', async () => {
    render(
      <SearchBar
        onSearch={mockOnSearch}
        placeholder="Search issues..."
        onEscape={mockOnEscape}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search issues...') as HTMLInputElement
    
    // Make sure input is empty
    expect(searchInput.value).toBe('')
    
    // Press Escape with empty input
    fireEvent.keyDown(searchInput, { key: 'Escape' })
    
    await waitFor(() => {
      // onEscape should be called when input is already empty
      expect(mockOnEscape).toHaveBeenCalled()
    })
  })
})