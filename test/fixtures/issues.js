import { v4 as uuidv4 } from 'uuid';
export function createMockIssue(overrides) {
    const now = new Date().toISOString();
    return Object.assign({ id: uuidv4(), title: 'Mock Issue Title', description: 'This is a mock issue description for testing purposes.', type: 'task', priority: 'medium', status: 'todo', created_at: now, updated_at: now, created_by: uuidv4(), assignee_id: null, workspace_id: uuidv4() }, overrides);
}
export function createMockIssues(count, overrides) {
    return Array.from({ length: count }, (_, i) => createMockIssue(Object.assign({ title: `Mock Issue ${i + 1}` }, overrides)));
}
export const issueTypes = [
    'feature', 'bug', 'task', 'epic', 'spike', 'chore', 'design', 'non-technical'
];
export const issuePriorities = [
    'critical', 'high', 'medium', 'low'
];
export const issueStatuses = [
    'todo', 'in_progress', 'in_review', 'done'
];
