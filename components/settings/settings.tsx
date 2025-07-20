'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SettingsProps {
  workspaceId: string
  onBack?: () => void
}

export function Settings({ workspaceId, onBack }: SettingsProps) {
  const [agentsConfig, setAgentsConfig] = useState('')
  const [selectedService, setSelectedService] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const supabase = createClient()

  // Load existing configuration on mount
  useEffect(() => {
    async function loadConfiguration() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('workspaces')
          .select('agent_configuration')
          .eq('id', workspaceId)
          .single()

        if (error) throw error
        
        if (data?.agent_configuration) {
          setAgentsConfig(data.agent_configuration)
        }
      } catch (error) {
        console.error('Error loading configuration:', error)
        setMessage({ type: 'error', text: 'Failed to load configuration' })
      } finally {
        setLoading(false)
      }
    }

    if (workspaceId) {
      loadConfiguration()
    }
  }, [workspaceId, supabase])

  // Save configuration
  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ agent_configuration: agentsConfig })
        .eq('id', workspaceId)

      if (error) throw error
      
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (error) {
      console.error('Error saving configuration:', error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-accent rounded-lg transition-colors md:hidden"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Agent Configuration Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-1">Agent Configuration</h2>
              <p className="text-sm text-gray-600">
                Add an Agents.md configuration file to customize agent behavior and instructions.
              </p>
            </div>
            <div>
              <label htmlFor="agents-config" className="block text-sm font-medium text-gray-700 mb-2">
                Agents.md Content
              </label>
              <textarea
                id="agents-config"
                value={agentsConfig}
                onChange={(e) => setAgentsConfig(e.target.value)}
                placeholder="# Agent Configuration

Define your agent instructions and behavior here..."
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                disabled={loading}
              />
            </div>
          </div>

          {/* API Configuration Section */}
          <div className="space-y-4 border-t border-gray-200 pt-8">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-1">API Configuration</h2>
              <p className="text-sm text-gray-600">
                Select your AI service provider and enter your API key.
              </p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-[200px_1fr]">
              <div>
                <label htmlFor="service-provider" className="block text-sm font-medium text-gray-700 mb-2">
                  Service Provider
                </label>
                <select
                  id="service-provider"
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a provider</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="openai">OpenAI</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="grok">Grok</option>
                  <option value="kimi-k2">Kimi K2</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="border-t border-gray-200 pt-8">
            <div className="flex items-center justify-between">
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              
              {message && (
                <div className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {message.text}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}