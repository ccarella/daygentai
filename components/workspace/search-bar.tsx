'use client'

import { Search, X, Loader2 } from 'lucide-react'
import { useState, forwardRef, useImperativeHandle, useRef } from 'react'

interface SearchBarProps {
  onSearch?: (query: string) => void
  placeholder?: string
  onEscape?: () => void
  isSearching?: boolean
  resultCount?: number
  showResultCount?: boolean
}

export interface SearchBarRef {
  clear: () => void
  focus: () => void
}

export const SearchBar = forwardRef<SearchBarRef, SearchBarProps>(
  ({ onSearch, placeholder = "Search issues...", onEscape, isSearching = false, resultCount, showResultCount = false }, ref) => {
    const [query, setQuery] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useImperativeHandle(ref, () => ({
      clear: () => {
        setQuery('')
        onSearch?.('')
      },
      focus: () => {
        inputRef.current?.focus()
      }
    }))

    const handleSearch = (value: string) => {
      setQuery(value)
      onSearch?.(value)
    }

    const handleClear = () => {
      setQuery('')
      onSearch?.('')
      inputRef.current?.focus()
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        if (query) {
          handleClear()
        } else {
          onEscape?.()
        }
      }
    }

    return (
      <div className="w-full">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-12 pr-24 py-4 bg-white border border-gray-200 rounded-lg text-base placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
          
          {/* Right side indicators */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            {/* Search indicator */}
            {isSearching && (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            )}
            
            {/* Result count */}
            {showResultCount && !isSearching && query && resultCount !== undefined && (
              <span className="text-sm text-gray-500">
                {resultCount} {resultCount === 1 ? 'result' : 'results'}
              </span>
            )}
            
            {/* Clear button */}
            {query && !isSearching && (
              <button
                onClick={handleClear}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                aria-label="Clear search"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>
        </div>
        
        {/* Search hint */}
        {!query && (
          <p className="mt-2 text-sm text-gray-500">
            Tip: Search filters issues by title. Press <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border border-gray-200 rounded">Esc</kbd> to clear or close search.
          </p>
        )}
      </div>
    )
  }
)

SearchBar.displayName = 'SearchBar'