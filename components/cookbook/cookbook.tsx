'use client'

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { RecipesList } from './recipes-list'
import { createClient } from '@/lib/supabase/client'
import { Tag } from '@/types/recipe'

interface CookbookProps {
  workspaceId: string
  workspaceSlug: string
}

export function Cookbook({ workspaceId, workspaceSlug }: CookbookProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('all')
  const [tags, setTags] = useState<Tag[]>([])
  const [searchResultsCount, setSearchResultsCount] = useState(0)

  // Fetch available tags
  useEffect(() => {
    const fetchTags = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('tags')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name')

      if (data) {
        setTags(data)
      }
    }

    fetchTags()
  }, [workspaceId])

  // Handle ESC key to navigate back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        router.push(`/${workspaceSlug}`)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router, workspaceSlug])

  const handleRecipeClick = (recipeId: string) => {
    router.push(`/${workspaceSlug}/recipe/${recipeId}`)
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold mb-4">Cookbook</h1>
          
          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && searchResultsCount > 0 && (
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                  {searchResultsCount} results
                </span>
              )}
            </div>

            {/* Tag Filter */}
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Tags</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Recipes List */}
        <RecipesList
          workspaceId={workspaceId}
          workspaceSlug={workspaceSlug}
          onRecipeClick={handleRecipeClick}
          tagFilter={tagFilter}
          searchQuery={searchQuery}
          onSearchResultsChange={setSearchResultsCount}
        />
      </div>
    </div>
  )
}