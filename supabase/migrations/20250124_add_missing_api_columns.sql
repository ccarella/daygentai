-- Add missing api_key and api_provider columns to workspaces table
-- These were referenced in 20240117_add_llm_fields.sql but not actually created in the initial schema

ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS api_key TEXT,
ADD COLUMN IF NOT EXISTS api_provider TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.workspaces.api_key IS 'Encrypted API key for LLM provider';
COMMENT ON COLUMN public.workspaces.api_provider IS 'LLM provider (openai, anthropic, etc)';