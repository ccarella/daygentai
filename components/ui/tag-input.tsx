'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Tag } from '@/components/ui/tag'

export interface TagOption {
  id: string
  name: string
  color?: string | undefined
}

interface TagInputProps {
  value: TagOption[]
  onChange: (tags: TagOption[]) => void
  availableTags: TagOption[]
  onCreateTag?: (name: string) => Promise<TagOption>
  placeholder?: string
  className?: string
}

export function TagInput({
  value = [],
  onChange,
  availableTags,
  onCreateTag,
  placeholder = 'Select tags...',
  className,
}: TagInputProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState('')

  const selectedTagIds = value.map((tag) => tag.id)
  const filteredTags = availableTags.filter(
    (tag) => !selectedTagIds.includes(tag.id)
  )

  const handleSelect = (tag: TagOption) => {
    onChange([...value, tag])
    setInputValue('')
  }

  const handleRemove = (tagId: string) => {
    onChange(value.filter((tag) => tag.id !== tagId))
  }

  const handleCreate = async () => {
    if (inputValue && onCreateTag) {
      const newTag = await onCreateTag(inputValue)
      onChange([...value, newTag])
      setInputValue('')
      setOpen(false)
    }
  }

  const showCreateOption =
    inputValue &&
    !availableTags.some(
      (tag) => tag.name.toLowerCase() === inputValue.toLowerCase()
    )

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <Tag
            key={tag.id}
            color={tag.color}
            onRemove={() => handleRemove(tag.id)}
          >
            {tag.name}
          </Tag>
        ))}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value.length === 0 ? placeholder : `${value.length} tags selected`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput
              placeholder="Search tags..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              <CommandEmpty>
                {onCreateTag && inputValue ? (
                  <div className="px-2 py-1.5">No tags found.</div>
                ) : (
                  'No tags found.'
                )}
              </CommandEmpty>
              {filteredTags.length > 0 && (
                <CommandGroup>
                  {filteredTags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.name}
                      onSelect={() => {
                        handleSelect(tag)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedTagIds.includes(tag.id)
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                      <Tag color={tag.color} className="mr-2">
                        {tag.name}
                      </Tag>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {showCreateOption && onCreateTag && (
                <CommandGroup>
                  <CommandItem onSelect={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create &quot;{inputValue}&quot;
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}