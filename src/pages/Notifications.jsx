import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  Bell,
  CheckCircle2,
  Clock,
  Building2,
  MapPin,
  Calendar,
  Trash2,
  CheckCheck,
  AlertCircle,
  ArrowRight,
  Filter,
  Sparkles,
  Layers,
  X,
  ShieldAlert,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  getNotifications,
  markAllNotificationsAsRead,
  clearAllNotifications as clearAllNotificationsApi,
  clearNotification as clearNotificationApi,
} from '../api/notifications'

export default function Notifications() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const highlightParam = searchParams.get('highlight') || searchParams.get('id') || ''

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'unread' | 'rooms' | 'hotseats' | 'alerts'

  const { user } = useAuth()

  const isAdmin =
    user?.role === 'Admin' ||
    user?.role === 'admin' ||
    user?.isAdmin === true

  // Format Booking Date
  const formatBookingDate = (date) => {
    if (!date) return ''
    const parsedDate = new Date(date)
    if (Number.isNaN(parsedDate.getTime())) return date
    return parsedDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Format Time
  const formatTime = (time) => {
    if (!time) return ''
    const val = String(time).trim()
    const timePart = val.includes('T') ? val.split('T')[1] || '' : val
    const parts = timePart.split(':')
    if (parts.length >= 2) {
      const hours = String(parts[0]).padStart(2, '0')
      const minutes = String(parts[1]).padStart(2, '0')
      return `${hours}:${minutes}`
    }
    return timePart.substring(0, 5)
  }

  // Helper for read notification IDs
  const getReadNotificationIds = () => {
    try {
      const raw = localStorage.getItem('spacebook_read_notifications')
      return raw ? JSON.parse(raw) : []
    } catch (e) {
      return []
    }
  }

  const saveReadNotificationIds = (ids) => {
    try {
      const existing = getReadNotificationIds()
      const merged = Array.from(new Set([...existing, ...ids]))
      localStorage.setItem('spacebook_read_notifications', JSON.stringify(merged))
    } catch (e) {
      // ignore
    }
  }

  // Helper for cleared notification IDs
  const getClearedNotificationIds = () => {
    try {
      const raw = localStorage.getItem('spacebook_cleared_notifications')
      return raw ? JSON.parse(raw) : []
    } catch (e) {
      return []
    }
  }

  const saveClearedNotificationIds = (ids) => {
    try {
      const existing = getClearedNotificationIds()
      const merged = Array.from(new Set([...existing, ...ids]))
      localStorage.setItem('spacebook_cleared_notifications', JSON.stringify(merged))
    } catch (e) {
      // ignore
    }
  }

  // Fetch Notifications
  const fetchNotifications = async (isSilent = false) => {
    try {
      if (!isSilent) {
        setLoading(true)
        setError('')
      }

      const token = localStorage.getItem('spacebook_token')
      if (!token || !user) {
        setNotifications((prev) => (prev.length === 0 ? prev : []))
        return
      }

      const responseData = await getNotifications()
      const rawList = Array.isArray(responseData)
        ? responseData
        : responseData?.notifications || []

      const readIds = new Set(getReadNotificationIds().map(String))
      const clearedIds = new Set(getClearedNotificationIds().map(String))

      const mapped = rawList
        .map((n, idx) => {
          const id = String(n.notificationId ?? n.id ?? n._id ?? idx)
          const isRead =
            n.isRead === true ||
            n.is_read === true ||
            n.read === true ||
            readIds.has(id)

          return {
            ...n,
            notificationId: id,
            isRead,
          }
        })
        .filter((n) => !clearedIds.has(String(n.notificationId)))

      setNotifications(mapped)
    } catch (err) {
      if (!isSilent) {
        setError('Failed to load live notifications. Please refresh.')
      }
    } finally {
      if (!isSilent) setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    fetchNotifications(false)

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(true)
      }
    }, 6000)

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(true)
      }
    }

    const handleNotificationRefresh = () => {
      fetchNotifications(true)
    }

    window.addEventListener('notificationsRead', handleNotificationRefresh)
    window.addEventListener('notificationRefresh', handleNotificationRefresh)
    window.addEventListener('bookingCreated', handleNotificationRefresh)
    window.addEventListener('bookingCancelled', handleNotificationRefresh)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)

    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('notificationsRead', handleNotificationRefresh)
      window.removeEventListener('notificationRefresh', handleNotificationRefresh)
      window.removeEventListener('bookingCreated', handleNotificationRefresh)
      window.removeEventListener('bookingCancelled', handleNotificationRefresh)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [user, isAdmin])

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      const allIds = notifications.map((n) => String(n.notificationId))
      saveReadNotificationIds(allIds)
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))

      try {
        await markAllNotificationsAsRead()
      } catch (err) {
        // ignore
      }

      window.dispatchEvent(new Event('notificationsRead'))
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  // Clear all
  const handleClearAll = async () => {
    const currentIds = notifications.map((n, idx) =>
      String(n.notificationId ?? n.id ?? n._id ?? idx)
    )
    saveClearedNotificationIds(currentIds)
    saveReadNotificationIds(currentIds)
    setNotifications([])

    try {
      await clearAllNotificationsApi()
    } catch (e) {
      // ignore
    }

    window.dispatchEvent(new Event('notificationsRead'))
  }

  // Clear single
  const handleClearSingle = async (e, notificationId) => {
    e.stopPropagation()
    const idStr = String(notificationId)
    saveClearedNotificationIds([idStr])
    setNotifications((prev) => prev.filter((item) => String(item.notificationId) !== idStr))

    try {
      await clearNotificationApi(notificationId)
    } catch (e) {
      // ignore
    }

    window.dispatchEvent(new Event('notificationsRead'))
  }

  // Mark single as read
  const handleMarkSingleRead = (e, notificationId) => {
    e.stopPropagation()
    const idStr = String(notificationId)
    saveReadNotificationIds([idStr])
    setNotifications((prev) =>
      prev.map((item) =>
        String(item.notificationId) === idStr ? { ...item, isRead: true } : item
      )
    )
    window.dispatchEvent(new Event('notificationsRead'))
  }

  // Navigate on select
  const handleSelectNotification = (n) => {
    const id = String(n.notificationId ?? n.id ?? '')
    if (id) {
      saveReadNotificationIds([id])
      setNotifications((prev) =>
        prev.map((item) =>
          String(item.notificationId ?? item.id) === id
            ? { ...item, isRead: true }
            : item
        )
      )
      window.dispatchEvent(new Event('notificationsRead'))
    }

    if (isAdmin) {
      navigate(`/admin/notifications?highlight=${encodeURIComponent(id)}`)
      return
    }

    const bookingId =
      n.bookingId ??
      n.booking_id ??
      n.BookingId ??
      n.hotseatBookingId ??
      n.hotseat_booking_id ??
      n.seatBookingId ??
      n.seat_booking_id ??
      n.booking?.id ??
      n.booking?.bookingId ??
      String(n.message || '').match(/#(\d+)/)?.[1] ??
      ''

    const rawMsg = String(n.message || '')
    const rawTitle = String(n.title || '')
    const combined = `${rawTitle} ${rawMsg}`

    const extractedRoom =
      n.roomName ??
      n.room_name ??
      n.RoomName ??
      n.booking?.roomName ??
      n.booking?.room_name ??
      combined.match(/(Conference Room \d+|Meeting Room \d+|Discussion Room \d+|Board Room \d+|Training Room \d+|Room \d+)/i)?.[0] ??
      ''

    const extractedSeat =
      n.seatNumber ??
      n.seat_number ??
      n.SeatNumber ??
      n.seat ??
      n.booking?.seatNumber ??
      n.booking?.seat ??
      combined.match(/(WS-[\w-]+|Hot\s*Seat\s*[\w-]+|Seat\s*[\w-]+)/i)?.[0] ??
      ''

    let bookingDate =
      n.bookingDate ??
      n.booking_date ??
      n.BookingDate ??
      n.date ??
      n.booking?.bookingDate ??
      n.booking?.date ??
      ''

    if (!bookingDate) {
      const isoDateMatch = combined.match(/\b(\d{4}-\d{2}-\d{2})\b/)
      if (isoDateMatch) {
        bookingDate = isoDateMatch[1]
      }
    }

    const params = new URLSearchParams()
    if (bookingId) params.set('highlight', String(bookingId).replace(/^#/, ''))
    if (extractedRoom) params.set('room', extractedRoom)
    if (extractedSeat) params.set('seat', extractedSeat)
    if (bookingDate) params.set('date', bookingDate)

    navigate(`/my-bookings?${params.toString()}`)
  }

  // Determine category & tone
  const getNotificationCategory = (item) => {
    const text = `${item.title || ''} ${item.message || ''}`.toLowerCase()
    if (text.includes('cancel') || text.includes('rejected') || text.includes('declined')) {
      return {
        type: 'cancelled',
        icon: ShieldAlert,
        color: 'rose',
        badge: 'Cancelled',
        bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-900/60 text-rose-700 dark:text-rose-300',
        iconBg: 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
      }
    }
    if (text.includes('check-in') || text.includes('check in') || text.includes('expire') || text.includes('reminder')) {
      return {
        type: 'alert',
        icon: Clock,
        color: 'amber',
        badge: 'Check-in Alert',
        bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-900/60 text-amber-800 dark:text-amber-300',
        iconBg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
      }
    }
    if (text.includes('hotseat') || text.includes('desk') || text.includes('workstation') || text.includes('ws-')) {
      return {
        type: 'hotseat',
        icon: MapPin,
        color: 'sky',
        badge: 'Hotseat Desk',
        bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200/80 dark:border-sky-900/60 text-sky-800 dark:text-sky-300',
        iconBg: 'bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400',
      }
    }
    return {
      type: 'room',
      icon: Building2,
      color: 'emerald',
      badge: 'Meeting Room',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300',
      iconBg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
    }
  }

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (activeTab === 'unread') return !item.isRead
      const cat = getNotificationCategory(item).type
      if (activeTab === 'rooms') return cat === 'room'
      if (activeTab === 'hotseats') return cat === 'hotseat'
      if (activeTab === 'alerts') return cat === 'alert' || cat === 'cancelled'
      return true
    })
  }, [notifications, activeTab])

  const unreadCount = notifications.filter((n) => !n.isRead).length
  const roomCount = notifications.filter((n) => getNotificationCategory(n).type === 'room').length
  const hotseatCount = notifications.filter((n) => getNotificationCategory(n).type === 'hotseat').length
  const alertCount = notifications.filter((n) => ['alert', 'cancelled'].includes(getNotificationCategory(n).type)).length

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* HERO BANNER & STATS */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-gradient-to-br from-white via-sky-50/50 to-indigo-50/40 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-850 p-6 sm:p-7 shadow-card">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-sky-200/30 dark:bg-sky-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs backdrop-blur-xs">
              <Bell size={13} className="text-sky-600 dark:text-sky-400 animate-bounce" />
              <span>Real-Time Activity & Reservation Radar</span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Notification Center
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
              {isAdmin
                ? 'System updates, booking activity, and workspace allocation alerts for administrative management.'
                : 'Instant reservation confirmations, check-in deadlines, and desk updates for your account.'}
            </p>
          </div>

          {/* QUICK ACTION BUTTONS */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-3.5 py-2.5 text-xs font-bold shadow-2xs transition-all hover:scale-105 active:scale-95"
              >
                <CheckCheck size={14} className="text-sky-600 dark:text-sky-400" />
                <span>Mark All as Read</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 px-3.5 py-2.5 text-xs font-bold shadow-2xs transition-all hover:scale-105 active:scale-95"
              >
                <Trash2 size={13} className="text-rose-600 dark:text-rose-400" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800">
          <div className="rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 p-3 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Alerts</span>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{notifications.length}</div>
          </div>

          <div className="rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 p-3 shadow-2xs">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Unread
            </span>
            <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{unreadCount}</div>
          </div>

          <div className="rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 p-3 shadow-2xs">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Meeting Rooms</span>
            <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">{roomCount}</div>
          </div>

          <div className="rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 p-3 shadow-2xs">
            <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">Hotseats & Alerts</span>
            <div className="text-xl font-extrabold text-sky-700 dark:text-sky-300 mt-0.5">{hotseatCount + alertCount}</div>
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {[
          { id: 'all', label: 'All Alerts', count: notifications.length },
          { id: 'unread', label: 'Unread', count: unreadCount, isBadge: true },
          { id: 'rooms', label: 'Meeting Rooms', count: roomCount },
          { id: 'hotseats', label: 'Hotseat Desks', count: hotseatCount },
          { id: 'alerts', label: 'Check-in & Alerts', count: alertCount },
        ].map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-all shadow-2xs ${
                isActive
                  ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-500/20 scale-[1.02]'
                  : 'bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : tab.isBadge
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 text-xs font-semibold text-red-700 dark:text-red-300">
          <AlertCircle size={18} className="shrink-0 text-red-600 dark:text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* NOTIFICATIONS LIST */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="h-3 w-16 bg-slate-100 dark:bg-slate-750 rounded-md" />
              </div>
              <div className="h-3 w-3/4 bg-slate-100 dark:bg-slate-750 rounded-md" />
              <div className="h-8 w-1/3 bg-slate-100 dark:bg-slate-750 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center shadow-card">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 shadow-inner mb-4">
            <Bell size={28} />
          </div>
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            {activeTab === 'unread' ? 'All caught up!' : 'No notifications in this category'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-5">
            {activeTab === 'unread'
              ? 'You have read all your notifications. New reservation and check-in alerts will appear here.'
              : 'Try selecting another tab or check back after reserving a meeting room or hotseat.'}
          </p>
          <Link
            to="/workspace-search"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 hover:scale-105 transition-all"
          >
            <span>Explore Workspaces</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((item) => {
            const cat = getNotificationCategory(item)
            const Icon = cat.icon
            const isHighlighted = Boolean(
              highlightParam &&
                (String(highlightParam).toLowerCase() === String(item.notificationId).toLowerCase() ||
                  String(highlightParam).toLowerCase() === String(item.id).toLowerCase())
            )

            return (
              <div
                key={item.notificationId}
                id={`notification-card-${item.notificationId}`}
                onClick={() => handleSelectNotification(item)}
                className={`group relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer ${
                  isHighlighted
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 shadow-md ring-2 ring-sky-300 dark:ring-sky-700'
                    : item.isRead
                    ? 'border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/85 hover:border-sky-300 dark:hover:border-sky-700'
                    : 'border-amber-200/90 dark:border-amber-900/60 bg-gradient-to-r from-amber-50/60 via-white to-sky-50/40 dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900 shadow-sm'
                }`}
              >
                {/* UNREAD STRIP INDICATOR */}
                {!item.isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-400 to-amber-600" />
                )}

                <div className="flex items-start justify-between gap-4">
                  {/* LEFT: ICON & DETAILS */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${cat.iconBg} shadow-2xs mt-0.5`}
                    >
                      <Icon size={19} />
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">
                          {item.title}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${cat.bg}`}
                        >
                          {cat.badge}
                        </span>

                        {!item.isRead && (
                          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-2xs">
                            New
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                        {item.message}
                      </p>

                      {/* MICRO SPEC CHIPS */}
                      {(item.roomName || item.bookingDate || item.startTime) && (
                        <div className="flex flex-wrap items-center gap-2 pt-1.5">
                          {item.roomName && (
                            <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                              <Building2 size={12} className="text-sky-600 dark:text-sky-400" />
                              <span>{item.roomName}</span>
                            </div>
                          )}

                          {item.bookingDate && (
                            <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                              <Calendar size={12} className="text-emerald-600 dark:text-emerald-400" />
                              <span>{formatBookingDate(item.bookingDate)}</span>
                            </div>
                          )}

                          {item.startTime && item.endTime && (
                            <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                              <Clock size={12} className="text-amber-600 dark:text-amber-400" />
                              <span>
                                {formatTime(item.startTime)} – {formatTime(item.endTime)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT: TIME & ACTIONS */}
                  <div className="flex flex-col items-end gap-2.5 shrink-0">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {item.timeAgo || 'Just now'}
                    </span>

                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      {!item.isRead && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkSingleRead(e, item.notificationId)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/60 text-slate-600 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-400 transition"
                          title="Mark as read"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleClearSingle(e, item.notificationId)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                        title="Dismiss alert"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}