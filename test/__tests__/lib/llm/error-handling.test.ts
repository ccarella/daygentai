import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateIssuePrompt } from '@/lib/llm/prompt-generator'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('LLM Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const defaultParams = {
    title: 'Test issue',
    description: 'Test description',
    workspaceId: 'test-workspace-id'
  }

  describe('API Route Error Handling', () => {
    it('should handle authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      })

      const result = await generateIssuePrompt(defaultParams)

      expect(result.prompt).toBe('')
      expect(result.error).toBe('Unauthorized')
    })

    it('should handle workspace access errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Workspace not found or access denied' })
      })

      const result = await generateIssuePrompt(defaultParams)

      expect(result.prompt).toBe('')
      expect(result.error).toBe('Workspace not found or access denied')
    })

    it('should handle missing API key errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'No API key configured for this workspace' })
      })

      const result = await generateIssuePrompt(defaultParams)

      expect(result.prompt).toBe('')
      expect(result.error).toBe('No API key configured for this workspace')
    })

    it('should handle validation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid title: Input must be a non-empty string' })
      })

      const result = await generateIssuePrompt({
        ...defaultParams,
        title: ''
      })

      expect(result.prompt).toBe('')
      expect(result.error).toBe('Invalid title: Input must be a non-empty string')
    })

    it('should handle server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      })

      const result = await generateIssuePrompt(defaultParams)

      expect(result.prompt).toBe('')
      expect(result.error).toBe('Internal server error')
    })

    it('should handle network failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network connection failed'))

      const result = await generateIssuePrompt(defaultParams)

      expect(result.prompt).toBe('')
      expect(result.error).toBe('Network connection failed')
    })

    it('should handle timeout errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'))

      const result = await generateIssuePrompt(defaultParams)

      expect(result.prompt).toBe('')
      expect(result.error).toBe('Request timeout')
    })

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => { throw new Error('Invalid JSON') }
      })

      const result = await generateIssuePrompt(defaultParams)

      expect(result.prompt).toBe('')
      expect(result.error).toBe('Request failed: 400')
    })

    it('should handle missing error message in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({})
      })

      const result = await generateIssuePrompt(defaultParams)

      expect(result.prompt).toBe('')
      expect(result.error).toBe('Request failed: 500')
    })

    it('should handle empty response body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      const result = await generateIssuePrompt(defaultParams)

      expect(result.prompt).toBe('')
      expect(result.error).toBe('No prompt returned from server')
    })
  })

  describe('Input Validation', () => {
    it('should handle missing title', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Missing required fields: title, description, or workspaceId' })
      })

      const result = await generateIssuePrompt({
        title: '',
        description: 'Test description',
        workspaceId: 'test-workspace-id'
      })

      expect(result.prompt).toBe('')
      expect(result.error).toBe('Missing required fields: title, description, or workspaceId')
    })

    it('should handle missing description', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Missing required fields: title, description, or workspaceId' })
      })

      const result = await generateIssuePrompt({
        title: 'Test title',
        description: '',
        workspaceId: 'test-workspace-id'
      })

      expect(result.prompt).toBe('')
      expect(result.error).toBe('Missing required fields: title, description, or workspaceId')
    })

    it('should handle missing workspaceId', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Missing required fields: title, description, or workspaceId' })
      })

      const result = await generateIssuePrompt({
        title: 'Test title',
        description: 'Test description',
        workspaceId: ''
      })

      expect(result.prompt).toBe('')
      expect(result.error).toBe('Missing required fields: title, description, or workspaceId')
    })
  })
})