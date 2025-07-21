import { handleApiError } from '@/lib/error-handler'

interface GeneratePromptParams {
  title: string;
  description: string;
  workspaceId: string;
}

interface GeneratedPrompt {
  prompt: string;
  error?: string;
}

export async function generateIssuePrompt({
  title,
  description,
  workspaceId
}: GeneratePromptParams): Promise<GeneratedPrompt> {
  try {
    // Call the secure server-side API route
    const response = await fetch('/api/generate-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        description,
        workspaceId
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.prompt) {
      throw new Error('No prompt returned from server');
    }

    return { prompt: data.prompt };
  } catch (error) {
    handleApiError(error, 'generate prompt');
    return {
      prompt: '',
      error: error instanceof Error ? error.message : 'Failed to generate prompt'
    };
  }
}

// Utility function to check if workspace has API key configured
export async function hasApiKey(workspaceId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/workspace/has-api-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workspaceId })
    });

    if (!response.ok) {
      handleApiError(response, 'check API key');
      return false;
    }

    const data = await response.json();
    return data.hasApiKey === true;
  } catch (error) {
    handleApiError(error, 'check API key');
    return false;
  }
}

// Utility function to get Agents.md content for a workspace
export async function getAgentsContent(workspaceId: string): Promise<string | null> {
  try {
    const response = await fetch('/api/workspace/agents-content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workspaceId })
    });

    if (!response.ok) {
      handleApiError(response, 'fetch agents content');
      return null;
    }

    const data = await response.json();
    return data.agentsContent || null;
  } catch (error) {
    handleApiError(error, 'fetch Agents.md');
    return null;
  }
}