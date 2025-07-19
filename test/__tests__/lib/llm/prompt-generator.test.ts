import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateIssuePrompt, hasApiKey, getAgentsContent } from '@/lib/llm/prompt-generator'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('prompt-generator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateIssuePrompt', () => {
    const defaultParams = {
      title: 'Fix login bug',
      description: 'Users cannot login with valid credentials',
      workspaceId: 'test-workspace-id'
    }

    it('should generate a prompt successfully', async () => {
      const mockResponse = {
        prompt: 'What to do: Fix authentication issue\nHow: Debug login flow, check credentials validation'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await generateIssuePrompt(defaultParams)

      expect(result.prompt).toBe('What to do: Fix authentication issue\nHow: Debug login flow, check credentials validation')
      expect(result.error).toBeUndefined()
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/generate-prompt',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: 'Fix login bug',
            description: 'Users cannot login with valid credentials',
            workspaceId: 'test-workspace-id'
          })
        })
      )
    })

    it('should handle API errors', async () => {
      const mockErrorResponse = {
        error: 'Workspace not found'
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => mockErrorResponse
      })

      const result = await generateIssuePrompt(defaultParams)

      expect(result.prompt).toBe('')
      expect(result.error).toBe('Workspace not found')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await generateIssuePrompt(defaultParams)

      expect(result.prompt).toBe('')
      expect(result.error).toBe('Network error')
    })

    it('should handle missing response prompt', async () => {
      const mockResponse = {}

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await generateIssuePrompt(defaultParams)

      expect(result.prompt).toBe('')
      expect(result.error).toBe('No prompt returned from server')
    })

    it('should handle invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Invalid JSON') }
      })

      const result = await generateIssuePrompt(defaultParams)

      expect(result.prompt).toBe('')
      expect(result.error).toBe('Request failed: 500')
    })
  })

  describe('hasApiKey', () => {
    it('should return false (placeholder implementation)', async () => {
      const result = await hasApiKey('test-workspace-id')
      expect(result).toBe(false)
    })
  })

  describe('getAgentsContent', () => {
    it('should return null (placeholder implementation)', async () => {
      const result = await getAgentsContent('test-workspace-id')
      expect(result).toBe(null)
    })
  })
})