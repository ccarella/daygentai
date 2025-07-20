import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RecipePageClient from './recipe-page-client'

export default async function RecipePageWrapper({
  params
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  const supabase = await createClient()
  
  // Check if the recipe exists
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('id')
    .eq('id', id)
    .single()
  
  if (error || !recipe) {
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
  
  return <RecipePageClient params={params} />
}