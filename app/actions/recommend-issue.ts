'use server'

import { createClient } from '@/lib/supabase/server'
import { recommendNextIssue } from '@/lib/llm/issue-recommender'

interface RecommendIssueResult {
  issueId?: string
  title?: string
  justification?: string
  prompt?: string | undefined
  issueGeneratedPrompt?: string | null | undefined
  error?: string
  retryCount?: number
}

export async function recommendNextIssueAction(
  workspaceId: string
): Promise<RecommendIssueResult> {
  try {
    const supabase = await createClient()
    
    // Verify user has access to workspace
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Check if user is a member of the workspace
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !member) {
      return { error: 'Access denied to workspace' }
    }

    // Get workspace to check for API key
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('api_key, api_provider, agents_content')
      .eq('id', workspaceId)
      .single()

    if (workspaceError || !workspace) {
      return { error: 'Failed to fetch workspace settings' }
    }

    // Fetch all issues for the workspace including generated_prompt
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (issuesError || !issues) {
      return { error: 'Failed to fetch issues' }
    }

    // Get API key from workspace settings, fallback to environment variable
    const apiKey = workspace.api_key || process.env['OPENAI_API_KEY']
    const provider = workspace.api_provider || 'openai'
    
    if (!apiKey) {
      return { error: 'AI recommendation not configured. Please add an OpenAI API key in workspace settings.' }
    }

    // Get recommendation (the recommendNextIssue function will filter for 'todo' status)
    const result = await recommendNextIssue(
      issues, 
      apiKey, 
      provider as 'openai' | 'anthropic',
      workspace.agents_content
    )
    
    if (result.error || !result.recommendedIssue) {
      return { error: result.error || 'Failed to get recommendation' }
    }

    const response: RecommendIssueResult = {
      issueId: result.recommendedIssue.id,
      title: result.recommendedIssue.title,
      justification: result.justification,
      prompt: result.prompt || undefined,
      issueGeneratedPrompt: result.recommendedIssue.generated_prompt || undefined
    }
    
    if (result.retryCount !== undefined) {
      response.retryCount = result.retryCount
    }
    
    return response
  } catch (error) {
    console.error('Error in recommendNextIssueAction:', error)
    return { error: 'An unexpected error occurred' }
  }
}