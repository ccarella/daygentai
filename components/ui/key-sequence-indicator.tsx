import * as React from "react"

interface KeySequenceIndicatorProps {
  sequence: string[]
}

export function KeySequenceIndicator({ sequence }: KeySequenceIndicatorProps) {
  if (sequence.length === 0) return null

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-foreground text-background px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in animate-slide-in-from-bottom animate-duration-200">
        <span className="text-sm font-mono">
          {sequence.map(key => key.toUpperCase()).join(" → ")}
        </span>
        <span className="text-xs text-background/60">waiting for next key...</span>
      </div>
    </div>
  )
}