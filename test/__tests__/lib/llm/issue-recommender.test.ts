import { describe, it, expect, vi, afterEach } from 'vitest'
import { recommendNextIssue } from '@/lib/llm/issue-recommender'

// Mock fetch
global.fetch = vi.fn()

describe('recommendNextIssue', () => {
  const mockIssues = [
    {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      title: 'Fix login bug',
      description: 'Users cannot login',
      type: 'bug' as const,
      priority: 'high' as const,
      status: 'todo' as const,
      created_at: '2024-01-01',
      created_by: 'user1',
      assignee_id: null,
    },
    {
      id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
      title: 'Add dark mode',
      description: 'Implement dark mode feature',
      type: 'feature' as const,
      priority: 'medium' as const,
      status: 'todo' as const,
      created_at: '2024-01-02',
      created_by: 'user1',
      assignee_id: null,
    }
  ]

  const mockApiKey = 'test-api-key'

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should return a recommendation when LLM provides valid UUID', async () => {
    const mockFetch = global.fetch as any
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: `RECOMMENDED_ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
JUSTIFICATION: This is a critical bug affecting users.`
          }
        }]
      })
    })

    const result = await recommendNextIssue(mockIssues, mockApiKey)

    expect(result.recommendedIssue).toBeDefined()
    expect(result.recommendedIssue?.id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    expect(result.justification).toBe('This is a critical bug affecting users.')
    expect(result.error).toBeUndefined()
    expect(result.retryCount).toBe(0)
  })

  it('should retry with stricter prompt when LLM returns invalid UUID', async () => {
    const mockFetch = global.fetch as any
    
    // First attempt - invalid UUID
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: `RECOMMENDED_ID: invalid-uuid-12345
JUSTIFICATION: This is important.`
          }
        }]
      })
    })

    // Second attempt - valid UUID
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: `RECOMMENDED_ID: b2c3d4e5-f6a7-8901-bcde-f23456789012
JUSTIFICATION: This feature is highly requested.`
          }
        }]
      })
    })

    const result = await recommendNextIssue(mockIssues, mockApiKey)

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(result.recommendedIssue).toBeDefined()
    expect(result.recommendedIssue?.id).toBe('b2c3d4e5-f6a7-8901-bcde-f23456789012')
    expect(result.retryCount).toBe(1)
  })

  it('should handle case-insensitive UUID matching', async () => {
    const mockFetch = global.fetch as any
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: `RECOMMENDED_ID: A1B2C3D4-E5F6-7890-ABCD-EF1234567890
JUSTIFICATION: Uppercase UUID test.`
          }
        }]
      })
    })

    const result = await recommendNextIssue(mockIssues, mockApiKey)

    expect(result.recommendedIssue).toBeDefined()
    expect(result.recommendedIssue?.id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    expect(result.error).toBeUndefined()
  })

  it('should fail after max retries with consistently invalid UUIDs', async () => {
    const mockFetch = global.fetch as any
    
    // All attempts return invalid UUIDs
    for (let i = 0; i < 3; i++) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: `RECOMMENDED_ID: completely-wrong-uuid-${i}
JUSTIFICATION: Test justification.`
            }
          }]
        })
      })
    }

    const result = await recommendNextIssue(mockIssues, mockApiKey)

    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(result.recommendedIssue).toBeNull()
    expect(result.error).toBeDefined()
    expect(result.error).toContain('not found')
    expect(result.retryCount).toBe(3)
  })

  it('should return error when no todo issues are available', async () => {
    const nonTodoIssues = mockIssues.map(issue => ({
      ...issue,
      status: 'done' as const
    }))

    const result = await recommendNextIssue(nonTodoIssues, mockApiKey)

    expect(result.recommendedIssue).toBeNull()
    expect(result.error).toBe('No todo issues to recommend')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should use lower temperature for retry attempts', async () => {
    const mockFetch = global.fetch as any
    
    // First attempt - invalid UUID
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: `RECOMMENDED_ID: invalid-uuid
JUSTIFICATION: Test.`
          }
        }]
      })
    })

    // Second attempt - valid UUID
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: `RECOMMENDED_ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
JUSTIFICATION: Valid recommendation.`
          }
        }]
      })
    })

    await recommendNextIssue(mockIssues, mockApiKey)

    // Check first call uses temperature 0.3
    expect(mockFetch).toHaveBeenNthCalledWith(1, expect.any(String), expect.objectContaining({
      body: expect.stringContaining('"temperature":0.3')
    }))

    // Check second call uses temperature 0.1
    expect(mockFetch).toHaveBeenNthCalledWith(2, expect.any(String), expect.objectContaining({
      body: expect.stringContaining('"temperature":0.1')
    }))
  })
})