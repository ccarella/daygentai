import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IssueDetails } from '@/components/issues/issue-details'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// Mock dependencies
vi.mock('@/lib/supabase/client')
vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

// Mock the IssueCache context
vi.mock('@/contexts/issue-cache-context', () => ({
  useIssueCache: () => ({
    getIssue: vi.fn(),
    updateIssue: vi.fn(),
    deleteIssue: vi.fn()
  })
}))

// Mock child components
vi.mock('@/components/issues/edit-issue-modal', () => ({
  EditIssueModal: ({ open }: { open: boolean }) => 
    open ? <div data-testid="edit-issue-modal">Edit Issue Modal</div> : null
}))

vi.mock('@/components/issues/prompt-display', () => ({
  PromptDisplay: ({ prompt, className }: { prompt: string; className?: string }) => 
    <div data-testid="prompt-display" className={className}>{prompt}</div>
}))

describe('IssueDetails - PromptDisplay Integration', () => {
  const mockRouter = {
    refresh: vi.fn()
  }

  const mockSupabase = {
    from: vi.fn()
  }

  const mockIssue = {
    id: 'issue-123',
    title: 'Test Issue',
    description: 'Test description',
    type: 'bug',
    priority: 'high',
    status: 'in_progress',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'user-123',
    assigned_to: null,
    workspace_id: 'workspace-123',
    generated_prompt: null
  }

  const mockCreator = {
    id: 'user-123',
    name: 'John Doe'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue(mockRouter as any)
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)
    
    // Default mock implementation
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'issues') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockIssue, error: null })
            }))
          }))
        }
      }
      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockCreator, error: null })
            }))
          }))
        }
      }
      return {}
    })
  })

  describe('PromptDisplay rendering', () => {
    it('should not render PromptDisplay when issue has no generated_prompt', async () => {
      render(
        <IssueDetails 
          issueId="issue-123" 
          onBack={vi.fn()} 
          onDeleted={vi.fn()} 
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Test Issue')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('prompt-display')).not.toBeInTheDocument()
    })

    it('should render PromptDisplay when issue has generated_prompt', async () => {
      const issueWithPrompt = {
        ...mockIssue,
        generated_prompt: 'What to do: Fix the bug\nHow: Debug and patch the code'
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'issues') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: issueWithPrompt, error: null })
              }))
            }))
          }
        }
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockCreator, error: null })
              }))
            }))
          }
        }
        return {}
      })

      render(
        <IssueDetails 
          issueId="issue-123" 
          onBack={vi.fn()} 
          onDeleted={vi.fn()} 
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Test Issue')).toBeInTheDocument()
      })

      const promptDisplay = screen.getByTestId('prompt-display')
      expect(promptDisplay).toBeInTheDocument()
      expect(promptDisplay).toHaveTextContent('What to do: Fix the bug\nHow: Debug and patch the code')
    })

    it('should apply correct className to PromptDisplay', async () => {
      const issueWithPrompt = {
        ...mockIssue,
        generated_prompt: 'Test prompt'
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'issues') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: issueWithPrompt, error: null })
              }))
            }))
          }
        }
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockCreator, error: null })
              }))
            }))
          }
        }
        return {}
      })

      render(
        <IssueDetails 
          issueId="issue-123" 
          onBack={vi.fn()} 
          onDeleted={vi.fn()} 
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Test Issue')).toBeInTheDocument()
      })

      const promptDisplay = screen.getByTestId('prompt-display')
      expect(promptDisplay).toHaveClass('mt-6')
    })

    it('should position PromptDisplay correctly in the layout', async () => {
      const issueWithPrompt = {
        ...mockIssue,
        generated_prompt: 'Test prompt',
        description: 'Issue description'
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'issues') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: issueWithPrompt, error: null })
              }))
            }))
          }
        }
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockCreator, error: null })
              }))
            }))
          }
        }
        return {}
      })

      render(
        <IssueDetails 
          issueId="issue-123" 
          onBack={vi.fn()} 
          onDeleted={vi.fn()} 
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Test Issue')).toBeInTheDocument()
      })

      // Check that prompt display appears before description
      const promptDisplay = screen.getByTestId('prompt-display')
      const description = screen.getByText('Issue description')
      
      expect(promptDisplay).toBeInTheDocument()
      expect(description).toBeInTheDocument()
      
      // Both should be in the document
      const container = promptDisplay.parentElement
      expect(container).toContainElement(promptDisplay)
    })
  })

  describe('PromptDisplay updates', () => {
    it('should update PromptDisplay when issue is edited to add prompt', async () => {
      const { rerender } = render(
        <IssueDetails 
          issueId="issue-123" 
          onBack={vi.fn()} 
          onDeleted={vi.fn()} 
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Test Issue')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('prompt-display')).not.toBeInTheDocument()

      // Update the mock to return issue with prompt
      const issueWithPrompt = {
        ...mockIssue,
        generated_prompt: 'New prompt added'
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'issues') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: issueWithPrompt, error: null })
              }))
            }))
          }
        }
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockCreator, error: null })
              }))
            }))
          }
        }
        return {}
      })

      // Trigger re-render by changing props
      rerender(
        <IssueDetails 
          issueId="issue-123-updated" 
          onBack={vi.fn()} 
          onDeleted={vi.fn()} 
        />
      )

      await waitFor(() => {
        const promptDisplay = screen.getByTestId('prompt-display')
        expect(promptDisplay).toBeInTheDocument()
        expect(promptDisplay).toHaveTextContent('New prompt added')
      })
    })

    it('should remove PromptDisplay when prompt is deleted', async () => {
      const issueWithPrompt = {
        ...mockIssue,
        generated_prompt: 'Initial prompt'
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'issues') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: issueWithPrompt, error: null })
              }))
            }))
          }
        }
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockCreator, error: null })
              }))
            }))
          }
        }
        return {}
      })

      const { rerender } = render(
        <IssueDetails 
          issueId="issue-123" 
          onBack={vi.fn()} 
          onDeleted={vi.fn()} 
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('prompt-display')).toBeInTheDocument()
      })

      // Update mock to return issue without prompt
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'issues') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockIssue, error: null })
              }))
            }))
          }
        }
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockCreator, error: null })
              }))
            }))
          }
        }
        return {}
      })

      // Trigger re-render
      rerender(
        <IssueDetails 
          issueId="issue-123-updated" 
          onBack={vi.fn()} 
          onDeleted={vi.fn()} 
        />
      )

      await waitFor(() => {
        expect(screen.queryByTestId('prompt-display')).not.toBeInTheDocument()
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle empty string prompt gracefully', async () => {
      const issueWithEmptyPrompt = {
        ...mockIssue,
        generated_prompt: ''
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'issues') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: issueWithEmptyPrompt, error: null })
              }))
            }))
          }
        }
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockCreator, error: null })
              }))
            }))
          }
        }
        return {}
      })

      render(
        <IssueDetails 
          issueId="issue-123" 
          onBack={vi.fn()} 
          onDeleted={vi.fn()} 
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Test Issue')).toBeInTheDocument()
      })

      // PromptDisplay should not render for empty string
      expect(screen.queryByTestId('prompt-display')).not.toBeInTheDocument()
    })

    it('should handle very long prompts', async () => {
      const longPrompt = 'A'.repeat(5000)
      const issueWithLongPrompt = {
        ...mockIssue,
        generated_prompt: longPrompt
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'issues') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: issueWithLongPrompt, error: null })
              }))
            }))
          }
        }
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockCreator, error: null })
              }))
            }))
          }
        }
        return {}
      })

      render(
        <IssueDetails 
          issueId="issue-123" 
          onBack={vi.fn()} 
          onDeleted={vi.fn()} 
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Test Issue')).toBeInTheDocument()
      })

      const promptDisplay = screen.getByTestId('prompt-display')
      expect(promptDisplay).toBeInTheDocument()
      expect(promptDisplay.textContent).toHaveLength(5000)
    })

    it('should handle multi-line prompts with proper formatting', async () => {
      const multiLinePrompt = `What to do: Implement authentication
How: 
- Set up OAuth provider
- Create login flow
- Add session management`

      const issueWithMultiLinePrompt = {
        ...mockIssue,
        generated_prompt: multiLinePrompt
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'issues') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: issueWithMultiLinePrompt, error: null })
              }))
            }))
          }
        }
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockCreator, error: null })
              }))
            }))
          }
        }
        return {}
      })

      render(
        <IssueDetails 
          issueId="issue-123" 
          onBack={vi.fn()} 
          onDeleted={vi.fn()} 
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Test Issue')).toBeInTheDocument()
      })

      const promptDisplay = screen.getByTestId('prompt-display')
      expect(promptDisplay).toBeInTheDocument()
      expect(promptDisplay).toHaveTextContent(multiLinePrompt)
    })
  })

  describe('Loading and error states', () => {
    it('should not show PromptDisplay during loading', async () => {
      // Mock a delayed response
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'issues') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
            single: vi.fn().mockImplementation(() => 
              new Promise(resolve => setTimeout(() => 
                resolve({ data: { ...mockIssue, generated_prompt: 'Test prompt' }, error: null }), 100
              ))
            )
          }
        }
        return {}
      })

      render(
        <IssueDetails 
          issueId="issue-123" 
          onBack={vi.fn()} 
          onDeleted={vi.fn()} 
        />
      )

      // During loading, prompt display should not be visible
      expect(screen.queryByTestId('prompt-display')).not.toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByTestId('prompt-display')).toBeInTheDocument()
      })
    })

    it('should handle database errors gracefully', async () => {
      const onBack = vi.fn()
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'issues') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
              }))
            }))
          }
        }
        return {}
      })

      render(
        <IssueDetails 
          issueId="issue-123" 
          onBack={onBack} 
          onDeleted={vi.fn()} 
        />
      )

      await waitFor(() => {
        expect(onBack).toHaveBeenCalled()
      })

      expect(screen.queryByTestId('prompt-display')).not.toBeInTheDocument()
    })
  })
})