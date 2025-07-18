# AI Prompt Generation Feature

## Overview

The AI Prompt Generation feature automatically creates structured prompts for software development agents from your issues. When enabled, it converts issue titles and descriptions into actionable prompts that can be used with AI pair programming tools.

## How It Works

### 1. Configuration
- Add your OpenAI API key in workspace settings
- The API key is encrypted and stored securely
- Optionally add an `Agents.md` file for additional context

### 2. Creating Issues with Prompts
- When creating a new issue, the "Create a prompt" toggle will be enabled by default if your workspace has an API key
- Fill in the issue title and description
- The system will generate a prompt in the background when you save
- The prompt appears in the issue details view

### 3. Editing Issues
- When editing an existing issue, you can regenerate the prompt if content has changed
- Toggle off to remove the prompt from an issue
- The prompt updates automatically when title or description changes

## Prompt Format

Generated prompts follow this structure:
```
- What to do: [one-line summary of the task]
- How: [2-5 specific technical implementation points]
```

Example:
```
- What to do: Implement user authentication with email/password and social login
- How:
  1. Set up NextAuth.js with database adapter for session management
  2. Create login/signup pages with email validation and password requirements
  3. Configure OAuth providers (Google, GitHub) with proper redirect URLs
  4. Implement password reset flow with secure token generation
  5. Add remember me functionality using persistent sessions
```

## Database Schema Changes

### Workspaces Table
- `api_key` (TEXT) - Encrypted API key for LLM provider
- `llm_provider` (TEXT) - Provider name (default: 'openai')
- `agents_content` (TEXT) - Content from Agents.md for context

### Issues Table
- `generated_prompt` (TEXT) - The AI-generated prompt

## API Integration

The system currently supports OpenAI's GPT-3.5-turbo model. The integration:
- Uses a system prompt to ensure consistent formatting
- Includes issue title and description in the user prompt
- Optionally includes Agents.md content for better context
- Handles errors gracefully without blocking issue creation

## Security Considerations

- API keys are stored encrypted in the database
- Keys are only accessible by workspace owners
- API calls are made server-side to protect keys
- Failed prompt generation doesn't block issue operations

## Future Enhancements

1. **Multiple LLM Providers**: Support for Anthropic, Google, and other providers
2. **Custom Prompts**: Allow users to customize the prompt format
3. **Prompt History**: Track prompt versions as issues evolve
4. **Bulk Generation**: Generate prompts for existing issues
5. **Template Library**: Pre-defined prompt templates for common tasks

## Usage Tips

1. **Be Descriptive**: More detailed issue descriptions lead to better prompts
2. **Use Agents.md**: Add project-specific guidelines for consistent prompts
3. **Review Generated Prompts**: Always review and adjust prompts before using
4. **Copy and Iterate**: Use the copy button to quickly grab prompts for your AI tools

## Troubleshooting

### Toggle is Disabled
- Ensure your workspace has an API key configured
- Check workspace settings to add or update the key

### Prompt Not Generating
- Verify your API key is valid
- Check browser console for errors
- Ensure you have sufficient API credits

### Poor Quality Prompts
- Add more detail to issue descriptions
- Update Agents.md with project context
- Consider using more specific technical terms