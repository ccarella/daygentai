import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreateWorkspaceForm from '@/components/auth/CreateWorkspaceForm'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { createMockSupabaseClient, createMockRouter } from '@/test/utils/mock-factory'
import { createMockUser } from '@/test/fixtures/users'
import { ProfileProvider } from '@/contexts/profile-context'

vi.mock('@/lib/supabase/client')
vi.mock('next/navigation')

describe('CreateWorkspaceForm', () => {
  let mockSupabase: any
  let mockRouter: any
  const user = userEvent.setup()
  const mockUser = createMockUser()

  const renderWithProfile = async (component: React.ReactElement) => {
    let result
    await act(async () => {
      result = render(
        <ProfileProvider>
          {component}
        </ProfileProvider>
      )
    })
    return result
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient({
      rpc: vi.fn().mockResolvedValue({
        data: { 
          success: true, 
          workspace_id: 'mock-workspace-id',
          slug: 'test-workspace'
        },
        error: null
      })
    })
    mockRouter = createMockRouter()
    ;(createClient as any).mockReturnValue(mockSupabase)
    ;(useRouter as any).mockReturnValue(mockRouter)
    
    // Default to authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
    
    // Mock profile data for ProfileProvider
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: mockUser.id,
              name: 'Test User',
              avatar_url: '🧑'
            },
            error: null
          })
        })
      })
    })
    
    // Mock auth state change subscription
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    })
  })

  it('renders the form with avatar options and name input', async () => {
    await renderWithProfile(<CreateWorkspaceForm />)
    
    expect(screen.getByText('Create Your Workspace')).toBeInTheDocument()
    expect(screen.getByText('Choose a Workspace Avatar')).toBeInTheDocument()
    expect(screen.getByText('Workspace Name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('My Awesome Workspace')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
    
    // Check avatar buttons
    const avatarButtons = screen.getAllByRole('button').filter(btn => 
      btn.textContent && ['🏢', '🚀', '💼', '🎯'].includes(btn.textContent)
    )
    expect(avatarButtons.length).toBeGreaterThan(0)
  })

  it('validates workspace name length', async () => {
    await renderWithProfile(<CreateWorkspaceForm />)
    
    const nameInput = screen.getByPlaceholderText('My Awesome Workspace')
    const submitButton = screen.getByRole('button', { name: 'Next' })
    
    // Button should be disabled initially
    expect(submitButton).toBeDisabled()
    
    // Type a short name
    await user.type(nameInput, 'ab')
    expect(submitButton).toBeDisabled()
    
    // Type a valid name
    await user.clear(nameInput)
    await user.type(nameInput, 'My Workspace')
    expect(submitButton).toBeEnabled()
  })

  it('allows avatar selection', async () => {
    await renderWithProfile(<CreateWorkspaceForm />)
    
    const rocketAvatar = screen.getByRole('button', { name: '🚀' })
    
    // Initially no avatar selected
    expect(rocketAvatar).not.toHaveClass('border-primary')
    
    // Click to select
    await user.click(rocketAvatar)
    expect(rocketAvatar).toHaveClass('border-primary')
  })

  it('creates workspace and redirects on success', async () => {
    await renderWithProfile(<CreateWorkspaceForm />)
    
    const nameInput = screen.getByPlaceholderText('My Awesome Workspace')
    const submitButton = screen.getByRole('button', { name: 'Next' })
    
    await user.type(nameInput, 'Test Workspace')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_workspace', {
        p_name: 'Test Workspace',
        p_slug: 'test-workspace',
        p_avatar_url: '🏢'
      })
    })
    
    expect(mockRouter.push).toHaveBeenCalledWith('/test-workspace')
  })

  it('handles workspace creation errors', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error('Workspace already exists')
    })
    
    await renderWithProfile(<CreateWorkspaceForm />)
    
    const nameInput = screen.getByPlaceholderText('My Awesome Workspace')
    const submitButton = screen.getByRole('button', { name: 'Next' })
    
    await user.type(nameInput, 'Test Workspace')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Workspace already exists')).toBeInTheDocument()
    })
    
    expect(mockRouter.push).not.toHaveBeenCalled()
  })

  it('handles RPC function custom error responses', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: { success: false, error: 'Custom error message' },
      error: null
    })
    
    await renderWithProfile(<CreateWorkspaceForm />)
    
    const nameInput = screen.getByPlaceholderText('My Awesome Workspace')
    const submitButton = screen.getByRole('button', { name: 'Next' })
    
    await user.type(nameInput, 'Test Workspace')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Custom error message')).toBeInTheDocument()
    })
  })

  it('redirects unauthenticated users to home', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })
    
    await renderWithProfile(<CreateWorkspaceForm />)
    
    const nameInput = screen.getByPlaceholderText('My Awesome Workspace')
    const submitButton = screen.getByRole('button', { name: 'Next' })
    
    await user.type(nameInput, 'Test Workspace')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/')
    })
    
    expect(mockSupabase.rpc).not.toHaveBeenCalled()
  })

  it('generates slug from workspace name', async () => {
    await renderWithProfile(<CreateWorkspaceForm />)
    
    const nameInput = screen.getByPlaceholderText('My Awesome Workspace')
    const submitButton = screen.getByRole('button', { name: 'Next' })
    
    await user.type(nameInput, 'My Awesome Workspace 123!')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_workspace', {
        p_name: 'My Awesome Workspace 123!',
        p_slug: 'my-awesome-workspace-123',
        p_avatar_url: '🏢'
      })
    })
  })

  it('shows loading state during submission', async () => {
    // Delay the response
    mockSupabase.rpc.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        data: { success: true, slug: 'test' },
        error: null
      }), 100))
    )
    
    await renderWithProfile(<CreateWorkspaceForm />)
    
    const nameInput = screen.getByPlaceholderText('My Awesome Workspace')
    const submitButton = screen.getByRole('button', { name: 'Next' })
    
    await user.type(nameInput, 'Test Workspace')
    await user.click(submitButton)
    
    expect(screen.getByRole('button', { name: 'Creating...' })).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
    
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalled()
    })
  })
})