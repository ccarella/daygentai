import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withTimeout, timeoutConfig } from '@/lib/middleware/timeout'
import { withErrorHandler, createUnauthorizedError, createInternalServerError } from '@/lib/middleware/error-handler'
import { withFileUpload, fileUploadConfigs } from '@/lib/middleware/file-upload'

async function handlePOST(req: NextRequest) {
  try {
    // Create authenticated Supabase client
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createUnauthorizedError()
    }

    // Get the uploaded file data
    const formData = await req.formData()
    const file = formData.get('avatar') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Process the file (this is a placeholder - in production you'd upload to storage)
    const fileInfo = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }

    // In a real implementation, you would:
    // 1. Upload the file to Supabase Storage
    // 2. Get the public URL
    // 3. Update the user's avatar_url in the database

    return NextResponse.json({
      message: 'Avatar upload successful',
      file: fileInfo,
      user: user.id
    })

  } catch (error) {
    console.error('Error in avatar upload:', error)
    return createInternalServerError()
  }
}

// Export with file upload validation (5MB limit for avatars), error handling, and timeout
export const POST = withTimeout(
  withErrorHandler(
    withFileUpload(handlePOST, fileUploadConfigs['avatar'])
  ),
  timeoutConfig.file
)