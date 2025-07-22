'use client'

import { useState } from 'react'
import { updateAppApiSettings } from '@/app/actions/update-app-api-settings'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface AppApiSettingsFormProps {
  initialSettings: {
    hasOpenAIKey: boolean
    hasAnthropicKey: boolean
    defaultProvider: 'openai' | 'anthropic'
  }
}

export default function AppApiSettingsForm({ initialSettings }: AppApiSettingsFormProps) {
  const [openAIKey, setOpenAIKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const router = useRouter()

  const handleSubmit = async (provider: 'openai' | 'anthropic') => {
    const apiKey = provider === 'openai' ? openAIKey : anthropicKey
    
    if (!apiKey) {
      setMessage({ type: 'error', text: 'Please enter an API key' })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      await updateAppApiSettings(provider, apiKey)
      setMessage({ type: 'success', text: `${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key updated successfully!` })
      
      // Clear the input field
      if (provider === 'openai') {
        setOpenAIKey('')
      } else {
        setAnthropicKey('')
      }
      
      // Refresh the page to show updated status
      router.refresh()
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to update API key' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* OpenAI API Key */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="openai-key" className="text-sm font-medium">
            OpenAI API Key
          </label>
          {initialSettings.hasOpenAIKey && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Configured
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            id="openai-key"
            type="password"
            value={openAIKey}
            onChange={(e) => setOpenAIKey(e.target.value)}
            placeholder={initialSettings.hasOpenAIKey ? "Enter new key to update" : "sk-..."}
            className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSubmit('openai')}
            disabled={isLoading || !openAIKey}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isLoading || !openAIKey
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Update'
            )}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Get your API key from{' '}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            OpenAI Dashboard
          </a>
        </p>
      </div>

      {/* Anthropic API Key */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="anthropic-key" className="text-sm font-medium">
            Anthropic API Key
          </label>
          {initialSettings.hasAnthropicKey && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Configured
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            id="anthropic-key"
            type="password"
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            placeholder={initialSettings.hasAnthropicKey ? "Enter new key to update" : "sk-ant-..."}
            className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSubmit('anthropic')}
            disabled={isLoading || !anthropicKey}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isLoading || !anthropicKey
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Update'
            )}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Get your API key from{' '}
          <a
            href="https://console.anthropic.com/account/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Anthropic Console
          </a>
        </p>
      </div>

      {/* Current Provider Info */}
      <div className="pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          <strong>Default Provider:</strong> {initialSettings.defaultProvider === 'openai' ? 'OpenAI' : 'Anthropic'}
        </p>
      </div>
    </div>
  )
}