import * as React from "react"
import { cn } from "@/lib/utils"

interface CommandGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  heading?: string
}

export function CommandGroup({ heading, children, className, ...props }: CommandGroupProps) {
  return (
    <div className={cn("mb-2", className)} {...props}>
      {heading && (
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {heading}
        </div>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  )
}