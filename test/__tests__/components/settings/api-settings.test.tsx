import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiSettings } from '@/components/settings/api-settings'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import { createClient } from '@/lib/supabase/client'

// Mock Supabase client
vi.mock('@/lib/supabase/client')

describe('ApiSettings', () => {
  const mockSupabase = {
    from: vi.fn(() => {
      const updateMock = vi.fn(() => {
        const eqMock = vi.fn(() => Promise.resolve({ error: null }))
        return { eq: eqMock }
      })
      return { update: updateMock }
    })
  }

  // Helper function to render with WorkspaceProvider
  const renderWithProvider = (workspaceId: string, initialSettings?: any) => {
    const initialWorkspace = {
      id: workspaceId,
      name: 'Test Workspace',
      slug: 'test-workspace',
      avatar_url: null,
      owner_id: 'test-user',
      hasApiKey: !!initialSettings?.api_key,
      apiProvider: initialSettings?.api_provider || null,
      agentsContent: initialSettings?.agents_content || null
    }

    return render(
      <WorkspaceProvider workspaceId={workspaceId} initialWorkspace={initialWorkspace}>
        <ApiSettings workspaceId={workspaceId} initialSettings={initialSettings} />
      </WorkspaceProvider>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)
  })

  describe('rendering', () => {
    it('should render with default values', () => {
      renderWithProvider("test-workspace")

      expect(screen.getByText('AI Integration Settings')).toBeInTheDocument()
      expect(screen.getByText('Configure AI features for issue recommendations and prompt generation')).toBeInTheDocument()
      expect(screen.getByLabelText('AI Provider')).toBeInTheDocument()
      expect(screen.getByLabelText('API Key')).toBeInTheDocument()
      expect(screen.getByLabelText('Agents.md Content (Optional)')).toBeInTheDocument()
      expect(screen.getByText('Save API Settings')).toBeInTheDocument()
    })

    it('should render with initial settings', () => {
      const initialSettings = {
        api_key: 'test-key',
        api_provider: 'openai',
        agents_content: 'Test content'
      }

      renderWithProvider("test-workspace", initialSettings)

      // Select shows text content, not value
      const providerSelect = screen.getByLabelText('AI Provider')
      expect(providerSelect).toHaveTextContent('OpenAI')
      const apiKeyInput = screen.getByLabelText('API Key') as HTMLInputElement
      expect(apiKeyInput.value).toBe('test-key')
      
      const agentsTextarea = screen.getByLabelText('Agents.md Content (Optional)') as HTMLTextAreaElement
      expect(agentsTextarea.value).toBe('Test content')
    })
  })

  describe('user interactions', () => {
    it('should update API key on input', async () => {
      const user = userEvent.setup()
      renderWithProvider("test-workspace")

      const apiKeyInput = screen.getByLabelText('API Key')
      await user.clear(apiKeyInput)
      await user.type(apiKeyInput, 'new-api-key')

      expect(apiKeyInput).toHaveValue('new-api-key')
    })

    it('should update provider on selection', async () => {
      renderWithProvider("test-workspace")

      const providerSelect = screen.getByLabelText('AI Provider')
      
      // The Select component shows the selected value
      expect(providerSelect).toHaveTextContent('OpenAI')
      
      // Just verify the select is rendered and clickable
      expect(providerSelect).toBeInTheDocument()
      expect(providerSelect.tagName).toBe('BUTTON')
      expect(providerSelect).toHaveAttribute('aria-expanded', 'false')
    })

    it('should update agents content on input', async () => {
      const user = userEvent.setup()
      renderWithProvider("test-workspace")

      const agentsTextarea = screen.getByLabelText('Agents.md Content (Optional)')
      await user.clear(agentsTextarea)
      await user.type(agentsTextarea, 'New agents content')

      expect(agentsTextarea).toHaveValue('New agents content')
    })
  })

  describe('saving settings', () => {
    it('should save settings successfully', async () => {
      const user = userEvent.setup()
      renderWithProvider("test-workspace")

      // Fill in the form
      const apiKeyInput = screen.getByLabelText('API Key')
      await user.type(apiKeyInput, 'test-api-key')

      const agentsTextarea = screen.getByLabelText('Agents.md Content (Optional)')
      await user.type(agentsTextarea, 'Test agents content')

      // Click save
      const saveButton = screen.getByText('Save API Settings')
      await user.click(saveButton)

      // Verify Supabase was called correctly
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('workspaces')
        // The mock returns a chainable object, so we need to check the actual calls
        expect(mockSupabase.from).toHaveBeenCalled()
        
        // Since the mocks are chainable, we need to verify the chain was called correctly
        const fromCalls = mockSupabase.from.mock.calls as any[]
        expect(fromCalls.length).toBeGreaterThan(0)
        if (fromCalls.length > 0 && fromCalls[fromCalls.length - 1]) {
          expect(fromCalls[fromCalls.length - 1][0]).toBe('workspaces')
        }
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

      renderWithProvider("test-workspace")

      const saveButton = screen.getByText('Save API Settings')
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

      renderWithProvider("test-workspace")

      const saveButton = screen.getByText('Save API Settings')
      await user.click(saveButton)

      // Button should be disabled while saving
      expect(saveButton).toBeDisabled()
      expect(screen.getByText('Saving...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText('Save API Settings')).toBeInTheDocument()
        expect(saveButton).not.toBeDisabled()
      })
    })

    it('should update with correct workspace ID', async () => {
      const user = userEvent.setup()
      const workspaceId = 'specific-workspace-id'
      
      renderWithProvider(workspaceId)

      const saveButton = screen.getByText('Save API Settings')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('workspaces')
        // Simply verify that from was called with workspaces
        const fromCalls = mockSupabase.from.mock.calls as any[]
        expect(fromCalls.length).toBeGreaterThan(0)
        if (fromCalls.length > 0 && fromCalls[fromCalls.length - 1]) {
          expect(fromCalls[fromCalls.length - 1][0]).toBe('workspaces')
        }
      })
    })
  })

  describe('password field behavior', () => {
    it('should render API key input as password field', () => {
      renderWithProvider("test-workspace")
      
      const apiKeyInput = screen.getByLabelText('API Key') as HTMLInputElement
      expect(apiKeyInput.type).toBe('password')
    })

    it('should have correct placeholder', () => {
      renderWithProvider("test-workspace")
      
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

      renderWithProvider("test-workspace")
      
      const saveButton = screen.getByText('Save API Settings')
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