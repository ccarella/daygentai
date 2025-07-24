# Centralized API Keys Configuration

This document explains how to configure and use centralized API keys for AI features in Daygent.

## Overview

Daygent now uses centralized API keys for all AI features across all workspaces. This means you no longer need to configure individual API keys for each workspace. Instead, a single set of API keys is configured at the application level.

## Configuration

### Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Centralized AI API Keys
CENTRALIZED_OPENAI_API_KEY=your_openai_api_key_here
CENTRALIZED_ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional: Default AI Provider (defaults to 'openai' if not set)
DEFAULT_AI_PROVIDER=openai
```

### How It Works

1. **Priority System**: The application checks for API keys in this order:
   - First: Centralized API keys from environment variables
   - Second: Workspace-specific API keys (legacy support)

2. **Automatic Detection**: When a workspace doesn't have its own API key configured, the system automatically uses the centralized key.

3. **Provider Selection**: If no provider is specified for a workspace, the system will:
   - Use OpenAI if `CENTRALIZED_OPENAI_API_KEY` is set
   - Use Anthropic if only `CENTRALIZED_ANTHROPIC_API_KEY` is set
   - Use the `DEFAULT_AI_PROVIDER` if both keys are available

## Features Enabled

With centralized API keys configured, all workspaces automatically have access to:

- **AI Issue Recommendation**: Get intelligent recommendations for the next issue to work on
- **Prompt Generation**: Automatically generate prompts for issues based on title and description
- **Future AI Features**: Any new AI-powered features will work out of the box

## Migration from Workspace Keys

If you're migrating from workspace-specific API keys:

1. Add the centralized API keys to your environment variables
2. The system will automatically use centralized keys for all AI operations
3. Existing workspace API keys will be ignored in favor of centralized keys
4. You can remove individual workspace API keys from the database

## Security

- Centralized API keys are stored as environment variables and never exposed to client-side code
- All AI requests are proxied through the server to protect API keys
- Usage tracking and rate limiting are applied per workspace

## Troubleshooting

### AI Features Not Working

1. Check that environment variables are properly set:
   ```bash
   echo $CENTRALIZED_OPENAI_API_KEY
   ```

2. Restart your development server after adding environment variables

3. Check the server logs for any API key validation errors

### "AI recommendation not configured" Error

This error appears when:
- No centralized API keys are configured
- The workspace doesn't have its own API key
- There's an issue with the API key format

Solution: Ensure you have properly configured the `CENTRALIZED_OPENAI_API_KEY` or `CENTRALIZED_ANTHROPIC_API_KEY` environment variable.

## Development vs Production

- **Development**: Add keys to `.env.local`
- **Production**: Configure keys in your hosting platform's environment variables (Vercel, Railway, etc.)

Never commit API keys to version control. Always use environment variables.