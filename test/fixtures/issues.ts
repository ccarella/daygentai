import { v4 as uuidv4 } from 'uuid'

export interface Issue {
  id: string
  title: string
  description: string | null
  type: 'feature' | 'bug' | 'task' | 'epic' | 'spike' | 'chore' | 'design' | 'non-technical'
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'todo' | 'in_progress' | 'in_review' | 'done'
  created_at: string
  created_by: string
  assignee_id: string | null
  workspace_id: string
  updated_at: string
}

export function createMockIssue(overrides?: Partial<Issue>): Issue {
  const now = new Date().toISOString()
  return {
    id: uuidv4(),
    title: 'Mock Issue Title',
    description: 'This is a mock issue description for testing purposes.',
    type: 'task',
    priority: 'medium',
    status: 'todo',
    created_at: now,
    updated_at: now,
    created_by: uuidv4(),
    assignee_id: null,
    workspace_id: uuidv4(),
    ...overrides,
  }
}

export function createMockIssues(count: number, overrides?: Partial<Issue>): Issue[] {
  return Array.from({ length: count }, (_, i) => 
    createMockIssue({
      title: `Mock Issue ${i + 1}`,
      ...overrides,
    })
  )
}

export const issueTypes: Issue['type'][] = [
  'feature', 'bug', 'task', 'epic', 'spike', 'chore', 'design', 'non-technical'
]

export const issuePriorities: Issue['priority'][] = [
  'critical', 'high', 'medium', 'low'
]

export const issueStatuses: Issue['status'][] = [
  'todo', 'in_progress', 'in_review', 'done'
]