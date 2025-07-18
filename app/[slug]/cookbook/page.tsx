'use client'

import WorkspacePage from '../page'

export default function CookbookPage({ params }: { params: Promise<{ slug: string }> }) {
  return <WorkspacePage params={params} />
}