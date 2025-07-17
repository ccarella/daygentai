import * as React from "react"
import { cn } from "@/lib/utils"

interface CommandItemProps extends React.HTMLAttributes<HTMLDivElement> {
  onSelect?: () => void
}

export function CommandItem({ 
  children, 
  className, 
  onSelect,
  ...props 
}: CommandItemProps) {
  return (
    <div
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      onClick={onSelect}
      {...props}
    >
      {children}
    </div>
  )
}