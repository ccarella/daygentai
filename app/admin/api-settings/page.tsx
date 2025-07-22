import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppApiSettingsForm from '@/components/admin/app-api-settings-form'
import { getAppApiSettings } from '@/app/actions/update-app-api-settings'

export default async function AdminApiSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Check if user is a super admin (owns at least one workspace)
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('owner_id', user.id)
    .limit(1)

  if (!workspaces || workspaces.length === 0) {
    redirect('/')
  }

  // Get current API settings
  const settings = await getAppApiSettings()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">App-wide API Settings</h1>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Admin Access:</strong> You have access to this page because you own the workspace &ldquo;{workspaces[0]?.name}&rdquo;. 
              These settings affect all workspaces in the application.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-border p-6">
            <AppApiSettingsForm initialSettings={settings} />
          </div>

          <div className="mt-8 text-sm text-muted-foreground">
            <h2 className="font-semibold mb-2">About App-wide API Keys</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>These API keys are used by all workspaces in the application</li>
              <li>Individual workspaces no longer need to provide their own keys</li>
              <li>Keys are encrypted before storage using AES-256-GCM</li>
              <li>Only workspace owners can access this admin interface</li>
              <li>Changes take effect immediately for all workspaces</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}