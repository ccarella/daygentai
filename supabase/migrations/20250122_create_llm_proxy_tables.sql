-- Migration: Create LLM Proxy Tables
-- Description: Creates tables for API usage tracking and rate limiting
-- Author: Claude Code
-- Date: 2025-01-22

-- Create api_usage table for tracking LLM API usage
CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model VARCHAR NOT NULL,
  provider VARCHAR NOT NULL CHECK (provider IN ('openai', 'anthropic')),
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost NUMERIC(10, 6) NOT NULL DEFAULT 0,
  endpoint VARCHAR NOT NULL,
  request_id UUID DEFAULT gen_random_uuid(),
  response_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_workspace_id ON public.api_usage(workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON public.api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON public.api_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_workspace_created ON public.api_usage(workspace_id, created_at DESC);

-- Add RLS policies
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view usage for workspaces they are members of
CREATE POLICY "Users can view usage for their workspaces" ON public.api_usage
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = api_usage.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Policy: Service role can insert usage data
CREATE POLICY "Service role can insert usage data" ON public.api_usage
  FOR INSERT
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.api_usage IS 'Tracks usage of LLM API calls for billing and analytics';

-- Create api_rate_limits table for rate limiting
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  window_type VARCHAR NOT NULL CHECK (window_type IN ('minute', 'hour', 'day')),
  request_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, window_start, window_type)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_workspace_id ON public.api_rate_limits(workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window ON public.api_rate_limits(workspace_id, window_type, window_start DESC);

-- Add RLS policies
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage rate limits
CREATE POLICY "Service role can manage rate limits" ON public.api_rate_limits
  FOR ALL
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.api_rate_limits IS 'Tracks rate limits for LLM API calls per workspace';

-- Create function to increment rate limit counter
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_workspace_id UUID,
  p_window_type VARCHAR,
  p_window_start TIMESTAMPTZ
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.api_rate_limits (workspace_id, window_type, window_start, request_count)
  VALUES (p_workspace_id, p_window_type, p_window_start, 1)
  ON CONFLICT (workspace_id, window_start, window_type)
  DO UPDATE SET 
    request_count = api_rate_limits.request_count + 1,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION public.increment_rate_limit IS 'Atomically increments rate limit counter for a workspace';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.api_usage TO authenticated;
GRANT SELECT ON public.api_rate_limits TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit TO authenticated;