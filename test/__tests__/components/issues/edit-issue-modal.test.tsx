import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditIssueModal } from '@/components/issues/edit-issue-modal'
import { WorkspaceProvider } from '@/contexts/workspace-context'
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
vi.mock('@/lib/tags', () => ({
  getWorkspaceTags: vi.fn(() => Promise.resolve([])),
  createTag: vi.fn(() => Promise.resolve({ id: 'new-tag-id' })),
  updateIssueTags: vi.fn(() => Promise.resolve()),
  getIssueTags: vi.fn(() => Promise.resolve([]))
}))

describe('EditIssueModal - Prompt Generation', () => {
  const mockSupabase = {
    auth: {
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
          insert: vi.fn(() => Promise.resolve({ error: null })),
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }
      }
      if (table === 'tags') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        }
      }
      return {
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        })),
        select: vi.fn(() => {
          // Support chained .eq() calls
          const chainableQuery = {
            eq: vi.fn(() => chainableQuery),
            single: vi.fn(() => Promise.resolve({ 
              data: { id: 'test-workspace-id', name: 'Test Workspace', api_key: 'test-key', api_provider: 'openai' }, 
              error: null 
            }))
          }
          return chainableQuery
        })
      }
    })
  }

  const defaultIssue = {
    id: 'issue-123',
    title: 'Original title',
    description: 'Original description',
    type: 'bug' as const,
    priority: 'medium' as const,
    status: 'todo' as const,
    assigned_to: null,
    generated_prompt: null,
    workspace_id: 'test-workspace-id'
  }

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    issue: defaultIssue,
    onIssueUpdated: vi.fn()
  }

  // Helper function to render with WorkspaceProvider
  const renderWithProvider = (hasApiKey = true, customProps = {}) => {
    const initialWorkspace = {
      id: 'test-workspace',
      name: 'Test Workspace',
      slug: 'test-workspace',
      avatar_url: null,
      owner_id: 'test-user',
      hasApiKey,
      apiProvider: hasApiKey ? 'openai' : null,
      agentsContent: null
    }

    const props = { ...defaultProps, ...customProps }

    return render(
      <WorkspaceProvider workspaceId="test-workspace" initialWorkspace={initialWorkspace}>
        <EditIssueModal {...props} />
      </WorkspaceProvider>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock fetch API
    global.fetch = vi.fn(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response)
    )
    
    // Reset the mock implementation but preserve the tag-related functionality
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'issue_tags') {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          })),
          insert: vi.fn(() => Promise.resolve({ error: null })),
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }
      }
      if (table === 'tags') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        }
      }
      if (table === 'issues') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          }))
        }
      }
      return {
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        })),
        select: vi.fn(() => {
          // Support chained .eq() calls
          const chainableQuery = {
            eq: vi.fn(() => chainableQuery),
            single: vi.fn(() => Promise.resolve({ 
              data: { id: 'test-workspace-id', name: 'Test Workspace', api_key: 'test-key', api_provider: 'openai' }, 
              error: null 
            }))
          }
          return chainableQuery
        })
      }
    })
    
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)
    vi.mocked(promptGenerator.generateIssuePrompt).mockResolvedValue({
      prompt: 'New generated prompt'
    })
    vi.mocked(promptGenerator.getAgentsContent).mockResolvedValue(null)
  })

  describe('prompt generation toggle display', () => {
    it('should show "Generate" text when issue has no prompt', async () => {
      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByText('Generate an AI prompt for development agents')).toBeInTheDocument()
      })
    })

    it('should show "Update" text when issue has existing prompt', async () => {
      const issueWithPrompt = {
        ...defaultIssue,
        generated_prompt: 'Existing prompt',
        workspace_id: 'test-workspace-id'
      }

      renderWithProvider(true, { issue: issueWithPrompt })

      await waitFor(() => {
        expect(screen.getByText('Update AI prompt for development agents')).toBeInTheDocument()
      })
    })

    it('should have toggle checked when issue has prompt', async () => {
      const issueWithPrompt = {
        ...defaultIssue,
        generated_prompt: 'Existing prompt',
        workspace_id: 'test-workspace-id'
      }

      renderWithProvider(true, { issue: issueWithPrompt })

      await waitFor(() => {
        const toggle = screen.getByRole('switch')
        expect(toggle).toBeChecked()
      })
    })
  })

  describe('prompt update behavior', () => {
    it('should generate new prompt only when content changes', async () => {
      const user = userEvent.setup()
      const issueWithPrompt = {
        ...defaultIssue,
        generated_prompt: 'Existing prompt',
        workspace_id: 'test-workspace-id'
      }

      renderWithProvider(true, { issue: issueWithPrompt })

      await waitFor(() => {
        expect(screen.getByLabelText('Issue title')).toBeInTheDocument()
      })

      // The toggle is already checked for issues with existing prompts
      const toggle = screen.getByRole('switch')
      expect(toggle).toBeChecked()

      // Update title
      const titleInput = screen.getByLabelText('Issue title')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated title')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(promptGenerator.generateIssuePrompt).toHaveBeenCalledWith({
          title: 'Updated title',
          description: 'Original description',
          workspaceId: 'test-workspace-id'
        })
      })

      // Verify update includes new prompt
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/workspaces/test-workspace/issues/issue-123'),
          expect.objectContaining({
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"generated_prompt":"New generated prompt"')
          })
        )
      })
    })

    it('should keep existing prompt when content unchanged', async () => {
      const user = userEvent.setup()
      const issueWithPrompt = {
        ...defaultIssue,
        generated_prompt: 'Existing prompt',
        workspace_id: 'test-workspace-id'
      }

      renderWithProvider(true, { issue: issueWithPrompt })

      await waitFor(() => {
        expect(screen.getByLabelText('Priority')).toBeInTheDocument()
      })

      // Only change priority (not title/description)
      const prioritySelect = screen.getByLabelText('Priority')
      fireEvent.change(prioritySelect, { target: { value: 'HIGH' } })

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(submitButton)

      await waitFor(() => {
        // Should not generate new prompt
        expect(promptGenerator.generateIssuePrompt).not.toHaveBeenCalled()
        
        // Should keep existing prompt
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/workspaces/test-workspace/issues/issue-123'),
          expect.objectContaining({
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"generated_prompt":"Existing prompt"')
          })
        )
      })
    })

    it('should remove prompt when toggle is turned off', async () => {
      const user = userEvent.setup()
      const issueWithPrompt = {
        ...defaultIssue,
        generated_prompt: 'Existing prompt',
        workspace_id: 'test-workspace-id'
      }

      renderWithProvider(true, { issue: issueWithPrompt })

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeInTheDocument()
      })

      // Turn off prompt generation
      const toggle = screen.getByRole('switch')
      await user.click(toggle)

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(submitButton)

      await waitFor(() => {
        // Should not generate prompt
        expect(promptGenerator.generateIssuePrompt).not.toHaveBeenCalled()
        
        // Should remove prompt
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/workspaces/test-workspace/issues/issue-123'),
          expect.objectContaining({
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"generated_prompt":null')
          })
        )
      })
    })

    it('should generate prompt for issue without prompt when enabled', async () => {
      const user = userEvent.setup()
      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeInTheDocument()
      })

      // The toggle is automatically enabled when workspace has API key and issue has no prompt
      const toggle = screen.getByRole('switch')
      expect(toggle).toBeChecked()

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(promptGenerator.generateIssuePrompt).toHaveBeenCalledWith({
          title: 'Original title',
          description: 'Original description',
          workspaceId: 'test-workspace-id'
        })
      })
    })
  })

  describe('loading states', () => {
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

      // The toggle should be ON by default when workspace has API key and issue has no prompt
      const toggle = screen.getByRole('switch')
      expect(toggle).toBeChecked()
      
      const titleInput = screen.getByLabelText('Issue title')
      await user.clear(titleInput)
      await user.type(titleInput, 'New title')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(submitButton)

      // Should show loading state in button
      await waitFor(() => {
        // Find the button by looking for the loading text
        expect(screen.getByText('Generating prompt...')).toBeInTheDocument()
      }, { timeout: 2000 })

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText('Generating prompt...')).not.toBeInTheDocument()
      })
    })
  })

  describe('error handling', () => {
    it('should handle prompt generation errors gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock prompt generation error
      vi.mocked(promptGenerator.generateIssuePrompt).mockResolvedValue({
        prompt: '',
        error: 'API error occurred'
      })

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByLabelText('Issue title')).toBeInTheDocument()
      })

      // Toggle is already enabled by default
      const toggle = screen.getByRole('switch')
      expect(toggle).toBeChecked()
      
      const titleInput = screen.getByLabelText('Issue title')
      await user.clear(titleInput)
      await user.type(titleInput, 'New title')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(submitButton)

      await waitFor(() => {
        // Should still update issue, but without prompt
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/workspaces/test-workspace/issues/issue-123'),
          expect.objectContaining({
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: expect.any(String)
          })
        )
      })
    })

    it('should handle database update errors', async () => {
      const user = userEvent.setup()
      
      // Mock error response for the update operation
      global.fetch = vi.fn(() => 
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Database error' })
        } as Response)
      )

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByLabelText('Issue title')).toBeInTheDocument()
      })

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(submitButton)

      await waitFor(() => {
        // Should show error message
        expect(screen.getByText(/Failed to update issue/)).toBeInTheDocument()
      })
    })
  })

  describe('Agents.md integration', () => {
    it('should use Agents.md content from workspace when generating prompt', async () => {
      const user = userEvent.setup()
      
      // Mock workspace with agents_content
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'issue_tags') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            })),
            insert: vi.fn(() => Promise.resolve({ error: null })),
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }
        }
        if (table === 'tags') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          }
        }
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { 
                  id: 'test-workspace', 
                  name: 'Test Workspace', 
                  api_key: 'test-key', 
                  api_provider: 'openai',
                  agents_content: 'Agents.md content here'
                }, 
                error: null 
              }))
            }))
          }))
        }
      })

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByLabelText('Issue title')).toBeInTheDocument()
      })

      // The toggle should be ON by default when workspace has API key and issue has no prompt
      const toggle = screen.getByRole('switch')
      expect(toggle).toBeChecked()
      
      const titleInput = screen.getByLabelText('Issue title')
      await user.clear(titleInput)
      await user.type(titleInput, 'New title')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(promptGenerator.generateIssuePrompt).toHaveBeenCalledWith(
          expect.objectContaining({
            workspaceId: 'test-workspace-id'
          })
        )
      })
    })
  })

  describe('API key handling', () => {
    it('should hide prompt toggle when no API key is configured', async () => {
      // Mock workspace query to return no data (no API key)
      mockSupabase.from.mockImplementation(((table: string) => {
        if (table === 'workspaces') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: null, error: null }))
              }))
            }))
          }
        }
        // Return default mocks for other tables
        if (table === 'issue_tags') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            })),
            insert: vi.fn(() => Promise.resolve({ error: null })),
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }
        }
        if (table === 'tags') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          }
        }
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          }))
        }
      }) as any)

      renderWithProvider(false)

      await waitFor(() => {
        expect(screen.getByLabelText('Issue title')).toBeInTheDocument()
      })

      // Prompt toggle should be disabled when no API key
      const promptToggle = screen.getByRole('switch')
      expect(promptToggle).toBeDisabled()
      expect(screen.getByText('API key required in workspace settings')).toBeInTheDocument()
    })
  })
})