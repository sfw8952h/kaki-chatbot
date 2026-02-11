// component: ProductPage
import "./Pages.css"

function ProductPage({ slug, products }) {  
  const product = products?.find((p) => p.slug === slug)

  if (!product) {
    return (
      <section className="page-panel">
        <p className="eyebrow">Product</p>
        <h2>Not found</h2>
        <p>We could not find that product. Please pick another item from the catalog.</p>
      </section>
    )
  }
  // if the product is found, render the product page
  return ( 
    <section className="page-panel product-page">
      <div className="product-gallery">
        <div className="product-main">
          <img src={product.image} alt={product.name} className="product-image" />
        </div>
        <div className="product-thumbs">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="thumb">
              <img src={product.image} alt={`${product.name} ${idx + 1}`} />
            </div>
          ))}
        </div>
      </div>

      <div className="product-info">
        <p className="eyebrow">Kaki grocery</p>
        <h2>{product.name}</h2>
        <p className="rating-row">⭐ 4.5 Rating (15 reviews)</p>
        <p className="product-price">${product.price}</p>

        <div className="product-cta-row">
          <button className="pill-btn primary">Add to cart</button>
          <button className="pill-btn outline">Save for later</button>
        </div>

        <div className="product-details">
          <p className="label">SKU: MB3442</p>
          <p className="label">
            Categories: <a href="#">Produce</a>, <a href="#">Fresh</a>, <a href="#">Snacks</a>
          </p>
          <p>{product.desc}. In stock and ready to ship.</p>
        </div>
      </div>
    </section>
  )
}

export default ProductPage
