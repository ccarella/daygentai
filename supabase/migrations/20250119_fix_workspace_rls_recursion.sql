-- Fix RLS recursion issue on workspace_members table
-- The previous policy referenced itself causing infinite recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Members can view all members of their workspaces" ON workspace_members;

-- Create a new policy that doesn't reference itself
CREATE POLICY "Members can view workspace members"
ON workspace_members
FOR SELECT
USING (user_id = auth.uid());

-- Create function to get user's first workspace
-- This bypasses RLS issues when joining workspace_members and workspaces
CREATE OR REPLACE FUNCTION public.get_user_first_workspace(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  avatar_url text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    w.id,
    w.name,
    w.slug,
    w.avatar_url,
    COALESCE(wm.created_at, w.created_at) as created_at
  FROM workspaces w
  LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = p_user_id
  WHERE w.owner_id = p_user_id OR wm.user_id = p_user_id
  ORDER BY created_at ASC
  LIMIT 1;
END;
$$;