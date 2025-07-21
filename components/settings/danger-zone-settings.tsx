'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Credenza, CredenzaContent, CredenzaDescription, CredenzaFooter, CredenzaHeader, CredenzaTitle, CredenzaBody } from '@/components/ui/credenza'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/contexts/workspace-context'

interface DangerZoneSettingsProps {
  workspaceId: string
}

export function DangerZoneSettings({ workspaceId }: DangerZoneSettingsProps) {
  const router = useRouter()
  const { workspace } = useWorkspace()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  // Check if current user is the owner
  const isOwner = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id === workspace?.owner_id
  }

  const handleDeleteWorkspace = async () => {
    if (confirmText !== workspace?.name) {
      setError('Please type the workspace name exactly to confirm deletion')
      return
    }

    setDeleting(true)
    setError(null)

    try {
      // Check if user is owner
      const userIsOwner = await isOwner()
      if (!userIsOwner) {
        throw new Error('Only the workspace owner can delete this workspace')
      }

      // Delete the workspace
      const { error: deleteError } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId)

      if (deleteError) {
        throw deleteError
      }

      // Redirect to deletion success page after successful deletion
      router.push('/workspace-deleted')
    } catch (err) {
      console.error('Error deleting workspace:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete workspace')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Once you delete a workspace, there is no going back. Please be certain.
            </AlertDescription>
          </Alert>
          
          <div className="pt-2">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteModal(true)}
              className="w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Workspace
            </Button>
          </div>
        </CardContent>
      </Card>

      <Credenza open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <CredenzaContent className="sm:max-w-md">
          <CredenzaHeader>
            <CredenzaTitle>Delete Workspace</CredenzaTitle>
            <CredenzaDescription className="space-y-2 pt-2">
              This action cannot be undone. This will permanently delete the <strong>{workspace?.name}</strong> workspace and remove all associated data.
              <span className="block pt-2">Please type <strong>{workspace?.name}</strong> to confirm:</span>
            </CredenzaDescription>
          </CredenzaHeader>
          
          <CredenzaBody>
            <div className="space-y-4 py-4">
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={workspace?.name}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-destructive focus:border-transparent"
              disabled={deleting}
            />
            
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            </div>
          </CredenzaBody>
          
          <CredenzaFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowDeleteModal(false)
                setConfirmText('')
                setError(null)
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteWorkspace}
              disabled={deleting || confirmText !== workspace?.name}
            >
              {deleting ? 'Deleting...' : 'Delete Workspace'}
            </Button>
          </CredenzaFooter>
        </CredenzaContent>
      </Credenza>
    </>
  )
}