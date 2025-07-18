'use client'

import { useState } from 'react'
import { ApiSettings } from '@/components/settings/api-settings'
import { UserSettings } from '@/components/settings/user-settings'
import { User } from '@supabase/supabase-js'

interface SettingsPageClientProps {
  workspace: {
    id: string
    name: string
    slug: string
    avatar_url: string | null
    owner_id: string
  }
  workspaceData: {
    api_key: string | null
    api_provider: string | null
    agents_content: string | null
  }
  user: User
}

export function SettingsPageClient({ workspace, workspaceData, user }: SettingsPageClientProps) {
  const [activeTab, setActiveTab] = useState<'workspace' | 'user'>('workspace')

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-gray-600">Manage your workspace and personal settings</p>
      </div>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('workspace')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'workspace'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Workspace Settings
          </button>
          <button
            onClick={() => setActiveTab('user')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'user'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            User Profile
          </button>
        </nav>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'workspace' ? (
        <ApiSettings 
          workspaceId={workspace.id}
          initialSettings={{
            ...(workspaceData.api_key && { api_key: workspaceData.api_key }),
            ...(workspaceData.api_provider && { api_provider: workspaceData.api_provider }),
            ...(workspaceData.agents_content && { agents_content: workspaceData.agents_content })
          }}
        />
      ) : (
        <UserSettings user={user} />
      )}
    </div>
  )
}