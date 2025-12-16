import { useMemo, useState } from "react"
import "./RecipeRecommendations.css"

const defaultFilters = {
  ingredients: "",
  diet: "any",
}

const recipes = [
  {
    id: "garlic-butter-chicken",
    title: "One-pan garlic butter chicken",
    cookTime: "20 min",
    servings: "2 servings",
    rating: 4.7,
    tags: ["Chicken", "Skillet", "Low effort"],
    image: "https://images.unsplash.com/photo-1604908177334-524b0a72a568?auto=format&fit=crop&w=600&q=60",
  },
  {
    id: "herb-salmon",
    title: "Lemon herb baked salmon",
    cookTime: "25 min",
    servings: "2 servings",
    rating: 4.8,
    tags: ["Seafood", "High protein"],
    image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=600&q=60",
  },
  {
    id: "veggie-pasta",
    title: "Creamy veggie pasta bowl",
    cookTime: "18 min",
    servings: "2 servings",
    rating: 4.6,
    tags: ["Vegetarian", "Pasta", "Comfort food"],
    image: "https://images.unsplash.com/photo-1528712306091-ed0763094c98?auto=format&fit=crop&w=600&q=60",
  },
]

function RecipeRecommendations({ onAddToCart }) {
  const [filters, setFilters] = useState(defaultFilters)
  const [query, setQuery] = useState("")

  const filteredRecipes = useMemo(() => {
    const term = query.trim().toLowerCase()
    return recipes.filter((recipe) =>
      !term ? true : recipe.title.toLowerCase().includes(term) || recipe.tags.some((tag) => tag.toLowerCase().includes(term)),
    )
  }, [query])

  return (
    <section className="recipe-recs fade-in">
      <div className="recipe-head">
        <div>
          <p className="eyebrow">Recipe recommendations</p>
          <h2>Cook something fresh tonight</h2>
          <p className="muted">
            Discover quick dinner ideas based on ingredients you already have in your basket.
          </p>
        </div>
        <input
          className="recipe-search"
          type="text"
          placeholder="Search recipes..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="recipe-layout">
        <aside className="recipe-filters">
          <label>
            Ingredients you have
            <input
              type="text"
              placeholder="e.g. chicken, tomato, cheese"
              value={filters.ingredients}
              onChange={(event) => setFilters((prev) => ({ ...prev, ingredients: event.target.value }))}
            />
          </label>
          <label>
            Diet preference
            <select
              value={filters.diet}
              onChange={(event) => setFilters((prev) => ({ ...prev, diet: event.target.value }))}
            >
              <option value="any">Any</option>
              <option value="veggie">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="protein">High protein</option>
            </select>
          </label>
          <button className="primary-btn" type="button">
            Update recommendations
          </button>
        </aside>
        <div className="recipe-grid">
          {filteredRecipes.map((recipe) => (
            <article key={recipe.id} className="recipe-card">
              <div className="recipe-media">
                <img src={recipe.image} alt={recipe.title} />
              </div>
              <div className="recipe-copy">
                <p className="recipe-meta">
                  {recipe.cookTime} � {recipe.servings}
                </p>
                <h3>{recipe.title}</h3>
                <p className="recipe-rating">? {recipe.rating.toFixed(1)}</p>
                <div className="recipe-tags">
                  {recipe.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
              <div className="recipe-actions">
                <button type="button" className="ghost-btn">
                  View recipe
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() =>
                    onAddToCart?.(
                      {
                        slug: recipe.id,
                        name: recipe.title,
                        price: 12.99,
                        image: recipe.image,
                      },
                      1,
                    )
                  }
                  disabled={!onAddToCart}
                >
                  Add ingredients to cart
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default RecipeRecommendations

