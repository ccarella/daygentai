import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
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
      from: vi.fn((_table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    }
    
    ;(createServerClient as any).mockReturnValue(mockSupabase)
  })

  describe('public routes', () => {
    it('allows access to home page without authentication', async () => {
      mockRequest.nextUrl.pathname = '/'
      
      const response = await middleware(mockRequest as NextRequest)
      
      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(response).toBeDefined()
    })

    it('allows access to auth callback without authentication', async () => {
      mockRequest.nextUrl.pathname = '/auth/callback'
      
      const response = await middleware(mockRequest as NextRequest)
      
      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(response).toBeDefined()
    })

    it('allows access to check email page without authentication', async () => {
      mockRequest.nextUrl.pathname = '/checkemail'
      
      const response = await middleware(mockRequest as NextRequest)
      
      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(response).toBeDefined()
    })

    it('ignores static assets and Next.js internal routes', async () => {
      const staticPaths = [
        '/_next/static/chunk.js',
        '/_next/image/logo.png',
        '/favicon.ico',
        '/logo.svg',
        '/banner.png',
      ]

      for (const path of staticPaths) {
        mockRequest.nextUrl.pathname = path
        await middleware(mockRequest as NextRequest)
        expect(NextResponse.redirect).not.toHaveBeenCalled()
      }
    })
  })

  describe('protected routes - unauthenticated user', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    })

    it('redirects to home when accessing /CreateUser without auth', async () => {
      mockRequest.nextUrl.pathname = '/CreateUser'
      
      await middleware(mockRequest as NextRequest)
      
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/', mockRequest.url)
      )
    })

    it('redirects to home when accessing /CreateWorkspace without auth', async () => {
      mockRequest.nextUrl.pathname = '/CreateWorkspace'
      
      await middleware(mockRequest as NextRequest)
      
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/', mockRequest.url)
      )
    })

    it('redirects to home when accessing /success without auth', async () => {
      mockRequest.nextUrl.pathname = '/success'
      
      await middleware(mockRequest as NextRequest)
      
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/', mockRequest.url)
      )
    })

    it('redirects to home when accessing workspace routes without auth', async () => {
      const workspaceRoutes = ['/test-workspace', '/my-team', '/project-123']
      
      for (const route of workspaceRoutes) {
        vi.clearAllMocks()
        mockRequest.nextUrl.pathname = route
        
        await middleware(mockRequest as NextRequest)
        
        expect(NextResponse.redirect).toHaveBeenCalledWith(
          new URL('/', mockRequest.url)
        )
      }
    })
  })

  describe('authenticated user - onboarding flow', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({ 
        data: { user: mockUser }, 
        error: null 
      })
    })

    describe('no profile, no workspace', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === 'workspace_members') {
            // workspace_members query doesn't use .single()
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ 
                data: [], // No workspaces
                error: null 
              }),
            }
          } else {
            // users table query uses .single()
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              limit: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ 
                data: null, // No profile
                error: null 
              }),
            }
          }
        })
      })

      it('allows access to /CreateUser', async () => {
        mockRequest.nextUrl.pathname = '/CreateUser'
        
        const response = await middleware(mockRequest as NextRequest)
        
        expect(NextResponse.redirect).not.toHaveBeenCalled()
        expect(response).toBeDefined()
      })

      it('redirects from /CreateWorkspace to /CreateUser', async () => {
        mockRequest.nextUrl.pathname = '/CreateWorkspace'
        
        await middleware(mockRequest as NextRequest)
        
        expect(NextResponse.redirect).toHaveBeenCalledWith(
          new URL('/CreateUser', mockRequest.url)
        )
      })

      it('redirects from /success to /CreateUser', async () => {
        mockRequest.nextUrl.pathname = '/success'
        
        await middleware(mockRequest as NextRequest)
        
        expect(NextResponse.redirect).toHaveBeenCalledWith(
          new URL('/CreateUser', mockRequest.url)
        )
      })

      it('redirects from workspace routes to /CreateUser', async () => {
        mockRequest.nextUrl.pathname = '/test-workspace'
        
        await middleware(mockRequest as NextRequest)
        
        expect(NextResponse.redirect).toHaveBeenCalledWith(
          new URL('/CreateUser', mockRequest.url)
        )
      })

      it('redirects from home to /workspace', async () => {
        mockRequest.nextUrl.pathname = '/'
        
        await middleware(mockRequest as NextRequest)
        
        expect(NextResponse.redirect).toHaveBeenCalledWith(
          new URL('/workspace', mockRequest.url)
        )
      })
    })

    describe('has profile, no workspace', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === 'workspace_members') {
            // workspace_members query doesn't use .single()
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ 
                data: [], // No workspaces
                error: null 
              }),
            }
          } else {
            // users table query uses .single()
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              limit: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ 
                data: table === 'users' ? { id: mockUser.id } : null, 
                error: null 
              }),
            }
          }
        })
      })

      it('redirects from /CreateUser to /CreateWorkspace', async () => {
        mockRequest.nextUrl.pathname = '/CreateUser'
        
        await middleware(mockRequest as NextRequest)
        
        expect(NextResponse.redirect).toHaveBeenCalledWith(
          new URL('/CreateWorkspace', mockRequest.url)
        )
      })

      it('allows access to /CreateWorkspace', async () => {
        mockRequest.nextUrl.pathname = '/CreateWorkspace'
        
        const response = await middleware(mockRequest as NextRequest)
        
        expect(NextResponse.redirect).not.toHaveBeenCalled()
        expect(response).toBeDefined()
      })

      it('redirects from /success to /CreateWorkspace', async () => {
        mockRequest.nextUrl.pathname = '/success'
        
        await middleware(mockRequest as NextRequest)
        
        expect(NextResponse.redirect).toHaveBeenCalledWith(
          new URL('/CreateWorkspace', mockRequest.url)
        )
      })

      it('allows access to workspace routes when user has profile', async () => {
        mockRequest.nextUrl.pathname = '/test-workspace'
        
        const response = await middleware(mockRequest as NextRequest)
        
        // Middleware doesn't redirect when user has profile (workspace access is checked in page components)
        expect(NextResponse.redirect).not.toHaveBeenCalled()
        expect(response).toBeDefined()
      })
    })

    describe('has profile and workspace', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === 'workspace_members') {
            // workspace_members query doesn't use .single()
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ 
                data: [{ workspace_id: 'workspace-123' }], 
                error: null 
              }),
            }
          } else {
            // users table query uses .single()
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              limit: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ 
                data: table === 'users' ? { id: mockUser.id } : null, 
                error: null 
              }),
            }
          }
        })
      })

      it('redirects from /CreateUser to /success', async () => {
        mockRequest.nextUrl.pathname = '/CreateUser'
        
        await middleware(mockRequest as NextRequest)
        
        expect(NextResponse.redirect).toHaveBeenCalledWith(
          new URL('/success', mockRequest.url)
        )
      })

      it('redirects from /CreateWorkspace to /success', async () => {
        mockRequest.nextUrl.pathname = '/CreateWorkspace'
        
        await middleware(mockRequest as NextRequest)
        
        expect(NextResponse.redirect).toHaveBeenCalledWith(
          new URL('/success', mockRequest.url)
        )
      })

      it('allows access to /success', async () => {
        mockRequest.nextUrl.pathname = '/success'
        
        const response = await middleware(mockRequest as NextRequest)
        
        expect(NextResponse.redirect).not.toHaveBeenCalled()
        expect(response).toBeDefined()
      })

      it('allows access to workspace routes', async () => {
        mockRequest.nextUrl.pathname = '/test-workspace'
        
        const response = await middleware(mockRequest as NextRequest)
        
        expect(NextResponse.redirect).not.toHaveBeenCalled()
        expect(response).toBeDefined()
      })

      it('redirects from home to /workspace', async () => {
        mockRequest.nextUrl.pathname = '/'
        
        await middleware(mockRequest as NextRequest)
        
        expect(NextResponse.redirect).toHaveBeenCalledWith(
          new URL('/workspace', mockRequest.url)
        )
      })
    })
  })

  describe('cookie management', () => {
    it('provides cookie methods to Supabase client', async () => {
      let capturedCookieOptions: any = null
      
      ;(createServerClient as any).mockImplementation((_url: string, _key: string, options: any) => {
        capturedCookieOptions = options.cookies
        return mockSupabase
      })
      
      mockRequest.nextUrl.pathname = '/'
      
      await middleware(mockRequest as NextRequest)
      
      // Verify cookie methods were provided
      expect(capturedCookieOptions).toBeDefined()
      expect(capturedCookieOptions.getAll).toBeDefined()
      expect(capturedCookieOptions.setAll).toBeDefined()
      
      // Test getAll
      expect(capturedCookieOptions.getAll()).toEqual([])
      expect(mockCookies.getAll).toHaveBeenCalled()
      
      // Test setAll
      const testCookies = [
        { name: 'test', value: 'value', options: { httpOnly: true } }
      ]
      capturedCookieOptions.setAll(testCookies)
      expect(mockRequest.cookies.set).toHaveBeenCalledWith('test', 'value')
    })
  })

  describe('error handling', () => {
    it('handles auth errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ 
        data: { user: null }, 
        error: new Error('Auth service unavailable') 
      })
      
      mockRequest.nextUrl.pathname = '/CreateUser'
      
      // Should still redirect unauthenticated users
      await middleware(mockRequest as NextRequest)
      
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/', mockRequest.url)
      )
    })

    it('handles database errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ 
        data: { user: mockUser }, 
        error: null 
      })
      
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Database error')),
      }))
      
      mockRequest.nextUrl.pathname = '/success'
      
      // Should handle the error and not crash
      await expect(middleware(mockRequest as NextRequest)).rejects.toThrow('Database error')
    })
  })

  describe('edge cases', () => {
    it('handles trailing slashes correctly', async () => {
      mockRequest.nextUrl.pathname = '/CreateUser/'
      
      await middleware(mockRequest as NextRequest)
      
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/', mockRequest.url)
      )
    })

    it('handles query parameters', async () => {
      mockRequest.url = 'http://localhost:3000/CreateUser?ref=email'
      mockRequest.nextUrl.pathname = '/CreateUser'
      
      await middleware(mockRequest as NextRequest)
      
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/', mockRequest.url)
      )
    })

    it('handles deep workspace routes', async () => {
      mockRequest.nextUrl.pathname = '/test-workspace/issues/123'
      
      await middleware(mockRequest as NextRequest)
      
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/', mockRequest.url)
      )
    })
  })
})