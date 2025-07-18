// Custom event system for issue updates
export const ISSUE_STATUS_UPDATED = 'issue-status-updated'

export interface IssueStatusUpdatedEvent {
  issueId: string
  newStatus: string
}

export function emitIssueStatusUpdate(issueId: string, newStatus: string) {
  const event = new CustomEvent(ISSUE_STATUS_UPDATED, {
    detail: { issueId, newStatus }
  })
  window.dispatchEvent(event)
}

export function subscribeToIssueStatusUpdates(
  callback: (event: CustomEvent<IssueStatusUpdatedEvent>) => void
) {
  window.addEventListener(ISSUE_STATUS_UPDATED, callback as EventListener)
  
  // Return unsubscribe function
  return () => {
    window.removeEventListener(ISSUE_STATUS_UPDATED, callback as EventListener)
  }
}