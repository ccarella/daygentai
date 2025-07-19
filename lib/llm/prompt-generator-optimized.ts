interface GeneratePromptParams {
  title: string;
  description: string;
  agentsContent?: string;
  apiKey: string;
  provider?: 'openai' | 'anthropic' | 'other';
  signal?: AbortSignal; // For cancellation
}

interface GeneratedPrompt {
  prompt: string;
  error?: string;
  tokensUsed?: number;
}

const SYSTEM_PROMPT = `Convert this to a prompt for an LLM-based software development agent.

Format the response as follows:
- What to do: [one line summary]
- How: [2-5 key technical points]

Keep the prompt concise and actionable.`;

// Cache for agents content to avoid repeated fetching
const agentsContentCache = new Map<string, { content: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function generateIssuePromptOptimized({
  title,
  description,
  agentsContent,
  apiKey,
  provider = 'openai',
  signal
}: GeneratePromptParams): Promise<GeneratedPrompt> {
  try {
    // Quick validation - fail fast
    if (!title?.trim()) {
      return { prompt: '', error: 'Title is required' };
    }
    
    if (!apiKey) {
      return { prompt: '', error: 'API key is required' };
    }

    // Truncate inputs to reasonable sizes to save tokens
    const truncatedTitle = title.trim().slice(0, 200);
    const truncatedDescription = description?.trim().slice(0, 2000) || '';
    const truncatedAgentsContent = agentsContent?.trim().slice(0, 1000);

    // Build a more concise prompt
    const userPrompt = buildOptimizedPrompt(truncatedTitle, truncatedDescription, truncatedAgentsContent);

    // Generate based on provider
    switch (provider) {
      case 'openai':
        return await generateWithOpenAIOptimized(userPrompt, apiKey, signal);
      case 'anthropic':
        return await generateWithAnthropic(userPrompt, apiKey, signal);
      default:
        return { prompt: '', error: `Provider ${provider} is not supported` };
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { prompt: '', error: 'Request was cancelled' };
    }
    
    console.error('Error generating prompt:', error);
    return {
      prompt: '',
      error: error instanceof Error ? error.message : 'Failed to generate prompt'
    };
  }
}

function buildOptimizedPrompt(title: string, description: string, agentsContent?: string): string {
  let prompt = `Issue: ${title}`;
  
  if (description) {
    // Only include description if it adds value beyond the title
    const cleanDescription = description
      .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
      .trim();
    
    if (cleanDescription && !cleanDescription.toLowerCase().includes(title.toLowerCase())) {
      prompt += `\n\nDetails: ${cleanDescription}`;
    }
  }
  
  if (agentsContent) {
    // Only include most relevant parts of agents content
    prompt += `\n\nContext: ${agentsContent}`;
  }
  
  return prompt;
}

async function generateWithOpenAIOptimized(
  userPrompt: string, 
  apiKey: string, 
  signal?: AbortSignal
): Promise<GeneratedPrompt> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    // Handle external abort signal
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo-0125', // Latest model for better performance
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 300, // Reduced from 500
        stream: false, // Could enable streaming in future
        n: 1,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(`Rate limited. Try again in ${retryAfter || '60'} seconds`);
      }
      
      throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
    }

    const data = await response.json();
    const generatedPrompt = data.choices?.[0]?.message?.content?.trim();
    
    if (!generatedPrompt) {
      throw new Error('No prompt generated');
    }

    return { 
      prompt: generatedPrompt,
      tokensUsed: data.usage?.total_tokens
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error; // Re-throw abort errors
    }
    
    console.error('OpenAI API error:', error);
    return {
      prompt: '',
      error: error instanceof Error ? error.message : 'OpenAI API error'
    };
  }
}

async function generateWithAnthropic(
  _userPrompt: string, 
  _apiKey: string,
  _signal?: AbortSignal
): Promise<GeneratedPrompt> {
  // Placeholder for Anthropic implementation
  // This would use Claude API when available
  return {
    prompt: '',
    error: 'Anthropic provider not yet implemented'
  };
}

// Utility to get cached agents content
export async function getCachedAgentsContent(workspaceId: string): Promise<string | null> {
  const cached = agentsContentCache.get(workspaceId);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.content;
  }
  
  // In real implementation, fetch from storage
  // For now, return null
  return null;
}

// Utility to warm up the API connection
export async function warmupPromptGeneration(apiKey: string): Promise<void> {
  try {
    // Make a minimal request to establish connection
    await fetch('https://api.openai.com/v1/models/gpt-3.5-turbo', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
  } catch {
    // Ignore warmup errors
  }
}