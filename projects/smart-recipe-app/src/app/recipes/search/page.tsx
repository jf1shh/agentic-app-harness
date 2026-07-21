import SearchClient from './SearchClient'
import { saveRecipeMarkdown } from '@/app/actions'

export default function RecipeSearchPage() {
  return (
    <div>
      <h1 className="text-center mb-8">Discover New Recipes</h1>
      <SearchClient saveAction={saveRecipeMarkdown} />
    </div>
  )
}
