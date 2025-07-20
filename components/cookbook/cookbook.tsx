'use client'

import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { RecipesList } from './recipes-list'
import { createClient } from '@/lib/supabase/client'
import { Tag } from '@/types/recipe'
import { useArrowNavigation } from '@/hooks/use-arrow-navigation'

interface CookbookProps {
  workspaceId: string
  workspaceSlug: string
  onRecipeClick?: (recipeId: string) => void
}

export function Cookbook({ workspaceId, workspaceSlug, onRecipeClick }: CookbookProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('all')
  const [tags, setTags] = useState<Tag[]>([])
  const [searchResultsCount, setSearchResultsCount] = useState(0)
  const mainContentRef = useRef<HTMLDivElement>(null)

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

  // Set up arrow navigation for recipes
  const { focusItem } = useArrowNavigation({
    containerRef: mainContentRef,
    itemSelector: '[data-recipe-row]',
    orientation: 'vertical',
    onEnter: (element) => {
      const recipeId = element.getAttribute('data-recipe-id')
      if (recipeId) {
        handleRecipeClick(recipeId)
      }
    },
    onEscape: () => {
      router.push(`/${workspaceSlug}`)
    },
    scrollIntoView: { behavior: 'smooth', block: 'nearest' },
    disableWhenModalOpen: true,
  })

  // Focus first recipe when navigating with keyboard
  useEffect(() => {
    const container = mainContentRef.current
    if (!container) return

    const handleFocusIn = () => {
      // Check if focus came from sidebar (left arrow navigation)
      const activeElement = document.activeElement
      if (activeElement?.hasAttribute('data-sidebar-item')) {
        // Focus first recipe when coming from sidebar
        setTimeout(() => focusItem(0), 0)
      }
    }

    container.addEventListener('focusin', handleFocusIn)
    return () => {
      container.removeEventListener('focusin', handleFocusIn)
    }
  }, [focusItem])

  const handleRecipeClick = (recipeId: string) => {
    if (onRecipeClick) {
      onRecipeClick(recipeId)
    } else {
      router.push(`/${workspaceSlug}/recipe/${recipeId}`)
    }
  }

  return (
    <div className="flex h-full bg-background">
      {/* Main Content Area */}
      <div ref={mainContentRef} className="flex-1 flex flex-col bg-background">
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <h1 className="text-2xl font-bold mb-4">Cookbook</h1>
          
          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {searchQuery && searchResultsCount > 0 && (
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                  {searchResultsCount} results
                </span>
              )}
            </div>

            {/* Tag Filter */}
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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