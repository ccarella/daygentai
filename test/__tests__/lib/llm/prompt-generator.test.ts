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
      apiKey: 'test-api-key'
    }

    it('should generate a prompt successfully with OpenAI', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'What to do: Fix authentication issue\nHow: Debug login flow, check credentials validation'
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await generateIssuePrompt(defaultParams)

      expect(result.prompt).toBe('What to do: Fix authentication issue\nHow: Debug login flow, check credentials validation')
      expect(result.error).toBeUndefined()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          }
        })
      )
    })

    it('should include agents content when provided', async () => {
      const paramsWithAgents = {
        ...defaultParams,
        agentsContent: 'Additional context from Agents.md file'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: 'Generated prompt' }
          }]
        })
      })

      await generateIssuePrompt(paramsWithAgents)

      const body = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body ?? '{}')
      expect(body.messages[1].content).toContain('Additional context from Agents.md')
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: { message: 'Invalid API key' }
        })
      })

      const result = await generateIssuePrompt(defaultParams)

      expect(result.prompt).toBe('')
      expect(result.error).toBe('Invalid API key')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await generateIssuePrompt(defaultParams)

      expect(result.prompt).toBe('')
      expect(result.error).toBe('Network error')
    })

    it('should handle empty response from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: []
        })
      })

      const result = await generateIssuePrompt(defaultParams)

      expect(result.prompt).toBe('')
      expect(result.error).toBe('No prompt generated')
    })

    it('should handle malformed API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      const result = await generateIssuePrompt(defaultParams)

      expect(result.prompt).toBe('')
      expect(result.error).toContain("Cannot read properties of undefined")
    })

    it('should return error for unsupported providers', async () => {
      const result = await generateIssuePrompt({
        ...defaultParams,
        provider: 'anthropic'
      })

      expect(result.prompt).toBe('')
      expect(result.error).toBe('Provider anthropic is not yet implemented')
    })

    it('should use correct OpenAI model and parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'test' } }]
        })
      })

      await generateIssuePrompt(defaultParams)

      const body = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body ?? '{}')
      expect(body.model).toBe('gpt-3.5-turbo')
      expect(body.temperature).toBe(0.7)
      expect(body.max_tokens).toBe(500)
    })

    it('should include system prompt correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'test' } }]
        })
      })

      await generateIssuePrompt(defaultParams)

      const body = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body ?? '{}')
      expect(body.messages[0].role).toBe('system')
      expect(body.messages[0].content).toContain('Convert this to a prompt')
      expect(body.messages[0].content).toContain('What to do:')
      expect(body.messages[0].content).toContain('How:')
    })

    it('should handle JSON parse errors from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Invalid JSON') }
      })

      const result = await generateIssuePrompt(defaultParams)

      expect(result.prompt).toBe('')
      expect(result.error).toBe('API request failed: 500')
    })

    it('should trim whitespace from generated prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: '  \n  Generated prompt with spaces  \n  ' }
          }]
        })
      })

      const result = await generateIssuePrompt(defaultParams)

      expect(result.prompt).toBe('Generated prompt with spaces')
    })
  })

  describe('hasApiKey', () => {
    it('should return false for any workspace (not implemented)', async () => {
      const result = await hasApiKey('test-workspace-id')
      expect(result).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      // Since the function catches errors and returns false, we just verify it doesn't throw
      const result = await hasApiKey('test-workspace-id')
      expect(result).toBe(false)
    })
  })

  describe('getAgentsContent', () => {
    it('should return null for any workspace (not implemented)', async () => {
      const result = await getAgentsContent('test-workspace-id')
      expect(result).toBeNull()
    })

    it('should handle errors gracefully', async () => {
      // Since the function catches errors and returns null, we just verify it doesn't throw
      const result = await getAgentsContent('test-workspace-id')
      expect(result).toBeNull()
    })
  })
})