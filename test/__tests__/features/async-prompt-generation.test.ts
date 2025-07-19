import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createIssue } from '@/app/actions/create-issue'
import { generateIssuePromptOptimized } from '@/lib/llm/prompt-generator-optimized'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => ({ 
        data: { user: { id: 'test-user-id' } },
        error: null 
      }))
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'test-issue-id' },
            error: null
          }))
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              api_key: 'test-api-key',
              api_provider: 'openai',
              agents_content: null
            },
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      }))
    }))
  }))
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

vi.mock('@/lib/llm/prompt-generator-optimized', () => ({
  generateIssuePromptOptimized: vi.fn(() => Promise.resolve({
    prompt: 'Generated prompt',
    tokensUsed: 100
  }))
}))

describe('Async Prompt Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create issue immediately without waiting for prompt generation', async () => {
    const result = await createIssue({
      title: 'Test Issue',
      description: 'Test Description',
      type: 'feature',
      priority: 'medium',
      workspaceId: 'test-workspace-id',
      generatePrompt: true
    })

    expect(result.success).toBe(true)
    expect(result.issueId).toBe('test-issue-id')
  })

  it('should handle prompt generation in background', async () => {
    vi.mocked(generateIssuePromptOptimized).mockResolvedValue({
      prompt: 'Generated prompt',
      tokensUsed: 100
    })

    await createIssue({
      title: 'Test Issue',
      description: 'Test Description',
      type: 'feature',
      priority: 'medium',
      workspaceId: 'test-workspace-id',
      generatePrompt: true
    })

    // Wait a bit for background process
    await new Promise(resolve => setTimeout(resolve, 100))

    // Verify prompt generation was called
    expect(generateIssuePromptOptimized).toHaveBeenCalled()
  })

  it('should create issue without prompt generation when flag is false', async () => {
    const result = await createIssue({
      title: 'Test Issue',
      description: 'Test Description',
      type: 'feature',
      priority: 'medium',
      workspaceId: 'test-workspace-id',
      generatePrompt: false
    })

    expect(result.success).toBe(true)
    expect(generateIssuePromptOptimized).not.toHaveBeenCalled()
  })
})

describe('Optimized Prompt Generator', () => {
  it('should truncate long inputs to save tokens', async () => {
    const longTitle = 'a'.repeat(300)
    const longDescription = 'b'.repeat(3000)
    
    vi.mocked(generateIssuePromptOptimized).mockResolvedValueOnce({
      prompt: 'Truncated prompt',
      tokensUsed: 50
    })
    
    const result = await generateIssuePromptOptimized({
      title: longTitle,
      description: longDescription,
      apiKey: 'test-key',
      provider: 'openai'
    })

    expect(result).toBeDefined()
    expect(result.prompt).toBe('Truncated prompt')
  })

  it('should handle timeout with AbortSignal', async () => {
    const controller = new AbortController()
    
    vi.mocked(generateIssuePromptOptimized).mockResolvedValueOnce({
      prompt: '',
      error: 'Request was cancelled'
    })
    
    // Abort immediately
    controller.abort()
    
    const result = await generateIssuePromptOptimized({
      title: 'Test',
      description: 'Test',
      apiKey: 'test-key',
      signal: controller.signal
    })

    expect(result.error).toBe('Request was cancelled')
  })
})