import { handleApiError, handleAIError } from '@/lib/error-handler'
import { LLMProxyService } from '@/lib/llm/proxy/llm-proxy-service'

interface Issue {
  id: string
  title: string
  description: string | null
  type: 'feature' | 'bug' | 'design' | 'product' | 'task' | 'epic' | 'spike' | 'chore' | 'non-technical'
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'todo' | 'in_progress' | 'in_review' | 'done'
  created_at: string
  created_by: string
  assignee_id: string | null
  generated_prompt?: string | null
}

interface PrioritizedIssue {
  issue: Issue
  whyNow: string
  expectedImpact: string
  dependencies: string
}

interface PrioritizationResult {
  recommendedIssues: PrioritizedIssue[]
  reasoningSummary: string
  notableMentions: string[]
  prompt?: string
  error?: string
}

const TASK_PRIORITIZATION_PROMPT = `You are an expert product manager helping a development team prioritize their work. Your goal is to identify the TOP 3 tasks that will deliver the most value and maintain development momentum.

Available Tasks
[Insert task list here with format: UUID | Title | Description | Type | Priority | Status | Created Date]

Your Analysis Framework
Evaluate each task using these weighted criteria:

Primary Factors (High Weight):
- Priority Level - The assigned priority (Critical > High > Medium > Low)
- Dependency Impact - Does this task:
  - Block other important features?
  - Unlock new capabilities for the product?
  - Remove bottlenecks for future development?
- Business Value - Potential impact on:
  - User satisfaction and retention
  - Revenue generation
  - Market competitiveness
  - Risk mitigation

Secondary Factors (Medium Weight):
- Technical Debt - Does this address system stability, performance, or maintainability?
- Quick Wins - Can this be completed quickly with high impact?
- Team Readiness - Do we have the skills and resources available now?

Context Factors (Lower Weight):
- Task Age - How long has this been waiting?
- Strategic Alignment - Does this support current product strategy?

Decision Process
1. First, identify any CRITICAL dependencies - tasks that block multiple other features
2. Then apply a mental scoring model considering:
   - High Impact + Low Effort = Prioritize First
   - High Impact + High Effort = Prioritize if dependencies exist
   - Low Impact + Low Effort = Consider as fill-in work
   - Low Impact + High Effort = Deprioritize
3. Consider task sequencing - some tasks may need to be done in a specific order

Required Output Format
TOP 3 RECOMMENDED TASKS:
1. [Task UUID] - [Task Title]
   - Why Now: [2-3 sentences explaining urgency and timing]
   - Expected Impact: [Specific benefits this will deliver]
   - Dependencies: [What this blocks/unblocks, if applicable]

2. [Task UUID] - [Task Title]
   - Why Now: [2-3 sentences explaining urgency and timing]
   - Expected Impact: [Specific benefits this will deliver]
   - Dependencies: [What this blocks/unblocks, if applicable]

3. [Task UUID] - [Task Title]
   - Why Now: [2-3 sentences explaining urgency and timing]
   - Expected Impact: [Specific benefits this will deliver]
   - Dependencies: [What this blocks/unblocks, if applicable]

REASONING SUMMARY:
[Brief paragraph explaining the overall prioritization strategy and any important trade-offs made]

NOTABLE MENTIONS:
- [Any high-priority tasks that barely missed the top 3 and why]
- [Any dependency chains or sequences to be aware of]

Remember: Focus on maximizing value delivery while maintaining development flow. When in doubt, prioritize tasks that unblock the most future work.`

export async function prioritizeTasks(
  issues: Issue[],
  apiKey: string,
  provider: 'openai' | 'anthropic' = 'openai',
  agentsContent?: string | null,
  workspaceId?: string,
  userId?: string
): Promise<PrioritizationResult> {
  try {
    // Filter to only include 'todo' status issues
    const todoIssues = issues.filter(issue => issue.status === 'todo')
    
    if (todoIssues.length === 0) {
      return {
        recommendedIssues: [],
        reasoningSummary: 'No todo issues available.',
        notableMentions: [],
        error: 'No todo issues to prioritize'
      }
    }

    // If there are 3 or fewer issues, return them all without LLM call
    if (todoIssues.length <= 3) {
      return {
        recommendedIssues: todoIssues.map(issue => ({
          issue,
          whyNow: 'One of the only available tasks.',
          expectedImpact: 'Completing available work.',
          dependencies: 'None identified.'
        })),
        reasoningSummary: `Only ${todoIssues.length} todo issues available, returning all.`,
        notableMentions: []
      }
    }

    // Format issues for the LLM
    const issuesContext = todoIssues.map(issue => {
      return `${issue.id} | ${issue.title} | ${issue.description || 'No description'} | ${issue.type} | ${issue.priority} | ${issue.status} | ${new Date(issue.created_at).toLocaleDateString()}`
    }).join('\n')

    // Build the full prompt
    const userPrompt = TASK_PRIORITIZATION_PROMPT.replace(
      '[Insert task list here with format: UUID | Title | Description | Type | Priority | Status | Created Date]',
      issuesContext
    ) + (agentsContent ? `\n\nAdditional context from Agents.md:\n${agentsContent}` : '')

    let response: PrioritizationResult

    if (workspaceId && userId) {
      // Use proxy if workspaceId and userId are provided
      response = await getPrioritizationFromProxy(userPrompt, workspaceId, provider, todoIssues, userId)
    } else if (provider === 'openai') {
      // Fallback to direct API call (for backward compatibility)
      response = await getPrioritizationFromOpenAI(userPrompt, apiKey, todoIssues)
    } else {
      return {
        recommendedIssues: [],
        reasoningSummary: '',
        notableMentions: [],
        error: `Provider ${provider} is not yet implemented`
      }
    }

    // Add the prompt to the response
    return {
      ...response,
      prompt: userPrompt
    }
  } catch (error) {
    handleAIError(error, 'task prioritization')
    return {
      recommendedIssues: [],
      reasoningSummary: '',
      notableMentions: [],
      error: error instanceof Error ? error.message : 'Failed to prioritize tasks'
    }
  }
}

const proxyService = new LLMProxyService()

async function getPrioritizationFromProxy(
  userPrompt: string,
  workspaceId: string,
  provider: 'openai' | 'anthropic',
  issues: Issue[],
  userId: string
): Promise<PrioritizationResult> {
  try {
    const systemPrompt = 'You are an expert product manager helping prioritize software development tasks. Follow the output format exactly as specified.'
    
    const response = await proxyService.processRequest({
      provider,
      workspaceId,
      request: {
        model: provider === 'openai' ? 'gpt-4-turbo-preview' : 'claude-3-sonnet-20240229',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
      },
      endpoint: '/actions/prioritize-tasks'
    }, userId)
    
    const firstChoice = response.data.choices[0]
    if (!firstChoice?.message?.content) {
      throw new Error('No content in LLM response')
    }
    
    return parsePrioritizationResponse(firstChoice.message.content, issues)
  } catch (error) {
    handleApiError(error, 'LLM proxy prioritization')
    return {
      recommendedIssues: [],
      reasoningSummary: '',
      notableMentions: [],
      error: error instanceof Error ? error.message : 'LLM API error'
    }
  }
}

async function getPrioritizationFromOpenAI(
  userPrompt: string,
  apiKey: string,
  issues: Issue[]
): Promise<PrioritizationResult> {
  try {
    const systemPrompt = 'You are an expert product manager helping prioritize software development tasks. Follow the output format exactly as specified.'
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `API request failed: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content || ''
    
    return parsePrioritizationResponse(content, issues)
  } catch (error) {
    handleApiError(error, 'OpenAI prioritization')
    return {
      recommendedIssues: [],
      reasoningSummary: '',
      notableMentions: [],
      error: error instanceof Error ? error.message : 'OpenAI API error'
    }
  }
}

function parsePrioritizationResponse(content: string, issues: Issue[]): PrioritizationResult {
  try {
    const recommendedIssues: PrioritizedIssue[] = []
    
    // Parse TOP 3 RECOMMENDED TASKS
    const taskMatches = content.matchAll(/(\d+)\.\s+\[([^\]]+)\]\s*-\s*\[([^\]]+)\]\s*\n\s*-?\s*Why Now:\s*([^\n]+)\s*\n\s*-?\s*Expected Impact:\s*([^\n]+)\s*\n\s*-?\s*Dependencies:\s*([^\n]+)/gi)
    
    for (const match of taskMatches) {
      const [, , uuid, , whyNow, expectedImpact, dependencies] = match
      const issue = issues.find(i => i.id === uuid?.trim())
      
      if (issue) {
        recommendedIssues.push({
          issue,
          whyNow: whyNow?.trim() || '',
          expectedImpact: expectedImpact?.trim() || '',
          dependencies: dependencies?.trim() || ''
        })
      }
    }
    
    // Parse REASONING SUMMARY
    const reasoningMatch = content.match(/REASONING SUMMARY:\s*\n([^\n]+(?:\n(?!NOTABLE MENTIONS)[^\n]+)*)/i)
    const reasoningSummary = reasoningMatch?.[1]?.trim() || ''
    
    // Parse NOTABLE MENTIONS
    const notableMentions: string[] = []
    const notableMatch = content.match(/NOTABLE MENTIONS:\s*\n([\s\S]+?)(?=\n\n|\s*$)/i)
    if (notableMatch && notableMatch[1]) {
      const mentionsText = notableMatch[1]
      const mentions = mentionsText.split('\n').filter(line => line.trim().startsWith('-'))
      notableMentions.push(...mentions.map(m => m.replace(/^-\s*/, '').trim()))
    }
    
    return {
      recommendedIssues,
      reasoningSummary,
      notableMentions
    }
  } catch (error) {
    handleAIError(error, 'parse prioritization response')
    throw new Error('Failed to parse LLM response')
  }
}

// Export for backward compatibility
export async function recommendNextIssue(
  issues: Issue[],
  apiKey: string,
  provider: 'openai' | 'anthropic' = 'openai',
  agentsContent?: string | null,
  workspaceId?: string,
  userId?: string
) {
  const result = await prioritizeTasks(issues, apiKey, provider, agentsContent, workspaceId, userId)
  
  if (result.error) {
    return {
      recommendedIssue: null,
      justification: '',
      error: result.error
    }
  }
  
  const firstRecommendation = result.recommendedIssues[0]
  if (!firstRecommendation) {
    return {
      recommendedIssue: null,
      justification: 'No issues to recommend',
      error: 'No recommendations available'
    }
  }
  
  return {
    recommendedIssue: firstRecommendation.issue,
    justification: `${firstRecommendation.whyNow} ${firstRecommendation.expectedImpact}`,
    prompt: result.prompt
  }
}