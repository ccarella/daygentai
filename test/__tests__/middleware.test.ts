import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import { middleware } from '@/middleware'
import { createServerClient } from '@supabase/ssr'
import { createMockUser } from '@/test/fixtures/users'

// Mock Next.js server components
vi.mock('next/server', () => ({
  NextResponse: {
    next: vi.fn((init?: any) => ({
      cookies: {
        set: vi.fn(),
      },
      ...init,
    })),
    redirect: vi.fn((url: URL) => ({
      type: 'redirect',
      url: url.toString(),
    })),
  },
  NextRequest: vi.fn(),
}))

// Mock Supabase SSR
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

describe('middleware', () => {
  const mockUser = createMockUser()
  let mockRequest: any
  let mockSupabase: any
  let mockCookies: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup mock cookies
    mockCookies = {
      getAll: vi.fn().mockReturnValue([]),
      set: vi.fn(),
    }
    
    // Setup mock request
    mockRequest = {
      nextUrl: {
        pathname: '/',
      },
      url: 'http://localhost:3000/',
      cookies: mockCookies,
    }
    
    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    }
    
    // Mock createServerClient
    vi.mocked(createServerClient).mockReturnValue(mockSupabase)
  })

  describe('static assets and API routes', () => {
    it.each([
      '/_next/static/chunk.js',
      '/_next/image/something.png',
      '/api/auth/callback',
      '/favicon.ico',
      '/logo.png',
      '/styles.css',
    ])('bypasses middleware for %s', async (pathname) => {
      mockRequest.nextUrl.pathname = pathname
      
      await middleware(mockRequest)
      
      expect(NextResponse.next).toHaveBeenCalled()
      expect(createServerClient).not.toHaveBeenCalled()
    })
  })

  describe('authentication checks', () => {
    it('allows access to public routes without auth', async () => {
      mockRequest.nextUrl.pathname = '/'
      
      await middleware(mockRequest)
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it('allows access to checkemail without auth', async () => {
      mockRequest.nextUrl.pathname = '/checkemail'
      
      await middleware(mockRequest)
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it('redirects to home when accessing /CreateUser without auth', async () => {
      mockRequest.nextUrl.pathname = '/CreateUser'
      
      await middleware(mockRequest)
      
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/', mockRequest.url)
      )
    })

    it('redirects to home when accessing /CreateWorkspace without auth', async () => {
      mockRequest.nextUrl.pathname = '/CreateWorkspace'
      
      await middleware(mockRequest)
      
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/', mockRequest.url)
      )
    })

    it('redirects to home when accessing workspace routes without auth', async () => {
      mockRequest.nextUrl.pathname = '/my-workspace'
      
      await middleware(mockRequest)
      
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/', mockRequest.url)
      )
    })
  })

  describe('authenticated user access', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
    })

    it('allows authenticated users to access /CreateUser', async () => {
      mockRequest.nextUrl.pathname = '/CreateUser'
      
      await middleware(mockRequest)
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it('allows authenticated users to access /CreateWorkspace', async () => {
      mockRequest.nextUrl.pathname = '/CreateWorkspace'
      
      await middleware(mockRequest)
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it('allows authenticated users to access workspace routes', async () => {
      mockRequest.nextUrl.pathname = '/my-workspace'
      
      await middleware(mockRequest)
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it('allows authenticated users to access home page', async () => {
      mockRequest.nextUrl.pathname = '/'
      
      await middleware(mockRequest)
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })
  })

  describe('cookie handling', () => {
    it('properly handles cookie operations', async () => {
      const cookiesToSet = [
        { name: 'session', value: 'abc123', options: { httpOnly: true } },
      ]
      
      mockCookies.getAll.mockReturnValue([])
      
      // Override the createServerClient mock for this test
      vi.mocked(createServerClient).mockImplementation((_url, _key, options) => {
        // Call setAll with test cookies
        options.cookies?.setAll(cookiesToSet)
        return mockSupabase
      })
      
      await middleware(mockRequest)
      
      expect(mockCookies.set).toHaveBeenCalledWith('session', 'abc123')
    })
  })
})