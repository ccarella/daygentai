-- Create users table in public schema
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workspace_members table
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Create issues table (already exists but including for completeness)
CREATE TABLE IF NOT EXISTS public.issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'task' CHECK (type IN ('bug', 'feature', 'task', 'epic', 'spike', 'chore', 'design', 'non-technical')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'in_review', 'done')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_prompt TEXT,
  prompt_status TEXT DEFAULT 'pending' CHECK (prompt_status IN ('pending', 'generating', 'completed', 'failed')),
  prompt_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for workspaces table
CREATE POLICY "Users can view workspaces they are members of" ON public.workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workspaces" ON public.workspaces
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Workspace owners can update their workspaces" ON public.workspaces
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Workspace owners can delete their workspaces" ON public.workspaces
  FOR DELETE USING (auth.uid() = owner_id);

-- Create RLS policies for workspace_members table
CREATE POLICY "Users can view members of their workspaces" ON public.workspace_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can manage members" ON public.workspace_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE id = workspace_id AND owner_id = auth.uid()
    )
  );

-- Create RLS policies for issues table
CREATE POLICY "Users can view issues in their workspaces" ON public.issues
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = issues.workspace_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create issues in their workspaces" ON public.issues
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = issues.workspace_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update issues in their workspaces" ON public.issues
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = issues.workspace_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete issues in their workspaces" ON public.issues
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = issues.workspace_id AND user_id = auth.uid()
    )
  );

-- Create function to handle workspace creation
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
  
  -- Add the creator as an owner member
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, v_user_id, 'owner');
  
  RETURN jsonb_build_object(
    'success', true,
    'workspace_id', v_workspace_id,
    'slug', p_slug
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_issues_workspace_id ON public.issues(workspace_id);
CREATE INDEX IF NOT EXISTS idx_issues_created_by ON public.issues(created_by);
CREATE INDEX IF NOT EXISTS idx_issues_assignee_id ON public.issues(assignee_id);