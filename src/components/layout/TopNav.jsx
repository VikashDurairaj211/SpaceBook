import {
  Search,
  Bell,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  X,
  HelpCircle,
  BookOpen,
  Sun,
  Moon,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useMemo, useRef, useEffect } from 'react'

import client from '../../api/client'
import {
  getNotifications,
  markAllNotificationsAsRead,
  clearAllNotifications,
  clearNotification,
} from '../../api/notifications'
import NotificationDropdown from '../common/NotificationDropdown'

export default function TopNav({
  onToggleSidebar,
  sidebarCollapsed,
  publicOnly = false,
}) {
  const { user, logout } = useAuth()
  const { theme, isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const [liveRooms, setLiveRooms] = useState([])
  const [liveBookings, setLiveBookings] = useState([])

  const [notifications, setNotifications] = useState([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)

  const notificationButtonRef = useRef(null)
  const searchContainerRef = useRef(null)
  const searchInputRef = useRef(null)

  // =====================================================
  // Global Keyboard Shortcut: Ctrl + K (or Cmd + K) to focus search
  // =====================================================

  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (searchInputRef.current) {
          searchInputRef.current.focus()
          searchInputRef.current.select()
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [])

  // =====================================================
  // Determine whether logged-in user is Admin
  // =====================================================

  const isAdmin =
    user?.role === 'Admin' ||
    user?.role === 'admin' ||
    user?.isAdmin === true

  // =====================================================
  // Synchronize search input with URL search parameters for Room Management
  // =====================================================

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const urlSearch = params.get('search') || params.get('q') || ''

    if (location.pathname === '/admin/workspace-administration' || location.pathname === '/admin/room-management') {
      setSearchInput(urlSearch)
    } else if (location.pathname === '/admin/reports' || location.pathname === '/workspace-search' || location.pathname === '/search-rooms' || location.pathname === '/my-bookings') {
      setSearchInput(urlSearch)
    } else {
      setSearchInput('')
    }
  }, [location.pathname, location.search])

  // =====================================================
  // Close search dropdown on click outside
  // =====================================================

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // =====================================================
  // Fetch Live Rooms and Bookings for Autocomplete
  // =====================================================

  useEffect(() => {
    if (publicOnly || !user) {
      return
    }

    async function loadSearchData() {
      try {
        if (isAdmin) {
          const [roomsRes, bookingsRes] = await Promise.allSettled([
            client.get('/admin/rooms'),
            client.get('/admin/bookings'),
          ])

          if (roomsRes.status === 'fulfilled' && roomsRes.value.data) {
            const raw = roomsRes.value.data
            const list = Array.isArray(raw)
              ? raw
              : raw.data || raw.rooms || []
            setLiveRooms(list)
          }

          if (bookingsRes.status === 'fulfilled' && bookingsRes.value.data) {
            const raw = bookingsRes.value.data
            const list = Array.isArray(raw)
              ? raw
              : raw.data || raw.bookings || []
            setLiveBookings(list)
          }
        } else {
          const now = new Date()
          const day = now.getDay()
          const target = new Date(now)
          // If Saturday (+2) or Sunday (+1), use Monday
          if (day === 6) target.setDate(now.getDate() + 2)
          else if (day === 0) target.setDate(now.getDate() + 1)

          const year = target.getFullYear()
          const month = String(target.getMonth() + 1).padStart(2, '0')
          const d = String(target.getDate()).padStart(2, '0')
          const targetDateStr = `${year}-${month}-${d}`

          const [availRes, myBookingsRes] = await Promise.allSettled([
            client.get('/employee/availability', {
              params: { date: targetDateStr },
            }),
            client.get('/employee/mybookings'),
          ])

          if (availRes.status === 'fulfilled' && availRes.value.data) {
            const raw = availRes.value.data
            const list = Array.isArray(raw)
              ? raw
              : raw.rooms || raw.data || []
            setLiveRooms(list)
          }

          if (myBookingsRes.status === 'fulfilled' && myBookingsRes.value.data) {
            const raw = myBookingsRes.value.data
            const list = Array.isArray(raw)
              ? raw
              : raw.data || raw.bookings || []
            setLiveBookings(list)
          }
        }
      } catch (error) {
        console.error('Failed to pre-fetch search autocomplete data:', error)
      }
    }

    loadSearchData()
  }, [publicOnly, user, isAdmin])

  // Helper to get locally marked read notification IDs
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

  // Helper to get locally cleared/dismissed notification IDs
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

  // =====================================================
  // Fetch Notifications
  // =====================================================

  const fetchNotifications = async (isSilent = false) => {
    try {
      if (!isSilent) {
        setLoadingNotifications(true)
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

      // Zero-flicker: Only update state if data actually changed
      setNotifications((prev) => {
        if (prev.length === mapped.length) {
          const isIdentical = prev.every((item, idx) => {
            const m = mapped[idx]
            return (
              item.notificationId === m.notificationId &&
              item.isRead === m.isRead &&
              item.title === m.title &&
              item.message === m.message
            )
          })
          if (isIdentical) return prev
        }
        return mapped
      })
    } catch (error) {
      console.error('Failed to fetch notifications in TopNav:', error)
      if (!isSilent) {
        setNotifications([])
      }
    } finally {
      if (!isSilent) {
        setLoadingNotifications(false)
      }
    }
  }

  // =====================================================
  // Mark All Notifications As Read
  // =====================================================

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('spacebook_token')

      if (!token) {
        return
      }

      // Call backend API
      try {
        await markAllNotificationsAsRead()
      } catch (err) {
        // ignore
      }

      // Persist read IDs locally
      const currentIds = notifications.map((n, idx) =>
        String(n.notificationId ?? n.id ?? n._id ?? idx)
      )
      saveReadNotificationIds(currentIds)

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      )

      window.dispatchEvent(new Event('notificationsRead'))
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
    }
  }

  // =====================================================
  // Clear All Notifications
  // =====================================================

  const handleClearAll = async () => {
    try {
      const currentIds = notifications.map((n, idx) =>
        String(n.notificationId ?? n.id ?? n._id ?? idx)
      )
      saveClearedNotificationIds(currentIds)
      saveReadNotificationIds(currentIds)
      setNotifications([])

      try {
        await clearAllNotifications()
      } catch (e) {
        // ignore
      }

      window.dispatchEvent(new Event('notificationsRead'))
    } catch (error) {
      console.error('Failed to clear notifications in TopNav:', error)
    }
  }

  // =====================================================
  // Clear Single Notification
  // =====================================================

  const handleClearOne = async (id) => {
    const idStr = String(id)
    saveClearedNotificationIds([idStr])
    setNotifications((prev) =>
      prev.filter((n) => String(n.notificationId ?? n.id) !== idStr)
    )

    try {
      await clearNotification(id)
    } catch (e) {
      // ignore
    }

    window.dispatchEvent(new Event('notificationsRead'))
  }

  // =====================================================
  // Load Notifications (With Auto-Polling & Live Refresh)
  // =====================================================

  useEffect(() => {
    if (publicOnly || !user) {
      return
    }

    // Initial fetch (shows initial loading if necessary)
    fetchNotifications(false)

    // 1. Silent auto-polling every 5 seconds without triggering UI loading states or shakes
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(true)
      }
    }, 5000)

    // 2. Silent fetch on tab focus / visibility change
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
    window.addEventListener('booking-updated', handleNotificationRefresh)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)

    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('notificationsRead', handleNotificationRefresh)
      window.removeEventListener('notificationRefresh', handleNotificationRefresh)
      window.removeEventListener('bookingCreated', handleNotificationRefresh)
      window.removeEventListener('bookingCancelled', handleNotificationRefresh)
      window.removeEventListener('booking-updated', handleNotificationRefresh)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [publicOnly, user, isAdmin])

  // =====================================================
  // Unread Count
  // =====================================================

  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => !notification.isRead).length
  }, [notifications])

  // =====================================================
  // Search Results
  // =====================================================

  const searchResults = useMemo(() => {
    if (!searchInput.trim()) {
      return {
        rooms: [],
        bookings: [],
      }
    }

    const query = searchInput.trim().toLowerCase()

    const roomDataSource = liveRooms
    const bookingDataSource = liveBookings

    const matchedRooms = roomDataSource
      .filter((room) => {
        const name = String(room.roomName || room.name || room.RoomName || '')
        const code = String(room.roomCode || room.code || room.Code || '')
        const moduleName = String(room.module || room.Module || '')
        const type = String(
          room.roomTypeName || room.type || room.roomType?.name || ''
        )

        return (
          name.toLowerCase().includes(query) ||
          code.toLowerCase().includes(query) ||
          moduleName.toLowerCase().includes(query) ||
          type.toLowerCase().includes(query)
        )
      })
      .map((room) => ({
        id: room.roomId ?? room.id ?? room.RoomId,
        name: room.roomName ?? room.name ?? room.RoomName ?? 'Room',
        module: room.module ?? room.Module ?? '',
        type: room.roomTypeName ?? room.type ?? room.roomType?.name ?? '',
        code: room.roomCode ?? room.code ?? room.Code ?? '',
      }))
      .slice(0, 5)

    const matchedBookings = bookingDataSource
      .filter((booking) => {
        const roomName = String(
          booking.roomName || booking.RoomName || booking.room?.name || ''
        )
        const title = String(
          booking.meetingTitle ||
            booking.title ||
            booking.Title ||
            booking.purpose ||
            ''
        )
        const creator = String(
          booking.userName ||
            booking.bookedBy ||
            booking.employeeName ||
            booking.requestedBy ||
            ''
        )

        return (
          roomName.toLowerCase().includes(query) ||
          title.toLowerCase().includes(query) ||
          creator.toLowerCase().includes(query)
        )
      })
      .map((booking) => ({
        id: booking.bookingId ?? booking.id ?? booking.BookingId,
        roomName:
          booking.roomName ??
          booking.RoomName ??
          booking.room?.name ??
          'Room',
        title:
          booking.meetingTitle ||
          booking.title ||
          booking.Title ||
          booking.purpose ||
          'Booking',
        date: booking.bookingDate ?? booking.date ?? '',
      }))
      .slice(0, 5)

    return {
      rooms: matchedRooms,
    }
  }, [searchInput, liveRooms])

  const flatSearchResults = useMemo(() => {
    return (searchResults.rooms || []).map((r, i) => ({
      ...r,
      searchType: 'room',
      globalIndex: i,
    }))
  }, [searchResults])

  // Scroll active item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && searchContainerRef.current) {
      const activeEl = searchContainerRef.current.querySelector(
        `[data-search-index="${highlightedIndex}"]`
      )
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [highlightedIndex])

  function handleSearchKeyDown(e) {
    if (!showSearchResults || flatSearchResults.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev + 1 < flatSearchResults.length ? prev + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev - 1 >= 0 ? prev - 1 : flatSearchResults.length - 1
      )
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && flatSearchResults[highlightedIndex]) {
        e.preventDefault()
        const item = flatSearchResults[highlightedIndex]
        if (item.searchType === 'room') {
          handleSelectRoom(item)
        } else {
          handleSelectResult(item.title || item.roomName, 'booking')
        }
      }
    } else if (e.key === 'Escape') {
      setShowSearchResults(false)
      setHighlightedIndex(-1)
    }
  }

  // =====================================================
  // Search Submit
  // =====================================================

  function handleSearchSubmit(event) {
    if (event) {
      event.preventDefault()
    }

    const query = searchInput.trim()

    if (!query) {
      if (location.pathname.startsWith('/admin/workspace-administration') || location.pathname.startsWith('/admin/room-management')) {
        navigate('/admin/workspace-administration')
      } else if (location.pathname.startsWith('/admin/reports')) {
        navigate('/admin/reports')
      } else if (location.pathname.startsWith('/workspace-search') || location.pathname.startsWith('/search-rooms')) {
        navigate('/workspace-search')
      } else if (location.pathname.startsWith('/my-bookings')) {
        navigate('/my-bookings')
      }
      setShowSearchResults(false)
      return
    }

    // ADMIN SEARCH
    if (isAdmin) {
      navigate(`/admin/workspace-administration?search=${encodeURIComponent(query)}`)
    }
    // EMPLOYEE SEARCH
    else {
      if (location.pathname.includes('/my-bookings')) {
        navigate(`/my-bookings?search=${encodeURIComponent(query)}`)
      } else {
        navigate(`/workspace-search?q=${encodeURIComponent(query)}`)
      }
    }

    setShowSearchResults(false)
  }

  // =====================================================
  // Select Search Result
  // =====================================================

  function handleSelectResult(queryTerm, type = 'room') {
    const query = String(queryTerm || '').trim()

    if (!query) {
      return
    }

    setSearchInput(query)
    setShowSearchResults(false)

    // =================================================
    // ADMIN NAVIGATION
    // =================================================

    if (isAdmin) {
      if (type === 'booking') {
        navigate(`/admin/reports?search=${encodeURIComponent(query)}`)
      } else {
        navigate(`/admin/workspace-administration?search=${encodeURIComponent(query)}`)
      }
    }

    // =================================================
    // EMPLOYEE NAVIGATION
    // =================================================

    else {
      if (type === 'booking') {
        navigate(`/my-bookings?search=${encodeURIComponent(query)}`)
      } else {
        navigate(`/workspace-search?q=${encodeURIComponent(query)}`)
      }
    }
  }

  function handleSelectRoom(room) {
    if (!room) return
    setSearchInput(room.name || '')
    setShowSearchResults(false)

    if (isAdmin) {
      navigate(`/admin/workspace-administration?search=${encodeURIComponent(room.name || room.code || '')}`)
    } else {
      const moduleParam = room.module || ''
      const typeParam = room.type || ''
      const nameParam = room.name || ''
      navigate(`/workspace-search?module=${encodeURIComponent(moduleParam)}&roomType=${encodeURIComponent(typeParam)}&q=${encodeURIComponent(nameParam)}`)
    }
  }

  // =====================================================
  // Clear Search
  // =====================================================

  function handleClearSearch() {
    setSearchInput('')
    setShowSearchResults(false)
    if (location.pathname.startsWith('/admin/workspace-administration') || location.pathname.startsWith('/admin/room-management')) {
      navigate('/admin/workspace-administration')
    } else if (location.pathname.startsWith('/admin/reports')) {
      navigate('/admin/reports')
    } else if (location.pathname.startsWith('/workspace-search') || location.pathname.startsWith('/search-rooms')) {
      navigate('/workspace-search')
    } else if (location.pathname.startsWith('/my-bookings')) {
      navigate('/my-bookings')
    }
  }

  // =====================================================
  // Logout
  // =====================================================

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  // =====================================================
  // Render
  // =====================================================

  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex h-[52px] items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/90 backdrop-blur-md px-4 shadow-xs transition-all">

      {/* =================================================
          LEFT SIDE
      ================================================= */}

      <div className="flex min-w-0 items-center">
        {!publicOnly && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="mr-3 rounded-xl p-1.5 text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
            aria-label={
              sidebarCollapsed
                ? 'Open sidebar'
                : 'Close sidebar'
            }
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
        )}

        <div
          className="flex cursor-pointer items-center gap-2.5 transition-transform hover:scale-[1.02]"
          onClick={() =>
            navigate(
              isAdmin
                ? '/admin/reports'
                : '/dashboard'
            )
          }
        >
          <img
            src="/Logo.png"
            alt="SpaceBook"
            className="h-7 w-7 object-contain drop-shadow-xs"
          />

          <span className="hidden font-display text-base font-extrabold tracking-tight text-slate-900 dark:text-white sm:block">
            SPACE<span className="text-sky-600">BOOK</span>
          </span>
        </div>
      </div>

      {/* =================================================
          SEARCH
      ================================================= */}

      {!publicOnly && (
        <form
          ref={searchContainerRef}
          onSubmit={handleSearchSubmit}
          className="relative mx-6 hidden max-w-sm flex-1 md:flex"
        >
          <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/80 px-3 py-1.5 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/10 shadow-xs transition-all">

            <button
              type="submit"
              className="text-slate-500 transition-colors hover:text-sky-600 shrink-0"
              aria-label="Search"
            >
              <Search
                size={14}
                className="text-slate-400"
              />
            </button>

            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search workspaces, bookings..."
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value)
                setHighlightedIndex(-1)
                setShowSearchResults(true)
              }}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => {
                if (searchInput.trim()) {
                  setShowSearchResults(true)
                }
              }}
              className="w-full min-w-0 bg-transparent text-xs font-sans text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
            />

            {searchInput ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="shrink-0 rounded-full p-0.5 text-slate-400 transition hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            ) : (
              <span className="hidden sm:inline-flex shrink-0 whitespace-nowrap items-center font-mono text-[10px] font-semibold text-slate-400 dark:text-slate-400 bg-white dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded-md shadow-2xs select-none pointer-events-none">
                Ctrl + K
              </span>
            )}
          </div>

          {/* Search Dropdown */}

          {showSearchResults &&
            searchInput.trim() && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-auto rounded-xl border border-sky-200 bg-white text-ink shadow-2xl divide-y divide-slate-100">

                {/* Rooms */}

                {searchResults.rooms.length > 0 && (
                  <div>
                    <div className="bg-sky-50/80 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-sky-800">
                      Rooms
                    </div>

                    {searchResults.rooms.map((room, rIdx) => {
                      const isHighlighted = highlightedIndex === rIdx
                      return (
                        <button
                          key={room.id}
                          type="button"
                          data-search-index={rIdx}
                          onMouseEnter={() => setHighlightedIndex(rIdx)}
                          onClick={() => handleSelectRoom(room)}
                          className={`flex w-full flex-col px-3 py-2 text-left font-sans text-sm transition-colors border-l-4 ${
                            isHighlighted
                              ? 'bg-sky-100/90 text-sky-950 border-[#0284C7] font-semibold shadow-xs'
                              : 'border-transparent hover:bg-sky-50/60 text-slate-800'
                          }`}
                        >
                          <span className="font-medium text-ink">
                            {room.name}
                          </span>

                          <span className="text-xs text-slate">
                            {room.module} · {room.type}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* No Results */}

                {searchResults.rooms.length === 0 && (
                  <div className="px-3 py-4 text-center font-sans text-sm text-slate">
                    No rooms found
                  </div>
                )}
              </div>
            )}
        </form>
      )}

      {/* =================================================
          RIGHT SIDE
      ================================================= */}

      {!publicOnly && (
        <div className="flex items-center gap-2">

          {/* SharePoint */}

          <a
            href="https://vmivsp.sharepoint.com"
            className="rounded-xl p-1.5 text-slate-600 dark:text-slate-300 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
            aria-label="SharePoint Home"
          >
            <Home size={16} />
          </a>

          {/* Notifications */}

          <div className="relative">

            <button
              ref={notificationButtonRef}
              type="button"
              onClick={() => {
                setNotificationOpen(
                  (value) => !value
                )

                setMenuOpen(false)
              }}
              className="relative rounded-xl p-1.5 text-slate-600 dark:text-slate-300 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              aria-label="Notifications"
            >
              <Bell size={16} />

              {unreadCount > 0 && (
                <span className="pointer-events-none absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                  {unreadCount}
                </span>
              )}
            </button>

            <NotificationDropdown
              open={notificationOpen}
              buttonRef={notificationButtonRef}
              notifications={notifications}
              loading={loadingNotifications}
              onClose={() =>
                setNotificationOpen(false)
              }
              onMarkAllRead={
                handleMarkAllRead
              }
              onClearAll={
                handleClearAll
              }
              onClearOne={
                handleClearOne
              }
              onViewAll={() => {
                navigate(
                  isAdmin
                    ? '/admin/notifications'
                    : '/notifications'
                )

                setNotificationOpen(false)
              }}
            />
          </div>

          {/* User Guide & Help Button */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('openSpaceBookGuide'))}
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 transition-all shadow-xs"
            title="Open SpaceBook User Guide & Help"
            aria-label="User Guide"
          >
            <HelpCircle size={14} className="text-sky-600 dark:text-sky-400" />
            <span className="hidden sm:inline">Guide</span>
          </button>

          {/* Theme Toggle Button (Light / Dark) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-center rounded-xl p-1.5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-xs"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Light and Dark Theme"
          >
            {isDark ? (
              <Sun size={15} className="text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon size={15} className="text-slate-600 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* User Menu */}

          <div className="relative">

            <button
              type="button"
              onClick={() =>
                setMenuOpen(
                  (value) => !value
                )
              }
              className="flex items-center gap-2 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white/90 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-xs"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-[10px] font-bold text-white shadow-2xs">
                {(user?.name ? user.name.charAt(0).toUpperCase() : isAdmin ? 'A' : 'E')}
              </div>

              <span className="max-w-[100px] truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                {user?.name ||
                  (isAdmin
                    ? 'Admin'
                    : 'Employee')}
              </span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-36 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1 shadow-lg divide-y divide-slate-100 dark:divide-slate-700">
                <div className="px-3 py-1.5">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Signed in as</p>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{user?.name || (isAdmin ? 'Admin' : 'Employee')}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full px-3 py-2 text-left font-semibold text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 text-xs"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}