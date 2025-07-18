'use server'

import { createClient } from '@/lib/supabase/server'
import { recommendNextIssue } from '@/lib/llm/issue-recommender'

interface RecommendIssueResult {
  issueId?: string
  title?: string
  justification?: string
  error?: string
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

    // Get workspace to check for API key
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('api_key, api_provider, agents_content')
      .eq('id', workspaceId)
      .single()

    if (workspaceError || !workspace) {
      return { error: 'Failed to fetch workspace settings' }
    }

    // Fetch all issues for the workspace
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (issuesError || !issues) {
      return { error: 'Failed to fetch issues' }
    }

    // Filter out completed issues
    const openIssues = issues.filter(issue => issue.status !== 'done')
    
    if (openIssues.length === 0) {
      return { error: 'No open issues available' }
    }

    // Get API key from workspace settings, fallback to environment variable
    const apiKey = workspace.api_key || process.env['OPENAI_API_KEY']
    const provider = workspace.api_provider || 'openai'
    
    if (!apiKey) {
      return { error: 'AI recommendation not configured. Please add an OpenAI API key in workspace settings.' }
    }

    // Get recommendation
    const result = await recommendNextIssue(
      openIssues, 
      apiKey, 
      provider as 'openai' | 'anthropic',
      workspace.agents_content
    )
    
    if (result.error || !result.recommendedIssue) {
      return { error: result.error || 'Failed to get recommendation' }
    }

    return {
      issueId: result.recommendedIssue.id,
      title: result.recommendedIssue.title,
      justification: result.justification
    }
  } catch (error) {
    console.error('Error in recommendNextIssueAction:', error)
    return { error: 'An unexpected error occurred' }
  }
}