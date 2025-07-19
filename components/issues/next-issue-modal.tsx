'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ExternalLink, AlertCircle, Loader2 } from 'lucide-react'
import { PromptDisplay } from '@/components/issues/prompt-display'

interface NextIssueModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  issueId?: string | undefined
  title?: string | undefined
  justification?: string | undefined
  error?: string | undefined
  workspaceSlug: string
  prompt?: string | undefined
  issueGeneratedPrompt?: string | null | undefined
  isLoading?: boolean
  onNavigateToIssue?: (issueId: string) => void
}

export function NextIssueModal({
  open,
  onOpenChange,
  issueId,
  title,
  justification,
  error,
  workspaceSlug,
  issueGeneratedPrompt,
  isLoading,
  onNavigateToIssue,
}: NextIssueModalProps) {
  const router = useRouter()

  const handleGoToIssue = () => {
    if (issueId && workspaceSlug) {
      onOpenChange(false)
      if (onNavigateToIssue) {
        onNavigateToIssue(issueId)
      } else {
        const issueUrl = `/${workspaceSlug}/issue/${issueId}`
        router.push(issueUrl)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI Issue Recommendation</DialogTitle>
          {!error && (
            <DialogDescription>
              Based on your current todo issues, here&apos;s what we recommend working on next.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Getting AI recommendation...</span>
            </div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 p-4 text-red-900">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="text-sm">{error}</div>
              </div>
            </div>
          ) : (
            <>
              {/* Recommendation */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Recommended Issue</h3>
                  <p className="text-base">{title}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Justification</h4>
                  <p className="text-sm">{justification}</p>
                </div>
              </div>

              {/* Issue Prompt Section */}
              {issueGeneratedPrompt && (
                <PromptDisplay prompt={issueGeneratedPrompt} className="mt-4" />
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isLoading ? 'Cancel' : 'Close'}
          </Button>
          {!isLoading && !error && issueId && (
            <Button 
              onClick={handleGoToIssue}
              disabled={!issueId || !workspaceSlug}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Go to Issue
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}