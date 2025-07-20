"use client"

import * as React from "react"
import { Keyboard } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface KeyboardShortcutsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ShortcutGroup {
  title: string
  shortcuts: {
    keys: string[]
    description: string
  }[]
}

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  const shortcutGroups: ShortcutGroup[] = [
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-6">
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
      </DialogContent>
    </Dialog>
  )
}