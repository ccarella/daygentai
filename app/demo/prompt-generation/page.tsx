'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PromptDisplay } from '@/components/issues/prompt-display';
import { CreateIssueModal } from '@/components/issues/create-issue-modal';
import { WorkspaceProvider } from '@/contexts/workspace-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Key, FileText } from 'lucide-react';

export default function PromptGenerationDemo() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [demoPrompt, setDemoPrompt] = useState('');
  
  // Demo workspace ID (in real app, this would come from context/props)
  const demoWorkspaceId = 'demo-workspace-123';
  
  const examplePrompt = `- What to do: Implement user authentication with email/password and social login
- How:
  1. Set up NextAuth.js with database adapter for session management
  2. Create login/signup pages with email validation and password requirements
  3. Configure OAuth providers (Google, GitHub) with proper redirect URLs
  4. Implement password reset flow with secure token generation
  5. Add remember me functionality using persistent sessions`;

  const handleGenerateExample = () => {
    setDemoPrompt(examplePrompt);
  };

  const demoWorkspace = {
    id: demoWorkspaceId,
    name: 'Demo Workspace',
    slug: 'demo-workspace',
    avatar_url: null,
    owner_id: 'demo-user',
    hasApiKey: !!apiKey,
    apiProvider: 'openai' as string | null,
    agentsContent: 'Demo agents content for testing purposes.'
  };

  return (
    <WorkspaceProvider workspaceId={demoWorkspaceId} initialWorkspace={demoWorkspace}>
      <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Prompt Generation for Issues</h1>
        <p className="text-gray-600">
          Automatically generate development prompts for AI agents from your issues
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Workspace Configuration
            </CardTitle>
            <CardDescription>
              Configure your workspace API key to enable prompt generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">OpenAI API Key</Label>
              <Input 
                id="api-key"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Your API key is encrypted and stored securely in your workspace settings
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="agents-md">Agents.md Content (Optional)</Label>
              <textarea
                id="agents-md"
                className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-md"
                placeholder="Additional context for AI agents..."
                defaultValue={`# Agent Guidelines
- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Write tests for new functionality`}
              />
            </div>
            
            <div className="pt-2">
              <h4 className="font-medium mb-2">How it works:</h4>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Add your API key in workspace settings</li>
                <li>Create or edit an issue with the toggle enabled</li>
                <li>AI generates a structured prompt for development agents</li>
                <li>Copy the prompt to use with your AI tools</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Demo Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Try It Out
            </CardTitle>
            <CardDescription>
              See prompt generation in action
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                Create Issue with Prompt
              </Button>
              
              <Button 
                onClick={handleGenerateExample}
                variant="outline"
                className="w-full"
              >
                Show Example Prompt
              </Button>
            </div>

            {demoPrompt && (
              <div className="pt-4">
                <h4 className="font-medium mb-3">Generated Prompt Example:</h4>
                <PromptDisplay prompt={demoPrompt} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feature Overview */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Feature Overview</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <h3>Automatic Prompt Generation</h3>
          <p>
            When creating or editing issues, the system can automatically generate structured prompts 
            optimized for AI development agents. These prompts follow a consistent format:
          </p>
          <ul>
            <li><strong>What to do:</strong> A concise one-line summary of the task</li>
            <li><strong>How:</strong> 2-5 specific technical implementation points</li>
          </ul>
          
          <h3>Key Features</h3>
          <ul>
            <li>🔐 Secure API key storage per workspace</li>
            <li>🤖 Support for multiple LLM providers (OpenAI, Anthropic, etc.)</li>
            <li>📋 One-click copy functionality for generated prompts</li>
            <li>🔄 Automatic prompt updates when issue content changes</li>
            <li>📝 Optional Agents.md context for better prompts</li>
            <li>⚡ Non-blocking generation (doesn&apos;t delay issue creation)</li>
          </ul>

          <h3>Use Cases</h3>
          <ul>
            <li>Convert user stories into actionable development tasks</li>
            <li>Generate consistent prompts for AI pair programming</li>
            <li>Create structured requirements for automated code generation</li>
            <li>Maintain prompt history with your issues</li>
          </ul>
        </CardContent>
      </Card>

      {/* Demo Modal */}
      <CreateIssueModal 
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        workspaceId={demoWorkspaceId}
        onIssueCreated={() => {
          console.log('Issue created with prompt!');
          setDemoPrompt(examplePrompt);
        }}
      />
      </div>
    </WorkspaceProvider>
  );
}