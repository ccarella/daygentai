-- Create recipes table
CREATE TABLE recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  description TEXT,
  phases TEXT[], -- Array of phase descriptions
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  is_system BOOLEAN DEFAULT false, -- System recipes cannot be edited/deleted by users
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create recipe_tags table for many-to-many relationship
CREATE TABLE recipe_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recipe_id, tag_id)
);

-- Create indexes for performance
CREATE INDEX idx_recipes_workspace_id ON recipes(workspace_id);
CREATE INDEX idx_recipes_created_by ON recipes(created_by);
CREATE INDEX idx_recipes_is_system ON recipes(is_system);
CREATE INDEX idx_recipe_tags_recipe_id ON recipe_tags(recipe_id);
CREATE INDEX idx_recipe_tags_tag_id ON recipe_tags(tag_id);

-- Enable Row Level Security
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for recipes
CREATE POLICY "Users can view recipes in their workspace" ON recipes
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create recipes in their workspace" ON recipes
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) AND is_system = false
  );

CREATE POLICY "Users can update non-system recipes in their workspace" ON recipes
  FOR UPDATE USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) AND is_system = false
  );

CREATE POLICY "Users can delete non-system recipes in their workspace" ON recipes
  FOR DELETE USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) AND is_system = false
  );

-- RLS policies for recipe_tags
CREATE POLICY "Users can view recipe tags in their workspace" ON recipe_tags
  FOR SELECT USING (
    recipe_id IN (
      SELECT id FROM recipes WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage recipe tags for non-system recipes" ON recipe_tags
  FOR ALL USING (
    recipe_id IN (
      SELECT id FROM recipes WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
      ) AND is_system = false
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();