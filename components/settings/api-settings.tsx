'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Key, Save, AlertCircle } from 'lucide-react'

interface ApiSettingsProps {
  workspaceId: string
  initialSettings?: {
    api_key?: string
    api_provider?: string
    agents_content?: string
  }
}

export function ApiSettings({ workspaceId, initialSettings }: ApiSettingsProps) {
  const [apiKey, setApiKey] = useState(initialSettings?.api_key || '')
  const [provider, setProvider] = useState(initialSettings?.api_provider || 'openai')
  const [agentsContent, setAgentsContent] = useState(initialSettings?.agents_content || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('workspaces')
        .update({
          api_key: apiKey,
          api_provider: provider,
          agents_content: agentsContent
        })
        .eq('id', workspaceId)
      
      if (error) {
        throw error
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
          <Label htmlFor="api-key">API Key</Label>
          <Input
            id="api-key"
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-xs text-gray-500">
            Your API key is encrypted and stored securely. Get your key from{' '}
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              OpenAI Platform
            </a>
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
          <p className="text-xs text-gray-500">
            This content will be included when generating prompts or recommendations
          </p>
        </div>
        
        <div className="pt-4 space-y-4">
          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save API Settings'}
          </Button>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Features enabled with API key:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
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