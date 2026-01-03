// store hours and location details with live status + holiday overrides
import { useEffect, useMemo, useState } from "react"
import "./StoreInfo.css"
import { storeLocations as seedStoreLocations } from "../data/locations"

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
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

const buildDateTime = (baseDate, timeStr) => {
  if (!timeStr) return null
  const [hours, minutes = "0"] = timeStr.split(":").map(Number)
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

const scheduleForDate = (location, date) => {
  const iso = toIsoDate(date)
  const special = location.specialHours?.find((entry) => entry.date === iso)
  if (special) {
    return { ...special, isSpecial: true }
  }
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
      const when =
        i === 1 ? "tomorrow" : `on ${weekdayKeys[probe.getDay()].toUpperCase()}`
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
  const window = upcoming.closed
    ? "Closed"
    : `${formatTime(buildDateTime(eventDate, upcoming.open))} – ${formatTime(
        buildDateTime(eventDate, upcoming.close)
      )}`
  return {
    ...upcoming,
    isToday: upcoming.date === todayIso,
    dateLabel: labelDate,
    window,
  }
}

function StoreInfo({ locations }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const activeLocations = (locations && locations.length > 0 ? locations : seedStoreLocations).map(
    (loc) => ({
      ...loc,
      baseHours: loc.baseHours || loc.base_hours || loc.basehours || loc.basehours,
      specialHours: loc.specialHours || loc.special_hours || loc.specialhours || loc.specialhours,
    })
  )

  const statusEntries = useMemo(() => {
    return activeLocations.map((location) => {
      const todaySchedule = scheduleForDate(location, now)
      const openTime = todaySchedule?.closed ? null : buildDateTime(now, todaySchedule.open)
      const closeTime = todaySchedule?.closed ? null : buildDateTime(now, todaySchedule.close)
      const isOpen =
        openTime && closeTime && now >= openTime && now < closeTime && !todaySchedule.closed

      let detail = "Closed"
      if (todaySchedule.closed) {
        const reason = todaySchedule.label ? ` for ${todaySchedule.label}` : ""
        const nextOpen = findNextOpenText(location, now)
        detail = `Closed${reason}${nextOpen ? ` · Next open ${nextOpen}` : ""}`
      } else if (!openTime || !closeTime) {
        detail = "Hours unavailable"
      } else if (isOpen) {
        detail = `Closes at ${formatTime(closeTime)}`
      } else if (now < openTime) {
        detail = `Opens at ${formatTime(openTime)}`
      } else {
        const nextOpen = findNextOpenText(location, now)
        detail = nextOpen ? `Closed · Opens ${nextOpen}` : "Closed"
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
        {statusEntries.map((entry) => (
          <article key={entry.location.id} className="store-card">
            <div className="store-card__top">
              <div>
                <p className="eyebrow">Store</p>
                <h3>{entry.location.name}</h3>
                <p className="address">{entry.location.address}</p>
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
              <div>
                <p className="muted label">Call</p>
                <a href={`tel:${entry.location.phone}`} className="contact-link">
                  {entry.location.phone}
                </a>
              </div>
              <div>
                <p className="muted label">Email</p>
                <a href={`mailto:${entry.location.email}`} className="contact-link">
                  {entry.location.email}
                </a>
              </div>
            </div>

            <div className="meta-row">
              {entry.upcomingSpecial ? (
                <div className="meta-chip">
                  <strong>{entry.upcomingSpecial.label}</strong>
                  <span>
                    {entry.upcomingSpecial.isToday ? "Today · " : `${entry.upcomingSpecial.dateLabel} · `}
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
        ))}
      </div>
    </section>
  )
}

export default StoreInfo
