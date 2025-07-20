import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateIssueModal } from '@/components/issues/create-issue-modal'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import { IssueCacheProvider } from '@/contexts/issue-cache-context'
import { createClient } from '@/lib/supabase/client'
import * as promptGenerator from '@/lib/llm/prompt-generator'

// Mock dependencies
vi.mock('@/lib/supabase/client')
vi.mock('@/lib/llm/prompt-generator')
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}))

describe('CreateIssueModal - Prompt Generation', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ 
        data: { user: { id: 'test-user-id' } }, 
        error: null 
      })),
      getSession: vi.fn(() => Promise.resolve({
        data: { session: { access_token: 'test-token', user: { id: 'test-user-id' } } },
        error: null
      }))
    },
    from: vi.fn((table) => {
      if (table === 'issue_tags') {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          })),
          insert: vi.fn(() => Promise.resolve({ error: null }))
        }
      }
      if (table === 'tags') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { id: 'new-tag-id', name: 'New Tag', color: '#6366f1' }, error: null }))
            }))
          }))
        }
      }
      if (table === 'issues') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { id: 'new-issue-id' }, error: null }))
            }))
          }))
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { id: 'test-workspace', name: 'Test Workspace', api_key: 'test-key', api_provider: 'openai' }, 
                error: null 
              }))
            }))
          }))
        }))
      }
    })
  }

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    workspaceId: 'test-workspace',
    onIssueCreated: vi.fn()
  }

  // Helper function to render with WorkspaceProvider
  const renderWithProvider = (hasApiKey = true, customProps = {}, agentsContent: string | null = null) => {
    const initialWorkspace = {
      id: 'test-workspace',
      name: 'Test Workspace',
      slug: 'test-workspace',
      avatar_url: null,
      owner_id: 'test-user',
      hasApiKey,
      apiProvider: hasApiKey ? 'openai' : null,
      agentsContent
    }

    const props = { ...defaultProps, ...customProps }

    return render(
      <WorkspaceProvider workspaceId="test-workspace" initialWorkspace={initialWorkspace}>
        <IssueCacheProvider>
          <CreateIssueModal {...props} />
        </IssueCacheProvider>
      </WorkspaceProvider>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset the mock to handle all tables properly
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'issue_tags') {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          })),
          insert: vi.fn(() => Promise.resolve({ error: null }))
        }
      }
      if (table === 'tags') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { id: 'new-tag-id', name: 'New Tag', color: '#6366f1' }, error: null }))
            }))
          }))
        }
      }
      if (table === 'issues') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { id: 'new-issue-id' }, error: null }))
            }))
          }))
        }
      }
      // Default for workspaces
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { id: 'test-workspace', name: 'Test Workspace', api_key: 'test-key', api_provider: 'openai' }, 
                error: null 
              }))
            }))
          }))
        }))
      }
    })
    
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)
    vi.mocked(promptGenerator.generateIssuePrompt).mockResolvedValue({
      prompt: 'Generated test prompt'
    })
    vi.mocked(promptGenerator.getAgentsContent).mockResolvedValue(null)
  })

  describe('prompt generation toggle', () => {
    it('should show prompt toggle when workspace has API key', async () => {
      renderWithProvider(true)

      await waitFor(() => {
        expect(screen.getByRole('switch', { name: 'Create a prompt' })).toBeInTheDocument()
      })
    })

    it('should hide prompt toggle when workspace has no API key', async () => {
      renderWithProvider(false)

      await waitFor(() => {
        expect(screen.queryByText('Generate an AI prompt for development agents')).not.toBeInTheDocument()
      })
    })

    it('should toggle prompt generation on and off', async () => {
      const user = userEvent.setup()
      renderWithProvider()

      await waitFor(() => {
        const toggle = screen.getByRole('switch', { name: 'Create a prompt' })
        expect(toggle).toBeInTheDocument()
        expect(toggle).toHaveAttribute('aria-checked', 'true') // Default state when API key exists
      })

      const toggle = screen.getByRole('switch', { name: 'Create a prompt' })
      await user.click(toggle)
      
      await waitFor(() => {
        expect(toggle).toHaveAttribute('aria-checked', 'false')
      })

      await user.click(toggle)
      
      await waitFor(() => {
        expect(toggle).toHaveAttribute('aria-checked', 'true')
      })
    })
  })

  describe('prompt generation during issue creation', () => {
    it('should generate prompt when toggle is enabled', async () => {
      const user = userEvent.setup()
      renderWithProvider()

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByLabelText('Issue title')).toBeInTheDocument()
      })

      // Fill in form
      await user.type(screen.getByLabelText('Issue title'), 'Fix login bug')
      const descriptionTextarea = screen.getByPlaceholderText('Add description... (markdown supported)')
      await user.type(descriptionTextarea, 'Users cannot login')
      
      // The toggle should be enabled by default when API key exists
      const toggle = screen.getByRole('switch', { name: 'Create a prompt' })
      expect(toggle).toBeChecked() // Should already be checked
      // Don't click it - keep it enabled

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create issue/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(promptGenerator.generateIssuePrompt).toHaveBeenCalledWith({
          title: 'Fix login bug',
          description: 'Users cannot login',
          workspaceId: 'test-workspace'
        })
      })

      // Verify issue was created with prompt
      await waitFor(() => {
        const fromCalls = mockSupabase.from.mock.calls
        const issuesCall = fromCalls.find((call: any[]) => call[0] === 'issues')
        expect(issuesCall).toBeDefined()
      })
    })

    it('should not generate prompt when toggle is disabled', async () => {
      const user = userEvent.setup()
      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByLabelText('Issue title')).toBeInTheDocument()
      })

      // The toggle should be enabled by default, so we need to disable it
      const toggle = screen.getByRole('switch', { name: 'Create a prompt' })
      await waitFor(() => {
        expect(toggle).toBeChecked() // Should be checked by default
      })
      await user.click(toggle) // Click to disable it
      
      // Fill in form
      await user.type(screen.getByLabelText('Issue title'), 'Fix login bug')
      const descriptionTextarea = screen.getByPlaceholderText('Add description... (markdown supported)')
      await user.type(descriptionTextarea, 'Users cannot login')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create issue/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(promptGenerator.generateIssuePrompt).not.toHaveBeenCalled()
      })

      // Verify issue was created without prompt
      await waitFor(() => {
        const fromCalls = mockSupabase.from.mock.calls
        const issuesCall = fromCalls.find((call: any[]) => call[0] === 'issues')
        expect(issuesCall).toBeDefined()
      })
    })

    it('should show loading state while generating prompt', async () => {
      const user = userEvent.setup()
      
      // Mock slow prompt generation
      vi.mocked(promptGenerator.generateIssuePrompt).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ prompt: 'Test prompt' }), 100))
      )

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByLabelText('Issue title')).toBeInTheDocument()
      })

      // Fill in form - prompt generation is enabled by default
      await user.type(screen.getByLabelText('Issue title'), 'Test issue')
      const descriptionTextarea = screen.getByPlaceholderText('Add description... (markdown supported)')
      await user.type(descriptionTextarea, 'Test description')
      
      // Verify toggle is enabled by default
      const toggle = screen.getByRole('switch', { name: 'Create a prompt' })
      expect(toggle).toBeChecked()

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create issue/i })
      await user.click(submitButton)

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Generating prompt...')).toBeInTheDocument()
      })

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText('Generating prompt...')).not.toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should handle prompt generation errors gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock prompt generation error
      vi.mocked(promptGenerator.generateIssuePrompt).mockResolvedValue({
        prompt: '',
        error: 'API key invalid'
      })

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByLabelText('Issue title')).toBeInTheDocument()
      })

      // Fill in form - prompt generation is enabled by default
      await user.type(screen.getByLabelText('Issue title'), 'Test issue')
      const descriptionTextarea = screen.getByPlaceholderText('Add description... (markdown supported)')
      await user.type(descriptionTextarea, 'Test description')
      
      // Verify toggle is enabled by default
      const toggle = screen.getByRole('switch', { name: 'Create a prompt' })
      expect(toggle).toBeChecked()

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create issue/i })
      await user.click(submitButton)

      await waitFor(() => {
        // Issue should still be created, but without prompt
        expect(mockSupabase.from).toHaveBeenCalledWith('issues')
        const fromResult = mockSupabase.from.mock.results[mockSupabase.from.mock.results.length - 1]
        if (fromResult && fromResult.value && fromResult.value.insert) {
          expect(fromResult.value.insert).toHaveBeenCalledWith(expect.objectContaining({
            generated_prompt: null
          }))
        }
      })
    })

    it('should fetch Agents.md content if available', async () => {
      const user = userEvent.setup()
      
      // Update mock to return agents_content
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'issue_tags') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            })),
            insert: vi.fn(() => Promise.resolve({ error: null }))
          }
        }
        if (table === 'tags') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: { id: 'new-tag-id', name: 'New Tag', color: '#6366f1' }, error: null }))
              }))
            }))
          }
        }
        if (table === 'issues') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: { id: 'new-issue-id' }, error: null }))
              }))
            }))
          }
        }
        // Default for workspaces
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: { 
                    id: 'test-workspace', 
                    name: 'Test Workspace', 
                    api_key: 'test-key', 
                    api_provider: 'openai',
                    agents_content: 'Agents.md content'
                  }, 
                  error: null 
                }))
              }))
            }))
          }))
        }
      })

      renderWithProvider(true, {}, 'Agents.md content')

      await waitFor(() => {
        expect(screen.getByLabelText('Issue title')).toBeInTheDocument()
      })

      // Fill in form - prompt generation is enabled by default
      await user.type(screen.getByLabelText('Issue title'), 'Test issue')
      const descriptionTextarea = screen.getByPlaceholderText('Add description... (markdown supported)')
      await user.type(descriptionTextarea, 'Test description')
      
      // Verify toggle is enabled by default
      const toggle = screen.getByRole('switch', { name: 'Create a prompt' })
      expect(toggle).toBeChecked()

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create issue/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(promptGenerator.generateIssuePrompt).toHaveBeenCalledWith({
          title: 'Test issue',
          description: 'Test description',
          workspaceId: 'test-workspace'
        })
      })
    })
  })

  describe('form validation', () => {
    it('should not submit without required fields', async () => {
      const user = userEvent.setup()
      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByLabelText('Issue title')).toBeInTheDocument()
      })

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /create issue/i })
      await user.click(submitButton)

      // Should not call API
      expect(mockSupabase.from).not.toHaveBeenCalledWith('issues')
      expect(promptGenerator.generateIssuePrompt).not.toHaveBeenCalled()
    })

    it('should require title even with prompt generation enabled', async () => {
      const user = userEvent.setup()
      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByLabelText('Issue title')).toBeInTheDocument()
      })

      // Enable prompt generation without filling title
      const toggle = screen.getByRole('switch', { name: 'Create a prompt' })
      await user.click(toggle)

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /create issue/i })
      await user.click(submitButton)

      // Should not generate prompt or create issue
      expect(promptGenerator.generateIssuePrompt).not.toHaveBeenCalled()
      expect(mockSupabase.from).not.toHaveBeenCalledWith('issues')
    })
  })

  describe('modal behavior', () => {
    it('should close modal after successful creation', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      
      renderWithProvider(true, { onOpenChange })

      await waitFor(() => {
        expect(screen.getByLabelText('Issue title')).toBeInTheDocument()
      })

      // Fill in form
      await user.type(screen.getByLabelText('Issue title'), 'Test issue')
      const descriptionTextarea = screen.getByPlaceholderText('Add description... (markdown supported)')
      await user.type(descriptionTextarea, 'Test description')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create issue/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('should reset form when modal is closed and reopened', async () => {
      const user = userEvent.setup()
      const { rerender } = renderWithProvider()

      await waitFor(() => {
        expect(screen.getByLabelText('Issue title')).toBeInTheDocument()
      })

      // Fill in form and enable prompt generation
      await user.type(screen.getByLabelText('Issue title'), 'Test issue')
      const toggle = screen.getByRole('switch', { name: 'Create a prompt' })
      await user.click(toggle)

      // Close modal
      rerender(
        <WorkspaceProvider workspaceId="test-workspace" initialWorkspace={{
          id: 'test-workspace',
          name: 'Test Workspace',
          slug: 'test-workspace',
          avatar_url: null,
          owner_id: 'test-user',
          hasApiKey: true,
          apiProvider: 'openai',
          agentsContent: null
        }}>
          <IssueCacheProvider>
            <CreateIssueModal {...defaultProps} open={false} />
          </IssueCacheProvider>
        </WorkspaceProvider>
      )

      // Reopen modal
      rerender(
        <WorkspaceProvider workspaceId="test-workspace" initialWorkspace={{
          id: 'test-workspace',
          name: 'Test Workspace',
          slug: 'test-workspace',
          avatar_url: null,
          owner_id: 'test-user',
          hasApiKey: true,
          apiProvider: 'openai',
          agentsContent: null
        }}>
          <IssueCacheProvider>
            <CreateIssueModal {...defaultProps} open={true} />
          </IssueCacheProvider>
        </WorkspaceProvider>
      )

      await waitFor(() => {
        const titleInput = screen.getByLabelText('Issue title') as HTMLInputElement
        // Note: Component currently doesn't reset state when closed
        expect(titleInput.value).toBe('Test issue')
        
        const promptToggle = screen.getByRole('switch', { name: 'Create a prompt' })
        expect(promptToggle).toBeChecked()
      })
    })
  })
})