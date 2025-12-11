// dedicated store locator page with live hours and contacts
import "./Pages.css"
import StoreInfo from "../components/StoreInfo"

function LocationsPage() {
  return (
    <div className="page-stack">
      <section className="page-panel">
        <p className="eyebrow">Stores</p>
        <h2>Find a Kaki store near you</h2>
        <p className="guest-detail">
          Check live opening hours, special holiday schedules, and contact details before you visit
          or book a pickup slot.
        </p>
      </section>
      <StoreInfo />
    </div>
  )
}

export default LocationsPage

