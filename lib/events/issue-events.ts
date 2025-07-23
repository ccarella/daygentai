// Custom event system for issue updates and navigation
export const ISSUE_STATUS_UPDATED = 'issue-status-updated'
export const CREATE_ISSUE_REQUESTED = 'create-issue-requested'
export const NAVIGATE_TO_ISSUES = 'navigate-to-issues'
export const NAVIGATE_TO_INBOX = 'navigate-to-inbox'
export const TOGGLE_VIEW_MODE = 'toggle-view-mode'
export const TOGGLE_SEARCH = 'toggle-search'
export const SET_STATUS_FILTER = 'set-status-filter'
export const SET_TYPE_FILTER = 'set-type-filter'

export interface IssueStatusUpdatedEvent {
  issueId: string
  newStatus: string
}

export interface SetStatusFilterEvent {
  status: string
}

export interface SetTypeFilterEvent {
  type: string
}

export function emitIssueStatusUpdate(issueId: string, newStatus: string) {
  const event = new CustomEvent(ISSUE_STATUS_UPDATED, {
    detail: { issueId, newStatus }
  })
  window.dispatchEvent(event)
}

export function emitCreateIssueRequest() {
  const event = new CustomEvent(CREATE_ISSUE_REQUESTED)
  window.dispatchEvent(event)
}

export function emitNavigateToIssues() {
  const event = new CustomEvent(NAVIGATE_TO_ISSUES)
  window.dispatchEvent(event)
}

export function emitNavigateToInbox() {
  const event = new CustomEvent(NAVIGATE_TO_INBOX)
  window.dispatchEvent(event)
}

export function emitToggleViewMode() {
  const event = new CustomEvent(TOGGLE_VIEW_MODE)
  window.dispatchEvent(event)
}

export function emitToggleSearch() {
  const event = new CustomEvent(TOGGLE_SEARCH)
  window.dispatchEvent(event)
}

export function emitSetStatusFilter(status: string) {
  const event = new CustomEvent(SET_STATUS_FILTER, {
    detail: { status }
  })
  window.dispatchEvent(event)
}

export function emitSetTypeFilter(type: string) {
  const event = new CustomEvent(SET_TYPE_FILTER, {
    detail: { type }
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

export function subscribeToCreateIssueRequests(
  callback: () => void
) {
  window.addEventListener(CREATE_ISSUE_REQUESTED, callback as EventListener)
  
  // Return unsubscribe function
  return () => {
    window.removeEventListener(CREATE_ISSUE_REQUESTED, callback as EventListener)
  }
}

export function subscribeToNavigateToIssues(
  callback: () => void
) {
  window.addEventListener(NAVIGATE_TO_ISSUES, callback as EventListener)
  
  // Return unsubscribe function
  return () => {
    window.removeEventListener(NAVIGATE_TO_ISSUES, callback as EventListener)
  }
}

export function subscribeToNavigateToInbox(
  callback: () => void
) {
  window.addEventListener(NAVIGATE_TO_INBOX, callback as EventListener)
  
  // Return unsubscribe function
  return () => {
    window.removeEventListener(NAVIGATE_TO_INBOX, callback as EventListener)
  }
}

export function subscribeToToggleViewMode(
  callback: () => void
) {
  window.addEventListener(TOGGLE_VIEW_MODE, callback as EventListener)
  
  // Return unsubscribe function
  return () => {
    window.removeEventListener(TOGGLE_VIEW_MODE, callback as EventListener)
  }
}

export function subscribeToToggleSearch(
  callback: () => void
) {
  window.addEventListener(TOGGLE_SEARCH, callback as EventListener)
  
  // Return unsubscribe function
  return () => {
    window.removeEventListener(TOGGLE_SEARCH, callback as EventListener)
  }
}

export function subscribeToSetStatusFilter(
  callback: (event: CustomEvent<SetStatusFilterEvent>) => void
) {
  window.addEventListener(SET_STATUS_FILTER, callback as EventListener)
  
  // Return unsubscribe function
  return () => {
    window.removeEventListener(SET_STATUS_FILTER, callback as EventListener)
  }
}

export function subscribeToSetTypeFilter(
  callback: (event: CustomEvent<SetTypeFilterEvent>) => void
) {
  window.addEventListener(SET_TYPE_FILTER, callback as EventListener)
  
  // Return unsubscribe function
  return () => {
    window.removeEventListener(SET_TYPE_FILTER, callback as EventListener)
  }
}