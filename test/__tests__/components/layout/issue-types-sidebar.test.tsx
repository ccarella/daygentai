import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IssueTypesSidebar } from '@/components/layout/issue-types-sidebar'

describe('IssueTypesSidebar', () => {
  const mockOnTypeFilterChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all issue types when expanded', () => {
    render(
      <IssueTypesSidebar 
        currentTypeFilter="all"
        onTypeFilterChange={mockOnTypeFilterChange}
        collapsed={false}
      />
    )

    // Check for the header
    expect(screen.getByText('Issue Types')).toBeInTheDocument()

    // Check for all types
    expect(screen.getByText('All Types')).toBeInTheDocument()
    expect(screen.getByText('Bug')).toBeInTheDocument()
    expect(screen.getByText('Feature')).toBeInTheDocument()
    expect(screen.getByText('Task')).toBeInTheDocument()
    expect(screen.getByText('Epic')).toBeInTheDocument()
    expect(screen.getByText('Spike')).toBeInTheDocument()
    expect(screen.getByText('Chore')).toBeInTheDocument()
    expect(screen.getByText('Design')).toBeInTheDocument()
    expect(screen.getByText('Non-technical')).toBeInTheDocument()
  })

  it('calls onTypeFilterChange when a type is clicked', () => {
    render(
      <IssueTypesSidebar 
        currentTypeFilter="all"
        onTypeFilterChange={mockOnTypeFilterChange}
        collapsed={false}
      />
    )

    fireEvent.click(screen.getByText('Bug'))
    expect(mockOnTypeFilterChange).toHaveBeenCalledWith('bug')

    fireEvent.click(screen.getByText('Feature'))
    expect(mockOnTypeFilterChange).toHaveBeenCalledWith('feature')

    fireEvent.click(screen.getByText('All Types'))
    expect(mockOnTypeFilterChange).toHaveBeenCalledWith('all')
  })

  it('highlights the currently selected type', () => {
    render(
      <IssueTypesSidebar 
        currentTypeFilter="bug"
        onTypeFilterChange={mockOnTypeFilterChange}
        collapsed={false}
      />
    )

    const bugButton = screen.getByText('Bug').closest('button')
    const featureButton = screen.getByText('Feature').closest('button')
    
    expect(bugButton).toHaveClass('bg-accent', 'text-foreground')
    expect(featureButton).toHaveClass('hover:bg-accent', 'text-muted-foreground')
  })

  it('can collapse and expand', () => {
    render(
      <IssueTypesSidebar 
        currentTypeFilter="all"
        onTypeFilterChange={mockOnTypeFilterChange}
        collapsed={false}
      />
    )

    // Initially expanded
    expect(screen.getByText('All Types')).toBeInTheDocument()

    // Click to collapse
    const toggleButton = screen.getByText('Issue Types')
    fireEvent.click(toggleButton)

    // Should be collapsed
    expect(screen.queryByText('All Types')).not.toBeInTheDocument()

    // Click to expand again
    fireEvent.click(toggleButton)

    // Should be expanded
    expect(screen.getByText('All Types')).toBeInTheDocument()
  })

  it('shows only icons when sidebar is collapsed', () => {
    render(
      <IssueTypesSidebar 
        currentTypeFilter="all"
        onTypeFilterChange={mockOnTypeFilterChange}
        collapsed={true}
      />
    )

    // Should not show text labels
    expect(screen.queryByText('Issue Types')).not.toBeInTheDocument()
    expect(screen.queryByText('All Types')).not.toBeInTheDocument()
    expect(screen.queryByText('Bug')).not.toBeInTheDocument()

    // Should still be clickable (test by clicking the container with the bug icon)
    const buttons = screen.getAllByRole('button')
    if (buttons[1]) {
      fireEvent.click(buttons[1]) // Bug is the second button after "All"
      expect(mockOnTypeFilterChange).toHaveBeenCalledWith('bug')
    }
  })
})