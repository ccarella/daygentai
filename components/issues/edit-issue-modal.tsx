'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { generateIssuePrompt } from '@/lib/llm/prompt-generator';
import { useToast } from '@/components/ui/use-toast';
import { useWorkspace } from '@/contexts/workspace-context';

interface Issue {
  id: string;
  title: string;
  description: string | null;
  type: 'feature' | 'bug' | 'chore' | 'design' | 'non-technical';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'in_review' | 'done';
  workspace_id: string;
  generated_prompt?: string | null;
}

interface EditIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issue: Issue | null;
  onIssueUpdated?: () => void;
}

export function EditIssueModal({ open, onOpenChange, issue, onIssueUpdated }: EditIssueModalProps) {
  const { toast } = useToast();
  const { workspace } = useWorkspace();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Issue['type']>('feature');
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [priority, setPriority] = useState<Issue['priority']>('medium');
  const [status, setStatus] = useState<Issue['status']>('todo');
  const [createPrompt, setCreatePrompt] = useState(false);
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  
  const hasApiKey = workspace?.hasApiKey || false;

  // Initialize form with issue data when modal opens or issue changes
  useEffect(() => {
    if (issue && open) {
      setTitle(issue.title || '');
      setDescription(issue.description || '');
      setType(issue.type || 'feature');
      setPriority(issue.priority || 'medium');
      setStatus(issue.status || 'todo');
      setError('');
      
      // Check if the issue already has a prompt or enable by default if API key exists
      setCreatePrompt(!!issue.generated_prompt || (hasApiKey && !issue.generated_prompt));
    }
  }, [issue, open, hasApiKey]);

  // Cleanup timeout on unmount or when modal closes
  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async () => {
    // Prevent multiple submissions
    if (isSubmitDisabled || isSubmitting) {
      return;
    }

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!issue) {
      setError('No issue to update');
      return;
    }

    setIsSubmitting(true);
    setIsSubmitDisabled(true);
    setError('');

    try {
      const supabase = createClient();
      
      let generatedPrompt = issue.generated_prompt; // Keep existing prompt by default
      
      // Generate new prompt if toggle is on and either no existing prompt or content changed
      if (createPrompt && hasApiKey && (!issue.generated_prompt || 
          title.trim() !== issue.title || 
          description.trim() !== (issue.description || ''))) {
        setIsGeneratingPrompt(true);
        try {
          const { prompt, error: promptError } = await generateIssuePrompt({
            title: title.trim(),
            description: description.trim(),
            workspaceId: issue.workspace_id
          });
          
          if (promptError) {
            // Continue without updating prompt
          } else {
            generatedPrompt = prompt;
          }
        } catch (error) {
          // Continue without updating prompt
        } finally {
          setIsGeneratingPrompt(false);
        }
      } else if (!createPrompt) {
        // If toggle is off, remove the prompt
        generatedPrompt = null;
      }
      
      const { error: updateError } = await supabase
        .from('issues')
        .update({
          title: title.trim(),
          description: description.trim(),
          type,
          priority,
          status,
          generated_prompt: generatedPrompt,
        })
        .eq('id', issue.id);

      if (updateError) {
        console.error('Failed to update issue:', updateError);
        toast({
          title: "Failed to update issue",
          description: updateError.message || "An error occurred while updating the issue.",
          variant: "destructive",
        });
        setError('Failed to update issue: ' + updateError.message);
        return;
      }

      toast({
        title: "Issue updated",
        description: "Your changes have been saved successfully.",
      });
      onOpenChange(false);
      onIssueUpdated?.();
    } catch (err) {
      console.error('Unexpected error during issue update:', err);
      toast({
        title: "Unexpected error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
      // Clear any existing timeout
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
      // Re-enable submit after a short delay to prevent rapid clicks
      submitTimeoutRef.current = setTimeout(() => {
        setIsSubmitDisabled(false);
        submitTimeoutRef.current = null;
      }, 500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isSubmitting && !isSubmitDisabled && title.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const statusOptions = [
    { value: 'todo', label: 'Todo' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'in_review', label: 'In Review' },
    { value: 'done', label: 'Done' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-2xl flex flex-col overflow-hidden max-h-[90vh] sm:max-h-[85vh]" 
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Edit issue</DialogTitle>
          <DialogDescription>Update the details of your issue</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 -mx-6 scrollbar-thin">
          <div className="space-y-4 md:space-y-5 py-3 md:py-4 px-6">
            <div className="space-y-2">
              <Label htmlFor="title">Issue title</Label>
              <Input 
                id="title" 
                placeholder="Issue title" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <MarkdownEditor 
                value={description} 
                onChange={setDescription} 
                placeholder="Add description... (markdown supported)" 
                rows={8}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Issue Type</Label>
                <Select value={type} onValueChange={(value: Issue['type']) => setType(value)}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feature">✨ Feature</SelectItem>
                    <SelectItem value="bug">🐛 Bug</SelectItem>
                    <SelectItem value="chore">🔧 Chore</SelectItem>
                    <SelectItem value="design">🎨 Design</SelectItem>
                    <SelectItem value="non-technical">📝 Non-technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(value: Issue['priority']) => setPriority(value)}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">🔴 Critical</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="low">🟢 Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: Issue['status']) => setStatus(value)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between space-x-2 rounded-lg border p-3 md:p-4">
              <div className="space-y-0.5">
                <Label htmlFor="create-prompt" className="text-base">
                  Create a prompt
                </Label>
                <div className="text-sm text-gray-500">
                  {hasApiKey 
                    ? (issue?.generated_prompt 
                        ? 'Update AI prompt for development agents' 
                        : 'Generate an AI prompt for development agents')
                    : 'API key required in workspace settings'}
                </div>
              </div>
              <Switch 
                id="create-prompt" 
                checked={createPrompt} 
                onCheckedChange={setCreatePrompt} 
                disabled={!hasApiKey}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 md:p-3 rounded-md">
                {error}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t pt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || isSubmitDisabled || !title.trim()}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            {isGeneratingPrompt ? 'Generating prompt...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}