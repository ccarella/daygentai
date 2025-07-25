"use client"

import * as React from "react"
import { Search, FileText, /* Inbox, */ Plus, Clock, LayoutGrid, Keyboard, Sparkles, CheckCircle, Circle, Loader2, ListTodo, Kanban, Palette, Package /* BookOpen */ } from "lucide-react"
import { 
  emitIssueStatusUpdate, 
  emitCreateIssueRequest,
  emitNavigateToIssues,
  emitNavigateToInbox,
  emitToggleViewMode,
  emitToggleSearch,
  emitSetStatusFilter
} from "@/lib/events/issue-events"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CommandGroup } from "./command-group"
import { CommandItem } from "./command-item"
import { useCommandPalette } from "@/hooks/use-command-palette"
import { recommendNextIssueAction } from "@/app/actions/recommend-issue"
import { NextIssueModal } from "@/components/issues/next-issue-modal"
import { useToast } from "@/components/ui/use-toast"
import { getPlatformShortcut, detectPlatform } from "@/lib/keyboard/platform-utils"

interface Command {
  id: string
  title: string
  icon: React.ReactNode
  shortcut?: string | undefined
  action: () => void
  keywords?: string[]
  group: string
}

interface CommandPaletteProps {
  workspaceSlug: string
  workspaceId: string
  onCreateIssue?: () => void
  onToggleViewMode?: () => void
  onToggleSearch?: () => void
  onSetStatusFilter?: (status: string) => void
  getCurrentView?: () => 'list' | 'issue' | 'inbox' | 'cookbook' | 'recipe' | 'settings'
  currentIssue?: {
    id: string
    title: string
    status: string
  } | null
  onIssueStatusChange?: (newStatus: string) => void
  onNavigateToIssues?: () => void
  onNavigateToInbox?: () => void
}

export function CommandPalette({ workspaceSlug, workspaceId, onCreateIssue, onToggleViewMode, onToggleSearch, onSetStatusFilter, getCurrentView, currentIssue, onIssueStatusChange, onNavigateToIssues, onNavigateToInbox }: CommandPaletteProps) {
  // Component mounted
  React.useEffect(() => {
    // Component props initialized
  }, [workspaceSlug, workspaceId, currentIssue, onIssueStatusChange])
  const { isOpen, setIsOpen, mode } = useCommandPalette()
  const { toast } = useToast()
  const [search, setSearch] = React.useState("")
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isLoadingAction, setIsLoadingAction] = React.useState(false)
  
  // Memoize callbacks to prevent recreating functions
  const handleCreateIssue = React.useCallback(() => {
    setIsOpen(false)
    // Always emit the event
    emitCreateIssueRequest()
    // If callback is provided, call it too (for backwards compatibility)
    onCreateIssue?.()
  }, [setIsOpen, onCreateIssue])
  
  const handleToggleViewMode = React.useCallback(() => {
    setIsOpen(false)
    // Always emit the event
    emitToggleViewMode()
    // If callback is provided, call it too (for backwards compatibility)
    onToggleViewMode?.()
  }, [setIsOpen, onToggleViewMode])
  
  const handleToggleSearch = React.useCallback(() => {
    setIsOpen(false)
    // Always emit the event
    emitToggleSearch()
    // If callback is provided, call it too (for backwards compatibility)
    onToggleSearch?.()
  }, [setIsOpen, onToggleSearch])
  
  const handleNavigateToIssues = React.useCallback(() => {
    setIsOpen(false)
    // Always emit the event - the WorkspaceContent will handle navigation
    emitNavigateToIssues()
    // If callback is provided, call it too (for backwards compatibility)
    if (onNavigateToIssues) {
      onNavigateToIssues()
    }
  }, [onNavigateToIssues, setIsOpen])
  
  const handleNavigateToInbox = React.useCallback(() => {
    setIsOpen(false)
    // Always emit the event - the WorkspaceContent will handle navigation
    emitNavigateToInbox()
    // If callback is provided, call it too (for backwards compatibility)
    if (onNavigateToInbox) {
      onNavigateToInbox()
    }
  }, [onNavigateToInbox, setIsOpen])
  
  
  const handleShowRecentIssues = React.useCallback(() => {
    // TODO: Implement recent issues
  }, [])
  
  // Define refs first before using them
  const nextIssueRequestRef = React.useRef<boolean>(false)
  const isMountedRef = React.useRef<boolean>(true)
  
  // Memoize the modal close handler
  const handleNextIssueModalChange = React.useCallback((open: boolean) => {
    setNextIssueModalOpen(open)
    if (!open) {
      // Cancel any pending request when modal is closed
      nextIssueRequestRef.current = false
      // Reset data when modal is closed
      setNextIssueData({})
      // Reset loading state
      setIsLoadingNextIssue(false)
    }
  }, [])
  
  // Next Issue Modal state
  const [nextIssueModalOpen, setNextIssueModalOpen] = React.useState(false)
  const [nextIssueData, setNextIssueData] = React.useState<{
    issueId?: string
    title?: string
    justification?: string
    prompt?: string | undefined
    issueGeneratedPrompt?: string | null | undefined
    error?: string
  }>({})
  const [isLoadingNextIssue, setIsLoadingNextIssue] = React.useState(false)

  // Effect to track currentIssue changes
  React.useEffect(() => {
    // Track issue state changes
  }, [currentIssue, onIssueStatusChange])
  
  // Cleanup effect to cancel pending requests
  React.useEffect(() => {
    isMountedRef.current = true
    return () => {
      // Cancel any pending next issue request when component unmounts
      isMountedRef.current = false
      nextIssueRequestRef.current = false
    }
  }, [])
  
  // Memoize the next issue handler
  const handleNextIssue = React.useCallback(async () => {
    // Prevent concurrent requests
    if (nextIssueRequestRef.current) {
      return
    }
    
    setIsOpen(false)
    setIsLoadingNextIssue(true)
    setNextIssueModalOpen(true)
    nextIssueRequestRef.current = true
    
    try {
      const result = await recommendNextIssueAction(workspaceId)
      
      // Check if component is still mounted and request wasn't cancelled
      if (!isMountedRef.current || !nextIssueRequestRef.current) {
        return
      }
      
      if (result.error && result.retryCount !== undefined && result.retryCount >= 3) {
        // If we failed after retries, provide a more detailed error message
        if (isMountedRef.current && nextIssueRequestRef.current) {
          setNextIssueData({
            ...result,
            error: `${result.error} (Attempted ${result.retryCount} times with different prompting strategies)`
          })
        }
      } else {
        if (isMountedRef.current && nextIssueRequestRef.current) {
          setNextIssueData(result)
        }
      }
    } catch (error) {
      console.error('Error getting AI recommendation:', error)
      if (isMountedRef.current && nextIssueRequestRef.current) {
        setNextIssueData({
          error: 'Failed to get recommendation. Please try again.'
        })
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingNextIssue(false)
      }
      nextIssueRequestRef.current = false
    }
  }, [workspaceId, setIsOpen])

  // Memoize status change handlers
  const statusChangeHandlers = React.useMemo(() => {
    if (!currentIssue || !onIssueStatusChange) return {}
    
    const handlers: Record<string, () => Promise<void>> = {}
    const statusOptions = [
      { value: 'todo', label: 'Todo' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'in_review', label: 'In Review' },
      { value: 'done', label: 'Done' },
    ]
    
    statusOptions.forEach(option => {
      handlers[option.value] = async () => {
        setIsOpen(false)
        setIsLoadingAction(true)
        
        try {
          const response = await fetch(`/api/workspaces/${workspaceSlug}/issues/${currentIssue.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: option.value }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to update status')
          }

          onIssueStatusChange(option.value)
          emitIssueStatusUpdate(currentIssue.id, option.value)
          
          toast({
            title: "Status updated",
            description: `Issue status changed to ${option.label}`,
          })
        } catch (error) {
          toast({
            title: "Error updating status",
            description: error instanceof Error ? error.message : "Failed to update issue status. Please try again.",
            variant: "destructive",
          })
        } finally {
          setIsLoadingAction(false)
        }
      }
    })
    
    return handlers
  }, [currentIssue?.id, onIssueStatusChange, setIsOpen, toast, currentIssue, workspaceSlug])
  
  const commands: Command[] = React.useMemo(() => {
    const baseCommands: Command[] = []

    // Add status change command if we're on an issue page
    if (currentIssue && onIssueStatusChange) {
      const statusOptions = [
        { value: 'todo', label: 'Todo' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'in_review', label: 'In Review' },
        { value: 'done', label: 'Done' },
      ]

      statusOptions.forEach(option => {
        if (option.value !== currentIssue.status) {
          baseCommands.push({
            id: `change-status-${option.value}`,
            title: `Change Status to ${option.label}`,
            icon: <CheckCircle className="w-4 h-4" />,
            shortcut: option.value === 'todo' ? 'S then T' : 
                     option.value === 'in_progress' ? 'S then P' :
                     option.value === 'in_review' ? 'S then R' :
                     option.value === 'done' ? 'S then D' : undefined,
            action: statusChangeHandlers[option.value]!,
            keywords: ["status", "change", option.label.toLowerCase(), option.value],
            group: "Issue Actions"
          })
        }
      })
    }

    // Quick Access Section
    baseCommands.push({
      id: "create-issue",
      title: "New Issue",
      icon: <Plus className="w-4 h-4" />,
      shortcut: "C",
      action: handleCreateIssue,
      keywords: ["new", "add", "make", "create"],
      group: "Quick Access"
    })

    baseCommands.push({
      id: "next-issue",
      title: "Next Issue",
      icon: <Sparkles className="w-4 h-4" />,
      shortcut: getPlatformShortcut("⌘N", "Ctrl+N"),
      action: handleNextIssue,
      keywords: ["ai", "recommend", "suggestion", "next", "task", "priority"],
      group: "Quick Access"
    })

    baseCommands.push({
      id: "go-issues",
      title: "Go to All Issues",
      icon: <ListTodo className="w-4 h-4" />,
      shortcut: "G then I",
      action: handleNavigateToIssues,
      keywords: ["navigate", "view", "list", "issues", "all"],
      group: "Quick Access"
    })

    baseCommands.push({
      id: "go-sprint-board",
      title: "Go to Sprint Board",
      icon: <Kanban className="w-4 h-4" />,
      shortcut: "G then S",
      action: () => {
        setIsOpen(false)
        window.location.href = `/${workspaceSlug}/sprint-board`
      },
      keywords: ["navigate", "sprint", "board", "kanban", "feature", "bug"],
      group: "Quick Access"
    })

    baseCommands.push({
      id: "go-design",
      title: "Go to Design",
      icon: <Palette className="w-4 h-4" />,
      shortcut: "G then D",
      action: () => {
        setIsOpen(false)
        window.location.href = `/${workspaceSlug}/design`
      },
      keywords: ["navigate", "design", "ui", "ux", "mockup"],
      group: "Quick Access"
    })

    baseCommands.push({
      id: "go-product",
      title: "Go to Product",
      icon: <Package className="w-4 h-4" />,
      shortcut: "G then P",
      action: () => {
        setIsOpen(false)
        window.location.href = `/${workspaceSlug}/product`
      },
      keywords: ["navigate", "product", "business"],
      group: "Quick Access"
    })

    /* Go to Recipes command - HIDDEN
    baseCommands.push({
      id: "go-recipes",
      title: "Go to Recipes",
      icon: <BookOpen className="w-4 h-4" />,
      shortcut: "G then R",
      action: () => {
        setIsOpen(false)
        window.location.href = `/${workspaceSlug}/cookbook`
      },
      keywords: ["navigate", "recipes", "cookbook", "guides", "templates"],
      group: "Quick Access"
    }) */

    /* Go to Inbox command - hidden for now but preserved for future use
    baseCommands.push({
      id: "go-inbox",
      title: "Go to Inbox",
      icon: <Inbox className="w-4 h-4" />,
      shortcut: "G then N",
      action: handleNavigateToInbox,
      keywords: ["navigate", "triage", "inbox"],
      group: "Quick Access"
    })
    */

    // View Section
    baseCommands.push({
      id: "toggle-view",
      title: "Toggle List/Kanban View",
      icon: <LayoutGrid className="w-4 h-4" />,
      shortcut: getPlatformShortcut("⌘B", "Ctrl+B"),
      action: handleToggleViewMode,
      keywords: ["view", "switch", "kanban", "list", "board", "toggle"],
      group: "View"
    })

    if (onToggleSearch) {
      baseCommands.push({
        id: "toggle-search",
        title: "Toggle Search Bar",
        icon: <Search className="w-4 h-4" />,
        shortcut: "/",
        action: handleToggleSearch,
        keywords: ["search", "find", "filter", "query", "toggle", "show", "hide"],
        group: "View"
      })
    }

    // Filter by Status Section - Only show when in list view
    const currentView = getCurrentView?.()
    if (currentView === 'list' && onSetStatusFilter) {
      const statusFilterOptions = [
        { value: 'all', label: 'Filter by All', icon: <FileText className="w-4 h-4" /> },
        { value: 'exclude_done', label: 'Filter by Active', icon: <CheckCircle className="w-4 h-4" /> },
        { value: 'todo', label: 'Filter by Todo', icon: <Circle className="w-4 h-4" /> },
        { value: 'in_progress', label: 'Filter by In Progress', icon: <Clock className="w-4 h-4" /> },
        { value: 'in_review', label: 'Filter by In Review', icon: <Search className="w-4 h-4" /> },
        { value: 'done', label: 'Filter by Done', icon: <CheckCircle className="w-4 h-4" /> },
      ]

      statusFilterOptions.forEach(option => {
        baseCommands.push({
          id: `filter-status-${option.value}`,
          title: option.label,
          icon: option.icon,
          action: () => {
            setIsOpen(false)
            // Always emit the event
            emitSetStatusFilter(option.value)
            // If callback is provided, call it too (for backwards compatibility)
            onSetStatusFilter?.(option.value)
            toast({
              title: "Filter applied",
              description: `Showing ${option.label.replace('Filter by ', '').toLowerCase()} issues`,
            })
          },
          keywords: ["filter", "status", option.label.toLowerCase(), option.value],
          group: "Filter by Status"
        })
      })
    }

    // Other Filters
    baseCommands.push({
      id: "recent-issues",
      title: "Recent Issues",
      icon: <Clock className="w-4 h-4" />,
      action: handleShowRecentIssues,
      keywords: ["history", "viewed", "last", "recent"],
      group: "Filters"
    })

    return baseCommands
  }, [workspaceSlug, currentIssue, onIssueStatusChange, statusChangeHandlers, handleCreateIssue, handleNextIssue, handleNavigateToIssues, handleNavigateToInbox, handleToggleViewMode, handleToggleSearch, handleShowRecentIssues, onSetStatusFilter, getCurrentView, setIsOpen, toast])

  const filteredCommands = React.useMemo(() => {
    if (!search) return commands

    const searchLower = search.toLowerCase()
    return commands.filter(command => {
      const titleMatch = command.title.toLowerCase().includes(searchLower)
      const keywordMatch = command.keywords?.some(keyword => 
        keyword.toLowerCase().includes(searchLower)
      )
      return titleMatch || keywordMatch
    })
  }, [commands, search])

  const groupedCommands = React.useMemo(() => {
    const groups: Record<string, Command[]> = {}
    // Define the order of groups
    const groupOrder = ["Issue Actions", "Quick Access", "View", "Filter by Status", "Filters"]
    
    // Initialize groups in the desired order
    groupOrder.forEach(group => {
      groups[group] = []
    })
    
    // Add commands to their respective groups
    filteredCommands.forEach(command => {
      if (!groups[command.group]) {
        groups[command.group] = []
      }
      groups[command.group]!.push(command)
    })
    
    // Return only groups that have commands, maintaining order
    const orderedGroups: Record<string, Command[]> = {}
    groupOrder.forEach(group => {
      if (groups[group] && groups[group]!.length > 0) {
        orderedGroups[group] = groups[group]!
      }
    })
    
    // Add any remaining groups that weren't in groupOrder
    Object.keys(groups).forEach(group => {
      if (!orderedGroups[group] && groups[group]!.length > 0) {
        orderedGroups[group] = groups[group]!
      }
    })
    
    return orderedGroups
  }, [filteredCommands])

  const flatCommands = React.useMemo(() => 
    Object.values(groupedCommands).flat(),
    [groupedCommands]
  )

  React.useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      setSearch("")
      setSelectedIndex(0)
    }
  }, [isOpen])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      // Handle Escape key for both command and help modes
      if (e.key === "Escape") {
        e.preventDefault()
        setIsOpen(false)
        return
      }

      // Skip other keyboard navigation in help mode
      if (mode === 'help') return

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex(prev => 
            prev < flatCommands.length - 1 ? prev + 1 : 0
          )
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : flatCommands.length - 1
          )
          break
        case "Enter":
          e.preventDefault()
          if (flatCommands[selectedIndex]) {
            flatCommands[selectedIndex].action()
            setIsOpen(false)
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, mode, flatCommands, selectedIndex, setIsOpen])

  // Cheatsheet content
  const renderCheatsheet = () => {
    const platform = detectPlatform()
    const modKey = platform === 'mac' ? '⌘' : 'Ctrl'
    
    const shortcutGroups = [
      {
        title: "General",
        shortcuts: [
          { keys: [modKey, "K"], description: "Open command palette" },
          { keys: ["?"], description: "Show keyboard shortcuts" },
          ...(onToggleSearch ? [{ keys: ["/"], description: "Toggle search bar" }] : []),
          { keys: ["Esc"], description: "Close dialogs and cancel actions" },
        ]
      },
      {
        title: "Quick Access",
        shortcuts: [
          { keys: ["C"], description: "Create new issue" },
          { keys: [modKey, "N"], description: "Get next issue recommendation" },
          { keys: ["G", "then", "I"], description: "Go to All Issues" },
          { keys: ["G", "then", "S"], description: "Go to Sprint Board" },
          { keys: ["G", "then", "D"], description: "Go to Design" },
          { keys: ["G", "then", "P"], description: "Go to Product" },
          { keys: ["G", "then", "R"], description: "Go to Recipes" },
        ]
      },
      ...(currentIssue ? [{
        title: "Issue Actions",
        shortcuts: [
          { keys: ["S", "then", "T"], description: "Change status to Todo" },
          { keys: ["S", "then", "P"], description: "Change status to In Progress" },
          { keys: ["S", "then", "R"], description: "Change status to In Review" },
          { keys: ["S", "then", "D"], description: "Change status to Done" },
        ]
      }] : []),
      {
        title: "View",
        shortcuts: [
          { keys: [modKey, "B"], description: "Toggle List/Kanban view" },
        ]
      },
      {
        title: "Command Palette",
        shortcuts: [
          { keys: ["↑", "↓"], description: "Navigate through commands" },
          { keys: ["Enter"], description: "Select command" },
          { keys: ["Type"], description: "Filter commands" },
        ]
      }
    ]

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Keyboard className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Keyboard Shortcuts & Help</h2>
        </div>
        
        {shortcutGroups.map((group) => (
          <div key={group.title}>
            <h3 className="text-sm font-medium text-foreground mb-3">{group.title}</h3>
            <div className="space-y-2">
              {group.shortcuts.map((shortcut, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent"
                >
                  <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, keyIndex) => (
                      <React.Fragment key={keyIndex}>
                        {keyIndex > 0 && key !== "then" && (
                          <span className="text-xs text-muted-foreground">+</span>
                        )}
                        {key === "then" ? (
                          <span className="text-xs text-muted-foreground mx-1">then</span>
                        ) : (
                          <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded-md">
                            {key}
                          </kbd>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Press <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground bg-muted border border-border rounded">?</kbd> to show this help anytime
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="p-0 max-w-2xl">
          <DialogTitle className="sr-only">
            {mode === 'help' ? 'Keyboard Shortcuts & Help' : 'Command Palette'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {mode === 'help' ? 'View keyboard shortcuts and help information' : 'Search for commands and actions'}
          </DialogDescription>
          
          {mode === 'help' ? (
            <ScrollArea className="max-h-[600px]">
              {renderCheatsheet()}
            </ScrollArea>
          ) : (
            <>
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <Input
                  ref={inputRef}
                  placeholder="Type a command or search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex h-12 w-full border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0"
                />
              </div>
              <ScrollArea className="max-h-[300px] overflow-y-auto p-2">
                {Object.entries(groupedCommands).map(([group, commands]) => (
                  <CommandGroup key={group} heading={group}>
                    {commands.map((command) => {
                      const globalIndex = flatCommands.indexOf(command)
                      return (
                        <CommandItem
                          key={command.id}
                          data-command-id={command.id}
                          onSelect={() => {
                            command.action()
                            setIsOpen(false)
                          }}
                          className={globalIndex === selectedIndex ? "bg-accent" : ""}
                        >
                          {command.icon}
                          <span className="ml-2">{command.title}</span>
                          {command.shortcut && (
                            <span className="ml-auto text-xs tracking-widest opacity-60">
                              {command.shortcut}
                            </span>
                          )}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                ))}
                {filteredCommands.length === 0 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No results found.
                  </div>
                )}
              </ScrollArea>
            </>
          )}
          
          {/* Loading overlay */}
          {isLoadingAction && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Processing...</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <NextIssueModal
        open={nextIssueModalOpen}
        onOpenChange={handleNextIssueModalChange}
        issueId={nextIssueData.issueId || undefined}
        title={nextIssueData.title || undefined}
        justification={nextIssueData.justification || undefined}
        error={nextIssueData.error || undefined}
        prompt={nextIssueData.prompt || undefined}
        issueGeneratedPrompt={nextIssueData.issueGeneratedPrompt || undefined}
        workspaceSlug={workspaceSlug}
        isLoading={isLoadingNextIssue}
      />
    </>
  )
}