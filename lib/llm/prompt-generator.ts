interface GeneratePromptParams {
  title: string;
  description: string;
  agentsContent?: string;
  apiKey: string;
  provider?: 'openai' | 'anthropic' | 'other';
}

interface GeneratedPrompt {
  prompt: string;
  error?: string;
}

const SYSTEM_PROMPT = `Convert this to a prompt for an LLM-based software development agent.

Format the response as follows:
- What to do: [one line summary]
- How: [2-5 key technical points]

Keep the prompt concise and actionable.`;

export async function generateIssuePrompt({
  title,
  description,
  agentsContent,
  apiKey,
  provider = 'openai'
}: GeneratePromptParams): Promise<GeneratedPrompt> {
  try {
    // Construct the user prompt
    const userPrompt = `Convert this to a prompt for an LLM-based software development agent.

Issue Title: ${title}
Issue Description: ${description}

${agentsContent ? `Additional context from Agents.md:
${agentsContent}` : ''}`;

    // For now, we'll implement OpenAI integration
    // This can be extended to support other providers
    if (provider === 'openai') {
      return await generateWithOpenAI(userPrompt, apiKey);
    }

    // Placeholder for other providers
    return {
      prompt: '',
      error: `Provider ${provider} is not yet implemented`
    };
  } catch (error) {
    console.error('Error generating prompt:', error);
    return {
      prompt: '',
      error: error instanceof Error ? error.message : 'Failed to generate prompt'
    };
  }
}

async function generateWithOpenAI(userPrompt: string, apiKey: string): Promise<GeneratedPrompt> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format from OpenAI API');
    }
    
    if (!Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error('No choices returned from OpenAI API');
    }
    
    const firstChoice = data.choices[0];
    if (!firstChoice || !firstChoice.message || typeof firstChoice.message.content !== 'string') {
      throw new Error('Invalid choice format in OpenAI API response');
    }
    
    const generatedPrompt = firstChoice.message.content.trim();
    
    if (!generatedPrompt) {
      throw new Error('No prompt generated');
    }

    return { prompt: generatedPrompt };
  } catch (error) {
    console.error('OpenAI API error:', error);
    return {
      prompt: '',
      error: error instanceof Error ? error.message : 'OpenAI API error'
    };
  }
}

// Utility function to check if workspace has API key configured
export async function hasApiKey(_workspaceId: string): Promise<boolean> {
  try {
    // This would typically check the database
    // For now, returning false as we haven't implemented the database schema yet
    // TODO: Implement actual database check using workspaceId
    return false;
  } catch (error) {
    console.error('Error checking API key:', error);
    return false;
  }
}

// Utility function to get Agents.md content for a workspace
export async function getAgentsContent(_workspaceId: string): Promise<string | null> {
  try {
    // This would typically fetch from a storage service or database
    // For now, returning null
    // TODO: Implement actual fetch using workspaceId
    return null;
  } catch (error) {
    console.error('Error fetching Agents.md:', error);
    return null;
  }
}