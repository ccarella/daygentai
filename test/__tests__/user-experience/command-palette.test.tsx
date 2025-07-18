import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommandPalette } from '@/components/command-palette/command-palette'
import { CommandPaletteProvider, useCommandPalette } from '@/hooks/use-command-palette'
import { useRouter } from 'next/navigation'

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
      expect(screen.getByText('Create New Issue')).toBeInTheDocument()
      
      // Search
      const searchInput = screen.getByPlaceholderText('Type a command or search...')
      await user.type(searchInput, 'inbox')
      
      // Only inbox command visible
      expect(screen.queryByText('Go to Issues')).not.toBeInTheDocument()
      expect(screen.getByText('Go to Inbox')).toBeInTheDocument()
      expect(screen.queryByText('Create New Issue')).not.toBeInTheDocument()
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
      
      // First item selected by default
      const firstCommand = screen.getByText('Go to Issues').parentElement!
      expect(firstCommand).toHaveClass('bg-accent')
      
      // Arrow down
      await user.keyboard('{ArrowDown}')
      const secondCommand = screen.getByText('Go to Inbox').parentElement!
      expect(secondCommand).toHaveClass('bg-accent')
      expect(firstCommand).not.toHaveClass('bg-accent')
      
      // Arrow up
      await user.keyboard('{ArrowUp}')
      expect(firstCommand).toHaveClass('bg-accent')
      expect(secondCommand).not.toHaveClass('bg-accent')
    })

    it('executes command on Enter', async () => {
      render(<CommandPaletteTestWrapper />)
      
      await user.click(screen.getByText('Open Command Palette'))
      
      // Press Enter on first command
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/test-workspace')
      })
    })
  })

  describe('Command Groups', () => {
    it('displays command groups', async () => {
      render(<CommandPaletteTestWrapper />)
      
      await user.click(screen.getByText('Open Command Palette'))
      
      expect(screen.getByText('Navigation')).toBeInTheDocument()
      expect(screen.getByText('Create')).toBeInTheDocument()
      expect(screen.getByText('View')).toBeInTheDocument()
    })

    it('displays shortcuts', async () => {
      render(<CommandPaletteTestWrapper />)
      
      await user.click(screen.getByText('Open Command Palette'))
      
      expect(screen.getByText('G then I')).toBeInTheDocument()
      expect(screen.getByText('C')).toBeInTheDocument()
      expect(screen.getByText('⌘B')).toBeInTheDocument()
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
      
      // Navigate to Create New Issue and execute (it's the 4th item, so 3 arrow downs)
      await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}')
      
      await waitFor(() => {
        expect(onCreateIssue).toHaveBeenCalled()
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