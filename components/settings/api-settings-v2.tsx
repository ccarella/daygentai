'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Save, AlertCircle, Info } from 'lucide-react'

interface ApiSettingsV2Props {
  workspaceId: string
  initialSettings?: {
    agents_content?: string
  }
}

export function ApiSettingsV2({ workspaceId, initialSettings }: ApiSettingsV2Props) {
  const [agentsContent, setAgentsContent] = useState(initialSettings?.agents_content || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    
    try {
      const supabase = createClient()
      
      // Update only the agents_content field
      const { error } = await supabase
        .from('workspaces')
        .update({ 
          agents_content: agentsContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', workspaceId)
      
      if (error) {
        throw error
      }
      
      setMessage({ type: 'success', text: 'Workspace context saved successfully!' })
    } catch (error) {
      console.error('Error saving workspace context:', error)
      setMessage({ type: 'error', text: 'Failed to save workspace context' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          AI Context Settings
        </CardTitle>
        <CardDescription>
          Provide context and guidelines for AI agents working on your issues
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
        
        <div className="p-4 bg-blue-50 rounded-lg flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">AI Features Now App-wide</p>
            <p>API keys are now managed centrally by administrators. All workspaces automatically have access to AI features including:</p>
            <ul className="mt-2 space-y-1">
              <li>• Next Issue AI recommendations in Command Palette (⌘K)</li>
              <li>• Automatic prompt generation for new issues</li>
              <li>• AI-powered issue prioritization</li>
            </ul>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="agents-content">Workspace AI Context (Optional)</Label>
          <Textarea
            id="agents-content"
            placeholder="Add any workspace-specific guidelines or context for AI agents working on your issues..."
            value={agentsContent}
            onChange={(e) => setAgentsContent(e.target.value)}
            rows={8}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            This content will be included when generating prompts or recommendations for issues in this workspace
          </p>
        </div>
        
        <div className="pt-4">
          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Workspace Context'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}