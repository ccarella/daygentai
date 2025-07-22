-- Migration to remove API key fields from workspaces table
-- This should be run AFTER migrating existing API keys to app_settings

-- First, let's create a backup of existing API keys before removing them
CREATE TABLE IF NOT EXISTS public.workspace_api_keys_backup AS
SELECT 
    id as workspace_id,
    slug as workspace_slug,
    api_key,
    api_provider,
    created_at,
    updated_at
FROM public.workspaces
WHERE api_key IS NOT NULL;

-- Add comment to backup table
COMMENT ON TABLE public.workspace_api_keys_backup IS 'Backup of workspace API keys before migration to centralized system';

-- Now remove the columns from workspaces table
ALTER TABLE public.workspaces 
    DROP COLUMN IF EXISTS api_key,
    DROP COLUMN IF EXISTS api_provider;

-- Note: We're keeping agents_content as it's workspace-specific context