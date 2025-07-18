import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiSettings } from '@/components/settings/api-settings'
import { createClient } from '@/lib/supabase/client'

// Mock Supabase client
vi.mock('@/lib/supabase/client')

describe('ApiSettings', () => {
  const mockSupabase = {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)
  })

  describe('rendering', () => {
    it('should render with default values', () => {
      render(<ApiSettings workspaceId="test-workspace" />)

      expect(screen.getByText('AI Integration Settings')).toBeInTheDocument()
      expect(screen.getByText('Configure AI features for issue recommendations and prompt generation')).toBeInTheDocument()
      expect(screen.getByLabelText('AI Provider')).toBeInTheDocument()
      expect(screen.getByLabelText('API Key')).toBeInTheDocument()
      expect(screen.getByLabelText('Agents.md Content')).toBeInTheDocument()
      expect(screen.getByText('Save Settings')).toBeInTheDocument()
    })

    it('should render with initial settings', () => {
      const initialSettings = {
        api_key: 'test-key',
        api_provider: 'openai',
        agents_content: 'Test content'
      }

      render(
        <ApiSettings 
          workspaceId="test-workspace" 
          initialSettings={initialSettings}
        />
      )

      expect(screen.getByDisplayValue('openai')).toBeInTheDocument()
      const apiKeyInput = screen.getByLabelText('API Key') as HTMLInputElement
      expect(apiKeyInput.value).toBe('test-key')
      
      const agentsTextarea = screen.getByLabelText('Agents.md Content') as HTMLTextAreaElement
      expect(agentsTextarea.value).toBe('Test content')
    })
  })

  describe('user interactions', () => {
    it('should update API key on input', async () => {
      const user = userEvent.setup()
      render(<ApiSettings workspaceId="test-workspace" />)

      const apiKeyInput = screen.getByLabelText('API Key')
      await user.clear(apiKeyInput)
      await user.type(apiKeyInput, 'new-api-key')

      expect(apiKeyInput).toHaveValue('new-api-key')
    })

    it('should update provider on selection', async () => {
      render(<ApiSettings workspaceId="test-workspace" />)

      const providerSelect = screen.getByLabelText('AI Provider')
      fireEvent.click(providerSelect)
      
      // Note: Anthropic is disabled in the actual component
      const openaiOption = screen.getByText('OpenAI')
      fireEvent.click(openaiOption)

      expect(screen.getByDisplayValue('openai')).toBeInTheDocument()
    })

    it('should update agents content on input', async () => {
      const user = userEvent.setup()
      render(<ApiSettings workspaceId="test-workspace" />)

      const agentsTextarea = screen.getByLabelText('Agents.md Content')
      await user.clear(agentsTextarea)
      await user.type(agentsTextarea, 'New agents content')

      expect(agentsTextarea).toHaveValue('New agents content')
    })
  })

  describe('saving settings', () => {
    it('should save settings successfully', async () => {
      const user = userEvent.setup()
      render(<ApiSettings workspaceId="test-workspace" />)

      // Fill in the form
      const apiKeyInput = screen.getByLabelText('API Key')
      await user.type(apiKeyInput, 'test-api-key')

      const agentsTextarea = screen.getByLabelText('Agents.md Content')
      await user.type(agentsTextarea, 'Test agents content')

      // Click save
      const saveButton = screen.getByText('Save Settings')
      await user.click(saveButton)

      // Verify Supabase was called correctly
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('workspaces')
        const updateMock = mockSupabase.from().update
        expect(updateMock).toHaveBeenCalledWith({
          api_key: 'test-api-key',
          api_provider: 'openai',
          agents_content: 'Test agents content'
        })
      })

      // Check success message
      expect(screen.getByText('API settings saved successfully!')).toBeInTheDocument()
    })

    it('should handle save errors', async () => {
      const user = userEvent.setup()
      
      // Mock error response
      const errorSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: new Error('Database error') }))
          }))
        }))
      }
      vi.mocked(createClient).mockReturnValue(errorSupabase as any)

      render(<ApiSettings workspaceId="test-workspace" />)

      const saveButton = screen.getByText('Save Settings')
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to save API settings')).toBeInTheDocument()
      })
    })

    it('should show saving state', async () => {
      const user = userEvent.setup()
      
      // Mock slow response
      const slowSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100)))
          }))
        }))
      }
      vi.mocked(createClient).mockReturnValue(slowSupabase as any)

      render(<ApiSettings workspaceId="test-workspace" />)

      const saveButton = screen.getByText('Save Settings')
      await user.click(saveButton)

      // Button should be disabled while saving
      expect(saveButton).toBeDisabled()
      expect(screen.getByText('Saving...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText('Save Settings')).toBeInTheDocument()
        expect(saveButton).not.toBeDisabled()
      })
    })

    it('should update with correct workspace ID', async () => {
      const user = userEvent.setup()
      const workspaceId = 'specific-workspace-id'
      
      render(<ApiSettings workspaceId={workspaceId} />)

      const saveButton = screen.getByText('Save Settings')
      await user.click(saveButton)

      await waitFor(() => {
        const eqMock = mockSupabase.from().update().eq
        expect(eqMock).toHaveBeenCalledWith('id', workspaceId)
      })
    })
  })

  describe('password field behavior', () => {
    it('should render API key input as password field', () => {
      render(<ApiSettings workspaceId="test-workspace" />)
      
      const apiKeyInput = screen.getByLabelText('API Key') as HTMLInputElement
      expect(apiKeyInput.type).toBe('password')
    })

    it('should have correct placeholder', () => {
      render(<ApiSettings workspaceId="test-workspace" />)
      
      const apiKeyInput = screen.getByLabelText('API Key')
      expect(apiKeyInput).toHaveAttribute('placeholder', 'sk-...')
    })
  })

  describe('message display', () => {
    it('should clear message when starting new save', async () => {
      const user = userEvent.setup()
      
      // First save with error
      const errorSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: new Error('Error') }))
          }))
        }))
      }
      vi.mocked(createClient).mockReturnValue(errorSupabase as any)

      render(<ApiSettings workspaceId="test-workspace" />)
      
      const saveButton = screen.getByText('Save Settings')
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to save API settings')).toBeInTheDocument()
      })

      // Mock successful save
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)
      
      // Click save again
      await user.click(saveButton)

      // Error message should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Failed to save API settings')).not.toBeInTheDocument()
        expect(screen.getByText('API settings saved successfully!')).toBeInTheDocument()
      })
    })
  })
})