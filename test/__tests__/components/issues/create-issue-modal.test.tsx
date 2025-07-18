import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateIssueModal } from '@/components/issues/create-issue-modal'
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
      }))
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: [{ id: 'new-issue-id' }], error: null }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { api_key: 'test-key', api_provider: 'openai' }, 
            error: null 
          }))
        }))
      }))
    }))
  }

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    workspaceId: 'test-workspace',
    onIssueCreated: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)
    vi.mocked(promptGenerator.generateIssuePrompt).mockResolvedValue({
      prompt: 'Generated test prompt'
    })
  })

  describe('prompt generation toggle', () => {
    it('should show prompt toggle when workspace has API key', async () => {
      render(<CreateIssueModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Generate an AI prompt for development agents')).toBeInTheDocument()
      })
    })

    it('should hide prompt toggle when workspace has no API key', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      } as any)

      render(<CreateIssueModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.queryByLabelText('Generate an AI prompt for development agents')).not.toBeInTheDocument()
      })
    })

    it('should toggle prompt generation on and off', async () => {
      const user = userEvent.setup()
      render(<CreateIssueModal {...defaultProps} />)

      await waitFor(() => {
        const toggle = screen.getByLabelText('Generate an AI prompt for development agents')
        expect(toggle).not.toBeChecked()
      })

      const toggle = screen.getByLabelText('Generate an AI prompt for development agents')
      await user.click(toggle)
      expect(toggle).toBeChecked()

      await user.click(toggle)
      expect(toggle).not.toBeChecked()
    })
  })

  describe('prompt generation during issue creation', () => {
    it('should generate prompt when toggle is enabled', async () => {
      const user = userEvent.setup()
      render(<CreateIssueModal {...defaultProps} />)

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument()
      })

      // Fill in form
      await user.type(screen.getByLabelText('Title'), 'Fix login bug')
      await user.type(screen.getByLabelText('Description'), 'Users cannot login')
      
      // Enable prompt generation
      const toggle = screen.getByLabelText('Generate an AI prompt for development agents')
      await user.click(toggle)

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create issue/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(promptGenerator.generateIssuePrompt).toHaveBeenCalledWith({
          title: 'Fix login bug',
          description: 'Users cannot login',
          apiKey: 'test-key',
          provider: 'openai',
          agentsContent: undefined
        })
      })

      // Verify issue was created with prompt
      await waitFor(() => {
        const fromCall = mockSupabase.from.mock.calls.find(call => call[0] === 'issues')
        expect(fromCall).toBeDefined()
      })
    })

    it('should not generate prompt when toggle is disabled', async () => {
      const user = userEvent.setup()
      render(<CreateIssueModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument()
      })

      // Fill in form without enabling prompt generation
      await user.type(screen.getByLabelText('Title'), 'Fix login bug')
      await user.type(screen.getByLabelText('Description'), 'Users cannot login')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create issue/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(promptGenerator.generateIssuePrompt).not.toHaveBeenCalled()
      })

      // Verify issue was created without prompt
      await waitFor(() => {
        const fromCall = mockSupabase.from.mock.calls.find(call => call[0] === 'issues')
        expect(fromCall).toBeDefined()
      })
    })

    it('should show loading state while generating prompt', async () => {
      const user = userEvent.setup()
      
      // Mock slow prompt generation
      vi.mocked(promptGenerator.generateIssuePrompt).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ prompt: 'Test prompt' }), 100))
      )

      render(<CreateIssueModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument()
      })

      // Fill in form and enable prompt generation
      await user.type(screen.getByLabelText('Title'), 'Test issue')
      await user.type(screen.getByLabelText('Description'), 'Test description')
      
      const toggle = screen.getByLabelText('Generate an AI prompt for development agents')
      await user.click(toggle)

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create issue/i })
      await user.click(submitButton)

      // Should show loading state
      expect(screen.getByText('Generating prompt...')).toBeInTheDocument()

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText('Generating prompt...')).not.toBeInTheDocument()
      })
    })

    it('should handle prompt generation errors gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock prompt generation error
      vi.mocked(promptGenerator.generateIssuePrompt).mockResolvedValue({
        prompt: '',
        error: 'API key invalid'
      })

      render(<CreateIssueModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument()
      })

      // Fill in form and enable prompt generation
      await user.type(screen.getByLabelText('Title'), 'Test issue')
      await user.type(screen.getByLabelText('Description'), 'Test description')
      
      const toggle = screen.getByLabelText('Generate an AI prompt for development agents')
      await user.click(toggle)

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create issue/i })
      await user.click(submitButton)

      await waitFor(() => {
        // Issue should still be created, but without prompt
        const insertCall = mockSupabase.from('issues').insert
        expect(insertCall).toHaveBeenCalledWith(expect.objectContaining({
          generated_prompt: null
        }))
      })
    })

    it('should fetch Agents.md content if available', async () => {
      const user = userEvent.setup()
      
      // Mock getAgentsContent to return content
      vi.mocked(promptGenerator.getAgentsContent).mockResolvedValue('Agents.md content')

      render(<CreateIssueModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument()
      })

      // Fill in form and enable prompt generation
      await user.type(screen.getByLabelText('Title'), 'Test issue')
      await user.type(screen.getByLabelText('Description'), 'Test description')
      
      const toggle = screen.getByLabelText('Generate an AI prompt for development agents')
      await user.click(toggle)

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create issue/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(promptGenerator.getAgentsContent).toHaveBeenCalledWith('test-workspace')
        expect(promptGenerator.generateIssuePrompt).toHaveBeenCalledWith(
          expect.objectContaining({
            agentsContent: 'Agents.md content'
          })
        )
      })
    })
  })

  describe('form validation', () => {
    it('should not submit without required fields', async () => {
      const user = userEvent.setup()
      render(<CreateIssueModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument()
      })

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /create issue/i })
      await user.click(submitButton)

      // Should not call API
      expect(mockSupabase.from).not.toHaveBeenCalled()
      expect(promptGenerator.generateIssuePrompt).not.toHaveBeenCalled()
    })

    it('should require title even with prompt generation enabled', async () => {
      const user = userEvent.setup()
      render(<CreateIssueModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument()
      })

      // Enable prompt generation without filling title
      const toggle = screen.getByLabelText('Generate an AI prompt for development agents')
      await user.click(toggle)

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /create issue/i })
      await user.click(submitButton)

      // Should not generate prompt or create issue
      expect(promptGenerator.generateIssuePrompt).not.toHaveBeenCalled()
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
  })

  describe('modal behavior', () => {
    it('should close modal after successful creation', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      
      render(<CreateIssueModal {...defaultProps} onOpenChange={onOpenChange} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument()
      })

      // Fill in form
      await user.type(screen.getByLabelText('Title'), 'Test issue')
      await user.type(screen.getByLabelText('Description'), 'Test description')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create issue/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('should reset form when modal is closed and reopened', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<CreateIssueModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument()
      })

      // Fill in form and enable prompt generation
      await user.type(screen.getByLabelText('Title'), 'Test issue')
      const toggle = screen.getByLabelText('Generate an AI prompt for development agents')
      await user.click(toggle)

      // Close modal
      rerender(<CreateIssueModal {...defaultProps} open={false} />)

      // Reopen modal
      rerender(<CreateIssueModal {...defaultProps} open={true} />)

      await waitFor(() => {
        const titleInput = screen.getByLabelText('Title') as HTMLInputElement
        expect(titleInput.value).toBe('')
        
        const promptToggle = screen.getByLabelText('Generate an AI prompt for development agents')
        expect(promptToggle).not.toBeChecked()
      })
    })
  })
})