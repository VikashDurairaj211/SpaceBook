import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import FloorMapModule1 from "./FloorMapModule1";
import FloorMapModule2 from "./FloorMapModule2";
import FloorMapTidalParkModule1 from "./FloorMapModule1Tidal";
import "./officeMapLayout.css";
import "../../index.css";
import {
  CheckCircle2,
  X,
  ChevronDown,
  AlertTriangle,
  Search,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  Layers,
  Info,
  Check,
  RotateCcw,
  Building2,
  UserCheck,
  ExternalLink,
} from "lucide-react";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import { Field, Input } from "../../components/common/Input";
import ScrollableTimePicker from "../../components/common/ScrollableTimePicker";
import { useToast } from "../../components/common/ToastProvider";
import {
  getMyBookings,
  cancelBooking,
  updateBooking,
} from "../../api/bookings";
import {
  getMyHotseatBookings,
  cancelHotseatBooking,
} from "../../api/hotseat";

// ---------------------------------------------------------------------------
// Helpers & Dates
// ---------------------------------------------------------------------------

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateKey) {
  if (!dateKey) return "";

  const [year, month, day] = dateKey.split("-");

  return `${month}-${day}-${year}`;
}

function isWeekend(dateKey) {
  if (!dateKey) return false;
  const [year, month, day] = dateKey.split("-");
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
}

function getTodayKey() {
  return toDateKey(new Date());
}

function getTomorrowKey() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return toDateKey(tomorrow);
}

function normalizeDateKey(value) {
  if (!value) return "";

  const text = String(value);

  if (text.length >= 10) {
    return text.substring(0, 10);
  }

  return text;
}

// ---------------------------------------------------------------------------
// Dropdown Select Atom
// ---------------------------------------------------------------------------

function Select({
  label,
  step,
  required,
  value,
  onChange,
  options,
  placeholder,
}) {
  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          className="uppercase tracking-wider font-semibold select-none"
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: "11px",
            color: "#5C6470",
          }}
        >
          {step && <span>{step}. </span>}
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative w-full">
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-md border border-slate-300 bg-white px-3.5 py-2.5 pr-8 text-sm text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          {!value && placeholder && <option value="">{placeholder}</option>}

          {normalized.map((o) => {
            const disabledWeekend = isWeekend(o.value);
            return (
              <option key={o.value} value={o.value} disabled={disabledWeekend}>
                {o.label} {disabledWeekend ? "(Weekend)" : ""}
              </option>
            );
          })}
        </select>

        <ChevronDown
          size={15}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
        />
      </div>
    </div>
  );
}



// ---------------------------------------------------------------------------
// Toast Notification
// ---------------------------------------------------------------------------

function Toast({ message, details, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4500);

    return () => clearTimeout(timer);
  }, [onClose]);

  return createPortal(
    <div className="fixed top-6 right-6 z-[99999] flex items-start gap-3 bg-white border border-emerald-400 text-slate-800 px-4 py-3.5 rounded-xl shadow-2xl transition-all duration-300 max-w-sm">
      <div className="rounded-full bg-emerald-100 p-1.5 text-emerald-600 mt-0.5 shrink-0">
        <CheckCircle2 size={18} />
      </div>

      <div className="flex-1 text-xs">
        <p className="font-bold text-slate-900 text-sm mb-0.5">
          {message}
        </p>

        {details && (
          <p className="text-slate-600 leading-relaxed">
            {details}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600 transition-colors -mt-0.5 -mr-1"
        aria-label="Dismiss toast"
      >
        <X size={16} />
      </button>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Conflict Modal
// ---------------------------------------------------------------------------

function ConflictModal({ conflictData, onClose, onLocateMyDesk }) {
  if (!conflictData || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-amber-300/80 dark:border-amber-800/80 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
          <div className="rounded-2xl bg-amber-100 dark:bg-amber-950/70 p-2.5">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Booking Conflict</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Existing reservation detected</p>
          </div>
        </div>

        <div className="rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-3.5 text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
          {conflictData.message || "You already have an active hotseat reservation for this date."}
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/80 p-4 space-y-2.5 text-xs">
          {conflictData.existingBookingId && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Booking ID:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                #{conflictData.existingBookingId}
              </span>
            </div>
          )}

          {conflictData.seatId && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Your Reserved Desk:</span>
              <span className="font-mono font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md">
                Desk #{conflictData.seatId}
                {conflictData.office ? ` (${conflictData.office})` : ""}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Status:</span>
            <span className="bg-emerald-600 text-white text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
              {conflictData.bookingStatus || "Confirmed"}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
          You can only hold one hotseat reservation per day. Click below to view where your desk is located on the floor map.
        </p>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Close
          </button>

          {onLocateMyDesk && conflictData.seatId && (
            <button
              type="button"
              onClick={() => onLocateMyDesk(conflictData)}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/25 flex items-center gap-1.5 transition active:scale-95"
            >
              <MapPin size={13} />
              <span>Locate My Desk</span>
            </button>
          )}

          <a
            href="/my-bookings"
            className="rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 px-3.5 py-2 text-xs font-bold text-white text-center transition"
          >
            View Bookings
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Main Hotseat Booking Component
// ---------------------------------------------------------------------------

const API_BASE = "https://spacebook-505h.onrender.com/api/Hotseat";

function buildInitialModuleSeats() {
  const module1Seats = Array.from({ length: 98 }, (_, i) => {
    const num = i + 1;
    return {
      id: `EO1-${num}`,
      seatNumber: `EO1-${num}`,
      seatId: num,
      label: `Seat ${num}`,
      number: num,
      modulePrefix: "EO1",
      type: "hotseat",
      status: "available",
      bookedByUserId: null,
    };
  });

  const module2Seats = Array.from({ length: 131 }, (_, i) => {
    const num = i + 1;
    return {
      id: `EO2-${num}`,
      seatNumber: `EO2-${num}`,
      seatId: num + 98,
      label: `Seat ${num}`,
      number: num,
      modulePrefix: "EO2",
      type: "hotseat",
      status: "available",
      bookedByUserId: null,
    };
  });

  const tidalSeats = Array.from({ length: 224 }, (_, i) => {
    const num = i + 1;
    const pad3 = `WS-04-${String(num).padStart(3, "0")}`;
    return {
      id: pad3,
      seatNumber: pad3,
      seatId: 0,
      label: `Seat ${num}`,
      number: num,
      modulePrefix: "WS-04",
      type: "hotseat",
      status: "available",
      bookedByUserId: null,
    };
  });

  return [
    { id: "module1", label: "Module 1", office: "Elcot Park", seats: module1Seats, rooms: [] },
    { id: "module2", label: "Module 2", office: "Elcot Park", seats: module2Seats, rooms: [] },
    { id: "tidel-module1", label: "Module 1", office: "Tidel Park", seats: tidalSeats, rooms: [] },
  ];
}

function buildModulesFromSeatArray(seatArray) {
  const eo1Map = new Map();
  const eo2Map = new Map();
  const tidalMap = new Map();

  for (let i = 0; i < seatArray.length; i++) {
    const s = seatArray[i];
    const sn = String(s.seatNumber || "").trim().toUpperCase();
    if (!sn) continue;

    if (sn.includes("EO2") || (sn.includes("WS-05") && sn.includes("EO2"))) {
      const num = parseInt(sn.split("-").pop(), 10);
      if (!isNaN(num)) eo2Map.set(num, s);
      eo2Map.set(sn, s);
    } else if (sn.includes("EO1") || (sn.includes("WS-05") && sn.includes("EO1"))) {
      const num = parseInt(sn.split("-").pop(), 10);
      if (!isNaN(num)) eo1Map.set(num, s);
      eo1Map.set(sn, s);
    } else if (sn.startsWith("WS-04") || sn.startsWith("WS") || sn.includes("TIDEL") || sn.includes("TIDAL")) {
      const num = parseInt(sn.split("-").pop(), 10) || parseInt(sn.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(num)) tidalMap.set(num, s);
      tidalMap.set(sn, s);
    }
  }

  const checkOccupied = (found) => {
    if (!found) return { isOccupied: false, rawStatus: "available" };
    const rawStatus = String(found.status || "available").toLowerCase();
    const isOccupied =
      rawStatus === "occupied" ||
      rawStatus === "booked" ||
      rawStatus === "confirmed" ||
      rawStatus === "approved" ||
      rawStatus === "checked in" ||
      rawStatus === "checkedin" ||
      rawStatus === "1" ||
      rawStatus === "true" ||
      found.isBooked === true ||
      found.isOccupied === true;
    return { isOccupied, rawStatus };
  };

  const module1Seats = Array.from({ length: 98 }, (_, i) => {
    const num = i + 1;
    const pad3 = `WS-05-EO1-${String(num).padStart(3, "0")}`;
    const pad2 = `EO1-${String(num).padStart(2, "0")}`;
    const pad1 = `EO1-${num}`;

    const found = eo1Map.get(num) || eo1Map.get(pad3) || eo1Map.get(pad2) || eo1Map.get(pad1);
    const { isOccupied, rawStatus } = checkOccupied(found);

    return {
      id: found?.seatNumber || `EO1-${num}`,
      seatNumber: found?.seatNumber || `EO1-${num}`,
      seatId: found?.seatId ?? found?.id ?? num,
      label: `Seat ${num}`,
      number: num,
      modulePrefix: "EO1",
      type: "hotseat",
      status: isOccupied ? "occupied" : rawStatus === "reserved" ? "reserved" : "available",
      bookedByUserId: found?.bookedByUserId || found?.userId || null,
    };
  });

  const module2Seats = Array.from({ length: 131 }, (_, i) => {
    const num = i + 1;
    const pad3 = `WS-05-EO2-${String(num).padStart(3, "0")}`;
    const pad2 = `EO2-${String(num).padStart(2, "0")}`;
    const pad1 = `EO2-${num}`;

    const found = eo2Map.get(num) || eo2Map.get(pad3) || eo2Map.get(pad2) || eo2Map.get(pad1);
    const { isOccupied, rawStatus } = checkOccupied(found);

    return {
      id: found?.seatNumber || `EO2-${num}`,
      seatNumber: found?.seatNumber || `EO2-${num}`,
      seatId: found?.seatId ?? found?.id ?? (num + 98),
      label: `Seat ${num}`,
      number: num,
      modulePrefix: "EO2",
      type: "hotseat",
      status: isOccupied ? "occupied" : rawStatus === "reserved" ? "reserved" : "available",
      bookedByUserId: found?.bookedByUserId || found?.userId || null,
    };
  });

  const tidalSeats = Array.from({ length: 224 }, (_, i) => {
    const num = i + 1;
    const pad3 = `WS-04-${String(num).padStart(3, "0")}`;
    const pad2 = `WS-04-${String(num).padStart(2, "0")}`;
    const pad1 = `WS-04-${num}`;

    const found = tidalMap.get(num) || tidalMap.get(pad3) || tidalMap.get(pad2) || tidalMap.get(pad1);
    const { isOccupied, rawStatus } = checkOccupied(found);

    return {
      id: found?.seatNumber || pad3,
      seatNumber: found?.seatNumber || pad3,
      seatId: found?.seatId ?? found?.id ?? 0,
      label: `Seat ${num}`,
      number: num,
      modulePrefix: "WS-04",
      type: "hotseat",
      status: isOccupied ? "occupied" : rawStatus === "reserved" ? "reserved" : "available",
      bookedByUserId: found?.bookedByUserId || found?.userId || null,
    };
  });

  return [
    { id: "module1", label: "Module 1", office: "Elcot Park", seats: module1Seats, rooms: [] },
    { id: "module2", label: "Module 2", office: "Elcot Park", seats: module2Seats, rooms: [] },
    { id: "tidel-module1", label: "Module 1", office: "Tidel Park", seats: tidalSeats, rooms: [] },
  ];
}

export default function HotseatBookingApp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [modules, setModules] = useState(() => buildInitialModuleSeats());
  const [toastState, setToastState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const toast = useToast();
  const seatCacheRef = useRef(new Map());

  const today = getTodayKey();
  const [targetDate, setTargetDate] = useState(today);
  const [location, setLocation] = useState("Coimbatore");
  const [zone, setZone] = useState("Tidel Park");
  const [moduleId, setModuleId] = useState("module1");

  useEffect(() => {
    const moduleParam = searchParams.get("module") || "";
    const dateParam = searchParams.get("date") || "";

    if (dateParam && !isWeekend(dateParam)) {
      setTargetDate(dateParam);
    }

    if (moduleParam) {
      const lower = moduleParam.toLowerCase();
      if (lower.includes("tidel") || lower.includes("tidal")) {
        setLocation("Coimbatore");
        setZone("Tidel Park");
        setModuleId("module1");
      } else if (lower.includes("module 2") || lower.includes("m2")) {
        setLocation("Coimbatore");
        setZone("Elcot Park");
        setModuleId("module2");
      } else if (lower.includes("module 1") || lower.includes("m1")) {
        setLocation("Coimbatore");
        setZone("Elcot Park");
        setModuleId("module1");
      }
    }
  }, [searchParams]);

  const getAuthHeaders = () => {
    let token =
      localStorage.getItem("spacebook_token") ||
      localStorage.getItem("token") ||
      "";
    if (token && !token.startsWith("Bearer ")) {
      token = `Bearer ${token}`;
    }

    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token } : {}),
    };
  };

  const fetchOfficeData = async (forceRefresh = false) => {
    try {
      if (!forceRefresh && seatCacheRef.current.has(targetDate)) {
        const cached = seatCacheRef.current.get(targetDate);
        if (cached?.modules) setModules(cached.modules);
        if (cached?.bookings) setBookings(cached.bookings);
      } else {
        setLoading(true);
      }

      const [seatsRes, bookingsRes] = await Promise.all([
        fetch(`${API_BASE}?date=${targetDate}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/my-bookings`, { headers: getAuthHeaders() }),
      ]);

      let newModules = null;
      let newBookings = null;

      if (seatsRes.ok) {
        const rawSeats = await seatsRes.json();
        const seatArray = Array.isArray(rawSeats) ? rawSeats : rawSeats?.seats || [];
        newModules = buildModulesFromSeatArray(seatArray);
        setModules(newModules);
      }

      if (bookingsRes.ok) {
        const myBookingsData = await bookingsRes.json();
        newBookings = Array.isArray(myBookingsData) ? myBookingsData : myBookingsData?.bookings || [];
        setBookings(newBookings);
      }

      if (newModules) {
        seatCacheRef.current.set(targetDate, {
          modules: newModules,
          bookings: newBookings || [],
        });
      }
    } catch (err) {
      console.error("Failed to sync with backend:", err);
      showCustomToast("Connection Error", "Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isWeekend(targetDate)) return;

    // Initial load
    fetchOfficeData();

    // 1. Auto-refresh every 30 seconds silently in background
    const interval = setInterval(() => {
      fetchOfficeData(true);
    }, 30000);

    // 2. Refresh when user switches back to this tab
    const handleFocus = () => {
      fetchOfficeData(true);
    };

    // 3. Refresh when a booking is created or cancelled elsewhere in the app
    const handleBookingUpdated = () => {
      seatCacheRef.current.delete(targetDate);
      fetchOfficeData(true);
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("booking-updated", handleBookingUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("booking-updated", handleBookingUpdated);
    };
  }, [targetDate]);

  const showCustomToast = useCallback((message, details) => {
    setToastState({ message, details });
  }, []);

  async function reserveItem({ item, targetDate, expectedCheckIn }) {
    if (isWeekend(targetDate)) {
      return { ok: false, message: "Hotseat bookings are not allowed on weekends." };
    }

    try {
      let resolvedSeatNumber = item.seatNumber || item.id || `WS-04-${String(item.number || 1).padStart(3, "0")}`;
      const numFromId =
        parseInt(String(resolvedSeatNumber).split("-").pop(), 10) ||
        item.number ||
        1;

      let resolvedSeatId = item.seatId;
      if (resolvedSeatId === undefined || resolvedSeatId === null) {
        if (item.modulePrefix === "EO2" || String(resolvedSeatNumber).includes("EO2")) {
          resolvedSeatId = numFromId + 98;
        } else if (item.modulePrefix === "WS-04" || String(resolvedSeatNumber).startsWith("WS")) {
          resolvedSeatId = 0;
        } else {
          resolvedSeatId = numFromId;
        }
      }

      const rawTime = String(expectedCheckIn || "").trim();
      const formattedTime =
        rawTime.length === 5
          ? `${rawTime}:00`
          : rawTime.length > 5
          ? rawTime.slice(0, 8)
          : "";

      const formattedBookingDate = targetDate.includes("T")
        ? targetDate.substring(0, 10)
        : targetDate;

      // Check if backend returned a matching seat in the latest API check
      try {
        const latestSeatsResponse = await fetch(
          `${API_BASE}?date=${formattedBookingDate}`,
          {
            headers: getAuthHeaders(),
          }
        );

        if (latestSeatsResponse.ok) {
          const latestSeatsData = await latestSeatsResponse.json();
          const latestSeats = Array.isArray(latestSeatsData)
            ? latestSeatsData
            : latestSeatsData?.seats || [];

          const latestSeat = latestSeats.find((seat) => {
            const sn = String(seat.seatNumber || "").trim().toUpperCase();
            const targetSn = String(resolvedSeatNumber).trim().toUpperCase();
            if (targetSn && sn === targetSn) return true;

            const itemPrefix = String(item.modulePrefix || "").toUpperCase();
            const itemId = String(item.id || item.seatNumber || "").toUpperCase();

            const isTidel =
              itemPrefix.startsWith("WS") ||
              itemId.startsWith("WS-04") ||
              itemId.includes("TIDEL") ||
              itemId.includes("TIDAL");

            const isMod2 =
              itemPrefix.includes("EO2") ||
              itemId.includes("EO2") ||
              itemId.startsWith("WS-05-EO2");

            const isMod1 = !isTidel && !isMod2;

            if (isTidel) {
              if (sn.includes("EO1") || sn.includes("EO2") || sn.startsWith("WS-05")) return false;
              return parseInt(sn.split("-").pop(), 10) === numFromId;
            }
            if (isMod2) {
              if (!sn.includes("EO2")) return false;
              return parseInt(sn.split("-").pop(), 10) === numFromId;
            }
            if (isMod1) {
              if (!sn.includes("EO1")) return false;
              return parseInt(sn.split("-").pop(), 10) === numFromId;
            }
            return false;
          });

          if (latestSeat) {
            if (latestSeat.seatId !== undefined && latestSeat.seatId !== null) {
              resolvedSeatId = latestSeat.seatId;
            } else if (latestSeat.id !== undefined && latestSeat.id !== null) {
              resolvedSeatId = latestSeat.id;
            }
            if (latestSeat.seatNumber) {
              resolvedSeatNumber = latestSeat.seatNumber;
            }

            const latestStatus = String(latestSeat.status || "").toLowerCase();
            if (
              latestStatus === "booked" ||
              latestStatus === "occupied" ||
              latestStatus === "reserved"
            ) {
              await fetchOfficeData();
              return {
                ok: false,
                message:
                  "This seat was just booked by another user. Please choose another seat.",
              };
            }
          }
        }
      } catch (err) {
        console.warn("Seat availability pre-check failed (continuing to booking):", err);
      }

      const payload = {
        seatId: Number(resolvedSeatId) || 0,
        seatNumber: resolvedSeatNumber,
        bookingDate: formattedBookingDate,
        expectedCheckInTime: formattedTime,
      };

      const response = await fetch(API_BASE, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      let responseData = null;
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }

      if (!response.ok) {
        if (response.status === 409) {
          await fetchOfficeData();

          const conflictMessage =
            responseData?.message ||
            "This seat was just booked by another user. Please choose another seat.";

          if (
            responseData?.existingBookingId ||
            conflictMessage
              .toLowerCase()
              .includes("already have a hotseat booking")
          ) {
            setConflictData({
              ...responseData,
              message: conflictMessage,
            });

            return {
              ok: false,
              message: conflictMessage,
            };
          }

          return {
            ok: false,
            message: conflictMessage,
          };
        }

        let errorMessage = "Failed to reserve hotseat.";
        const fullErrStr = `${responseData?.message || ""} ${responseData?.detail || ""} ${responseData?.title || ""}`.toLowerCase();

        if (
          fullErrStr.includes("uq_seat_booking_date") ||
          fullErrStr.includes("duplicate key") ||
          fullErrStr.includes("unique constraint") ||
          fullErrStr.includes("already booked")
        ) {
          errorMessage = "This seat has already been reserved for the selected date. Please choose another seat.";
          await fetchOfficeData();
        } else if (responseData?.errors) {
          errorMessage = Object.entries(responseData.errors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`)
            .join(" | ");
        } else if (responseData?.title || responseData?.message) {
          errorMessage = responseData.title || responseData.message;
        }

        return { ok: false, message: errorMessage };
      }

      showCustomToast(
        "Booking Confirmed!",
        `Successfully booked ${resolvedSeatNumber} for ${targetDate}. Redirecting to My Bookings...`
      );

      window.dispatchEvent(new Event("booking-updated"));
      await fetchOfficeData();

      // Reconcile the just-booked seat locally so the map becomes RED immediately
      setModules((currentModules) =>
        currentModules.map((module) => ({
          ...module,
          seats: (module.seats || []).map((seat) =>
            seat.id === item.id || seat.seatNumber === resolvedSeatNumber
              ? {
                  ...seat,
                  status: "occupied",
                  isMyBooking: true,
                }
              : seat
          ),
        }))
      );

      seatCacheRef.current.delete(targetDate);

      setTimeout(() => {
        navigate("/my-bookings");
      }, 900);

      return { ok: true };
    } catch (err) {
      console.error("BOOKING ERROR:", err);
      return { ok: false, message: "Network error during reservation." };
    }
  }

  async function editBookingTime(bookingId, changes) {
    if (isWeekend(changes.date)) {
      return { ok: false, message: "Hotseat bookings are not allowed on weekends." };
    }

    try {
      const rawTime = String(changes.expectedCheckIn || "").trim();
      const formattedTime =
        rawTime.length === 5
          ? `${rawTime}:00`
          : rawTime.length > 5
          ? rawTime.slice(0, 8)
          : "";

      const formattedBookingDate = changes.date.includes("T")
        ? changes.date.substring(0, 10)
        : changes.date;

      const numFromId =
        parseInt(String(changes.seatId || "").split("-").pop(), 10) || 1;

      let resolvedSeatId = changes.seatIdNumber;
      if (resolvedSeatId === undefined || resolvedSeatId === null) {
        if (String(changes.seatId).includes("EO2")) {
          resolvedSeatId = numFromId + 98;
        } else if (String(changes.seatId).startsWith("WS")) {
          resolvedSeatId = 0;
        } else {
          resolvedSeatId = numFromId;
        }
      }

      const payload = {
        seatId: Number(resolvedSeatId) || 0,
        seatNumber: changes.seatId,
        bookingDate: formattedBookingDate,
        expectedCheckInTime: formattedTime,
      };

      const response = await fetch(`${API_BASE}/${bookingId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      let responseData = null;
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }

      if (!response.ok) {
        if (response.status === 409) {
          seatCacheRef.current.delete(targetDate);
          await fetchOfficeData(true);

          const conflictMessage =
            responseData?.message ||
            "This booking conflicts with another reservation.";

          return {
            ok: false,
            message: conflictMessage,
          };
        }

        let errorMessage = "Failed to update booking.";
        if (responseData?.errors) {
          errorMessage = Object.entries(responseData.errors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`)
            .join(" | ");
        } else if (responseData?.title || responseData?.message) {
          errorMessage = responseData.title || responseData.message;
        }

        return { ok: false, message: errorMessage };
      }

      showCustomToast("Booking Updated", "Your reservation has been modified.");
      window.dispatchEvent(new Event("booking-updated"));
      seatCacheRef.current.delete(targetDate);
      await fetchOfficeData(true);

      return { ok: true, message: "Booking updated." };
    } catch (err) {
      console.error("UPDATE ERROR:", err);
      return { ok: false, message: "Network error during update." };
    }
  }

  async function cancelHotseat(bookingId) {
    try {
      const response = await fetch(`${API_BASE}/${bookingId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      let responseData = null;
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }

      if (!response.ok) {
        return {
          ok: false,
          message: responseData?.title || "Failed to cancel booking.",
        };
      }

      showCustomToast("Booking Cancelled", "The hotseat is now released.");
      window.dispatchEvent(new Event("booking-updated"));
      seatCacheRef.current.delete(targetDate);
      await fetchOfficeData(true);

      return { ok: true, message: "Cancelled successfully." };
    } catch (err) {
      console.error("CANCEL ERROR:", err);
      return { ok: false, message: "Network error while cancelling." };
    }
  }

  const handleLocateConflictSeat = (conflict) => {
    setConflictData(null);
    const seatIdToFind = conflict?.seatId;
    if (!seatIdToFind) return;

    const sId = String(seatIdToFind).toUpperCase();
    if (sId.includes("WS") || sId.includes("TIDEL") || sId.includes("TIDAL")) {
      setZone("Tidel Park");
      setModuleId("module1");
    } else if (sId.includes("EO2")) {
      setZone("Elcot Park");
      setModuleId("module2");
    } else {
      setZone("Elcot Park");
      setModuleId("module1");
    }

    setTimeout(() => {
      const cleanNum = String(seatIdToFind).split("-").pop().replace(/[^0-9]/g, "");
      const el =
        document.querySelector(`[data-seat-id="${seatIdToFind}"]`) ||
        document.getElementById(`seat-${seatIdToFind}`) ||
        document.querySelector(`[data-seat-num="${cleanNum}"]`);

      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
    }, 200);
  };

  if (loading && modules.length === 0) {
    return (
      <div className="p-10 text-center text-sm text-slate-500">
        Loading office space map...
      </div>
    );
  }

  return (
    <div className="w-full pb-10 relative">
      {toastState && (
        <Toast
          message={toastState.message}
          details={toastState.details}
          onClose={() => setToastState(null)}
        />
      )}

      <ConflictModal
        conflictData={conflictData}
        onClose={() => setConflictData(null)}
        onLocateMyDesk={handleLocateConflictSeat}
      />

      <OfficeMapTab
        modules={modules}
        bookings={bookings}
        onReserve={reserveItem}
        onEdit={editBookingTime}
        onCancel={cancelHotseat}
        setConflictData={setConflictData}
        targetDate={targetDate}
        setTargetDate={setTargetDate}
        location={location}
        setLocation={setLocation}
        zone={zone}
        setZone={setZone}
        moduleId={moduleId}
        setModuleId={setModuleId}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Office Map Cockpit View (Compact Split Layout)
// ---------------------------------------------------------------------------

function OfficeMapTab({
  modules,
  bookings,
  onReserve,
  onEdit,
  onCancel,
  setConflictData,
  targetDate,
  setTargetDate,
  location,
  setLocation,
  zone,
  setZone,
  moduleId,
  setModuleId,
}) {
  const [active, setActive] = useState(null);
  const [filterSection, setFilterSection] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expectedCheckIn, setExpectedCheckIn] = useState("");
  const [bookingResult, setBookingResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelConfirming, setCancelConfirming] = useState(false);

  // Handle Escape key to dismiss active desk modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && active) {
        setActive(null);
        setBookingResult(null);
        setCancelConfirming(false);
      }
    }

    if (active) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [active]);

  const today = getTodayKey();
  const tomorrow = getTomorrowKey();

  const isTidelPark =
    String(zone).toLowerCase().includes("tidel") ||
    String(zone).toLowerCase().includes("tidal");

  const currentModule = isTidelPark
    ? modules.find((m) => m.office === "Tidel Park" || m.office === "Tidal Park") || {
        id: "tidel-module1",
        label: "Module 1",
        office: "Tidel Park",
        seats: Array.from({ length: 224 }, (_, i) => ({
          id: `WS-04-${String(i + 1).padStart(3, "0")}`,
          label: `Seat ${i + 1}`,
          number: i + 1,
          modulePrefix: "WS-04",
          type: "hotseat",
          status: "available",
        })),
      }
    : modules.find((m) => m.id === moduleId && m.office === "Elcot Park") ||
      modules.find((m) => m.id === moduleId);

  const myGlobalBookingForDate = bookings.find((b) => {
    const bookingDateStr = normalizeDateKey(b.bookingDate || b.date || b.expectedCheckIn);
    const status = b.status?.toLowerCase();
    return (
      bookingDateStr === targetDate &&
      status !== "cancelled" &&
      status !== "rejected" &&
      status !== "expired"
    );
  });

  const getBookingLocation = (b) => {
    if (!b) return null;
    const bSeat = String(b.seatNumber || b.seat || "").toUpperCase();
    const bMod = String(b.module || "").toLowerCase();

    if (bSeat.startsWith("WS") || bMod.includes("tidel") || bMod.includes("tidal")) {
      return { office: "Tidel Park", moduleId: "module1", moduleLabel: "Module 1" };
    } else if (bSeat.includes("EO2") || bMod.includes("module 2") || bMod.includes("eo2")) {
      return { office: "Elcot Park", moduleId: "module2", moduleLabel: "Module 2" };
    } else {
      return { office: "Elcot Park", moduleId: "module1", moduleLabel: "Module 1" };
    }
  };

  const myBookingForDate = bookings.find((b) => {
    const bookingDateStr = normalizeDateKey(b.bookingDate || b.date || b.expectedCheckIn);
    const status = b.status?.toLowerCase();
    const bSeat = String(b.seatNumber || b.seat || "").toUpperCase();
    const bMod = String(b.module || "").toLowerCase();

    let belongsToCurrentModule = false;
    if (isTidelPark) {
      belongsToCurrentModule = bSeat.startsWith("WS") || bMod.includes("tidel") || bMod.includes("tidal");
    } else if (moduleId === "module2") {
      belongsToCurrentModule = bSeat.includes("EO2") || bMod.includes("module 2") || bMod.includes("eo2");
    } else {
      belongsToCurrentModule = bSeat.includes("EO1") || (!bSeat.includes("EO2") && !bSeat.startsWith("WS") && (bMod.includes("module 1") || !bMod));
    }

    return (
      bookingDateStr === targetDate &&
      status !== "cancelled" &&
      status !== "rejected" &&
      status !== "expired" &&
      belongsToCurrentModule
    );
  });

  const myBookedSeatNumber = String(
    myBookingForDate?.seatNumber || myBookingForDate?.seat || myBookingForDate?.seatId || ""
  ).trim();

  const normalizeSeat = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/^(hot seat|seat|ws-04-)/i, "")
      .trim();

  const currentSeats = useMemo(() => {
    return (currentModule?.seats || []).map((seat) => {
      const isMine = Boolean(
        myBookingForDate &&
          myBookedSeatNumber &&
          (
            normalizeSeat(myBookedSeatNumber) === normalizeSeat(seat.id) ||
            normalizeSeat(myBookedSeatNumber) === normalizeSeat(seat.number) ||
            myBookedSeatNumber.toLowerCase() === String(seat.id || "").toLowerCase()
          )
      );

      if (active && (seat.id === active.id || seat.number === active.number)) {
        return { ...seat, status: "selected", isMyBooking: isMine };
      }

      if (isMine) {
        return { ...seat, status: "occupied", isMyBooking: true };
      }

      const normalizedStatus = String(seat.status || "").toLowerCase();
      const isBooked =
        normalizedStatus === "occupied" ||
        normalizedStatus === "booked" ||
        normalizedStatus === "confirmed";

      if (isBooked) {
        return { ...seat, status: "occupied", isMyBooking: false };
      }

      if (normalizedStatus === "reserved") {
        return { ...seat, status: "reserved", isMyBooking: false };
      }

      return { ...seat, status: "available", isMyBooking: false };
    });
  }, [currentModule, myBookingForDate, myBookedSeatNumber, active]);

  // Statistics
  const totalSeats = currentSeats.length;
  const occupiedCount = currentSeats.filter((s) => s.status === "occupied" || s.isMyBooking).length;
  const availableCount = Math.max(0, totalSeats - occupiedCount);
  const myBookingCount = myBookingForDate ? 1 : 0;
  const occupancyPercent = totalSeats > 0 ? Math.round((availableCount / totalSeats) * 100) : 0;

  // Handle seat click
  function handleSelectSeat(seat) {
    setBookingResult(null);
    setCancelConfirming(false);

    const isMine = Boolean(
      seat.isMyBooking ||
        (
          myBookingForDate &&
          myBookedSeatNumber &&
          (
            normalizeSeat(myBookedSeatNumber) === normalizeSeat(seat.id) ||
            normalizeSeat(myBookedSeatNumber) === normalizeSeat(seat.number) ||
            myBookedSeatNumber.toLowerCase() === String(seat.id || "").toLowerCase()
          )
        )
    );

    if (isMine) {
      setActive({ ...seat, isMyBooking: true });
      if (myBookingForDate?.expectedCheckInTime) {
        const timeStr = String(myBookingForDate.expectedCheckInTime).substring(0, 5);
        setExpectedCheckIn(timeStr);
      }
      return;
    }

    if (seat.status === "occupied") {
      setActive({ ...seat, status: "occupied", isMyBooking: false });
      return;
    }

    // Global conflict check: block booking immediately if employee has any reservation on this date across all offices/modules
    const conflictBooking = myBookingForDate || myGlobalBookingForDate;
    if (conflictBooking) {
      const loc = getBookingLocation(conflictBooking);
      const isDifferentModule = !myBookingForDate && Boolean(myGlobalBookingForDate);
      const locationMsg = isDifferentModule && loc
        ? ` at ${loc.office} (${loc.moduleLabel})`
        : " for the selected date";

      setConflictData({
        message: `You already have an active hotseat reservation${locationMsg}. You can only hold one hotseat reservation per day.`,
        existingBookingId: conflictBooking.bookingId || conflictBooking.id,
        seatId: conflictBooking.seatNumber || conflictBooking.seat || conflictBooking.seatId,
        bookingStatus: conflictBooking.status || "Confirmed",
        office: loc?.office,
        moduleId: loc?.moduleId,
      });
      return;
    }

    setExpectedCheckIn("");
    setActive(seat);
  }

  // Handle search seat
  function handleSearch(e) {
    e.preventDefault();
    const cleanQuery = searchQuery.trim().toLowerCase();
    if (!cleanQuery) return;

    const found = currentSeats.find((s) => {
      const sId = String(s.id || "").toLowerCase();
      const sNum = String(s.number || "").toLowerCase();
      const sLbl = String(s.label || "").toLowerCase();
      return (
        sId === cleanQuery ||
        sNum === cleanQuery ||
        sLbl === cleanQuery ||
        sId.endsWith(`-${cleanQuery}`) ||
        sId.includes(cleanQuery)
      );
    });

    if (found) {
      handleSelectSeat(found);
    } else {
      setBookingResult({
        ok: false,
        message: `Desk "${searchQuery}" not found in ${currentModule?.label || "current module"}.`,
      });
    }
  }

  // Handle reserve action
  async function handleConfirmReserve() {
    if (!active) return;
    if (isWeekend(targetDate)) {
      setBookingResult({ ok: false, message: "Hotseat bookings are not allowed on weekends." });
      return;
    }
    if (!expectedCheckIn) {
      setBookingResult({ ok: false, message: "Please select an expected check-in time before confirming." });
      return;
    }

    setIsSubmitting(true);
    setBookingResult(null);

    const result = await onReserve({
      item: active,
      targetDate,
      expectedCheckIn,
    });

    setIsSubmitting(false);
    setBookingResult(result);

    if (result.ok) {
      setActive(null);
    }
  }

  // Handle cancel booking action
  async function handleCancelActiveBooking() {
    if (!myBookingForDate) return;
    const bookingId = myBookingForDate.bookingId || myBookingForDate.id || myBookingForDate.hotseatBookingId;
    if (!bookingId) return;

    setIsSubmitting(true);
    const result = await onCancel(bookingId);
    setIsSubmitting(false);
    setBookingResult(result);
    setCancelConfirming(false);
    if (result.ok) {
      setActive(null);
    }
  }

  // Handle update check in time
  async function handleUpdateActiveTime() {
    if (!myBookingForDate || !active) return;
    const bookingId = myBookingForDate.bookingId || myBookingForDate.id || myBookingForDate.hotseatBookingId;

    setIsSubmitting(true);
    const result = await onEdit(bookingId, {
      date: targetDate,
      expectedCheckIn,
      seatId: active.id || active.seatNumber,
      seatIdNumber: active.seatId || active.number,
    });
    setIsSubmitting(false);
    setBookingResult(result);
  }

  // Section choices
  const sectionOptions = isTidelPark
    ? [
        { id: "ALL", label: "All Sections" },
        { id: "A", label: "Section A (1–62)" },
        { id: "B", label: "Section B (63–118)" },
        { id: "C", label: "Section C (119–164)" },
        { id: "D", label: "Section D (165–224)" },
      ]
    : moduleId === "module2"
    ? [
        { id: "ALL", label: "All Sections" },
        { id: "A", label: "Section A (1–59)" },
        { id: "B", label: "Section B (60–79)" },
        { id: "C", label: "Section C (80–131)" },
      ]
    : [
        { id: "ALL", label: "All Sections" },
        { id: "A", label: "Section A (1–32)" },
        { id: "B", label: "Section B (33–58)" },
        { id: "C", label: "Section C (59–98)" },
      ];

  const timePresets = ["10:00", "11:00", "14:00", "16:00", "18:00"];

  return (
    <div className="office-cockpit-container space-y-4">
      {/* 1. TOP HEADER & QUICK SWITCHER */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Hotseat Reservation
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                <Sparkles size={13} /> Live Floor Map
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Select any open workstation on the compact floor plan to reserve immediately.
            </p>
          </div>

          {/* Quick Date Switcher Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (isWeekend(today)) return;
                setTargetDate(today);
                setActive(null);
                setBookingResult(null);
              }}
              disabled={isWeekend(today)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                targetDate === today
                  ? "bg-white text-[#2F6FE0] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              } ${isWeekend(today) ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Calendar size={14} />
              <span>Today ({formatDate(today)})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isWeekend(tomorrow)) return;
                setTargetDate(tomorrow);
                setActive(null);
                setBookingResult(null);
              }}
              disabled={isWeekend(tomorrow)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                targetDate === tomorrow
                  ? "bg-white text-[#2F6FE0] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              } ${isWeekend(tomorrow) ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Calendar size={14} />
              <span>Tomorrow ({formatDate(tomorrow)})</span>
            </button>
          </div>
        </div>

        {/* Location & Module Selector Bars */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <MapPin size={13} className="text-slate-400" /> Office:
            </span>

            {/* Office pills */}
            <button
              type="button"
              onClick={() => {
                setZone("Elcot Park");
                setModuleId("module1");
                setActive(null);
                setFilterSection("ALL");
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
                zone === "Elcot Park"
                  ? "bg-[#2F6FE0] text-white border-[#2F6FE0] shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Elcot Park
            </button>

            <button
              type="button"
              onClick={() => {
                setZone("Tidel Park");
                setModuleId("module1");
                setActive(null);
                setFilterSection("ALL");
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
                isTidelPark
                  ? "bg-[#2F6FE0] text-white border-[#2F6FE0] shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Tidel Park
            </button>
          </div>

          {/* Module Selector (for Elcot Park) */}
          {!isTidelPark && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Building2 size={13} className="text-slate-400" /> Module:
              </span>
              <button
                type="button"
                onClick={() => {
                  setModuleId("module1");
                  setActive(null);
                  setFilterSection("ALL");
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
                  moduleId === "module1"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Module 1 (98 Desks)
              </button>

              <button
                type="button"
                onClick={() => {
                  setModuleId("module2");
                  setActive(null);
                  setFilterSection("ALL");
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
                  moduleId === "module2"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Module 2 (131 Desks)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. REAL-TIME STATS & USER ACTIVE BOOKING NOTIFICATION */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Desks</div>
          <div className="text-xl font-black text-slate-800 mt-0.5">{totalSeats}</div>
        </div>

        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3 shadow-sm">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Available Desks</div>
          <div className="text-xl font-black text-emerald-700 mt-0.5">{availableCount}</div>
        </div>

        <div className="rounded-xl border border-red-200/80 bg-red-50/50 p-3 shadow-sm">
          <div className="text-[11px] font-bold text-red-600 uppercase tracking-wider">Occupied Desks</div>
          <div className="text-xl font-black text-red-700 mt-0.5">{occupiedCount}</div>
        </div>

        <div className="rounded-xl border border-sky-200/80 bg-sky-50/50 p-3 shadow-sm">
          <div className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">Availability Rate</div>
          <div className="text-xl font-black text-sky-700 mt-0.5">{occupancyPercent}%</div>
        </div>
      </div>

      {/* User's existing booking alert banner in current module */}
      {myBookingForDate && (
        <div className="rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50/80 dark:bg-sky-950/40 p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="rounded-full bg-[#2F6FE0] p-1.5 text-white">
              <UserCheck size={16} />
            </div>
            <div className="text-xs text-sky-950 dark:text-sky-200">
              <span className="font-bold">Your Active Hotseat Reservation:</span>{" "}
              <span className="font-mono font-bold bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 px-2 py-0.5 rounded text-sky-800 dark:text-sky-300">
                Desk {myBookingForDate.seatNumber || myBookingForDate.seat}
              </span>{" "}
              on {formatDate(targetDate)} (Check-in: {myBookingForDate.expectedCheckInTime || myBookingForDate.expectedCheckIn || "10:00 AM"})
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setFilterSection("ALL");
                const seatIdToFind = myBookingForDate.seatNumber || myBookingForDate.seat || myBookingForDate.seatId;
                const cleanNum = String(seatIdToFind).split("-").pop().replace(/[^0-9]/g, "");

                const mySeat = currentSeats.find((s) => s.isMyBooking) || currentSeats.find(s => normalizeSeat(s.id) === normalizeSeat(seatIdToFind) || String(s.number) === cleanNum);
                if (mySeat) {
                  handleSelectSeat(mySeat);
                }

                setTimeout(() => {
                  const el =
                    document.querySelector(`[data-seat-id="${seatIdToFind}"]`) ||
                    document.getElementById(`seat-${seatIdToFind}`) ||
                    document.querySelector(`[data-seat-num="${cleanNum}"]`);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
                  }
                }, 100);
              }}
              className="rounded-xl bg-[#2F6FE0] text-white px-3.5 py-1.5 text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <MapPin size={13} />
              <span>Locate My Desk</span>
            </button>
          </div>
        </div>
      )}

      {/* User's existing booking alert banner in a different office or module */}
      {!myBookingForDate && myGlobalBookingForDate && (() => {
        const loc = getBookingLocation(myGlobalBookingForDate);
        return (
          <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="rounded-full bg-amber-600 p-1.5 text-white">
                <AlertTriangle size={16} />
              </div>
              <div className="text-xs text-amber-950 dark:text-amber-200">
                <span className="font-bold">Active Reservation in Another Module/Office:</span>{" "}
                You have{" "}
                <span className="font-mono font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 px-2 py-0.5 rounded text-amber-800 dark:text-amber-300">
                  Desk {myGlobalBookingForDate.seatNumber || myGlobalBookingForDate.seat}
                </span>{" "}
                reserved at <span className="font-bold">{loc?.office} ({loc?.moduleLabel})</span> for {formatDate(targetDate)}.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (loc?.office) setZone(loc.office);
                  if (loc?.moduleId) setModuleId(loc.moduleId);
                  setFilterSection("ALL");
                  const seatIdToFind = myGlobalBookingForDate.seatNumber || myGlobalBookingForDate.seat || myGlobalBookingForDate.seatId;
                  setTimeout(() => {
                    const cleanNum = String(seatIdToFind).split("-").pop().replace(/[^0-9]/g, "");
                    const el =
                      document.querySelector(`[data-seat-id="${seatIdToFind}"]`) ||
                      document.getElementById(`seat-${seatIdToFind}`) ||
                      document.querySelector(`[data-seat-num="${cleanNum}"]`);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
                    }
                  }, 250);
                }}
                className="rounded-xl bg-amber-600 text-white px-3.5 py-1.5 text-xs font-bold hover:bg-amber-700 transition flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <MapPin size={13} />
                <span>Switch & Locate Desk</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* 3. FULL WIDTH INTERACTIVE FLOOR MAP */}
      <div className="w-full rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        {/* Map Controls Header: Section Switcher & Desk Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Section tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Layers size={13} /> View:
            </span>
            {sectionOptions.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setFilterSection(sec.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterSection === sec.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {sec.label}
              </button>
            ))}
          </div>

          {/* Quick seat search */}
          <form onSubmit={handleSearch} className="relative shrink-0">
            <input
              type="text"
              placeholder="Find desk # (e.g. 24)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#2F6FE0] focus:outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            ) : (
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            )}
          </form>
        </div>

        {/* Full Width Floor Map Canvas */}
        <div className="compact-map-canvas custom-scrollbar">
          {isTidelPark && moduleId === "module1" && (
            <FloorMapTidalParkModule1
              seats={currentSeats}
              onSelect={handleSelectSeat}
              activeSeatId={active?.id}
              filterSection={filterSection}
            />
          )}

          {!isTidelPark && moduleId === "module1" && (
            <FloorMapModule1
              seats={currentSeats}
              onSelect={handleSelectSeat}
              activeSeatId={active?.id}
              filterSection={filterSection}
            />
          )}

          {!isTidelPark && moduleId === "module2" && (
            <FloorMapModule2
              seats={currentSeats}
              onSelect={handleSelectSeat}
              activeSeatId={active?.id}
              filterSection={filterSection}
            />
          )}
        </div>

        {/* Interactive Legend Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
              <span className="h-4 w-4 rounded-[5px] bg-emerald-100 border border-emerald-500"></span>
              <span>Available ({availableCount})</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="h-4 w-4 rounded-[5px] bg-red-100 border border-red-300"></span>
              <span>Booked ({occupiedCount})</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
              <span className="h-4 w-4 rounded-[5px] bg-[#2F6FE0] border border-[#1e40af] shadow-sm"></span>
              <span>Selected</span>
            </div>
            {myBookingForDate && (
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="h-4 w-4 rounded-[5px] bg-indigo-600 border border-indigo-800 shadow-sm"></span>
                <span>Your Desk</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <span className="h-4 w-4 rounded-[5px] bg-slate-100 border border-dashed border-slate-300"></span>
              <span>Unavailable</span>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            💡 Click any green desk to configure check-in time and reserve
          </div>
        </div>
      </div>

      {/* 4. CENTERED MODAL DIALOG (Appears when a desk is clicked, portaled directly to body) */}
      {active &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setActive(null);
                setBookingResult(null);
                setCancelConfirming(false);
              }
            }}
          >
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 animate-in zoom-in-95 duration-150 text-slate-900 dark:text-white">
              {/* Top Close Button */}
              <button
                type="button"
                onClick={() => {
                  setActive(null);
                  setBookingResult(null);
                  setCancelConfirming(false);
                }}
                className="absolute right-4 top-4 h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center text-sm font-bold transition"
                aria-label="Close modal"
              >
                ✕
              </button>

              {/* STATE A: AVAILABLE DESK SELECTED */}
              {active.status !== "occupied" && !active.isMyBooking && (
                <div className="flex flex-col gap-5">
                  {/* Header info */}
                  <div className="flex items-center gap-3.5 pr-8">
                    <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-mono font-black text-base shadow-sm shrink-0">
                      {active.number || active.id}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-lg">
                          {active.id || active.label}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-850 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          <Check size={12} /> Available
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {zone} · {currentModule?.label} · {formatDate(targetDate)}
                      </div>
                    </div>
                  </div>

                  {/* Time picker section */}
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 p-4 flex flex-col gap-3">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Clock size={14} className="text-[#2F6FE0]" />
                      Expected Check-In Time
                    </label>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {timePresets.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setExpectedCheckIn(t)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                            expectedCheckIn === t
                              ? "bg-[#2F6FE0] text-white border-[#2F6FE0] shadow-sm"
                              : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    {/* Custom Time Picker */}
                    <div className="w-full mt-1">
                      <ScrollableTimePicker
                        value={expectedCheckIn}
                        onChange={setExpectedCheckIn}
                        selectedDate={targetDate}
                        placeholder="Select Time"
                      />
                    </div>
                  </div>

                  {/* Conflict warning or error */}
                  {bookingResult && !bookingResult.ok && (
                    <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300 font-medium">
                      {bookingResult.message}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setActive(null);
                        setBookingResult(null);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      autoFocus
                      disabled={isSubmitting}
                      onClick={handleConfirmReserve}
                      className="px-5 py-2.5 rounded-xl bg-[#2F6FE0] hover:bg-blue-700 text-white text-xs font-bold shadow-md disabled:opacity-50 transition flex items-center gap-1.5 focus:ring-2 focus:ring-blue-400"
                    >
                      {isSubmitting ? "Booking..." : `Confirm Reservation`}
                    </button>
                  </div>
                </div>
              )}

              {/* STATE B: USER'S OWN BOOKED DESK SELECTED */}
              {active.isMyBooking && (
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-3.5 pr-8">
                    <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-mono font-black text-base shadow-sm shrink-0">
                      {active.number || active.id}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-lg">
                          Desk {active.id || active.label}
                        </span>
                        <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-bold text-white">
                          Your Reservation
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {zone} · {currentModule?.label} · {formatDate(targetDate)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 p-4">
                    <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200 mb-1">
                      Booking Details
                    </div>
                    <div className="text-xs text-indigo-700 dark:text-indigo-300">
                      Check-in time: <b>{myBookingForDate?.expectedCheckInTime || "10:00 AM"}</b>
                    </div>
                  </div>

                  {/* Cancel or Keep options */}
                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {cancelConfirming ? (
                      <div className="flex items-center gap-2 w-full justify-between">
                        <span className="text-xs font-bold text-red-700 dark:text-red-400">Confirm cancellation?</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={handleCancelActiveBooking}
                            className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
                          >
                            {isSubmitting ? "Releasing..." : "Yes, Release Desk"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCancelConfirming(false)}
                            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                          >
                            Keep
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setCancelConfirming(true)}
                          className="px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 text-xs font-bold transition"
                        >
                          Cancel Reservation
                        </button>
                        <button
                          type="button"
                          onClick={() => setActive(null)}
                          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition"
                        >
                          Close
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* STATE C: OCCUPIED DESK */}
              {active.status === "occupied" && !active.isMyBooking && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3.5 pr-8">
                    <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 flex items-center justify-center text-red-700 dark:text-red-300 font-mono font-black text-base shadow-sm shrink-0">
                      {active.number || active.id}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-lg">
                          Desk {active.id || active.label}
                        </span>
                        <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white">
                          Occupied
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {zone} · {currentModule?.label} · {formatDate(targetDate)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 p-3.5 text-xs text-red-700 dark:text-red-300 leading-relaxed">
                    This desk is already reserved by another team member for {formatDate(targetDate)}. Please select any available green desk on the floor map.
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      autoFocus
                      onClick={() => setActive(null)}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-xs font-bold transition"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}