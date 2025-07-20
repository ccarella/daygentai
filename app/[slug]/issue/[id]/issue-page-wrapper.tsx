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
  
  // Check if the issue exists
  const { data: issue, error } = await supabase
    .from('issues')
    .select('id')
    .eq('id', id)
    .single()
  
  if (error || !issue) {
    notFound()
  }
  
  // Check if workspace exists
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .single()
    
  if (!workspace) {
    notFound()
  }
  
  return <IssuePageClient params={params} />
}