import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmailLogin } from '@/components/auth/email-login'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { createMockSupabaseClient, createMockRouter } from '@/test/utils/mock-factory'

vi.mock('@/lib/supabase/client')
vi.mock('next/navigation')

// Mock the toast hook
const mockToast = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}))

describe('EmailLogin', () => {
  const mockSupabase = createMockSupabaseClient()
  const mockRouter = createMockRouter()
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as any).mockReturnValue(mockSupabase)
    ;(useRouter as any).mockReturnValue(mockRouter)
    
    // Reset window.location
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000' },
      writable: true,
    })
  })

  describe('rendering', () => {
    it('renders email input and submit button', () => {
      render(<EmailLogin />)
      
      expect(screen.getByLabelText('Email address')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Send login link' })).toBeInTheDocument()
    })

    it('has correct input attributes for accessibility', () => {
      render(<EmailLogin />)
      
      const emailInput = screen.getByLabelText('Email address')
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
      expect(emailInput).toHaveAttribute('autoComplete', 'email')
      expect(emailInput).toHaveAttribute('autoCapitalize', 'off')
      expect(emailInput).toHaveAttribute('autoCorrect', 'off')
    })
  })

  describe('email validation', () => {
    it('prevents submission with empty email', async () => {
      render(<EmailLogin />)
      
      const submitButton = screen.getByRole('button', { name: 'Send login link' })
      await user.click(submitButton)
      
      // Browser validation should prevent the form submission
      expect(mockSupabase.auth.signInWithOtp).not.toHaveBeenCalled()
    })

    it('accepts valid email format', async () => {
      render(<EmailLogin />)
      
      const emailInput = screen.getByLabelText('Email address')
      await user.type(emailInput, 'test@example.com')
      
      expect(emailInput).toHaveValue('test@example.com')
    })
  })

  describe('form submission', () => {
    it('sends OTP on successful form submission', async () => {
      mockSupabase.auth.signInWithOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      })

      render(<EmailLogin />)
      
      const emailInput = screen.getByLabelText('Email address')
      await user.type(emailInput, 'test@example.com')
      
      const submitButton = screen.getByRole('button', { name: 'Send login link' })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
          email: 'test@example.com',
          options: {
            emailRedirectTo: 'http://localhost:3000/auth/callback',
          },
        })
      })
    })

    it('redirects to check email page on success', async () => {
      mockSupabase.auth.signInWithOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      })

      render(<EmailLogin />)
      
      const emailInput = screen.getByLabelText('Email address')
      await user.type(emailInput, 'test@example.com')
      
      const submitButton = screen.getByRole('button', { name: 'Send login link' })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          '/checkemail?email=test%40example.com'
        )
      })
    })

    it('shows loading state during submission', async () => {
      // Mock a slow response
      mockSupabase.auth.signInWithOtp.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), 100))
      )

      render(<EmailLogin />)
      
      const emailInput = screen.getByLabelText('Email address')
      await user.type(emailInput, 'test@example.com')
      
      const submitButton = screen.getByRole('button', { name: 'Send login link' })
      await user.click(submitButton)
      
      // Check loading state
      expect(screen.getByRole('button', { name: 'Sending...' })).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeDisabled()
      expect(emailInput).toBeDisabled()
      
      // Wait for completion
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Send login link' })).toBeInTheDocument()
      })
    })

    it('handles Cmd+Enter keyboard shortcut', async () => {
      mockSupabase.auth.signInWithOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      })

      render(<EmailLogin />)
      
      const emailInput = screen.getByLabelText('Email address')
      await user.type(emailInput, 'test@example.com')
      
      // Simulate Cmd+Enter on the form element
      const form = screen.getByLabelText('Email address').closest('form')!
      fireEvent.keyDown(form, {
        key: 'Enter',
        metaKey: true,
      })
      
      await waitFor(() => {
        expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalled()
      })
    })
  })

  describe('error handling', () => {
    it('displays error message when OTP fails', async () => {
      const errorMessage = 'Invalid email address'
      mockSupabase.auth.signInWithOtp.mockResolvedValueOnce({
        data: null,
        error: new Error(errorMessage),
      })

      render(<EmailLogin />)
      
      const emailInput = screen.getByLabelText('Email address')
      await user.type(emailInput, 'test@example.com')
      
      const submitButton = screen.getByRole('button', { name: 'Send login link' })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Login failed",
          description: errorMessage,
          variant: "destructive"
        })
      })
    })

    it('displays generic error for non-Error objects', async () => {
      mockSupabase.auth.signInWithOtp.mockRejectedValueOnce('String error')

      render(<EmailLogin />)
      
      const emailInput = screen.getByLabelText('Email address')
      await user.type(emailInput, 'test@example.com')
      
      const submitButton = screen.getByRole('button', { name: 'Send login link' })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Login failed",
          description: 'Something went wrong!',
          variant: "destructive"
        })
      })
    })

    it('recovers from error state on new submission', async () => {
      // First submission fails
      mockSupabase.auth.signInWithOtp.mockResolvedValueOnce({
        data: null,
        error: new Error('Network error'),
      })

      render(<EmailLogin />)
      
      const emailInput = screen.getByLabelText('Email address')
      await user.type(emailInput, 'test@example.com')
      
      const submitButton = screen.getByRole('button', { name: 'Send login link' })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Login failed",
          description: 'Network error',
          variant: "destructive"
        })
      })

      // Second submission succeeds
      mockSupabase.auth.signInWithOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      })

      await user.clear(emailInput)
      await user.type(emailInput, 'test2@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        // Should have shown success toast on second submission
        expect(mockToast).toHaveBeenLastCalledWith({
          title: "Check your email",
          description: "We've sent you a login link. Please check your inbox."
        })
        expect(mockRouter.push).toHaveBeenCalledWith(
          '/checkemail?email=test2%40example.com'
        )
      })
    })
  })

  describe('edge cases', () => {
    it('handles email with special characters', async () => {
      mockSupabase.auth.signInWithOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      })

      render(<EmailLogin />)
      
      const emailInput = screen.getByLabelText('Email address')
      await user.type(emailInput, 'test+tag@example.com')
      
      const submitButton = screen.getByRole('button', { name: 'Send login link' })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
          email: 'test+tag@example.com',
          options: {
            emailRedirectTo: 'http://localhost:3000/auth/callback',
          },
        })
        expect(mockRouter.push).toHaveBeenCalledWith(
          '/checkemail?email=test%2Btag%40example.com'
        )
      })
    })

    it('prevents multiple simultaneous submissions', async () => {
      // Mock a slow response
      let resolvePromise: any
      mockSupabase.auth.signInWithOtp.mockImplementationOnce(
        () => new Promise(resolve => { resolvePromise = resolve })
      )

      render(<EmailLogin />)
      
      const emailInput = screen.getByLabelText('Email address')
      await user.type(emailInput, 'test@example.com')
      
      const submitButton = screen.getByRole('button', { name: 'Send login link' })
      
      // First click
      await user.click(submitButton)
      
      // Button should be disabled immediately
      expect(submitButton).toBeDisabled()
      
      // Try clicking again while disabled
      await user.click(submitButton)
      await user.click(submitButton)
      
      // Should only call once
      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledTimes(1)
      
      // Resolve the promise
      await act(async () => {
        resolvePromise({ data: { user: null, session: null }, error: null })
      })
    })

    it('handles email input value correctly', async () => {
      mockSupabase.auth.signInWithOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      })

      render(<EmailLogin />)
      
      const emailInput = screen.getByLabelText('Email address')
      await user.type(emailInput, 'test@example.com')
      
      const submitButton = screen.getByRole('button', { name: 'Send login link' })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
          email: 'test@example.com',
          options: {
            emailRedirectTo: 'http://localhost:3000/auth/callback',
          },
        })
      })
    })
  })
})