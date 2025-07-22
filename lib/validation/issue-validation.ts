import { createValidationError } from '@/lib/middleware/error-handler'
import { NextResponse } from 'next/server'

// Valid enum values based on database schema
export const ISSUE_STATUS = ['todo', 'in_progress', 'in_review', 'done'] as const
export const ISSUE_TYPE = ['bug', 'feature', 'task', 'epic', 'spike', 'chore', 'design', 'non-technical'] as const
export const ISSUE_PRIORITY = ['critical', 'high', 'medium', 'low'] as const

export type IssueStatus = typeof ISSUE_STATUS[number]
export type IssueType = typeof ISSUE_TYPE[number]
export type IssuePriority = typeof ISSUE_PRIORITY[number]

export interface IssueUpdateData {
  status?: IssueStatus
  type?: IssueType
  priority?: IssuePriority
  title?: string
  description?: string
  generated_prompt?: string
}

/**
 * Validates issue update data
 * @param data - The data to validate
 * @returns Validation result with sanitized data or error response
 */
export function validateIssueUpdate(
  data: unknown
): { valid: true; data: IssueUpdateData } | { valid: false; error: NextResponse } {
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      error: createValidationError('Invalid request body', {
        message: 'Request body must be a valid JSON object'
      })
    }
  }

  const input = data as Record<string, unknown>
  const validated: IssueUpdateData = {}
  const errors: string[] = []

  // Validate status
  if ('status' in input) {
    if (typeof input['status'] !== 'string') {
      errors.push(`status must be a string, received ${typeof input['status']}`)
    } else {
      const trimmedStatus = input['status'].trim()
      if (!ISSUE_STATUS.includes(trimmedStatus as IssueStatus)) {
        errors.push(`status must be one of: ${ISSUE_STATUS.join(', ')}. Received: "${input['status']}"`)
      } else {
        validated.status = trimmedStatus as IssueStatus
      }
    }
  }

  // Validate type
  if ('type' in input) {
    if (typeof input['type'] !== 'string') {
      errors.push('type must be a string')
    } else if (!ISSUE_TYPE.includes(input['type'] as IssueType)) {
      errors.push(`type must be one of: ${ISSUE_TYPE.join(', ')}`)
    } else {
      validated.type = input['type'] as IssueType
    }
  }

  // Validate priority
  if ('priority' in input) {
    if (typeof input['priority'] !== 'string') {
      errors.push('priority must be a string')
    } else if (!ISSUE_PRIORITY.includes(input['priority'] as IssuePriority)) {
      errors.push(`priority must be one of: ${ISSUE_PRIORITY.join(', ')}`)
    } else {
      validated.priority = input['priority'] as IssuePriority
    }
  }

  // Validate title
  if ('title' in input) {
    if (typeof input['title'] !== 'string') {
      errors.push('title must be a string')
    } else if (input['title'].trim().length === 0) {
      errors.push('title cannot be empty')
    } else if (input['title'].length > 255) {
      errors.push('title must be 255 characters or less')
    } else {
      validated.title = input['title'].trim()
    }
  }

  // Validate description
  if ('description' in input) {
    if (typeof input['description'] !== 'string') {
      errors.push('description must be a string')
    } else if (input['description'].length > 65535) {
      errors.push('description must be 65535 characters or less')
    } else {
      validated.description = input['description']
    }
  }

  // Validate generated_prompt
  if ('generated_prompt' in input) {
    if (input['generated_prompt'] !== null && typeof input['generated_prompt'] !== 'string') {
      errors.push('generated_prompt must be a string or null')
    } else if (typeof input['generated_prompt'] === 'string' && input['generated_prompt'].length > 65535) {
      errors.push('generated_prompt must be 65535 characters or less')
    } else {
      validated.generated_prompt = input['generated_prompt'] as string
    }
  }

  // Check for any validation errors
  if (errors.length > 0) {
    return {
      valid: false,
      error: createValidationError('Invalid issue data', {
        errors,
        providedFields: Object.keys(input),
        validFields: ['status', 'type', 'priority', 'title', 'description', 'generated_prompt']
      })
    }
  }

  // Check if at least one field is being updated
  if (Object.keys(validated).length === 0) {
    return {
      valid: false,
      error: createValidationError('No valid fields to update', {
        message: 'Provide at least one field to update',
        validFields: ['status', 'type', 'priority', 'title', 'description', 'generated_prompt']
      })
    }
  }

  return { valid: true, data: validated }
}

/**
 * Sanitizes string input to prevent XSS and injection attacks
 * @param input - The string to sanitize
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string
 */
export function sanitizeString(input: string, maxLength: number = 255): string {
  // Remove any null bytes
  let sanitized = input.replace(/\0/g, '')
  
  // Trim whitespace
  sanitized = sanitized.trim()
  
  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }
  
  return sanitized
}