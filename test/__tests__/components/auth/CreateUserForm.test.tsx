import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
    
    // Default to authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
  })

  describe('rendering', () => {
    it('renders all form elements correctly', () => {
      render(<CreateUserForm />)
      
      expect(screen.getByText('Create Your Profile')).toBeInTheDocument()
      expect(screen.getByText('Choose an Avatar')).toBeInTheDocument()
      expect(screen.getByText('Your Name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
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
      
      const nameInput = screen.getByPlaceholderText('Enter your name')
      expect(nameInput).toHaveAttribute('type', 'text')
      expect(nameInput).toHaveAttribute('autoFocus')
    })
  })

  describe('avatar selection', () => {
    it('allows selecting an avatar', async () => {
      render(<CreateUserForm />)
      
      const catAvatar = screen.getByRole('button', { name: '🐱' })
      
      expect(catAvatar).not.toHaveClass('border-primary')
      
      await user.click(catAvatar)
      
      expect(catAvatar).toHaveClass('border-primary', 'bg-primary/10')
    })

    it('allows changing avatar selection', async () => {
      render(<CreateUserForm />)
      
      const catAvatar = screen.getByRole('button', { name: '🐱' })
      const dogAvatar = screen.getByRole('button', { name: '🐶' })
      
      await user.click(catAvatar)
      expect(catAvatar).toHaveClass('border-primary')
      expect(dogAvatar).not.toHaveClass('border-primary')
      
      await user.click(dogAvatar)
      expect(dogAvatar).toHaveClass('border-primary')
      expect(catAvatar).not.toHaveClass('border-primary')
    })

    it('uses default avatar if none selected', async () => {
      render(<CreateUserForm />)
      
      const nameInput = screen.getByPlaceholderText('Enter your name')
      await user.type(nameInput, 'Test User')
      
      const submitButton = screen.getByRole('button', { name: 'Continue' })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('users')
        expect(mockSupabase.from('users').insert).toHaveBeenCalledWith({
          id: mockUser.id,
          name: 'Test User',
          avatar_url: '👤'
        })
      })
    })
  })

  describe('name validation', () => {
    it('disables submit button when name is too short', async () => {
      render(<CreateUserForm />)
      
      const nameInput = screen.getByPlaceholderText('Enter your name')
      const submitButton = screen.getByRole('button', { name: 'Continue' })
      
      expect(submitButton).toBeDisabled()
      
      await user.type(nameInput, 'AB')
      expect(submitButton).toBeDisabled()
      
      await user.type(nameInput, 'C')
      expect(submitButton).toBeEnabled()
    })

    it('shows error when submitting with short name', async () => {
      render(<CreateUserForm />)
      
      const submitButton = screen.getByRole('button', { name: 'Continue' })
      
      // Try to submit empty form
      await user.click(submitButton)
      
      expect(screen.getByText('Name must be at least 3 characters')).toBeInTheDocument()
    })
  })

  describe('form submission', () => {
    it('creates user profile on successful submission', async () => {
      render(<CreateUserForm />)
      
      const nameInput = screen.getByPlaceholderText('Enter your name')
      await user.type(nameInput, 'Test User')
      
      const catAvatar = screen.getByRole('button', { name: '🐱' })
      await user.click(catAvatar)
      
      const submitButton = screen.getByRole('button', { name: 'Continue' })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('users')
        expect(mockSupabase.from('users').insert).toHaveBeenCalledWith({
          id: mockUser.id,
          name: 'Test User',
          avatar_url: '🐱'
        })
        expect(mockRouter.push).toHaveBeenCalledWith('/CreateWorkspace')
      })
    })

    it('shows loading state during submission', async () => {
      // Delay the database response
      mockSupabase.from('users').insert.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
      )
      
      render(<CreateUserForm />)
      
      const nameInput = screen.getByPlaceholderText('Enter your name')
      await user.type(nameInput, 'Test User')
      
      const submitButton = screen.getByRole('button', { name: 'Continue' })
      await user.click(submitButton)
      
      expect(screen.getByRole('button', { name: 'Creating...' })).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalled()
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
      
      const nameInput = screen.getByPlaceholderText('Enter your name')
      await user.type(nameInput, 'Test User')
      
      const submitButton = screen.getByRole('button', { name: 'Continue' })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/')
        expect(mockSupabase.from).not.toHaveBeenCalled()
      })
    })

    it('displays error message on database error', async () => {
      mockSupabase.from('users').insert.mockResolvedValueOnce({
        error: new Error('Database error')
      })
      
      render(<CreateUserForm />)
      
      const nameInput = screen.getByPlaceholderText('Enter your name')
      await user.type(nameInput, 'Test User')
      
      const submitButton = screen.getByRole('button', { name: 'Continue' })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Database error')).toBeInTheDocument()
        expect(mockRouter.push).not.toHaveBeenCalled()
      })
    })

    it('displays generic error for non-Error objects', async () => {
      mockSupabase.from('users').insert.mockRejectedValueOnce('Unknown error')
      
      render(<CreateUserForm />)
      
      const nameInput = screen.getByPlaceholderText('Enter your name')
      await user.type(nameInput, 'Test User')
      
      const submitButton = screen.getByRole('button', { name: 'Continue' })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Failed to create profile')).toBeInTheDocument()
      })
    })
  })

  describe('edge cases', () => {
    it('trims whitespace from name', async () => {
      render(<CreateUserForm />)
      
      const nameInput = screen.getByPlaceholderText('Enter your name')
      await user.type(nameInput, '  Test User  ')
      
      const submitButton = screen.getByRole('button', { name: 'Continue' })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockSupabase.from('users').insert).toHaveBeenCalledWith({
          id: mockUser.id,
          name: 'Test User',
          avatar_url: '👤'
        })
      })
    })
  })
})