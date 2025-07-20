'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { RecipeDetailSkeleton } from './recipe-skeleton'
import { Tag as TagComponent } from '@/components/ui/tag'
import { RecipeWithTags } from '@/types/recipe'

interface RecipeDetailsProps {
  recipeId: string
  onBack: () => void
}

export function RecipeDetails({ recipeId, onBack }: RecipeDetailsProps) {
  const [recipe, setRecipe] = useState<RecipeWithTags | null>(null)
  const [loading, setLoading] = useState(true)
  const [creatorName, setCreatorName] = useState<string>('')
  const [createdAt, setCreatedAt] = useState<string>('')

  // Handle ESC key to navigate back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onBack()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onBack])

  useEffect(() => {
    const fetchRecipe = async () => {
      setLoading(true)
      const supabase = createClient()

      // Fetch recipe data
      const { data: recipe, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_tags (
            tags (
              id,
              name,
              color
            )
          )
        `)
        .eq('id', recipeId)
        .single()

      if (error || !recipe) {
        setLoading(false)
        return
      }

      setRecipe(recipe)
      setCreatedAt(recipe.created_at)

      // Fetch creator info
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', recipe.created_by)
        .single()

      if (profile) {
        const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        setCreatorName(fullName || 'Unknown')
      } else {
        setCreatorName('Unknown')
      }

      setLoading(false)
    }

    fetchRecipe()
  }, [recipeId])

  if (loading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <RecipeDetailSkeleton />
        </div>
      </div>
    )
  }

  if (!recipe) {
    return null
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Header with back button */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to cookbook
          </button>
        </div>

        {/* Recipe Content */}
        <div className="space-y-6">
          {/* Title */}
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground break-words">
              {recipe.title}
            </h1>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              {recipe.is_system && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                  System Recipe
                </span>
              )}
              <span>Created by {creatorName}</span>
              <span>•</span>
              <span>{createdAt && formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
            </div>
          </div>

          {/* Tags */}
          {recipe.recipe_tags && recipe.recipe_tags.length > 0 && (
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-muted-foreground text-sm">Tags:</span>
              {recipe.recipe_tags.map(({ tags }) => (
                <TagComponent
                  key={tags.id}
                  color={tags.color}
                  className="text-xs"
                >
                  {tags.name}
                </TagComponent>
              ))}
            </div>
          )}

          {/* Prompt */}
          <div className="bg-muted rounded-lg p-4">
            <h2 className="text-sm font-medium text-foreground mb-2">Prompt</h2>
            <p className="text-sm text-foreground whitespace-pre-wrap">{recipe.prompt}</p>
          </div>

          {/* Description */}
          {recipe.description && (
            <div>
              <h2 className="text-lg font-medium text-foreground mb-3">Description</h2>
              <div className="prose prose-sm sm:prose max-w-none break-words">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {recipe.description}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Phases */}
          {recipe.phases && recipe.phases.length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-foreground mb-3">Phases</h2>
              <div className="space-y-3">
                {recipe.phases.map((phase, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{phase}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}