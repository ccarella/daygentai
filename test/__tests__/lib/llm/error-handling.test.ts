import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateIssuePrompt } from '@/lib/llm/prompt-generator'
import { POST as testConnection } from '@/app/api/test-connection/route'
import { NextRequest } from 'next/server'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Error Handling - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Network Error Scenarios', () => {
    it('should handle DNS resolution failures', async () => {
      mockFetch.mockRejectedValueOnce(
        new Error('getaddrinfo ENOTFOUND api.openai.com')
      )

      const result = await generateIssuePrompt({
        title: 'Test',
        description: 'Test',
        apiKey: 'test-key'
      })

      expect(result.prompt).toBe('')
      expect(result.error).toContain('getaddrinfo ENOTFOUND')
    })

    it('should handle connection timeouts', async () => {
      mockFetch.mockRejectedValueOnce(
        new Error('ETIMEDOUT')
      )

      const result = await generateIssuePrompt({
        title: 'Test',
        description: 'Test',
        apiKey: 'test-key'
      })

      expect(result.prompt).toBe('')
      expect(result.error).toBe('ETIMEDOUT')
    })

    it('should handle SSL certificate errors', async () => {
      mockFetch.mockRejectedValueOnce(
        new Error('self signed certificate in certificate chain')
      )

      const result = await generateIssuePrompt({
        title: 'Test',
        description: 'Test',
        apiKey: 'test-key'
      })

      expect(result.prompt).toBe('')
      expect(result.error).toContain('certificate')
    })

    it('should handle proxy connection errors', async () => {
      mockFetch.mockRejectedValueOnce(
        new Error('tunneling socket could not be established')
      )

      const result = await generateIssuePrompt({
        title: 'Test',
        description: 'Test',
        apiKey: 'test-key'
      })

      expect(result.prompt).toBe('')
      expect(result.error).toContain('tunneling socket')
    })
  })

  describe('API Response Error Scenarios', () => {
    it('should handle rate limiting (429)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: { 
            message: 'Rate limit exceeded. Please try again in 20 seconds.',
            type: 'rate_limit_error'
          }
        })
      })

      const result = await generateIssuePrompt({
        title: 'Test',
        description: 'Test',
        apiKey: 'test-key'
      })

      expect(result.prompt).toBe('')
      expect(result.error).toContain('Rate limit exceeded')
    })

    it('should handle quota exceeded errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: { 
            message: 'You exceeded your current quota',
            type: 'insufficient_quota'
          }
        })
      })

      const result = await generateIssuePrompt({
        title: 'Test',
        description: 'Test',
        apiKey: 'test-key'
      })

      expect(result.prompt).toBe('')
      expect(result.error).toContain('exceeded your current quota')
    })

    it('should handle service unavailable (503)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => { throw new Error('Not JSON') }
      })

      const result = await generateIssuePrompt({
        title: 'Test',
        description: 'Test',
        apiKey: 'test-key'
      })

      expect(result.prompt).toBe('')
      expect(result.error).toBe('API request failed: 503')
    })

    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          // Missing expected structure
          unexpected: 'response format'
        })
      })

      const result = await generateIssuePrompt({
        title: 'Test',
        description: 'Test',
        apiKey: 'test-key'
      })

      expect(result.prompt).toBe('')
      // Error happens during property access before our validation
      expect(result.error).toContain('Cannot read properties of undefined')
    })

    it('should handle partial API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              // content is undefined
            }
          }]
        })
      })

      const result = await generateIssuePrompt({
        title: 'Test',
        description: 'Test',
        apiKey: 'test-key'
      })

      expect(result.prompt).toBe('')
      // Empty content results in 'No prompt generated' error
      expect(result.error).toBe('No prompt generated')
    })
  })

  describe('Input Validation Errors', () => {
    it('should handle extremely long titles gracefully', async () => {
      const longTitle = 'A'.repeat(10000)
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Generated prompt' } }]
        })
      })

      const result = await generateIssuePrompt({
        title: longTitle,
        description: 'Test',
        apiKey: 'test-key'
      })

      expect(result.prompt).toBe('Generated prompt')
      expect(result.error).toBeUndefined()
    })

    it('should handle special characters in input', async () => {
      const specialChars = '"><script>alert("xss")</script>'
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Safe prompt' } }]
        })
      })

      const result = await generateIssuePrompt({
        title: specialChars,
        description: specialChars,
        apiKey: 'test-key'
      })

      expect(result.prompt).toBe('Safe prompt')
      // Input should be safely handled
    })

    it('should handle empty strings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Prompt for empty input' } }]
        })
      })

      const result = await generateIssuePrompt({
        title: '',
        description: '',
        apiKey: 'test-key'
      })

      expect(result.prompt).toBe('Prompt for empty input')
    })

    it('should handle unicode characters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Unicode handled' } }]
        })
      })

      const result = await generateIssuePrompt({
        title: '修复登录问题 🐛',
        description: 'Les utilisateurs ne peuvent pas se connecter',
        apiKey: 'test-key'
      })

      expect(result.prompt).toBe('Unicode handled')
    })
  })

  describe('API Connection Test Error Scenarios', () => {
    const createRequest = (body: any) => {
      return new NextRequest('http://localhost:3000/api/test-connection', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      })
    }

    it('should handle malformed request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/test-connection', {
        method: 'POST',
        body: '{"invalid json',
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await testConnection(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Failed to test connection')
    })

    it('should handle API endpoints being down', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

      const request = createRequest({ provider: 'openai', apiKey: 'test-key' })
      const response = await testConnection(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Failed to test connection')
    })

    it('should handle invalid provider gracefully', async () => {
      const request = createRequest({ 
        provider: 'invalid-provider', 
        apiKey: 'test-key' 
      })
      
      const response = await testConnection(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Provider not supported')
    })

    it('should handle empty provider string', async () => {
      const request = createRequest({ provider: '', apiKey: 'test-key' })
      const response = await testConnection(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toBe('Provider and API key are required')
    })

    it('should handle null values', async () => {
      const request = createRequest({ provider: null, apiKey: null })
      const response = await testConnection(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toBe('Provider and API key are required')
    })
  })

  describe('Concurrent Request Handling', () => {
    it('should handle multiple simultaneous prompt generations', async () => {
      // Mock different responses for concurrent calls
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Prompt 1' } }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Prompt 2' } }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Prompt 3' } }]
          })
        })

      const promises = [
        generateIssuePrompt({
          title: 'Issue 1',
          description: 'Desc 1',
          apiKey: 'key1'
        }),
        generateIssuePrompt({
          title: 'Issue 2',
          description: 'Desc 2',
          apiKey: 'key2'
        }),
        generateIssuePrompt({
          title: 'Issue 3',
          description: 'Desc 3',
          apiKey: 'key3'
        })
      ]

      const results = await Promise.all(promises)

      expect(results[0]?.prompt).toBe('Prompt 1')
      expect(results[1]?.prompt).toBe('Prompt 2')
      expect(results[2]?.prompt).toBe('Prompt 3')
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should handle mixed success and failure in concurrent requests', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Success' } }]
          })
        })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({
            error: { message: 'Invalid API key' }
          })
        })

      const promises = [
        generateIssuePrompt({ title: 'Test 1', description: 'Desc 1', apiKey: 'key1' }),
        generateIssuePrompt({ title: 'Test 2', description: 'Desc 2', apiKey: 'key2' }),
        generateIssuePrompt({ title: 'Test 3', description: 'Desc 3', apiKey: 'key3' })
      ]

      const results = await Promise.all(promises)

      expect(results[0]?.prompt).toBe('Success')
      expect(results[0]?.error).toBeUndefined()
      
      expect(results[1]?.prompt).toBe('')
      expect(results[1]?.error).toBe('Network error')
      
      expect(results[2]?.prompt).toBe('')
      expect(results[2]?.error).toBe('Invalid API key')
    })
  })

  describe('Memory and Performance Edge Cases', () => {
    it('should handle extremely large API responses', async () => {
      const largeContent = 'A'.repeat(1000000) // 1MB response
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: largeContent } }]
        })
      })

      const result = await generateIssuePrompt({
        title: 'Test',
        description: 'Test',
        apiKey: 'test-key'
      })

      expect(result.prompt).toBe(largeContent.trim())
    })

    it('should handle JSON parsing of large payloads', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => {
          // Simulate slow/large JSON parsing
          await new Promise(resolve => setTimeout(resolve, 100))
          return { error: { message: 'Large error response' } }
        }
      })

      const result = await generateIssuePrompt({
        title: 'Test',
        description: 'Test',
        apiKey: 'test-key'
      })

      expect(result.error).toBe('Large error response')
    })
  })

  describe('Provider-Specific Error Handling', () => {
    it('should handle OpenAI-specific error formats', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message: "The model `gpt-4` does not exist",
            type: "invalid_request_error",
            param: "model",
            code: "model_not_found"
          }
        })
      })

      const result = await generateIssuePrompt({
        title: 'Test',
        description: 'Test',
        apiKey: 'test-key',
        provider: 'openai'
      })

      expect(result.error).toContain('does not exist')
    })

    it('should handle missing provider implementation', async () => {
      const result = await generateIssuePrompt({
        title: 'Test',
        description: 'Test',
        apiKey: 'test-key',
        provider: 'anthropic' as any
      })

      expect(result.prompt).toBe('')
      expect(result.error).toBe('Provider anthropic is not yet implemented')
    })
  })
})