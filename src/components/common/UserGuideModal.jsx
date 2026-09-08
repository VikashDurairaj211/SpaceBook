import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  X,
  Search,
  Calendar,
  Layers,
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Play,
  RotateCcw,
  Check,
  Tv,
  Video,
  Wifi,
  Users,
  MessageSquare,
  Bot,
  Zap,
} from 'lucide-react'

// =====================================================
// Comprehensive Guide Content Data
// =====================================================

const CATEGORIES = [
  { id: 'all', label: 'All Topics' },
  { id: 'rooms', label: 'Room Booking' },
  { id: 'hotseat', label: 'Hot-Seats' },
  { id: 'availability', label: 'Availability' },
  { id: 'aira', label: 'Aira AI' },
  { id: 'admin', label: 'Admin Tools' },
  { id: 'faqs', label: 'FAQs' },
]

const GUIDE_SECTIONS = [
  {
    id: 'getting-started',
    category: 'all',
    title: 'Getting Started & Office Policy',
    icon: Sparkles,
    badge: 'Core Policy',
    description: 'Basic rules, office operating hours, multi-module campuses, and instant confirmation system.',
    actionRoute: '/search',
    actionLabel: 'Explore Workspace Search',
    topics: [
      {
        title: 'Office Operating Hours (10:00 AM – 10:00 PM)',
        content:
          'SpaceBook operates during official office hours from 10:00 AM to 10:00 PM IST (Monday through Friday). All meeting room and hot-seat bookings must fall strictly within this timeframe.',
        tips: 'The system automatically disables time slots outside 10:00 AM – 10:00 PM.',
      },
      {
        title: 'Multi-Module Campus Support',
        content:
          'SpaceBook manages meeting rooms and workstations across 3 standard modules: Module 1 - Elcot Park - CMB, Module 2 - Elcot Park - CMB, and Module 1 - Tidel Park - CMB.',
        tips: 'Easily filter by campus module in Room Search, Calendar, and Admin views.',
      },
      {
        title: 'Auto-Approval & Instant Confirmation',
        content:
          'Every room reservation and desk booking made on SpaceBook is automatically confirmed in real-time. There is no waiting for admin approval, allowing teams to reserve and use spaces immediately.',
        tips: 'Always book in advance during peak hours (11:00 AM – 4:00 PM).',
      },
      {
        title: 'Session Timeout & Account Security',
        content:
          'For data protection and corporate security, your session automatically expires after a period of inactivity. When expired, a clear security popup will alert you with a countdown to log in again safely.',
        tips: 'Your work is saved, and you can re-login smoothly without losing context.',
      },
    ],
  },
  {
    id: 'booking-rooms',
    category: 'rooms',
    title: 'Booking Meeting Rooms',
    icon: Building2,
    badge: 'Meeting Rooms',
    description: 'How to search, inspect amenities, and reserve meeting spaces across Elcot & Tidel Park.',
    interactiveType: 'room-demo',
    actionRoute: '/search',
    actionLabel: 'Search Meeting Rooms Now',
    topics: [
      {
        title: 'Finding the Right Meeting Room',
        content:
          'Navigate to "Workspace Search" from the sidebar or type a room name directly into the Top Navigation search bar. Filter by Module, Room Type, Capacity, and technical Facilities.',
        steps: [
          'Select your target Date and Start/End times (between 10:00 AM and 10:00 PM).',
          'Choose your Room Type: Conference (up to 20 people), Training (up to 50 people), or Discussion (8 to 10 people).',
          'Filter by required amenities (e.g. Video Conferencing, Smart TV, Whiteboard, Projector, Wi-Fi).',
          'Review real-time room cards showing capacity, standardized room codes (e.g. CBE-05-EO1-001), module location, and current availability status.',
        ],
      },
      {
        title: 'Viewing Room Details & Schedule Matrix',
        content:
          'Click "View Details" on any room card to see its full photo gallery, capacity limits, technical facilities, and the day-long time slot matrix showing already occupied vs free hours.',
      },
      {
        title: 'Instant Reservation & Confirmation',
        content:
          'Click "Book Now", enter your Meeting Title and Number of Attendees (required), review the summary modal, and click "Confirm Booking". Your reservation is created immediately with a clean numeric Booking ID.',
      },
    ],
  },
  {
    id: 'hotseat-booking',
    category: 'hotseat',
    title: 'Hot-Seat / Desk Booking',
    icon: MapPin,
    badge: 'Interactive Map',
    description: 'How to reserve individual workstations using the live interactive floor map.',
    interactiveType: 'desk-demo',
    actionRoute: '/hotseat-reservation',
    actionLabel: 'Open Hotseat Floor Map',
    topics: [
      {
        title: 'Navigating the Office Floor Plan',
        content:
          'Go to "Hotseat Reservation" in the sidebar to open the full-width interactive office floor map. You can toggle between Elcot Park Module 1, Elcot Park Module 2, and Tidel Park Module 1 floor plans.',
      },
      {
        title: 'Understanding Desk Color Codes',
        content: 'The floor map uses live color coding for each workstation desk button:',
        steps: [
          '🟢 Soft Emerald: Available workstation ready for instant booking.',
          '🔵 Electric Blue: Your currently selected desk with active reservation dialog.',
          '🟣 Royal Purple: Your active booked desk for the selected date.',
          '🔴 Soft Red: Booked desk currently reserved by another team member.',
          '⚪ Dashed Grey: Unavailable or maintenance slot.',
        ],
      },
      {
        title: 'Instant Modal Dialog Confirmation',
        content:
          'Clicking any green desk instantly pops up a centered modal dialog box right in front of you. Choose your expected check-in time (e.g. 10:00, 11:00, 14:00, 18:00) and click "Confirm Reservation". No page scrolling required!',
      },
    ],
  },
  {
    id: 'availability-calendar',
    category: 'availability',
    title: 'Workspace Availability',
    icon: Clock,
    badge: 'Schedule Grid',
    description: 'Visual time-grid matrix of all rooms across the workplace.',
    interactiveType: 'grid-demo',
    actionRoute: '/availability',
    actionLabel: 'View Live Availability Grid',
    topics: [
      {
        title: 'Checking Workspace Availability Grid',
        content:
          'The "Workspace Availability" page provides a bird’s-eye view matrix of all office meeting rooms across hourly time slots (10:00 AM to 10:00 PM).',
        steps: [
          'Select any date to inspect room schedules for that day.',
          'On weekends (Saturday/Sunday), the calendar automatically looks ahead to the next working business day.',
          'Look for green open slots to find times where all rooms or specific rooms are vacant.',
          'Click directly on an available slot to initiate an instant booking.',
        ],
      },
    ],
  },
  {
    id: 'aira-assistant',
    category: 'aira',
    title: 'Aira AI Assistant',
    icon: Sparkles,
    badge: 'AI Assistant',
    description: 'Using the built-in intelligent assistant positioned at the bottom-right corner for instant help.',
    interactiveType: 'aira-demo',
    actionCustom: 'openAira',
    actionLabel: 'Chat with Aira Assistant',
    topics: [
      {
        title: 'Instant Background Preloading',
        content:
          'Aira is preloaded in the background upon application startup. Located at the bottom-right corner of your screen, click the Aira icon anytime to get instant guidance without loading delays.',
      },
      {
        title: 'Supported Prompts & Capabilities',
        content: 'You can chat with Aira using these 6 supported prompt workflows:',
        steps: [
          'Office Locations: "What office locations are available in the system?"',
          'Office Search: "Search for the office located in [City/Location Name]."',
          'Available Rooms: "What rooms are available in the [Office Name] office?"',
          'Room Search: "Search for the room named [Room Name]."',
          'Office & Room Filtering: "Show me the rooms in [Office Name] that match [Criteria]."',
          'Room Information: "Tell me about the [Room Name] room."',
        ],
      },
    ],
  },
  {
    id: 'admin-portal',
    category: 'admin',
    title: 'Admin Tools & Intelligence',
    icon: ShieldCheck,
    badge: 'Admin Only',
    description: 'Executive KPIs, reservation audit modal, room management, hotseat administration, and visual analytics.',
    actionRoute: '/admin/reports',
    actionLabel: 'Go to Admin Dashboard',
    topics: [
      {
        title: 'Reports & Executive KPI Cards',
        content:
          'The Admin Reports page gives administrators a unified overview with compact, high-impact cards: Total Reservations, Utilization %, Confirmed Bookings, Cancelled Bookings, and Workforce Engagement with CSV audit export.',
      },
      {
        title: 'Workplace Reservation Records & Audit Modal',
        content:
          'Clicking "View" opens a dedicated audit modal showing Booking ID, Meeting Title, Room, Module, Date, Time, Requester details, and Status with live search and pagination.',
      },
      {
        title: 'Hotseat & Workspace Management',
        content:
          'Administrators can manage room inventory, toggle maintenance states, track desk check-ins/check-outs, and analyze shift demand across campus modules.',
      },
    ],
  },
  {
    id: 'faqs',
    category: 'faqs',
    title: 'Frequently Asked Questions',
    icon: HelpCircle,
    badge: 'FAQs',
    description: 'Quick answers to common questions and troubleshooting.',
    topics: [
      {
        title: 'Can I book a room on Saturday or Sunday?',
        content:
          'No. The office is operational Monday through Friday. Weekend dates are restricted to prevent unnecessary energy consumption and maintain facility schedules.',
      },
      {
        title: 'Which campus modules are supported in SpaceBook?',
        content:
          'SpaceBook supports Module 1 - Elcot Park - CMB, Module 2 - Elcot Park - CMB, and Module 1 - Tidel Park - CMB across Conference, Training, and Discussion rooms.',
      },
      {
        title: 'How do I know if my booking was approved?',
        content:
          'All reservations are auto-approved instantly in real-time. You receive an immediate on-screen confirmation and your booking will show in your "My Bookings" list.',
      },
      {
        title: 'How do I cancel or reschedule a booking?',
        content:
          'Go to "My Bookings" in the sidebar. Click "Edit" to change your meeting time or "Cancel" to release the reserved room or desk instantly.',
      },
    ],
  },
]

// =====================================================
// 1. Interactive Desk Simulator Component
// =====================================================
function InteractiveDeskSimulator() {
  const [selectedDesk, setSelectedDesk] = useState(null)
  const [simCheckIn, setSimCheckIn] = useState('10:00')

  const desks = [
    { id: 'WS-04-091', number: '91', status: 'available' },
    { id: 'WS-04-092', number: '92', status: 'occupied' },
    { id: 'WS-04-093', number: '93', status: 'available' },
    { id: 'WS-04-094', number: '94', status: 'my-booking' },
    { id: 'WS-04-095', number: '95', status: 'available' },
    { id: 'WS-04-096', number: '96', status: 'occupied' },
    { id: 'WS-04-097', number: '97', status: 'available' },
    { id: 'WS-04-098', number: '98', status: 'available' },
  ]

  return (
    <div className="rounded-2xl border-2 border-dashed border-sky-200 bg-gradient-to-br from-sky-50/70 via-white to-blue-50/50 p-4.5 space-y-3.5 my-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-600 text-white shadow-xs">
            <Play size={12} className="fill-white ml-0.5" />
          </span>
          <span className="text-xs font-bold text-sky-950 uppercase tracking-wider">
            Interactive Floor Map Simulator
          </span>
        </div>
        <span className="text-[11px] font-medium text-slate-500">
          Try clicking any desk below 👇
        </span>
      </div>

      {/* Mini Desk Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 bg-slate-100/80 p-3 rounded-xl border border-slate-200/80">
        {desks.map((d) => {
          const isSelected = selectedDesk?.id === d.id
          let styleClass = 'bg-emerald-100 border-emerald-500 text-emerald-800 hover:scale-105'
          if (d.status === 'occupied') {
            styleClass = 'bg-red-100 border-red-300 text-red-700 opacity-90'
          } else if (d.status === 'my-booking') {
            styleClass = 'bg-indigo-600 border-indigo-800 text-white shadow-md'
          }
          if (isSelected) {
            styleClass = 'bg-[#2F6FE0] border-[#1e40af] text-white ring-4 ring-blue-300/60 scale-105 shadow-md'
          }

          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelectedDesk(d)}
              className={`h-10 rounded-lg border-2 font-mono font-black text-xs transition-all flex flex-col items-center justify-center ${styleClass}`}
              title={`${d.id} - ${d.status}`}
            >
              <span>{d.number}</span>
            </button>
          )
        })}
      </div>

      {/* Interactive Result Card */}
      {selectedDesk ? (
        <div className="rounded-xl bg-white border border-slate-200 p-3 shadow-sm animate-in fade-in zoom-in-95 duration-150">
          {selectedDesk.status === 'available' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-mono font-bold text-xs">
                  {selectedDesk.number}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs text-slate-900">{selectedDesk.id}</span>
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                      Available
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">Pick check-in time to test:</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {['10:00', '11:00', '14:00', '18:00'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSimCheckIn(t)}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition border ${
                      simCheckIn === t
                        ? 'bg-[#2F6FE0] text-white border-[#2F6FE0]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => alert(`Simulated Booking Success: Reserved ${selectedDesk.id} for check-in at ${simCheckIn}!`)}
                  className="ml-1 px-3 py-1 rounded-lg bg-[#2F6FE0] text-white text-[11px] font-bold hover:bg-blue-700 transition"
                >
                  Reserve
                </button>
              </div>
            </div>
          )}

          {selectedDesk.status === 'occupied' && (
            <div className="flex items-center justify-between gap-2 text-xs text-red-700">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900">{selectedDesk.id}</span>
                <span className="rounded-full bg-red-100 px-2 py-0.5 font-bold text-red-800 text-[10px]">Occupied</span>
                <span>Already reserved by another team member.</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDesk(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {selectedDesk.status === 'my-booking' && (
            <div className="flex items-center justify-between gap-2 text-xs text-indigo-900">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900">{selectedDesk.id}</span>
                <span className="rounded-full bg-indigo-600 px-2 py-0.5 font-bold text-white text-[10px]">Your Desk</span>
                <span>Active Reservation · Check-in: 10:00 AM</span>
              </div>
              <button
                type="button"
                onClick={() => alert(`Simulated Release: Released ${selectedDesk.id}!`)}
                className="px-2 py-1 rounded-md bg-red-100 text-red-700 font-bold text-[11px] hover:bg-red-200"
              >
                Release Desk
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-[11px] text-slate-400 py-1">
          Click any green, red, or purple desk above to test interactive booking behaviors.
        </div>
      )}
    </div>
  )
}

// =====================================================
// 2. Interactive Room Card Demo Component
// =====================================================
function InteractiveRoomDemo() {
  const [selectedSlot, setSelectedSlot] = useState('11:00 AM - 12:00 PM')
  const [booked, setBooked] = useState(false)

  const slots = [
    { time: '10:00 AM - 11:00 AM', status: 'occupied' },
    { time: '11:00 AM - 12:00 PM', status: 'available' },
    { time: '02:00 PM - 03:00 PM', status: 'available' },
    { time: '04:00 PM - 05:00 PM', status: 'available' },
  ]

  return (
    <div className="rounded-2xl border-2 border-dashed border-sky-200 bg-gradient-to-br from-sky-50/70 via-white to-blue-50/50 p-4.5 space-y-3.5 my-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-600 text-white shadow-xs">
            <Play size={12} className="fill-white ml-0.5" />
          </span>
          <span className="text-xs font-bold text-sky-950 uppercase tracking-wider">
            Interactive Room Booking Demo
          </span>
        </div>
        <span className="text-[11px] font-medium text-slate-500">
          Try selecting a slot & booking 👇
        </span>
      </div>

      {/* Mini Interactive Room Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-slate-900">Emerald Conference Suite</h4>
              <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                CBE-05-EO1-001
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Module 1 - Elcot Park · Max 16 Attendees
            </div>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <span title="Video Conferencing" className="p-1 rounded bg-slate-100 text-sky-600"><Video size={13} /></span>
            <span title="Smart TV" className="p-1 rounded bg-slate-100 text-sky-600"><Tv size={13} /></span>
            <span title="High-Speed Wi-Fi" className="p-1 rounded bg-slate-100 text-sky-600"><Wifi size={13} /></span>
          </div>
        </div>

        {/* Time Slot Picker Matrix */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Select an Available Hour:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {slots.map((s) => {
              const isOccupied = s.status === 'occupied'
              const isSelected = selectedSlot === s.time
              return (
                <button
                  key={s.time}
                  type="button"
                  disabled={isOccupied}
                  onClick={() => {
                    setSelectedSlot(s.time)
                    setBooked(false)
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition text-center border ${
                    isOccupied
                      ? 'bg-red-50 text-red-400 border-red-100 cursor-not-allowed line-through'
                      : isSelected
                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {s.time.split(' - ')[0]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Interactive Action Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            Selected: <strong className="text-slate-800">{selectedSlot}</strong>
          </span>

          <button
            type="button"
            onClick={() => setBooked(true)}
            className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition shadow-sm"
          >
            {booked ? '✓ Confirmed (Booking #1042)' : 'Book Instantly'}
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// 3. Interactive Schedule Grid Demo Component
// =====================================================
function InteractiveGridDemo() {
  const [activeCell, setActiveCell] = useState(null)

  const matrix = [
    { room: 'Conference A', slots: ['free', 'booked', 'free', 'free', 'booked', 'free'] },
    { room: 'Training Hall', slots: ['booked', 'booked', 'free', 'free', 'free', 'free'] },
    { room: 'Discussion 1', slots: ['free', 'free', 'free', 'booked', 'booked', 'free'] },
  ]
  const hours = ['10 AM', '11 AM', '12 PM', '02 PM', '04 PM', '06 PM']

  return (
    <div className="rounded-2xl border-2 border-dashed border-sky-200 bg-gradient-to-br from-sky-50/70 via-white to-blue-50/50 p-4.5 space-y-3 my-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-600 text-white shadow-xs">
            <Play size={12} className="fill-white ml-0.5" />
          </span>
          <span className="text-xs font-bold text-sky-950 uppercase tracking-wider">
            Workspace Availability Matrix Demo
          </span>
        </div>
        <span className="text-[11px] font-medium text-slate-500">Click any green cell 👇</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-mono text-[10px]">
              <th className="pb-2 font-bold uppercase">Room</th>
              {hours.map((h) => (
                <th key={h} className="pb-2 text-center font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {matrix.map((row, rIdx) => (
              <tr key={row.room}>
                <td className="py-2 font-bold text-slate-800 whitespace-nowrap pr-3">{row.room}</td>
                {row.slots.map((st, cIdx) => {
                  const cellKey = `${rIdx}-${cIdx}`
                  const isSelected = activeCell === cellKey
                  const isFree = st === 'free'

                  return (
                    <td key={cIdx} className="py-2 text-center px-1">
                      <button
                        type="button"
                        onClick={() => isFree && setActiveCell(cellKey)}
                        disabled={!isFree}
                        className={`w-full py-1.5 rounded-md text-[10px] font-bold transition ${
                          !isFree
                            ? 'bg-red-100 text-red-600 cursor-not-allowed opacity-80'
                            : isSelected
                            ? 'bg-[#2F6FE0] text-white ring-2 ring-blue-300 shadow-sm'
                            : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        }`}
                      >
                        {isSelected ? 'SELECTED' : isFree ? 'OPEN' : 'BUSY'}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeCell && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-900 flex items-center justify-between">
          <span>✓ <strong>Selected Slot is Available!</strong> Direct 1-click booking active.</span>
          <button
            type="button"
            onClick={() => setActiveCell(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}

// =====================================================
// 4. Interactive Aira Prompt Simulator Component
// =====================================================
function InteractiveAiraDemo() {
  const [activePrompt, setActivePrompt] = useState(null)

  const samplePrompts = [
    {
      q: 'What office locations are available in the system?',
      a: 'SpaceBook currently supports 2 major campus zones: Elcot Park SEZ (Modules 1 & 2) and Tidel Park (Module 1) located in Coimbatore.',
    },
    {
      q: 'What rooms are available in Tidel Park?',
      a: 'Tidel Park Module 1 features Conference Rooms (16–20 seats), Discussion Suites (8–10 seats), and 224 Hotseat Workstations.',
    },
    {
      q: 'How do I check in to my workstation desk?',
      a: 'Click "Check In" on your active reservation card in your Dashboard or Hotseat Reservation page during your scheduled shift window.',
    },
  ]

  return (
    <div className="rounded-2xl border-2 border-dashed border-sky-200 bg-gradient-to-br from-sky-50/70 via-white to-blue-50/50 p-4.5 space-y-3.5 my-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-600 text-white shadow-xs">
            <Bot size={13} />
          </span>
          <span className="text-xs font-bold text-sky-950 uppercase tracking-wider">
            Interactive Aira Prompt Tester
          </span>
        </div>
        <span className="text-[11px] font-medium text-slate-500">Click a sample prompt 👇</span>
      </div>

      <div className="space-y-2">
        {samplePrompts.map((p, idx) => {
          const isActive = activePrompt === idx
          return (
            <div key={idx} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setActivePrompt(isActive ? null : idx)}
                className="w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={13} className="text-sky-600 shrink-0" />
                  <span>"{p.q}"</span>
                </div>
                <span className="text-[11px] text-sky-600 font-semibold">{isActive ? 'Hide' : 'Ask'}</span>
              </button>

              {isActive && (
                <div className="bg-sky-50/60 border-t border-sky-100 p-3 text-xs text-sky-950 flex items-start gap-2.5 animate-in fade-in duration-150">
                  <div className="h-5 w-5 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles size={10} />
                  </div>
                  <div className="leading-relaxed">
                    <strong className="text-sky-900 block mb-0.5">Aira Response:</strong>
                    {p.a}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// =====================================================
// Main Interactive User Guide Modal Component
// =====================================================
export default function UserGuideModal({ open, onClose }) {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeSectionId, setActiveSectionId] = useState('getting-started')
  const [searchQuery, setSearchQuery] = useState('')
  const [helpfulFeedback, setHelpfulFeedback] = useState({})

  // Filter sections by search query and category
  const filteredSections = useMemo(() => {
    let list = GUIDE_SECTIONS

    if (activeCategory !== 'all') {
      list = list.filter((s) => s.category === activeCategory || s.id === 'faqs')
    }

    if (!searchQuery.trim()) return list

    const q = searchQuery.toLowerCase()
    return list
      .map((section) => {
        const matchSection =
          section.title.toLowerCase().includes(q) ||
          section.description.toLowerCase().includes(q)

        const matchingTopics = section.topics.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.content.toLowerCase().includes(q) ||
            (t.tips && t.tips.toLowerCase().includes(q)) ||
            (t.steps && t.steps.some((s) => s.toLowerCase().includes(q)))
        )

        if (matchSection || matchingTopics.length > 0) {
          return {
            ...section,
            topics: matchingTopics.length > 0 ? matchingTopics : section.topics,
          }
        }
        return null
      })
      .filter(Boolean)
  }, [searchQuery, activeCategory])

  const activeSection =
    filteredSections.find((s) => s.id === activeSectionId) ||
    filteredSections[0] ||
    GUIDE_SECTIONS[0]

  const activeIndex = filteredSections.findIndex((s) => s.id === activeSection.id)
  const prevSection = activeIndex > 0 ? filteredSections[activeIndex - 1] : null
  const nextSection =
    activeIndex < filteredSections.length - 1 ? filteredSections[activeIndex + 1] : null

  const handleFeedback = (sectionId, type) => {
    setHelpfulFeedback((prev) => ({
      ...prev,
      [sectionId]: type,
    }))
  }

  const handleAction = (section) => {
    if (section.actionRoute) {
      navigate(section.actionRoute)
      onClose()
    } else if (section.actionCustom === 'openAira') {
      window.dispatchEvent(new CustomEvent('openGeminiBookingBot'))
      onClose()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100000] font-sans flex items-center justify-center bg-slate-900/60 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200"
      style={{ fontFamily: 'var(--fontFamilyBase, "Segoe UI Variable", "Segoe UI", sans-serif)' }}
    >
      <div className="relative flex h-[92vh] max-h-[860px] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-2xl">
        {/* =================================================
            Modal Header
        ================================================= */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-sky-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-md shadow-sky-600/20">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-sky-950">
                  SpaceBook Interactive User Guide
                </h2>
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
                  <Sparkles size={11} /> Interactive Simulators
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans">
                Hands-on walkthrough with live demo simulators for room reservation, floor maps, and policies.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition"
            title="Close User Guide"
          >
            <X size={18} />
          </button>
        </div>

        {/* =================================================
            Quick Category Filter & Search Bar
        ================================================= */}
        <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.id)
                    setSearchQuery('')
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    activeCategory === cat.id
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-72">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics or features..."
                className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs font-sans text-slate-800 placeholder-slate-400 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* =================================================
            Main Body: Left Nav + Right Topic Content
        ================================================= */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Navigation Sidebar */}
          <div className="w-64 border-r border-slate-100 bg-slate-50/50 p-3 overflow-y-auto hidden md:block">
            <p className="px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Guide Chapters
            </p>
            <nav className="mt-1 space-y-1">
              {filteredSections.map((section) => {
                const Icon = section.icon
                const isActive = activeSection.id === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSectionId(section.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-sans font-semibold transition ${
                      isActive
                        ? 'bg-sky-600 text-white shadow-sm font-bold'
                        : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        size={15}
                        className={isActive ? 'text-white' : 'text-sky-700'}
                      />
                      <span className="truncate">{section.title}</span>
                    </div>
                    {isActive && <ChevronRight size={14} className="shrink-0" />}
                  </button>
                )
              })}
            </nav>

            {/* Quick Interactive Status Box */}
            <div className="mt-6 rounded-2xl border border-sky-200 bg-white p-3.5 shadow-sm space-y-2">
              <div className="flex items-center justify-between font-mono text-[10px] font-bold text-sky-950 uppercase tracking-wider">
                <span>Core Policy</span>
                <Clock size={13} className="text-sky-600" />
              </div>
              <div className="text-xs font-bold text-sky-700 font-sans">
                10:00 AM – 10:00 PM
              </div>
              <p className="text-[10px] text-slate-500 font-sans leading-tight">
                Monday to Friday · Instant auto-confirmations.
              </p>
            </div>
          </div>

          {/* Right Topic Details Body */}
          <div className="flex-1 overflow-y-auto p-6 bg-white space-y-6">
            {/* Active Chapter Header */}
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-sky-100 px-2.5 py-0.5 font-mono text-[10px] font-bold text-sky-800 uppercase tracking-wider">
                    {activeSection.badge}
                  </span>
                </div>
                <h3 className="mt-1 font-display text-xl font-bold text-slate-900">
                  {activeSection.title}
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  {activeSection.description}
                </p>
              </div>

              {/* Direct Deep-Link Action Button */}
              {activeSection.actionLabel && (
                <button
                  type="button"
                  onClick={() => handleAction(activeSection)}
                  className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5 shrink-0"
                >
                  <span>{activeSection.actionLabel}</span>
                  <ExternalLink size={13} />
                </button>
              )}
            </div>

            {/* Interactive Simulator (if applicable) */}
            {activeSection.interactiveType === 'desk-demo' && <InteractiveDeskSimulator />}
            {activeSection.interactiveType === 'room-demo' && <InteractiveRoomDemo />}
            {activeSection.interactiveType === 'grid-demo' && <InteractiveGridDemo />}
            {activeSection.interactiveType === 'aira-demo' && <InteractiveAiraDemo />}

            {/* Topics List */}
            <div className="space-y-4">
              {activeSection.topics.map((topic, idx) => {
                const cleanTitle = String(topic.title || '').replace(/^\d+\.\s*/, '')
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4.5 space-y-2.5 transition hover:border-sky-200 hover:bg-white"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800 text-xs font-mono font-bold">
                        {idx + 1}
                      </div>
                      <h4 className="font-display text-sm font-bold text-slate-900">
                        {cleanTitle}
                      </h4>
                    </div>

                    <p className="text-xs text-slate-700 font-sans leading-relaxed pl-8">
                      {topic.content}
                    </p>

                    {/* Step list if applicable */}
                    {topic.steps && (
                      <div className="pl-8 space-y-1.5 pt-1">
                        {topic.steps.map((step, sIdx) => {
                          const cleanStep = String(step || '').replace(/^\d+\.\s*/, '')
                          return (
                            <div
                              key={sIdx}
                              className="flex items-start gap-2 text-xs font-sans text-slate-600"
                            >
                              <ArrowRight
                                size={12}
                                className="text-sky-600 shrink-0 mt-0.5"
                              />
                              <span>{cleanStep}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Pro-Tip Box */}
                    {topic.tips && (
                      <div className="ml-8 mt-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs font-sans text-emerald-900 flex items-start gap-2">
                        <CheckCircle2
                          size={14}
                          className="text-emerald-600 shrink-0 mt-0.5"
                        />
                        <span>
                          <strong className="font-semibold">Pro-Tip:</strong> {topic.tips}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* "Was this helpful?" Feedback Section */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500">
              <span className="font-medium">Was this chapter helpful?</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleFeedback(activeSection.id, 'yes')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold transition ${
                    helpfulFeedback[activeSection.id] === 'yes'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <ThumbsUp size={12} />
                  <span>Yes</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFeedback(activeSection.id, 'no')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold transition ${
                    helpfulFeedback[activeSection.id] === 'no'
                      ? 'bg-red-100 text-red-800 border-red-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <ThumbsDown size={12} />
                  <span>No</span>
                </button>
              </div>
            </div>

            {/* Stepper Navigation: Previous & Next Chapter */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              {prevSection ? (
                <button
                  type="button"
                  onClick={() => setActiveSectionId(prevSection.id)}
                  className="flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-900 transition"
                >
                  <ChevronLeft size={14} />
                  <span>{prevSection.title}</span>
                </button>
              ) : (
                <div />
              )}

              {nextSection && (
                <button
                  type="button"
                  onClick={() => setActiveSectionId(nextSection.id)}
                  className="flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-900 transition"
                >
                  <span>{nextSection.title}</span>
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* =================================================
            Modal Footer
        ================================================= */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs font-sans text-slate-500">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-sky-600" />
            <span>Need more help? Ask <strong>Aira</strong> in the bottom-right corner anytime.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-sky-700 px-5 py-2 font-sans font-bold text-white shadow-sm hover:bg-sky-800 transition"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  )
}
