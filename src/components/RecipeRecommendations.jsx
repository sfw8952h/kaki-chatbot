import { useEffect, useState } from "react"
import "./RecipeRecommendations.css"

const API_BASE = "https://www.themealdb.com/api/json/v1/1"
const DEFAULT_LETTER = "a"
function buildIngredientList(meal) {
  const items = []
  for (let index = 1; index <= 20; index += 1) {
    const ingredient = meal[`strIngredient${index}`]
    const measure = meal[`strMeasure${index}`]
    if (ingredient && ingredient.trim()) {
      items.push([measure?.trim(), ingredient.trim()].filter(Boolean).join(" "))
    }
  }
  return items
}

function normalizeMeal(meal) {
  return {
    id: meal.idMeal,
    title: meal.strMeal,
    image: meal.strMealThumb,
    category: meal.strCategory,
    area: meal.strArea,
    instructions: meal.strInstructions,
    tags: meal.strTags ? meal.strTags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
    youtube: meal.strYoutube,
    ingredients: buildIngredientList(meal),
  }
}

function RecipeRecommendations({ onAddToCart }) {
  const [query, setQuery] = useState("")
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedMeal, setSelectedMeal] = useState(null)

  const fetchMeals = async (path, { detailOnly = false } = {}) => {
    try {
      if (!detailOnly) {
        setLoading(true)
      }
      setError("")
      const response = await fetch(`${API_BASE}/${path}`)
      if (!response.ok) {
        throw new Error("Unable to reach TheMealDB.")
      }
      const data = await response.json()
      const normalized = (data.meals ?? []).map(normalizeMeal)
      if (detailOnly) {
        setSelectedMeal(normalized[0] ?? null)
        return normalized
      }
      setMeals(normalized)
      if (normalized.length === 1 && path.startsWith("random.php")) {
        setSelectedMeal(normalized[0])
      } else if (!normalized.length) {
        setSelectedMeal(null)
      }
      return normalized
    } catch (fetchError) {
      if (!detailOnly) {
        setMeals([])
        setSelectedMeal(null)
      }
      setError(fetchError.message || "Failed to fetch recipes.")
      return []
    } finally {
      if (!detailOnly) {
        setLoading(false)
      }
    }
  }

  const handleNameSearch = async (event) => {
    event.preventDefault()
    const term = query.trim()
    if (!term) {
      return
    }
    await fetchMeals(`search.php?s=${encodeURIComponent(term)}`)
  }

  const handleRandom = async () => {
    await fetchMeals("random.php")
  }

  const handleViewRecipe = async (mealId) => {
    const [detail] = await fetchMeals(`lookup.php?i=${encodeURIComponent(mealId)}`, { detailOnly: true })
    if (!detail) {
      setError("Could not load that recipe.")
    }
  }

  useEffect(() => {
    if (window.initialRecipeSearch) {
      const term = window.initialRecipeSearch
      setQuery(term)
      fetchMeals(`search.php?s=${encodeURIComponent(term)}`)
      window.initialRecipeSearch = null
    } else {
      fetchMeals(`search.php?f=${DEFAULT_LETTER}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="recipe-recs fade-in">
      <div className="recipe-head">
        <div>
          <p className="eyebrow">Recipe recommendations</p>
          <h2>Cook something fresh tonight</h2>
          <p className="muted">
            Discover quick dinner ideas powered by TheMealDB. The list starts with dishes that begin with the letter “A”, and you can search or grab a random idea anytime.
          </p>
        </div>
        <form className="recipe-search-form" onSubmit={handleNameSearch}>
          <input
            className="recipe-search"
            type="text"
            placeholder="Search meals by name..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button className="primary-btn" type="submit" disabled={!query.trim() || loading}>
            Search
          </button>
        </form>
      </div>
      <div className="recipe-layout">
        <aside className="recipe-filters">
          <button className="primary-btn" type="button" onClick={handleRandom} disabled={loading}>
            Surprise me (random meal)
          </button>

          {selectedMeal && (
            <div className="selected-meal">
              <p className="label">Meal details</p>
              <h3>{selectedMeal.title}</h3>
              <p className="recipe-meta">
                {selectedMeal.area || "Unknown origin"} | {selectedMeal.category || "Uncategorized"}
              </p>
              <ul>
                {selectedMeal.ingredients.slice(0, 6).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {selectedMeal.youtube && (
                <a href={selectedMeal.youtube} target="_blank" rel="noreferrer">
                  Watch on YouTube
                </a>
              )}
            </div>
          )}
        </aside>
        <div className="recipe-grid">
          {error && !loading && <p className="error-text">{error}</p>}
          {!error && !loading && !meals.length && <p className="muted">No meals found. Try another search.</p>}
          {loading && <p className="muted">Loading meals...</p>}
          {!loading &&
            meals.map((recipe) => (
              <article key={recipe.id} className="recipe-card">
                <div className="recipe-media">
                  {recipe.image ? (
                    <img src={recipe.image} alt={recipe.title} />
                  ) : (
                    <div className="recipe-placeholder">No image</div>
                  )}
                </div>
                <div className="recipe-copy">
                  <p className="recipe-meta">
                    {recipe.area || "Unknown origin"} | {recipe.category || "Uncategorized"}
                  </p>
                  <h3>{recipe.title}</h3>
                  <div className="recipe-tags">
                    {(recipe.tags.length ? recipe.tags : ["Meal"]).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="recipe-actions">
                  <button type="button" className="ghost-btn" onClick={() => handleViewRecipe(recipe.id)}>
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
