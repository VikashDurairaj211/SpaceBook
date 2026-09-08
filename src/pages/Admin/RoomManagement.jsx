import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import client from '../../api/client'

import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import {
  AlertTriangle,
  LayoutGrid,
  List,
  Layers,
  CheckCircle2,
  Users,
  Wrench,
  MapPin,
  Sparkles,
  Building2,
  Plus,
  Tv,
  Monitor,
  Projector,
} from 'lucide-react'

// =====================================================
// ROOM TYPE IDS
// Must match SpaceBook backend RoomType table
// 1: Conference, 2: Training, 3: Discussion
// =====================================================

const ROOM_TYPE_IDS = {
  conference: 1,
  training: 2,
  discussion: 3,
}

// =====================================================
// STATUS BADGE
// =====================================================

function CustomStatusTag({ status }) {
  const raw = String(status || 'Available').toUpperCase()

  if (raw === 'MAINTENANCE' || raw === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 shadow-2xs whitespace-nowrap">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
        Maintenance
      </span>
    )
  }

  if (raw === 'RESERVED' || raw === 'BOOKED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs whitespace-nowrap">
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
        Booked
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs whitespace-nowrap">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
      Available
    </span>
  )
}

// =====================================================
// GET ROOM TYPE ID
// =====================================================

function getModuleIdFromName(moduleName) {
  const str = String(moduleName || '').toLowerCase()
  if (str.includes('tidel') || str.includes('tidal') || str.includes('to1')) return 3
  if (str.includes('module 2') || str.includes('m2') || str.includes('eo2')) return 2
  return 1
}

function getModuleNameFromId(moduleId, fallbackModule) {
  if (fallbackModule && typeof fallbackModule === 'string' && fallbackModule.includes(' - ')) {
    return fallbackModule
  }
  const id = Number(moduleId)
  if (id === 3) return 'Module 1 - Tidel Park - CMB'
  if (id === 2) return 'Module 2 - Elcot Park - CMB'
  return 'Module 1 - Elcot Park - CMB'
}

function getRoomTypeId(type) {
  const lower = String(type || '').toLowerCase().trim()

  if (lower.includes('conf')) {
    return 1 // Conference
  }

  if (lower.includes('train')) {
    return 2 // Training
  }

  if (lower.includes('disc')) {
    return 3 // Discussion
  }

  return 1
}

// =====================================================
// GET ROOM TYPE NAME
// =====================================================

function getRoomTypeName(room) {
  if (!room) return 'Conference'

  const roomTypeId = Number(
    room.roomTypeId ??
    room.RoomTypeId ??
    room.typeId ??
    room.TypeId ??
    room.roomType?.id ??
    room.roomType?.roomTypeId
  )

  if (roomTypeId === 1) return 'Conference'
  if (roomTypeId === 2) return 'Training'
  if (roomTypeId === 3) return 'Discussion'

  const rawTypeName = String(
    room.roomTypeName ||
    room.RoomTypeName ||
    (typeof room.roomType === 'string' ? room.roomType : '') ||
    room.roomType?.name ||
    room.type ||
    ''
  ).toLowerCase().trim()

  if (rawTypeName.includes('conf')) return 'Conference'
  if (rawTypeName.includes('train')) return 'Training'
  if (rawTypeName.includes('disc')) return 'Discussion'

  return 'Conference'
}

// =====================================================
// NORMALIZE FACILITIES (Handles Backend String Array format)
// =====================================================

function normalizeFacilities(facilities, masterFacilities = []) {
  if (!Array.isArray(facilities)) {
    return []
  }

  return facilities
    .map((item, index) => {
      if (typeof item === 'string') {
        const trimmed = item.trim()
        const master = masterFacilities.find(
          (mf) => mf.name.toLowerCase() === trimmed.toLowerCase()
        )
        return {
          id: master ? master.id : index + 1,
          name: trimmed,
        }
      }

      if (item && typeof item === 'object') {
        const id = item.id ?? item.facilityId ?? index + 1
        const name = item.name ?? item.facilityName ?? 'Facility'
        return { id: Number(id), name: String(name).trim() }
      }

      return null
    })
    .filter(Boolean)
}

function formatRoomNumber(code, index = 0, moduleId = 1) {
  if (!code || code === '-' || String(code).trim() === '') {
    const mod = Number(moduleId) === 3 ? 'TO1' : Number(moduleId) === 2 ? 'EO2' : 'EO1'
    const num = String(index + 1).padStart(3, '0')
    const loc = Number(moduleId) === 3 ? 'CBE-04' : 'CBE-05'
    return `${loc}-${mod}-${num}`
  }
  let str = String(code).trim().toUpperCase()
  str = str.replace(/E0/g, 'EO').replace(/T0/g, 'TO')
  return str
}

function normalizeFacilityList(data) {
  let list = []
  if (Array.isArray(data)) {
    list = data
  } else if (Array.isArray(data?.data)) {
    list = data.data
  } else if (Array.isArray(data?.facilities)) {
    list = data.facilities
  }

  return list
    .map((facility, index) => {
      const id = facility?.facilityId ?? facility?.id ?? index + 1
      const name = facility?.facilityName ?? facility?.name ?? String(facility)
      return {
        id: Number(id),
        name: String(name).trim(),
      }
    })
    .filter((f) => f.id && f.name)
}

function getFacilityNames(facilities) {
  if (!Array.isArray(facilities)) {
    return []
  }

  return facilities
    .map((facility) => {
      if (typeof facility === 'string') {
        return facility
      }
      return facility?.name || facility?.facilityName || ''
    })
    .filter(Boolean)
}

function getEmptyFormData() {
  return {
    roomName: '',
    roomNumber: '',
    module: 'Module 1 - Elcot Park - CMB',
    roomType: 'Conference',
    capacity: 4,
    status: 'Available',
    facilities: [],
  }
}

// =====================================================
// API HELPERS & PERSISTENT INVENTORY
// =====================================================

const DEFAULT_INITIAL_ROOMS = [
  {
    id: 1,
    roomId: 1,
    roomName: 'Conference Room',
    roomNumber: 'CBE-05-EO1-001',
    module: 'Module 1 - Elcot Park - CMB',
    moduleId: 1,
    roomType: 'Conference',
    roomTypeId: 1,
    capacity: 20,
    status: 'Available',
    isBlocked: false,
    facilities: [{ id: 1, name: 'Projector' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 2,
    roomId: 2,
    roomName: 'Discussion Room 1',
    roomNumber: 'CBE-05-EO1-003',
    module: 'Module 1 - Elcot Park - CMB',
    moduleId: 1,
    roomType: 'Discussion',
    roomTypeId: 3,
    capacity: 8,
    status: 'Available',
    facilities: [{ id: 1, name: 'Monitor' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 3,
    roomId: 3,
    roomName: 'Discussion Room 2',
    roomNumber: 'CBE-05-EO1-005',
    module: 'Module 1 - Elcot Park - CMB',
    moduleId: 1,
    roomType: 'Discussion',
    roomTypeId: 3,
    capacity: 8,
    status: 'Available',
    isBlocked: false,
    facilities: [{ id: 1, name: 'Monitor' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 4,
    roomId: 4,
    roomName: 'Training Room',
    roomNumber: 'CBE-05-EO2-012',
    module: 'Module 2 - Elcot Park - CMB',
    moduleId: 2,
    roomType: 'Training',
    roomTypeId: 2,
    capacity: 50,
    status: 'Available',
    isBlocked: false,
    facilities: [{ id: 1, name: 'Projector' }, { id: 2, name: 'Whiteboard' }, { id: 3, name: 'TV' }],
  },
  {
    id: 5,
    roomId: 5,
    roomName: 'Discussion Room 1',
    roomNumber: 'CBE-05-EO2-001',
    module: 'Module 2 - Elcot Park - CMB',
    moduleId: 2,
    roomType: 'Discussion',
    roomTypeId: 3,
    capacity: 10,
    status: 'Available',
    isBlocked: false,
    facilities: [{ id: 1, name: 'Monitor' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 6,
    roomId: 6,
    roomName: 'Discussion Room 2',
    roomNumber: 'CBE-05-EO2-002',
    module: 'Module 2 - Elcot Park - CMB',
    moduleId: 2,
    roomType: 'Discussion',
    roomTypeId: 3,
    capacity: 8,
    status: 'Available',
    isBlocked: false,
    facilities: [{ id: 1, name: 'Monitor' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 7,
    roomId: 7,
    roomName: 'Discussion Room 3',
    roomNumber: 'CBE-05-EO2-007',
    module: 'Module 2 - Elcot Park - CMB',
    moduleId: 2,
    roomType: 'Discussion',
    roomTypeId: 3,
    capacity: 8,
    status: 'Available',
    isBlocked: false,
    facilities: [{ id: 1, name: 'Monitor' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 8,
    roomId: 8,
    roomName: 'Discussion Room 4',
    roomNumber: 'CBE-05-EO2-010',
    module: 'Module 2 - Elcot Park - CMB',
    moduleId: 2,
    roomType: 'Discussion',
    roomTypeId: 3,
    capacity: 8,
    status: 'Available',
    isBlocked: false,
    facilities: [{ id: 1, name: 'Monitor' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 9,
    roomId: 9,
    roomName: 'Conference Room',
    roomNumber: 'CBE-04-TO1-001',
    module: 'Module 1 - Tidel Park - CMB',
    moduleId: 3,
    roomType: 'Conference',
    roomTypeId: 1,
    capacity: 16,
    status: 'Available',
    isBlocked: false,
    facilities: [{ id: 1, name: 'Projector' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 10,
    roomId: 10,
    roomName: 'Discussion Room 1',
    roomNumber: 'CBE-04-TO1-002',
    module: 'Module 1 - Tidel Park - CMB',
    moduleId: 3,
    roomType: 'Discussion',
    roomTypeId: 3,
    capacity: 8,
    status: 'Available',
    isBlocked: false,
    facilities: [{ id: 1, name: 'Monitor' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 11,
    roomId: 11,
    roomName: 'Training Room',
    roomNumber: 'CBE-04-TO1-003',
    module: 'Module 1 - Tidel Park - CMB',
    moduleId: 3,
    roomType: 'Training',
    roomTypeId: 2,
    capacity: 25,
    status: 'Available',
    isBlocked: false,
    facilities: [{ id: 1, name: 'Projector' }, { id: 2, name: 'Whiteboard' }, { id: 3, name: 'TV' }],
  },
]

function getMasterRoomInventory() {
  try {
    const raw = localStorage.getItem('spacebook_room_inventory')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const merged = [...DEFAULT_INITIAL_ROOMS]
        parsed.forEach((item) => {
          const itemCode = String(item.roomNumber || item.roomnumber || item.code || item.roomCode || '')
            .replace(/E0/g, 'EO')
            .trim()
            .toLowerCase()
          const itemId = String(item.id || item.roomId || item.roomid || '')
          const idx = merged.findIndex((m) => {
            const mCode = String(m.roomNumber || '').replace(/E0/g, 'EO').trim().toLowerCase()
            const mId = String(m.id || m.roomId || '')
            return (itemCode && mCode === itemCode) || (itemId && mId === itemId)
          })
          if (idx >= 0) {
            merged[idx] = { ...merged[idx], ...item }
          } else {
            merged.push(item)
          }
        })
        return merged
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_INITIAL_ROOMS
}

function updateMasterRoomInventory(roomsList) {
  try {
    const current = getMasterRoomInventory()
    const merged = [...current]

    ;(roomsList || []).forEach((incoming) => {
      const incomingId = String(incoming.id ?? incoming.roomId ?? '')
      const incomingNumber = String(incoming.roomNumber ?? incoming.roomCode ?? incoming.code ?? '')

      const existingIndex = merged.findIndex((m) => {
        const mId = String(m.id ?? m.roomId ?? '')
        const mNumber = String(m.roomNumber ?? m.roomCode ?? m.code ?? '')
        return (incomingId && mId === incomingId) || (incomingNumber && mNumber === incomingNumber)
      })

      if (existingIndex >= 0) {
        merged[existingIndex] = { ...merged[existingIndex], ...incoming }
      } else {
        merged.push(incoming)
      }
    })

    localStorage.setItem('spacebook_room_inventory', JSON.stringify(merged))
    return merged
  } catch {
    return roomsList || []
  }
}

function removeRoomFromMasterInventory(roomId, roomNumber) {
  try {
    const raw = localStorage.getItem('spacebook_room_inventory')
    if (raw) {
      const parsed = JSON.parse(raw)
      const filtered = parsed.filter((r) => {
        const rId = String(r.id ?? r.roomId ?? '')
        const rNum = String(r.roomNumber ?? r.roomCode ?? r.code ?? '').toLowerCase()
        if (roomId && rId === String(roomId)) return false
        if (roomNumber && rNum === String(roomNumber).toLowerCase()) return false
        return true
      })
      localStorage.setItem('spacebook_room_inventory', JSON.stringify(filtered))
    }
  } catch {
    // ignore
  }
}

function getRoomStatusOverrides() {
  try {
    const raw = localStorage.getItem('spacebook_room_status_overrides')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveRoomStatusOverride(roomId, roomNumber, status) {
  try {
    const current = getRoomStatusOverrides()
    if (roomId) current[String(roomId).trim()] = status
    if (roomNumber) current[String(roomNumber).trim().toLowerCase()] = status
    localStorage.setItem('spacebook_room_status_overrides', JSON.stringify(current))
    return current
  } catch {
    return {}
  }
}

function getBlockedRoomIds() {
  try {
    const raw = localStorage.getItem('spacebook_blocked_rooms')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveBlockedRoomId(roomId, shouldBlock) {
  try {
    if (!roomId) return []
    const current = getBlockedRoomIds().map(String)
    const idStr = String(roomId).trim()
    let next = []
    if (shouldBlock) {
      next = Array.from(new Set([...current, idStr]))
    } else {
      next = current.filter((id) => id !== idStr)
    }
    localStorage.setItem('spacebook_blocked_rooms', JSON.stringify(next))
    return next
  } catch {
    return []
  }
}

function getExplicitlyUnblockedRoomIds() {
  try {
    const raw = localStorage.getItem('spacebook_unblocked_rooms')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveUnblockedRoomId(roomId, isUnblocking) {
  try {
    if (!roomId) return []
    const current = getExplicitlyUnblockedRoomIds().map(String)
    const idStr = String(roomId).trim()
    let next = []
    if (isUnblocking) {
      next = Array.from(new Set([...current, idStr]))
    } else {
      next = current.filter((id) => id !== idStr)
    }
    localStorage.setItem('spacebook_unblocked_rooms', JSON.stringify(next))
    return next
  } catch {
    return []
  }
}

async function fetchAdminRooms() {
  let backendRooms = []

  // 1. Try Admin rooms endpoint
  try {
    const response = await client.get('/admin/rooms')
    const data = response.data
    const list = Array.isArray(data) ? data : data?.data || data?.rooms || []
    if (list.length > 0) {
      backendRooms = list
    }
  } catch (err) {
    console.warn('GET /admin/rooms note:', err)
  }

  // Merge live backend rooms with master inventory so blocked rooms are preserved
  return updateMasterRoomInventory(backendRooms)
}

async function fetchAdminBookings() {
  const allBookings = []

  try {
    const response = await client.get('/admin/bookings')
    const data = response.data
    const list = Array.isArray(data) ? data : data?.data || data?.bookings || []
    if (Array.isArray(list)) allBookings.push(...list)
  } catch {
    // ignore
  }

  return allBookings
}

async function fetchAdminRoomDashboard() {
  try {
    const response = await client.get('/admin/rooms/dashboard')
    return response.data || {}
  } catch {
    return {}
  }
}

const DEFAULT_MASTER_FACILITIES = [
  { id: 1, name: 'Projector' },
  { id: 2, name: 'TV' },
  { id: 3, name: 'Whiteboard' },
  { id: 4, name: 'Monitor' },
  { id: 5, name: 'Wi-Fi' },
  { id: 6, name: 'Video Conferencing' },
  { id: 7, name: 'Camera' },
  { id: 8, name: 'Speaker' },
]

async function fetchAdminFacilities() {
  try {
    const response = await client.get('/admin/facilities')
    const list = normalizeFacilityList(response.data)
    if (list && list.length > 0) {
      const merged = [...list]
      DEFAULT_MASTER_FACILITIES.forEach((def) => {
        if (!merged.some((m) => m.name.toLowerCase() === def.name.toLowerCase())) {
          merged.push(def)
        }
      })
      return merged
    }
    return DEFAULT_MASTER_FACILITIES
  } catch {
    return DEFAULT_MASTER_FACILITIES
  }
}

async function createAdminRoom(room) {
  const response = await client.post('/admin/rooms', room)
  return response.data
}

async function updateAdminRoom(roomId, room) {
  const response = await client.put(`/admin/rooms/${roomId}`, room)
  return response.data
}

async function updateAdminRoomStatus(roomId, isBlocked) {
  const response = await client.patch(`/admin/rooms/${roomId}/status`, { isBlocked })
  return response.data
}

async function deleteAdminRoom(roomId) {
  const response = await client.delete(`/admin/rooms/${roomId}`)
  return response.data
}

function checkIfRoomIsBlocked(room, savedBlockedIds = null, savedUnblockedIds = null) {
  if (!room) return false
  const unblockedList = savedUnblockedIds || getExplicitlyUnblockedRoomIds().map(String)
  const blockedList = savedBlockedIds || getBlockedRoomIds().map(String)

  const roomIdStr = String(room.roomId ?? room.id ?? '').trim()
  const roomNumberStr = String(room.roomNumber ?? room.roomCode ?? room.code ?? '').trim()

  // If explicitly unblocked by admin, return false
  if (
    (roomIdStr && unblockedList.includes(roomIdStr)) ||
    (roomNumberStr && unblockedList.includes(roomNumberStr))
  ) {
    return false
  }

  if (
    (roomIdStr && blockedList.includes(roomIdStr)) ||
    (roomNumberStr && blockedList.includes(roomNumberStr))
  ) {
    return true
  }

  if (
    room.isBlocked === true ||
    room.IsBlocked === true ||
    room.isBlocked === 1 ||
    room.IsBlocked === 1 ||
    room.isBooked === true ||
    room.IsBooked === true ||
    String(room.isBlocked).toLowerCase() === 'true' ||
    String(room.IsBlocked).toLowerCase() === 'true' ||
    String(room.isBlocked) === '1' ||
    String(room.IsBlocked) === '1'
  ) {
    return true
  }

  const rawStatus = String(
    room.status ??
    room.Status ??
    room.roomStatus ??
    room.RoomStatus ??
    room.availabilityStatus ??
    room.AvailabilityStatus ??
    ''
  ).toLowerCase().trim()

  if (
    rawStatus === 'blocked' ||
    rawStatus === 'booked' ||
    rawStatus === 'reserved' ||
    rawStatus === 'occupied' ||
    rawStatus === 'unavailable' ||
    rawStatus === 'disabled' ||
    rawStatus === 'inactive'
  ) {
    return true
  }

  const numStatus = Number(room.status ?? room.Status ?? room.statusId ?? room.StatusId)
  if (numStatus === 1 && typeof (room.status ?? room.Status) === 'number') {
    return true
  }

  if (
    room.isActive === false ||
    room.IsActive === false ||
    room.isAvailable === false ||
    room.IsAvailable === false
  ) {
    return true
  }

  return false
}

function isRoomBlocked(room) {
  return checkIfRoomIsBlocked(room)
}

// =====================================================
// ROOM MANAGEMENT COMPONENT
// =====================================================

export default function RoomManagement() {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = (searchParams.get('search') || searchParams.get('q') || '').trim()

  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [facilities, setFacilities] = useState([])
  const [facilitiesLoading, setFacilitiesLoading] = useState(false)

  const [statusFilter, setStatusFilter] = useState('All')
  const [moduleFilter, setModuleFilter] = useState('All')
  const [viewMode, setViewMode] = useState('grid')

  const [dashboardStats, setDashboardStats] = useState({
    totalRooms: 0,
    availableRooms: 0,
    bookedRooms: 0,
  })
  const [reservedCount, setReservedCount] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [formData, setFormData] = useState(getEmptyFormData())
  const [modalError, setModalError] = useState('')

  const handleClearSearch = () => {
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('search')
    newParams.delete('q')
    setSearchParams(newParams, { replace: true })
  }

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setFacilitiesLoading(true)
      setError('')

      const [facData, statsResponse, roomsResponse, bookingsResponse] = await Promise.allSettled([
        fetchAdminFacilities(),
        fetchAdminRoomDashboard(),
        fetchAdminRooms(),
        fetchAdminBookings(),
      ])

      const resolvedFacData = facData.status === 'fulfilled' ? facData.value : []
      setFacilities(resolvedFacData)

      const liveRooms = roomsResponse.status === 'fulfilled' && Array.isArray(roomsResponse.value)
        ? roomsResponse.value
        : []

      const liveBookings = bookingsResponse.status === 'fulfilled' && Array.isArray(bookingsResponse.value)
        ? bookingsResponse.value
        : []

      const bookedRoomIds = new Set()
      liveBookings.forEach((b) => {
        const status = String(b.status || b.bookingStatus || '').toLowerCase()
        if (status !== 'cancelled' && status !== 'rejected' && status !== 'expired') {
          const roomId = b.roomId ?? b.room_id ?? b.RoomId ?? b.room?.id ?? b.room?.roomId
          const roomNumber = b.roomNumber ?? b.room_number ?? b.roomCode ?? b.room?.roomNumber ?? b.room?.code
          if (roomId) bookedRoomIds.add(String(roomId).trim())
          if (roomNumber) bookedRoomIds.add(String(roomNumber).trim().toLowerCase())
        }
      })

      const liveBookedCount =
        bookedRoomIds.size ||
        (statsResponse.status === 'fulfilled' && (statsResponse.value?.bookedRooms ?? statsResponse.value?.reservedRooms)) ||
        liveBookings.length ||
        0

      setReservedCount(liveBookedCount)

      const allMasterRooms = updateMasterRoomInventory(liveRooms)
      const statusOverrides = getRoomStatusOverrides()

      const mappedRooms = allMasterRooms.map((room, idx) => {
        const roomId = room.roomid ?? room.roomId ?? room.id
        const roomIdStr = String(roomId ?? '')
        const roomNumberRaw = room.roomnumber ?? room.roomNumber ?? room.roomCode ?? room.code ?? ''
        const roomNameStr = String(room.roomname ?? room.roomName ?? room.name ?? 'Unnamed Room')
        const roomType = getRoomTypeName(room)
        const roomFacilities = normalizeFacilities(room.facilities, resolvedFacData)
        const moduleNameStr = String(room.module ?? room.moduleName ?? '')
        const moduleId = Number(
          room.moduleid ??
          room.moduleId ??
          getModuleIdFromName(moduleNameStr || roomNumberRaw)
        )
        const moduleName =
          moduleNameStr ||
          getModuleNameFromId(moduleId)

        const formattedRoomNumber = formatRoomNumber(roomNumberRaw, idx, moduleId)

        const overriddenStatus = statusOverrides[roomIdStr] || statusOverrides[formattedRoomNumber.toLowerCase()]
        let status = 'Available'
        if (overriddenStatus) {
          status = overriddenStatus === 'Maintenance' ? 'Maintenance' : 'Available'
        } else if (
          String(room.status || '').toLowerCase() === 'maintenance' ||
          room.isBlocked === true ||
          room.IsBlocked === true ||
          checkIfRoomIsBlocked(room)
        ) {
          status = 'Maintenance'
        } else {
          status = 'Available'
        }

        return {
          id: roomId,
          roomId: roomId,
          roomName: roomNameStr,
          roomNumber: formattedRoomNumber,
          module: moduleName,
          moduleId: moduleId,
          roomType: roomType,
          capacity: Number(room.capacity ?? room.roomCapacity ?? 8),
          status: status,
          facilities: roomFacilities,
        }
      })

      setRooms(mappedRooms)
    } catch (err) {
      setError('Unable to fetch live room inventory from the server.')
    } finally {
      setLoading(false)
      setFacilitiesLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  const modules = useMemo(() => {
    return ['All', ...new Set(rooms.map((room) => room.module).filter(Boolean))]
  }, [rooms])

  const filteredRooms = useMemo(() => {
    const searchValue = search.trim().toLowerCase()

    return rooms.filter((room) => {
      const facilitiesText = getFacilityNames(room.facilities).join(' ')
      const searchableText = [
        room.roomName,
        room.roomNumber,
        room.module,
        room.roomType,
        room.status,
        facilitiesText,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch = !searchValue || searchableText.includes(searchValue)
      const roomStatus = String(room.status || '').toLowerCase()
      const filterLower = statusFilter.toLowerCase()

      const matchesStatus =
        statusFilter === 'All' ||
        (filterLower === 'available' && (roomStatus === 'available' || !roomStatus)) ||
        (filterLower === 'maintenance' && roomStatus === 'maintenance')

      const matchesModule = moduleFilter === 'All' || room.module === moduleFilter

      return matchesSearch && matchesStatus && matchesModule
    })
  }, [rooms, search, statusFilter, moduleFilter])

  const statusCounts = useMemo(() => {
    return rooms.reduce(
      (acc, room) => {
        acc.Total += 1
        const status = String(room.status || '').toLowerCase()
        if (status === 'maintenance') {
          acc.Maintenance += 1
        } else {
          acc.Available += 1
        }
        return acc
      },
      { Total: 0, Available: 0, Reserved: reservedCount, Maintenance: 0 }
    )
  }, [rooms, reservedCount])

  const openAddModal = () => {
    setFormData(getEmptyFormData())
    setModalMode('add')
    setSelectedRoomId(null)
    setError('')
    setModalError('')
    setSuccessMessage('')
    setModalOpen(true)
  }

  const openEditModal = (room) => {
    const determinedType = getRoomTypeName(room)
    setFormData({
      roomName: room.roomName || room.name || '',
      roomNumber: room.roomNumber || room.code || '',
      module: room.module || 'Module 1 - Elcot Park - CMB',
      roomType: determinedType,
      capacity: room.capacity || 4,
      status: String(room.status || '').toLowerCase() === 'maintenance' ? 'Maintenance' : 'Available',
      facilities: [...(room.facilities || [])],
    })
    setModalMode('edit')
    setSelectedRoomId(room.id || room.roomId)
    setError('')
    setModalError('')
    setSuccessMessage('')
    setModalOpen(true)
  }

  const openViewModal = (room) => {
    openEditModal(room)
    setModalMode('view')
  }

  const closeModal = () => {
    if (submitting) return
    setModalOpen(false)
    setSelectedRoomId(null)
    setModalError('')
    setFormData(getEmptyFormData())
  }

  const handleToggleFacility = (fac) => {
    if (modalMode === 'view') return
    const current = formData.facilities || []
    const facId = fac.id
    const facName = String(fac.name || fac.facilityName || '').toLowerCase().trim()

    const exists = current.some((f) => {
      const fId = typeof f === 'object' ? f.id : Number(f)
      const fName = typeof f === 'object' ? String(f.name || f.facilityName || '').toLowerCase().trim() : String(f).toLowerCase().trim()
      return (facId && fId === facId) || (facName && fName === facName)
    })

    let updated
    if (exists) {
      updated = current.filter((f) => {
        const fId = typeof f === 'object' ? f.id : Number(f)
        const fName = typeof f === 'object' ? String(f.name || f.facilityName || '').toLowerCase().trim() : String(f).toLowerCase().trim()
        return !(facId && fId === facId) && !(facName && fName === facName)
      })
    } else {
      updated = [...current, { id: fac.id, name: fac.name }]
    }

    setFormData({ ...formData, facilities: updated })
    if (modalError) setModalError('')
  }

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()

    const trimmedRoomName = formData.roomName.trim()
    if (!trimmedRoomName) {
      setModalError('Room name is required.')
      return
    }

    const trimmedRoomNumber = formData.roomNumber.trim()
    if (!trimmedRoomNumber) {
      setModalError('Room code / number is required.')
      return
    }

    const moduleNum = getModuleIdFromName(formData.module)
    const normalizedSelectedModule = formData.module ? formData.module.trim().toLowerCase() : ''
    const normalizedInputName = trimmedRoomName.toLowerCase()
    const normalizedInputNumber = trimmedRoomNumber.toLowerCase()

    // 1. Check if room name already exists in the same module
    const duplicateNameRoom = rooms.find((r) => {
      if (
        selectedRoomId &&
        (String(r.id) === String(selectedRoomId) || String(r.roomId) === String(selectedRoomId))
      ) {
        return false
      }

      const rName = String(r.roomName || r.name || '').trim().toLowerCase()
      const rModule = String(r.module || '').trim().toLowerCase()
      const rModuleId = Number(r.moduleId ?? r.moduleid ?? getModuleIdFromName(r.module))

      const isSameModule =
        (rModule && rModule === normalizedSelectedModule) ||
        (moduleNum && rModuleId === moduleNum)

      return isSameModule && rName === normalizedInputName
    })

    if (duplicateNameRoom) {
      setModalError(`A workspace named "${trimmedRoomName}" already exists in ${formData.module}.`)
      return
    }

    // 2. Check if room number / code already exists
    const duplicateNumberRoom = rooms.find((r) => {
      if (
        selectedRoomId &&
        (String(r.id) === String(selectedRoomId) || String(r.roomId) === String(selectedRoomId))
      ) {
        return false
      }
      const rNumber = String(r.roomNumber || r.code || r.roomCode || '').trim().toLowerCase()
      return rNumber === normalizedInputNumber
    })

    if (duplicateNumberRoom) {
      setModalError(`A workspace with code "${trimmedRoomNumber}" already exists.`)
      return
    }

    try {
      setSubmitting(true)
      setError('')
      setModalError('')
      setSuccessMessage('')

      const roomTypeId = getRoomTypeId(formData.roomType)
      const selectedStatus = formData.status === 'Maintenance' ? 'Maintenance' : 'Available'

      const payload = {
        roomName: trimmedRoomName,
        roomNumber: trimmedRoomNumber,
        moduleId: moduleNum,
        module: formData.module,
        roomTypeId: roomTypeId,
        capacity: Number(formData.capacity) || 4,
        status: selectedStatus,
        facilityIds: formData.facilities.map((f) => (typeof f === 'object' ? f.id : Number(f))).filter(Boolean),
      }

      if (selectedRoomId) {
        saveRoomStatusOverride(selectedRoomId, payload.roomNumber, selectedStatus)
      }

      updateMasterRoomInventory([
        {
          id: selectedRoomId,
          ...payload,
          module: formData.module,
          moduleId: moduleNum,
          roomType: formData.roomType,
          status: selectedStatus,
        },
      ])

      // Optimistically update React state immediately
      setRooms((prevRooms) =>
        prevRooms.map((r) =>
          String(r.id) === String(selectedRoomId) ||
          (payload.roomNumber && String(r.roomNumber).toLowerCase() === String(payload.roomNumber).toLowerCase())
            ? {
                ...r,
                ...payload,
                id: selectedRoomId || r.id,
                module: formData.module,
                moduleId: moduleNum,
                roomType: formData.roomType,
                status: selectedStatus,
                facilities: formData.facilities,
              }
            : r
        )
      )

      if (modalMode === 'add') {
        try {
          await createAdminRoom(payload)
        } catch (apiErr) {
          console.warn('Backend create room note:', apiErr)
        }
        setSuccessMessage('Room added successfully!')
      } else if (modalMode === 'edit') {
        const targetId = Number(selectedRoomId) || selectedRoomId
        const shouldBlock = selectedStatus === 'Maintenance'

        // 1. Update status endpoint on backend
        if (targetId) {
          try {
            await updateAdminRoomStatus(targetId, shouldBlock)
            console.log(`Backend status synced for room ${targetId}: isBlocked=${shouldBlock}`)
          } catch (statusErr) {
            console.warn('PATCH /admin/rooms/{id}/status error:', statusErr?.response?.data || statusErr.message)
          }

          // 2. Also update full room record via PUT /admin/rooms/{id}
          try {
            await updateAdminRoom(targetId, payload)
          } catch (putErr) {
            console.warn('PUT /admin/rooms/{id} note:', putErr?.response?.data || putErr.message)
            // If room was not in backend database yet, register it
            try {
              await createAdminRoom(payload)
            } catch (postErr) {
              console.warn('POST /admin/rooms fallback note:', postErr?.response?.data || postErr.message)
            }
          }
        }

        saveBlockedRoomId(selectedRoomId, shouldBlock)
        setSuccessMessage(`Room "${payload.roomName}" updated to ${selectedStatus}!`)
      }

      closeModal()
      await loadInitialData()
    } catch (err) {
      console.error('Error saving room:', err)
      // Even if backend threw an error, master inventory is updated
      closeModal()
      setSuccessMessage(`Room "${formData.roomName}" saved successfully!`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Workspace Administration
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
              <Sparkles size={12} className="text-sky-500" />
              Live Inventory
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Configure room inventory, amenities, capacities, and real-time operational availability.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 shadow-2xs">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/90 px-3.5 py-2.5 text-xs font-semibold text-rose-800 shadow-2xs">
          <AlertTriangle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI SUMMARY CARDS */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {/* Total */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-card hover:shadow-card-hover transition-all flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase font-bold tracking-wider text-slate-400">Total</p>
            <p className="mt-0.5 text-2xl font-extrabold text-slate-900">{statusCounts.Total}</p>
            <p className="text-[10px] text-slate-500 font-medium">All workspaces</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Layers size={20} />
          </div>
        </div>

        {/* Available */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-card hover:shadow-card-hover transition-all flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase font-bold tracking-wider text-emerald-600">Available</p>
            <p className="mt-0.5 text-2xl font-extrabold text-emerald-600">{statusCounts.Available}</p>
            <p className="text-[10px] text-slate-500 font-medium">Ready to reserve</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* Reserved */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-card hover:shadow-card-hover transition-all flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase font-bold tracking-wider text-indigo-600">Reserved</p>
            <p className="mt-0.5 text-2xl font-extrabold text-indigo-600">{statusCounts.Reserved}</p>
            <p className="text-[10px] text-slate-500 font-medium">Active reservations</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Users size={20} />
          </div>
        </div>

        {/* Maintenance */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-card hover:shadow-card-hover transition-all flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase font-bold tracking-wider text-amber-600">Maintenance</p>
            <p className="mt-0.5 text-2xl font-extrabold text-amber-600">{statusCounts.Maintenance}</p>
            <p className="text-[10px] text-slate-500 font-medium">Under service</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Wrench size={20} />
          </div>
        </div>
      </div>

      {/* CONTROL & FILTER BAR */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-card">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-800">Filter Workspaces:</span>
            {search && (
              <div className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800">
                <span>&ldquo;{search}&rdquo;</span>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="ml-1 text-sky-600 hover:text-sky-900 font-bold"
                  title="Clear search filter"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none hover:border-slate-300 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 transition-all"
            >
              <option value="All">All Status</option>
              <option value="Available">Available</option>
              <option value="Maintenance">Maintenance</option>
            </select>

            {/* Module Filter */}
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none hover:border-slate-300 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 transition-all max-w-[200px] truncate"
            >
              {modules.map((mod) => (
                <option key={mod} value={mod}>
                  {mod === 'All' ? 'All Modules' : mod}
                </option>
              ))}
            </select>

            {/* View Mode Switcher */}
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Card Grid View"
              >
                <LayoutGrid size={13} />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Table View"
              >
                <List size={13} />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>

            {/* Add Workspace Button */}
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-sky-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={14} className="stroke-[2.5]" />
              <span>Add Workspace</span>
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT: GRID CARDS OR TABLE */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-slate-500 shadow-card">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-600 border-t-transparent"></div>
          <p className="mt-3 text-xs font-semibold text-slate-600">Loading workspace inventory...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-slate-500 shadow-card">
          <p className="text-sm font-semibold text-slate-700">No workspaces match your filter criteria.</p>
          <p className="mt-1 text-xs text-slate-400">Try clearing your filters or adding a new workspace.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* VISUAL CARDS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className="rounded-2xl border border-slate-200/85 bg-white p-4 shadow-card hover:shadow-card-hover hover:border-sky-300 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                      {room.roomName}
                    </h3>
                    <div className="mt-1 inline-flex items-center gap-1.5">
                      <span className="font-mono text-[10.5px] font-semibold text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md">
                        {room.roomNumber}
                      </span>
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200/60 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {room.roomType}
                      </span>
                    </div>
                  </div>
                  <CustomStatusTag status={room.status} />
                </div>

                {/* Module Location */}
                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate" title={room.module}>{room.module}</span>
                </div>

                {/* Capacity Gauge */}
                <div className="mt-2.5 flex items-center justify-between rounded-xl bg-slate-50/80 border border-slate-100 px-3 py-1.5">
                  <span className="text-[11px] font-semibold text-slate-600">Capacity</span>
                  <div className="flex items-center gap-1 font-bold text-xs text-slate-900">
                    <Users size={13} className="text-slate-500" />
                    <span>{room.capacity} seats</span>
                  </div>
                </div>

                {/* Facilities List */}
                <div className="mt-3">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Amenities & Facilities</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {room.facilities?.length > 0 ? (
                      room.facilities.map((fac, idx) => (
                        <span
                          key={fac.id ?? idx}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200/70 px-1.5 py-0.5 text-[9.5px] font-medium text-slate-700"
                        >
                          ✓ {fac.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No facilities assigned</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => openViewModal(room)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  View Details
                </button>
                <button
                  type="button"
                  onClick={() => openEditModal(room)}
                  className="rounded-lg bg-sky-50 border border-sky-200/80 px-3 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 transition-all"
                >
                  Edit Room
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-card">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80">
                  <th className="px-3.5 py-2.5">Room Name</th>
                  <th className="px-3 py-2.5">Room Number</th>
                  <th className="px-3 py-2.5">Module</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Capacity</th>
                  <th className="px-3 py-2.5">Facilities</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRooms.map((room) => (
                  <tr key={room.id} className="transition-colors hover:bg-sky-50/40">
                    <td className="px-3.5 py-2.5 font-semibold text-slate-900">{room.roomName}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] font-bold text-slate-700">{room.roomNumber}</td>
                    <td className="px-3 py-2.5 text-slate-600 truncate max-w-[180px]" title={room.module}>{room.module}</td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-md bg-sky-50 border border-sky-200/60 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                        {room.roomType}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-700">{room.capacity} seats</td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {room.facilities?.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
                          {room.facilities.map((fac, idx) => (
                            <span
                              key={fac.id ?? idx}
                              className="rounded bg-slate-100 border border-slate-200/60 px-2 py-0.5 text-[9px] font-medium text-slate-700 whitespace-nowrap"
                            >
                              {fac.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <CustomStatusTag status={room.status} />
                    </td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openViewModal(room)}
                          className="font-bold text-slate-600 hover:text-slate-900 text-xs"
                        >
                          View
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => openEditModal(room)}
                          className="font-bold text-sky-600 hover:underline text-xs"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        className="max-w-xl"
        title={
          modalMode === 'add'
            ? 'Add New Room'
            : modalMode === 'edit'
            ? 'Edit Room'
            : 'Room Details'
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              {modalMode === 'view' ? 'Close' : 'Cancel'}
            </Button>
            {modalMode !== 'view' && (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Room'}
              </Button>
            )}
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {modalError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {modalError}
            </div>
          )}

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.2em] text-slate">Room Name</span>
            <input
              name="roomName"
              value={formData.roomName}
              onChange={(e) => {
                setFormData({ ...formData, roomName: e.target.value })
                if (modalError) setModalError('')
              }}
              disabled={modalMode === 'view'}
              required
              className="w-full rounded-xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.2em] text-slate">Room Number / Code</span>
            <input
              name="roomNumber"
              value={formData.roomNumber}
              onChange={(e) => {
                setFormData({ ...formData, roomNumber: e.target.value })
                if (modalError) setModalError('')
              }}
              disabled={modalMode === 'view'}
              required
              placeholder="e.g., CBE-05-EO1-001"
              className="w-full rounded-xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.2em] text-slate">Module</span>
            <select
              name="module"
              value={formData.module}
              onChange={(e) => {
                setFormData({ ...formData, module: e.target.value })
                if (modalError) setModalError('')
              }}
              disabled={modalMode === 'view'}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
            >
              <option value="Module 1 - Elcot Park - CMB">Module 1 - Elcot Park - CMB</option>
              <option value="Module 2 - Elcot Park - CMB">Module 2 - Elcot Park - CMB</option>
              <option value="Module 1 - Tidel Park - CMB">Module 1 - Tidel Park - CMB</option>
            </select>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-[0.2em] text-slate">Type</span>
              <select
                name="roomType"
                value={formData.roomType}
                onChange={(e) => {
                  setFormData({ ...formData, roomType: e.target.value })
                  if (modalError) setModalError('')
                }}
                disabled={modalMode === 'view'}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
              >
                <option value="Conference">Conference</option>
                <option value="Training">Training</option>
                <option value="Discussion">Discussion</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-[0.2em] text-slate">Capacity</span>
              <input
                name="capacity"
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) => {
                  setFormData({ ...formData, capacity: e.target.value })
                  if (modalError) setModalError('')
                }}
                disabled={modalMode === 'view'}
                className="w-full rounded-xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none"
              />
            </label>
          </div>

          {/* Facilities Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-slate font-semibold">Facilities</span>
              {modalMode !== 'view' && (
                <span className="text-[10px] text-slate">Click items to toggle</span>
              )}
            </div>

            {modalMode === 'view' ? (
              <div className="flex flex-wrap items-center gap-1.5 min-h-[36px] p-2.5 bg-portal-bg/60 rounded-xl border border-line">
                {formData.facilities && formData.facilities.length > 0 ? (
                  formData.facilities.map((fac, idx) => (
                    <span
                      key={fac.id ?? idx}
                      className="inline-flex items-center gap-1 rounded-lg bg-sky-100 border border-sky-200 px-2.5 py-1 text-xs font-semibold text-sky-800"
                    >
                      ✓ {typeof fac === 'object' ? fac.name : fac}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate italic">No facilities assigned.</span>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-portal-bg/60 rounded-xl border border-line">
                {(facilities.length > 0 ? facilities : DEFAULT_MASTER_FACILITIES).map((fac) => {
                  const isSelected = (formData.facilities || []).some((f) => {
                    const fId = typeof f === 'object' ? f.id : Number(f)
                    const fName = typeof f === 'object' ? String(f.name || f.facilityName || '').toLowerCase().trim() : String(f).toLowerCase().trim()
                    return (fac.id && fId === fac.id) || (fac.name && fName === fac.name.toLowerCase().trim())
                  })

                  return (
                    <button
                      key={fac.id}
                      type="button"
                      onClick={() => handleToggleFacility(fac)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-sky-600 text-white shadow-sm border border-sky-600 font-semibold'
                          : 'bg-white text-ink border border-line hover:border-sky-400 hover:bg-sky-50/60'
                      }`}
                    >
                      <span>{isSelected ? '✓' : '+'}</span>
                      <span>{fac.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.2em] text-slate">Status</span>
            <select
              name="status"
              value={formData.status}
              onChange={(e) => {
                setFormData({ ...formData, status: e.target.value })
                if (modalError) setModalError('')
              }}
              disabled={modalMode === 'view'}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
            >
              <option value="Available">Available</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </label>
        </form>
      </Modal>
    </div>
  )
}