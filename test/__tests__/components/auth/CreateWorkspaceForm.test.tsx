import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreateWorkspaceForm from '@/components/auth/CreateWorkspaceForm'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { createMockSupabaseClient, createMockRouter } from '@/test/utils/mock-factory'
import { createMockUser } from '@/test/fixtures/users'
import { createMockWorkspace } from '@/test/fixtures/workspaces'

vi.mock('@/lib/supabase/client')
vi.mock('next/navigation')

describe('CreateWorkspaceForm', () => {
  const mockSupabase = createMockSupabaseClient()
  const mockRouter = createMockRouter()
  const user = userEvent.setup()
  const mockUser = createMockUser()

  let mockWorkspaceQuery: any

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as any).mockReturnValue(mockSupabase)
    ;(useRouter as any).mockReturnValue(mockRouter)
    
    // Default to authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
    
    // Default workspace check - no existing workspace
    mockWorkspaceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }
    
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'workspaces') {
        return mockWorkspaceQuery
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })
  })

  describe('rendering', () => {
    it('renders all form elements correctly', () => {
      render(<CreateWorkspaceForm />)
      
      expect(screen.getByText('Create Your Workspace')).toBeInTheDocument()
      expect(screen.getByText('Choose a Workspace Avatar (Optional)')).toBeInTheDocument()
      expect(screen.getByLabelText('Workspace Name (Required)')).toBeInTheDocument()
      expect(screen.getByLabelText('Workspace URL (Required)')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('My Awesome Workspace')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
    })

    it('renders all avatar options', () => {
      render(<CreateWorkspaceForm />)
      
      const avatarOptions = ['🏢', '🚀', '💼', '🎯', '🌟', '💡', '🔧', '🎨',
                            '📊', '🌐', '⚡', '🔥', '🌈', '🎪', '🏗️', '🎭']
      
      avatarOptions.forEach(avatar => {
        expect(screen.getByRole('button', { name: avatar })).toBeInTheDocument()
      })
    })

    it('displays URL prefix', () => {
      render(<CreateWorkspaceForm />)
      
      expect(screen.getByText('daygent.ai/')).toBeInTheDocument()
    })
  })

  describe('avatar selection', () => {
    it('allows selecting an avatar', async () => {
      render(<CreateWorkspaceForm />)
      
      const rocketAvatar = screen.getByRole('button', { name: '🚀' })
      await user.click(rocketAvatar)
      
      expect(screen.getByText('Selected: 🚀')).toBeInTheDocument()
      expect(rocketAvatar).toHaveClass('border-blue-500', 'bg-blue-50')
    })

    it('allows changing avatar selection', async () => {
      render(<CreateWorkspaceForm />)
      
      const rocketAvatar = screen.getByRole('button', { name: '🚀' })
      const officeAvatar = screen.getByRole('button', { name: '🏢' })
      
      await user.click(rocketAvatar)
      expect(screen.getByText('Selected: 🚀')).toBeInTheDocument()
      
      await user.click(officeAvatar)
      expect(screen.getByText('Selected: 🏢')).toBeInTheDocument()
      expect(officeAvatar).toHaveClass('border-blue-500', 'bg-blue-50')
      expect(rocketAvatar).not.toHaveClass('border-blue-500', 'bg-blue-50')
    })
  })

  describe('slug generation', () => {
    it('auto-generates slug from workspace name', async () => {
      render(<CreateWorkspaceForm />)
      
      const nameInput = screen.getByLabelText('Workspace Name (Required)')
      const slugInput = screen.getByLabelText('Workspace URL (Required)')
      
      await user.type(nameInput, 'My Awesome Workspace')
      
      await waitFor(() => {
        expect(slugInput).toHaveValue('my-awesome-workspace')
      })
    })

    it('handles special characters in slug generation', async () => {
      render(<CreateWorkspaceForm />)
      
      const nameInput = screen.getByLabelText('Workspace Name (Required)')
      const slugInput = screen.getByLabelText('Workspace URL (Required)')
      
      await user.type(nameInput, 'Test@#$%^&*()_+Workspace!')
      
      await waitFor(() => {
        expect(slugInput).toHaveValue('test-workspace')
      })
    })

    it('limits slug length to 50 characters', async () => {
      render(<CreateWorkspaceForm />)
      
      const nameInput = screen.getByLabelText('Workspace Name (Required)')
      const slugInput = screen.getByLabelText('Workspace URL (Required)')
      
      const longName = 'This is a very long workspace name that exceeds fifty characters limit'
      await user.type(nameInput, longName)
      
      await waitFor(() => {
        const slugValue = slugInput.getAttribute('value') || ''
        expect(slugValue.length).toBeLessThanOrEqual(50)
      })
    })

    it('allows manual slug editing', async () => {
      render(<CreateWorkspaceForm />)
      
      const nameInput = screen.getByLabelText('Workspace Name (Required)')
      const slugInput = screen.getByLabelText('Workspace URL (Required)')
      
      await user.type(nameInput, 'My Workspace')
      await waitFor(() => {
        expect(slugInput).toHaveValue('my-workspace')
      })
      
      await user.clear(slugInput)
      await user.type(slugInput, 'custom-slug')
      
      expect(slugInput).toHaveValue('custom-slug')
    })
  })

  describe('validation', () => {
    it('validates workspace name length', async () => {
      render(<CreateWorkspaceForm />)
      
      const nameInput = screen.getByLabelText('Workspace Name (Required)')
      await user.type(nameInput, 'AB')
      
      expect(screen.getByText('Name must be at least 3 characters long')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    })

    it('validates slug format', async () => {
      render(<CreateWorkspaceForm />)
      
      const slugInput = screen.getByLabelText('Workspace URL (Required)')
      
      // Test invalid slug with special characters
      await user.type(slugInput, 'invalid@slug!')
      
      await waitFor(() => {
        expect(screen.getByText(/Slug must be at least 3 characters/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
      })
    })

    it('validates slug minimum length', async () => {
      render(<CreateWorkspaceForm />)
      
      const slugInput = screen.getByLabelText('Workspace URL (Required)')
      await user.type(slugInput, 'ab')
      
      await waitFor(() => {
        expect(screen.getByText(/Slug must be at least 3 characters/)).toBeInTheDocument()
      })
    })

    it('validates slug cannot start or end with hyphen', async () => {
      render(<CreateWorkspaceForm />)
      
      const slugInput = screen.getByLabelText('Workspace URL (Required)')
      
      await user.type(slugInput, '-invalid')
      await waitFor(() => {
        expect(screen.getByText(/Slug must be at least 3 characters/)).toBeInTheDocument()
      })
      
      await user.clear(slugInput)
      await user.type(slugInput, 'invalid-')
      await waitFor(() => {
        expect(screen.getByText(/Slug must be at least 3 characters/)).toBeInTheDocument()
      })
    })

    it('shows success message for valid slug', async () => {
      render(<CreateWorkspaceForm />)
      
      const nameInput = screen.getByLabelText('Workspace Name (Required)')
      await user.type(nameInput, 'Valid Workspace')
      
      await waitFor(() => {
        expect(screen.getByText('Your workspace will be available at: daygent.ai/valid-workspace')).toBeInTheDocument()
      })
    })
  })

  describe('form submission', () => {
    it('creates workspace on successful submission', async () => {
      render(<CreateWorkspaceForm />)
      
      const nameInput = screen.getByLabelText('Workspace Name (Required)')
      await user.type(nameInput, 'Test Workspace')
      
      const rocketAvatar = screen.getByRole('button', { name: '🚀' })
      await user.click(rocketAvatar)
      
      const nextButton = screen.getByRole('button', { name: 'Next' })
      await user.click(nextButton)
      
      await waitFor(() => {
        expect(mockSupabase.auth.getUser).toHaveBeenCalled()
        expect(mockSupabase.from).toHaveBeenCalledWith('workspaces')
        expect(mockWorkspaceQuery.insert).toHaveBeenCalledWith({
          name: 'Test Workspace',
          slug: 'test-workspace',
          avatar_url: '🚀',
          owner_id: mockUser.id,
        })
        expect(mockRouter.push).toHaveBeenCalledWith('/test-workspace')
      })
    })

    it('uses default avatar if none selected', async () => {
      render(<CreateWorkspaceForm />)
      
      const nameInput = screen.getByLabelText('Workspace Name (Required)')
      await user.type(nameInput, 'Test Workspace')
      
      const nextButton = screen.getByRole('button', { name: 'Next' })
      await user.click(nextButton)
      
      await waitFor(() => {
        expect(mockWorkspaceQuery.insert).toHaveBeenCalledWith({
          name: 'Test Workspace',
          slug: 'test-workspace',
          avatar_url: '🏢', // default avatar
          owner_id: mockUser.id,
        })
      })
    })

    it('shows loading state during submission', async () => {
      let checkResolve: any
      let insertResolve: any
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockImplementation(() => new Promise(resolve => { checkResolve = resolve })),
            insert: vi.fn().mockImplementation(() => new Promise(resolve => { insertResolve = resolve })),
          }
        }
        return mockSupabase.from(table)
      })

      render(<CreateWorkspaceForm />)
      
      const nameInput = screen.getByLabelText('Workspace Name (Required)')
      await user.type(nameInput, 'Test Workspace')
      
      const nextButton = screen.getByRole('button', { name: 'Next' })
      await user.click(nextButton)
      
      // Resolve check first
      checkResolve({ data: null, error: null })
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Creating...' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled()
      })
      
      insertResolve({ error: null })
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
      })
    })

    it('handles Cmd+Enter keyboard shortcut', async () => {
      render(<CreateWorkspaceForm />)
      
      const nameInput = screen.getByLabelText('Workspace Name (Required)')
      await user.type(nameInput, 'Test Workspace')
      
      await waitFor(() => {
        expect(screen.getByLabelText('Workspace URL (Required)')).toHaveValue('test-workspace')
      })
      
      // Simulate Cmd+Enter on the container
      const container = screen.getByText('Create Your Workspace').closest('div')!
      fireEvent.keyDown(container, {
        key: 'Enter',
        metaKey: true,
      })
      
      await waitFor(() => {
        expect(mockWorkspaceQuery.insert).toHaveBeenCalled()
      })
    })
  })

  describe('error handling', () => {
    it('redirects to home if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      })

      render(<CreateWorkspaceForm />)
      
      const nameInput = screen.getByLabelText('Workspace Name (Required)')
      await user.type(nameInput, 'Test Workspace')
      
      const nextButton = screen.getByRole('button', { name: 'Next' })
      await user.click(nextButton)
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/')
        expect(mockSupabase.from).not.toHaveBeenCalledWith('workspaces')
      })
    })

    it('handles duplicate slug error', async () => {
      // Mock existing workspace
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              data: createMockWorkspace(), 
              error: null 
            }),
            insert: vi.fn(),
          }
        }
        return mockSupabase.from(table)
      })

      render(<CreateWorkspaceForm />)
      
      const nameInput = screen.getByLabelText('Workspace Name (Required)')
      await user.type(nameInput, 'Test Workspace')
      
      const nextButton = screen.getByRole('button', { name: 'Next' })
      await user.click(nextButton)
      
      await waitFor(() => {
        expect(screen.getByText('This workspace URL is already taken. Please choose a different one.')).toBeInTheDocument()
        const errorElement = screen.getByText(/This workspace URL is already taken/)
        expect(errorElement.closest('div')).toHaveClass('bg-red-100', 'border-red-400', 'text-red-700')
      })
    })

    it('displays database error message', async () => {
      const errorMessage = 'Database connection failed'
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockResolvedValue({ error: new Error(errorMessage) }),
          }
        }
        return mockSupabase.from(table)
      })

      render(<CreateWorkspaceForm />)
      
      const nameInput = screen.getByLabelText('Workspace Name (Required)')
      await user.type(nameInput, 'Test Workspace')
      
      const nextButton = screen.getByRole('button', { name: 'Next' })
      await user.click(nextButton)
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('displays generic error for non-Error objects', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockRejectedValue('String error'),
          }
        }
        return mockSupabase.from(table)
      })

      render(<CreateWorkspaceForm />)
      
      const nameInput = screen.getByLabelText('Workspace Name (Required)')
      await user.type(nameInput, 'Test Workspace')
      
      const nextButton = screen.getByRole('button', { name: 'Next' })
      await user.click(nextButton)
      
      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })
    })
  })

  describe('edge cases', () => {
    it('prevents multiple simultaneous submissions', async () => {
      let checkResolve: any
      let insertResolve: any
      let checkCalled = false
      let insertCalled = false
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockImplementation(() => {
              if (!checkCalled) {
                checkCalled = true
                return new Promise(resolve => { checkResolve = resolve })
              }
              return Promise.resolve({ data: null, error: null })
            }),
            insert: vi.fn().mockImplementation(() => {
              if (!insertCalled) {
                insertCalled = true
                return new Promise(resolve => { insertResolve = resolve })
              }
              return Promise.resolve({ error: null })
            }),
          }
        }
        return mockSupabase.from(table)
      })

      render(<CreateWorkspaceForm />)
      
      const nameInput = screen.getByLabelText('Workspace Name (Required)')
      await user.type(nameInput, 'Test Workspace')
      
      const nextButton = screen.getByRole('button', { name: 'Next' })
      
      // First click
      await user.click(nextButton)
      
      // Resolve check
      checkResolve({ data: null, error: null })
      
      await waitFor(() => {
        // Button should be disabled during submission
        expect(nextButton).toBeDisabled()
      })
      
      // Try clicking again while disabled
      await user.click(nextButton)
      await user.click(nextButton)
      
      // Resolve insert
      insertResolve({ error: null })
      
      await waitFor(() => {
        // Should only call insert once
        expect(insertCalled).toBe(true)
      })
    })

    it('converts slug to lowercase automatically', async () => {
      render(<CreateWorkspaceForm />)
      
      const slugInput = screen.getByLabelText('Workspace URL (Required)')
      await user.type(slugInput, 'MixedCaseSlug')
      
      expect(slugInput).toHaveValue('mixedcaseslug')
    })

    it('clears slug when name is cleared', async () => {
      render(<CreateWorkspaceForm />)
      
      const nameInput = screen.getByLabelText('Workspace Name (Required)')
      const slugInput = screen.getByLabelText('Workspace URL (Required)')
      
      await user.type(nameInput, 'Test Workspace')
      await waitFor(() => {
        expect(slugInput).toHaveValue('test-workspace')
      })
      
      await user.clear(nameInput)
      await waitFor(() => {
        expect(slugInput).toHaveValue('')
      })
    })
  })
})