'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { UserWorkspace } from '@/lib/supabase/workspaces'

interface WorkspaceSwitcherProps {
  currentWorkspace: {
    id: string
    name: string
    slug: string
    avatar_url: string | null
  } | null
  workspaces: UserWorkspace[]
  collapsed?: boolean
  onRequestCreateWorkspace?: () => void
}

export function WorkspaceSwitcher({ currentWorkspace, workspaces, collapsed = false, onRequestCreateWorkspace }: WorkspaceSwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  

  const handleWorkspaceChange = (slug: string) => {
    if (slug === 'create-new') {
      onRequestCreateWorkspace?.()
      setOpen(false)
    } else if (!currentWorkspace || slug !== currentWorkspace.slug) {
      router.push(`/${slug}`)
      setOpen(false)
    } else {
      setOpen(false)
    }
  }


  if (collapsed) {
    return (
      <>
        <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className="w-10 h-10 p-0 hover:bg-accent"
          >
            <span className="text-xl">{currentWorkspace?.avatar_url || '🏢'}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search workspace..." />
            <CommandList>
              <CommandEmpty>No workspace found.</CommandEmpty>
              <CommandGroup>
                {workspaces.length === 0 && (
                  <CommandItem disabled>
                    <span className="text-muted-foreground">Loading workspaces...</span>
                  </CommandItem>
                )}
                {workspaces.map((workspace) => (
                  <CommandItem
                    key={workspace.id}
                    value={workspace.slug}
                    onSelect={handleWorkspaceChange}
                    className="cursor-pointer"
                  >
                    <span className="text-lg mr-2">{workspace.avatar_url || '🏢'}</span>
                    <span className={cn(
                      "flex-1",
                      currentWorkspace && workspace.slug === currentWorkspace.slug && "font-semibold"
                    )}>
                      {workspace.name}
                    </span>
                    {currentWorkspace && workspace.slug === currentWorkspace?.slug && (
                      <Check className="ml-2 h-4 w-4" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value="create-new"
                  onSelect={handleWorkspaceChange}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create workspace
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
    )
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between px-3 py-2 h-auto font-normal hover:bg-accent"
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{currentWorkspace?.avatar_url || '🏢'}</span>
            <span className="font-semibold text-foreground">{currentWorkspace?.name || 'Select workspace'}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search workspace..." />
          <CommandList>
            <CommandEmpty>No workspace found.</CommandEmpty>
            <CommandGroup heading="Workspaces">
              {workspaces.length === 0 && (
                <CommandItem disabled>
                  <span className="text-muted-foreground">Loading workspaces...</span>
                </CommandItem>
              )}
              {workspaces.map((workspace) => (
                <CommandItem
                  key={workspace.id}
                  value={workspace.slug}
                  onSelect={handleWorkspaceChange}
                  className="cursor-pointer"
                >
                  <span className="text-lg mr-2">{workspace.avatar_url || '🏢'}</span>
                  <div className="flex flex-col flex-1">
                    <span className={cn(
                      currentWorkspace && workspace.slug === currentWorkspace.slug && "font-semibold"
                    )}>
                      {workspace.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{workspace.role}</span>
                  </div>
                  {currentWorkspace && workspace.slug === currentWorkspace.slug && (
                    <Check className="ml-2 h-4 w-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                value="create-new"
                onSelect={handleWorkspaceChange}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create new workspace
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  </>
  )
}