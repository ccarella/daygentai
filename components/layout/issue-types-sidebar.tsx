'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { ISSUE_TYPE } from '@/lib/validation/issue-validation'
import { cn } from '@/lib/utils'

interface IssueTypesSidebarProps {
  currentTypeFilter: string
  onTypeFilterChange: (type: string) => void
  collapsed?: boolean
}

const typeIcons = {
  bug: '🐛',
  feature: '✨',
  task: '📋',
  epic: '🎯',
  spike: '🔍',
  chore: '🔧',
  design: '🎨',
  'non-technical': '📝'
}

const typeLabels = {
  bug: 'Bug',
  feature: 'Feature',
  task: 'Task',
  epic: 'Epic',
  spike: 'Spike',
  chore: 'Chore',
  design: 'Design',
  'non-technical': 'Non-technical'
}

export function IssueTypesSidebar({ 
  currentTypeFilter, 
  onTypeFilterChange,
  collapsed = false 
}: IssueTypesSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Count for "All" option - when no filter is applied
  const isAllSelected = currentTypeFilter === 'all'

  if (collapsed) {
    // Show only icons when sidebar is collapsed
    return (
      <div className="px-2 py-2">
        <div className="space-y-1">
          <button
            onClick={() => onTypeFilterChange('all')}
            className={cn(
              "w-full p-2 rounded-lg transition-colors flex items-center justify-center",
              isAllSelected 
                ? "bg-accent text-foreground" 
                : "hover:bg-accent text-muted-foreground"
            )}
            title="All Types"
          >
            <span className="text-sm">📁</span>
          </button>
          {ISSUE_TYPE.map((type) => (
            <button
              key={type}
              onClick={() => onTypeFilterChange(type)}
              className={cn(
                "w-full p-2 rounded-lg transition-colors flex items-center justify-center",
                currentTypeFilter === type 
                  ? "bg-accent text-foreground" 
                  : "hover:bg-accent text-muted-foreground"
              )}
              title={typeLabels[type]}
            >
              <span className="text-sm">{typeIcons[type]}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-2 py-2 border-t border-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
      >
        <span>Issue Types</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      
      {isExpanded && (
        <div className="mt-1 space-y-0.5">
          <button
            onClick={() => onTypeFilterChange('all')}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors",
              isAllSelected 
                ? "bg-accent text-foreground" 
                : "hover:bg-accent text-muted-foreground"
            )}
          >
            <span className="text-base">📁</span>
            <span>All Types</span>
          </button>
          
          {ISSUE_TYPE.map((type) => (
            <button
              key={type}
              onClick={() => onTypeFilterChange(type)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors",
                currentTypeFilter === type 
                  ? "bg-accent text-foreground" 
                  : "hover:bg-accent text-muted-foreground"
              )}
            >
              <span className="text-base">{typeIcons[type]}</span>
              <span>{typeLabels[type]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}