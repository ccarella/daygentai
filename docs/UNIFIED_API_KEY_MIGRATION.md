# Unified API Key Migration Guide

This guide documents the migration from per-workspace API keys to a centralized, app-wide API key system.

## Overview

Previously, each workspace managed its own LLM API keys. This migration centralizes API key management at the application level, simplifying the user experience and administration.

## Key Changes

### 1. Database Schema
- **New table**: `app_settings` stores application-wide configuration including API keys
- **Removed columns**: `api_key` and `api_provider` from `workspaces` table
- **Kept**: `agents_content` remains in workspaces for workspace-specific AI context

### 2. New Files Created
- `/lib/llm/proxy/llm-proxy-service-v2.ts` - Updated proxy service using centralized keys
- `/app/actions/update-app-api-settings.ts` - Server action for admin API key management
- `/app/admin/api-settings/page.tsx` - Admin interface for API key management
- `/components/admin/app-api-settings-form.tsx` - Admin form component
- `/components/settings/api-settings-v2.tsx` - Updated workspace settings (agents content only)
- `/contexts/workspace-context-v2.tsx` - Updated context without API key checks
- `/app/api/generate-prompt/route-v2.ts` - Updated endpoint using centralized proxy

### 3. Migration Files
- `/supabase/migrations/20250722_create_app_settings_table.sql` - Creates app_settings table
- `/supabase/migrations/20250722_migrate_workspace_api_keys.sql` - Migrates existing keys
- `/supabase/migrations/20250722_remove_workspace_api_fields.sql` - Removes old columns

## Migration Steps

### Step 1: Apply Database Migrations
```bash
# Run migrations in order
supabase db push --db-url "postgresql://..." --file supabase/migrations/20250722_create_app_settings_table.sql
supabase db push --db-url "postgresql://..." --file supabase/migrations/20250722_migrate_workspace_api_keys.sql
supabase db push --db-url "postgresql://..." --file supabase/migrations/20250722_remove_workspace_api_fields.sql
```

### Step 2: Update Environment Variables (Optional)
For easier deployment, you can set API keys via environment variables:
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Step 3: Update Code References
Replace imports and usages throughout the codebase:

```typescript
// Old
import { LLMProxyService } from '@/lib/llm/proxy/llm-proxy-service'
import { ApiSettings } from '@/components/settings/api-settings'
import { useWorkspace } from '@/contexts/workspace-context'

// New
import { llmProxyService } from '@/lib/llm/proxy/llm-proxy-service-v2'
import { ApiSettingsV2 } from '@/components/settings/api-settings-v2'
import { useWorkspace } from '@/contexts/workspace-context-v2'
```

### Step 4: Update Route Handlers
Replace route files:
- `/app/api/generate-prompt/route.ts` → `/app/api/generate-prompt/route-v2.ts`

### Step 5: Admin Setup
1. Any workspace owner can access the admin interface at `/admin/api-settings`
2. Set the OpenAI API key (and optionally Anthropic key)
3. Keys are encrypted using the same encryption as before

## Benefits

1. **Simplified Onboarding**: New workspaces don't need to provide API keys
2. **Centralized Management**: Admins can manage keys in one place
3. **Cost Control**: All API usage goes through one account
4. **Better Security**: Fewer keys to manage and rotate

## Rollback Plan

If needed, the migration can be rolled back:

1. Restore the `api_key` and `api_provider` columns from the backup table
2. Revert code changes to use the original services
3. Update workspace settings to show API key management again

## Security Considerations

- API keys are still encrypted using AES-256-GCM
- Only workspace owners can access the admin interface
- Keys can be set via environment variables for additional security
- The encryption secret (`API_KEY_ENCRYPTION_SECRET`) remains critical

## Testing Checklist

- [ ] Admin can set API keys via `/admin/api-settings`
- [ ] Issue prompt generation works without workspace API keys
- [ ] AI recommendations in command palette function correctly
- [ ] Workspace settings only show agents content field
- [ ] Existing workspaces continue to work after migration
- [ ] New workspaces don't require API key setup