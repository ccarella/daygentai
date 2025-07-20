import IssuePageWrapper from './issue-page-wrapper'

export default function IssuePage({
  params
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  return <IssuePageWrapper params={params} />
}