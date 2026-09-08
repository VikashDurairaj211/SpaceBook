import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createBooking } from '../api/bookings'
import { getRoomAvailability } from '../api/rooms'
import { Field, Input, Select } from '../components/common/Input'
import BusinessDatePicker from '../components/common/BusinessDatePicker'
import ScrollableTimePicker from '../components/common/ScrollableTimePicker'
import { useToast } from '../components/common/ToastProvider'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import Modal from '../components/common/Modal'
import {
  Building2,
  Calendar,
  Clock,
  Users,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  ArrowRight,
  Video,
  Wifi,
  Monitor,
  Info,
} from 'lucide-react'

// =====================================================
// HELPER - GET LOCAL DATE
// =====================================================

function getLocalDateStr(dateObj = new Date()) {
  const offset = dateObj.getTimezoneOffset() * 60000

  return new Date(
    dateObj.getTime() - offset
  )
    .toISOString()
    .slice(0, 10)
}

function isWeekendDate(dateStr) {
  if (!dateStr) return false
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return false
  const dt = new Date(y, m - 1, d)
  const day = dt.getDay()
  return day === 0 || day === 6
}

function getNextBusinessDayStr(dateObj = new Date()) {
  const next = new Date(dateObj)
  const day = next.getDay()
  if (day === 6) {
    next.setDate(next.getDate() + 2)
  } else if (day === 0) {
    next.setDate(next.getDate() + 1)
  }
  return getLocalDateStr(next)
}

// =====================================================
// HELPER - GET LOCAL TIME
// =====================================================

function getLocalTimeStr(dateObj = new Date()) {
  const hours = String(
    dateObj.getHours()
  ).padStart(2, '0')

  const minutes = String(
    dateObj.getMinutes()
  ).padStart(2, '0')

  return `${hours}:${minutes}`
}

// =====================================================
// NORMALIZE ROOM DATA
// =====================================================

function normalizeRooms(data) {
  const rooms =
    Array.isArray(data)
      ? data
      : data?.rooms ||
      data?.data ||
      data?.result ||
      []

  return rooms.map((room) => ({
    ...room,

    roomId:
      room.roomId ||
      room.id ||
      room.roomID,

    roomName:
      room.roomName ||
      room.name ||
      room.roomNumber ||
      'Unnamed Room',

    // ===============================================
    // ROOM LOCATION
    //
    // Backend may return the configured location
    // using "module"
    // ===============================================

    location:
      room.location ||
      room.roomLocation ||
      room.locationName ||
      room.module ||
      room.room?.location ||
      '',

    // ===============================================
    // MODULE
    // ===============================================

    module:
      room.module ||
      room.location ||
      room.roomLocation ||
      room.locationName ||
      '',

    // ===============================================
    // CAPACITY
    // ===============================================

    capacity:
      room.capacity ||
      room.roomCapacity ||
      room.maxCapacity ||
      0,

    // ===============================================
    // FACILITIES
    // ===============================================

    facilities:
      room.facilities ||
      room.roomFacilities ||
      [],

    // ===============================================
    // TIME SLOTS & BOOKINGS
    // ===============================================

    timeSlots:
      room.timeSlots ||
      room.slots ||
      room.availabilitySlots ||
      [],

    bookings:
      room.bookings ||
      [],
  }))
}

// =====================================================
// HELPER - CHECK ROOM TIME OVERLAP CONFLICT
// =====================================================

function checkRoomBookingConflict(room, requestedStart, requestedEnd) {
  if (!room || !requestedStart || !requestedEnd) return false

  const reqStart =
    requestedStart.length === 5
      ? `${requestedStart}:00`
      : requestedStart

  const reqEnd =
    requestedEnd.length === 5
      ? `${requestedEnd}:00`
      : requestedEnd

  // 1. Check timeSlots / slots / availabilitySlots
  const rawSlots =
    room.timeSlots ||
    room.slots ||
    room.availabilitySlots ||
    []

  for (const slot of rawSlots) {
    const isBooked =
      slot.isBooked === true ||
      slot.booked === true ||
      String(slot.status || '').toLowerCase() === 'booked' ||
      String(slot.status || '').toLowerCase() === 'pending' ||
      String(slot.status || '').toLowerCase() === 'confirmed'

    if (isBooked) {
      const slotStart =
        slot.start ||
        slot.startTime ||
        slot.fromTime ||
        slot.timeSlot?.start ||
        slot.timeSlot?.startTime

      const slotEnd =
        slot.end ||
        slot.endTime ||
        slot.toTime ||
        slot.timeSlot?.end ||
        slot.timeSlot?.endTime

      if (slotStart && slotEnd) {
        const sStart =
          slotStart.length === 5
            ? `${slotStart}:00`
            : slotStart

        const sEnd =
          slotEnd.length === 5
            ? `${slotEnd}:00`
            : slotEnd

        if (reqStart < sEnd && reqEnd > sStart) {
          return true
        }
      }
    }
  }

  // 2. Check bookings array if present
  const bookings = room.bookings || []
  for (const b of bookings) {
    const status = String(b.status || '').toLowerCase()
    if (status !== 'cancelled' && status !== 'rejected') {
      const bStart = b.startTime || b.start
      const bEnd = b.endTime || b.end
      if (bStart && bEnd) {
        const sStart =
          bStart.length === 5
            ? `${bStart}:00`
            : bStart

        const sEnd =
          bEnd.length === 5
            ? `${bEnd}:00`
            : bEnd

        if (reqStart < sEnd && reqEnd > sStart) {
          return true
        }
      }
    }
  }

  return false
}



// =====================================================
// BOOK ROOM
// =====================================================

export default function BookRoom() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const roomIdParam =
    searchParams.get('roomId')

  const todayStr = getLocalDateStr()
  const maxDateObj = new Date()
  maxDateObj.setDate(maxDateObj.getDate() + 7)
  const maxDateStr = [
    maxDateObj.getFullYear(),
    String(maxDateObj.getMonth() + 1).padStart(2, '0'),
    String(maxDateObj.getDate()).padStart(2, '0'),
  ].join('-')
  const defaultBusinessDay = getNextBusinessDayStr()

  const prefillDate =
    searchParams.get('date') ||
    defaultBusinessDay

  const prefillStart =
    searchParams.get('startTime') || ''

  const prefillEnd =
    searchParams.get('endTime') || ''

  const prefillAttendees =
    searchParams.get('attendees') || ''

  // =====================================================
  // STATE
  // =====================================================

  const [availableRooms, setAvailableRooms] =
    useState([])

  const [loadingRooms, setLoadingRooms] =
    useState(false)

  const [currentTime, setCurrentTime] =
    useState(getLocalTimeStr())

  const [form, setForm] = useState({
    title: '',
    module: '',
    roomId: roomIdParam || '',
    date: prefillDate,
    startTime: prefillStart,
    endTime: prefillEnd,
    attendees: prefillAttendees,
  })

  const [errors, setErrors] =
    useState({})

  const [submitting, setSubmitting] =
    useState(false)

  const [confirming, setConfirming] =
    useState(false)

  const toast = useToast()

  // =====================================================
  // KEEP CURRENT TIME UPDATED
  // =====================================================

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        getLocalTimeStr()
      )
    }, 30000)

    return () => clearInterval(timer)
  }, [])

  // =====================================================
  // LOAD ROOMS
  // =====================================================

  useEffect(() => {
    let active = true

    setLoadingRooms(true)

    getRoomAvailability(form.date)
      .then((data) => {
        if (!active) return

        // Normalize API response so BookRoom uses
        // the same room structure consistently.
        const mappedRooms =
          normalizeRooms(data)

        const activeRooms = mappedRooms.filter((r) => {
          const id = String(r.roomId || r.id || '').trim();
          const code = String(r.roomNumber || r.roomCode || '').trim().toLowerCase();
          try {
            const overrides = JSON.parse(localStorage.getItem('spacebook_room_status_overrides') || '{}');
            const blocked = JSON.parse(localStorage.getItem('spacebook_blocked_rooms') || '[]');
            if (overrides[id] === 'Maintenance' || (code && overrides[code] === 'Maintenance')) return false;
            if (id && blocked.map(String).includes(id)) return false;
          } catch {
            // ignore
          }
          const rawStatus = String(r.status || r.roomStatus || '').toLowerCase();
          return !(rawStatus === 'maintenance' || rawStatus === 'blocked' || r.isBlocked === true || r.IsBlocked === true || r.isAvailable === false);
        });

        setAvailableRooms(
          activeRooms
        )

        // ===============================================
        // PRESELECT ROOM FROM AVAILABILITY CALENDAR
        // ===============================================

        if (roomIdParam) {
          const matchedRoom =
            mappedRooms.find(
              (r) =>
                String(r.roomId) ===
                String(roomIdParam)
            )

          if (matchedRoom) {
            setForm((f) => ({
              ...f,

              module:
                matchedRoom.module ||
                f.module,

              roomId:
                String(
                  matchedRoom.roomId
                ),
            }))
          }
        }
      })
      .catch((err) => {
        console.error(
          'Failed to load rooms:',
          err
        )
      })
      .finally(() => {
        if (active) {
          setLoadingRooms(false)
        }
      })

    return () => {
      active = false
    }
  }, [form.date, roomIdParam])

  // =====================================================
  // GET UNIQUE MODULES
  // =====================================================

  const modules = useMemo(() => {
    const list =
      availableRooms
        .map((r) => r.module)
        .filter(Boolean)

    return [
      ...new Set(list)
    ]
  }, [availableRooms])

  // =====================================================
  // GET ROOMS IN SELECTED MODULE
  // =====================================================

  const roomsInModule = useMemo(() => {
    if (!form.module) {
      return []
    }

    return availableRooms.filter(
      (r) =>
        r.module === form.module
    )
  }, [
    availableRooms,
    form.module
  ])

  // =====================================================
  // GET SELECTED ROOM DETAILS
  // =====================================================

  const selectedRoomDetails =
    useMemo(() => {
      return availableRooms.find(
        (r) =>
          String(r.roomId) ===
          String(form.roomId)
      )
    }, [
      availableRooms,
      form.roomId
    ])

  // =====================================================
  // UPDATE FORM
  // =====================================================

  function update(key, value) {
    setForm((f) => ({
      ...f,
      [key]: value,
    }))

    if (key === 'date' && isWeekendDate(value)) {
      setErrors((prev) => ({
        ...prev,
        date: 'Room reservations are only permitted on business working days (Monday to Friday). Saturdays and Sundays are unavailable.',
      }))
      return
    }

    setErrors((prev) => ({
      ...prev,
      [key]: '',
    }))
  }

  // =====================================================
  // MODULE CHANGE
  // =====================================================

  function handleModuleChange(module) {
    setForm((f) => ({
      ...f,
      module,
      roomId: '',
    }))

    setErrors((prev) => ({
      ...prev,
      module: '',
      roomId: '',
    }))
  }

  // =====================================================
  // TIME PICKER
  // =====================================================

  const isSelectedDateToday =
    form.date === todayStr

  const minStartTime =
    isSelectedDateToday
      ? currentTime
      : '10:00'

  // =====================================================
  // SUBMIT BOOKING
  // =====================================================

  async function handleSubmit(e) {
    e.preventDefault()

    const newErrors = {}

    // -------------------------------------------------
    // REQUIRED FIELD VALIDATION
    // -------------------------------------------------

    if (!form.title.trim()) {
      newErrors.title =
        'Meeting title is required.'
    }

    if (!form.module) {
      newErrors.module =
        'Module is required.'
    }

    if (!form.roomId) {
      newErrors.roomId =
        'Room is required.'
    }

    if (!form.date) {
      newErrors.date =
        'Date is required.'
    } else if (isWeekendDate(form.date)) {
      newErrors.date =
        'Room reservations are only permitted on business working days (Monday to Friday). Saturdays and Sundays are unavailable.'
    }

    if (!form.startTime) {
      newErrors.startTime =
        'Start time is required.'
    }

    if (!form.endTime) {
      newErrors.endTime =
        'End time is required.'
    }

    if (!form.attendees || Number(form.attendees) < 1) {
      newErrors.attendees =
        'Number of attendees is required.'
    }

    if (
      Object.keys(newErrors).length > 0
    ) {
      setErrors(newErrors)
      return
    }

    setErrors({})

    // -------------------------------------------------
    // PAST DATE VALIDATION
    // -------------------------------------------------

    if (form.date < todayStr) {
      setErrors({
        date:
          'Cannot book a date in the past.',
      })

      return
    }

    // -------------------------------------------------
    // ROOM CAPACITY VALIDATION
    // -------------------------------------------------

    if (
      selectedRoomDetails &&
      Number(form.attendees) >
      Number(
        selectedRoomDetails.capacity
      )
    ) {
      setErrors({
        attendees:
          `Number of attendees cannot exceed the room capacity of ${selectedRoomDetails.capacity}.`,
      })

      return
    }

    // -------------------------------------------------
    // START / END TIME VALIDATION
    // -------------------------------------------------

    if (
      form.startTime >=
      form.endTime
    ) {
      setErrors({
        endTime:
          'End time must be after start time.',
      })

      return
    }

    // -------------------------------------------------
    // PAST TIME VALIDATION
    // -------------------------------------------------

    if (
      isSelectedDateToday &&
      form.startTime < currentTime
    ) {
      setErrors({
        startTime:
          'Cannot book a start time in the past for today.',
      })

      return
    }

    // -------------------------------------------------
    // OFFICE HOURS
    // -------------------------------------------------

    const OFFICE_START_TIME =
      '10:00'

    const OFFICE_END_TIME =
      '22:01'

    if (
      form.startTime <
      OFFICE_START_TIME
    ) {
      setErrors({
        startTime:
          'Bookings are allowed only between 10:00 and 22:00.',
      })

      return
    }

    if (
      form.endTime >
      OFFICE_END_TIME
    ) {
      setErrors({
        endTime:
          'Bookings are allowed only between 10:00 and 22:00.',
      })

      return
    }

    // -------------------------------------------------
    // ROOM BOOKING OVERLAP PRE-VALIDATION
    // -------------------------------------------------

    if (
      selectedRoomDetails &&
      checkRoomBookingConflict(
        selectedRoomDetails,
        form.startTime,
        form.endTime
      )
    ) {
      setErrors({
        startTime:
          'The selected room is already booked for the selected time period. Please choose another room or time.',
      })

      return
    }

    // -------------------------------------------------
    // OPEN CONFIRMATION MODAL
    // -------------------------------------------------

    setConfirming(true)
  }

  // =====================================================
  // KEYBOARD ENTER TO CONFIRM
  // =====================================================

  useEffect(() => {
    if (!confirming) return

    function handleKeyDown(e) {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (!submitting) {
          confirmBooking()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        if (!submitting) {
          setConfirming(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [confirming, submitting, form])

  // =====================================================
  // CONFIRM BOOKING
  // =====================================================

  async function confirmBooking() {
    setConfirming(false)
    setSubmitting(true)

    try {
      const payload = {
        meetingTitle:
          form.title.trim(),

        purpose:
          form.title.trim(),

        title:
          form.title.trim(),

        Title:
          form.title.trim(),

        MeetingTitle:
          form.title.trim(),

        Purpose:
          form.title.trim(),

        roomId:
          Number(form.roomId),

        participantCount:
          Number(form.attendees),

        bookingDate:
          form.date,

        startTime:
          form.startTime.length === 5
            ? `${form.startTime}:00`
            : form.startTime,

        endTime:
          form.endTime.length === 5
            ? `${form.endTime}:00`
            : form.endTime,

        facilityIds: [],
      }

      const res = await createBooking(payload)

      try {
        const bookedId =
          res?.bookingId ||
          res?.id ||
          res?.data?.bookingId ||
          res?.data?.id
        const savedTitles = JSON.parse(
          localStorage.getItem("spacebook_meeting_titles") || "{}"
        )
        if (bookedId) {
          savedTitles[String(bookedId)] = form.title.trim()
        }
        const timeKey = String(form.startTime || "").slice(0, 5)
        savedTitles[`${form.roomId}_${form.date}_${timeKey}`] =
          form.title.trim()
        localStorage.setItem(
          "spacebook_meeting_titles",
          JSON.stringify(savedTitles)
        )
      } catch (e) {
        console.warn("Could not cache meeting title:", e)
      }

      toast.addToast({
        type: 'success',
        title:
          'Booking confirmed',
        message:
          'Redirecting to My Bookings…',
      })

      setTimeout(() => {
        navigate('/my-bookings')
      }, 900)
    } catch (err) {
      let errorMessage =
        'Could not create booking. Please try again.'

      const responseData =
        err.response?.data

      if (responseData?.errors) {
        errorMessage =
          Object.values(
            responseData.errors
          )
            .flat()
            .join(' ')
      } else if (
        responseData?.message ||
        responseData?.title
      ) {
        errorMessage =
          responseData.message ||
          responseData.title
      }

      // Intercept misleading backend capacity/participant errors for room time conflict
      const lowerMsg = String(errorMessage).toLowerCase()
      if (
        (lowerMsg.includes('accommodate') ||
          lowerMsg.includes('capacity') ||
          lowerMsg.includes('overlap') ||
          lowerMsg.includes('conflict') ||
          lowerMsg.includes('no room can')) &&
        (lowerMsg.includes('participant') || lowerMsg.includes('no room can'))
      ) {
        errorMessage =
          'The selected room is already booked for the selected time period. Please choose another room or time.'
      }

      toast.addToast({
        type: 'error',
        title: errorMessage,
      })
    } finally {
      setSubmitting(false)
    }
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* COMPACT HEADER */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h1 className="font-display text-xl font-extrabold tracking-tight text-slate-900">
            Reserve a Workspace
          </h1>
          <p className="text-xs text-slate-500">
            Book verified conference and discussion spaces across campuses
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-2xs">
          <Sparkles size={12} className="text-emerald-600" />
          <span>Auto-Approval</span>
        </div>
      </div>

      {/* COMPACT RESERVATION FORM */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-card">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* STEP 1: MEETING TITLE */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-100 text-[10px] font-extrabold text-sky-700">
                1
              </span>
              <span>Meeting Title</span>
            </label>

            <Input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. Sprint Planning & Architecture Review"
              className="w-full text-xs sm:text-sm font-medium"
            />

            {errors.title && (
              <p className="mt-1 text-[11px] font-semibold text-rose-600">
                {errors.title}
              </p>
            )}
          </div>

          {/* STEP 2: CAMPUS MODULE & ROOM */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-100 text-[10px] font-extrabold text-sky-700">
                2
              </span>
              <span>Campus & Space</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field label="Module / Campus">
                <Select
                  value={form.module}
                  onChange={(e) => handleModuleChange(e.target.value)}
                  disabled={loadingRooms}
                  className="w-full text-xs font-medium"
                >
                  <option value="">
                    {loadingRooms ? 'Loading modules...' : 'Select module'}
                  </option>
                  {modules.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>

                {errors.module && (
                  <p className="mt-1 text-[11px] font-semibold text-rose-600">
                    {errors.module}
                  </p>
                )}
              </Field>

              <Field label="Room">
                <Select
                  value={form.roomId}
                  onChange={(e) => update('roomId', e.target.value)}
                  disabled={!form.module || loadingRooms}
                  className="w-full text-xs font-medium"
                >
                  <option value="">
                    {form.module ? 'Select room' : 'Choose module first'}
                  </option>
                  {roomsInModule.map((r, index) => (
                    <option key={r.roomId} value={r.roomId}>
                      {r.roomName || `Room ${index + 1}`} ({r.capacity || 20} Seats)
                    </option>
                  ))}
                </Select>

                {errors.roomId && (
                  <p className="mt-1 text-[11px] font-semibold text-rose-600">
                    {errors.roomId}
                  </p>
                )}
              </Field>
            </div>

            {/* COMPACT ROOM SPOTLIGHT */}
            {selectedRoomDetails && (
              <div className="rounded-xl border border-sky-200/80 bg-gradient-to-r from-sky-50/70 to-indigo-50/50 p-2.5 animate-in fade-in duration-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {selectedRoomDetails.roomName}
                    </span>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5">
                      Max {selectedRoomDetails.capacity} Seats
                    </span>
                  </div>

                  {/* AMENITIES */}
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-1 bg-white/90 border border-slate-200 px-1.5 py-0.5 rounded-md">
                      <Wifi size={10} className="text-sky-600" />
                      <span>Wi-Fi</span>
                    </span>
                    <span className="inline-flex items-center gap-1 bg-white/90 border border-slate-200 px-1.5 py-0.5 rounded-md">
                      <Monitor size={10} className="text-indigo-600" />
                      <span>Display / Projector</span>
                    </span>
                    <span className="inline-flex items-center gap-1 bg-white/90 border border-slate-200 px-1.5 py-0.5 rounded-md">
                      <Video size={10} className="text-purple-600" />
                      <span>Video Conf</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 3: DATE & TIME SCHEDULE */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-100 text-[10px] font-extrabold text-sky-700">
                3
              </span>
              <span>Schedule & Time</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="sm:col-span-6">
                <BusinessDatePicker
                  label="Date"
                  min={todayStr}
                  max={maxDateStr}
                  value={form.date}
                  error={errors.date}
                  onChange={(value) => update('date', value)}
                />
              </div>

              <div className="sm:col-span-3">
                <ScrollableTimePicker
                  label="Start Time"
                  value={form.startTime}
                  selectedDate={form.date}
                  onChange={(value) => update('startTime', value)}
                  error={errors.startTime}
                />
              </div>

              <div className="sm:col-span-3">
                <ScrollableTimePicker
                  label="End Time"
                  value={form.endTime}
                  selectedDate={form.date}
                  minTime={form.startTime}
                  onChange={(value) => update('endTime', value)}
                  error={errors.endTime}
                />
              </div>
            </div>
          </div>

          {/* STEP 4: NUMBER OF ATTENDEES */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-100 text-[10px] font-extrabold text-sky-700">
                4
              </span>
              <span>Number of Attendees</span>
            </label>

            <div className="flex items-center gap-3">
              <Input
                type="number"
                min="1"
                max={selectedRoomDetails?.capacity}
                placeholder="e.g. 5"
                className="w-28 text-xs font-semibold"
                value={form.attendees}
                onChange={(e) => update('attendees', e.target.value)}
              />

              {selectedRoomDetails ? (
                <span className="text-xs text-slate-500 font-medium">
                  Room limit:{' '}
                  <strong className="text-slate-800 font-bold">
                    {selectedRoomDetails.capacity} seats
                  </strong>{' '}
                  {Number(form.attendees) > Number(selectedRoomDetails.capacity) && (
                    <span className="text-rose-600 font-bold ml-1">
                      (Exceeds capacity!)
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-xs text-slate-400">
                  Select a room to view capacity limits
                </span>
              )}
            </div>

            {errors.attendees && (
              <p className="mt-1 text-[11px] font-semibold text-rose-600">
                {errors.attendees}
              </p>
            )}
          </div>

          {/* CONFIRM BUTTON */}
          <div className="pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={
                submitting ||
                (selectedRoomDetails &&
                  Number(form.attendees) >
                    Number(selectedRoomDetails.capacity))
              }
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-sky-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Processing Reservation...</span>
                </>
              ) : (
                <>
                  <span>Confirm Workspace Reservation</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>

            {submitting && (
              <p className="mt-1.5 text-center text-[11px] text-sky-600 font-semibold animate-pulse">
                Connecting to server and locking room slot...
              </p>
            )}
          </div>
        </form>
      </div>

      {/* =====================================================
          CONFIRMATION MODAL
      ===================================================== */}

      <Modal
        open={confirming}
        title="Confirm booking"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                setConfirming(false)
              }
            >
              Back
            </Button>

            <Button
              disabled={submitting}
              onClick={confirmBooking}
            >
              {submitting ? 'Confirming...' : 'Confirm Booking'}
            </Button>
          </>
        }
      >

        <div className="space-y-1">

          <p>
            <strong>
              Meeting Title:
            </strong>{' '}
            {form.title}
          </p>

          <p>
            <strong>
              Room:
            </strong>{' '}
            {selectedRoomDetails?.roomName ||
              'Selected room'}
          </p>

          <p>
            <strong>
              Module:
            </strong>{' '}
            {form.module}
          </p>

          {/* FIXED ROOM LOCATION */}


          <p>
            <strong>
              Date & time:
            </strong>{' '}
            {form.date} ·{' '}
            {form.startTime}–
            {form.endTime}
          </p>

          <p>
            <strong>
              Attendees:
            </strong>{' '}
            {form.attendees}
          </p>

        </div>

      </Modal>

    </div>
  )
}