'use client';

import { useState } from 'react';
import { EditIssueModal } from '@/components/issues/edit-issue-modal';
import { Button } from '@/components/ui/button';

export default function EditIssueDemo() {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Sample issue data
  const sampleIssue = {
    id: 'demo-issue-1',
    workspace_id: 'demo-workspace-1',
    title: 'Implement user authentication',
    description: `## Overview
This issue tracks the implementation of user authentication for our application.

### Requirements
- Email/password login
- Social login (Google, GitHub)
- Password reset functionality
- Remember me option

### Technical Details
We'll be using NextAuth.js for the authentication implementation.`,
    type: 'feature' as const,
    priority: 'high' as const,
    status: 'in_progress' as const,
  };

  const handleIssueUpdated = () => {
    console.log('Issue updated successfully!');
    // In a real app, this would refresh the issue data
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Edit Issue Modal Demo</h1>
      
      <div className="max-w-2xl space-y-6">
        <div className="p-6 border rounded-lg bg-gray-50">
          <h2 className="text-xl font-semibold mb-4">Current Issue Details</h2>
          <dl className="space-y-2">
            <div>
              <dt className="font-medium text-gray-600">Title:</dt>
              <dd>{sampleIssue.title}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-600">Type:</dt>
              <dd>{sampleIssue.type}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-600">Priority:</dt>
              <dd>{sampleIssue.priority}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-600">Status:</dt>
              <dd>{sampleIssue.status}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-600">Description:</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm">{sampleIssue.description}</dd>
            </div>
          </dl>
        </div>

        <div className="flex gap-4">
          <Button onClick={() => setIsEditModalOpen(true)}>
            Edit Issue
          </Button>
          <Button variant="outline" disabled>
            Create New Issue (for comparison)
          </Button>
        </div>

        <div className="text-sm text-gray-600 space-y-2">
          <p>This demo shows the edit issue modal with the same UI as the create issue modal.</p>
          <p>Key features:</p>
          <ul className="list-disc list-inside ml-4">
            <li>Pre-populated form fields with existing issue data</li>
            <li>Same layout and styling as create issue modal</li>
            <li>Includes status field (not present in create modal)</li>
            <li>Disabled "Create a prompt" toggle (future feature)</li>
            <li>Shift+Enter to save changes</li>
          </ul>
        </div>
      </div>

      <EditIssueModal 
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        issue={sampleIssue}
        onIssueUpdated={handleIssueUpdated}
      />
    </div>
  );
}