import RecipeRecommendations from "../components/RecipeRecommendations"

function RecipesPage({ onAddToCart }) {
  return (
    <div className="page-stack">
      <RecipeRecommendations onAddToCart={onAddToCart} />
    </div>
  )
}

export default RecipesPage
