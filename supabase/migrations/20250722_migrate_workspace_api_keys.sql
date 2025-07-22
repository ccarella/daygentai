-- Migration script to handle existing workspace API keys
-- This should be run manually or as part of a controlled migration process

-- First, let's check if there are any workspace API keys to migrate
DO $$
DECLARE
    workspace_count INTEGER;
    has_openai_key BOOLEAN;
    openai_key TEXT;
BEGIN
    -- Count workspaces with API keys
    SELECT COUNT(*) INTO workspace_count
    FROM public.workspaces
    WHERE api_key IS NOT NULL AND api_key != '';
    
    IF workspace_count > 0 THEN
        -- Log the migration start
        RAISE NOTICE 'Found % workspaces with API keys to migrate', workspace_count;
        
        -- Check if we already have an OpenAI key in app_settings
        SELECT EXISTS (
            SELECT 1 FROM public.app_settings 
            WHERE setting_key = 'openai_api_key' 
            AND setting_value IS NOT NULL
        ) INTO has_openai_key;
        
        IF NOT has_openai_key THEN
            -- Select the first valid OpenAI API key from workspaces
            -- Prioritize by: owner workspaces first, then by creation date
            SELECT w.api_key INTO openai_key
            FROM public.workspaces w
            WHERE w.api_key IS NOT NULL 
            AND w.api_key != ''
            AND (w.api_provider = 'openai' OR w.api_provider IS NULL)
            ORDER BY 
                CASE WHEN EXISTS (
                    SELECT 1 FROM public.workspace_members wm 
                    WHERE wm.workspace_id = w.id 
                    AND wm.role = 'owner'
                ) THEN 0 ELSE 1 END,
                w.created_at ASC
            LIMIT 1;
            
            IF openai_key IS NOT NULL THEN
                -- Update the app_settings with the migrated key
                UPDATE public.app_settings
                SET 
                    setting_value = openai_key,
                    updated_at = NOW()
                WHERE setting_key = 'openai_api_key';
                
                RAISE NOTICE 'Migrated OpenAI API key to app_settings';
            END IF;
        ELSE
            RAISE NOTICE 'App-wide OpenAI API key already exists, skipping migration';
        END IF;
        
        -- Log workspace API keys for reference (without exposing the actual keys)
        RAISE NOTICE 'Workspace API keys summary:';
        RAISE NOTICE '- Total workspaces with keys: %', workspace_count;
        RAISE NOTICE '- Keys have been backed up to workspace_api_keys_backup table';
        
    ELSE
        RAISE NOTICE 'No workspace API keys found to migrate';
    END IF;
END $$;

-- Add a migration status to track this migration
INSERT INTO public.app_settings (setting_key, setting_value) 
VALUES ('migration_workspace_api_keys_completed', 'true')
ON CONFLICT (setting_key) DO UPDATE 
SET setting_value = 'true', updated_at = NOW();

-- Note: The actual removal of api_key columns from workspaces table 
-- is handled in the separate migration file: 20250722_remove_workspace_api_fields.sql