interface Issue {
  id: string
  title: string
  description: string | null
  type: 'feature' | 'bug' | 'chore' | 'design' | 'non-technical'
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
}

const RECOMMENDATION_PROMPT = `Consider: urgency, impact, effort, dependencies, and technical debt.

Recommend ONE issue with a 2-3 sentence justification focused on why it's the best choice right now.`;

export async function recommendNextIssue(
  issues: Issue[],
  apiKey: string,
  provider: 'openai' | 'anthropic' = 'openai',
  agentsContent?: string | null
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
    
    // Log available todo issues for debugging
    console.log('Available TODO issues for recommendation:', todoIssues.map(i => ({
      id: i.id,
      title: i.title,
      status: i.status
    })))

    const userPrompt = `You must recommend ONE issue from the following list. DO NOT create or reference any other issues.

Available issues (ONLY choose from these):
${issuesContext}

${agentsContent ? `Additional context from Agents.md:
${agentsContent}

` : ''}${RECOMMENDATION_PROMPT}

Respond in this exact format:
RECOMMENDED_ID: [exact_uuid]
JUSTIFICATION: [2-3 sentence explanation]

CRITICAL INSTRUCTIONS:
1. You MUST select one of the UUIDs listed above - no other IDs are valid
2. Copy the UUID exactly as shown, character-by-character
3. Do NOT create new UUIDs or reference issues not in the list above
4. The UUID must be from the "UUID:" field of one of the issues above`

    let response: RecommendationResult

    if (provider === 'openai') {
      response = await getRecommendationFromOpenAI(userPrompt, apiKey, todoIssues)
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
  } catch (error) {
    console.error('Error recommending issue:', error)
    return {
      recommendedIssue: null,
      justification: '',
      error: error instanceof Error ? error.message : 'Failed to get recommendation'
    }
  }
}

async function getRecommendationFromOpenAI(
  userPrompt: string, 
  apiKey: string,
  issues: Issue[]
): Promise<RecommendationResult> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'You are an AI assistant helping prioritize software development tasks. You MUST only recommend issues from the exact list provided to you. Never create new UUIDs or reference issues not in the provided list. Always copy UUIDs exactly as shown.'
          },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
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
    // Match either UUID format (8-4-4-4-12) or simple numeric/alphanumeric IDs
    const idMatch = content.match(/RECOMMENDED_ID:\s*([a-fA-F0-9-]+)/i)
    const justificationMatch = content.match(/JUSTIFICATION:\s*([\s\S]+)/)

    if (!idMatch || !justificationMatch) {
      console.error('Failed to parse LLM response:', content)
      throw new Error('Invalid response format from LLM')
    }

    const recommendedId = idMatch[1].trim()
    const justification = justificationMatch[1].trim()

    // Log for debugging
    console.log('LLM response content:', content)
    console.log('LLM recommended ID:', recommendedId)
    console.log('Available issue IDs:', issues.map(i => i.id))
    // Log first issue to see format
    if (issues.length > 0 && issues[0]) {
      console.log('First issue format:', {
        id: issues[0].id,
        title: issues[0].title,
        idLength: issues[0].id.length
      })
    }

    // Find the recommended issue
    const recommendedIssue = issues.find(issue => issue.id === recommendedId)

    if (!recommendedIssue) {
      // Try case-insensitive match as fallback
      const recommendedIssueCaseInsensitive = issues.find(
        issue => issue.id.toLowerCase() === recommendedId.toLowerCase()
      )
      
      if (recommendedIssueCaseInsensitive) {
        console.log('Found issue with case-insensitive match')
        return {
          recommendedIssue: recommendedIssueCaseInsensitive,
          justification
        }
      }

      // Try to find a similar UUID (in case of minor differences)
      const similarIssue = issues.find(issue => {
        // Check if most of the UUID matches (allowing for a few character differences)
        const issueId = issue.id.toLowerCase()
        const recId = recommendedId.toLowerCase()
        
        // Calculate similarity
        let matches = 0
        for (let i = 0; i < Math.min(issueId.length, recId.length); i++) {
          if (issueId[i] === recId[i]) matches++
        }
        
        // If more than 90% of characters match, consider it a match
        const similarity = matches / Math.max(issueId.length, recId.length)
        if (similarity > 0.9) {
          console.log(`Found similar UUID: ${issue.id} (similarity: ${(similarity * 100).toFixed(1)}%)`)
          return true
        }
        return false
      })

      if (similarIssue) {
        console.warn(`LLM returned UUID ${recommendedId} which closely matches ${similarIssue.id}`)
        return {
          recommendedIssue: similarIssue,
          justification
        }
      }

      // List only the first 5 UUIDs in the error message to keep it readable
      const validIds = issues.slice(0, 5).map(i => i.id).join(', ')
      const remainingCount = issues.length > 5 ? ` and ${issues.length - 5} more` : ''
      throw new Error(`Recommended issue not found. LLM returned ID: ${recommendedId}, but valid todo issues are: ${validIds}${remainingCount}. The LLM may have referenced a non-todo issue or hallucinated an ID.`)
    }

    return {
      recommendedIssue,
      justification
    }
  } catch (error) {
    console.error('OpenAI API error:', error)
    return {
      recommendedIssue: null,
      justification: '',
      error: error instanceof Error ? error.message : 'OpenAI API error'
    }
  }
}

// Check if workspace has API key configured for issue recommendations
export async function hasRecommendationApiKey(workspaceId: string): Promise<boolean> {
  try {
    // TODO: Implement actual database check using workspaceId
    // This would check if the workspace has an API key configured for recommendations
    console.log('Checking API key for workspace:', workspaceId)
    return false
  } catch (error) {
    console.error('Error checking API key:', error)
    return false
  }
}

// Get API key for workspace (for server-side use only)
export async function getWorkspaceApiKey(workspaceId: string): Promise<string | null> {
  try {
    // TODO: Implement secure API key retrieval from database
    // This should only be used server-side
    console.log('Getting API key for workspace:', workspaceId)
    return null
  } catch (error) {
    console.error('Error getting API key:', error)
    return null
  }
}