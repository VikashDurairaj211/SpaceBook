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
  Calendar,
  Sparkles,
  Activity,
  Armchair,
  Eye,
  X,
  Layers,
  MapPin,
  Loader2,
  UserCheck,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'

import client from '../../api/client'
import {
  getHotseatFilters,
  getHotseatDashboard,
  getHotseatAnalytics,
  getHotseatRecords,
  exportHotseatCsv,
} from '../../api/adminHotseat'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import { downloadCSV } from '../../utils/exportHelpers'
import { formatTime24, formatDateWithZeros } from '../../utils/timeUtils'

// =====================================================
// Helper: Convert any date format into YYYY-MM-DD
// =====================================================

function toStandardIsoDate(dateVal) {
  if (!dateVal || dateVal === '-') return ''
  const str = String(dateVal).trim()
  const dateOnly = str.includes('T') ? str.split('T')[0] : str.substring(0, 10)
  const parts = dateOnly.split(/[-/.]/)
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      const y = parts[0]
      const m = String(parts[1]).padStart(2, '0')
      const d = String(parts[2]).padStart(2, '0')
      return `${y}-${m}-${d}`
    } else if (parts[2].length === 4) {
      // DD-MM-YYYY
      const y = parts[2]
      const m = String(parts[1]).padStart(2, '0')
      const d = String(parts[0]).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }
  return dateOnly
}

// =====================================================
// Helper: Resolve Section from Seat Number
// =====================================================

function resolveSection(seatNumber, module) {
  if (!seatNumber) return 'Section A'
  const str = String(seatNumber)

  if (str.startsWith('WS-04-')) {
    const num = parseInt(str.replace('WS-04-', ''), 10)
    if (!isNaN(num)) {
      if (num <= 62) return 'Section A'
      if (num <= 118) return 'Section B'
      if (num <= 164) return 'Section C'
      return 'Section D'
    }
  }

  const num = parseInt(str.split('-').pop(), 10)
  if (isNaN(num)) return 'Section A'

  const modStr = String(module || seatNumber).toLowerCase()
  if (modStr.includes('1') || modStr.includes('eo1')) {
    if (num <= 32) return 'Section A'
    return 'Section B'
  }
  if (modStr.includes('2') || modStr.includes('eo2')) {
    if (num >= 80 && num <= 131) return 'Section C'
    return 'Section B'
  }
  return 'Section A'
}

function resolveFullSectionName(seatNumber, module) {
  const short = resolveSection(seatNumber, module)
  if (short === 'Section A') return 'Section A (Seats 1 – 62 / 1 – 32)'
  if (short === 'Section B') return 'Section B (Seats 63 – 118 / 33 – 79)'
  if (short === 'Section C') return 'Section C (Seats 119 – 164 / 80 – 131)'
  return 'Section D (Seats 165 – 224)'
}

// =====================================================
// Status Badge Component
// =====================================================

function HotseatStatusTag({ status }) {
  const norm = String(status || 'CONFIRMED').toUpperCase()

  let bgClass = 'bg-[#5c7a60] text-white' // Approved / Confirmed -> Green
  let label = 'APPROVED'

  if (norm.includes('CANCEL') || norm === 'REJECTED') {
    bgClass = 'bg-[#be534d] text-white' // Cancelled -> Red
    label = 'CANCELLED'
  } else if (
    norm.includes('CHECK') ||
    norm === 'CHECKED IN' ||
    norm === 'CHECKEDIN' ||
    norm === 'CHECKED-IN'
  ) {
    bgClass = 'bg-[#0284C7] text-white' // Checked In -> Blue
    label = 'CHECKED IN'
  } else if (norm.includes('EXPIR')) {
    bgClass = 'bg-[#EA580C] text-white' // Expired -> Vibrant Orange
    label = 'EXPIRED'
  } else if (norm.includes('RELEASE')) {
    bgClass = 'bg-[#7c3aed] text-white' // Released -> Purple
    label = 'RELEASED'
  } else if (norm.includes('PEND')) {
    bgClass = 'bg-[#E09F3E] text-white' // Pending -> Amber
    label = 'PENDING'
  } else {
    bgClass = 'bg-[#5c7a60] text-white'
    label = 'APPROVED'
  }

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[56px] px-1.5 py-0.5 rounded-full text-[8.5px] font-bold tracking-wider uppercase text-center shadow-xs ${bgClass}`}
    >
      {label}
    </span>
  )
}

// =====================================================
// Color Palettes
// =====================================================

const MODULE_COLORS = [
  '#0284C7', // Tidel Park Blue
  '#0D9488', // Elcot Module 1 Teal
  '#6366F1', // Elcot Module 2 Indigo
  '#8B5CF6',
  '#EC4899',
]

const SECTION_COLORS = {
  'Section A': '#0284C7',
  'Section B': '#0D9488',
  'Section C': '#6366F1',
  'Section D': '#F59E0B',
}

// =====================================================
// Custom Tooltip Component for Charts
// =====================================================

function CustomChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null

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
                style={{ backgroundColor: item.color || item.fill }}
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

const ITEMS_PER_PAGE = 8

// =====================================================
// Main Component
// =====================================================

export default function HotseatManagement() {
  const [bookings, setBookings] = useState([])
  const [dashboardData, setDashboardData] = useState(null)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [filterOptions, setFilterOptions] = useState({
    modules: [],
    statuses: [],
  })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState(null)

  // Filters
  const [timeFilter, setTimeFilter] = useState('Today')
  const [moduleFilter, setModuleFilter] = useState('All')
  const [tableSearch, setTableSearch] = useState('')

  // Interactive Visual Analytics Tab State
  const [activeChart, setActiveChart] = useState('hourly')

  // Pagination for Modal Table
  const [currentPage, setCurrentPage] = useState(1)

  // Modals
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const openDetailModal = (booking) => {
    setSelectedBooking(booking)
    setIsDetailModalOpen(true)
  }

  const closeDetailModal = () => {
    setSelectedBooking(null)
    setIsDetailModalOpen(false)
  }

  // =====================================================
  // Load Pure Hotseat Data from Backend APIs
  // =====================================================

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const normalizeTimeframe = (tf) => {
        if (!tf || tf === 'All') return null
        if (tf === 'Today') return 'daily'
        if (tf === 'This Week') return 'weekly'
        if (tf === 'This Month') return 'monthly'
        return tf.toLowerCase()
      }

      const filterDto = {
        timeframe: normalizeTimeframe(timeFilter),
        module: moduleFilter === 'All' ? null : moduleFilter,
        page: 1,
        pageSize: 1000,
      }

      // Fetch dynamic endpoints in parallel
      const [recordsRes, dashboardRes, analyticsRes, filtersRes] =
        await Promise.allSettled([
          getHotseatRecords(filterDto),
          getHotseatDashboard(filterDto),
          getHotseatAnalytics(filterDto),
          getHotseatFilters(),
        ])

      // 1. Process Filter Options
      if (filtersRes.status === 'fulfilled' && filtersRes.value) {
        const fData = filtersRes.value
        const rawMods = Array.isArray(fData.modules)
          ? fData.modules
          : Array.isArray(fData)
            ? fData
            : []
        const formatCleanModuleLabel = (str) => {
          if (!str) return str
          const lower = str.toLowerCase()
          if (lower.includes('tidel') || lower.includes('tidal')) {
            return 'Module 1 - Tidel Park'
          }
          if (lower.includes('module 2') || lower.includes('eo2')) {
            return 'Module 2 - Elcot Park'
          }
          if (lower.includes('module 1') || lower.includes('elcot')) {
            return 'Module 1 - Elcot Park'
          }
          return str
        }

        const parsedMods = rawMods
          .map((m, idx) => {
            if (typeof m === 'object' && m !== null) {
              const rawLabel = String(
                m.label ?? m.name ?? m.value ?? `Module ${idx + 1}`
              )
              return {
                value: String(
                  m.value ?? m.name ?? m.id ?? m.label ?? `module-${idx}`
                ),
                label: formatCleanModuleLabel(rawLabel),
              }
            }
            return {
              value: String(m),
              label: formatCleanModuleLabel(String(m)),
            }
          })
          .filter(
            (m) =>
              m.value.toLowerCase() !== 'all' &&
              !m.label.toLowerCase().includes('all module') &&
              m.value !== ''
          )

        // Strict order: 1. Tidel Park, 2. Elcot Module 1, 3. Elcot Module 2
        parsedMods.sort((a, b) => {
          const textA = (a.label + ' ' + a.value).toLowerCase()
          const textB = (b.label + ' ' + b.value).toLowerCase()

          const getRank = (text) => {
            if (text.includes('tidel') || text.includes('tidal')) return 1
            if (text.includes('module 2') || text.includes('eo2')) return 3
            if (text.includes('module 1') || text.includes('elcot')) return 2
            return 4
          }

          return getRank(textA) - getRank(textB)
        })

        const rawStatuses = Array.isArray(fData.statuses) ? fData.statuses : []
        const parsedStatuses = rawStatuses
          .map((s, idx) => {
            if (typeof s === 'object' && s !== null) {
              return {
                value: String(s.value ?? s.name ?? s.id ?? s.label ?? `status-${idx}`),
                label: String(s.label ?? s.name ?? s.value ?? `Status ${idx + 1}`),
              }
            }
            return { value: String(s), label: String(s) }
          })
          .filter(
            (s) =>
              s.value.toLowerCase() !== 'all' &&
              !s.label.toLowerCase().includes('all status') &&
              s.value !== ''
          )

        setFilterOptions({
          modules: parsedMods,
          statuses: parsedStatuses,
        })
      }

      // 2. Process Dashboard KPI Summary
      if (dashboardRes.status === 'fulfilled' && dashboardRes.value) {
        setDashboardData(dashboardRes.value)
      } else {
        setDashboardData(null)
      }

      // 3. Process Analytics Data
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value) {
        setAnalyticsData(analyticsRes.value)
      } else {
        setAnalyticsData(null)
      }

      // 4. Process Records
      let rawList = []
      if (recordsRes.status === 'fulfilled' && recordsRes.value) {
        const rVal = recordsRes.value
        rawList = Array.isArray(rVal)
          ? rVal
          : rVal?.items || rVal?.records || rVal?.bookings || rVal?.data || []
      }

      const mapped = rawList.map((b, idx) => {
        const seatNum =
          typeof b.seat === 'object' && b.seat !== null
            ? b.seat.seatNumber || b.seat.name || b.seat.id || ''
            : b.seatNumber || b.seat || b.seatId || ''

        const resolvedModule =
          typeof b.module === 'object' && b.module !== null
            ? b.module.name || b.module.title || ''
            : b.module ||
            b.moduleName ||
            (String(seatNum).startsWith('WS-04')
              ? 'Module 1 - Tidel Park - CMB'
              : String(seatNum).includes('EO2')
                ? 'Module 2 - Elcot Park - CMB'
                : 'Module 1 - Elcot Park - CMB')

        const rawTimeStr =
          b.expectedCheckInTime ||
          b.expectedCheckIn ||
          b.startTime ||
          ''

        let timeStr = String(rawTimeStr).trim()
        if (timeStr.includes('-')) {
          const [startT, endT] = timeStr.split('-').map((s) => s.trim())
          timeStr = `${formatTime24(startT)} - ${formatTime24(endT)}`
        } else if (timeStr) {
          timeStr = formatTime24(timeStr)
        } else {
          timeStr = '-'
        }

        const rawDate =
          b.bookingDate ||
          b.date ||
          ''

        const employeeName =
          typeof b.user === 'object' && b.user !== null
            ? b.user.name || b.user.fullName || b.user.email || 'Employee'
            : b.employeeName || b.userName || b.requestedBy || b.user || 'Employee'

        const rawStatus =
          typeof b.status === 'object' && b.status !== null
            ? b.status.name || b.status.status || ''
            : b.status || b.bookingStatus || b.statusName || ''

        let statusStr = String(rawStatus).toUpperCase()
        if (
          b.cancelReason ||
          b.cancellationReason ||
          statusStr.includes('CANCEL') ||
          statusStr === 'REJECTED'
        ) {
          statusStr = 'CANCELLED'
        } else if (
          b.actualCheckInTime ||
          b.checkInTime ||
          statusStr.includes('CHECK')
        ) {
          statusStr = 'CHECKED IN'
        } else if (statusStr.includes('RELEASE')) {
          statusStr = 'RELEASED'
        } else if (statusStr.includes('EXPIR')) {
          statusStr = 'EXPIRED'
        } else {
          statusStr = 'CONFIRMED'
        }

        return {
          id: b.id || b.bookingId || idx + 1,
          bookingId: b.bookingId || b.id || idx + 1,
          employee: String(employeeName),
          seat: String(seatNum || '-'),
          module: String(resolvedModule),
          location: String(b.location || 'Coimbatore'),
          zone:
            b.zone ||
            b.office ||
            (String(seatNum).startsWith('WS-04')
              ? 'Tidel Park'
              : 'Elcot Park'),
          section: resolveFullSectionName(seatNum, resolvedModule),
          date: rawDate ? formatDateWithZeros(rawDate) : '-',
          isoDate: toStandardIsoDate(rawDate),
          expectedCheckIn: timeStr,
          status: statusStr,
          cancelReason: String(b.cancelReason || b.cancellationReason || ''),
        }
      })

      // Sort ascending by ID / Date (old to new)
      mapped.sort((a, b) => {
        const idA = Number(a.bookingId) || 0
        const idB = Number(b.bookingId) || 0
        if (idA !== idB) return idA - idB
        return String(a.date || '').localeCompare(String(b.date || ''))
      })

      setBookings(mapped)
    } catch (err) {
      console.error('Failed to load live hotseat data:', err)
      setError(
        err?.response?.data?.message ||
        'Unable to load live hotseat records from server.'
      )
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [timeFilter, moduleFilter])

  // =====================================================
  // Filtering Logic
  // =====================================================

  const filteredBookings = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const todayStr = `${year}-${month}-${day}`

    const d7 = new Date(now)
    d7.setDate(d7.getDate() - 7)
    const sevenDaysAgoStr = `${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, '0')}-${String(d7.getDate()).padStart(2, '0')}`

    const d30 = new Date(now)
    d30.setDate(d30.getDate() - 30)
    const thirtyDaysAgoStr = `${d30.getFullYear()}-${String(d30.getMonth() + 1).padStart(2, '0')}-${String(d30.getDate()).padStart(2, '0')}`

    return bookings.filter((b) => {
      const bDate = b.isoDate || toStandardIsoDate(b.date)

      // 1. Timeframe Filter
      if (timeFilter === 'Today') {
        if (bDate !== todayStr) return false
      } else if (timeFilter === 'This Week') {
        if (!bDate || bDate < sevenDaysAgoStr || bDate > todayStr) return false
      } else if (timeFilter === 'This Month') {
        if (!bDate || bDate < thirtyDaysAgoStr || bDate > todayStr) return false
      } else if (timeFilter === 'Past') {
        if (!bDate || bDate >= todayStr) return false
      } else if (timeFilter === 'Upcoming') {
        if (!bDate || bDate <= todayStr) return false
      }

      // 2. Module Filter
      if (moduleFilter !== 'All') {
        const modName = String(b.module || '').toLowerCase()
        const zoneName = String(b.zone || '').toLowerCase()
        const seatStr = String(b.seat || '').toUpperCase()
        const target = moduleFilter.toLowerCase()

        const isTidel = target.includes('tidel') || target.includes('tidal')
        const isElcotM2 = target.includes('module 2') || target.includes('eo2')
        const isElcotM1 =
          (target.includes('module 1') && target.includes('elcot')) ||
          (target.includes('elcot') && !target.includes('module 2'))

        let matches =
          modName.includes(target) ||
          target.includes(modName) ||
          target.includes(zoneName)

        if (isTidel) {
          matches =
            matches ||
            modName.includes('tidel') ||
            modName.includes('tidal') ||
            zoneName.includes('tidel') ||
            seatStr.startsWith('WS-04')
        } else if (isElcotM2) {
          matches =
            matches ||
            modName.includes('module 2') ||
            modName.includes('eo2') ||
            seatStr.includes('EO2')
        } else if (isElcotM1) {
          matches =
            matches ||
            ((modName.includes('module 1') || modName.includes('elcot')) &&
              !modName.includes('module 2') &&
              !modName.includes('tidel') &&
              !seatStr.includes('EO2') &&
              !seatStr.startsWith('WS-04'))
        }

        if (!matches) return false
      }

      return true
    })
  }, [bookings, timeFilter, moduleFilter])

  // Filtered list for the modal search table
  const displayedTableBookings = useMemo(() => {
    if (!tableSearch.trim()) return filteredBookings

    const q = tableSearch.toLowerCase()
    return filteredBookings.filter((b) => {
      return (
        String(b.bookingId).toLowerCase().includes(q) ||
        String(b.employee).toLowerCase().includes(q) ||
        String(b.seat).toLowerCase().includes(q) ||
        String(b.module).toLowerCase().includes(q) ||
        String(b.section).toLowerCase().includes(q) ||
        String(b.status).toLowerCase().includes(q) ||
        String(b.date).toLowerCase().includes(q)
      )
    })
  }, [filteredBookings, tableSearch])

  // Paginated records for the modal table
  const totalPages = Math.max(
    1,
    Math.ceil(displayedTableBookings.length / ITEMS_PER_PAGE)
  )

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return displayedTableBookings.slice(start, start + ITEMS_PER_PAGE)
  }, [displayedTableBookings, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [tableSearch, timeFilter, moduleFilter])

  // =====================================================
  // KPIs (Summary Cards Calculation)
  // =====================================================

  const kpis = useMemo(() => {
    let liveCancelled = 0
    let liveCheckedIn = 0
    let liveReleased = 0
    let liveExpired = 0
    let livePendingConfirmed = 0

    // Count live statuses from the current filtered bookings
    filteredBookings.forEach((b) => {
      const st = String(b.status || '').toUpperCase()

      if (st.includes('CANCEL') || st === 'REJECTED') {
        liveCancelled++
      } else if (st.includes('CHECK') || st === 'CHECKED IN' || st === 'CHECKED-IN') {
        liveCheckedIn++
      } else if (st.includes('EXPIR')) {
        liveExpired++
        liveReleased++
      } else if (st.includes('RELEASE')) {
        liveReleased++
        liveExpired++
      } else {
        livePendingConfirmed++
      }
    })

    // Confirmed bookings = Check-in + Expired/Released + Active Confirmed (or Total - Cancelled)
    const liveConfirmed =
      filteredBookings.length >= liveCancelled
        ? filteredBookings.length - liveCancelled
        : liveCheckedIn + liveExpired + livePendingConfirmed

    const raw = dashboardData || analyticsData
    const isAllFilters = timeFilter === 'All' && moduleFilter === 'All'

    // Dynamic capacity by module
    let uniqueSeats = 453
    const modLower = moduleFilter.toLowerCase()
    if (modLower.includes('tidel')) {
      uniqueSeats = 224
    } else if (modLower.includes('module 2') || modLower.includes('eo2')) {
      uniqueSeats = 131
    } else if (modLower.includes('module 1') || modLower.includes('elcot')) {
      uniqueSeats = 98
    }

    // 1. All Time & All Modules: Use global backend dashboardData totals
    if (isAllFilters && raw && (raw.totalReservations !== undefined || raw.totalBookings !== undefined)) {
      const total =
        raw.totalReservations ??
        raw.totalBookings ??
        raw.totalBookingsAnalyzed ??
        filteredBookings.length

      const cancelled =
        raw.cancelledBookings ?? raw.cancelled ?? liveCancelled

      const cancellationRate =
        total > 0 ? Number(((cancelled / total) * 100).toFixed(1)) : 0

      const trendlineCheckIns = Array.isArray(raw.dailyOccupancyTrendline)
        ? raw.dailyOccupancyTrendline.reduce(
            (acc, curr) => acc + Number(curr.checkInsCount ?? curr.checkIns ?? 0),
            0
          )
        : 0

      const checkedIn =
        raw.checkedInBookings ??
        raw.checkedIn ??
        raw.totalCheckIns ??
        raw.checkInsCount ??
        (trendlineCheckIns > 0 ? trendlineCheckIns : liveCheckedIn)

      const checkedInRate =
        total > 0 ? Number(((checkedIn / total) * 100).toFixed(1)) : 0

      const expired =
        raw.expiredBookings ??
        raw.expired ??
        raw.totalExpired ??
        liveExpired

      const expiredRate =
        total > 0 ? Number(((expired / total) * 100).toFixed(1)) : 0

      // Released count reflects the automatically released workstations
      const released = raw.releasedBookings ?? raw.released ?? expired
      const releasedRate = total > 0 ? Number(((released / total) * 100).toFixed(1)) : expiredRate

      // Confirmed bookings = Checked In + Expired (+ any active pending) or Total - Cancelled
      const confirmed =
        total >= cancelled
          ? total - cancelled
          : (checkedIn + expired)

      const confirmedRate =
        total > 0 ? Number(((confirmed / total) * 100).toFixed(1)) : 0

      return {
        total,
        confirmed,
        confirmedRate,
        cancelled,
        cancellationRate,
        checkedIn,
        checkedInRate,
        released,
        releasedRate,
        expired,
        expiredRate,
        uniqueSeats: 453,
      }
    }

    // 2. Filtered Timeframes & Modules: Calculated from filteredBookings
    const total = filteredBookings.length
    const confirmed = total >= liveCancelled ? total - liveCancelled : liveConfirmed
    const confirmedRate = total > 0 ? Number(((confirmed / total) * 100).toFixed(1)) : 0
    const cancellationRate = total > 0 ? Number(((liveCancelled / total) * 100).toFixed(1)) : 0
    const checkedInRate = total > 0 ? Number(((liveCheckedIn / total) * 100).toFixed(1)) : 0
    const expiredRate = total > 0 ? Number(((liveExpired / total) * 100).toFixed(1)) : 0

    // Released count reflects the automatically released workstations
    const released = liveExpired
    const releasedRate = expiredRate

    return {
      total,
      confirmed,
      confirmedRate,
      cancelled: liveCancelled,
      cancellationRate,
      checkedIn: liveCheckedIn,
      checkedInRate,
      released,
      releasedRate,
      expired: liveExpired,
      expiredRate,
      uniqueSeats,
    }
  }, [dashboardData, analyticsData, filteredBookings, timeFilter, moduleFilter])

  // =====================================================
  // HOTSEAT VISUAL CHARTS DATA
  // =====================================================

  // 1. Module / Zone Workstation Distribution (Donut)
  const moduleDistributionData = useMemo(() => {
    const tidelItem = { name: 'Module 1 - Tidel Park', value: 0, color: '#0284C7' }
    const elcot1Item = { name: 'Module 1 - Elcot Park', value: 0, color: '#0D9488' }
    const elcot2Item = { name: 'Module 2 - Elcot Park', value: 0, color: '#6366F1' }

    filteredBookings.forEach((b) => {
      const mod = String(b.module || '').toLowerCase()
      const zone = String(b.zone || '').toLowerCase()
      const seat = String(b.seat || '').toLowerCase()
      if (mod.includes('tidel') || zone.includes('tidel') || seat.startsWith('ws-04')) {
        tidelItem.value += 1
      } else if (mod.includes('module 2') || mod.includes('eo2') || seat.includes('eo2')) {
        elcot2Item.value += 1
      } else {
        elcot1Item.value += 1
      }
    })

    return [tidelItem, elcot1Item, elcot2Item].filter((item) => item.value > 0)
  }, [filteredBookings])

  // 2. Floor Section Demand Breakdown
  const sectionDemandData = useMemo(() => {
    const map = {
      'Section A': 0,
      'Section B': 0,
      'Section C': 0,
      'Section D': 0,
    }

    filteredBookings.forEach((b) => {
      const sec = resolveSection(b.seat, b.module)
      if (map[sec] !== undefined) {
        map[sec] += 1
      } else {
        map['Section A'] += 1
      }
    })

    const isTidel =
      moduleFilter.toLowerCase().includes('tidel') ||
      (moduleFilter === 'All' &&
        filteredBookings.some((b) =>
          String(b.module || '').toLowerCase().includes('tidel')
        ))

    const sections = [
      {
        section: 'Section A',
        bookings: map['Section A'],
        color: SECTION_COLORS['Section A'],
      },
      {
        section: 'Section B',
        bookings: map['Section B'],
        color: SECTION_COLORS['Section B'],
      },
      {
        section: 'Section C',
        bookings: map['Section C'],
        color: SECTION_COLORS['Section C'],
      },
    ]

    // Only Tidel Park has Section D (Seats 165 - 224)
    if (isTidel) {
      sections.push({
        section: 'Section D',
        bookings: map['Section D'],
        color: SECTION_COLORS['Section D'],
      })
    }

    return sections
  }, [filteredBookings, moduleFilter])

  // 3. Most In-Demand Workstation Desks (Limit to Top 3 Only)
  const topDesksData = useMemo(() => {
    const rawList =
      analyticsData?.topInDemandDesks ||
      dashboardData?.topInDemandDesks ||
      analyticsData?.topDesks ||
      []

    if (rawList.length > 0) {
      return rawList.slice(0, 3).map((d) => ({
        name: d.deskNumber || d.seatNumber || d.name || `Seat #${d.seatId}`,
        bookings: Number(d.reservationCount ?? d.bookings ?? d.count ?? 0),
        module: d.moduleName || d.module || d.officeName || 'Hotseat',
      }))
    }

    const map = {}
    filteredBookings.forEach((b) => {
      const seat = b.seat
      if (!seat || seat === '-') return
      if (!map[seat]) {
        map[seat] = {
          name: seat,
          bookings: 0,
          module: b.module || 'Hotseat',
        }
      }
      map[seat].bookings += 1
    })

    return Object.values(map)
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 3)
  }, [analyticsData, dashboardData, filteredBookings])

  // 4. Peak Hotseat Check-In Time Slots
  const timeSlotDistributionData = useMemo(() => {
    const rawList =
      analyticsData?.peakCheckInSlots ||
      dashboardData?.peakCheckInSlots ||
      analyticsData?.timeSlotDistribution ||
      []

    if (rawList.length > 0) {
      return rawList.map((s) => ({
        slot: s.timeSlot || `${s.startTime} - ${s.endTime}`,
        bookings: Number(s.checkInSlotsCount ?? s.bookings ?? s.count ?? 0),
      }))
    }

    const slotMap = new Map()

    filteredBookings.forEach((b) => {
      const raw = String(b.expectedCheckIn || '').trim()
      if (!raw || raw === '-') return
      let cleanSlot = raw
      if (raw.length > 13) cleanSlot = raw.slice(0, 13)
      slotMap.set(cleanSlot, (slotMap.get(cleanSlot) || 0) + 1)
    })

    return Array.from(slotMap.entries())
      .map(([slot, bookings]) => ({ slot, bookings }))
      .sort((a, b) => a.slot.localeCompare(b.slot))
      .slice(0, 7)
  }, [analyticsData, dashboardData, filteredBookings])

  // 5. Volume Trendline (Daily Progress Area Chart Computed from Live Bookings)
  const trendlineData = useMemo(() => {
    const moduleScoped =
      moduleFilter === 'All'
        ? bookings
        : bookings.filter((b) => {
            const modName = String(b.module || '').toLowerCase()
            const target = moduleFilter.toLowerCase()
            return modName.includes(target) || target.includes(modName)
          })

    const map = {}
    moduleScoped.forEach((b) => {
      const d = toStandardIsoDate(b.isoDate || b.date || b.bookingDate)
      if (!d || d === '-') return
      if (!map[d]) {
        map[d] = { name: d, bookings: 0, checkIns: 0 }
      }
      map[d].bookings += 1

      const st = String(b.status || '').toUpperCase()
      if (
        st.includes('CHECK') ||
        b.checkInTime ||
        b.actualCheckInTime ||
        b.isCheckedIn
      ) {
        map[d].checkIns += 1
      }
    })

    const list = Object.values(map).sort((a, b) => a.name.localeCompare(b.name))
    return list.slice(-14)
  }, [bookings, moduleFilter])

  // 6. Visual Status Outcomes Breakdown
  const visualStatusData = useMemo(() => {
    return [
      { name: 'Approved', value: kpis.confirmed, color: '#658362' },
      { name: 'Checked In', value: kpis.checkedIn, color: '#0284C7' },
      { name: 'Cancelled', value: kpis.cancelled, color: '#B85450' },
      { name: 'Released', value: kpis.released, color: '#7c3aed' },
      { name: 'Expired', value: kpis.expired, color: '#EA580C' },
    ].filter((d) => d.value > 0)
  }, [kpis])

  // 7. Hourly Demand Distribution (10:00 to 22:00)
  const hourlyDistributionData = useMemo(() => {
    const hours = [
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
      '17:00',
      '18:00',
      '19:00',
      '20:00',
      '21:00',
      '22:00',
    ]
    const map = Object.fromEntries(hours.map((h) => [h, 0]))

    filteredBookings.forEach((b) => {
      const t = String(b.expectedCheckIn || b.time || '')
      const matchedHour = hours.find((h) => t.includes(h.substring(0, 2)))
      if (matchedHour) {
        map[matchedHour] += 1
      }
    })

    return hours.map((time) => ({ time, bookings: map[time] }))
  }, [filteredBookings])

  // =====================================================
  // Export Handlers
  // =====================================================

  const handleExportCSV = async () => {
    try {
      setExporting(true)
      const filterDto = {
        timeframe: timeFilter,
        module: moduleFilter === 'All' ? null : moduleFilter,
        status: statusFilter === 'All' ? null : statusFilter,
      }

      const blobData = await exportHotseatCsv(filterDto)
      const blob = new Blob([blobData], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `SpaceBook-Hotseat-Analytics-${new Date().toISOString().split('T')[0]}.csv`
      )
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.warn('Backend CSV export fallback to client data:', err)
      const csvData = filteredBookings.map((b) => ({
        'Booking ID': b.bookingId,
        'Employee Name': b.employee,
        'Seat Number': b.seat,
        Module: b.module,
        Section: b.section,
        Date: b.date,
        'Check-In Time': b.expectedCheckIn,
        Status: b.status,
        'Cancellation Reason': b.cancelReason || 'N/A',
      }))

      downloadCSV(
        csvData,
        `SpaceBook-Hotseat-Analytics-${new Date().toISOString().split('T')[0]}.csv`
      )
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* =================================================
          PAGE HEADER
      ================================================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Hotseat Management
          </h1>
          <p className="text-sm text-slate">
            Executive visual insights on hotseat reservations,usage level rates,and audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg shadow-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              size={13}
              className={loading ? 'animate-spin text-sky-600' : 'text-slate-500'}
            />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Button
            size="sm"
            onClick={handleExportCSV}
            disabled={exporting || filteredBookings.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-xs font-bold text-white shadow-md shadow-blue-700/20 whitespace-nowrap transition-all active:scale-95 border-0"
          >
            {exporting ? (
              <Loader2 size={14} className="animate-spin text-white" />
            ) : (
              <FileText size={14} className="text-blue-100" />
            )}
            <span className="text-white">
              {exporting ? 'Exporting...' : 'Export CSV'}
            </span>
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
              {filterOptions.modules.length > 0 ? (
                filterOptions.modules.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))
              ) : (
                <>
                  <option value="Module 1 - Tidel Park">
                    Module 1 - Tidel Park
                  </option>
                  <option value="Module 1 - Elcot Park">
                    Module 1 - Elcot Park
                  </option>
                  <option value="Module 2 - Elcot Park">
                    Module 2 - Elcot Park
                  </option>
                </>
              )}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Analyzing {filteredBookings.length} total bookings
          </div>
        </div>
      </Card>

      {/* =================================================
          TOP 5 KPI CARDS
      ================================================= */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {/* Card 1: TOTAL RESERVATIONS */}
        <Card className="p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              TOTAL RESERVATIONS
            </span>
            <Calendar size={14} className="text-sky-600" />
          </div>
          <p className="mt-1 text-2xl font-extrabold text-ink leading-tight">
            {kpis.total}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate">
            <span>{kpis.uniqueSeats} Total</span>
            <span className="font-semibold text-sky-700">100% Vol</span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div className="h-1 rounded-full bg-sky-600 w-full" />
          </div>
        </Card>

        {/* Card 2: CONFIRMED BOOKINGS */}
        <Card className="p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              CONFIRMED BOOKINGS
            </span>
            <CheckCircle2 size={14} className="text-[#5c7a60]" />
          </div>
          <p className="mt-1 text-2xl font-extrabold text-[#5c7a60] leading-tight">
            {kpis.confirmed}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate">
            <span>Successful</span>
            <span className="font-bold text-emerald-700">
              {kpis.confirmedRate}%
            </span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div
              className="h-1 rounded-full bg-[#5c7a60] transition-all duration-500"
              style={{ width: `${kpis.confirmedRate}%` }}
            />
          </div>
        </Card>

        {/* Card 3: CHECKED IN */}
        <Card className="p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              CHECKED IN
            </span>
            <UserCheck size={14} className="text-[#0284c7]" />
          </div>
          <p className="mt-1 text-2xl font-extrabold text-[#0284c7] leading-tight">
            {kpis.checkedIn}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate">
            <span>Occupied</span>
            <span className="font-bold text-sky-700">
              {kpis.checkedInRate}%
            </span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div
              className="h-1 rounded-full bg-[#0284c7] transition-all duration-500"
              style={{ width: `${kpis.checkedInRate}%` }}
            />
          </div>
        </Card>

        {/* Card 4: EXPIRED */}
        <Card className="p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              EXPIRED
            </span>
            <AlertCircle size={14} className="text-[#EA580C]" />
          </div>
          <p className="mt-1 text-2xl font-extrabold text-[#EA580C] leading-tight">
            {kpis.expired}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate">
            <span>Expired</span>
            <span className="font-bold text-orange-700">
              {kpis.expiredRate}%
            </span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div
              className="h-1 rounded-full bg-[#EA580C] transition-all duration-500"
              style={{ width: `${kpis.expiredRate}%` }}
            />
          </div>
        </Card>

        {/* Card 5: CANCELLED BOOKINGS */}
        <Card className="p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              CANCELLED BOOKINGS
            </span>
            <XCircle size={14} className="text-[#be534d]" />
          </div>
          <p className="mt-1 text-2xl font-extrabold text-[#be534d] leading-tight">
            {kpis.cancelled}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate">
            <span>Cancelled</span>
            <span className="font-bold text-red-700">
              {kpis.cancellationRate}%
            </span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div
              className="h-1 rounded-full bg-[#be534d] transition-all duration-500"
              style={{ width: `${kpis.cancellationRate}%` }}
            />
          </div>
        </Card>
      </div>

      {/* =================================================
          PREVIEW CARD WITH [ 👁 VIEW ] BUTTON
      ================================================= */}
      <Card className="p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-ink">
              Hotseat Reservation Records & Audit
            </h2>
            <p className="text-xs text-slate mt-0.5">
              Showing {filteredBookings.length} of {kpis.total} hotseat reservations matching active filters.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAuditModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-xs rounded-xl shadow-sm transition-all active:scale-95 border-0"
          >
            <Eye size={12} />
            <span>View</span>
          </button>
        </div>
      </Card>

      {/* =====================================================
          INTERACTIVE TABBED ANALYTICS GRAPH CONTAINER
      ===================================================== */}
      <Card className="p-5 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-line pb-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-bold text-ink truncate">
                {activeChart === 'trend' && 'Daily Hotseat Volume Trendline'}
                {activeChart === 'outcome' && 'Hotseat Outcomes & Status Breakdown'}
                {activeChart === 'facility' && 'Hotseat Volume by Facility & Zone'}
                {activeChart === 'section' && 'Floor Section Demand Breakdown'}
                {activeChart === 'topDesks' && 'Most In-Demand Workstations'}
                {activeChart === 'hourly' && 'Peak Workspace Demand by Hour'}
              </h2>
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 shrink-0">
                Visual Analytics
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate truncate">
              {activeChart === 'trend' &&
                'Daily progression of total hotseat reservations vs actual check-ins.'}
              {activeChart === 'outcome' &&
                'Proportional outcome breakdown of all reservations.'}
              {activeChart === 'facility' &&
                'Workstation reservation share across Tidel Park and Elcot Park Modules.'}
              {activeChart === 'section' &&
                'Concentration of desk bookings across zoned quadrants (Sections A, B, C, D).'}
              {activeChart === 'topDesks' &&
                'Top individual hotseats with highest booking count.'}
              {activeChart === 'hourly' &&
                'Distribution of reservations across operational office hours.'}
            </p>
          </div>

          {/* TAB BUTTONS / HYPERLINKS */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100/80 p-1 overflow-x-auto whitespace-nowrap shrink-0 max-w-full">
            <button
              type="button"
              onClick={() => setActiveChart('trend')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeChart === 'trend'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <TrendingUp
                size={13}
                className={
                  activeChart === 'trend' ? 'text-sky-600' : 'text-slate-400'
                }
              />
              <span>Volume Trend</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChart('outcome')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeChart === 'outcome'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Sparkles
                size={13}
                className={
                  activeChart === 'outcome' ? 'text-sky-600' : 'text-slate-400'
                }
              />
              <span>Outcomes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChart('facility')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeChart === 'facility'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <MapPin
                size={13}
                className={
                  activeChart === 'facility' ? 'text-sky-600' : 'text-slate-400'
                }
              />
              <span>Facility Share</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChart('section')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeChart === 'section'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Layers
                size={13}
                className={
                  activeChart === 'section' ? 'text-sky-600' : 'text-slate-400'
                }
              />
              <span>Section Demand</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChart('topDesks')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeChart === 'topDesks'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Armchair
                size={13}
                className={
                  activeChart === 'topDesks' ? 'text-sky-600' : 'text-slate-400'
                }
              />
              <span>Workspace Ranking</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChart('hourly')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeChart === 'hourly'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Clock
                size={13}
                className={
                  activeChart === 'hourly' ? 'text-indigo-600' : 'text-slate-400'
                }
              />
              <span>Hourly Demand</span>
            </button>
          </div>
        </div>

        {/* ACTIVE GRAPH DISPLAY */}
        <div className="h-[360px] sm:h-[390px] w-full pt-4">
          {/* Chart 1: Volume Trend */}
          {activeChart === 'trend' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendlineData}
                margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="hotseatAreaGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#0284C7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284C7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#475569', fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend verticalAlign="top" height={36} />
                <Area
                  type="monotone"
                  dataKey="bookings"
                  name="Total Bookings"
                  stroke="#0284C7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#hotseatAreaGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="checkIns"
                  name="Check-ins"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={0.2}
                  fill="#10B981"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {/* Chart 2: Outcomes */}
          {activeChart === 'outcome' && (
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
          )}

          {/* Chart 3: Facility Share */}
          {activeChart === 'facility' && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={moduleDistributionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={115}
                  paddingAngle={4}
                >
                  {moduleDistributionData.map((entry, index) => (
                    <Cell key={`mod-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomChartTooltip />} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          )}

          {/* Chart 4: Section Demand */}
          {activeChart === 'section' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sectionDemandData}
                margin={{ top: 20, right: 20, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="section"
                  tick={{ fill: '#475569', fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar
                  dataKey="bookings"
                  name="Reserved Desks"
                  radius={[6, 6, 0, 0]}
                >
                  {sectionDemandData.map((entry, index) => (
                    <Cell key={`sec-cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Chart 5: Workspace Ranking */}
          {activeChart === 'topDesks' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topDesksData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  tick={{ fill: '#475569', fontSize: 11 }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#0f172a', fontSize: 11, fontWeight: 600 }}
                  width={130}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar
                  dataKey="bookings"
                  name="Reservations"
                  fill="#0284C7"
                  radius={[0, 6, 6, 0]}
                >
                  {topDesksData.map((entry, index) => (
                    <Cell
                      key={`desk-cell-${index}`}
                      fill={
                        ['#0284C7', '#0D9488', '#6366F1', '#8B5CF6', '#EC4899'][
                          index % 5
                        ]
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Chart 6: Hourly Demand */}
          {activeChart === 'hourly' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={hourlyDistributionData}
                margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#475569', fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar
                  dataKey="bookings"
                  name="Hotseat Bookings"
                  fill="#6366F1"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* =====================================================
          AUDIT TABLE MODAL (Pure Hotseat Records)
      ===================================================== */}
      {isAuditModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-5xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-4 sm:p-5 relative flex flex-col max-h-[86vh] border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                  Hotseat Reservation Records & Audit
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
                    placeholder="Search hotseats, employees..."
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
                        <th className="w-[18%] px-2 py-1.5 truncate">EMPLOYEE NAME</th>
                        <th className="w-[13%] px-2 py-1.5 truncate">SEAT</th>
                        <th className="w-[15%] px-2 py-1.5 truncate">MODULE</th>
                        <th className="w-[16%] px-2 py-1.5 truncate">SECTION</th>
                        <th className="w-[10%] px-2 py-1.5 whitespace-nowrap">DATE</th>
                        <th className="w-[9%] px-2 py-1.5 whitespace-nowrap">CHECK-IN</th>
                        <th className="w-[11%] px-2 py-1.5 text-center whitespace-nowrap">STATUS</th>
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
                            No hotseat records match the active filter criteria.
                          </td>
                        </tr>
                      ) : (
                        paginatedBookings.map((booking) => (
                          <tr
                            key={booking.bookingId}
                            onClick={() => openDetailModal(booking)}
                            className="cursor-pointer transition-colors duration-150 hover:bg-slate-50/80 leading-tight"
                          >
                            <td className="px-2 py-1.5 font-bold text-slate-900 truncate">
                              {booking.bookingId}
                            </td>
                            <td className="px-2 py-1.5 font-medium text-slate-800 truncate" title={booking.employee}>
                              {booking.employee}
                            </td>
                            <td className="px-2 py-1.5 font-bold text-slate-900 truncate" title={booking.seat}>
                              {booking.seat}
                            </td>
                            <td className="px-2 py-1.5 text-slate-600 truncate" title={booking.module}>
                              {booking.module}
                            </td>
                            <td className="px-2 py-1.5 text-slate-600 truncate" title={booking.section}>
                              {booking.section}
                            </td>
                            <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap">
                              {booking.date}
                            </td>
                            <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap">
                              {booking.expectedCheckIn || '10:00'}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <HotseatStatusTag status={booking.status} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mt-2.5 flex flex-col gap-1.5 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-500">
                    Showing {displayedTableBookings.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}–{Math.min(currentPage * ITEMS_PER_PAGE, displayedTableBookings.length)} of {displayedTableBookings.length} bookings
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

                <div className="flex items-center justify-between pt-0.5">
                  <p className="text-[10px] text-slate-400">
                    Total {bookings.length} bookings found
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAuditModalOpen(false)}
                    className="rounded-md border border-slate-200 bg-white px-3.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
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
          RESERVATION DETAIL MODAL
      ===================================================== */}
      {isDetailModalOpen && selectedBooking && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={closeDetailModal}
          title={`Hotseat Reservation #${selectedBooking.bookingId}`}
          className="max-w-md"
        >
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3.5">
              <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                Reserved By
              </p>
              <p className="font-semibold text-ink text-base mt-0.5">
                {selectedBooking.employee}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Seat Number
                </p>
                <p className="font-bold text-sky-700 mt-0.5">
                  {selectedBooking.seat}
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
                  Section
                </p>
                <p className="font-medium text-ink mt-0.5">
                  {selectedBooking.section}
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
                  Expected Arrival
                </p>
                <p className="font-medium text-ink mt-0.5">
                  {selectedBooking.expectedCheckIn}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Status
                </p>
                <div className="mt-1">
                  <HotseatStatusTag status={selectedBooking.status} />
                </div>
              </div>
            </div>

            {selectedBooking.cancelReason && (
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-3">
                <p className="text-xs font-semibold text-red-800">
                  Cancellation Reason:
                </p>
                <p className="mt-0.5 text-xs text-red-700">
                  {selectedBooking.cancelReason}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={closeDetailModal}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
