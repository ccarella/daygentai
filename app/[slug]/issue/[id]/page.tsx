import { redirect } from 'next/navigation'

export default async function IssuePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const resolvedParams = await params
  redirect(`/${resolvedParams.slug}`)
}