import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditIssueModal } from '@/components/issues/edit-issue-modal'
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

describe('EditIssueModal - Prompt Generation', () => {
  const mockSupabase = {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
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

  const defaultIssue = {
    id: 'issue-123',
    title: 'Original title',
    description: 'Original description',
    type: 'BUG',
    priority: 'MEDIUM',
    status: 'OPEN',
    assigned_to: null,
    generated_prompt: null
  }

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    issue: defaultIssue,
    onIssueUpdated: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)
    vi.mocked(promptGenerator.generateIssuePrompt).mockResolvedValue({
      prompt: 'New generated prompt'
    })
  })

  describe('prompt generation toggle display', () => {
    it('should show "Generate" text when issue has no prompt', async () => {
      render(<EditIssueModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Generate an AI prompt for development agents')).toBeInTheDocument()
      })
    })

    it('should show "Update" text when issue has existing prompt', async () => {
      const issueWithPrompt = {
        ...defaultIssue,
        generated_prompt: 'Existing prompt'
      }

      render(<EditIssueModal {...defaultProps} issue={issueWithPrompt} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Update AI prompt for development agents')).toBeInTheDocument()
      })
    })

    it('should have toggle checked when issue has prompt', async () => {
      const issueWithPrompt = {
        ...defaultIssue,
        generated_prompt: 'Existing prompt'
      }

      render(<EditIssueModal {...defaultProps} issue={issueWithPrompt} />)

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
        generated_prompt: 'Existing prompt'
      }

      render(<EditIssueModal {...defaultProps} issue={issueWithPrompt} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument()
      })

      // Update title
      const titleInput = screen.getByLabelText('Title')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated title')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update issue/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(promptGenerator.generateIssuePrompt).toHaveBeenCalledWith({
          title: 'Updated title',
          description: 'Original description',
          apiKey: 'test-key',
          provider: 'openai',
          agentsContent: undefined
        })
      })

      // Verify update includes new prompt
      const updateCall = mockSupabase.from('issues').update
      expect(updateCall).toHaveBeenCalledWith(expect.objectContaining({
        generated_prompt: 'New generated prompt'
      }))
    })

    it('should keep existing prompt when content unchanged', async () => {
      const user = userEvent.setup()
      const issueWithPrompt = {
        ...defaultIssue,
        generated_prompt: 'Existing prompt'
      }

      render(<EditIssueModal {...defaultProps} issue={issueWithPrompt} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Priority')).toBeInTheDocument()
      })

      // Only change priority (not title/description)
      const prioritySelect = screen.getByLabelText('Priority')
      fireEvent.change(prioritySelect, { target: { value: 'HIGH' } })

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update issue/i })
      await user.click(submitButton)

      await waitFor(() => {
        // Should not generate new prompt
        expect(promptGenerator.generateIssuePrompt).not.toHaveBeenCalled()
        
        // Should keep existing prompt
        const updateCall = mockSupabase.from('issues').update
        expect(updateCall).toHaveBeenCalledWith(expect.objectContaining({
          generated_prompt: 'Existing prompt'
        }))
      })
    })

    it('should remove prompt when toggle is turned off', async () => {
      const user = userEvent.setup()
      const issueWithPrompt = {
        ...defaultIssue,
        generated_prompt: 'Existing prompt'
      }

      render(<EditIssueModal {...defaultProps} issue={issueWithPrompt} />)

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeInTheDocument()
      })

      // Turn off prompt generation
      const toggle = screen.getByRole('switch')
      await user.click(toggle)

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update issue/i })
      await user.click(submitButton)

      await waitFor(() => {
        // Should not generate prompt
        expect(promptGenerator.generateIssuePrompt).not.toHaveBeenCalled()
        
        // Should remove prompt
        const updateCall = mockSupabase.from('issues').update
        expect(updateCall).toHaveBeenCalledWith(expect.objectContaining({
          generated_prompt: null
        }))
      })
    })

    it('should generate prompt for issue without prompt when enabled', async () => {
      const user = userEvent.setup()
      render(<EditIssueModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeInTheDocument()
      })

      // Enable prompt generation
      const toggle = screen.getByRole('switch')
      await user.click(toggle)

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update issue/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(promptGenerator.generateIssuePrompt).toHaveBeenCalledWith({
          title: 'Original title',
          description: 'Original description',
          apiKey: 'test-key',
          provider: 'openai',
          agentsContent: undefined
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

      render(<EditIssueModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument()
      })

      // Enable prompt and change content
      const toggle = screen.getByRole('switch')
      await user.click(toggle)
      
      const titleInput = screen.getByLabelText('Title')
      await user.clear(titleInput)
      await user.type(titleInput, 'New title')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update issue/i })
      await user.click(submitButton)

      // Should show loading state
      expect(screen.getByText('Generating prompt...')).toBeInTheDocument()

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

      render(<EditIssueModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument()
      })

      // Enable prompt and change content
      const toggle = screen.getByRole('switch')
      await user.click(toggle)
      
      const titleInput = screen.getByLabelText('Title')
      await user.clear(titleInput)
      await user.type(titleInput, 'New title')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update issue/i })
      await user.click(submitButton)

      await waitFor(() => {
        // Should still update issue, but without prompt
        const updateCall = mockSupabase.from('issues').update
        expect(updateCall).toHaveBeenCalledWith(expect.objectContaining({
          generated_prompt: null
        }))
      })
    })

    it('should handle database update errors', async () => {
      const user = userEvent.setup()
      
      // Mock database error
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: new Error('Database error') }))
        }))
      })

      render(<EditIssueModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument()
      })

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update issue/i })
      await user.click(submitButton)

      await waitFor(() => {
        // Modal should remain open on error
        expect(defaultProps.onOpenChange).not.toHaveBeenCalled()
      })
    })
  })

  describe('Agents.md integration', () => {
    it('should fetch and use Agents.md content when generating prompt', async () => {
      const user = userEvent.setup()
      
      // Mock getAgentsContent
      vi.mocked(promptGenerator.getAgentsContent).mockResolvedValue('Agents.md content here')

      render(<EditIssueModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument()
      })

      // Enable prompt and change content
      const toggle = screen.getByRole('switch')
      await user.click(toggle)
      
      const titleInput = screen.getByLabelText('Title')
      await user.clear(titleInput)
      await user.type(titleInput, 'New title')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update issue/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(promptGenerator.getAgentsContent).toHaveBeenCalledWith('test-workspace')
        expect(promptGenerator.generateIssuePrompt).toHaveBeenCalledWith(
          expect.objectContaining({
            agentsContent: 'Agents.md content here'
          })
        )
      })
    })
  })

  describe('API key handling', () => {
    it('should hide prompt toggle when no API key is configured', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      })

      render(<EditIssueModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument()
      })

      // Prompt toggle should not be visible
      expect(screen.queryByRole('switch')).not.toBeInTheDocument()
      expect(screen.queryByText(/AI prompt/)).not.toBeInTheDocument()
    })
  })
})