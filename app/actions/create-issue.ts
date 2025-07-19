'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface CreateIssueParams {
  title: string
  description: string
  type: 'feature' | 'bug' | 'chore' | 'design' | 'non-technical'
  priority: 'critical' | 'high' | 'medium' | 'low'
  workspaceId: string
  generatePrompt: boolean
}

export async function createIssue({
  title,
  description,
  type,
  priority,
  workspaceId,
  generatePrompt
}: CreateIssueParams) {
  const supabase = await createClient()
  
  // Get the current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return {
      success: false,
      error: 'Authentication required'
    }
  }
  
  // Create the issue immediately without waiting for prompt generation
  const { data: issue, error: insertError } = await supabase
    .from('issues')
    .insert({
      title: title.trim(),
      description: description.trim(),
      type,
      priority,
      status: 'todo',
      workspace_id: workspaceId,
      created_by: user.id,
      generated_prompt: null, // Will be updated asynchronously
      prompt_generation_status: generatePrompt ? 'pending' : null
    })
    .select()
    .single()
  
  if (insertError || !issue) {
    return {
      success: false,
      error: insertError?.message || 'Failed to create issue'
    }
  }
  
  // If prompt generation is requested, trigger it in the background
  if (generatePrompt) {
    // We'll use Edge Runtime to handle this asynchronously
    // This won't block the response to the user
    generatePromptInBackground(issue.id, workspaceId, title, description)
      .catch(async (error) => {
        console.error('Background prompt generation failed:', error)
        // Update the issue to mark prompt generation as failed
        try {
          const supabase = await createClient()
          await supabase
            .from('issues')
            .update({ prompt_generation_status: 'failed' })
            .eq('id', issue.id)
        } catch (updateError) {
          console.error('Failed to update issue status:', updateError)
        }
      })
  }
  
  // Revalidate the issues pages
  revalidatePath(`/${workspaceId}`)
  revalidatePath(`/${workspaceId}/inbox`)
  
  return {
    success: true,
    issueId: issue.id
  }
}

async function generatePromptInBackground(
  issueId: string,
  workspaceId: string,
  title: string,
  description: string
) {
  const supabase = await createClient()
  
  try {
    // Fetch workspace data including API key and agents content
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('api_key, api_provider, agents_content')
      .eq('id', workspaceId)
      .single()
    
    if (!workspace?.api_key) {
      throw new Error('No API key configured')
    }
    
    // Import the optimized prompt generator
    const { generateIssuePromptOptimized } = await import('@/lib/llm/prompt-generator-optimized')
    
    // Create an abort controller with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout
    
    try {
      const { prompt, error: promptError } = await generateIssuePromptOptimized({
        title,
        description,
        agentsContent: workspace.agents_content,
        apiKey: workspace.api_key,
        provider: workspace.api_provider || 'openai',
        signal: controller.signal
      })
      
      clearTimeout(timeout)
      
      if (promptError) {
        throw new Error(promptError)
      }
      
      // Update the issue with the generated prompt
      await supabase
        .from('issues')
        .update({
          generated_prompt: prompt,
          prompt_generation_status: 'completed'
        })
        .eq('id', issueId)
      
      // Create an inbox notification for the user
      await supabase
        .from('inbox_notifications')
        .insert({
          workspace_id: workspaceId,
          issue_id: issueId,
          type: 'prompt_ready',
          title: 'AI Prompt Generated',
          message: `The AI prompt for "${title}" is ready`,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      clearTimeout(timeout)
      throw error
    }
  } catch (error) {
    // Update the issue to mark prompt generation as failed
    await supabase
      .from('issues')
      .update({
        prompt_generation_status: 'failed',
        prompt_generation_error: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', issueId)
    
    throw error
  }
}