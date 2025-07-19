'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const tagVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface TagProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tagVariants> {
  onRemove?: () => void
  color?: string | undefined
}

const Tag = React.forwardRef<HTMLDivElement, TagProps>(
  ({ className, variant, onRemove, color, children, style, ...props }, ref) => {
    const customStyle = color
      ? {
          backgroundColor: color,
          color: '#ffffff',
          ...style,
        }
      : style

    return (
      <div
        ref={ref}
        className={cn(tagVariants({ variant }), className)}
        style={customStyle}
        {...props}
      >
        {children}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="ml-1 rounded-full hover:bg-white/20 focus:outline-none"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    )
  }
)
Tag.displayName = 'Tag'

export { Tag, tagVariants }