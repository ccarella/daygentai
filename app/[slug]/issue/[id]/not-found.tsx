import { IssueNotFound } from '@/components/errors/issue-not-found'

export default function NotFound({
  params
}: {
  params?: { slug?: string }
}) {
  const workspaceSlug = params?.slug || 'workspace'
  
  return <IssueNotFound workspaceSlug={workspaceSlug} />
}