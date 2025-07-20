export interface Recipe {
  id: string
  title: string
  prompt: string
  description: string | null
  phases: string[] | null
  workspace_id: string
  created_by: string
  is_system: boolean
  created_at: string
  updated_at: string
  tags?: Tag[]
}

export interface Tag {
  id: string
  name: string
  color: string
  workspace_id: string
  created_at: string
  updated_at: string
}

export interface RecipeTag {
  id: string
  recipe_id: string
  tag_id: string
  created_at: string
}

export interface RecipeWithTags extends Recipe {
  recipe_tags: {
    tags: Tag
  }[]
}

export type RecipeFormData = {
  title: string
  prompt: string
  description?: string
  phases?: string[]
  tagIds?: string[]
}