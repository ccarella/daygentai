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
}) {
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

async function generateWithOpenAI(userPrompt, apiKey) {
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
    const generatedPrompt = data.choices[0]?.message?.content || '';

    if (!generatedPrompt) {
      throw new Error('No prompt generated');
    }

    return { prompt: generatedPrompt.trim() };
  } catch (error) {
    console.error('OpenAI API error:', error);
    return {
      prompt: '',
      error: error instanceof Error ? error.message : 'OpenAI API error'
    };
  }
}

// Utility function to check if workspace has API key configured
export async function hasApiKey() {
  try {
    // This would typically check the database
    // For now, returning false as we haven't implemented the database schema yet
    return false;
  } catch (error) {
    console.error('Error checking API key:', error);
    return false;
  }
}

// Utility function to get Agents.md content for a workspace
export async function getAgentsContent() {
  try {
    // This would typically fetch from a storage service or database
    // For now, returning null
    return null;
  } catch (error) {
    console.error('Error fetching Agents.md:', error);
    return null;
  }
}