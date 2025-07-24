import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreateUserForm from '@/components/auth/CreateUserForm'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { createMockSupabaseClient, createMockRouter } from '@/test/utils/mock-factory'
import { createMockUser } from '@/test/fixtures/users'

vi.mock('@/lib/supabase/client')
vi.mock('next/navigation')

describe('CreateUserForm', () => {
  const mockSupabase = createMockSupabaseClient()
  const mockRouter = createMockRouter()
  const user = userEvent.setup()
  const mockUser = createMockUser()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as any).mockReturnValue(mockSupabase)
    ;(useRouter as any).mockReturnValue(mockRouter)
    
    // Mock fetch for cache invalidation
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    })
    
    // Default to authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
  })

  describe('rendering', () => {
    it('renders all form elements correctly', () => {
      render(<CreateUserForm />)
      
      expect(screen.getByText('Complete Your Profile')).toBeInTheDocument()
      expect(screen.getByText('Choose an Avatar (Optional)')).toBeInTheDocument()
      expect(screen.getByLabelText('Your Name (Required)')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })

    it('renders all avatar options', () => {
      render(<CreateUserForm />)
      
      const avatarOptions = ['🐱', '🐶', '🦊', '🐻', '🐼', '🐨', '🐸', '🦁', 
                            '🐵', '🦄', '🐙', '🦋', '🌟', '🎨', '🚀', '🌈']
      
      avatarOptions.forEach(avatar => {
        expect(screen.getByRole('button', { name: avatar })).toBeInTheDocument()
      })
    })

    it('has correct input attributes', () => {
      render(<CreateUserForm />)
      
      const nameInput = screen.getByLabelText('Your Name (Required)')
      expect(nameInput).toHaveAttribute('type', 'text')
      expect(nameInput).toHaveAttribute('autoComplete', 'name')
      expect(nameInput).toHaveAttribute('autoCapitalize', 'words')
    })
  })

  describe('avatar selection', () => {
    it('allows selecting an avatar', async () => {
      render(<CreateUserForm />)
      
      const catAvatar = screen.getByRole('button', { name: '🐱' })
      await user.click(catAvatar)
      
      expect(screen.getByText('Selected: 🐱')).toBeInTheDocument()
      expect(catAvatar).toHaveClass('border-primary', 'bg-primary/10')
    })

    it('allows changing avatar selection', async () => {
      render(<CreateUserForm />)
      
      const catAvatar = screen.getByRole('button', { name: '🐱' })
      const dogAvatar = screen.getByRole('button', { name: '🐶' })
      
      await user.click(catAvatar)
      expect(screen.getByText('Selected: 🐱')).toBeInTheDocument()
      
      await user.click(dogAvatar)
      expect(screen.getByText('Selected: 🐶')).toBeInTheDocument()
      expect(dogAvatar).toHaveClass('border-primary', 'bg-primary/10')
      expect(catAvatar).not.toHaveClass('border-primary', 'bg-primary/10')
    })

    it('uses default avatar if none selected', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })

      render(<CreateUserForm />)
      
      const nameInput = screen.getByLabelText('Your Name (Required)')
      await user.type(nameInput, 'Test User')
      
      const saveButton = screen.getByRole('button', { name: 'Save' })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('users')
        expect(mockSupabase.from('users').insert).toHaveBeenCalledWith({
          id: mockUser.id,
          name: 'Test User',
          avatar_url: '👤', // default avatar
        })
      })
    })
  })

  describe('name validation', () => {
    it('shows validation error for short names', async () => {
      render(<CreateUserForm />)
      
      const nameInput = screen.getByLabelText('Your Name (Required)')
      await user.type(nameInput, 'AB')
      
      expect(screen.getByText('Name must be at least 3 characters long')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    })

    it('hides validation error for valid names', async () => {
      render(<CreateUserForm />)
      
      const nameInput = screen.getByLabelText('Your Name (Required)')
      await user.type(nameInput, 'ABC')
      
      expect(screen.queryByText('Name must be at least 3 characters long')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled()
    })

    it('disables save button when name is empty', () => {
      render(<CreateUserForm />)
      
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    })
  })

  describe('form submission', () => {
    it('creates user profile on successful submission', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })

      render(<CreateUserForm />)
      
      const nameInput = screen.getByLabelText('Your Name (Required)')
      await user.type(nameInput, 'Test User')
      
      const catAvatar = screen.getByRole('button', { name: '🐱' })
      await user.click(catAvatar)
      
      // Submit the form
      const form = screen.getByText('Complete Your Profile').closest('form')!
      fireEvent.submit(form)
      
      await waitFor(() => {
        expect(mockSupabase.auth.getUser).toHaveBeenCalled()
        expect(mockSupabase.from).toHaveBeenCalledWith('users')
        expect(mockSupabase.from('users').insert).toHaveBeenCalledWith({
          id: mockUser.id,
          name: 'Test User',
          avatar_url: '🐱',
        })
        expect(mockRouter.refresh).toHaveBeenCalled()
        expect(mockRouter.push).toHaveBeenCalledWith('/CreateWorkspace')
      })
    })

    it('shows loading state during submission', async () => {
      let resolvePromise: any
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockImplementation(() => new Promise(resolve => { resolvePromise = resolve })),
      })

      render(<CreateUserForm />)
      
      const nameInput = screen.getByLabelText('Your Name (Required)')
      await user.type(nameInput, 'Test User')
      
      const saveButton = screen.getByRole('button', { name: 'Save' })
      await user.click(saveButton)
      
      expect(screen.getByRole('button', { name: 'Saving...' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
      
      resolvePromise({ error: null })
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
      })
    })

    it('handles Cmd+Enter keyboard shortcut', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })

      render(<CreateUserForm />)
      
      const nameInput = screen.getByLabelText('Your Name (Required)')
      await user.type(nameInput, 'Test User')
      
      // Simulate Cmd+Enter on the form
      const form = screen.getByText('Complete Your Profile').closest('form')!
      fireEvent.keyDown(form, {
        key: 'Enter',
        metaKey: true,
      })
      
      await waitFor(() => {
        expect(mockSupabase.from('users').insert).toHaveBeenCalled()
      })
    })
  })

  describe('error handling', () => {
    it('redirects to home if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      })

      render(<CreateUserForm />)
      
      const nameInput = screen.getByLabelText('Your Name (Required)')
      await user.type(nameInput, 'Test User')
      
      const saveButton = screen.getByRole('button', { name: 'Save' })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/')
        expect(mockSupabase.from).not.toHaveBeenCalled()
      })
    })

    it('displays error message on database error', async () => {
      const errorMessage = 'Database error: duplicate key'
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: new Error(errorMessage) }),
      })

      render(<CreateUserForm />)
      
      const nameInput = screen.getByLabelText('Your Name (Required)')
      await user.type(nameInput, 'Test User')
      
      const saveButton = screen.getByRole('button', { name: 'Save' })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
        const errorElement = screen.getByText(errorMessage)
        expect(errorElement.closest('div')).toHaveClass('bg-red-100', 'border-red-400', 'text-red-700')
      })
    })

    it('displays generic error for non-Error objects', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockRejectedValue('String error'),
      })

      render(<CreateUserForm />)
      
      const nameInput = screen.getByLabelText('Your Name (Required)')
      await user.type(nameInput, 'Test User')
      
      const saveButton = screen.getByRole('button', { name: 'Save' })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })
    })

    it('clears error on new submission attempt', async () => {
      // First submission fails
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: new Error('First error') }),
      })

      render(<CreateUserForm />)
      
      const nameInput = screen.getByLabelText('Your Name (Required)')
      await user.type(nameInput, 'Test User')
      
      const saveButton = screen.getByRole('button', { name: 'Save' })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument()
      })

      // Second submission succeeds
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })

      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument()
        expect(mockRouter.refresh).toHaveBeenCalled()
        expect(mockRouter.push).toHaveBeenCalledWith('/CreateWorkspace')
      })
    })
  })

  describe('edge cases', () => {
    it('prevents multiple simultaneous submissions', async () => {
      let resolvePromise: any
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockImplementation(() => new Promise(resolve => { resolvePromise = resolve })),
      })

      render(<CreateUserForm />)
      
      const nameInput = screen.getByLabelText('Your Name (Required)')
      await user.type(nameInput, 'Test User')
      
      const saveButton = screen.getByRole('button', { name: 'Save' })
      
      // First click
      await user.click(saveButton)
      
      // Button should be disabled
      expect(saveButton).toBeDisabled()
      
      // Try clicking again
      await user.click(saveButton)
      await user.click(saveButton)
      
      // Should only call once
      expect(mockSupabase.from).toHaveBeenCalledTimes(1)
      
      // Resolve the promise
      await act(async () => {
        resolvePromise({ error: null })
      })
    })

    it('handles very long names', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })

      render(<CreateUserForm />)
      
      const nameInput = screen.getByLabelText('Your Name (Required)')
      const longName = 'A'.repeat(100)
      await user.type(nameInput, longName)
      
      const saveButton = screen.getByRole('button', { name: 'Save' })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(mockSupabase.from('users').insert).toHaveBeenCalledWith({
          id: mockUser.id,
          name: longName,
          avatar_url: '👤',
        })
      })
    })

    it('trims whitespace from name', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })

      render(<CreateUserForm />)
      
      const nameInput = screen.getByLabelText('Your Name (Required)')
      await user.type(nameInput, '  Test User  ')
      
      // Validation should work with trimmed value
      expect(screen.queryByText('Name must be at least 3 characters long')).not.toBeInTheDocument()
      
      const saveButton = screen.getByRole('button', { name: 'Save' })
      expect(saveButton).not.toBeDisabled()
    })
  })
})