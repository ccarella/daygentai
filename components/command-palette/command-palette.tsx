"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, FileText, Inbox, Plus, Filter, Clock, LayoutGrid, Keyboard } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CommandGroup } from "./command-group"
import { CommandItem } from "./command-item"
import { useCommandPalette } from "@/hooks/use-command-palette"

interface Command {
  id: string
  title: string
  icon: React.ReactNode
  shortcut?: string
  action: () => void
  keywords?: string[]
  group: string
}

interface CommandPaletteProps {
  workspaceSlug: string
  onCreateIssue?: () => void
  onToggleViewMode?: () => void
  onToggleSearch?: () => void
}

export function CommandPalette({ workspaceSlug, onCreateIssue, onToggleViewMode, onToggleSearch }: CommandPaletteProps) {
  const router = useRouter()
  const { isOpen, setIsOpen, mode } = useCommandPalette()
  const [search, setSearch] = React.useState("")
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const commands: Command[] = React.useMemo(() => [
    {
      id: "go-issues",
      title: "Go to Issues",
      icon: <FileText className="w-4 h-4" />,
      shortcut: "G then I",
      action: () => router.push(`/${workspaceSlug}`),
      keywords: ["navigate", "view", "list"],
      group: "Navigation"
    },
    {
      id: "go-inbox",
      title: "Go to Inbox",
      icon: <Inbox className="w-4 h-4" />,
      shortcut: "G then N",
      action: () => router.push(`/${workspaceSlug}/inbox`),
      keywords: ["navigate", "triage"],
      group: "Navigation"
    },
    {
      id: "create-issue",
      title: "Create New Issue",
      icon: <Plus className="w-4 h-4" />,
      shortcut: "C",
      action: () => {
        setIsOpen(false)
        onCreateIssue?.()
      },
      keywords: ["new", "add", "make"],
      group: "Create"
    },
    {
      id: "toggle-view",
      title: "Toggle List/Kanban View",
      icon: <LayoutGrid className="w-4 h-4" />,
      shortcut: "⌘B",
      action: () => {
        setIsOpen(false)
        onToggleViewMode?.()
      },
      keywords: ["view", "switch", "kanban", "list", "board", "toggle"],
      group: "View"
    },
    {
      id: "toggle-search",
      title: "Toggle Search Bar",
      icon: <Search className="w-4 h-4" />,
      shortcut: "/",
      action: () => {
        setIsOpen(false)
        onToggleSearch?.()
      },
      keywords: ["search", "find", "filter", "query", "toggle", "show", "hide"],
      group: "View"
    },
    {
      id: "filter-status",
      title: "Filter by Status",
      icon: <Filter className="w-4 h-4" />,
      action: () => {
        // TODO: Implement filter functionality
        console.log("Filter by status")
      },
      keywords: ["status", "todo", "in progress", "done"],
      group: "Filters"
    },
    {
      id: "recent-issues",
      title: "Recent Issues",
      icon: <Clock className="w-4 h-4" />,
      action: () => {
        // TODO: Implement recent issues
        console.log("Show recent issues")
      },
      keywords: ["history", "viewed", "last"],
      group: "Quick Access"
    }
  ], [workspaceSlug, router, setIsOpen, onCreateIssue, onToggleViewMode, onToggleSearch])

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
    filteredCommands.forEach(command => {
      if (!groups[command.group]) {
        groups[command.group] = []
      }
      groups[command.group]!.push(command)
    })
    return groups
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
      if (!isOpen || mode === 'help') return

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
    const shortcutGroups = [
      {
        title: "General",
        shortcuts: [
          { keys: ["⌘", "K"], description: "Open command palette" },
          { keys: ["/"], description: "Toggle search bar" },
          { keys: ["Esc"], description: "Close dialogs and cancel actions" },
        ]
      },
      {
        title: "Navigation",
        shortcuts: [
          { keys: ["G", "then", "I"], description: "Go to Issues" },
          { keys: ["G", "then", "N"], description: "Go to Inbox" },
        ]
      },
      {
        title: "Actions",
        shortcuts: [
          { keys: ["C"], description: "Create new issue" },
          { keys: ["⌘", "B"], description: "Toggle List/Kanban view" },
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
            <h3 className="text-sm font-medium text-gray-900 mb-3">{group.title}</h3>
            <div className="space-y-2">
              {group.shortcuts.map((shortcut, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
                >
                  <span className="text-sm text-gray-600">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, keyIndex) => (
                      <React.Fragment key={keyIndex}>
                        {keyIndex > 0 && key !== "then" && (
                          <span className="text-xs text-gray-400">+</span>
                        )}
                        {key === "then" ? (
                          <span className="text-xs text-gray-400 mx-1">then</span>
                        ) : (
                          <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-md">
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
          <p className="text-xs text-gray-500">
            <strong>Tip:</strong> Press <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">?</kbd> to show this help anytime
          </p>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="p-0 max-w-2xl">
        <DialogTitle className="sr-only">
          {mode === 'help' ? 'Keyboard Shortcuts & Help' : 'Command Palette'}
        </DialogTitle>
        
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
      </DialogContent>
    </Dialog>
  )
}