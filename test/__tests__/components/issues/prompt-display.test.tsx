import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PromptDisplay } from '@/components/issues/prompt-display'

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn()
}

// Use defineProperty for better test environment compatibility
Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true,
  configurable: true
})

describe('PromptDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClipboard.writeText.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('rendering', () => {
    it('should render prompt content correctly', () => {
      const prompt = 'What to do: Fix the bug\nHow: Debug and patch'
      
      render(<PromptDisplay prompt={prompt} />)
      
      expect(screen.getByText('AI Prompt')).toBeInTheDocument()
      // Check prompt is displayed
      const container = screen.getByText('AI Prompt').parentElement?.parentElement
      expect(container?.textContent).toContain('What to do: Fix the bug')
      expect(container?.textContent).toContain('How: Debug and patch')
      // Check helper text
      expect(screen.getByText('This prompt was generated to help AI agents understand and implement this issue.')).toBeInTheDocument()
    })

    it('should not render anything when prompt is empty', () => {
      const { container } = render(<PromptDisplay prompt="" />)
      
      expect(container.firstChild).toBeNull()
    })

    it('should not render anything when prompt is null', () => {
      const { container } = render(<PromptDisplay prompt={null as any} />)
      
      expect(container.firstChild).toBeNull()
    })

    it('should apply custom className', () => {
      render(<PromptDisplay prompt="Test prompt" className="custom-class" />)
      
      const container = screen.getByText('AI Prompt').closest('.space-y-2')
      expect(container).toHaveClass('custom-class')
    })

    it('should render with purple theme styling', () => {
      render(<PromptDisplay prompt="Test prompt" />)
      
      // Check for purple sparkles icon
      const sparklesIcon = screen.getByText('AI Prompt').previousElementSibling
      expect(sparklesIcon).toHaveClass('text-purple-600')
      
      // Check for purple background
      const promptContainer = document.querySelector('.bg-purple-50')
      expect(promptContainer).toHaveClass('bg-purple-50', 'border-purple-200')
    })

    it('should use monospace font for prompt text', () => {
      render(<PromptDisplay prompt="Test prompt" />)
      
      const preElement = document.querySelector('pre')
      expect(preElement).toHaveClass('font-mono')
    })
  })

  describe('copy functionality', () => {

    it('should show check icon after successful copy', async () => {
      const user = userEvent.setup()
      
      render(<PromptDisplay prompt="Test prompt" />)
      
      const copyButton = screen.getByTitle('Copy prompt')
      
      // Initially should show copy icon (not check)
      const copyIcon = copyButton.querySelector('.lucide-copy')
      expect(copyIcon).toBeInTheDocument()
      
      await user.click(copyButton)
      
      // Should show check icon after copy
      await waitFor(() => {
        const checkIcon = copyButton.querySelector('.lucide-check')
        expect(checkIcon).toBeInTheDocument()
      })
    })



  })

  describe('hover interactions', () => {
    it('should show copy button with correct opacity on hover', () => {
      render(<PromptDisplay prompt="Test prompt" />)
      
      const copyButton = screen.getByTitle('Copy prompt')
      
      expect(copyButton).toHaveClass('opacity-70', 'hover:opacity-100')
    })
  })

  describe('edge cases', () => {
    it('should handle very long prompts', () => {
      const longPrompt = 'A'.repeat(10000)
      
      render(<PromptDisplay prompt={longPrompt} />)
      
      const container = document.querySelector('.space-y-2')
      expect(container?.textContent).toContain(longPrompt.substring(0, 100))
      const preElement = document.querySelector('pre')
      expect(preElement).toHaveClass('whitespace-pre-wrap')
    })

    it('should preserve whitespace and formatting', () => {
      const formattedPrompt = `What to do: Fix issue
      
How:
  - Step 1
  - Step 2
    - Sub-step 2.1
    - Sub-step 2.2`
      
      render(<PromptDisplay prompt={formattedPrompt} />)
      
      const container = document.querySelector('.space-y-2')
      expect(container?.textContent).toContain('What to do: Fix issue')
      const preElement = document.querySelector('pre')
      expect(preElement).toBeTruthy()
      expect(preElement?.tagName).toBe('PRE')
    })


  })

  describe('accessibility', () => {
    it('should have accessible copy button', () => {
      render(<PromptDisplay prompt="Test prompt" />)
      
      const copyButton = screen.getByTitle('Copy prompt')
      expect(copyButton).toHaveAttribute('title', 'Copy prompt')
      expect(copyButton.tagName).toBe('BUTTON')
    })

  })

  describe('responsive behavior', () => {
    it('should maintain layout on small screens', () => {
      render(<PromptDisplay prompt="Test prompt" />)
      
      // Find the relative container that holds the prompt
      const container = document.querySelector('.relative.group')
      expect(container).toBeTruthy()
      expect(container?.textContent).toContain('Test prompt')
      
      // Copy button should be absolutely positioned
      const copyButton = screen.getByTitle('Copy prompt')
      expect(copyButton).toHaveClass('absolute', 'top-2', 'right-2')
    })
  })
})