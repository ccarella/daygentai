import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { validateWorkspaceAccessOptimized } from '@/lib/validation/workspace-access-optimized'
import { withTimeout, timeoutConfig } from '@/lib/middleware/timeout'
import { 
  withErrorHandler, 
  createUnauthorizedError, 
  createNotFoundError,
  createForbiddenError,
  createValidationError,
  createInternalServerError 
} from '@/lib/middleware/error-handler'

interface PositionUpdate {
  id: string
  position: number
}

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return createUnauthorizedError()
    }

    // Parse and validate request body
    const body = await request.json()
    
    if (!Array.isArray(body.updates)) {
      return createValidationError('Invalid request body', {
        message: 'Request body must contain an "updates" array'
      })
    }

    const updates: PositionUpdate[] = body.updates
    const errors: string[] = []

    // Validate each update
    updates.forEach((update, index) => {
      if (!update.id || typeof update.id !== 'string') {
        errors.push(`Update at index ${index}: id must be a non-empty string`)
      }
      if (typeof update.position !== 'number' || !isFinite(update.position)) {
        errors.push(`Update at index ${index}: position must be a finite number`)
      }
    })

    if (errors.length > 0) {
      return createValidationError('Invalid position updates', { errors })
    }

    // Optimized: Validate workspace access and get workspace ID in one query
    const accessResult = await validateWorkspaceAccessOptimized(
      supabase,
      slug,
      user.id,
      true // slug is a slug, not an ID
    )

    if (!accessResult.workspaceExists) {
      return createNotFoundError('Workspace')
    }

    if (!accessResult.hasAccess) {
      return createForbiddenError('Access denied')
    }

    const workspaceId = accessResult.workspaceId!

    // Verify all issues belong to the workspace
    const issueIds = updates.map(u => u.id)
    const { data: existingIssues, error: fetchError } = await supabase
      .from('issues')
      .select('id')
      .in('id', issueIds)
      .eq('workspace_id', workspaceId)

    if (fetchError) {
      console.error('Error fetching issues:', fetchError)
      return createInternalServerError()
    }

    const existingIssueIds = new Set(existingIssues?.map(i => i.id) || [])
    const invalidIds = issueIds.filter(id => !existingIssueIds.has(id))

    if (invalidIds.length > 0) {
      return createValidationError('Invalid issue IDs', {
        message: 'Some issues do not exist or do not belong to this workspace',
        invalidIds
      })
    }

    // Perform bulk update using a transaction
    const updatedAt = new Date().toISOString()
    
    // Execute updates in a single transaction for consistency
    const updatePromises = updates.map(({ id, position }) => 
      supabase
        .from('issues')
        .update({ 
          position,
          updated_at: updatedAt
        })
        .eq('id', id)
        .eq('workspace_id', workspaceId)
    )

    const results = await Promise.all(updatePromises)
    
    // Check for any errors
    const failedUpdates = results
      .map((result, index) => ({ result, update: updates[index] }))
      .filter(({ result }) => result.error)

    if (failedUpdates.length > 0) {
      console.error('Failed to update positions:', failedUpdates.map(f => ({
        id: f.update?.id,
        error: f.result.error
      })))
      
      return NextResponse.json(
        { 
          error: 'Failed to update some positions',
          failedUpdates: failedUpdates.map(f => f.update?.id).filter(Boolean)
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      updatedCount: updates.length
    })
  } catch (error) {
    console.error('Error updating positions:', error)
    return createInternalServerError()
  }
}

// Export the wrapped handler with timeout and error handling
export const POST = withTimeout(withErrorHandler(handlePOST), timeoutConfig.standard)