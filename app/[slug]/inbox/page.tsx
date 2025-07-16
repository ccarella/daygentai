import { redirect } from 'next/navigation'

export default async function InboxPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params
  redirect(`/${resolvedParams.slug}`)
}