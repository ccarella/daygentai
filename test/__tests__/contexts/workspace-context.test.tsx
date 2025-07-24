import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { WorkspaceProvider, useWorkspace } from '@/contexts/workspace-context'
import { createClient } from '@/lib/supabase/client'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockQueryBuilder, createMockSupabaseClient } from '@/test/utils/supabase-mock-helpers'

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn()
}))

// Mock fetch for centralized key check
global.fetch = vi.fn()

// Test component that uses the workspace context
function TestComponent() {
  const { workspace, isLoading } = useWorkspace()
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="hasApiKey">{workspace?.hasApiKey ? 'yes' : 'no'}</div>
      <div data-testid="workspaceName">{workspace?.name || 'no-name'}</div>
    </div>
  )
}

describe('WorkspaceContext', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    ;(createClient as any).mockReturnValue(mockSupabase)
    
    // Mock fetch to return no centralized key by default
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ hasCentralizedKey: false })
    })
  })

  it('should provide initial workspace data', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
      error: null
    })

    const mockQuery = createMockQueryBuilder({ 
      api_key: 'test-key', 
      api_provider: 'openai', 
      agents_content: null,
      workspace_members: [{ user_id: 'user-123', role: 'owner' }]
    })
    
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(mockQuery)
    })

    const initialWorkspace = {
      id: 'test-id',
      name: 'Test Workspace',
      slug: 'test-workspace',
      avatar_url: null,
      owner_id: 'user-123'
    }

    render(
      <WorkspaceProvider workspaceId="test-id" initialWorkspace={initialWorkspace}>
        <TestComponent />
      </WorkspaceProvider>
    )

    expect(screen.getByTestId('workspaceName')).toHaveTextContent('Test Workspace')
    
    await waitFor(() => {
      expect(screen.getByTestId('hasApiKey')).toHaveTextContent('yes')
    })
  })

  it('should fetch and cache API key status', async () => {
    const mockWorkspaceData = {
      api_key: 'sk-test-key',
      api_provider: 'openai',
      agents_content: 'test content',
      workspace_members: [{ user_id: 'user-123', role: 'owner' }]
    }

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
      error: null
    })

    const mockQuery = createMockQueryBuilder(mockWorkspaceData)
    
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(mockQuery)
    })

    const initialWorkspace = {
      id: 'test-id',
      name: 'Test Workspace',
      slug: 'test-workspace',
      avatar_url: null,
      owner_id: 'user-123'
    }

    render(
      <WorkspaceProvider workspaceId="test-id" initialWorkspace={initialWorkspace}>
        <TestComponent />
      </WorkspaceProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      expect(screen.getByTestId('hasApiKey')).toHaveTextContent('yes')
    })

    // Verify that the API was called only once
    expect(mockSupabase.from).toHaveBeenCalledTimes(1)
    expect(mockSupabase.from).toHaveBeenCalledWith('workspaces')
  })

  it('should handle workspace without API key', async () => {
    const mockWorkspaceData = {
      api_key: '',
      api_provider: null,
      agents_content: null,
      workspace_members: [{ user_id: 'user-123', role: 'owner' }]
    }

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
      error: null
    })

    const mockQuery = createMockQueryBuilder(mockWorkspaceData)
    
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(mockQuery)
    })

    render(
      <WorkspaceProvider workspaceId="test-id">
        <TestComponent />
      </WorkspaceProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      expect(screen.getByTestId('hasApiKey')).toHaveTextContent('no')
    })
  })

  it('should update API key status when updateApiKeyStatus is called', async () => {
    const TestComponentWithUpdate = () => {
      const { workspace, updateApiKeyStatus } = useWorkspace()
      
      return (
        <div>
          <div data-testid="hasApiKey">{workspace?.hasApiKey ? 'yes' : 'no'}</div>
          <button onClick={() => updateApiKeyStatus(true, 'openai', 'new content')}>
            Update API Key
          </button>
        </div>
      )
    }

    const initialWorkspace = {
      id: 'test-id',
      name: 'Test Workspace',
      slug: 'test-workspace',
      avatar_url: null,
      owner_id: 'user-123',
      hasApiKey: false
    }

    let getByTestId: any, getByText: any
    
    await act(async () => {
      const result = render(
        <WorkspaceProvider workspaceId="test-id" initialWorkspace={initialWorkspace}>
          <TestComponentWithUpdate />
        </WorkspaceProvider>
      )
      getByTestId = result.getByTestId
      getByText = result.getByText
    })
    
    // Wait for initial render effects to complete
    await waitFor(() => {
      expect(getByTestId('hasApiKey')).toBeInTheDocument()
    })

    expect(getByTestId('hasApiKey')).toHaveTextContent('no')

    // Click the update button
    act(() => {
      getByText('Update API Key').click()
    })

    expect(getByTestId('hasApiKey')).toHaveTextContent('yes')
  })
})