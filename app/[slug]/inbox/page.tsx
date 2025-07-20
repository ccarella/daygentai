export default async function InboxPage({ params }: { params: Promise<{ slug: string }> }) {
  // Resolve params to avoid unused variable error
  await params
  // The inbox view is handled by the WorkspaceContent component in the layout
  // This page just needs to exist for Next.js routing
  return null
}