// store hours and location details with live status + holiday overrides
import { useEffect, useMemo, useState } from "react"
import "./StoreInfo.css"

const weekdayKeys = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]

const toIsoDate = (date) => date.toISOString().slice(0, 10)

const isoToLocalDate = (iso) => {
  const [year, month, day] = String(iso || "").split("-").map(Number)
  return new Date(year || 1970, (month || 1) - 1, day || 1)
}

const buildDateTime = (baseDate, timeStr) => {
  if (!timeStr) return null
  const [hours, minutes = "0"] = String(timeStr).split(":").map(Number)
  const next = new Date(baseDate)
  next.setHours(hours || 0, minutes || 0, 0, 0)
  return next
}

const formatTime = (dateObj) =>
  dateObj
    ? new Intl.DateTimeFormat("en-SG", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(dateObj)
    : ""

const describeRange = (schedule, forDate) => {
  if (schedule?.closed) return "Closed today"
  const start = buildDateTime(forDate, schedule?.open)
  const end = buildDateTime(forDate, schedule?.close)
  if (!start || !end) return "Hours unavailable"
  return `${formatTime(start)} – ${formatTime(end)}`
}

/** ✅ normalize baseHours into 7-day object (avoid undefined crash) */
const normalizeBaseHours = (baseHours) => {
  const src = baseHours && typeof baseHours === "object" ? baseHours : {}
  const out = {}
  for (const day of weekdayKeys) {
    const record = src[day] || {}
    if (record?.closed) out[day] = { closed: true }
    else if (record?.open && record?.close) out[day] = { open: record.open, close: record.close }
    else out[day] = { closed: true }
  }
  return out
}

/** ✅ normalize specialHours into list[] (avoid null/undefined issues) */
const normalizeSpecialHours = (specialHours) => {
  const list = Array.isArray(specialHours) ? specialHours : []
  return list
    .filter((s) => s && s.date)
    .map((s) => ({
      date: s.date,
      label: s.label || "",
      closed: !!s.closed,
      open: s.closed ? null : (s.open || ""),
      close: s.closed ? null : (s.close || ""),
    }))
}

/** ✅ normalize location row from DB/seed into one consistent structure */
const normalizeLocation = (row, idx) => {
  const id = row?.id || row?.storeId || row?.slug || row?.name || `store-${idx}`
  const name = row?.name || row?.storeName || "Kaki Store"
  const address = String(row?.address || row?.location || row?.addr || "").trim()
  const phone = String(row?.phone || row?.contact || "").trim()
  const email = String(row?.email || row?.contactEmail || "").trim()

  const baseHoursRaw = row?.baseHours ?? row?.base_hours ?? {}
  const specialRaw = row?.specialHours ?? row?.special_hours ?? []

  return {
    id,
    name,
    address,
    phone,
    email,
    baseHours: normalizeBaseHours(baseHoursRaw),
    specialHours: normalizeSpecialHours(specialRaw),
  }
}

const scheduleForDate = (location, date) => {
  const iso = toIsoDate(date)
  const special = location.specialHours?.find((entry) => entry.date === iso)
  if (special) return { ...special, isSpecial: true }

  const dayKey = weekdayKeys[date.getDay()]
  const base = location.baseHours?.[dayKey]
  if (base) return { ...base, isSpecial: false }

  return { closed: true }
}

const findNextOpenText = (location, now) => {
  for (let i = 1; i <= 7; i += 1) {
    const probe = new Date(now)
    probe.setDate(now.getDate() + i)
    const schedule = scheduleForDate(location, probe)
    if (!schedule?.closed && schedule?.open && schedule?.close) {
      const when = i === 1 ? "tomorrow" : `on ${weekdayKeys[probe.getDay()].toUpperCase()}`
      const start = buildDateTime(probe, schedule.open)
      return `${when} at ${formatTime(start)}`
    }
  }
  return null
}

const nextSpecial = (location, now) => {
  const todayIso = toIsoDate(now)
  const upcoming = [...(location.specialHours || [])]
    .filter((entry) => entry.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  if (!upcoming) return null

  const eventDate = isoToLocalDate(upcoming.date)
  const labelDate = new Intl.DateTimeFormat("en-SG", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(eventDate)

  const windowText = upcoming.closed
    ? "Closed"
    : `${formatTime(buildDateTime(eventDate, upcoming.open))} – ${formatTime(
      buildDateTime(eventDate, upcoming.close)
    )}`

  return {
    ...upcoming,
    isToday: upcoming.date === todayIso,
    dateLabel: labelDate,
    window: windowText,
  }
}

function StoreInfo({ locations, onOpenMap }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // ✅ use locations from props if available, otherwise seed fallback
  const activeLocations = useMemo(() => {
    const src = Array.isArray(locations) ? locations : []
    return src.map((row, idx) => normalizeLocation(row, idx))
  }, [locations])

  const statusEntries = useMemo(() => {
    return activeLocations.map((location) => {
      const todaySchedule = scheduleForDate(location, now)
      const openTime = todaySchedule?.closed ? null : buildDateTime(now, todaySchedule.open)
      const closeTime = todaySchedule?.closed ? null : buildDateTime(now, todaySchedule.close)

      const isOpen =
        openTime && closeTime && now >= openTime && now < closeTime && !todaySchedule.closed

      let detail = "Closed"
      if (todaySchedule.closed) {
        const nextOpen = findNextOpenText(location, now)
        detail = `Closed${nextOpen ? ` · Next open ${nextOpen}` : ""}`
      } else if (!openTime || !closeTime) {
        detail = "Hours unavailable"
      } else if (isOpen) {
        detail = `Closes at ${formatTime(closeTime)}`
      } else if (now < openTime) {
        detail = `Opens at ${formatTime(openTime)}`
      }

      return {
        location,
        isOpen,
        statusLabel: todaySchedule.closed ? "Closed today" : isOpen ? "Open now" : "Closed",
        todayRange: describeRange(todaySchedule, now),
        detail,
        specialToday: todaySchedule.isSpecial ? todaySchedule.label : null,
        upcomingSpecial: nextSpecial(location, now),
      }
    })
  }, [now, activeLocations])

  const openMapFallback = (address) => {
    const safe = String(address || "").trim()
    if (!safe) return
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(safe)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const openMap = (address) => {
    if (typeof onOpenMap === "function") onOpenMap(address)
    else openMapFallback(address)
  }

  return (
    <section className="store-info glass-panel">
      <div className="store-info__head">
        <div>
          <p className="eyebrow">Store network</p>
          <h2>Locations & live opening hours</h2>
          <p className="muted">
            Real-time open/closed signals with holiday overrides applied automatically.
          </p>
        </div>
      </div>

      <div className="store-grid">
        {statusEntries.map((entry) => {
          const address = entry.location.address
          const canOpenMap = !!address

          return (
            <article
              key={entry.location.id}
              className="store-card"
              role={canOpenMap ? "button" : "article"}
              tabIndex={canOpenMap ? 0 : -1}
              onClick={() => {
                if (canOpenMap) openMap(address)
              }}
              onKeyDown={(e) => {
                if (!canOpenMap) return
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  openMap(address)
                }
              }}
            >
              <div className="store-card__top">
                <div>
                  <p className="eyebrow">Store</p>
                  <h3>{entry.location.name}</h3>
                  <p className="address">{address || "Address unavailable"}</p>
                </div>
                <span
                  className={`status-pill ${entry.isOpen ? "status-pill--open" : "status-pill--closed"}`}
                >
                  {entry.statusLabel}
                </span>
              </div>

              <div className="hours-block">
                <div>
                  <p className="muted label">Today</p>
                  <p className="hours-range">{entry.todayRange}</p>
                </div>
                <p className="status-detail">{entry.detail}</p>
                {entry.specialToday && (
                  <span className="special-chip">Special hours: {entry.specialToday}</span>
                )}
              </div>

              <div className="contact-row">
                <div onClick={(e) => e.stopPropagation()}>
                  <p className="muted label">Call</p>
                  {entry.location.phone ? (
                    <a href={`tel:${entry.location.phone}`} className="contact-link">
                      {entry.location.phone}
                    </a>
                  ) : (
                    <span className="contact-link contact-link--muted">Not available</span>
                  )}
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <p className="muted label">Email</p>
                  {entry.location.email ? (
                    <a href={`mailto:${entry.location.email}`} className="contact-link">
                      {entry.location.email}
                    </a>
                  ) : (
                    <span className="contact-link contact-link--muted">Not available</span>
                  )}
                </div>
              </div>

              <div className="meta-row">
                {entry.upcomingSpecial ? (
                  <div className="meta-chip">
                    <strong>{entry.upcomingSpecial.label}</strong>
                    <span>
                      {entry.upcomingSpecial.isToday
                        ? "Today · "
                        : `${entry.upcomingSpecial.dateLabel} · `}
                      {entry.upcomingSpecial.window}
                    </span>
                  </div>
                ) : (
                  <div className="meta-chip">
                    <strong>No holiday changes</strong>
                    <span>Standard schedule in effect</span>
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default StoreInfo