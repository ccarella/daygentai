import RecipePageWrapper from './recipe-page-wrapper'

export default function RecipePage({
  params
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  return <RecipePageWrapper params={params} />
}