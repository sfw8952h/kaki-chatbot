import "./CategoryRow.css"

const categories = [
  {
    name: "Fresh Produce",
    icon: "🥦",
    accent: "linear-gradient(135deg, #bbf7d0, #22c55e)",
    desc: "Bot-curated harvest, ready for chat-based pickup or home delivery.",
  },
  {
    name: "Pantry Staples",
    icon: "🥫",
    accent: "linear-gradient(135deg, #fde68a, #f97316)",
    desc: "Ask the assistant to refill spices, grains, and long-life essentials.",
  },
  {
    name: "Dairy & Eggs",
    icon: "🧀",
    accent: "linear-gradient(135deg, #fed7aa, #fb7185)",
    desc: "Track freshness, save loyalty points, and re-order with one tap.",
  },
  {
    name: "Bakery & Sweets",
    icon: "🥐",
    accent: "linear-gradient(135deg, #fbcfe8, #db2777)",
    desc: "Chat for warm loaves and seasonal treats that sync with your deals.",
  },
  {
    name: "Organic Finds",
    icon: "🌿",
    accent: "linear-gradient(135deg, #d9f99d, #4ade80)",
    desc: "Let the bot match your preferences with limited small-batch drops.",
  },
  {
    name: "Home Essentials",
    icon: "🧼",
    accent: "linear-gradient(135deg, #c4b5fd, #7c3aed)",
    desc: "From cleaning staples to wellness kits, the bot keeps your cart stocked.",
  },
]

function CategoryRow() {
  return (
    <div className="category-row fade-in">
      {categories.map((cat, i) => (
        <div
          key={cat.name}
          className="category-card zoom-on-hover"
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <div className="category-icon" style={{ background: cat.accent }}>
            <span aria-hidden="true">{cat.icon}</span>
          </div>
          <div className="category-copy">
            <span>{cat.name}</span>
            <p>{cat.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default CategoryRow
