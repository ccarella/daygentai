'use client'

import { useRouter } from 'next/navigation'
import { use } from 'react'
import { WorkspaceWithMobileNav } from '@/components/layout/workspace-with-mobile-nav'
import { RecipeDetails } from '@/components/cookbook/recipe-details'
import { useWorkspace } from '@/contexts/workspace-context'

export default function RecipePageClient({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const router = useRouter()
  const { slug, id } = use(params)
  const { workspace } = useWorkspace()
  
  const handleBack = () => {
    router.push(`/${slug}/cookbook`)
  }

  if (!workspace) return null
  
  return (
    <WorkspaceWithMobileNav workspace={workspace}>
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-6xl p-6">
          <RecipeDetails 
            recipeId={id}
            onBack={handleBack}
          />
        </div>
      </div>
    </WorkspaceWithMobileNav>
  )
}