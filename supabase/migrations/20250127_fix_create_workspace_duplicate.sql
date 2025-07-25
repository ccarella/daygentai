-- Fix the create_workspace function to handle potential duplicate member entries
CREATE OR REPLACE FUNCTION public.create_workspace(
  p_name TEXT,
  p_slug TEXT,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Check if slug already exists
  IF EXISTS (SELECT 1 FROM public.workspaces WHERE slug = p_slug) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Workspace slug already exists', 'detail', 'DUPLICATE_SLUG');
  END IF;
  
  -- Create the workspace
  INSERT INTO public.workspaces (name, slug, avatar_url, owner_id)
  VALUES (p_name, p_slug, p_avatar_url, v_user_id)
  RETURNING id INTO v_workspace_id;
  
  -- Add the creator as an owner member with ON CONFLICT handling
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, v_user_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role = 'owner';  -- Ensure they're set as owner if entry already exists
  
  RETURN jsonb_build_object(
    'success', true,
    'workspace_id', v_workspace_id,
    'slug', p_slug
  );
EXCEPTION
  WHEN unique_violation THEN
    -- Handle any other unique violations (like slug)
    RETURN jsonb_build_object('success', false, 'error', 'A workspace with this information already exists');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;