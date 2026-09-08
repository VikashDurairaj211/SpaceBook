import { useEffect, useState, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Card from "../components/common/Card";
import DashboardCard from "../components/cards/DashboardCard";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import { useToast } from "../components/common/ToastProvider";
import { CheckCircle2, AlertCircle, Clock, Search, Building2, Calendar, MapPin, ArrowRight, Sparkles, Layers, Armchair, TrendingUp, ChevronRight } from "lucide-react";
import * as employeeApi from "../api/employee";
import { getMyBookings } from "../api/bookings";
import { getMyHotseatBookings } from "../api/hotseat";
import { getGeminiRecommendation } from "../api/aiRecommendation";
import GeminiBookingBot from "../components/common/GeminiBookingBot";

// Format a booking time for display.
const formatTime = (value) => {
  if (!value) {
    return "";
  }

  const text = String(value).trim();
  let timePart = text;

  if (text.includes("T")) {
    timePart = text.split("T")[1] || "";
  }

  const parts = timePart.split(":");
  if (parts.length >= 2) {
    const h = String(parts[0]).padStart(2, "0");
    const m = String(parts[1]).padStart(2, "0");
    return `${h}:${m}`;
  }

  return timePart.substring(0, 5);
};

const padNumber = (value) => String(value).padStart(2, "0");

const getTodayDateString = (date = new Date()) => {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
};

const isBookingToday = (booking) => {
  if (!booking) return false;
  const rawDate = String(
    booking.bookingDate ||
    booking.date ||
    ""
  );
  const datePart = rawDate.includes("T")
    ? rawDate.split("T")[0]
    : rawDate.substring(0, 10);
  const today = getTodayDateString(new Date());
  return datePart === today;
};

const HOTSEAT_API_BASE = "https://spacebook-505h.onrender.com/api/Hotseat";

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [dashboard, setDashboard] = useState(null);
  const [roomBookings, setRoomBookings] = useState([]);
  const [hotseatBookings, setHotseatBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingInId, setCheckingInId] = useState(null);
  const [geminiReason, setGeminiReason] = useState("");
  const [isGeminiBotOpen, setIsGeminiBotOpen] = useState(false);

  const [modalState, setModalState] = useState({
    open: false,
    type: "confirm", // "confirm" | "success" | "warning" | "error"
    title: "",
    message: "",
    booking: null,
  });

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, open: false }));
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("spacebook_token") || "";

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const [dashboardData, roomData, hotseatData] =
        await Promise.all([
          employeeApi.getDashboard(),
          getMyBookings(),
          getMyHotseatBookings(),
        ]);

      setDashboard(dashboardData);

      const roomList = Array.isArray(roomData)
        ? roomData
        : roomData?.bookings || [];

      const hotseatList = Array.isArray(hotseatData)
        ? hotseatData
        : hotseatData?.bookings || [];

      setRoomBookings(roomList);
      setHotseatBookings(hotseatList);

      // Query Gemini LLM Recommendation in background
      try {
        const combined = [...roomList, ...hotseatList];
        const res = await getGeminiRecommendation({
          userName: user?.name,
          userEmail: user?.email,
          allBookings: combined,
        });
        if (res?.reason) {
          setGeminiReason(res.reason);
        }
      } catch (aiErr) {
        console.warn("Gemini fetch info:", aiErr);
      }
    } catch (err) {
      console.error("Dashboard Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const normalizeStatus = (status) =>
    String(status || "")
      .toLowerCase()
      .replace(/[\s_-]+/g, "");

  const getCheckInDeadline = (booking) => {
    const rawExpected =
      booking?.expectedCheckIn ||
      booking?.expectedCheckInTime ||
      booking?.time;

    if (!rawExpected) return null;

    const expected = new Date(rawExpected);

    if (Number.isNaN(expected.getTime())) {
      const date = String(booking?.date || "").substring(0, 10);
      const time = String(rawExpected).substring(0, 5);

      if (!date || !time) return null;

      const fallback = new Date(`${date}T${time}:00`);

      if (Number.isNaN(fallback.getTime())) return null;

      return new Date(fallback.getTime() + 30 * 60 * 1000);
    }

    return new Date(expected.getTime() + 30 * 60 * 1000);
  };

  const releaseHotseat = async (bookingId) => {
    try {
      const response = await fetch(`${HOTSEAT_API_BASE}/${bookingId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        let errData = null;

        try {
          errData = await response.json();
        } catch {
          errData = null;
        }

        console.error(
          "HOTSEAT RELEASE FAILED:",
          response.status,
          errData
        );

        return false;
      }

      return true;
    } catch (err) {
      console.error("HOTSEAT RELEASE ERROR:", err);
      return false;
    }
  };

  function handleCheckIn(booking) {
    if (!booking?.isHotseat) return;
    if (checkingInId) return;

    const bookingId = booking.rawId || booking.bookingId;
    if (!bookingId) return;

    const status = normalizeStatus(booking.status);
    if (status === "checkedin") return;
    if (!["confirmed", "approved"].includes(status)) return;

    if (!isBookingToday(booking)) {
      setModalState({
        open: true,
        type: "warning",
        title: "Check-In Not Permitted",
        message: "Check-in is only permitted on the day of the reservation.",
        booking: null,
      });
      return;
    }

    const deadline = getCheckInDeadline(booking);

    if (deadline && new Date() > deadline) {
      handleReleaseExpiredHotseat(bookingId);
      return;
    }

    // Open application confirmation popup modal
    setModalState({
      open: true,
      type: "confirm",
      title: "Confirm Hotseat Check-In",
      message: `Are you ready to check in to ${booking.roomName || booking.displayName || "Hot Seat"}?`,
      booking,
    });
  }

  async function handleReleaseExpiredHotseat(bookingId) {
    setCheckingInId(bookingId);
    try {
      const released = await releaseHotseat(bookingId);
      if (released) {
        setModalState({
          open: true,
          type: "warning",
          title: "Check-In Window Expired",
          message: "The 30-minute check-in window has expired. The hotseat reservation has been released for other team members.",
          booking: null,
        });
        await loadDashboard();
      } else {
        setModalState({
          open: true,
          type: "error",
          title: "Check-In Window Expired",
          message: "The check-in window has expired, but the hotseat could not be released automatically.",
          booking: null,
        });
      }
    } finally {
      setCheckingInId(null);
    }
  }

  async function performCheckIn(booking) {
    const bookingId = booking?.rawId || booking?.bookingId;
    if (!bookingId) return;

    try {
      setCheckingInId(bookingId);

      const response = await fetch(
        `${HOTSEAT_API_BASE}/${bookingId}/check-in`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        let errData = null;
        try {
          errData = await response.json();
        } catch {
          errData = null;
        }

        setModalState({
          open: true,
          type: "error",
          title: "Check-In Failed",
          message: errData?.message || errData?.title || "Failed to check in. Please try again.",
          booking: null,
        });
        return;
      }

      // Optimistically update hotseat booking status in local state
      setHotseatBookings((prev) =>
        prev.map((b) => {
          const bId = b.bookingId || b.id;
          if (String(bId) === String(bookingId) || `hotseat-${bId}` === String(bookingId)) {
            return {
              ...b,
              status: "CHECKED IN",
              isCheckedIn: true,
              checkInTime: new Date().toISOString(),
            };
          }
          return b;
        })
      );

      setModalState({
        open: true,
        type: "success",
        title: "Checked In Successfully!",
        message: `You are now checked in to ${booking.roomName || booking.displayName || "your hotseat"} for today. Have a productive day!`,
        booking: null,
      });

      toast.addToast({
        type: "success",
        title: "Checked in successfully!",
        message: `${booking.roomName || booking.displayName || "Hot Seat"} is confirmed.`,
      });

      window.dispatchEvent(new Event("booking-updated"));
      await loadDashboard();
    } catch (err) {
      console.error("CHECK-IN ERROR:", err);
      setModalState({
        open: true,
        type: "error",
        title: "Network Error",
        message: "Unable to connect to the server. Please check your network connection.",
        booking: null,
      });
    } finally {
      setCheckingInId(null);
    }
  }

  // Automatically check for expired confirmed hotseat bookings.
  // This runs once per minute while the Dashboard is open.
  useEffect(() => {
    if (!hotseatBookings.length) return;

    let cancelled = false;

    const releaseExpiredHotseats = async () => {
      const now = new Date();

      const expiredBookings = hotseatBookings.filter((booking) => {
        const status = normalizeStatus(booking.status);

        if (!["confirmed", "approved"].includes(status)) {
          return false;
        }

        const deadline = getCheckInDeadline(booking);

        return deadline && now > deadline;
      });

      if (!expiredBookings.length) return;

      for (const booking of expiredBookings) {
        if (cancelled) return;

        const bookingId = booking.bookingId || booking.id;
        if (!bookingId) continue;

        const released = await releaseHotseat(bookingId);

        if (released) {
          console.log(
            `Hotseat booking ${bookingId} released after the 30-minute check-in window.`
          );
        }
      }

      if (!cancelled) {
        await loadDashboard();
      }
    };

    releaseExpiredHotseats();

    const timer = setInterval(
      releaseExpiredHotseats,
      60 * 1000
    );

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [hotseatBookings]);

  if (user?.role === "Admin") {
    return <Navigate to="/admin/reports" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-600">
        Loading dashboard...
      </div>
    );
  }

  const isInactiveStatus = (status) => {
    const s = String(status || "")
      .toLowerCase()
      .replace(/\s+/g, "");

    return [
      "cancelled",
      "canceled",
      "rejected",
      "released",
      "expired",
    ].includes(s);
  };

  const hotseatIdSet = new Set(
    hotseatBookings.map((h) => String(h.bookingId || h.id))
  );

  const pureRoomBookings = roomBookings.filter((booking) => {
    const id = String(booking.bookingId || booking.id);
    if (hotseatIdSet.has(id)) return false;
    if (booking.seatId || booking.seatNumber || booking.isHotseat === true) return false;
    const name = String(booking.roomName || booking.displayName || "").toLowerCase();
    if (name.includes("hot seat") || name.includes("hotseat")) return false;
    const purpose = String(booking.purpose || "").toLowerCase();
    if (purpose.includes("hotseat")) return false;
    return true;
  });

  const normalizedRoomBookings = pureRoomBookings.map((booking) => ({
    ...booking,
    isHotseat: false,
    bookingId: booking.bookingId || booking.id,

    date:
      booking.bookingDate ||
      booking.date ||
      "",

    time: formatTime(
      booking.startTime ||
        booking.time ||
        ""
    ),

    displayName:
      booking.roomName ||
      booking.room?.roomName ||
      "Reserved Workspace",

    status: booking.status || "",

    endTime: formatTime(
      booking.endTime ||
        ""
    ),
  }));

  const uniqueHotseatMap = new Map();
  hotseatBookings.forEach((b) => {
    const id = String(b.bookingId || b.id || "");
    if (id) {
      uniqueHotseatMap.set(id, b);
    } else {
      uniqueHotseatMap.set(`${b.seatNumber}-${b.bookingDate || b.date}`, b);
    }
  });

  const normalizedHotseatBookings = Array.from(uniqueHotseatMap.values()).map((booking) => ({
    ...booking,
    isHotseat: true,
    bookingId: booking.bookingId || booking.id,

    date:
      booking.bookingDate ||
      booking.date ||
      "",

    time: formatTime(
      booking.expectedCheckIn ||
        booking.expectedCheckInTime ||
        booking.checkInTime ||
        booking.time ||
        ""
    ),

    displayName:
      booking.seatNumber
        ? `Hot Seat ${booking.seatNumber}`
        : booking.roomName || "Hot Seat",

    status: booking.status || "",

    endTime: formatTime(
      booking.expectedCheckIn ||
        booking.expectedCheckInTime ||
        booking.checkInTime ||
        booking.endTime ||
        ""
    ),
  }));

  const allBookingsMap = new Map();
  normalizedRoomBookings.forEach((b) => {
    if (b.bookingId) allBookingsMap.set(`room-${b.bookingId}`, b);
  });
  normalizedHotseatBookings.forEach((b) => {
    if (b.bookingId) allBookingsMap.set(`hotseat-${b.bookingId}`, b);
  });

  const allBookings = Array.from(allBookingsMap.values());

  const pad = (value) => String(value).padStart(2, "0");

  const getLocalDateString = (date = new Date()) => {
    return `${date.getFullYear()}-${pad(
      date.getMonth() + 1
    )}-${pad(date.getDate())}`;
  };

  const parseBookingDateTime = (booking) => {
    if (!booking?.date) {
      return null;
    }

    const rawDate = String(booking.date);
    const datePart = rawDate.substring(0, 10);

    if (!datePart) {
      return null;
    }

    const rawTime = String(booking.time || "");

    if (rawTime.includes("T")) {
      const isoDateTime = new Date(rawTime);

      if (!Number.isNaN(isoDateTime.getTime())) {
        return isoDateTime;
      }
    }

    if (rawDate.includes("T")) {
      const dateTime = new Date(rawDate);

      if (!Number.isNaN(dateTime.getTime())) {
        return dateTime;
      }
    }

    const timePart = rawTime.substring(0, 8);

    if (!timePart) {
      const dateOnly = new Date(
        `${datePart}T00:00:00`
      );

      return Number.isNaN(dateOnly.getTime())
        ? null
        : dateOnly;
    }

    const parsed = new Date(
      `${datePart}T${timePart}`
    );

    return Number.isNaN(parsed.getTime())
      ? null
      : parsed;
  };

  const now = new Date();

  const totalBookings = allBookings.length;

  const upcomingBookings = allBookings.filter((booking) => {
    if (isInactiveStatus(booking.status)) {
      return false;
    }

    const bookingDateTime =
      parseBookingDateTime(booking);

    if (!bookingDateTime) {
      return false;
    }

    return bookingDateTime > now;
  });

  const upcomingCount = upcomingBookings.length;

  const today = getLocalDateString();

  // Today's Meetings only counts meeting rooms (excluding hotseat desk reservations)
  const bookingsToday = allBookings.filter((booking) => {
    if (isInactiveStatus(booking.status)) {
      return false;
    }

    if (booking.isHotseat) {
      return false;
    }

    return (
      String(booking.date || "").substring(0, 10) ===
      today
    );
  }).length;

  // Hotseat Bookings counts active hotseats for today & upcoming
  const hotseatBookingCount =
    normalizedHotseatBookings.filter((booking) => {
      if (isInactiveStatus(booking.status)) {
        return false;
      }

      const bookingDateStr = String(booking.date || "").substring(0, 10);
      return !bookingDateStr || bookingDateStr >= today;
    }).length;

  const getStatusBadgeClass = (status) => {
    const s = status?.toLowerCase() || "";

    if (
      s === "approved" ||
      s === "confirmed" ||
      s === "checkedin" ||
      s === "checked in"
    ) {
      return "bg-[#658362] text-white";
    }

    if (s === "pending") {
      return "bg-[#E09F3E] text-white";
    }

    if (
      s === "rejected" ||
      s === "cancelled" ||
      s === "canceled"
    ) {
      return "bg-[#B85450] text-white";
    }

    return "bg-slate-500 text-white";
  };

  const getDisplayStatus = (booking) => {
    const status = String(booking?.status || "")
      .toLowerCase()
      .replace(/[\s_-]+/g, "");

    if (
      status === "cancelled" ||
      status === "canceled"
    ) {
      return "CANCELLED";
    }

    if (
      status === "checkedin" ||
      status === "checkin" ||
      booking?.checkInTime ||
      booking?.checkedInTime ||
      booking?.checkedInAt ||
      booking?.checkInDate ||
      booking?.checkedIn === true ||
      booking?.isCheckedIn === true ||
      booking?.isCheckIn === true
    ) {
      return "CHECKED IN";
    }

    if (
      status === "approved" ||
      status === "confirmed"
    ) {
      return "APPROVED";
    }

    return booking?.status || "APPROVED";
  };

  // =====================================================
  // ACTIVE & UPCOMING RESERVATIONS (ASCENDING CHRONOLOGICAL ORDER)
  // =====================================================

  /*
   * Shows all active reservations (rooms and hotseats) scheduled for today
   * and upcoming dates, sorted in ascending order (earliest first).
   */
  const activeAndEarlyReservations = allBookings
    .filter((booking) => {
      if (isInactiveStatus(booking.status)) {
        return false;
      }

      const bookingDateStr = String(booking.date || "").substring(0, 10);
      if (!bookingDateStr || bookingDateStr < today) {
        return false;
      }

      return true;
    })
    .map((booking) => ({
      bookingId: booking.isHotseat
        ? `hotseat-${booking.bookingId}`
        : booking.bookingId,

      rawId: booking.bookingId,

      roomName: booking.displayName,

      bookingDate: booking.date,

      startTime: booking.time,

      endTime: booking.endTime || booking.time,

      status: getDisplayStatus(booking),

      isHotseat: booking.isHotseat,
    }))
    .sort((a, b) => {
      const dateA = String(a.bookingDate || "").substring(0, 10);
      const dateB = String(b.bookingDate || "").substring(0, 10);
      const dateCompare = dateA.localeCompare(dateB);
      if (dateCompare !== 0) return dateCompare;

      const timeA = a.startTime || "";
      const timeB = b.startTime || "";
      return timeA.localeCompare(timeB);
    });

  // =====================================================
  // SMART PERSONALIZED SPACE RECOMMENDATION
  // Analyzes employee's real past booking patterns & preferred time/module
  // =====================================================
  const suggestedSpace = (() => {
    const validBookings = allBookings.filter(
      (b) => !isInactiveStatus(b.status)
    );

    const getSuggestedDate = () => {
      const dt = new Date();
      const hour = dt.getHours();
      const day = dt.getDay();
      // If weekday and before 20:00, use today, otherwise next business day
      if (day !== 0 && day !== 6 && hour < 20) {
        return `${dt.getFullYear()}-${padNumber(dt.getMonth() + 1)}-${padNumber(dt.getDate())}`;
      }
      const next = new Date(dt);
      if (day === 5) {
        next.setDate(next.getDate() + 3);
      } else if (day === 6) {
        next.setDate(next.getDate() + 2);
      } else {
        next.setDate(next.getDate() + 1);
      }
      return `${next.getFullYear()}-${padNumber(next.getMonth() + 1)}-${padNumber(next.getDate())}`;
    };

    if (!validBookings.length) {
      const fallbackDate = getSuggestedDate();
      return {
        roomName: "Conference Room 1",
        module: "Module 1 - Elcot Park - CMB",
        roomType: "Conference",
        capacity: 20,
        usualTime: "11:00 AM",
        startTime: "11:00",
        endTime: "12:00",
        date: fallbackDate,
        bookingCount: 0,
        isPersonalized: false,
        reason: "🔥 Trending Workspace across campuses · Ideal for team collaborations & board reviews",
        roomTypeId: "1",
        isHotseat: false,
      };
    }

    const roomCounts = {};
    const timeSlotCounts = {};
    const moduleCounts = {};

    validBookings.forEach((b) => {
      const name = b.displayName || b.roomName || (b.isHotseat ? "Hotseat Desk" : "Conference Room 1");
      roomCounts[name] = (roomCounts[name] || 0) + 1;

      if (b.module) {
        moduleCounts[b.module] = (moduleCounts[b.module] || 0) + 1;
      }

      if (b.time) {
        const hour = String(b.time).substring(0, 2);
        timeSlotCounts[hour] = (timeSlotCounts[hour] || 0) + 1;
      }
    });

    let topRoomName = Object.keys(roomCounts)[0] || "Conference Room 1";
    let maxCount = 0;
    Object.entries(roomCounts).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topRoomName = name;
      }
    });

    let topHour = "11";
    let maxTimeCount = 0;
    Object.entries(timeSlotCounts).forEach(([hour, count]) => {
      if (count > maxTimeCount) {
        maxTimeCount = count;
        topHour = hour;
      }
    });

    const formatHourDisplay = (h) => {
      const num = parseInt(h, 10);
      if (isNaN(num)) return "11:00 AM";
      if (num === 12) return "12:00 PM";
      if (num > 12) return `${num - 12}:00 PM`;
      return `${num}:00 AM`;
    };

    const sampleBooking = validBookings.find(
      (b) => (b.displayName || b.roomName) === topRoomName
    );

    const isHotseat = Boolean(sampleBooking?.isHotseat || topRoomName.toLowerCase().includes("hotseat") || topRoomName.toLowerCase().includes("seat"));
    const module = sampleBooking?.module || Object.keys(moduleCounts)[0] || "Module 1 - Elcot Park - CMB";

    let roomType = "Conference";
    let roomTypeId = "1";
    if (isHotseat) {
      roomType = "Hotseat Desk";
      roomTypeId = "hotseat";
    } else if (topRoomName.toLowerCase().includes("disc")) {
      roomType = "Discussion";
      roomTypeId = "3";
    } else if (topRoomName.toLowerCase().includes("train")) {
      roomType = "Training";
      roomTypeId = "2";
    }

    const numHour = parseInt(topHour, 10) || 11;
    const safeStartHour = Math.min(Math.max(numHour, 10), 21);
    const safeEndHour = Math.min(safeStartHour + 1, 22);
    const startTimeStr = `${padNumber(safeStartHour)}:00`;
    const endTimeStr = `${padNumber(safeEndHour)}:00`;
    const targetDate = getSuggestedDate();

    return {
      roomName: topRoomName,
      module: module,
      roomType: roomType,
      roomTypeId: roomTypeId,
      isHotseat: isHotseat,
      capacity: isHotseat ? 1 : roomType === "Discussion" ? 10 : roomType === "Training" ? 50 : 20,
      usualTime: formatHourDisplay(topHour),
      startTime: startTimeStr,
      endTime: endTimeStr,
      date: targetDate,
      bookingCount: maxCount,
      isPersonalized: true,
      reason: `🎯 Based on your ${maxCount} past reservation${maxCount === 1 ? "" : "s"} · You frequently book around ${formatHourDisplay(topHour)}`,
    };
  })();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Calculate percentage of office workday completed (10:00 to 22:00 = 12 hrs = 720 mins)
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const officeStartMinutes = 10 * 60; // 10:00 AM (600)
  const officeEndMinutes = 22 * 60;   // 10:00 PM (1320)
  const workdayProgress = Math.min(
    100,
    Math.max(
      0,
      Math.round(((currentMinutes - officeStartMinutes) / (officeEndMinutes - officeStartMinutes)) * 100)
    )
  );

  return (
    <div className="space-y-4">
      {/* CUSTOM KEYFRAME ANIMATIONS */}
      <style>{`
        @keyframes waveHand {
          0%, 100% { transform: rotate(0deg); }
          20%, 60% { transform: rotate(14deg); }
          40%, 80% { transform: rotate(-12deg); }
        }
        @keyframes radarPing {
          0% { transform: scale(1); opacity: 0.9; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        .animate-hand-wave {
          animation: waveHand 2.2s ease-in-out infinite;
          transform-origin: 70% 70%;
          display: inline-block;
        }
        .animate-radar-ring {
          animation: radarPing 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>

      {/* HERO COMMAND CENTER BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-sky-50/60 to-indigo-50/40 p-6 shadow-card">
        {/* Subtle Background Glow Mesh */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 h-48 w-48 rounded-full bg-indigo-200/30 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-2">
            {/* LIVE RADAR BADGE */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-slate-200/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs backdrop-blur-xs">
                <Calendar size={13} className="text-sky-600" />
                <span>
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* LIVE RADAR BEACON */}
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/80 px-3 py-1 text-xs font-bold text-emerald-700 shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-radar-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Live Office Radar · 2 Campuses Active</span>
              </div>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <span>{getGreeting()}, {user?.name || "Team Member"}!</span>
              <span className="animate-hand-wave text-2xl sm:text-3xl">👋</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
              Welcome to your smart workspace command center. Reserve conference rooms, book hotseat passes, and view availability in real time.
            </p>

            {/* WORKDAY OPERATING HOURS PROGRESS BAR */}
            <div className="pt-2 max-w-md">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-sky-600" />
                  Office Workday (10:00 – 22:00 IST)
                </span>
                <span className="text-sky-700 font-bold">{workdayProgress}% Completed</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200/80 overflow-hidden p-0.5 border border-slate-300/40">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-1000 shadow-xs"
                  style={{ width: `${workdayProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsGeminiBotOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 px-4 py-3 text-xs font-bold text-white shadow-md shadow-sky-500/25 transition-all hover:scale-[1.03] active:scale-[0.98]"
            >
              <Sparkles size={15} className="text-amber-300 animate-pulse" />
              <span>Book with Aira AI</span>
            </button>

            <Link
              to="/workspace-search"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-800 px-4 py-3 text-xs font-bold shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Search size={15} className="text-sky-600" />
              <span>Search Workspaces</span>
            </Link>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS ROW (3D LIFT & HOLOGRAPHIC GLOW) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          to="/workspace-search"
          className="group relative overflow-hidden rounded-2xl border border-slate-200/85 bg-white p-4 shadow-card hover:shadow-xl hover:border-sky-400 hover:-translate-y-1 transition-all duration-300 flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-sky-500 group-hover:to-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <Building2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                <h2 className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                  Book a Room
                </h2>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-extrabold text-sky-700 whitespace-nowrap shrink-0">15 Rooms</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Conference & Discussion</p>
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-sky-50 group-hover:text-sky-600 transition-all">
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/hotseat-reservation"
          className="group relative overflow-hidden rounded-2xl border border-slate-200/85 bg-white p-4 shadow-card hover:shadow-xl hover:border-indigo-400 hover:-translate-y-1 transition-all duration-300 flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-indigo-500 group-hover:to-purple-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <MapPin size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                <h2 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                  Reserve Hotseat
                </h2>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-extrabold text-indigo-700 whitespace-nowrap shrink-0">453 Desks</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Interactive Floor Plan</p>
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/workspace-availability"
          className="group relative overflow-hidden rounded-2xl border border-slate-200/85 bg-white p-4 shadow-card hover:shadow-xl hover:border-emerald-400 hover:-translate-y-1 transition-all duration-300 flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-emerald-500 group-hover:to-teal-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <Calendar size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                <h2 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Availability Calendar
                </h2>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700 whitespace-nowrap shrink-0">Live Grid</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Live Schedule Matrix</p>
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Upcoming Meetings */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase font-bold tracking-wider text-slate-400">Upcoming</p>
            <p className="mt-0.5 text-2xl font-extrabold text-slate-900">{upcomingCount}</p>
            <p className="text-[10px] text-slate-500 font-medium">Scheduled meetings</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <Clock size={20} />
          </div>
        </div>

        {/* Today's Meetings */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase font-bold tracking-wider text-emerald-600">Today</p>
            <p className="mt-0.5 text-2xl font-extrabold text-emerald-600">{bookingsToday}</p>
            <p className="text-[10px] text-slate-500 font-medium">Happening today</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* RECOMMENDED FOR YOU (SMART WORKSPACE PICK) */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-200/90 bg-gradient-to-r from-white via-sky-50/50 to-indigo-50/40 p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-all">
        {/* Subtle ambient light glow */}
        <div className="absolute top-0 right-0 -mr-10 -mt-10 h-36 w-36 rounded-full bg-gradient-to-br from-sky-300/30 to-indigo-300/30 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-sky-600 to-indigo-600 text-white shadow-xs">
                <Sparkles size={13} />
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                Recommended for You
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-100 to-indigo-100 dark:from-sky-950/60 dark:to-indigo-950/60 border border-sky-200 dark:border-sky-800 px-2.5 py-0.5 text-[10px] font-extrabold text-sky-800 dark:text-sky-300">
                {suggestedSpace.isPersonalized ? "✨ Personalized Pick" : "🔥 Campus Trending"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="font-display text-base font-extrabold text-slate-900 dark:text-white">
                {suggestedSpace.roomName}
              </span>
              <span className="rounded-md bg-white/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 shadow-2xs">
                {suggestedSpace.module}
              </span>
              <span className="rounded-md bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/60 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300">
                {suggestedSpace.capacity} Seats
              </span>
              <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                Usual Time: {suggestedSpace.usualTime}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-0.5 font-medium">
              <span>{geminiReason || suggestedSpace.reason}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={
                suggestedSpace.isHotseat
                  ? `/hotseat-reservation?module=${encodeURIComponent(suggestedSpace.module || "")}&date=${encodeURIComponent(suggestedSpace.date || "")}&time=${encodeURIComponent(suggestedSpace.startTime || "")}`
                  : `/workspace-search?module=${encodeURIComponent(suggestedSpace.module || "")}&roomTypeId=${encodeURIComponent(suggestedSpace.roomTypeId || "")}&roomType=${encodeURIComponent(suggestedSpace.roomType || "")}&capacity=${encodeURIComponent(suggestedSpace.capacity || "")}&date=${encodeURIComponent(suggestedSpace.date || "")}&startTime=${encodeURIComponent(suggestedSpace.startTime || "")}&endTime=${encodeURIComponent(suggestedSpace.endTime || "")}&q=${encodeURIComponent(suggestedSpace.roomName || "")}&autoSearch=true`
              }
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 px-5 py-3 text-xs font-bold text-white shadow-md shadow-sky-500/25 transition-all hover:scale-[1.03] active:scale-[0.98]"
            >
              <Sparkles size={14} />
              <span>{suggestedSpace.isHotseat ? "1-Click Reserve Desk" : "Quick Reserve Space"}</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* ACTIVE & UPCOMING RESERVATIONS */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Active & Upcoming Reservations
            </h2>
            <p className="text-[11px] text-slate-500">Your scheduled workspace and desk bookings</p>
          </div>

          <Link
            to="/my-bookings"
            className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800 transition-colors"
          >
            <span>View all</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/60">
                <th className="px-3 py-2">Workspace / Desk</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Time Slot</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {activeAndEarlyReservations.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-slate-400 text-xs"
                  >
                    No active or upcoming reservations found.
                  </td>
                </tr>
              ) : (
                activeAndEarlyReservations.map((booking) => {
                  const rawStatus = String(booking.status || "").toLowerCase();
                  let statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      {booking.status}
                    </span>
                  );

                  if (rawStatus.includes("cancel") || rawStatus.includes("reject")) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/70 shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                        {booking.status}
                      </span>
                    );
                  } else if (rawStatus.includes("pend")) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/70 shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        {booking.status}
                      </span>
                    );
                  } else if (rawStatus.includes("check")) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                        Checked In
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={booking.bookingId}
                      className="transition-colors hover:bg-sky-50/30 text-xs"
                    >
                      <td className="px-3 py-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          {booking.isHotseat ? (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-indigo-50 text-indigo-600">
                              <Armchair size={13} />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-sky-50 text-sky-600">
                              <Building2 size={13} />
                            </span>
                          )}
                          <span>{booking.roomName || "Reserved Workspace"}</span>
                        </div>
                      </td>

                      <td className="px-3 py-3 font-medium text-slate-600">
                        {booking.bookingDate}
                      </td>

                      <td className="px-3 py-3 font-mono text-[11px] text-slate-600">
                        {formatTime(booking.startTime)}
                        {booking.endTime &&
                        formatTime(booking.endTime) !== formatTime(booking.startTime)
                          ? ` - ${formatTime(booking.endTime)}`
                          : ""}
                      </td>

                      <td className="px-3 py-3 text-center">
                        {statusBadge}
                      </td>

                      <td className="px-3 py-3 text-center">
                        {booking.isHotseat ? (
                          normalizeStatus(booking.status) === "checkedin" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                              <CheckCircle2 size={13} />
                              <span>Checked In</span>
                            </span>
                          ) : ["confirmed", "approved"].includes(
                              normalizeStatus(booking.status)
                            ) && isBookingToday(booking) ? (
                            <button
                              type="button"
                              disabled={checkingInId === (booking.rawId || booking.bookingId)}
                              onClick={() => handleCheckIn(booking)}
                              className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-3 py-1 text-[11px] font-bold text-white hover:from-sky-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-xs"
                            >
                              {checkingInId === (booking.rawId || booking.bookingId)
                                ? "Checking in..."
                                : "Check-In"}
                            </button>
                          ) : ["confirmed", "approved"].includes(
                              normalizeStatus(booking.status)
                            ) ? (
                            <span className="text-[11px] text-slate-400 font-medium select-none">
                              Available on day
                            </span>
                          ) : null
                        ) : (
                          <Link
                            to={`/my-bookings?highlight=${String(booking.bookingId || booking.id || '').replace(/^#/, '')}`}
                            className="text-xs font-semibold text-sky-600 hover:text-sky-800 hover:underline"
                          >
                            Details
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* CHECK-IN APPLICATION POPUP MODAL */}
      <Modal
        open={modalState.open}
        title={modalState.title}
        onClose={closeModal}
        className="max-w-md"
        footer={
          modalState.type === "confirm" ? (
            <>
              <Button
                variant="secondary"
                onClick={closeModal}
                disabled={Boolean(checkingInId)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (modalState.booking) {
                    performCheckIn(modalState.booking);
                  }
                }}
                disabled={Boolean(checkingInId)}
                className="bg-[#2F6FE0] text-white hover:bg-blue-700 font-semibold"
              >
                {checkingInId ? "Checking In..." : "Confirm Check-In"}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={closeModal}
              className="w-full justify-center sm:w-auto"
            >
              Done
            </Button>
          )
        }
      >
        <div className="space-y-4">
          {modalState.type === "success" && (
            <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600 mt-0.5" />
              <p className="text-sm font-medium leading-relaxed">{modalState.message}</p>
            </div>
          )}

          {modalState.type === "warning" && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <Clock className="h-6 w-6 shrink-0 text-amber-600 mt-0.5" />
              <p className="text-sm font-medium leading-relaxed">{modalState.message}</p>
            </div>
          )}

          {modalState.type === "error" && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
              <AlertCircle className="h-6 w-6 shrink-0 text-red-600 mt-0.5" />
              <p className="text-sm font-medium leading-relaxed">{modalState.message}</p>
            </div>
          )}

          {modalState.type === "confirm" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                {modalState.message}
              </p>
              {modalState.booking && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-2 text-slate-700">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">Seat / Room:</span>
                    <span className="font-medium text-slate-900">{modalState.booking.roomName || modalState.booking.displayName || "Hot Seat"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">Location:</span>
                    <span>{modalState.booking.module || "Module 1 - Elcot Park - CMB"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">Date:</span>
                    <span>{modalState.booking.bookingDate || modalState.booking.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">Arrival Time:</span>
                    <span>{formatTime(modalState.booking.startTime || modalState.booking.time) || "16:00"}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* GEMINI AI CONVERSATIONAL BOOKING BOT */}
      <GeminiBookingBot
        isOpen={isGeminiBotOpen}
        onClose={() => setIsGeminiBotOpen(false)}
      />
    </div>
  );
}
