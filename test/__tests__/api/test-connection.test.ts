import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/test-connection/route'
import { NextRequest } from 'next/server'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('/api/test-connection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const createRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/test-connection', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  describe('validation', () => {
    it('should return 400 if provider is missing', async () => {
      const request = createRequest({ apiKey: 'test-key' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Provider and API key are required')
    })

    it('should return 400 if API key is missing', async () => {
      const request = createRequest({ provider: 'openai' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Provider and API key are required')
    })

    it('should return 400 for unsupported provider', async () => {
      const request = createRequest({ provider: 'unsupported', apiKey: 'test-key' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Provider not supported')
    })
  })

  describe('OpenAI provider', () => {
    it('should return success for valid API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      })

      const request = createRequest({ provider: 'openai', apiKey: 'valid-key' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.message).toBe('Successfully connected to OpenAI')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-key'
          }
        })
      )
    })

    it('should return error for invalid API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      const request = createRequest({ provider: 'openai', apiKey: 'invalid-key' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
      expect(data.message).toBe('Invalid API key')
    })

    it('should handle other API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      const request = createRequest({ provider: 'openai', apiKey: 'test-key' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
      expect(data.message).toBe('Connection failed: Internal Server Error')
    })
  })

  describe('Anthropic provider', () => {
    it('should return success for valid API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      })

      const request = createRequest({ provider: 'anthropic', apiKey: 'valid-key' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.message).toBe('Successfully connected to Anthropic')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'x-api-key': 'valid-key',
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          }
        })
      )
    })

    it('should send correct request body for Anthropic', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      })

      const request = createRequest({ provider: 'anthropic', apiKey: 'valid-key' })
      await POST(request)

      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call?.[1]?.body ?? '{}')
      
      expect(body).toEqual({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1
      })
    })

    it('should return error for invalid API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      const request = createRequest({ provider: 'anthropic', apiKey: 'invalid-key' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
      expect(data.message).toBe('Invalid API key')
    })
  })

  describe('OpenRouter provider', () => {
    it('should return success for valid API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      })

      const request = createRequest({ provider: 'openrouter', apiKey: 'valid-key' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.message).toBe('Successfully connected to OpenRouter')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/auth/key',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-key'
          }
        })
      )
    })

    it('should return error for invalid API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      const request = createRequest({ provider: 'openrouter', apiKey: 'invalid-key' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
      expect(data.message).toBe('Invalid API key')
    })
  })

  describe('Grok provider', () => {
    it('should return success for valid API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      })

      const request = createRequest({ provider: 'grok', apiKey: 'valid-key' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.message).toBe('Successfully connected to Grok')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.x.ai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer valid-key',
            'Content-Type': 'application/json'
          }
        })
      )
    })

    it('should send correct request body for Grok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      })

      const request = createRequest({ provider: 'grok', apiKey: 'valid-key' })
      await POST(request)

      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call?.[1]?.body ?? '{}')
      
      expect(body).toEqual({
        model: 'grok-beta',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      })
    })
  })

  describe('Kimi K2 provider', () => {
    it('should return success for valid API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      })

      const request = createRequest({ provider: 'kimi-k2', apiKey: 'valid-key' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.message).toBe('Successfully connected to Kimi K2')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.moonshot.cn/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-key'
          }
        })
      )
    })
  })

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const request = createRequest({ provider: 'openai', apiKey: 'test-key' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Failed to test connection')
    })

    it('should handle JSON parse errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/test-connection', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Failed to test connection')
    })
  })
})