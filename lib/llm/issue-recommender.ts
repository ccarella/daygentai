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
}

interface RecommendationResult {
  recommendedIssue: Issue | null
  justification: string
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
    // Filter out completed issues
    const openIssues = issues.filter(issue => issue.status !== 'done')
    
    if (openIssues.length === 0) {
      return {
        recommendedIssue: null,
        justification: 'No open issues available.',
        error: 'No open issues to recommend'
      }
    }

    // Format issues for the LLM
    const issuesContext = openIssues.map((issue, index) => {
      return `
Issue ${index + 1}:
- ID: ${issue.id}
- Title: ${issue.title}
- Description: ${issue.description || 'No description'}
- Type: ${issue.type}
- Priority: ${issue.priority}
- Status: ${issue.status}
- Created: ${new Date(issue.created_at).toLocaleDateString()}
`
    }).join('\n---\n')

    const userPrompt = `Given these issues:

${issuesContext}

${agentsContent ? `Additional context from Agents.md:
${agentsContent}

` : ''}${RECOMMENDATION_PROMPT}

Respond in this exact format:
RECOMMENDED_ID: [issue_id]
JUSTIFICATION: [2-3 sentence explanation]`

    let response: RecommendationResult

    if (provider === 'openai') {
      response = await getRecommendationFromOpenAI(userPrompt, apiKey, openIssues)
    } else {
      return {
        recommendedIssue: null,
        justification: '',
        error: `Provider ${provider} is not yet implemented`
      }
    }

    return response
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
        model: 'gpt-4-turbo-preview',
        messages: [
          { 
            role: 'system', 
            content: 'You are an AI assistant helping prioritize software development tasks. Always respond in the exact format requested.'
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
    const idMatch = content.match(/RECOMMENDED_ID:\s*([a-f0-9-]+)/i)
    const justificationMatch = content.match(/JUSTIFICATION:\s*([\s\S]+)/)

    if (!idMatch || !justificationMatch) {
      throw new Error('Invalid response format from LLM')
    }

    const recommendedId = idMatch[1].trim()
    const justification = justificationMatch[1].trim()

    // Find the recommended issue
    const recommendedIssue = issues.find(issue => issue.id === recommendedId)

    if (!recommendedIssue) {
      throw new Error('Recommended issue not found in the provided list')
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
export async function hasRecommendationApiKey(_workspaceId: string): Promise<boolean> {
  try {
    // TODO: Implement actual database check using workspaceId
    // This would check if the workspace has an API key configured for recommendations
    return false
  } catch (error) {
    console.error('Error checking API key:', error)
    return false
  }
}

// Get API key for workspace (for server-side use only)
export async function getWorkspaceApiKey(_workspaceId: string): Promise<string | null> {
  try {
    // TODO: Implement secure API key retrieval from database
    // This should only be used server-side
    return null
  } catch (error) {
    console.error('Error getting API key:', error)
    return null
  }
}