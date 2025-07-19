import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommandPalette } from '@/components/command-palette/command-palette'
import { CommandPaletteProvider, useCommandPalette } from '@/hooks/use-command-palette'
import { useRouter } from 'next/navigation'

// Mock ResizeObserver before component imports
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
})

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

// Helper component to test hook
function CommandPaletteTestWrapper({ 
  workspaceSlug = 'test-workspace',
  workspaceId = 'test-workspace-id',
  onCreateIssue = vi.fn(),
  onToggleViewMode = vi.fn(),
  onToggleSearch = vi.fn(),
}: {
  workspaceSlug?: string
  workspaceId?: string
  onCreateIssue?: () => void
  onToggleViewMode?: () => void
  onToggleSearch?: () => void
}) {
  return (
    <CommandPaletteProvider>
      <CommandPalette 
        workspaceSlug={workspaceSlug}
        workspaceId={workspaceId}
        onCreateIssue={onCreateIssue}
        onToggleViewMode={onToggleViewMode}
        onToggleSearch={onToggleSearch}
      />
      <OpenCommandPaletteButton />
    </CommandPaletteProvider>
  )
}

// Helper component to open command palette
function OpenCommandPaletteButton() {
  const { setIsOpen, openWithMode } = useCommandPalette()
  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Command Palette</button>
      <button onClick={() => openWithMode('help')}>Open Help Mode</button>
    </>
  )
}

describe('Command Palette (Simplified)', () => {
  let mockRouter: any
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    mockRouter = {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    }
    vi.mocked(useRouter).mockReturnValue(mockRouter)
  })

  describe('Core Functionality', () => {
    it('opens and closes correctly', async () => {
      render(<CommandPaletteTestWrapper />)
      
      // Initially closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      
      // Open
      await user.click(screen.getByText('Open Command Palette'))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      
      // Close with Escape
      await user.keyboard('{Escape}')
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('supports keyboard shortcuts to open', async () => {
      render(<CommandPaletteTestWrapper />)
      
      // Cmd+K
      await user.keyboard('{Meta>}k{/Meta}')
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      
      // Close
      await user.keyboard('{Escape}')
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      
      // Ctrl+K
      await user.keyboard('{Control>}k{/Control}')
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('focuses search input when opened', async () => {
      render(<CommandPaletteTestWrapper />)
      
      await user.click(screen.getByText('Open Command Palette'))
      
      const searchInput = screen.getByPlaceholderText('Type a command or search...')
      expect(document.activeElement).toBe(searchInput)
    })
  })

  describe('Search and Filter', () => {
    it('filters commands by search text', async () => {
      render(<CommandPaletteTestWrapper />)
      
      await user.click(screen.getByText('Open Command Palette'))
      
      // All commands visible initially
      expect(screen.getByText('Go to Issues')).toBeInTheDocument()
      expect(screen.getByText('Go to Inbox')).toBeInTheDocument()
      expect(screen.getByText('New Issue')).toBeInTheDocument()
      
      // Search
      const searchInput = screen.getByPlaceholderText('Type a command or search...')
      await user.type(searchInput, 'inbox')
      
      // Only inbox command visible
      expect(screen.queryByText('Go to Issues')).not.toBeInTheDocument()
      expect(screen.getByText('Go to Inbox')).toBeInTheDocument()
      expect(screen.queryByText('New Issue')).not.toBeInTheDocument()
    })

    it('shows no results message', async () => {
      render(<CommandPaletteTestWrapper />)
      
      await user.click(screen.getByText('Open Command Palette'))
      
      const searchInput = screen.getByPlaceholderText('Type a command or search...')
      await user.type(searchInput, 'nonexistent')
      
      expect(screen.getByText('No results found.')).toBeInTheDocument()
    })

    it('searches case-insensitively', async () => {
      render(<CommandPaletteTestWrapper />)
      
      await user.click(screen.getByText('Open Command Palette'))
      
      const searchInput = screen.getByPlaceholderText('Type a command or search...')
      await user.type(searchInput, 'ISSUES')
      
      expect(screen.getByText('Go to Issues')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('navigates with arrow keys', async () => {
      render(<CommandPaletteTestWrapper />)
      
      await user.click(screen.getByText('Open Command Palette'))
      
      // Wait for commands to be visible
      await waitFor(() => {
        expect(screen.getByText('New Issue')).toBeInTheDocument()
        expect(screen.getByText('Go to Issues')).toBeInTheDocument()
      })
      
      // Get command items by their unique data-command-id attributes
      const newIssueItem = screen.getByText('New Issue').closest('div[data-command-id]')
      
      // First item should be selected by default (has bg-accent class)
      expect(newIssueItem).toHaveClass('bg-accent')
      
      // Arrow down to next item
      await user.keyboard('{ArrowDown}')
      
      // Wait for the selection to change
      await waitFor(() => {
        expect(newIssueItem).not.toHaveClass('bg-accent')
        // Find the next item which should now be selected
        const selectedItems = document.querySelectorAll('.bg-accent')
        expect(selectedItems.length).toBe(1)
      })
      
      // Arrow up back to first item
      await user.keyboard('{ArrowUp}')
      
      // First item should be selected again
      await waitFor(() => {
        expect(newIssueItem).toHaveClass('bg-accent')
      })
    })

    it('executes command on Enter', async () => {
      const onCreateIssue = vi.fn()
      render(<CommandPaletteTestWrapper onCreateIssue={onCreateIssue} />)
      
      await user.click(screen.getByText('Open Command Palette'))
      
      // Wait for dialog to be fully rendered
      await waitFor(() => {
        expect(screen.getByText('New Issue')).toBeInTheDocument()
      })
      
      // The first command is "New Issue" - press Enter to execute it
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        // Should call the onCreateIssue callback
        expect(onCreateIssue).toHaveBeenCalled()
        // And close the dialog
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('Command Groups', () => {
    it('displays command groups', async () => {
      render(<CommandPaletteTestWrapper />)
      
      await user.click(screen.getByText('Open Command Palette'))
      
      expect(screen.getByText('Quick Access')).toBeInTheDocument()
      expect(screen.getByText('View')).toBeInTheDocument()
    })

    it('displays shortcuts', async () => {
      render(<CommandPaletteTestWrapper />)
      
      await user.click(screen.getByText('Open Command Palette'))
      
      expect(screen.getByText('G then I')).toBeInTheDocument()
      expect(screen.getByText('C')).toBeInTheDocument()
      // Platform-specific shortcut - will show Ctrl+B on non-Mac platforms
      try {
        expect(screen.getByText('⌘B')).toBeInTheDocument()
      } catch {
        expect(screen.getByText('Ctrl+B')).toBeInTheDocument()
      }
    })
  })

  describe('Help Mode', () => {
    it('opens help mode', async () => {
      render(<CommandPaletteTestWrapper />)
      
      await user.click(screen.getByText('Open Help Mode'))
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      // There are multiple headings with this text, so check for at least one
      const helpHeadings = screen.getAllByText('Keyboard Shortcuts & Help')
      expect(helpHeadings.length).toBeGreaterThan(0)
    })

    it('closes help mode with Escape', async () => {
      render(<CommandPaletteTestWrapper />)
      
      await user.click(screen.getByText('Open Help Mode'))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      
      await user.keyboard('{Escape}')
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('Callbacks', () => {
    it('calls onCreateIssue callback', async () => {
      const onCreateIssue = vi.fn()
      render(<CommandPaletteTestWrapper onCreateIssue={onCreateIssue} />)
      
      await user.click(screen.getByText('Open Command Palette'))
      
      // Wait for the command palette to be fully rendered
      await waitFor(() => {
        expect(screen.getByText('New Issue')).toBeInTheDocument()
      })
      
      // Find and click the 'New Issue' command
      const newIssueCommand = screen.getByText('New Issue')
      await user.click(newIssueCommand)
      
      await waitFor(() => {
        expect(onCreateIssue).toHaveBeenCalled()
        // Dialog should close after command execution
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('calls onToggleViewMode callback', async () => {
      const onToggleViewMode = vi.fn()
      render(<CommandPaletteTestWrapper onToggleViewMode={onToggleViewMode} />)
      
      await user.click(screen.getByText('Open Command Palette'))
      
      // Search for toggle command
      const searchInput = screen.getByPlaceholderText('Type a command or search...')
      await user.type(searchInput, 'toggle list')
      
      // Execute it
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(onToggleViewMode).toHaveBeenCalled()
      })
    })
  })

  describe('Performance', () => {
    it('handles rapid typing', async () => {
      render(<CommandPaletteTestWrapper />)
      
      await user.click(screen.getByText('Open Command Palette'))
      const searchInput = screen.getByPlaceholderText('Type a command or search...')
      
      // Type rapidly
      const startTime = performance.now()
      await user.type(searchInput, 'toggleissueinboxcreate')
      const endTime = performance.now()
      
      // Should be responsive (less than 1 second for all typing)
      expect(endTime - startTime).toBeLessThan(1000)
    })
  })
})