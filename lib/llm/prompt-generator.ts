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
    console.error('Error generating prompt:', error);
    return {
      prompt: '',
      error: error instanceof Error ? error.message : 'Failed to generate prompt'
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