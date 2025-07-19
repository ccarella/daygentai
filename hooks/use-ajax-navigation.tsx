'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { WorkspaceContentRef } from '@/components/workspace/workspace-content'

interface UseAjaxNavigationProps {
  workspaceSlug: string
  contentRef: React.RefObject<WorkspaceContentRef | null>
}

export function useAjaxNavigation({ workspaceSlug, contentRef }: UseAjaxNavigationProps) {
  const router = useRouter()
  
  const navigateToIssue = useCallback(async (issueId: string) => {
    // If we have a content ref, use AJAX navigation
    if (contentRef.current) {
      contentRef.current.navigateToIssue(issueId)
    } else {
      // Fallback to router navigation
      router.push(`/${workspaceSlug}/issue/${issueId}`)
    }
  }, [workspaceSlug, contentRef, router])

  const navigateToIssues = useCallback(() => {
    if (contentRef.current) {
      contentRef.current.navigateToIssuesList()
    } else {
      router.push(`/${workspaceSlug}`)
    }
  }, [workspaceSlug, contentRef, router])

  const navigateToInbox = useCallback(() => {
    if (contentRef.current) {
      contentRef.current.navigateToInbox()
    } else {
      router.push(`/${workspaceSlug}/inbox`)
    }
  }, [workspaceSlug, contentRef, router])

  return {
    navigateToIssue,
    navigateToIssues,
    navigateToInbox,
  }
}