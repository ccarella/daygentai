-- Add LLM-related fields to workspaces and issues tables

-- Add LLM-related fields to workspaces table
-- Note: api_key and api_provider columns already exist in production
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS agents_content TEXT;

-- Add generated_prompt to issues table
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS generated_prompt TEXT;

-- Create index on workspace_id for better query performance
CREATE INDEX IF NOT EXISTS idx_issues_workspace_id ON issues(workspace_id);

-- Add RLS policies for the new columns

-- Policy to allow workspace owners to update their API key
CREATE POLICY "Workspace owners can update API key" ON workspaces
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Policy to ensure generated_prompt is visible to workspace members
CREATE POLICY "Workspace members can view generated prompts" ON issues
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Add comment for documentation
COMMENT ON COLUMN workspaces.api_key IS 'Encrypted API key for LLM provider';
COMMENT ON COLUMN workspaces.api_provider IS 'LLM provider (openai, anthropic, etc)';
COMMENT ON COLUMN workspaces.agents_content IS 'Content from Agents.md file for additional context';
COMMENT ON COLUMN issues.generated_prompt IS 'AI-generated prompt for development agents';