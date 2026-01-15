// component: LocationsPage
import "./Pages.css"
import StoreInfo from "../components/StoreInfo"

function LocationsPage({ locations }) {
  // ✅ normalize DB rows (snake_case) + seed data (camelCase) into ONE shape
  const normalizedLocations = Array.isArray(locations)
    ? locations.map((row, idx) => {
        const id =
          row?.id ||
          row?.storeId ||
          row?.slug ||
          row?.name ||
          `store-${idx}`

        const name = row?.name || row?.storeName || "Kaki Store"
        const address = row?.address || row?.location || row?.addr || ""

        const phone = row?.phone || row?.contact || ""
        const email = row?.email || row?.contactEmail || ""

        // ✅ Supabase table likely uses base_hours / special_hours
        const baseHours = row?.baseHours || row?.base_hours || {}
        const specialHours = row?.specialHours || row?.special_hours || []

        return {
          id,
          name,
          address,
          phone,
          email,
          baseHours,
          specialHours,
        }
      })
    : []

  // ✅ Open Google Maps by address (safe)
  const openInMaps = (address) => {
    const safe = String(address || "").trim()
    if (!safe) return
    const encodedAddress = encodeURIComponent(safe)
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, "_blank")
  }

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

      {/* ✅ Empty state (prevents blank/crash) */}
      {normalizedLocations.length === 0 ? (
        <section className="page-panel">
          <p className="guest-detail">
            No store locations found yet. Please add locations in the database (store_hours table),
            then refresh.
          </p>
        </section>
      ) : (
        <StoreInfo locations={normalizedLocations} onOpenMap={openInMaps} />
      )}
    </div>
  )
}

export default LocationsPage