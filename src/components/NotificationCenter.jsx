import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { FiBell, FiTag, FiX, FiPackage, FiMessageCircle, FiTruck } from "react-icons/fi"
import "./NotificationCenter.css"

function NotificationCenter({ user, promotions = [], orders = [], onNavigate, supabase }) {
    const [isOpen, setIsOpen] = useState(false)
    const [dbNotifications, setDbNotifications] = useState([])
    const [loading, setLoading] = useState(false)
    const [localReadIds, setLocalReadIds] = useState([])
    const dropdownRef = useRef(null)

    useEffect(() => {
        setLocalReadIds([])
    }, [user?.id])

    const formatTime = useCallback((timestamp) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diffMs = now - date
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`
        return date.toLocaleDateString()
    }, [])

    const resolveTimestamp = useCallback((value, fallback = 0) => {
        if (!value) return fallback
        const ts = new Date(value).getTime()
        return Number.isFinite(ts) ? ts : fallback
    }, [])

    // Load notifications from database
    useEffect(() => {
        if (!user || !supabase) {
            setDbNotifications([])
            return
        }

        const loadNotifications = async () => {
            setLoading(true)
            try {
                const { data, error } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('profile_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(20)

                if (error) throw error

                // Combine database notifications with promotions
                const dbNotifications = (data || []).map(n => ({
                    id: n.id,
                    title: n.title,
                    message: n.message,
                    link: n.link,
                    type: n.type,
                    time: formatTime(n.created_at),
                    isRead: n.is_read,
                    metadata: n.metadata,
                    source: 'db',
                    timestamp: resolveTimestamp(n.created_at, 0)
                }))

                setDbNotifications(dbNotifications)
            } catch (err) {
                console.error('Failed to load notifications:', err)
            } finally {
                setLoading(false)
            }
        }

        loadNotifications()

        // Subscribe to real-time notifications
        const channel = supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `profile_id=eq.${user.id}`
                },
                (payload) => {
                    const newNotification = {
                        id: payload.new.id,
                        title: payload.new.title,
                        message: payload.new.message,
                        link: payload.new.link,
                        type: payload.new.type,
                        time: 'Just now',
                        isRead: false,
                        metadata: payload.new.metadata,
                        source: 'db',
                        timestamp: resolveTimestamp(payload.new.created_at, Date.now())
                    }
                    setDbNotifications(prev => [newNotification, ...prev])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user, supabase, formatTime, resolveTimestamp])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const promoNotifications = useMemo(() => {
        const now = Date.now()
        return promotions.map((promo, index) => {
            const id = `promo-${index}`
            return {
                id,
                title: promo.badge || "New Promotion",
                message: promo.headline,
                detail: promo.detail,
                link: promo.actionUrl,
                type: "promo",
                time: "Just now",
                isRead: localReadIds.includes(id),
                source: 'local',
                timestamp: now - index * 1000,
            }
        })
    }, [promotions, localReadIds])

    const deliveryNotifications = useMemo(() => {
        const activeOrders = (Array.isArray(orders) ? orders : [])
            .filter((order) => {
                const status = String(order.status || "").toLowerCase()
                return status && status !== "delivered"
            })
            .slice(0, 3)

        return activeOrders.map((order, index) => {
            const orderId = order.id ? String(order.id) : `pending-${index}`
            const shortId = orderId.replace('#', '').slice(0, 8)
            const createdAt = order.placed_at || order.created_at || order.date
            const timestamp = resolveTimestamp(createdAt, Date.now() - index * 2000)
            const id = `delivery-${orderId}`
            const statusLabel = order.status || "Processing"
            return {
                id,
                title: `Order #${shortId}`,
                message: `Delivery status: ${statusLabel}`,
                detail: createdAt ? `Placed ${formatTime(createdAt)}` : undefined,
                link: "/tracking",
                type: "delivery_status",
                time: createdAt ? formatTime(createdAt) : "Just now",
                isRead: localReadIds.includes(id),
                source: 'local',
                timestamp,
            }
        })
    }, [orders, localReadIds, formatTime, resolveTimestamp])

    const notifications = useMemo(() => {
        return [...dbNotifications, ...deliveryNotifications, ...promoNotifications]
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    }, [dbNotifications, deliveryNotifications, promoNotifications])

    const handleNotificationClick = async (notification) => {
        setIsOpen(false)

        // Mark as read
        if (!notification.isRead && notification.id) {
            if (notification.source === 'db') {
                try {
                    await supabase
                        .from('notifications')
                        .update({ is_read: true })
                        .eq('id', notification.id)

                    setDbNotifications(prev =>
                        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
                    )
                } catch (err) {
                    console.error('Failed to mark notification as read:', err)
                }
            } else {
                setLocalReadIds(prev => (prev.includes(notification.id) ? prev : [...prev, notification.id]))
            }
        }

        if (notification.link) {
            onNavigate?.(notification.link)
        }
    }

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'delivery_status':
                return <FiTruck />
            case 'feedback_reply':
                return <FiMessageCircle />
            case 'order_update':
                return <FiPackage />
            case 'promo':
            default:
                return <FiTag />
        }
    }

    const unreadCount = notifications.filter(n => !n.isRead).length

    return (
        <div className="notification-center-root" ref={dropdownRef}>
            <button
                className={`notification-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Notifications"
            >
                <FiBell />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h4>Notifications</h4>
                        <button className="close-btn" onClick={() => setIsOpen(false)}><FiX /></button>
                    </div>

                    <div className="notification-list">
                        {loading ? (
                            <div className="empty-notifications">
                                <p>Loading...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="empty-notifications">
                                <FiBell />
                                <p>All caught up!</p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                                    onClick={() => handleNotificationClick(n)}
                                >
                                    <div className={`n-icon n-icon-${n.type}`}>
                                        {getNotificationIcon(n.type)}
                                    </div>
                                    <div className="n-content">
                                        <div className="n-title-row">
                                            <span className="n-title">{n.title}</span>
                                            <span className="n-time">{n.time}</span>
                                        </div>
                                        <p className="n-message">{n.message}</p>
                                        {n.detail && <p className="n-detail">{n.detail}</p>}
                                    </div>
                                    {!n.isRead && <div className="unread-dot"></div>}
                                </div>
                            ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="notification-footer">
                            <button onClick={() => {
                                setIsOpen(false)
                                onNavigate?.('/notifications')
                            }}>View all notifications</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default NotificationCenter
