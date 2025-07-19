import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InboxNotifications } from '@/components/inbox/inbox-notifications'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Inbox } from 'lucide-react'

export default async function InboxPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/')
  }
  
  // Get workspace
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('slug', resolvedParams.slug)
    .single()
  
  if (!workspace) {
    redirect('/')
  }
  
  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-white">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href={`/${resolvedParams.slug}`}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Issues
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Inbox className="h-5 w-5 text-gray-600" />
              <h1 className="text-xl font-semibold">Inbox</h1>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          <InboxNotifications 
            workspaceId={workspace.id} 
            workspaceSlug={resolvedParams.slug}
          />
        </div>
      </div>
    </div>
  )
}