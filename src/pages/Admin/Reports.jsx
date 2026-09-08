import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  RefreshCw,
  FileText,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Calendar,
  Sparkles,
  Activity,
  Eye,
  X,
  TrendingUp,
} from 'lucide-react'

import client from '../../api/client'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import {
  getBookingTrendReport,
  getBookingStatusReport,
  getRoomUsageReport,
} from '../../api/adminReports'
import { downloadCSV } from '../../utils/exportHelpers'

// =====================================================
// HELPERS
// =====================================================

function formatDisplayTime(time) {
  if (!time) return ''
  const value = String(time).trim()
  if (!value) return ''
  let timePart = value
  if (value.includes('T')) {
    timePart = value.split('T')[1] || ''
  }
  const parts = timePart.split(':')
  if (parts.length >= 2) {
    const h = String(parts[0]).padStart(2, '0')
    const m = String(parts[1]).padStart(2, '0')
    return `${h}:${m}`
  }
  return timePart.substring(0, 5)
}

function formatDisplayDate(date) {
  if (!date) return ''
  const value = String(date).trim()
  if (!value) return ''
  const dateOnly = value.includes('T') ? value.split('T')[0] : value.substring(0, 10)
  const parts = dateOnly.split(/[-/]/)
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const y = parts[0]
      const m = String(parts[1]).padStart(2, '0')
      const d = String(parts[2]).padStart(2, '0')
      return `${y}-${m}-${d}`
    } else {
      const d = String(parts[0]).padStart(2, '0')
      const m = String(parts[1]).padStart(2, '0')
      const y = parts[2]
      return `${d}/${m}/${y}`
    }
  }
  return dateOnly
}

// =====================================================
// STATUS HELPERS
// =====================================================

function normalizeStatus(status) {
  const value = String(status || 'CONFIRMED')
    .trim()
    .toUpperCase()

  if (
    value === 'APPROVED' ||
    value === 'BOOKED' ||
    value === 'CONFIRMED'
  ) {
    return 'CONFIRMED'
  }

  if (
    value === 'CANCELLED' ||
    value === 'CANCELED' ||
    value === 'REJECTED'
  ) {
    return value === 'REJECTED' ? 'REJECTED' : 'CANCELLED'
  }

  if (value === 'PENDING') {
    return 'PENDING'
  }

  return value || 'CONFIRMED'
}

// =====================================================
// STATUS BADGE
// =====================================================

function CustomStatusTag({ status }) {
  const normalized = normalizeStatus(status)

  let bgClass = 'bg-[#658362] text-white'

  if (normalized === 'PENDING' || normalized === 'MAINTENANCE') {
    bgClass = 'bg-[#E09F3E] text-white'
  } else if (
    normalized === 'CANCELLED' ||
    normalized === 'REJECTED' ||
    normalized === 'UNAVAILABLE' ||
    normalized === 'BLOCKED'
  ) {
    bgClass = 'bg-[#B85450] text-white'
  }

  return (
    <span
      className={`inline-block min-w-[56px] px-1.5 py-0.5 rounded-full text-[8.5px] font-bold tracking-wider uppercase text-center ${bgClass}`}
    >
      {normalized || 'CONFIRMED'}
    </span>
  )
}

// =====================================================
// COLOR PALETTE
// =====================================================

const ROOM_COLORS = [
  '#0284C7',
  '#0D9488',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
]

// =====================================================
// CUSTOM CHART TOOLTIP
// =====================================================

function CustomChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) {
    return null
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-3 shadow-xl backdrop-blur-sm">
      <p className="font-semibold text-xs text-slate-800 dark:text-slate-100">{label}</p>
      <div className="mt-1 space-y-1">
        {payload.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-4 text-xs"
          >
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: item.color || item.fill,
                }}
              />
              {item.name}:
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {item.value} {item.unit || ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// =====================================================
// MAIN REPORTS COMPONENT
// =====================================================

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // DATA
  const [bookings, setBookings] = useState([])
  const [trendData, setTrendData] = useState([])
  const [statusDistribution, setStatusDistribution] = useState([])
  const [roomTypeUsage, setRoomTypeUsage] = useState([])
  const [dashboardMetrics, setDashboardMetrics] = useState(null)

  // FILTERS
  const [timeFilter, setTimeFilter] = useState('Today')
  const [moduleFilter, setModuleFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [trendPeriod, setTrendPeriod] = useState('Monthly')
  const [activeChart, setActiveChart] = useState('trend')

  // MODAL / SEARCH
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [tableSearch, setTableSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 8

  const openViewModal = (booking) => {
    setSelectedBooking(booking)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setSelectedBooking(null)
    setIsModalOpen(false)
  }

  // =====================================================
  // NORMALIZE ADMIN BOOKING
  // =====================================================

  const normalizeBooking = (b, index) => {
    const bookingId =
      b.bookingId ??
      b.booking_id ??
      b.BookingId ??
      b.id ??
      b.Id ??
      b.reservationId ??
      index + 1

    const rawTitle =
      b.meetingTitle ??
      b.MeetingTitle ??
      b.meeting_title ??
      b.title ??
      b.Title ??
      b.meetingName ??
      b.MeetingName ??
      b.purpose ??
      b.Purpose ??
      ''

    const meetingTitle = rawTitle && String(rawTitle).trim() ? String(rawTitle).trim() : '-'

    const employeeName =
      b.employeeName ??
      b.EmployeeName ??
      b.employee?.name ??
      b.employee?.employeeName ??
      b.Employee?.Name ??
      b.requestedBy ??
      b.createdBy ??
      b.requester ??
      'Employee'

    const roomName =
      b.roomName ??
      b.RoomName ??
      b.room?.name ??
      b.room?.roomName ??
      b.Room?.Name ??
      (b.roomId != null ? `Room ${b.roomId}` : 'Room')

    const rawMod = String(
      b.module ??
      b.Module ??
      b.moduleName ??
      b.ModuleName ??
      b.room?.module ??
      b.room?.moduleName ??
      ''
    ).toLowerCase()

    let resolvedModule = 'Module 1 - Elcot Park - CMB'
    if (rawMod.includes('tidel') || rawMod.includes('tidal')) {
      resolvedModule = 'Module 1 - Tidel Park - CMB'
    } else if (rawMod.includes('module 2') || rawMod.includes('m2')) {
      resolvedModule = 'Module 2 - Elcot Park - CMB'
    }

    const roomType =
      b.roomType ??
      b.RoomType ??
      b.room?.type ??
      b.room?.roomType?.name ??
      b.Room?.RoomType?.Name ??
      'Conference'

    const status = normalizeStatus(b.status ?? b.Status)

    const cancellationReason =
      b.cancellationReason ??
      b.CancellationReason ??
      b.cancellation_reason ??
      b.cancelReason ??
      b.cancel_reason ??
      ''

    return {
      bookingId,
      id: bookingId,
      title: meetingTitle,
      meetingTitle,
      employeeId: b.employeeId ?? b.EmployeeId ?? b.employee?.employeeId ?? null,
      createdBy: employeeName,
      roomId: b.roomId ?? b.RoomId ?? b.room?.roomId ?? b.Room?.RoomId ?? null,
      roomName,
      module: resolvedModule,
      roomType,
      date: formatDisplayDate(b.bookingDate ?? b.BookingDate ?? b.date),
      startTime: formatDisplayTime(b.startTime ?? b.StartTime ?? b.start_time ?? b.start),
      endTime: formatDisplayTime(b.endTime ?? b.EndTime ?? b.end_time ?? b.end),
      participantCount: b.participantCount ?? b.ParticipantCount ?? b.participants ?? 0,
      status,
      cancelReason: cancellationReason ? String(cancellationReason).trim() : '',
      createdAt: b.bookedOn ?? b.BookedOn ?? b.createdAt ?? b.CreatedAt ?? '',
    }
  }

  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [
        bookingsRes,
        trendRes,
        statusRes,
        usageRes,
        dashBookingsRes,
        adminDashRes,
      ] = await Promise.allSettled([
        client.get('/admin/bookings'),
        getBookingTrendReport({ reportType: trendPeriod }),
        getBookingStatusReport({}),
        getRoomUsageReport({}),
        client.get('/admin/bookings/dashboard'),
        client.get('/admin/dashboard'),
        client.post('/admin/dashboard', { timeframe: 'All', timeFilter: 'All' }).catch(() => null),
      ])

      // 1. Trend Report
      if (trendRes.status === 'fulfilled' && trendRes.value) {
        setTrendData(
          Array.isArray(trendRes.value)
            ? trendRes.value
            : trendRes.value.data || []
        )
      }

      // 2. Status Distribution
      if (statusRes.status === 'fulfilled' && statusRes.value) {
        setStatusDistribution(
          Array.isArray(statusRes.value)
            ? statusRes.value
            : statusRes.value.data || []
        )
      }

      // 3. Room Type Usage
      if (usageRes.status === 'fulfilled' && usageRes.value) {
        setRoomTypeUsage(
          Array.isArray(usageRes.value)
            ? usageRes.value
            : usageRes.value.data || []
        )
      }

      // 4. Dashboard Metrics (Merge from GET & POST /admin/dashboard)
      const combinedDash = {
        ...(adminDashRes.status === 'fulfilled' && adminDashRes.value?.data ? adminDashRes.value.data : {}),
        ...(dashBookingsRes.status === 'fulfilled' && dashBookingsRes.value?.data ? dashBookingsRes.value.data : {}),
      }
      setDashboardMetrics(combinedDash)

      // 5. Admin Bookings
      if (bookingsRes.status === 'fulfilled') {
        const responseData = bookingsRes.value?.data
        let rawData = []

        if (Array.isArray(responseData)) {
          rawData = responseData
        } else if (responseData && typeof responseData === 'object') {
          if (Array.isArray(responseData.bookings)) {
            rawData = responseData.bookings
          } else if (Array.isArray(responseData.data)) {
            rawData = responseData.data
          } else if (Array.isArray(responseData.items)) {
            rawData = responseData.items
          }
        }

        const mappedBookings = rawData.map((booking, index) =>
          normalizeBooking(booking, index)
        )

        setBookings(mappedBookings)
      }
    } catch (err) {
      console.error('Failed to load reports data:', err)
      setError('Unable to load reporting data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch filtered dashboard metrics from POST /api/admin/dashboard whenever filters change
  const fetchFilteredDashboard = async () => {
    try {
      const now = new Date()
      const formatLocalDate = (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`

      const todayStr = formatLocalDate(now)
      const sevenDaysAgo = new Date(now)
      sevenDaysAgo.setDate(now.getDate() - 7)
      const sevenDaysAgoStr = formatLocalDate(sevenDaysAgo)

      const thirtyDaysAgo = new Date(now)
      thirtyDaysAgo.setDate(now.getDate() - 30)
      const thirtyDaysAgoStr = formatLocalDate(thirtyDaysAgo)

      let startDate = undefined
      let endDate = todayStr

      if (timeFilter === 'Today') {
        startDate = todayStr
        endDate = todayStr
      } else if (timeFilter === 'This Week') {
        startDate = sevenDaysAgoStr
      } else if (timeFilter === 'This Month') {
        startDate = thirtyDaysAgoStr
      }

      const payload = {
        timeframe: timeFilter,
        timeFilter,
        module: moduleFilter !== 'All' ? moduleFilter : undefined,
        moduleFilter: moduleFilter !== 'All' ? moduleFilter : undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        startDate,
        endDate,
      }

      // Try POST /api/admin/dashboard with AdminDashboardFilterDto
      const postRes = await client.post('/admin/dashboard', payload).catch(() => null)
      if (postRes?.data) {
        setDashboardMetrics((prev) => ({ ...(prev || {}), ...postRes.data }))
        return
      }

      // Fallback to GET /api/admin/dashboard with query params
      const getRes = await client.get('/admin/dashboard', { params: payload }).catch(() => null)
      if (getRes?.data) {
        setDashboardMetrics((prev) => ({ ...(prev || {}), ...getRes.data }))
      }
    } catch (err) {
      console.warn('Dashboard metric sync error:', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    fetchFilteredDashboard()
  }, [timeFilter, moduleFilter])

  // =====================================================
  // FILTERING LOGIC
  // =====================================================

  // Total reservations in scope (Timeframe & Module) - ignores statusFilter so Total Reservations card stays constant
  const totalOverallInScope = useMemo(() => {
    const now = new Date()
    const formatLocalDate = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`

    const todayStr = formatLocalDate(now)

    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 7)
    const sevenDaysAgoStr = formatLocalDate(sevenDaysAgo)

    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 30)
    const thirtyDaysAgoStr = formatLocalDate(thirtyDaysAgo)

    return bookings.filter((b) => {
      // 1. MODULE FILTER
      if (moduleFilter !== 'All') {
        const bMod = String(b.module || '').toLowerCase()
        if (moduleFilter.includes('Tidel')) {
          if (!bMod.includes('tidel') && !bMod.includes('tidal')) return false
        } else if (moduleFilter.includes('Module 2')) {
          if (!bMod.includes('module 2') && !bMod.includes('m2')) return false
        } else if (moduleFilter.includes('Module 1')) {
          if (!bMod.includes('module 1') || bMod.includes('tidel')) return false
        }
      }

      // 2. TIME FILTER
      if (timeFilter !== 'All') {
        const bDate = b.date
        if (!bDate) return true

        if (timeFilter === 'Today' && bDate !== todayStr) {
          return false
        }
        if (timeFilter === 'This Week' && (bDate < sevenDaysAgoStr || bDate > todayStr)) {
          return false
        }
        if (timeFilter === 'This Month' && (bDate < thirtyDaysAgoStr || bDate > todayStr)) {
          return false
        }
        if (timeFilter === 'Past' && bDate >= todayStr) {
          return false
        }
        if (timeFilter === 'Upcoming' && bDate < todayStr) {
          return false
        }
      }

      return true
    })
  }, [bookings, moduleFilter, timeFilter])

  const filteredBookings = useMemo(() => {
    const now = new Date()
    const formatLocalDate = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`

    const todayStr = formatLocalDate(now)

    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 7)
    const sevenDaysAgoStr = formatLocalDate(sevenDaysAgo)

    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 30)
    const thirtyDaysAgoStr = formatLocalDate(thirtyDaysAgo)

    return bookings.filter((b) => {
      // 1. MODULE FILTER
      if (moduleFilter !== 'All') {
        const bMod = String(b.module || '').toLowerCase()
        if (moduleFilter.includes('Tidel')) {
          if (!bMod.includes('tidel') && !bMod.includes('tidal')) return false
        } else if (moduleFilter.includes('Module 2')) {
          if (!bMod.includes('module 2') && !bMod.includes('m2')) return false
        } else if (moduleFilter.includes('Module 1')) {
          if (!bMod.includes('module 1') || bMod.includes('tidel')) return false
        }
      }

      // 2. STATUS FILTER
      if (statusFilter !== 'All') {
        const norm = normalizeStatus(b.status)
        if (statusFilter === 'Confirmed' && norm !== 'CONFIRMED') {
          return false
        }
        if (statusFilter === 'Cancelled' && norm !== 'CANCELLED' && norm !== 'REJECTED') {
          return false
        }
      }

      // 3. TIME FILTER
      if (timeFilter !== 'All') {
        const bDate = b.date
        if (!bDate) return true

        if (timeFilter === 'Today' && bDate !== todayStr) {
          return false
        }
        if (timeFilter === 'This Week' && (bDate < sevenDaysAgoStr || bDate > todayStr)) {
          return false
        }
        if (timeFilter === 'This Month' && (bDate < thirtyDaysAgoStr || bDate > todayStr)) {
          return false
        }
        if (timeFilter === 'Past' && bDate >= todayStr) {
          return false
        }
        if (timeFilter === 'Upcoming' && bDate < todayStr) {
          return false
        }
      }

      return true
    })
  }, [bookings, moduleFilter, statusFilter, timeFilter])

  // TABLE SEARCH
  const displayedTableBookings = useMemo(() => {
    if (!tableSearch.trim()) return filteredBookings
    const query = tableSearch.toLowerCase().trim()

    return filteredBookings.filter((b) => {
      return (
        String(b.bookingId || '').toLowerCase().includes(query) ||
        String(b.title || '').toLowerCase().includes(query) ||
        String(b.roomName || '').toLowerCase().includes(query) ||
        String(b.createdBy || '').toLowerCase().includes(query) ||
        String(b.module || '').toLowerCase().includes(query) ||
        String(b.date || '').toLowerCase().includes(query) ||
        String(b.status || '').toLowerCase().includes(query)
      )
    })
  }, [filteredBookings, tableSearch])

  // PAGINATION
  const totalPages = Math.ceil(displayedTableBookings.length / pageSize) || 1
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return displayedTableBookings.slice(start, start + pageSize)
  }, [displayedTableBookings, currentPage, pageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [tableSearch, timeFilter, moduleFilter, statusFilter])

  // =====================================================
  // METRICS & KPIS
  // =====================================================

  const kpis = useMemo(() => {
    // Total Reservations remains fixed to the overall scope count and never drops when selecting status filter
    const total = totalOverallInScope.length
    let confirmed = 0
    let cancelled = 0
    let totalBookedMinutes = 0
    const roomSet = new Set()
    const userSet = new Set()
    const dateSet = new Set()

    totalOverallInScope.forEach((b) => {
      if (b.roomName) roomSet.add(b.roomName)
      if (b.createdBy) userSet.add(b.createdBy)
      if (b.date) dateSet.add(b.date)

      const st = normalizeStatus(b.status)
      if (st === 'CANCELLED' || st === 'REJECTED') {
        cancelled++
      } else {
        confirmed++
        // Calculate booking duration in minutes
        let mins = 60
        if (b.startTime && b.endTime) {
          const [sh, sm] = String(b.startTime).split(':').map(Number)
          const [eh, em] = String(b.endTime).split(':').map(Number)
          if (!isNaN(sh) && !isNaN(eh)) {
            const startMins = sh * 60 + (sm || 0)
            const endMins = eh * 60 + (em || 0)
            if (endMins > startMins) mins = endMins - startMins
          }
        }
        totalBookedMinutes += mins
      }
    })

    const confirmedRate = total > 0 ? Math.round((confirmed / total) * 100) : 0
    const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0
    const uniqueRooms = roomSet.size || (total > 0 ? 1 : 0)
    const uniqueUsers = userSet.size

    // Determine timeframe span for utilization calculation
    let daysCount = 1
    if (timeFilter === 'Today') {
      daysCount = 1
    } else if (timeFilter === 'This Week') {
      daysCount = 5 // 5 business days
    } else if (timeFilter === 'This Month') {
      daysCount = 22 // ~22 business days
    } else {
      daysCount = Math.max(1, dateSet.size)
    }

    // Strictly display backend baseline utilization from /api/admin/dashboard
    const rawUtil =
      dashboardMetrics?.utilization ??
      dashboardMetrics?.utilizationRate ??
      dashboardMetrics?.occupancyRate

    let utilization = '0.0'
    const num = rawUtil != null && rawUtil !== '' ? Number(rawUtil) : NaN
    if (!isNaN(num)) {
      utilization = num.toFixed(1)
    }

    return {
      total,
      confirmed,
      confirmedRate,
      cancelled,
      cancellationRate,
      uniqueRooms,
      uniqueUsers,
      utilization,
    }
  }, [totalOverallInScope, dashboardMetrics, timeFilter, moduleFilter, statusFilter])

  // =====================================================
  // CHART DATA
  // =====================================================

  // 1. Employee Comparison
  const employeeComparisonData = useMemo(() => {
    const map = {}
    filteredBookings.forEach((b) => {
      const name = b.createdBy || 'Employee'
      if (!map[name]) {
        map[name] = { name, confirmed: 0, cancelled: 0, total: 0 }
      }
      map[name].total += 1
      const st = normalizeStatus(b.status)
      if (st === 'CANCELLED' || st === 'REJECTED') {
        map[name].cancelled += 1
      } else {
        map[name].confirmed += 1
      }
    })

    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 7)
  }, [filteredBookings])

  // 2. Status Outcome Donut
  const visualStatusData = useMemo(() => {
    if (kpis.total === 0) return []
    return [
      { name: 'Confirmed', value: kpis.confirmed, color: '#658362' },
      { name: 'Cancelled', value: kpis.cancelled, color: '#B85450' },
    ]
  }, [kpis])

  // 3. Timeline Trend (Enterprise Daily/Weekly/Monthly Granularity)
  const timelineData = useMemo(() => {
    const map = new Map()
    filteredBookings.forEach((b) => {
      const dateStr = b.date
      if (!dateStr) return
      let label = dateStr

      if (trendPeriod === 'Monthly') {
        const [y, m] = dateStr.split(/[-/]/)
        if (y && m) {
          const dt = new Date(Number(y), Number(m) - 1, 1)
          label = dt.toLocaleString('en-US', { month: 'short', year: 'numeric' })
        }
      } else if (trendPeriod === 'Weekly') {
        const dt = new Date(dateStr)
        if (!isNaN(dt.getTime())) {
          const day = dt.getDay()
          const diff = dt.getDate() - day + (day === 0 ? -6 : 1)
          const monday = new Date(dt.setDate(diff))
          label = `Wk ${monday.getMonth() + 1}/${monday.getDate()}`
        }
      } else if (trendPeriod === 'Daily') {
        const dt = new Date(dateStr)
        if (!isNaN(dt.getTime())) {
          label = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }
      }
      map.set(label, (map.get(label) || 0) + 1)
    })

    if (map.size === 0) {
      return []
    }

    return Array.from(map.entries()).map(([name, bookings]) => ({
      name,
      bookings,
    }))
  }, [filteredBookings, trendPeriod])

  // 4. Campus & Module Utilization Rates (Enterprise 1500+ scale)
  const campusUtilization = useMemo(() => {
    let tidelCount = 0
    let elcot1Count = 0
    let elcot2Count = 0
    let roomCount = 0

    filteredBookings.forEach((b) => {
      const st = normalizeStatus(b.status)
      if (st === 'CANCELLED' || st === 'REJECTED') return

      const mod = String(b.module || '').toLowerCase()
      const rName = String(b.roomName || '').toLowerCase()

      if (mod.includes('tidel') || mod.includes('tidal') || rName.includes('tidel')) {
        tidelCount++
      } else if (mod.includes('module 2') || mod.includes('m2') || rName.includes('eo2')) {
        elcot2Count++
      } else if (mod.includes('module 1') || mod.includes('m1') || rName.includes('eo1')) {
        elcot1Count++
      } else {
        roomCount++
      }
    })

    const tidelCap = 229
    const elcot1Cap = 98
    const elcot2Cap = 98
    const roomCap = 15

    return [
      {
        name: 'Module 1 - Tidel Park',
        location: 'Coimbatore Campus',
        booked: tidelCount,
        capacity: tidelCap,
        rate: Math.min(100, Math.round((tidelCount / tidelCap) * 100)),
        badge: '229 Desks',
      },
      {
        name: 'Module 1 - Elcot Park',
        location: 'Coimbatore Campus',
        booked: elcot1Count,
        capacity: elcot1Cap,
        rate: Math.min(100, Math.round((elcot1Count / elcot1Cap) * 100)),
        badge: '98 Desks',
      },
      {
        name: 'Module 2 - Elcot Park',
        location: 'Coimbatore Campus',
        booked: elcot2Count,
        capacity: elcot2Cap,
        rate: Math.min(100, Math.round((elcot2Count / elcot2Cap) * 100)),
        badge: '98 Desks',
      },
      {
        name: 'Meeting & Conference Rooms',
        location: 'All Campuses',
        booked: roomCount,
        capacity: roomCap,
        rate: Math.min(100, Math.round((roomCount / roomCap) * 100)),
        badge: '15 Total Rooms',
      },
    ]
  }, [filteredBookings])

  // 4. Room Popularity
  const roomPopularityData = useMemo(() => {
    const map = {}
    filteredBookings.forEach((b) => {
      const room = b.roomName || 'Room'
      if (!map[room]) {
        map[room] = { name: room, bookings: 0 }
      }
      map[room].bookings += 1
    })

    return Object.values(map)
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 6)
  }, [filteredBookings])

  // 6. Hourly Distribution
  const hourlyDistributionData = useMemo(() => {
    const hourMap = new Map()
    filteredBookings.forEach((b) => {
      const raw = String(b.startTime || '').trim()
      if (!raw) return
      const hStr = raw.includes(':') ? raw.split(':')[0].slice(-2) : '10'
      const h = parseInt(hStr, 10)
      if (isNaN(h)) return
      const slot = `${String(h).padStart(2, '0')}:00`
      hourMap.set(slot, (hourMap.get(slot) || 0) + 1)
    })

    const slots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']
    return slots.map((time) => ({
      time,
      bookings: hourMap.get(time) || 0,
    }))
  }, [filteredBookings])

  // =====================================================
  // EXPORT HANDLERS
  // =====================================================

  const handleExportCSV = () => {
    const csvData = filteredBookings.map((b) => ({
      'Booking ID': b.bookingId,
      'Meeting Title': b.title || '-',
      Room: b.roomName,
      Module: b.module,
      Date: b.date,
      Time: `${b.startTime} - ${b.endTime}`,
      'Created By': b.createdBy,
      Status: b.status,
      'Cancellation Reason': b.cancelReason || 'N/A',
    }))

    downloadCSV(
      csvData,
      `SpaceBook-Room-Analytics-${new Date().toISOString().split('T')[0]}.csv`
    )
  }

  return (
    <div className="space-y-5">
      {/* =================================================
          HEADER & ACTIONS
      ================================================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Reports & Analytics
          </h1>
          <p className="mt-1 text-sm text-slate">
            Executive visual insights on room reservations, utilization metrics, and audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-nowrap flex-shrink-0">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 hover:border-slate-300 shadow-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed h-7"
          >
            <RefreshCw
              size={11}
              className={loading ? 'animate-spin text-sky-600' : 'text-slate-600'}
            />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Button
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredBookings.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-[11px] font-bold text-white shadow-xs whitespace-nowrap transition-all active:scale-95 border-0 h-7"
          >
            <FileText size={12} className="text-blue-100" />
            <span className="text-white">Export CSV</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      {/* =================================================
          FILTER BAR
      ================================================= */}
      <Card className="p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-slate">
              FILTERS:
            </span>

            {/* Timeframe Filter */}
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none focus:border-sky-500"
            >
              <option value="Today">Today</option>
              <option value="All">All Time</option>
              <option value="This Week">Past 7 Days</option>
              <option value="This Month">Past 30 Days</option>
              <option value="Past">Past Dates</option>
              <option value="Upcoming">Upcoming</option>
            </select>

            {/* Module Filter */}
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none focus:border-sky-500"
            >
              <option value="All">All Modules</option>
              <option value="Module 1 - Elcot Park">Module 1 - Elcot Park</option>
              <option value="Module 2 - Elcot Park">Module 2 - Elcot Park</option>
              <option value="Module 1 - Tidel Park">Module 1 - Tidel Park</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none focus:border-sky-500"
            >
              <option value="All">All Status</option>
              <option value="Confirmed">Confirmed Bookings</option>
              <option value="Cancelled">Cancelled Bookings</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Analyzing {filteredBookings.length} total bookings
          </div>
        </div>
      </Card>

      {/* =================================================
          TOP 4 KPI CARDS
      ================================================= */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: TOTAL RESERVATIONS */}
        <Card className="p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              Total Reservations
            </span>
            <Calendar size={14} className="text-sky-600" />
          </div>
          <p className="mt-1 text-2xl font-extrabold text-ink leading-tight">
            {kpis.total}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate">
            <span>15 Rooms</span>
            <span className="font-semibold text-sky-700">{kpis.uniqueUsers} Employee{kpis.uniqueUsers === 1 ? '' : 's'}</span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div className="h-1 rounded-full bg-sky-600 w-full" />
          </div>
        </Card>

        {/* Card 2: UTILIZATION */}
        <Card className="p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              Utilization
            </span>
            <Activity size={14} className="text-sky-600" />
          </div>
          <p className="mt-1 text-2xl font-extrabold text-ink leading-tight">
            {kpis.utilization}%
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate">
            <span>Occupancy Rate</span>
            <span className="font-semibold text-sky-700">{kpis.utilization}%</span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div
              className="h-1 rounded-full bg-sky-600 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, Number(kpis.utilization) || 0))}%` }}
            />
          </div>
        </Card>

        {/* Card 3: CONFIRMED BOOKINGS */}
        <Card className="p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              Confirmed Bookings
            </span>
            <CheckCircle2 size={14} className="text-[#658362]" />
          </div>
          <p className="mt-1 text-2xl font-extrabold text-[#658362] leading-tight">
            {kpis.confirmed}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate">
            <span>Successful Occupancy</span>
            <span className="font-bold text-emerald-700">{kpis.confirmedRate}%</span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div
              className="h-1 rounded-full bg-[#658362] transition-all duration-500"
              style={{ width: `${kpis.confirmedRate}%` }}
            />
          </div>
        </Card>

        {/* Card 4: CANCELLED BOOKINGS */}
        <Card className="p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              Cancelled Bookings
            </span>
            <XCircle size={14} className="text-[#B85450]" />
          </div>
          <p className="mt-1 text-2xl font-extrabold text-[#B85450] leading-tight">
            {kpis.cancelled}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate">
            <span>Cancellation Impact</span>
            <span className="font-bold text-red-700">{kpis.cancellationRate}%</span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div
              className="h-1 rounded-full bg-[#B85450] transition-all duration-500"
              style={{ width: `${kpis.cancellationRate}%` }}
            />
          </div>
        </Card>
      </div>

      {/* =================================================
          ENTERPRISE CAMPUS & MODULE OCCUPANCY RATES (1500+ SCALE)
      ================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {campusUtilization.map((fac) => {
          const isHigh = fac.rate >= 85;
          const isMid = fac.rate >= 60 && fac.rate < 85;
          const colorClass = isHigh
            ? 'bg-rose-500'
            : isMid
            ? 'bg-amber-500'
            : 'bg-emerald-500';
          const badgeClass = isHigh
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : isMid
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200';

          return (
            <Card key={fac.name} className="p-3 shadow-xs border-slate-200/90">
              <div className="flex items-start justify-between gap-1">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    {fac.location}
                  </span>
                  <h3 className="font-bold text-xs text-slate-900 mt-0.5 truncate" title={fac.name}>
                    {fac.name}
                  </h3>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border ${badgeClass} whitespace-nowrap shrink-0`}>
                  {fac.rate}% Full
                </span>
              </div>

              <div className="mt-2 flex items-baseline justify-between text-xs">
                <span className="font-extrabold text-slate-800 text-sm">
                  {fac.booked} <span className="text-[10.5px] text-slate-400 font-normal">/ {fac.capacity}</span>
                </span>
                <span className="text-[10.5px] text-slate-500 font-medium">{fac.badge}</span>
              </div>

              <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                  style={{ width: `${fac.rate}%` }}
                />
              </div>
            </Card>
          );
        })}
      </div>

      {/* =================================================
          PREVIEW CARD WITH [ 👁 VIEW ] BUTTON
      ================================================= */}
      <Card className="p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-ink">
              Workplace Reservation Records & Audit
            </h2>
            <p className="text-xs text-slate mt-0.5">
              Showing {filteredBookings.length} of {bookings.length} reservations matching active filters.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAuditModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-xs rounded-xl shadow-sm transition-all active:scale-95 border-0 cursor-pointer"
          >
            <Eye size={12} />
            <span>View</span>
          </button>
        </div>
      </Card>

      {/* =================================================
          MASTER INTERACTIVE CHART CARD
      ================================================= */}
      <Card className="p-4 sm:p-5 shadow-sm">
        {/* CHART CONTROLS & TABS */}
        <div className="flex flex-col gap-3 pb-4 border-b border-line xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-bold text-ink truncate">
                {activeChart === 'trend' && 'Reservation Volume Trendline'}
                {activeChart === 'outcome' && 'Reservation Outcome Breakdown'}
                {activeChart === 'employee' && 'Employee Booking vs Cancellation Ratio'}
                {activeChart === 'rooms' && 'Workspace Ranking'}
                {activeChart === 'hourly' && 'Peak Workspace Demand by Hour'}
              </h2>
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold text-sky-800 whitespace-nowrap shrink-0 inline-flex items-center">
                Visual Analytics
              </span>
            </div>
            <p className="text-xs text-slate mt-0.5 truncate">
              {activeChart === 'trend' && 'Historical reservation activity and volume patterns over time.'}
              {activeChart === 'outcome' && 'Proportion of successful confirmed bookings versus cancellations.'}
              {activeChart === 'employee' && 'Confirmed vs cancelled reservations by top employees.'}
              {activeChart === 'rooms' && 'Workspace popularity ranked by total reservation volume.'}
              {activeChart === 'hourly' && 'Distribution of reservations across operational office hours (10:00 to 22:00 IST).'}
            </p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap shrink-0 max-w-full pb-1 xl:pb-0">
            {/* DAILY / WEEKLY / MONTHLY TOGGLE (for Volume Trendline) */}
            {activeChart === 'trend' && (
              <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs shrink-0 border border-slate-200/60 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setTrendPeriod('Daily')}
                  className={`rounded-md px-2 py-1 text-xs font-bold transition-all ${
                    trendPeriod === 'Daily'
                      ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setTrendPeriod('Weekly')}
                  className={`rounded-md px-2 py-1 text-xs font-bold transition-all ${
                    trendPeriod === 'Weekly'
                      ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setTrendPeriod('Monthly')}
                  className={`rounded-md px-2 py-1 text-xs font-bold transition-all ${
                    trendPeriod === 'Monthly'
                      ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Monthly
                </button>
              </div>
            )}

            {/* TAB PILLS - ALL IN ONE SINGLE LINE */}
            <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700 p-1 rounded-xl flex-nowrap shrink-0 whitespace-nowrap overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setActiveChart('trend')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  activeChart === 'trend'
                    ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <TrendingUp size={13} className={activeChart === 'trend' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'} />
                <span>Volume Trend</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveChart('outcome')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  activeChart === 'outcome'
                    ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <Sparkles size={13} className={activeChart === 'outcome' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'} />
                <span>Outcomes</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveChart('employee')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  activeChart === 'employee'
                    ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <Users size={13} className={activeChart === 'employee' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'} />
                <span>Employee Ratio</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveChart('rooms')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  activeChart === 'rooms'
                    ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <Building2 size={13} className={activeChart === 'rooms' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'} />
                <span>Workspace Ranking</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveChart('hourly')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  activeChart === 'hourly'
                    ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <Clock size={13} className={activeChart === 'hourly' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} />
                <span>Hourly Demand</span>
              </button>
            </div>
          </div>
        </div>

        {/* ACTIVE CHART DISPLAY */}
        <div className="h-[360px] sm:h-[390px] w-full pt-4">
          {/* Chart 1: Volume Trendline */}
          {activeChart === 'trend' && (
            timelineData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate">
                No reservation trend data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bookingAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284C7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0284C7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="bookings"
                    name="Reservations"
                    stroke="#0284C7"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#bookingAreaGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )
          )}

          {/* Chart 2: Outcome Breakdown */}
          {activeChart === 'outcome' && (
            visualStatusData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate">
                No status data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={visualStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={120}
                    paddingAngle={4}
                  >
                    {visualStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend verticalAlign="bottom" iconType="circle" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )
          )}

          {/* Chart 3: Employee Ratio */}
          {activeChart === 'employee' && (
            employeeComparisonData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate">
                No employee activity data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={employeeComparisonData}
                  margin={{ top: 10, right: 15, left: -15, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#475569', fontSize: 11 }}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar name="Confirmed" dataKey="confirmed" fill="#658362" radius={[4, 4, 0, 0]} />
                  <Bar name="Cancelled" dataKey="cancelled" fill="#B85450" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          )}

          {/* Chart 4: Room Rankings */}
          {activeChart === 'rooms' && (
            roomPopularityData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate">
                No room usage records found.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={roomPopularityData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fill: '#475569', fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#0f172a', fontSize: 11, fontWeight: 600 }}
                    width={130}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar dataKey="bookings" name="Reservations" fill="#0284C7" radius={[0, 6, 6, 0]}>
                    {roomPopularityData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={ROOM_COLORS[index % ROOM_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          )}

          {/* Chart 5: Hourly Demand */}
          {activeChart === 'hourly' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyDistributionData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 11 }} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar dataKey="bookings" name="Bookings at Hour" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* =====================================================
          AUDIT TABLE MODAL
      ===================================================== */}
      {isAuditModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-5xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-4 sm:p-5 relative flex flex-col max-h-[86vh] border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                  Workplace Reservation Records & Audit
                </h2>
                <button
                  type="button"
                  onClick={() => setIsAuditModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Subheader with Filter Count & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-1.5">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Showing {displayedTableBookings.length} of {bookings.length} reservations matching active filters.
                </p>

                <div className="flex items-center gap-1.5">
                  <input
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Search bookings, rooms, employees..."
                    className="w-full sm:w-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-[11px] h-7.5 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-sky-500 shadow-xs"
                  />
                  {tableSearch && (
                    <button
                      type="button"
                      onClick={() => setTableSearch('')}
                      className="text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-1"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Table Container Box */}
              <div className="mt-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="overflow-y-auto overflow-x-hidden max-h-[360px]">
                  <table className="w-full table-fixed text-left text-[11px]">
                    <thead className="sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-800/95 backdrop-blur-xs shadow-xs">
                      <tr className="border-b border-slate-200 dark:border-slate-700 text-[9.5px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        <th className="w-[8%] px-2 py-1.5 whitespace-nowrap">BOOKING ID</th>
                        <th className="w-[19%] px-2 py-1.5 truncate">MEETING TITLE</th>
                        <th className="w-[13%] px-2 py-1.5 truncate">ROOM</th>
                        <th className="w-[15%] px-2 py-1.5 truncate">MODULE</th>
                        <th className="w-[10%] px-2 py-1.5 whitespace-nowrap">DATE</th>
                        <th className="w-[11%] px-2 py-1.5 whitespace-nowrap">TIME</th>
                        <th className="w-[12.5%] px-2 py-1.5 truncate">CREATED BY</th>
                        <th className="w-[11.5%] px-2 py-1.5 text-center whitespace-nowrap">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td colSpan={8} className="px-2 py-6 text-center text-slate-500 text-xs">
                            Loading reservation records...
                          </td>
                        </tr>
                      ) : paginatedBookings.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-2 py-6 text-center text-slate-500 text-xs">
                            No reservation records match the active filter criteria.
                          </td>
                        </tr>
                      ) : (
                        paginatedBookings.map((booking) => (
                          <tr
                            key={booking.bookingId}
                            onClick={() => openViewModal(booking)}
                            className="cursor-pointer transition-colors duration-150 hover:bg-slate-50/80 leading-tight"
                          >
                            <td className="px-2 py-1.5 font-bold text-slate-900 truncate">
                              {booking.bookingId}
                            </td>
                            <td className="px-2 py-1.5 font-medium text-slate-800 truncate" title={booking.title || '-'}>
                              {booking.title || '-'}
                            </td>
                            <td className="px-2 py-1.5 text-slate-600 truncate" title={booking.roomName}>
                              {booking.roomName}
                            </td>
                            <td className="px-2 py-1.5 text-slate-600 truncate" title={booking.module}>
                              {booking.module}
                            </td>
                            <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap">
                              {booking.date}
                            </td>
                            <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap">
                              {booking.startTime && booking.endTime
                                ? `${booking.startTime} - ${booking.endTime}`
                                : booking.startTime || '-'}
                            </td>
                            <td className="px-2 py-1.5 text-slate-600 truncate" title={booking.createdBy}>
                              {booking.createdBy}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <CustomStatusTag status={booking.status} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer (Matching 2-Row Layout) */}
              <div className="mt-2.5 flex flex-col gap-1.5 pt-1 border-t border-slate-100">
                {/* Row 1 */}
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-500">
                    Showing {displayedTableBookings.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, displayedTableBookings.length)} of {displayedTableBookings.length} bookings
                  </p>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Prev
                    </button>
                    <span className="text-[10px] font-semibold text-slate-700 px-1">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>

                {/* Row 2 */}
                <div className="flex items-center justify-between pt-0.5">
                  <p className="text-[10px] text-slate-400">
                    Total {displayedTableBookings.length} bookings found
                  </p>

                  <button
                    type="button"
                    onClick={() => setIsAuditModalOpen(false)}
                    className="rounded-md border border-slate-200 bg-white px-3.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* =====================================================
          SINGLE BOOKING DETAIL MODAL
      ===================================================== */}
      {selectedBooking && (
        <Modal
          open={isModalOpen}
          onClose={closeModal}
          title="Reservation Details"
          footer={
            <div className="flex w-full items-center justify-end">
              <Button size="sm" variant="secondary" onClick={closeModal}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-sm text-slate">
            <div className="grid grid-cols-2 gap-3 border-b border-line pb-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Booking ID
                </p>
                <p className="font-bold text-ink text-base">
                  {selectedBooking.bookingId}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Status
                </p>
                <div className="mt-1">
                  <CustomStatusTag status={selectedBooking.status} />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                Meeting Title
              </p>
              <p className="font-semibold text-ink text-base mt-0.5">
                {selectedBooking.title || '-'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Room
                </p>
                <p className="font-medium text-ink mt-0.5">
                  {selectedBooking.roomName}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Module
                </p>
                <p className="font-medium text-ink mt-0.5">
                  {selectedBooking.module}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Date
                </p>
                <p className="font-medium text-ink mt-0.5">
                  {selectedBooking.date}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Time Slot
                </p>
                <p className="font-medium text-ink mt-0.5">
                  {selectedBooking.startTime} - {selectedBooking.endTime}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Created By
                </p>
                <p className="font-medium text-ink mt-0.5">
                  {selectedBooking.createdBy}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Room Type
                </p>
                <p className="font-medium text-ink mt-0.5">
                  {selectedBooking.roomType}
                </p>
              </div>
            </div>

            {selectedBooking.cancelReason && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-red-800">
                  Cancellation Reason
                </p>
                <p className="mt-1 text-sm font-medium text-red-900">
                  &ldquo;{selectedBooking.cancelReason}&rdquo;
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}