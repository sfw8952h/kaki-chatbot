import { useState, useRef, useEffect } from "react"
import { FiBell, FiTag, FiX } from "react-icons/fi"
import "./NotificationCenter.css"

function NotificationCenter({ promotions = [], onNavigate }) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef(null)

    // Use promotions as notifications
    const notifications = promotions.map((promo, index) => ({
        id: `promo-${index}`,
        title: promo.badge || "New Promotion",
        message: promo.headline,
        detail: promo.detail,
        image: promo.image,
        link: promo.actionUrl,
        type: "promo",
        time: "Just now"
    }))

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleNotificationClick = (link) => {
        setIsOpen(false)
        onNavigate?.(link)
    }

    return (
        <div className="notification-center-root" ref={dropdownRef}>
            <button
                className={`notification-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Notifications"
            >
                <FiBell />
                {notifications.length > 0 && <span className="notification-badge">{notifications.length}</span>}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h4>Notifications</h4>
                        <button className="close-btn" onClick={() => setIsOpen(false)}><FiX /></button>
                    </div>

                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <div className="empty-notifications">
                                <FiBell />
                                <p>All caught up!</p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className="notification-item"
                                    onClick={() => handleNotificationClick(n.link)}
                                >
                                    <div className="n-icon">
                                        <FiTag />
                                    </div>
                                    <div className="n-content">
                                        <div className="n-title-row">
                                            <span className="n-title">{n.title}</span>
                                            <span className="n-time">{n.time}</span>
                                        </div>
                                        <p className="n-message">{n.message}</p>
                                        <p className="n-detail">{n.detail}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="notification-footer">
                            <button disabled>View all notifications</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default NotificationCenter
