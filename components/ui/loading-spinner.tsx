import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const spinnerVariants = cva(
  "animate-spin rounded-full border-b-2 border-primary",
  {
    variants: {
      size: {
        default: "h-8 w-8",
        sm: "h-4 w-4",
        lg: "h-12 w-12",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {}

export function LoadingSpinner({ 
  className, 
  size, 
  ...props 
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center", className)} {...props}>
      <div className={spinnerVariants({ size })} />
    </div>
  )
}