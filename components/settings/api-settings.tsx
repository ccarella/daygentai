'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateApiSettings } from '@/app/actions/update-api-settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Key, Save, AlertCircle, CheckCircle } from 'lucide-react'
import { useWorkspace } from '@/contexts/workspace-context'

interface ApiSettingsProps {
  workspaceId: string
  initialSettings?: {
    api_key?: string
    api_provider?: string
    agents_content?: string
  }
}

export function ApiSettings({ workspaceId, initialSettings }: ApiSettingsProps) {
  const { updateApiKeyStatus } = useWorkspace()
  const [apiKey, setApiKey] = useState(initialSettings?.api_key || '')
  const [provider, setProvider] = useState(initialSettings?.api_provider || 'openai')
  const [agentsContent, setAgentsContent] = useState(initialSettings?.agents_content || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [hasCentralizedKey, setHasCentralizedKey] = useState(false)

  useEffect(() => {
    // Check if centralized API key is available
    const checkCentralizedKey = async () => {
      try {
        const response = await fetch('/api/workspace/has-centralized-key')
        if (response.ok) {
          const data = await response.json()
          setHasCentralizedKey(data.hasCentralizedKey === true)
        }
      } catch (error) {
        console.error('Error checking centralized key:', error)
      }
    }
    checkCentralizedKey()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    
    try {
      const supabase = createClient()
      
      // Use server action to save encrypted API key
      const result = await updateApiSettings({
        workspaceId,
        apiKey,
        apiProvider: provider,
        agentsContent
      })
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      // Update the workspace context with the new API key status
      updateApiKeyStatus(apiKey.length > 0, provider, agentsContent)

      // Invalidate middleware cache for all users in this workspace
      if (typeof window !== 'undefined') {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await fetch('/api/cache/invalidate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id })
            })
          }
        } catch (cacheError) {
          console.warn('Failed to invalidate cache:', cacheError)
        }
      }
      
      setMessage({ type: 'success', text: 'API settings saved successfully!' })
    } catch (error) {
      console.error('Error saving API settings:', error)
      setMessage({ type: 'error', text: 'Failed to save API settings' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          AI Integration Settings
        </CardTitle>
        <CardDescription>
          Configure AI features for issue recommendations and prompt generation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasCentralizedKey && (
          <div className="p-3 rounded-md flex items-center gap-2 bg-green-50 text-green-900">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">AI features are enabled for all workspaces using centralized API keys</span>
          </div>
        )}
        
        {message && (
          <div className={`p-3 rounded-md flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'
          }`}>
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{message.text}</span>
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="provider">AI Provider</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger id="provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="anthropic" disabled>Anthropic (Coming Soon)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="api-key">API Key {hasCentralizedKey && '(Optional - Centralized key active)'}</Label>
          <Input
            id="api-key"
            type="password"
            placeholder={hasCentralizedKey ? "Using centralized API key" : "sk-..."}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={hasCentralizedKey}
          />
          <p className="text-xs text-muted-foreground">
            {hasCentralizedKey ? (
              'A centralized API key is configured for all workspaces. Individual workspace keys are not needed.'
            ) : (
              <>Your API key is encrypted and stored securely. Get your key from{' '}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                OpenAI Platform
              </a></>
            )}
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="agents-content">Agents.md Content (Optional)</Label>
          <Textarea
            id="agents-content"
            placeholder="Add any guidelines or context for AI agents working on your issues..."
            value={agentsContent}
            onChange={(e) => setAgentsContent(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            This content will be included when generating prompts or recommendations
          </p>
        </div>
        
        <div className="pt-4 space-y-4">
          <Button onClick={handleSave} disabled={saving || hasCentralizedKey} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : hasCentralizedKey ? 'Using Centralized API Key' : 'Save API Settings'}
          </Button>
          
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2">Features enabled with API key:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Next Issue AI recommendations in Command Palette (⌘K)</li>
              <li>• Automatic prompt generation for new issues</li>
              <li>• AI-powered issue prioritization</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}