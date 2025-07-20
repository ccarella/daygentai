'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'
import { stripMarkdown } from '@/lib/markdown-utils'
import { RecipeSkeleton } from './recipe-skeleton'
import { Tag as TagComponent } from '@/components/ui/tag'
import { RecipeWithTags } from '@/types/recipe'

interface RecipesListProps {
  workspaceId: string
  workspaceSlug: string
  onRecipeClick?: (recipeId: string) => void
  tagFilter?: string
  searchQuery?: string
  onSearchResultsChange?: (count: number) => void
}

const RECIPES_PER_PAGE = 50

export function RecipesList({ 
  workspaceId, 
  workspaceSlug, 
  onRecipeClick,
  tagFilter = 'all',
  searchQuery = '',
  onSearchResultsChange
}: RecipesListProps) {
  const router = useRouter()
  const [recipes, setRecipes] = useState<RecipeWithTags[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const isLoadingRef = useRef(false)

  const fetchRecipes = useCallback(async (pageNum: number) => {
    if (isLoadingRef.current) return { recipes: [], hasMore: false, totalCount: 0 }
    
    isLoadingRef.current = true
    const supabase = createClient()
    
    // If filtering by tag, we need to get recipe IDs that have that tag first
    let recipeIds: string[] | null = null
    if (tagFilter !== 'all') {
      const { data: taggedRecipes } = await supabase
        .from('recipe_tags')
        .select('recipe_id')
        .eq('tag_id', tagFilter)
      
      if (taggedRecipes && taggedRecipes.length > 0) {
        recipeIds = taggedRecipes.map(rt => rt.recipe_id)
      } else {
        // No recipes with this tag
        isLoadingRef.current = false
        return { recipes: [], hasMore: false, totalCount: 0 }
      }
    }

    // Build the base query for counting
    let countQuery = supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
    
    // Apply tag filter to count query
    if (recipeIds !== null) {
      countQuery = countQuery.in('id', recipeIds)
    }

    const { count: tagFilteredCount } = await countQuery

    // Now fetch the actual data
    let query = supabase
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
      .eq('workspace_id', workspaceId)

    // Apply tag filter to data query
    if (recipeIds !== null) {
      query = query.in('id', recipeIds)
    }

    // Apply ordering - system recipes first, then by created date
    query = query
      .order('is_system', { ascending: false })
      .order('created_at', { ascending: false })

    // If we have a search query, we need to fetch ALL recipes matching the tag filter
    // and then filter by search client-side to get accurate counts
    let allRecipes: RecipeWithTags[] = []
    if (searchQuery && searchQuery.trim() !== '') {
      // Fetch all recipes without pagination to apply search filter
      const { data: allData, error: allError } = await query
      
      if (allError) {
        console.error('Error fetching all recipes:', allError)
        isLoadingRef.current = false
        return { recipes: [], hasMore: false, totalCount: 0 }
      }
      
      allRecipes = allData || []
      
      // Apply search filter
      const searchLower = searchQuery.toLowerCase()
      allRecipes = allRecipes.filter((recipe: RecipeWithTags) => 
        recipe.title.toLowerCase().includes(searchLower) ||
        (recipe.description && recipe.description.toLowerCase().includes(searchLower)) ||
        recipe.prompt.toLowerCase().includes(searchLower)
      )
      
      // Apply pagination to filtered results
      const start = pageNum * RECIPES_PER_PAGE
      const end = start + RECIPES_PER_PAGE
      const paginatedRecipes = allRecipes.slice(start, end)
      
      isLoadingRef.current = false
      
      const totalCount = allRecipes.length
      const hasMorePages = end < totalCount
      
      return { recipes: paginatedRecipes, hasMore: hasMorePages, totalCount }
    } else {
      // No search query, use normal pagination
      const start = pageNum * RECIPES_PER_PAGE
      const end = start + RECIPES_PER_PAGE - 1
      query = query.range(start, end)
      
      const { data, error } = await query
      
      isLoadingRef.current = false
      
      if (error) {
        console.error('Error fetching recipes:', error)
        return { recipes: [], hasMore: false, totalCount: 0 }
      }
      
      const recipes = data || []
      const totalCount = tagFilteredCount || 0
      const hasMorePages = (pageNum + 1) * RECIPES_PER_PAGE < totalCount
      
      return { recipes, hasMore: hasMorePages, totalCount }
    }
  }, [workspaceId, tagFilter, searchQuery])

  // Initial load when component mounts or filters change
  useEffect(() => {
    let cancelled = false

    const loadInitialData = async () => {
      if (recipes.length === 0) {
        setInitialLoading(true)
      }
      
      const { recipes: newRecipes, hasMore: moreAvailable, totalCount: total } = await fetchRecipes(0)
      
      if (!cancelled) {
        setRecipes(newRecipes)
        setHasMore(moreAvailable)
        setTotalCount(total)
        setPage(0)
        setInitialLoading(false)
        
        // Notify parent of search results count if searching
        if (searchQuery && onSearchResultsChange) {
          onSearchResultsChange(newRecipes.length)
        }
      }
    }

    loadInitialData()

    return () => {
      cancelled = true
      isLoadingRef.current = false
    }
  }, [workspaceId, tagFilter, searchQuery])

  // Load more recipes handler
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || isLoadingRef.current) return

    setLoadingMore(true)
    const nextPage = page + 1
    
    const { recipes: newRecipes, hasMore: moreAvailable, totalCount: total } = await fetchRecipes(nextPage)
    
    if (newRecipes.length > 0) {
      setRecipes(prev => [...prev, ...newRecipes])
      setPage(nextPage)
      setHasMore(moreAvailable)
      setTotalCount(total)
    }
    
    setLoadingMore(false)
  }

  const truncateDescription = (description: string | null, maxLength: number = 100) => {
    if (!description) return ''
    const plainText = stripMarkdown(description)
    if (plainText.length <= maxLength) return plainText
    return plainText.substring(0, maxLength).trim() + '...'
  }

  if (initialLoading) {
    return <RecipeSkeleton count={5} />
  }

  if (recipes.length === 0 && !initialLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <div className="absolute -top-2 -right-2">
                <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No recipes found</h3>
          <p className="text-sm text-gray-500">
            {tagFilter !== 'all' || searchQuery
              ? 'Try adjusting your filters' 
              : 'Recipes will appear here once added'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="">
        {/* Header with count */}
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-600">
            {totalCount > 0 && recipes.length < totalCount ? (
              <>Showing {recipes.length} of {totalCount} {totalCount === 1 ? 'recipe' : 'recipes'}</>
            ) : (
              <>{recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}</>
            )}
          </h2>
        </div>
        
        {/* Recipes List */}
        <div className="divide-y divide-gray-100">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              data-recipe-row
              data-recipe-id={recipe.id}
              className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => {
                if (onRecipeClick) {
                  onRecipeClick(recipe.id)
                } else {
                  router.push(`/${workspaceSlug}/recipe/${recipe.id}`)
                }
              }}
            >
              {/* Recipe Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-medium text-gray-900">
                    {recipe.title}
                  </h3>
                  {recipe.is_system && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      System
                    </span>
                  )}
                </div>
                
                {recipe.description && (
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                    {truncateDescription(recipe.description, 150)}
                  </p>
                )}
                
                <div className="mt-2 flex items-center gap-2 text-xs">
                  {/* Tags */}
                  {recipe.recipe_tags && recipe.recipe_tags.length > 0 && (
                    <div className="flex items-center gap-1">
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
                  
                  {/* Phase count */}
                  {recipe.phases && recipe.phases.length > 0 && (
                    <span className="text-gray-500">
                      {recipe.phases.length} {recipe.phases.length === 1 ? 'phase' : 'phases'}
                    </span>
                  )}
                  
                  {/* Created Date - Hidden on mobile */}
                  <span className="hidden sm:inline text-gray-400 ml-auto">
                    {formatDistanceToNow(new Date(recipe.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Load more button */}
        {hasMore && !initialLoading && (
          <div className="px-6 py-8 flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                loadingMore
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
        
        {/* End of list message */}
        {!hasMore && recipes.length > 0 && (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            All recipes loaded
          </div>
        )}
      </div>
    </div>
  )
}