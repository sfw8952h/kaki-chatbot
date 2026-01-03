// component: PromoCarousel (promotional slider featuring products)
import { useCallback, useEffect, useState } from "react"
import "./PromoCarousel.css"

function PromoCarousel({ promotions = [] }) {
  const [activeSlide, setActiveSlide] = useState(0)
  const slides = promotions.length ? promotions : []
  const slideCount = slides.length

  if (!slideCount) {
    return null
  }

  useEffect(() => {
    if (!slideCount) return undefined
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slideCount)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [slideCount])

  const handlePrev = useCallback(() => {
    setActiveSlide((prev) => (prev - 1 + slideCount) % slideCount)
  }, [slideCount])

  const handleNext = useCallback(() => {
    setActiveSlide((prev) => (prev + 1) % slideCount)
  }, [slideCount])

  return (
    <section className="promo-carousel">
      <div className="promo-carousel-track-wrapper">
        <div
          className="promo-carousel-track"
          style={{
            width: `${slideCount * 100}%`,
            transform: `translateX(-${activeSlide * 100}%)`,
          }}
        >
          {slides.map((slide) => {
            const actionUrl = slide.actionUrl || (slide.slug ? `/product/${slide.slug}` : "#")
            return (
              <article key={slide.id} className="promo-slide">
                <div className="promo-slide-copy">
                  <p className="promo-slide-badge">{slide.badge}</p>
                  <h2>{slide.headline}</h2>
                  <p>{slide.detail}</p>
                  <div className="promo-slide-actions">
                    <a className="primary-btn promo-slide-btn" href={actionUrl}>
                      {slide.actionLabel || "Go to product"}
                    </a>
                    {slide.note && <span className="promo-slide-note">{slide.note}</span>}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
      <div className="promo-carousel-controls">
        <button
          className="ghost-btn promo-nav promo-nav--prev"
          type="button"
          onClick={handlePrev}
          aria-label="Previous promotion"
        >
          {"<"}
        </button>
        <span className="promo-slider-counter">
          {activeSlide + 1}/{slideCount}
        </span>
        <button
          className="ghost-btn promo-nav promo-nav--next"
          type="button"
          onClick={handleNext}
          aria-label="Next promotion"
        >
          {">"}
        </button>
      </div>
    </section>
  )
}

export default PromoCarousel
