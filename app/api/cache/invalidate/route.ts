import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { invalidateUserCache } from '@/middleware'

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client to verify authentication
    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {
            // We don't need to set cookies for this endpoint
          },
        },
      }
    )

    // Verify the user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { userId } = body

    // Only allow users to invalidate their own cache
    if (userId && userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: Can only invalidate your own cache' },
        { status: 403 }
      )
    }

    // Invalidate the cache
    invalidateUserCache(userId || user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in cache invalidation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}