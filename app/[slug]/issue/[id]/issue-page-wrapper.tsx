import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import IssuePageClient from './issue-page-client'

export default async function IssuePageWrapper({
  params
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  const supabase = await createClient()
  
  // First, check if workspace exists
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .single()
    
  if (workspaceError || !workspace) {
    notFound()
  }
  
  // Check if the issue exists AND belongs to this workspace
  const { data: issue, error: issueError } = await supabase
    .from('issues')
    .select('id, workspace_id')
    .eq('id', id)
    .eq('workspace_id', workspace.id)
    .single()
  
  if (issueError || !issue) {
    notFound()
  }
  
  return <IssuePageClient params={params} />
}