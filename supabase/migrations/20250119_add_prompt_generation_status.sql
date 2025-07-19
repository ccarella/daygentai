-- Add prompt generation status fields to issues table
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS prompt_generation_status TEXT CHECK (prompt_generation_status IN ('pending', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS prompt_generation_error TEXT;

-- Create inbox notifications table
CREATE TABLE IF NOT EXISTS inbox_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inbox_notifications_workspace_id ON inbox_notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inbox_notifications_created_at ON inbox_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_notifications_read ON inbox_notifications(read);

-- Enable RLS
ALTER TABLE inbox_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for inbox notifications
CREATE POLICY "Users can view notifications for their workspaces" ON inbox_notifications
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update notifications for their workspaces" ON inbox_notifications
  FOR UPDATE USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Function to clean up old notifications (optional)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM inbox_notifications 
  WHERE created_at < NOW() - INTERVAL '30 days' 
  AND read = true;
END;
$$ LANGUAGE plpgsql;