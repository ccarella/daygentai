import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EditIssueModal } from '@/components/issues/edit-issue-modal';
import { createClient } from '@/lib/supabase/client';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

describe('EditIssueModal', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnIssueUpdated = vi.fn();
  
  const mockIssue = {
    id: 'test-issue-id',
    title: 'Test Issue Title',
    description: 'Test issue description',
    type: 'feature',
    priority: 'medium',
    status: 'todo',
  };

  const mockUpdate = vi.fn(() => ({
    eq: vi.fn(() => Promise.resolve({ error: null })),
  }));
  
  const mockFrom = vi.fn(() => ({
    update: mockUpdate,
  }));

  const mockSupabase = {
    from: mockFrom,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockReturnValue(mockSupabase);
  });

  it('renders with issue data when open', () => {
    render(
      <EditIssueModal
        open={true}
        onOpenChange={mockOnOpenChange}
        issue={mockIssue}
        onIssueUpdated={mockOnIssueUpdated}
      />
    );

    expect(screen.getByDisplayValue('Test Issue Title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test issue description')).toBeInTheDocument();
    expect(screen.getByText('✨ Feature')).toBeInTheDocument();
    expect(screen.getByText('🟡 Medium')).toBeInTheDocument();
    expect(screen.getByText('Todo')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <EditIssueModal
        open={false}
        onOpenChange={mockOnOpenChange}
        issue={mockIssue}
        onIssueUpdated={mockOnIssueUpdated}
      />
    );

    expect(screen.queryByText('Edit issue')).not.toBeInTheDocument();
  });

  it('updates title when typed', async () => {
    const user = userEvent.setup();
    
    render(
      <EditIssueModal
        open={true}
        onOpenChange={mockOnOpenChange}
        issue={mockIssue}
        onIssueUpdated={mockOnIssueUpdated}
      />
    );

    const titleInput = screen.getByPlaceholderText('Issue title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title');
    
    expect(titleInput).toHaveValue('Updated Title');
  });

  it('updates description when typed', async () => {
    const user = userEvent.setup();
    
    render(
      <EditIssueModal
        open={true}
        onOpenChange={mockOnOpenChange}
        issue={mockIssue}
        onIssueUpdated={mockOnIssueUpdated}
      />
    );

    const descriptionTextarea = screen.getByPlaceholderText('Add description... (markdown supported)');
    await user.clear(descriptionTextarea);
    await user.type(descriptionTextarea, 'Updated description');
    
    expect(descriptionTextarea).toHaveValue('Updated description');
  });

  it('disables save button when title is empty', async () => {
    const user = userEvent.setup();
    
    render(
      <EditIssueModal
        open={true}
        onOpenChange={mockOnOpenChange}
        issue={mockIssue}
        onIssueUpdated={mockOnIssueUpdated}
      />
    );

    const titleInput = screen.getByPlaceholderText('Issue title');
    await user.clear(titleInput);
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).toBeDisabled();
  });

  it('submits form with updated data', async () => {
    const user = userEvent.setup();
    
    render(
      <EditIssueModal
        open={true}
        onOpenChange={mockOnOpenChange}
        issue={mockIssue}
        onIssueUpdated={mockOnIssueUpdated}
      />
    );

    const titleInput = screen.getByPlaceholderText('Issue title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title');

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('issues');
      expect(mockUpdate).toHaveBeenCalledWith({
        title: 'Updated Title',
        description: 'Test issue description',
        type: 'feature',
        priority: 'medium',
        status: 'todo',
        generated_prompt: null, // Component sets this to null when not using AI prompt
      });
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(mockOnIssueUpdated).toHaveBeenCalled();
    });
  });

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup();
    
    const errorSupabase = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: { message: 'Database error' } })),
        })),
      })),
    };
    
    createClient.mockReturnValue(errorSupabase);
    
    render(
      <EditIssueModal
        open={true}
        onOpenChange={mockOnOpenChange}
        issue={mockIssue}
        onIssueUpdated={mockOnIssueUpdated}
      />
    );

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to update issue: Database error')).toBeInTheDocument();
    });
  });

  it('submits on Shift+Enter', async () => {
    const user = userEvent.setup();
    
    render(
      <EditIssueModal
        open={true}
        onOpenChange={mockOnOpenChange}
        issue={mockIssue}
        onIssueUpdated={mockOnIssueUpdated}
      />
    );

    const titleInput = screen.getByPlaceholderText('Issue title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title');
    
    // Simulate Shift+Enter
    fireEvent.keyDown(document.querySelector('[role="dialog"]'), { 
      key: 'Enter', 
      shiftKey: true 
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('issues');
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('cancels without saving', async () => {
    const user = userEvent.setup();
    
    render(
      <EditIssueModal
        open={true}
        onOpenChange={mockOnOpenChange}
        issue={mockIssue}
        onIssueUpdated={mockOnIssueUpdated}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('includes "Create a prompt" toggle (disabled)', () => {
    render(
      <EditIssueModal
        open={true}
        onOpenChange={mockOnOpenChange}
        issue={mockIssue}
        onIssueUpdated={mockOnIssueUpdated}
      />
    );

    expect(screen.getByText('Create a prompt')).toBeInTheDocument();
    // Since hasApiKey is false in the test setup, it shows this message
    expect(screen.getByText('API key required in workspace settings')).toBeInTheDocument();
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toBeDisabled();
  });
});