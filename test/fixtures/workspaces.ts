export const mockWorkspace = {
  id: 'workspace-123',
  slug: 'test-workspace',
  name: 'Test Workspace',
  owner_id: '123e4567-e89b-12d3-a456-426614174000',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
}

export const createMockWorkspace = (overrides: Partial<typeof mockWorkspace> = {}) => ({
  ...mockWorkspace,
  ...overrides,
})