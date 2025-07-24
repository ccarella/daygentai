import { handleApiError, handleAIError } from '@/lib/error-handler'
import { LLMProxyService } from '@/lib/llm/proxy/llm-proxy-service'

interface Issue {
  id: string
  title: string
  description: string | null
  type: 'feature' | 'bug' | 'design' | 'product'
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'todo' | 'in_progress' | 'in_review' | 'done'
  created_at: string
  created_by: string
  assignee_id: string | null
  generated_prompt?: string | null
}

interface RecommendationResult {
  recommendedIssue: Issue | null
  justification: string
  prompt?: string
  error?: string
  retryCount?: number
}

const RECOMMENDATION_PROMPT = `Consider: urgency, impact, effort, dependencies, and technical debt.

Recommend ONE issue with a 2-3 sentence justification focused on why it's the best choice right now.`;

export async function recommendNextIssue(
  issues: Issue[],
  apiKey: string,
  provider: 'openai' | 'anthropic' = 'openai',
  agentsContent?: string | null,
  workspaceId?: string,
  userId?: string
): Promise<RecommendationResult> {
  try {
    // Filter to only include 'todo' status issues
    const todoIssues = issues.filter(issue => issue.status === 'todo')
    
    if (todoIssues.length === 0) {
      return {
        recommendedIssue: null,
        justification: 'No todo issues available.',
        error: 'No todo issues to recommend'
      }
    }

    // Main recommendation logic with retry capability
    const maxRetries = 3
    let lastError: string | undefined
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const isRetry = attempt > 0
      const result = await attemptRecommendation(
        todoIssues,
        apiKey,
        provider,
        agentsContent,
        isRetry,
        workspaceId,
        userId
      )
      
      if (!result.error && result.recommendedIssue) {
        return {
          ...result,
          retryCount: attempt
        }
      }
      
      lastError = result.error
      // Attempt failed
      
      // If it's a UUID validation error, continue retrying
      // Otherwise, fail immediately
      if (!lastError?.includes('UUID') && !lastError?.includes('not found')) {
        return result
      }
    }
    
    // All retries failed
    return {
      recommendedIssue: null,
      justification: '',
      error: lastError || 'Failed to get valid recommendation after multiple attempts',
      retryCount: maxRetries
    }
  } catch (error) {
    handleAIError(error, 'issue recommendation')
    return {
      recommendedIssue: null,
      justification: '',
      error: error instanceof Error ? error.message : 'Failed to get recommendation'
    }
  }
}

async function attemptRecommendation(
  todoIssues: Issue[],
  apiKey: string,
  provider: 'openai' | 'anthropic',
  agentsContent?: string | null,
  isRetry: boolean = false,
  workspaceId?: string,
  userId?: string
): Promise<RecommendationResult> {
  // Format issues for the LLM
  const issuesContext = todoIssues.map((issue, index) => {
    return `
Issue #${index + 1}:
- UUID: ${issue.id}
- Title: ${issue.title}
- Description: ${issue.description || 'No description'}
- Type: ${issue.type}
- Priority: ${issue.priority}
- Status: ${issue.status}
- Created: ${new Date(issue.created_at).toLocaleDateString()}
`
  }).join('\n---\n')
  
  // Format available todo issues

  // Create a more strict prompt for retries
  const basePrompt = `You must recommend ONE issue from the following list. DO NOT create or reference any other issues.

Available issues (ONLY choose from these):
${issuesContext}

${agentsContent ? `Additional context from Agents.md:
${agentsContent}

` : ''}${RECOMMENDATION_PROMPT}

Respond in this exact format:
RECOMMENDED_ID: [exact_uuid]
JUSTIFICATION: [2-3 sentence explanation]`

  const strictInstructions = isRetry ? `
CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. You MUST select one of the UUIDs listed above - no other IDs are valid
2. Copy the UUID exactly as shown, character-by-character
3. Do NOT create new UUIDs or reference issues not in the list above
4. The UUID must be from the "UUID:" field of one of the issues above
5. Double-check that your selected UUID matches one from the list EXACTLY
6. The UUIDs are in standard format: 8-4-4-4-12 characters (e.g., a1b2c3d4-e5f6-7890-abcd-ef1234567890)
7. If you're unsure, pick the FIRST issue from the list above

VALIDATION CHECK:
Before responding, verify that your RECOMMENDED_ID exactly matches one of these UUIDs:
${todoIssues.map(i => i.id).join('\n')}` : `
CRITICAL INSTRUCTIONS:
1. You MUST select one of the UUIDs listed above - no other IDs are valid
2. Copy the UUID exactly as shown, character-by-character
3. Do NOT create new UUIDs or reference issues not in the list above
4. The UUID must be from the "UUID:" field of one of the issues above`

  const userPrompt = basePrompt + strictInstructions

  let response: RecommendationResult

  if (workspaceId && userId) {
    // Use proxy if workspaceId and userId are provided
    response = await getRecommendationFromProxy(userPrompt, workspaceId, provider, todoIssues, isRetry, userId)
  } else if (provider === 'openai') {
    // Fallback to direct API call (for backward compatibility)
    response = await getRecommendationFromOpenAI(userPrompt, apiKey, todoIssues, isRetry)
  } else {
    return {
      recommendedIssue: null,
      justification: '',
      error: `Provider ${provider} is not yet implemented`
    }
  }

  // Add the prompt to the response
  return {
    ...response,
    prompt: userPrompt
  }
}

const proxyService = new LLMProxyService();

async function getRecommendationFromProxy(
  userPrompt: string,
  workspaceId: string,
  provider: 'openai' | 'anthropic',
  issues: Issue[],
  isRetry: boolean = false,
  userId: string
): Promise<RecommendationResult> {
  try {
    const temperature = isRetry ? 0.1 : 0.3
    
    const systemPrompt = isRetry 
      ? 'You are an AI assistant helping prioritize software development tasks. You MUST only recommend issues from the exact list provided to you. Never create new UUIDs or reference issues not in the provided list. Always copy UUIDs exactly as shown, character by character. When in doubt, choose the first issue from the list. Your response must contain a UUID that exactly matches one from the provided list.'
      : 'You are an AI assistant helping prioritize software development tasks. You MUST only recommend issues from the exact list provided to you. Never create new UUIDs or reference issues not in the provided list. Always copy UUIDs exactly as shown.'
    
    const response = await proxyService.processRequest({
      provider,
      workspaceId,
      request: {
        model: 'gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: systemPrompt
          },
          { role: 'user', content: userPrompt }
        ],
        temperature,
        max_tokens: 200
      },
      endpoint: '/actions/recommend-issue'
    }, userId);
    
    const firstChoice = response.data.choices[0];
    if (!firstChoice?.message?.content) {
      throw new Error('No content in LLM response');
    }
    const content = firstChoice.message.content;

    // Parse the response
    const idMatch = content.match(/RECOMMENDED_ID:\s*([^\s]+)/i)
    const justificationMatch = content.match(/JUSTIFICATION:\s*([\s\S]+)/)

    if (!idMatch || !justificationMatch) {
      handleAIError(new Error(`Failed to parse LLM response: ${content}`), 'issue recommendation')
      throw new Error('Invalid response format from LLM')
    }

    const recommendedId = idMatch[1]!.trim()
    const justification = justificationMatch[1]!.trim()

    // Validate UUID format
    const isValidUUID = validateUUID(recommendedId)
    if (!isValidUUID) {
      // Invalid UUID format returned by LLM
    }

    // Find the recommended issue with multiple strategies
    const recommendedIssue = findRecommendedIssue(recommendedId, issues)

    if (!recommendedIssue) {
      // List only the first 5 UUIDs in the error message to keep it readable
      const validIds = issues.slice(0, 5).map(i => i.id).join(', ')
      const remainingCount = issues.length > 5 ? ` and ${issues.length - 5} more` : ''
      
      // Provide more specific error based on what went wrong
      const errorDetail = !isValidUUID 
        ? 'The returned ID is not in valid UUID format.'
        : 'The UUID is valid but does not match any todo issue.'
      
      throw new Error(`Recommended issue not found. LLM returned ID: ${recommendedId}. ${errorDetail} Valid todo issues are: ${validIds}${remainingCount}`)
    }

    return {
      recommendedIssue,
      justification
    }
  } catch (error) {
    handleApiError(error, 'LLM proxy recommendation')
    return {
      recommendedIssue: null,
      justification: '',
      error: error instanceof Error ? error.message : 'LLM API error'
    }
  }
}

async function getRecommendationFromOpenAI(
  userPrompt: string, 
  apiKey: string,
  issues: Issue[],
  isRetry: boolean = false
): Promise<RecommendationResult> {
  try {
    // Use lower temperature for retries to get more deterministic results
    const temperature = isRetry ? 0.1 : 0.3
    
    const systemPrompt = isRetry 
      ? 'You are an AI assistant helping prioritize software development tasks. You MUST only recommend issues from the exact list provided to you. Never create new UUIDs or reference issues not in the provided list. Always copy UUIDs exactly as shown, character by character. When in doubt, choose the first issue from the list. Your response must contain a UUID that exactly matches one from the provided list.'
      : 'You are an AI assistant helping prioritize software development tasks. You MUST only recommend issues from the exact list provided to you. Never create new UUIDs or reference issues not in the provided list. Always copy UUIDs exactly as shown.'
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: systemPrompt
          },
          { role: 'user', content: userPrompt }
        ],
        temperature,
        max_tokens: 200
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `API request failed: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content || ''

    // Parse the response
    // Match either UUID format (8-4-4-4-12) or any non-whitespace characters
    const idMatch = content.match(/RECOMMENDED_ID:\s*([^\s]+)/i)
    const justificationMatch = content.match(/JUSTIFICATION:\s*([\s\S]+)/)

    if (!idMatch || !justificationMatch) {
      handleAIError(new Error(`Failed to parse LLM response: ${content}`), 'issue recommendation')
      throw new Error('Invalid response format from LLM')
    }

    const recommendedId = idMatch[1].trim()
    const justification = justificationMatch[1].trim()

    // Validate LLM response

    // Validate UUID format
    const isValidUUID = validateUUID(recommendedId)
    if (!isValidUUID) {
      // Invalid UUID format returned by LLM
    }

    // Find the recommended issue with multiple strategies
    const recommendedIssue = findRecommendedIssue(recommendedId, issues)

    if (!recommendedIssue) {
      // List only the first 5 UUIDs in the error message to keep it readable
      const validIds = issues.slice(0, 5).map(i => i.id).join(', ')
      const remainingCount = issues.length > 5 ? ` and ${issues.length - 5} more` : ''
      
      // Provide more specific error based on what went wrong
      const errorDetail = !isValidUUID 
        ? 'The returned ID is not in valid UUID format.'
        : 'The UUID is valid but does not match any todo issue.'
      
      throw new Error(`Recommended issue not found. LLM returned ID: ${recommendedId}. ${errorDetail} Valid todo issues are: ${validIds}${remainingCount}`)
    }

    return {
      recommendedIssue,
      justification
    }
  } catch (error) {
    handleApiError(error, 'OpenAI recommendation')
    return {
      recommendedIssue: null,
      justification: '',
      error: error instanceof Error ? error.message : 'OpenAI API error'
    }
  }
}

// Validate UUID format
function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Find recommended issue with multiple strategies
function findRecommendedIssue(recommendedId: string, issues: Issue[]): Issue | null {
  // 1. Try exact match
  const exactMatch = issues.find(issue => issue.id === recommendedId)
  if (exactMatch) return exactMatch

  // 2. Try case-insensitive match
  const caseInsensitiveMatch = issues.find(
    issue => issue.id.toLowerCase() === recommendedId.toLowerCase()
  )
  if (caseInsensitiveMatch) {
    // Found issue with case-insensitive match
    return caseInsensitiveMatch
  }

  // 3. Try removing common UUID issues (extra spaces, dashes in wrong places)
  const cleanedRecommendedId = recommendedId.trim().toLowerCase()
  const cleanedMatch = issues.find(issue => {
    const cleanedIssueId = issue.id.trim().toLowerCase()
    return cleanedIssueId === cleanedRecommendedId
  })
  if (cleanedMatch) {
    // Found issue after cleaning whitespace
    return cleanedMatch
  }

  // 4. Try to find a similar UUID (in case of minor differences)
  const similarIssue = issues.find(issue => {
    const similarity = calculateSimilarity(issue.id, recommendedId)
    if (similarity > 0.9) {
      // Found similar UUID
      return true
    }
    return false
  })
  
  if (similarIssue) {
    // LLM returned similar UUID
    return similarIssue
  }

  // 5. Last resort: check if the LLM returned a partial UUID
  if (recommendedId.length >= 8) {
    const partialMatch = issues.find(issue => 
      issue.id.toLowerCase().startsWith(recommendedId.toLowerCase())
    )
    if (partialMatch) {
      // Found issue with partial UUID match
      return partialMatch
    }
  }

  return null
}

// Calculate string similarity between two UUIDs
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()
  
  // Calculate Levenshtein distance
  const matrix: number[][] = []
  
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i]
  }
  
  if (!matrix[0]) {
    matrix[0] = []
  }
  
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      const prevRow = matrix[i - 1]
      const currentRow = matrix[i]
      
      if (!prevRow || !currentRow) continue
      
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        currentRow[j] = prevRow[j - 1] ?? 0
      } else {
        currentRow[j] = Math.min(
          (prevRow[j - 1] ?? 0) + 1, // substitution
          (currentRow[j - 1] ?? 0) + 1,     // insertion
          (prevRow[j] ?? 0) + 1      // deletion
        )
      }
    }
  }
  
  const lastRow = matrix[s2.length]
  const distance = lastRow ? lastRow[s1.length] : 0
  const maxLength = Math.max(s1.length, s2.length)
  return maxLength === 0 ? 1 : 1 - ((distance ?? 0) / maxLength)
}

// Check if workspace has API key configured for issue recommendations
export async function hasRecommendationApiKey(_workspaceId: string): Promise<boolean> {
  try {
    // TODO: Implement actual database check using workspaceId
    // This would check if the workspace has an API key configured for recommendations
    // Checking API key for workspace
    return false
  } catch (error) {
    handleApiError(error, 'check recommendation API key')
    return false
  }
}

// Get API key for workspace (for server-side use only)
export async function getWorkspaceApiKey(_workspaceId: string): Promise<string | null> {
  try {
    // TODO: Implement secure API key retrieval from database
    // This should only be used server-side
    // Getting API key for workspace
    return null
  } catch (error) {
    handleApiError(error, 'get workspace API key')
    return null
  }
}