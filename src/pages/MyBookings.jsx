import { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
  Building2,
  Armchair,
  LayoutGrid,
  List,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit2,
  Trash2,
  ArrowRight,
  ChevronRight,
  User,
  RefreshCw,
  Sparkles,
  Layers,
  Check,
  Share2,
} from "lucide-react";

import {
  getMyBookings,
  cancelBooking,
  updateBooking,
} from "../api/bookings";

import {
  getMyHotseatBookings,
  cancelHotseatBooking,
} from "../api/hotseat";

import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import { Field, Input } from "../components/common/Input";
import ScrollableTimePicker from "../components/common/ScrollableTimePicker";
import { useToast } from "../components/common/ToastProvider";

const HOTSEAT_API_BASE = "https://spacebook-505h.onrender.com/api/Hotseat";

export default function MyBookings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState(null); // 'view' | 'edit' | 'cancel' | 'checkin_confirm'
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [checkingInId, setCheckingInId] = useState(null);

  // Filters, Pagination & View State
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All"); // "All" | "Room" | "Hotseat"
  const [statusFilter, setStatusFilter] = useState("All"); // "All" | "Approved" | "Checked In" | "Cancelled" | "Expired"
  const [sortBy, setSortBy] = useState("id_desc"); // "id_desc" | "date_asc" | "date_desc"
  const [viewMode, setViewMode] = useState("table"); // "table" | "grid"
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const toast = useToast();

  useEffect(() => {
    const searchFromUrl =
      searchParams.get("search") ||
      searchParams.get("q") ||
      "";
    if (searchFromUrl) {
      setSearch(searchFromUrl);
    }

    if (
      searchParams.get("highlight") ||
      searchParams.get("id") ||
      searchParams.get("bookingId") ||
      searchParams.get("room") ||
      searchParams.get("seat") ||
      searchParams.get("date")
    ) {
      setDateFilter("All");
      setTypeFilter("All");
      setStatusFilter("All");
    }
  }, [searchParams]);

  const handleSearchChange = (val) => {
    setSearch(val);
    const newParams = new URLSearchParams(searchParams);
    if (val && val.trim()) {
      newParams.set("search", val);
    } else {
      newParams.delete("search");
    }
    setSearchParams(newParams, { replace: true });
  };

  const highlightParam =
    searchParams.get("highlight") ||
    searchParams.get("id") ||
    searchParams.get("bookingId") ||
    "";
  const roomParam = searchParams.get("room") || "";
  const seatParam = searchParams.get("seat") || "";
  const dateParam = searchParams.get("date") || "";
  const searchParam = searchParams.get("search") || searchParams.get("q") || "";
  const [dismissedHighlight, setDismissedHighlight] = useState(false);

  useEffect(() => {
    setDismissedHighlight(false);
  }, [location.search]);

  // Compute matched highlight target across bookingId, room name, seat, date, or query
  const matchedHighlightId = useMemo(() => {
    if (dismissedHighlight) return "";
    if (!highlightParam && !roomParam && !seatParam && !searchParam) return "";

    const cleanHighlight = String(highlightParam || "").replace(/^#/, "").trim().toLowerCase();
    const cleanRoom = String(roomParam || "").trim().toLowerCase();
    const cleanSeat = String(seatParam || "").trim().toLowerCase();
    const cleanDate = String(dateParam || "").trim().toLowerCase();
    const cleanSearch = String(searchParam || "").trim().toLowerCase();

    // 1. Exact match by bookingId
    if (cleanHighlight) {
      const match = bookings.find((b) => {
        const bId = String(b.bookingId ?? b.id ?? "").replace(/^#/, "").trim().toLowerCase();
        return bId === cleanHighlight;
      });
      if (match) return String(match.bookingId ?? match.id ?? "").replace(/^#/, "");
      return cleanHighlight;
    }

    // 2. Match by seat number (with date priority)
    if (cleanSeat) {
      if (cleanDate) {
        const matchWithDate = bookings.find((b) => {
          const sNum = String(b.seatNumber ?? b.seat ?? "").trim().toLowerCase();
          const bDate = String(b.bookingDate || "").trim().toLowerCase();
          return (
            (sNum === cleanSeat || sNum.includes(cleanSeat) || cleanSeat.includes(sNum)) &&
            bDate.includes(cleanDate)
          );
        });
        if (matchWithDate) return String(matchWithDate.bookingId ?? matchWithDate.id ?? "").replace(/^#/, "");
      }
      const match = bookings.find((b) => {
        const sNum = String(b.seatNumber ?? b.seat ?? "").trim().toLowerCase();
        return sNum === cleanSeat || sNum.includes(cleanSeat) || cleanSeat.includes(sNum);
      });
      if (match) return String(match.bookingId ?? match.id ?? "").replace(/^#/, "");
    }

    // 3. Match by room name (with date priority)
    if (cleanRoom) {
      if (cleanDate) {
        const matchWithDate = bookings.find((b) => {
          const rName = String(b.roomName ?? "").trim().toLowerCase();
          const bDate = String(b.bookingDate || "").trim().toLowerCase();
          return (
            (rName.includes(cleanRoom) || cleanRoom.includes(rName)) &&
            bDate.includes(cleanDate)
          );
        });
        if (matchWithDate) return String(matchWithDate.bookingId ?? matchWithDate.id ?? "").replace(/^#/, "");
      }
      const match = bookings.find((b) => {
        const rName = String(b.roomName ?? "").trim().toLowerCase();
        return rName.includes(cleanRoom) || cleanRoom.includes(rName);
      });
      if (match) return String(match.bookingId ?? match.id ?? "").replace(/^#/, "");
    }

    // 4. Match by search text
    if (cleanSearch) {
      const match = bookings.find((b) => {
        const bId = String(b.bookingId ?? b.id ?? "").replace(/^#/, "").trim().toLowerCase();
        const rName = String(b.roomName ?? "").trim().toLowerCase();
        const sNum = String(b.seatNumber ?? b.seat ?? "").trim().toLowerCase();
        const purpose = String(b.purpose ?? b.meetingTitle ?? "").trim().toLowerCase();
        return (
          bId === cleanSearch.replace(/^#/, "") ||
          (rName && rName.includes(cleanSearch)) ||
          (sNum && sNum.includes(cleanSearch)) ||
          (purpose && purpose.includes(cleanSearch))
        );
      });
      if (match) return String(match.bookingId ?? match.id ?? "").replace(/^#/, "");
    }

    return "";
  }, [highlightParam, roomParam, seatParam, dateParam, searchParam, bookings]);

  // Auto-scroll to highlighted booking record
  useEffect(() => {
    if (matchedHighlightId && !loading && bookings.length > 0) {
      const timer = setTimeout(() => {
        const el =
          document.getElementById(`booking-row-${matchedHighlightId}`) ||
          document.getElementById(`booking-card-${matchedHighlightId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [matchedHighlightId, loading, bookings, viewMode]);

  const handleClearHighlight = () => {
    setDismissedHighlight(true);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("highlight");
    newParams.delete("id");
    newParams.delete("bookingId");
    newParams.delete("room");
    newParams.delete("seat");
    newParams.delete("date");
    newParams.delete("search");
    newParams.delete("q");
    setSearch("");
    setSearchParams(newParams, { replace: true });
  };

  const getRoomId = (booking) => {
    if (!booking) return null;
    return (
      booking.roomId ??
      booking.RoomId ??
      booking.roomID ??
      booking.RoomID ??
      booking.room?.roomId ??
      booking.room?.RoomId ??
      booking.room?.id ??
      booking.room?.Id ??
      null
    );
  };

  const getBookingModule = (booking) => {
    if (!booking) return "-";

    const apiModule =
      booking.module ||
      booking.moduleName ||
      booking.Module ||
      booking.room?.module ||
      booking.room?.Module;

    if (apiModule && String(apiModule).trim() !== "" && String(apiModule).trim() !== "-") {
      return String(apiModule).trim();
    }

    const building = String(booking.building || "").toLowerCase();
    const seat = String(booking.seatNumber || booking.roomName || "").toUpperCase();

    if (building.includes("tidel") || building.includes("tidal")) {
      return "Module 1 - Tidel Park - CMB";
    }

    if (building.includes("elcot")) {
      if (seat.includes("EO2")) return "Module 2 - Elcot Park - CMB";
      return "Module 1 - Elcot Park - CMB";
    }

    if (seat.includes("EO2")) {
      return "Module 2 - Elcot Park - CMB";
    }
    if (seat.includes("EO1")) {
      return "Module 1 - Elcot Park - CMB";
    }
    if (seat.startsWith("WS-04") || seat.includes("TIDEL") || seat.includes("TIDAL")) {
      return "Module 1 - Tidel Park - CMB";
    }

    return "-";
  };

  const formatDisplayTime = (time) => {
    if (!time) return "";

    const value = String(time).trim();
    let timePart = value;

    if (value.includes("T")) {
      timePart = value.split("T")[1] || "";
    }

    const segments = timePart.split(":");
    if (segments.length >= 2) {
      const h = String(segments[0]).padStart(2, "0");
      const m = String(segments[1]).padStart(2, "0");
      return `${h}:${m}`;
    }

    return timePart.substring(0, 5);
  };

  const formatApiTime = (time) => {
    if (!time) return "";

    const value = String(time);

    if (value.includes("T")) {
      const timePart = value.split("T")[1] || "";

      return timePart.length === 5 ? `${timePart}:00` : timePart;
    }

    return value.length === 5 ? `${value}:00` : value;
  };

  const getTodayString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const todayString = getTodayString();

  const load = async () => {
    try {
      setLoading(true);

      const [roomResult, hotseatResult] = await Promise.allSettled([
        getMyBookings(),
        getMyHotseatBookings(),
      ]);

      let roomBookings = [];
      let hotseatBookings = [];

      let localTitles = {};
      try {
        localTitles = JSON.parse(
          localStorage.getItem("spacebook_meeting_titles") || "{}"
        );
      } catch (e) {
        // ignore
      }

      const resolveMeetingTitle = (booking) => {
        const keyId = String(
          booking.bookingId ?? booking.id ?? ""
        ).replace(/^#/, "").trim();
        const rId = getRoomId(booking);
        const dateKey = String(
          booking.bookingDate || booking.date || ""
        ).split("T")[0];
        const timeKey = String(
          booking.startTime || booking.time || ""
        ).slice(0, 5);
        const keyRoom = `${rId}_${dateKey}_${timeKey}`;

        const apiTitle =
          booking.meetingTitle ||
          booking.MeetingTitle ||
          booking.title ||
          booking.Title ||
          booking.purpose ||
          booking.Purpose ||
          booking.reason ||
          booking.description ||
          booking.subject ||
          booking.bookingPurpose;

        if (
          apiTitle &&
          String(apiTitle).trim() &&
          String(apiTitle).trim().toLowerCase() !== "meeting" &&
          String(apiTitle).trim().toLowerCase() !== "reserved workspace"
        ) {
          return String(apiTitle).trim();
        }

        if (keyId && localTitles[keyId]) return localTitles[keyId];
        if (keyRoom && localTitles[keyRoom]) return localTitles[keyRoom];
        return apiTitle && String(apiTitle).trim()
          ? String(apiTitle).trim()
          : "Reserved Workspace";
      };

      if (roomResult.status === "fulfilled") {
        const data = roomResult.value;
        const bookingList = Array.isArray(data)
          ? data
          : data?.bookings || data?.data || [];

        roomBookings = bookingList.map((booking) => {
          const resolvedTitle = resolveMeetingTitle(booking);
          return {
            ...booking,
            bookingId:
              booking.bookingId ??
              booking.id ??
              booking.Id,
            meetingTitle: resolvedTitle,
            purpose: resolvedTitle,
            bookingDate:
              booking.bookingDate ??
              booking.date ??
              "",
            startTime:
              booking.startTime ??
              booking.time ??
              "",
            endTime:
              booking.endTime ??
              "",
            roomName:
              booking.roomName ||
              booking.room?.roomName ||
              booking.room?.name ||
              `Room ${getRoomId(booking) || ""}`,
            roomId: getRoomId(booking),
            isHotseat: false,
          };
        });
      } else {
        console.error("Room bookings error:", roomResult.reason);
      }

      if (hotseatResult.status === "fulfilled") {
        const data = hotseatResult.value;
        const bookingList = Array.isArray(data)
          ? data
          : data?.bookings || [];

        hotseatBookings = bookingList.map((booking) => {
          const hotseatTime =
            booking.expectedCheckIn ??
            booking.expectedCheckInTime ??
            booking.startTime ??
            "";

          const seatNum =
            booking.seatNumber ||
            booking.seat ||
            booking.seatCode ||
            (booking.roomName && String(booking.roomName).includes("Hot Seat")
              ? String(booking.roomName).replace("Hot Seat", "").trim()
              : "") ||
            "";

          let resolvedModule =
            booking.module ||
            booking.moduleName ||
            booking.Module ||
            "";

          const seatUpper = String(seatNum).toUpperCase();
          const building = String(booking.building || "").toLowerCase();

          if (!resolvedModule || resolvedModule === "-" || resolvedModule === "null") {
            if (building.includes("tidel") || building.includes("tidal")) {
              resolvedModule = "Module 1 - Tidel Park - CMB";
            } else if (building.includes("elcot")) {
              resolvedModule = seatUpper.includes("EO2")
                ? "Module 2 - Elcot Park - CMB"
                : "Module 1 - Elcot Park - CMB";
            } else if (seatUpper.includes("EO2")) {
              resolvedModule = "Module 2 - Elcot Park - CMB";
            } else if (seatUpper.includes("EO1")) {
              resolvedModule = "Module 1 - Elcot Park - CMB";
            } else if (seatUpper.startsWith("WS-04") || seatUpper.includes("TIDEL") || seatUpper.includes("TIDAL")) {
              resolvedModule = "Module 1 - Tidel Park - CMB";
            } else {
              resolvedModule = "-";
            }
          }

          return {
            ...booking,
            bookingId:
              booking.bookingId ??
              booking.id ??
              booking.Id,
            isHotseat: true,
            bookingDate:
              booking.bookingDate ??
              booking.date ??
              "",
            startTime:
              booking.startTime ??
              booking.expectedCheckIn ??
              booking.expectedCheckInTime ??
              "",
            endTime:
              booking.endTime ??
              booking.expectedCheckIn ??
              booking.expectedCheckInTime ??
              "",
            expectedCheckIn: hotseatTime,
            roomName:
              booking.roomName ||
              (seatNum ? `Hot Seat ${seatNum}` : "Hot Seat"),
            module: resolvedModule,
            meetingTitle: "Hotseat Reservation",
            purpose: "Hotseat Reservation",
            roomId: null,
            seatId: booking.seatId,
            seatNumber: seatNum,
            checkInTime: booking.checkInTime ?? null,
            releasedOn: booking.releasedOn ?? null,
          };
        });
      } else {
        console.error("Hotseat bookings error:", hotseatResult.reason);
      }

      const hotseatIdSet = new Set(
        hotseatBookings.map((h) => String(h.bookingId))
      );

      const pureRoomBookings = roomBookings.filter((rb) => {
        const id = String(rb.bookingId);
        if (hotseatIdSet.has(id)) return false;
        if (rb.seatId || rb.seatNumber || rb.isHotseat === true) return false;
        const name = String(rb.roomName || "").toLowerCase();
        if (name.includes("hot seat") || name.includes("hotseat")) return false;
        const purpose = String(rb.purpose || "").toLowerCase();
        if (purpose.includes("hotseat")) return false;
        return true;
      });

      const combinedMap = new Map();
      pureRoomBookings.forEach((b) => {
        if (b.bookingId) combinedMap.set(`room-${b.bookingId}`, b);
      });
      hotseatBookings.forEach((b) => {
        if (b.bookingId) combinedMap.set(`hotseat-${b.bookingId}`, b);
      });

      const combinedBookings = Array.from(combinedMap.values());

      const sorted = [...combinedBookings].sort(
        (a, b) => Number(b.bookingId || 0) - Number(a.bookingId || 0)
      );

      setBookings(sorted);
    } catch (err) {
      console.error("Error loading bookings:", err);
      setBookings([]);
      toast.addToast({
        type: "error",
        title: "Unable to load bookings.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const handleRefresh = () => {
      load();
    };

    window.addEventListener("booking-updated", handleRefresh);
    return () => {
      window.removeEventListener("booking-updated", handleRefresh);
    };
  }, []);

  const getDisplayStatus = (booking) => {
    const status = String(booking?.status || "")
      .toLowerCase()
      .replace(/[\s_-]+/g, "");

    if (status === "cancelled" || status === "canceled") {
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

    if (status === "expired") {
      return "EXPIRED";
    }

    if (status === "approved" || status === "confirmed") {
      return "APPROVED";
    }

    return (booking?.status || "APPROVED").toUpperCase();
  };

  const getStatusBadgeClass = (status) => {
    const s = String(status || "").toLowerCase().replace(/[\s_-]+/g, "");

    if (s === "approved" || s === "confirmed" || s === "available") {
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    }
    if (s === "checkedin" || s === "checkin") {
      return "bg-sky-50 text-sky-700 border border-sky-200 font-bold";
    }
    if (s === "pending") {
      return "bg-amber-50 text-amber-700 border border-amber-200";
    }
    if (s === "expired") {
      return "bg-orange-50 text-orange-700 border border-orange-200";
    }
    if (s === "rejected" || s === "cancelled" || s === "canceled") {
      return "bg-rose-50 text-rose-700 border border-rose-200";
    }
    return "bg-slate-50 text-slate-700 border border-slate-200";
  };

  const canModifyBooking = (booking) => {
    if (!booking) return false;

    const displayStatus = getDisplayStatus(booking);
    if (
      displayStatus === "CANCELLED" ||
      displayStatus === "CHECKED IN" ||
      displayStatus === "REJECTED" ||
      displayStatus === "EXPIRED"
    ) {
      return false;
    }

    const status = booking.status?.toLowerCase() || "";
    if (
      status === "cancelled" ||
      status === "canceled" ||
      status === "rejected" ||
      status === "expired" ||
      status === "checkedin" ||
      status === "checked in" ||
      booking.checkInTime ||
      booking.checkedIn === true ||
      booking.isCheckedIn === true
    ) {
      return false;
    }

    if (!booking.bookingDate) {
      return false;
    }

    const bookingDateOnly = String(booking.bookingDate).split("T")[0];

    if (bookingDateOnly > todayString) {
      return true;
    }

    if (bookingDateOnly < todayString) {
      return false;
    }

    const bookingTime = booking.isHotseat
      ? booking.expectedCheckIn || booking.startTime
      : booking.startTime;

    if (!bookingTime) {
      return true;
    }

    const time = formatDisplayTime(bookingTime);
    if (!time) {
      return true;
    }

    const [hours, minutes] = time.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return true;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const bookingMinutes = hours * 60 + minutes;

    return bookingMinutes > currentMinutes;
  };

  // Hotseat Check-In Validation & Execution
  const canCheckInHotseat = (booking) => {
    if (!booking || !booking.isHotseat) return false;
    const status = getDisplayStatus(booking);
    if (status !== "APPROVED") return false;

    const bookingDateOnly = String(booking.bookingDate).split("T")[0];
    if (bookingDateOnly !== todayString) return false;

    const rawExpected = booking.expectedCheckIn || booking.startTime || "10:00";
    const timeStr = formatDisplayTime(rawExpected);
    if (!timeStr) return true;

    const [h, m] = timeStr.split(":").map(Number);
    if (isNaN(h)) return true;

    const expectedDate = new Date();
    expectedDate.setHours(h, m || 0, 0, 0);
    const deadline = new Date(expectedDate.getTime() + 30 * 60 * 1000);

    return new Date() <= deadline;
  };

  const handleTriggerCheckIn = (booking) => {
    setSelected(booking);
    setMode("checkin_confirm");
  };

  const executeHotseatCheckIn = async (booking) => {
    if (!booking?.bookingId) return;

    try {
      setCheckingInId(booking.bookingId);
      const token = localStorage.getItem("spacebook_token") || "";

      const response = await fetch(
        `${HOTSEAT_API_BASE}/${booking.bookingId}/check-in`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        let errData = null;
        try {
          errData = await response.json();
        } catch {
          errData = null;
        }
        throw new Error(errData?.message || errData?.title || "Check-in failed.");
      }

      toast.addToast({
        type: "success",
        title: "Checked In Successfully!",
        message: `Welcome to ${booking.roomName || "Hot Seat"}. Have a productive day!`,
      });

      closeModal();
      window.dispatchEvent(new Event("booking-updated"));
      await load();
    } catch (err) {
      console.error("Hotseat check-in error:", err);
      toast.addToast({
        type: "error",
        title: "Check-in Failed",
        message: err.message || "Unable to check in at this moment.",
      });
    } finally {
      setCheckingInId(null);
    }
  };

  const getDuration = (booking) => {
    if (!booking) return "-";

    if (booking.isHotseat) {
      if (booking.checkInTime && booking.releasedOn) {
        const start = new Date(booking.checkInTime);
        const end = new Date(booking.releasedOn);
        const diffMins = Math.round((end - start) / (1000 * 60));
        if (diffMins <= 0) return "-";
        const hrs = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        if (hrs > 0) {
          return `${hrs}h${mins > 0 ? ` ${mins}m` : ""}`;
        }
        return `${mins}m`;
      }
      return "Full Day";
    }

    const start = booking.startTime;
    const end = booking.endTime;
    if (!start || !end) return "-";

    const startTimeStr = formatDisplayTime(start);
    const endTimeStr = formatDisplayTime(end);
    const [startH, startM] = startTimeStr.split(":").map(Number);
    const [endH, endM] = endTimeStr.split(":").map(Number);

    if (Number.isNaN(startH) || Number.isNaN(endH)) return "-";

    let diffMins = endH * 60 + (endM || 0) - (startH * 60 + (startM || 0));
    if (diffMins < 0) diffMins += 24 * 60;

    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;

    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

  const handleAddToOutlookWeb = (booking) => {
    if (!booking) return;

    try {
      const isHotseat = booking.isHotseat;
      const title = isHotseat
        ? `Hotseat Reservation (${booking.seatNumber || "Desk"})`
        : booking.meetingTitle || booking.purpose || "Workspace Reservation";
      const location = `${booking.roomName || "Workspace"} - ${getBookingModule(booking)}`;
      const datePart = String(booking.bookingDate || "").split("T")[0] || new Date().toISOString().split("T")[0];

      const sTime = formatDisplayTime(booking.startTime || booking.expectedCheckIn || "10:00") || "10:00";
      const eTime = formatDisplayTime(booking.endTime || "18:00") || "18:00";

      const startIso = `${datePart}T${sTime}:00`;
      const endIso = `${datePart}T${eTime}:00`;
      const body = `Spacebook Reservation ${String(booking.bookingId || "").replace(/^#/, "")}\nLocation: ${location}\nPurpose: ${booking.purpose || title}`;

      const outlookUrl = `https://outlook.office.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&location=${encodeURIComponent(location)}&startdt=${encodeURIComponent(startIso)}&enddt=${encodeURIComponent(endIso)}&body=${encodeURIComponent(body)}`;

      window.open(outlookUrl, "_blank", "noopener,noreferrer");

      toast.addToast({
        type: "success",
        title: "Opening Outlook Calendar",
        message: "Opening Microsoft 365 Outlook to save this event.",
      });
    } catch (err) {
      console.error("Outlook Web calendar export error:", err);
      toast.addToast({
        type: "error",
        title: "Could not open Outlook",
        message: "Please try downloading the .ICS file instead.",
      });
    }
  };

  const handleCopyPassSummary = (booking) => {
    if (!booking) return;
    try {
      const cleanId = String(booking.bookingId ?? "").replace(/^#/, "");
      const title = booking.isHotseat
        ? `Hot Seat ${booking.seatNumber || ""}`
        : booking.roomName || `Room ${getRoomId(booking) || ""}`;
      const purpose = booking.isHotseat
        ? "Hotseat Reservation"
        : booking.meetingTitle || booking.purpose || "Workspace Reservation";
      const timeStr = booking.isHotseat
        ? formatDisplayTime(booking.expectedCheckIn || booking.startTime)
        : `${formatDisplayTime(booking.startTime)} - ${formatDisplayTime(booking.endTime)}`;
      const moduleStr = getBookingModule(booking);

      const summary = `🎟️ SpaceBook Reservation Pass\n• Pass ID: ${cleanId}\n• Workspace: ${title}\n• Campus / Module: ${moduleStr}\n• Date: ${booking.bookingDate}\n• Time: ${timeStr}\n• Purpose: ${purpose}\n• Status: ${getDisplayStatus(booking)}`;

      navigator.clipboard.writeText(summary).then(() => {
        toast.addToast({
          type: "success",
          title: "Pass summary copied to clipboard!",
          message: "You can paste this in Slack or Teams.",
        });
      }).catch(() => {
        toast.addToast({
          type: "info",
          title: "Pass Details",
          message: summary,
        });
      });
    } catch (err) {
      console.error("Copy summary error:", err);
    }
  };

  const handleView = (booking) => {
    setSelected({
      ...booking,
      roomId: getRoomId(booking),
    });
    setMode("view");
  };

  const handleEdit = (booking) => {
    setSelected({
      ...booking,
      roomId: getRoomId(booking),
    });
    setMode("edit");
  };

  const closeModal = () => {
    setMode(null);
    setSelected(null);
    setCancelReason("");
  };

  async function cancel() {
    if (!selected?.bookingId) return;

    const cleanId = Number(String(selected.bookingId).replace(/^#/, "").trim());
    if (!cleanId || isNaN(cleanId)) {
      toast.addToast({
        type: "error",
        title: "Invalid booking ID.",
      });
      return;
    }

    if (!selected?.isHotseat && (!cancelReason || !cancelReason.trim())) {
      toast.addToast({
        type: "error",
        title: "Cancellation reason is required.",
      });
      return;
    }

    setCancelling(true);

    try {
      if (selected.isHotseat) {
        await cancelHotseatBooking(cleanId);
        toast.addToast({
          type: "success",
          title: "Hotseat booking cancelled successfully.",
        });
      } else {
        await cancelBooking(cleanId, { reason: cancelReason.trim() });
        toast.addToast({
          type: "success",
          title: "Booking cancelled successfully.",
        });
      }

      closeModal();
      window.dispatchEvent(new Event("booking-updated"));
      await load();
    } catch (err) {
      console.error("Cancel booking error:", err);
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.response?.data?.title ||
        err.message ||
        "Unable to cancel booking.";

      toast.addToast({
        type: "error",
        title: errorMsg,
      });
    } finally {
      setCancelling(false);
    }
  }

  const validateBookingDate = (date) => {
    if (!date) {
      toast.addToast({
        type: "error",
        title: "Booking date is required.",
      });
      return false;
    }

    if (date < todayString) {
      toast.addToast({
        type: "error",
        title: "You cannot select a past date.",
      });
      return false;
    }

    const selectedDate = new Date(`${date}T00:00:00`);
    const day = selectedDate.getDay();

    if (day === 0 || day === 6) {
      toast.addToast({
        type: "error",
        title: "Bookings are not allowed on Saturdays and Sundays.",
      });
      return false;
    }

    return true;
  };

  const validateBookingTime = (date, startTime, endTime) => {
    if (!startTime || !endTime) {
      toast.addToast({
        type: "error",
        title: "Start time and end time are required.",
      });
      return false;
    }

    const OFFICE_START = "10:00";
    const OFFICE_END = "22:00";

    if (startTime < OFFICE_START) {
      toast.addToast({
        type: "error",
        title: "Start time cannot be before 10:00.",
      });
      return false;
    }

    if (endTime > OFFICE_END) {
      toast.addToast({
        type: "error",
        title: "End time cannot be after 22:00.",
      });
      return false;
    }

    if (startTime >= endTime) {
      toast.addToast({
        type: "error",
        title: "End time must be after start time.",
      });
      return false;
    }

    if (date === todayString) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [startHour, startMinute] = startTime.split(":").map(Number);
      const startTotalMinutes = startHour * 60 + startMinute;

      if (startTotalMinutes <= currentMinutes) {
        toast.addToast({
          type: "error",
          title: "You cannot select a past time for today's booking.",
        });
        return false;
      }
    }

    return true;
  };

  const getHotseatSeatId = (booking) => {
    if (!booking) return null;

    if (
      booking.seatId !== undefined &&
      booking.seatId !== null &&
      booking.seatId !== "" &&
      Number(booking.seatId) > 0
    ) {
      const id = Number(booking.seatId);
      if (!Number.isNaN(id)) return id;
    }

    if (booking.seatNumber) {
      const sn = String(booking.seatNumber).trim().toUpperCase();
      const numFromId = parseInt(sn.split("-").pop(), 10) || 1;

      if (sn.includes("EO2")) {
        return numFromId + 98;
      } else if (
        sn.startsWith("WS") ||
        sn.includes("TIDEL") ||
        sn.includes("TIDAL")
      ) {
        return numFromId + 229;
      } else {
        return numFromId;
      }
    }

    return null;
  };

  const updateHotseat = async () => {
    if (!selected?.bookingId) {
      throw new Error("Hotseat booking ID is missing.");
    }

    const seatId = getHotseatSeatId(selected);
    if (seatId === null || seatId === undefined || Number.isNaN(seatId)) {
      throw new Error("Hotseat Seat ID is missing.");
    }

    if (!validateBookingDate(selected.bookingDate)) {
      return false;
    }

    const rawTime =
      selected.expectedCheckIn || selected.startTime || "";
    const formattedTime = formatApiTime(formatDisplayTime(rawTime));

    if (!formattedTime) {
      toast.addToast({
        type: "error",
        title: "Expected check-in time is required.",
      });
      return false;
    }

    const payload = {
      seatId: Number(seatId),
      bookingDate: selected.bookingDate,
      expectedCheckInTime: formattedTime,
    };

    const token = localStorage.getItem("spacebook_token") || "";
    const baseUrl =
      import.meta.env.VITE_API_BASE_URL || "https://spacebook-505h.onrender.com";

    const response = await fetch(
      `${baseUrl}/api/Hotseat/${selected.bookingId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      let message = "Failed to update hotseat booking.";
      try {
        const errorData = await response.json();
        message =
          errorData?.message ||
          errorData?.title ||
          errorData?.detail ||
          message;
      } catch {
        // Ignore JSON parsing error
      }
      throw new Error(message);
    }

    return true;
  };

  useEffect(() => {
    if (!mode || mode === "details") return;

    function handleKeyDown(e) {
      if (e.key === "Enter") {
        const targetTag = e.target?.tagName?.toLowerCase();
        if (targetTag === "textarea") return;

        if (mode === "cancel") {
          e.preventDefault();
          cancel();
        } else if (mode === "edit") {
          e.preventDefault();
          save(e);
        } else if (mode === "checkin_confirm") {
          e.preventDefault();
          executeHotseatCheckIn(selected);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, selected, cancelReason]);

  async function save(e) {
    if (e?.preventDefault) {
      e.preventDefault();
    }
    if (!selected) return;

    try {
      if (selected.isHotseat) {
        const updated = await updateHotseat();
        if (!updated) return;

        toast.addToast({
          type: "success",
          title: "Hotseat booking updated successfully.",
        });

        closeModal();
        window.dispatchEvent(new Event("booking-updated"));
        await load();
        return;
      }

      const roomId = getRoomId(selected);
      if (!selected.bookingId) {
        toast.addToast({
          type: "error",
          title: "Booking ID is missing.",
        });
        return;
      }

      if (roomId === null || roomId === undefined || roomId === "") {
        toast.addToast({
          type: "error",
          title: "Room ID is missing from this booking.",
        });
        return;
      }

      if (!validateBookingDate(selected.bookingDate)) {
        return;
      }

      const startTime = formatDisplayTime(selected.startTime);
      const endTime = formatDisplayTime(selected.endTime);

      if (!validateBookingTime(selected.bookingDate, startTime, endTime)) {
        return;
      }

      const payload = {
        roomId: Number(roomId),
        bookingDate: selected.bookingDate,
        startTime: formatApiTime(startTime),
        endTime: formatApiTime(endTime),
        meetingTitle:
          selected.meetingTitle?.trim() ||
          selected.purpose?.trim() ||
          "Meeting",
        purpose:
          selected.meetingTitle?.trim() ||
          selected.purpose?.trim() ||
          "Meeting",
        participantCount: Number(selected.participantCount || 1),
      };

      await updateBooking(selected.bookingId, payload);

      try {
        const savedTitles = JSON.parse(
          localStorage.getItem("spacebook_meeting_titles") || "{}"
        );
        if (selected.bookingId) {
          savedTitles[
            String(selected.bookingId).replace(/^#/, "").trim()
          ] = selected.purpose.trim();
        }
        const rId = getRoomId(selected);
        const dateKey = String(selected.bookingDate || "").split("T")[0];
        const timeKey = String(selected.startTime || "").slice(0, 5);
        savedTitles[`${rId}_${dateKey}_${timeKey}`] = selected.purpose.trim();
        localStorage.setItem(
          "spacebook_meeting_titles",
          JSON.stringify(savedTitles)
        );
      } catch (e) {
        // ignore
      }

      toast.addToast({
        type: "success",
        title: "Booking updated successfully.",
      });

      closeModal();
      window.dispatchEvent(new Event("booking-updated"));
      await load();
    } catch (err) {
      console.error("Update booking error:", err);

      let errorTitle =
        err.response?.data?.message ||
        err.response?.data?.title ||
        err.message ||
        "Unable to update booking.";

      const lowerMsg = String(errorTitle).toLowerCase();
      if (
        (lowerMsg.includes("accommodate") ||
          lowerMsg.includes("capacity") ||
          lowerMsg.includes("overlap") ||
          lowerMsg.includes("conflict") ||
          lowerMsg.includes("no room can")) &&
        (lowerMsg.includes("participant") || lowerMsg.includes("no room can"))
      ) {
        errorTitle =
          "The selected room is already booked for the selected time period. Please choose another room or time.";
      }

      toast.addToast({
        type: "error",
        title: errorTitle,
      });
    }
  }

  // Summary Metrics
  const stats = useMemo(() => {
    const total = bookings.length;
    const upcoming = bookings.filter((b) => {
      const bDate = String(b.bookingDate || "").split("T")[0];
      const status = getDisplayStatus(b);
      return bDate >= todayString && status !== "CANCELLED" && status !== "EXPIRED";
    }).length;

    const rooms = bookings.filter((b) => !b.isHotseat).length;
    const hotseats = bookings.filter((b) => b.isHotseat).length;
    const checkedInToday = bookings.filter((b) => {
      const bDate = String(b.bookingDate || "").split("T")[0];
      return bDate === todayString && getDisplayStatus(b) === "CHECKED IN";
    }).length;

    return { total, upcoming, rooms, hotseats, checkedInToday };
  }, [bookings, todayString]);

  // Filter & Sort Bookings
  const filteredBookings = useMemo(() => {
    const query = search.toLowerCase().trim();

    const filtered = bookings.filter((b) => {
      const rawBookingId = String(b.bookingId ?? "").replace(/^#/, "").toLowerCase();
      if (matchedHighlightId && rawBookingId === String(matchedHighlightId).toLowerCase()) {
        return true;
      }

      // 1. Search text filter
      const text = [
        String(b.bookingId ?? ""),
        b.roomName,
        b.module,
        b.purpose,
        b.meetingTitle,
        b.bookingDate,
        b.status,
        b.seatNumber ? `Hot Seat ${b.seatNumber}` : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || text.includes(query);

      // 2. Type filter
      let matchesType = true;
      if (typeFilter === "Room") matchesType = !b.isHotseat;
      if (typeFilter === "Hotseat") matchesType = b.isHotseat;

      // 3. Status filter
      let matchesStatus = true;
      if (statusFilter !== "All") {
        const currentDisplay = getDisplayStatus(b);
        if (statusFilter === "Approved") {
          matchesStatus = currentDisplay === "APPROVED";
        } else if (statusFilter === "Checked In") {
          matchesStatus = currentDisplay === "CHECKED IN";
        } else if (statusFilter === "Cancelled") {
          matchesStatus = currentDisplay === "CANCELLED";
        } else if (statusFilter === "Expired") {
          matchesStatus = currentDisplay === "EXPIRED";
        }
      }

      // 4. Date filter
      let matchesDate = true;
      if (b.bookingDate) {
        const bookingDateOnly = String(b.bookingDate).split("T")[0];
        if (dateFilter === "Today") {
          matchesDate = bookingDateOnly === todayString;
        } else if (dateFilter === "Upcoming") {
          matchesDate = bookingDateOnly > todayString;
        } else if (dateFilter === "Past") {
          matchesDate = bookingDateOnly < todayString;
        }
      } else if (dateFilter !== "All") {
        matchesDate = false;
      }

      return matchesSearch && matchesType && matchesStatus && matchesDate;
    });

    // Sorting
    return filtered.sort((a, b) => {
      if (sortBy === "id_desc") {
        return Number(b.bookingId || 0) - Number(a.bookingId || 0);
      }
      if (sortBy === "date_asc") {
        const dateA = String(a.bookingDate || "") + (a.startTime || "");
        const dateB = String(b.bookingDate || "") + (b.startTime || "");
        return dateA.localeCompare(dateB);
      }
      if (sortBy === "date_desc") {
        const dateA = String(a.bookingDate || "") + (a.startTime || "");
        const dateB = String(b.bookingDate || "") + (b.startTime || "");
        return dateB.localeCompare(dateA);
      }
      return 0;
    });
  }, [bookings, search, typeFilter, statusFilter, dateFilter, sortBy, todayString, matchedHighlightId]);

  // Pagination computation
  const totalPages = Math.ceil(filteredBookings.length / pageSize) || 1;
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBookings.slice(start, start + pageSize);
  }, [filteredBookings, currentPage, pageSize]);

  const activeFiltersCount =
    (search ? 1 : 0) +
    (typeFilter !== "All" ? 1 : 0) +
    (statusFilter !== "All" ? 1 : 0) +
    (dateFilter !== "All" ? 1 : 0);

  const resetAllFilters = () => {
    handleSearchChange("");
    setTypeFilter("All");
    setStatusFilter("All");
    setDateFilter("All");
    setSortBy("id_desc");
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col space-y-3.5 pb-6">

      {/* COMPACT TOP HEADER SECTION */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              My Reservations
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200/80 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
              <Sparkles className="w-3 h-3 text-sky-600" />
              Workspace Passes
            </span>
          </div>

          <p className="mt-0.5 text-xs text-slate-500">
            View, modify schedules, check in, export to calendar, and manage reservations.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 hover:border-slate-300 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-600" : "text-slate-500"}`} />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>

          <Link to="/workspace-search">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition-all active:scale-95"
            >
              <Building2 className="w-3 h-3" />
              Book Room
            </button>
          </Link>
          <Link to="/hotseat-reservation">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 hover:border-emerald-300 shadow-sm transition-all active:scale-95"
            >
              <Armchair className="w-3 h-3 text-emerald-600" />
              Reserve Seat
            </button>
          </Link>
        </div>
      </div>

      {/* COMPACT METRIC STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Total Passes</span>
            <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg sm:text-xl font-extrabold text-slate-900">{stats.total}</span>
            <span className="text-[10.5px] font-medium text-slate-400">All-time</span>
          </div>
        </div>

        <div className="p-2.5 sm:p-3 rounded-xl bg-white border border-sky-100 shadow-sm hover:border-sky-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-semibold text-sky-700 uppercase tracking-wider">Upcoming & Active</span>
            <div className="w-6 h-6 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg sm:text-xl font-extrabold text-sky-950">{stats.upcoming}</span>
            <span className="text-[10.5px] font-medium text-sky-600">Scheduled</span>
          </div>
        </div>

        <div className="p-2.5 sm:p-3 rounded-xl bg-white border border-indigo-100 shadow-sm hover:border-indigo-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-semibold text-indigo-700 uppercase tracking-wider">Meeting Rooms</span>
            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg sm:text-xl font-extrabold text-indigo-950">{stats.rooms}</span>
            <Link to="/workspace-search" className="text-[10.5px] font-semibold text-indigo-600 hover:underline flex items-center gap-0.5">
              Book <ChevronRight className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>

        <div className="p-2.5 sm:p-3 rounded-xl bg-white border border-emerald-100 shadow-sm hover:border-emerald-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-semibold text-emerald-700 uppercase tracking-wider">Hotseat Passes</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Armchair className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg sm:text-xl font-extrabold text-emerald-950">{stats.hotseats}</span>
            <Link to="/hotseat-reservation" className="text-[10.5px] font-semibold text-emerald-600 hover:underline flex items-center gap-0.5">
              Reserve <ChevronRight className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* HIGHLIGHT BANNER */}
      {matchedHighlightId && !dismissedHighlight && (
        <div className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 text-sky-900 shadow-sm animate-fade-in text-xs">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-sky-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
              ID
            </div>
            <p className="font-medium">
              Target reservation highlighted: <span className="font-bold text-sky-950">{matchedHighlightId}</span>. Focused below.
            </p>
          </div>
          <button
            onClick={handleClearHighlight}
            className="flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-950 px-2 py-0.5 rounded-md bg-white/80 border border-sky-200 hover:bg-white transition-all shrink-0"
          >
            <X className="w-3 h-3" />
            Dismiss
          </button>
        </div>
      )}

      {/* COMPACT SEARCH, FILTER & VIEW CONTROLS TOOLBAR */}
      <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-sm flex flex-col gap-2">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2">
          
          {/* SEARCH INPUT */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by ID, room, seat, purpose, module, or date..."
              className="w-full pl-8 pr-8 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-slate-800 placeholder-slate-400 transition-all"
            />
            {search && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* TYPE FILTER PILLS */}
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg shrink-0 self-start lg:self-center">
            <button
              onClick={() => setTypeFilter("All")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                typeFilter === "All"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setTypeFilter("Room")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                typeFilter === "Room"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-3 h-3" />
              Rooms ({stats.rooms})
            </button>
            <button
              onClick={() => setTypeFilter("Hotseat")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                typeFilter === "Hotseat"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Armchair className="w-3 h-3" />
              Hotseats ({stats.hotseats})
            </button>
          </div>

          {/* VIEW SWITCHER */}
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg shrink-0 self-end lg:self-center">
            <button
              title="Table View"
              onClick={() => setViewMode("table")}
              className={`p-1 rounded-md transition-all ${
                viewMode === "table"
                  ? "bg-white text-sky-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              title="Card View"
              onClick={() => setViewMode("grid")}
              className={`p-1 rounded-md transition-all ${
                viewMode === "grid"
                  ? "bg-white text-sky-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* SECONDARY FILTER ROW */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 text-[11px]">
          <div className="flex flex-wrap items-center gap-2">
            
            {/* DATE FILTER */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium">Date:</span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 outline-none hover:border-slate-300 focus:ring-1 focus:ring-sky-500 transition-all cursor-pointer"
              >
                <option value="All">All Dates</option>
                <option value="Today">Today Only</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Past">Past</option>
              </select>
            </div>

            {/* STATUS FILTER */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 outline-none hover:border-slate-300 focus:ring-1 focus:ring-sky-500 transition-all cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Checked In">Checked In</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Expired">Expired</option>
              </select>
            </div>

            {/* SORT BY */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 outline-none hover:border-slate-300 focus:ring-1 focus:ring-sky-500 transition-all cursor-pointer"
              >
                <option value="id_desc">Newest (ID ↓)</option>
                <option value="date_asc">Date (Soonest)</option>
                <option value="date_desc">Date (Latest)</option>
              </select>
            </div>
          </div>

          {/* ACTIVE FILTER COUNT & RESET */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10.5px] font-medium text-slate-500">
                {filteredBookings.length} results ({activeFiltersCount} active)
              </span>
              <button
                onClick={resetAllFilters}
                className="text-[10.5px] font-bold text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-0.5"
              >
                <X className="w-2.5 h-2.5" />
                Reset
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CONTENT: LOADING, EMPTY OR LISTINGS */}
      {loading ? (
        /* SKELETON LOADING STATE */
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-12 rounded-xl bg-white border border-slate-200/80 p-2.5 flex items-center justify-between animate-pulse"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-200"></div>
                <div className="space-y-1">
                  <div className="w-28 h-3 rounded bg-slate-200"></div>
                  <div className="w-40 h-2.5 rounded bg-slate-100"></div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-4 rounded-full bg-slate-100"></div>
                <div className="w-12 h-6 rounded bg-slate-200"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        /* EMPTY STATE */
        <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-white shadow-sm flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 mb-2">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Reservations Found</h3>
          <p className="mt-0.5 text-xs text-slate-500 max-w-sm">
            {activeFiltersCount > 0
              ? "No reservations match your active filter criteria."
              : "You do not have any room or hotseat reservations yet."}
          </p>

          <div className="mt-3.5 flex items-center gap-2 flex-wrap justify-center">
            {activeFiltersCount > 0 ? (
              <Button
                variant="secondary"
                onClick={resetAllFilters}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
              >
                Clear Filters
              </Button>
            ) : (
              <>
                <Link to="/workspace-search">
                  <Button className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 bg-sky-600 text-white">
                    <Building2 className="w-3 h-3" />
                    Find Room
                  </Button>
                </Link>
                <Link to="/hotseat-reservation">
                  <Button variant="secondary" className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 border border-emerald-200 bg-emerald-50 text-emerald-800">
                    <Armchair className="w-3 h-3 text-emerald-600" />
                    Reserve Seat
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* =================================================
           CARD / GRID VIEW (COMPACT)
        ================================================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {paginatedBookings.map((b) => {
            const currentBookingId = String(b.bookingId ?? b.id ?? "").replace(/^#/, "");
            const isHighlighted = Boolean(
              matchedHighlightId &&
              String(matchedHighlightId).toLowerCase() === currentBookingId.toLowerCase()
            );
            const statusDisplay = getDisplayStatus(b);
            const canEdit = canModifyBooking(b);
            const canCheckIn = canCheckInHotseat(b);

            return (
              <div
                key={`${b.isHotseat ? "hotseat" : "room"}-${b.bookingId}`}
                id={`booking-card-${currentBookingId}`}
                onClick={isHighlighted ? handleClearHighlight : undefined}
                className={`relative rounded-xl bg-white p-3 border transition-all duration-150 flex flex-col justify-between shadow-sm hover:shadow-md group ${
                  isHighlighted
                    ? "border-sky-400 ring-2 ring-sky-300/70 bg-sky-50/40"
                    : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                {/* CARD HEADER */}
                <div>
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          b.isHotseat
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                        }`}
                      >
                        {b.isHotseat ? <Armchair className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[10.5px] font-bold text-slate-500">
                            {currentBookingId}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider rounded whitespace-nowrap shrink-0 ${
                              b.isHotseat
                                ? "bg-emerald-100/70 text-emerald-800"
                                : "bg-indigo-100/70 text-indigo-800"
                            }`}
                          >
                            {b.isHotseat ? "Hotseat" : "Room"}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-xs mt-0.5 group-hover:text-sky-600 transition-colors line-clamp-1">
                          {b.isHotseat
                            ? b.roomName || `Hot Seat ${b.seatNumber || ""}`
                            : b.roomName || `Room ${getRoomId(b) || ""}`}
                        </h3>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wide shrink-0 ${getStatusBadgeClass(
                        statusDisplay
                      )}`}
                    >
                      {statusDisplay}
                    </span>
                  </div>

                  {/* PURPOSE / TITLE */}
                  <p className="mt-1.5 text-[11px] text-slate-600 font-medium line-clamp-1">
                    {b.isHotseat ? "Dedicated Hotseat Reservation" : b.meetingTitle || b.purpose || "Workspace Reservation"}
                  </p>

                  {/* INFO DETAILS GRID */}
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] bg-slate-50/70 rounded-lg p-2 border border-slate-100">
                    <div className="flex items-center gap-1 text-slate-600">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">{b.bookingDate}</span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-600">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-700 truncate">
                        {b.isHotseat
                          ? formatDisplayTime(b.expectedCheckIn || b.startTime)
                          : `${formatDisplayTime(b.startTime)} - ${formatDisplayTime(b.endTime)}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-600 col-span-2">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="text-[10.5px] text-slate-600 truncate">{getBookingModule(b)}</span>
                    </div>
                  </div>
                </div>

                {/* CARD ACTIONS */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleView(b)}
                      className="px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors flex items-center gap-0.5"
                      title="View Details"
                    >
                      <Eye className="w-3 h-3" />
                      Details
                    </button>

                    {!b.isHotseat && (
                      <button
                        onClick={() => handleAddToOutlookWeb(b)}
                        className="px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors flex items-center gap-1"
                        title="Add to Outlook Calendar (Web)"
                      >
                        <Calendar className="w-3 h-3 text-indigo-600" />
                        Outlook
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {canCheckIn && (
                      <button
                        onClick={() => handleTriggerCheckIn(b)}
                        className="px-2 py-0.5 text-[10.5px] font-bold text-white bg-sky-600 hover:bg-sky-700 rounded shadow-sm transition-all flex items-center gap-0.5"
                      >
                        <Check className="w-3 h-3" />
                        Check In
                      </button>
                    )}

                    {canEdit && (
                      <>
                        <button
                          onClick={() => handleEdit(b)}
                          className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                          title="Edit Schedule"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            setSelected({
                              ...b,
                              roomId: getRoomId(b),
                            });
                            setCancelReason("");
                            setMode("cancel");
                          }}
                          className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
                          title="Cancel Reservation"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* =================================================
           TABLE VIEW (COMPACT)
        ================================================= */
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm w-full">
          <div className="overflow-auto max-h-[520px] w-full">
            <table className="w-full min-w-[740px] text-xs text-left border-separate border-spacing-0">
              <thead className="sticky top-0 z-30 bg-[#f8fafc]">
                <tr className="text-left font-mono text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-[#f8fafc]">
                  <th className="sticky top-0 z-30 w-[70px] px-3 py-2 text-center bg-[#f8fafc] border-b border-slate-200">
                    ID
                  </th>
                  <th className="sticky top-0 z-30 w-[18%] px-3 py-2 bg-[#f8fafc] border-b border-slate-200">
                    Workspace & Type
                  </th>
                  <th className="sticky top-0 z-30 w-[17%] px-2.5 py-2 bg-[#f8fafc] border-b border-slate-200">
                    Module / Building
                  </th>
                  <th className="sticky top-0 z-30 w-[18%] px-2.5 py-2 bg-[#f8fafc] border-b border-slate-200">
                    Purpose / Title
                  </th>
                  <th className="sticky top-0 z-30 w-[90px] px-2.5 py-2 bg-[#f8fafc] border-b border-slate-200">
                    Date
                  </th>
                  <th className="sticky top-0 z-30 w-[105px] px-2.5 py-2 bg-[#f8fafc] border-b border-slate-200">
                    Time Slot
                  </th>
                  <th className="sticky top-0 z-30 w-[65px] px-2 py-2 text-center bg-[#f8fafc] border-b border-slate-200">
                    Duration
                  </th>
                  <th className="sticky top-0 z-30 w-[95px] px-2 py-2 text-center bg-[#f8fafc] border-b border-slate-200">
                    Status
                  </th>
                  <th className="sticky top-0 z-30 w-[125px] px-2.5 py-2 text-center bg-[#f8fafc] border-b border-slate-200">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedBookings.map((b) => {
                  const currentBookingId = String(b.bookingId ?? b.id ?? "").replace(/^#/, "");
                  const isHighlighted = Boolean(
                    matchedHighlightId &&
                    String(matchedHighlightId).toLowerCase() === currentBookingId.toLowerCase()
                  );
                  const statusDisplay = getDisplayStatus(b);
                  const canEdit = canModifyBooking(b);
                  const canCheckIn = canCheckInHotseat(b);

                  return (
                    <tr
                      key={`${b.isHotseat ? "hotseat" : "room"}-${b.bookingId}`}
                      id={`booking-row-${currentBookingId}`}
                      onClick={isHighlighted ? handleClearHighlight : undefined}
                      className={`border-b transition-colors duration-150 ${
                        isHighlighted
                          ? "bg-sky-50/90 hover:bg-sky-100/70 border-sky-300 ring-2 ring-sky-300 shadow-sm cursor-pointer"
                          : "border-slate-100 last:border-0 hover:bg-slate-50/80"
                      }`}
                    >
                      {/* ID */}
                      <td
                        className={`px-2.5 py-2 text-center whitespace-nowrap font-mono text-[10.5px] ${
                          isHighlighted
                            ? "border-l-4 border-l-sky-500 bg-sky-50 text-sky-950 font-bold"
                            : "border-l-4 border-l-transparent text-slate-700 font-semibold"
                        }`}
                      >
                        {currentBookingId}
                      </td>

                      {/* WORKSPACE & TYPE */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                              b.isHotseat
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-indigo-50 text-indigo-700"
                            }`}
                          >
                            {b.isHotseat ? (
                              <Armchair className="w-3 h-3" />
                            ) : (
                              <Building2 className="w-3 h-3" />
                            )}
                          </div>
                          <div>
                            <span
                              className={`font-semibold text-xs leading-tight line-clamp-1 ${
                                isHighlighted ? "text-sky-950 font-bold" : "text-slate-900"
                              }`}
                            >
                              {b.isHotseat
                                ? b.roomName || `Hot Seat ${b.seatNumber || ""}`
                                : b.roomName || `Room ${getRoomId(b) || ""}`}
                            </span>
                            <span className="text-[9.5px] text-slate-400 font-medium">
                              {b.isHotseat ? "Hotseat Pass" : "Meeting Room"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* MODULE */}
                      <td className="px-2.5 py-2 text-slate-600 text-[11px]">
                        <span className="line-clamp-1" title={getBookingModule(b)}>
                          {getBookingModule(b)}
                        </span>
                      </td>

                      {/* PURPOSE */}
                      <td className="px-2.5 py-2 text-slate-800 font-medium text-[11px]">
                        <span className="line-clamp-1" title={b.meetingTitle || b.purpose || ""}>
                          {b.isHotseat
                            ? "Hotseat Reservation"
                            : b.meetingTitle || b.purpose || "Workspace Reservation"}
                        </span>
                      </td>

                      {/* DATE */}
                      <td className="px-2.5 py-2 whitespace-nowrap text-[11px] font-semibold text-slate-700">
                        {b.bookingDate}
                      </td>

                      {/* TIME SLOT */}
                      <td className="px-2.5 py-2 whitespace-nowrap text-[11px] text-slate-600 font-medium">
                        {b.isHotseat
                          ? formatDisplayTime(b.expectedCheckIn || b.startTime)
                          : `${formatDisplayTime(b.startTime)} - ${formatDisplayTime(b.endTime)}`}
                      </td>

                      {/* DURATION */}
                      <td className="px-2 py-2 text-center whitespace-nowrap text-[11px] font-medium text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10.5px] whitespace-nowrap">
                          {getDuration(b)}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="px-2 py-2 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wide whitespace-nowrap ${getStatusBadgeClass(
                            statusDisplay
                          )}`}
                        >
                          {statusDisplay}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-2.5 py-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {canCheckIn && (
                            <button
                              onClick={() => handleTriggerCheckIn(b)}
                              className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-sky-600 hover:bg-sky-700 rounded shadow-sm transition-all"
                            >
                              Check In
                            </button>
                          )}

                          <button
                            onClick={() => handleView(b)}
                            className="p-1 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3 h-3" />
                          </button>

                          {!b.isHotseat && (
                            <button
                              onClick={() => handleAddToOutlookWeb(b)}
                              className="p-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Add to Outlook Calendar (Web)"
                            >
                              <Calendar className="w-3 h-3 text-indigo-600" />
                            </button>
                          )}

                          {canEdit && (
                            <>
                              <button
                                onClick={() => handleEdit(b)}
                                className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                                title="Edit Schedule"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>

                              <button
                                onClick={() => {
                                  setSelected({
                                    ...b,
                                    roomId: getRoomId(b),
                                  });
                                  setCancelReason("");
                                  setMode("cancel");
                                }}
                                className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
                                title="Cancel Reservation"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAGINATION CONTROLS */}
      {filteredBookings.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 text-xs text-slate-600 bg-white/70 p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-medium">Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 transition-colors"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <span className="text-[11px] text-slate-400">
              Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredBookings.length)} of {filteredBookings.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-[11px] shadow-xs transition-colors"
            >
              Previous
            </button>
            <span className="px-2 font-bold text-slate-700 text-[11px]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-[11px] shadow-xs transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* =================================================
          VIEW BOOKING / DIGITAL PASS MODAL (COMPACT)
      ================================================= */}
      <Modal
        open={mode === "view"}
        title="Reservation Pass Details"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleCopyPassSummary(selected)}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors"
                title="Copy formatted pass details"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                Copy Summary
              </button>
              {Boolean(selected && !selected.isHotseat) && (
                <button
                  type="button"
                  onClick={() => handleAddToOutlookWeb(selected)}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 shadow-xs transition-colors"
                  title="Add to Microsoft Outlook Calendar (Web)"
                >
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Outlook Web
                </button>
              )}
            </div>
            <Button onClick={closeModal} className="px-3 py-1 text-xs">
              Close
            </Button>
          </div>
        }
        className="max-w-md h-fit"
      >
        {selected && (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3.5 shadow-sm space-y-3">
              
              <div className="flex items-start justify-between border-b border-slate-200/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      selected.isHotseat
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-indigo-100 text-indigo-800"
                    }`}
                  >
                    {selected.isHotseat ? (
                      <Armchair className="w-4 h-4" />
                    ) : (
                      <Building2 className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <span className="font-mono text-[10.5px] font-bold text-slate-400">
                      PASS {String(selected.bookingId ?? "").replace(/^#/, "")}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      {selected.isHotseat
                        ? selected.roomName || `Hot Seat ${selected.seatNumber || ""}`
                        : selected.roomName || `Room ${getRoomId(selected) || ""}`}
                    </h3>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider ${getStatusBadgeClass(
                    getDisplayStatus(selected)
                  )}`}
                >
                  {getDisplayStatus(selected)}
                </span>
              </div>

              {/* GRID INFO */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10.5px] font-medium block">Purpose</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                    {selected.isHotseat
                      ? "Hotseat Reservation"
                      : selected.meetingTitle || selected.purpose || "Workspace Reservation"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10.5px] font-medium block">Module</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block truncate">
                    {getBookingModule(selected)}
                  </span>
                </div>

                <div className="pt-1.5 border-t border-slate-100">
                  <span className="text-slate-400 text-[10.5px] font-medium block">Date</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                    {selected.bookingDate}
                  </span>
                </div>

                <div className="pt-1.5 border-t border-slate-100">
                  <span className="text-slate-400 text-[10.5px] font-medium block">Time Slot</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                    {selected.isHotseat
                      ? formatDisplayTime(selected.expectedCheckIn || selected.startTime)
                      : `${formatDisplayTime(selected.startTime)} - ${formatDisplayTime(selected.endTime)}`}
                  </span>
                </div>

                {selected.isHotseat && (
                  <div className="pt-1.5 border-t border-slate-100">
                    <span className="text-slate-400 text-[10.5px] font-medium block">Desk Number</span>
                    <span className="font-bold text-emerald-700 text-xs mt-0.5 block">
                      {selected.seatNumber || "-"}
                    </span>
                  </div>
                )}

                <div className="pt-1.5 border-t border-slate-100">
                  <span className="text-slate-400 text-[10.5px] font-medium block">Duration</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                    {getDuration(selected)}
                  </span>
                </div>
              </div>

              {/* SECURITY VERIFICATION STRIP */}
              <div className="pt-2 border-t border-dashed border-slate-200 flex items-center justify-between bg-slate-50/80 -mx-3.5 -mb-3.5 p-2.5 rounded-b-xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-[9px] tracking-tighter">
                    QR
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block">Security Token</span>
                    <span className="font-mono text-[10.5px] font-extrabold text-slate-800">
                      SB-{String(selected.bookingId || "0").padStart(5, "0")}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Verified Pass
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* =================================================
          CHECK-IN CONFIRMATION MODAL
      ================================================= */}
      <Modal
        open={mode === "checkin_confirm"}
        title="Confirm Hotseat Check-In"
        className="max-w-md h-fit"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={Boolean(checkingInId)}
              onClick={closeModal}
              className="text-xs px-2.5 py-1"
            >
              Cancel
            </Button>
            <Button
              disabled={Boolean(checkingInId)}
              onClick={() => executeHotseatCheckIn(selected)}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs px-2.5 py-1"
            >
              {checkingInId ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                  <span>Checking in...</span>
                </>
              ) : (
                "Confirm Check-In"
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-2.5 text-xs">
          <p className="text-slate-700 font-medium">
            Are you ready to check in to <span className="font-bold text-slate-900">{selected?.roomName || "Hot Seat"}</span>?
          </p>
          <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-100 text-sky-900 text-[11px] flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
            <span>
              Checking in confirms your physical presence and prevents your desk reservation from expiring.
            </span>
          </div>
        </div>
      </Modal>

      {/* =================================================
          CANCEL MODAL
      ================================================= */}
      <Modal
        open={mode === "cancel"}
        title={selected?.isHotseat ? "Cancel Hotseat Booking" : "Cancel Room Booking"}
        className="max-w-md h-fit"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={cancelling}
              onClick={closeModal}
              className="text-xs px-2.5 py-1"
            >
              No, Keep
            </Button>

            <Button
              disabled={cancelling}
              onClick={cancel}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs px-2.5 py-1"
            >
              {cancelling ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                  <span>Cancelling...</span>
                </>
              ) : (
                "Yes, Cancel Reservation"
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-700">
            {selected?.isHotseat
              ? "Are you sure you want to cancel this hotseat booking? The seat will immediately become available for other team members."
              : "Are you sure you want to cancel this booking? The room slot will be freed up immediately."}
          </p>

          {!selected?.isHotseat && (
            <Field label="Reason for Cancellation *">
              <Input
                type="text"
                placeholder="e.g. Meeting rescheduled..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </Field>
          )}
        </div>
      </Modal>

      {/* =================================================
          EDIT MODAL
      ================================================= */}
      <Modal
        open={mode === "edit"}
        title={
          selected?.isHotseat
            ? "Edit Hotseat Schedule"
            : "Edit Room Schedule"
        }
        footer={null}
        className="max-w-lg h-fit"
      >
        {selected && (
          <form onSubmit={save} className="space-y-3 text-xs">
            <p className="text-[11px] text-slate-500 font-mono">
              Reservation {String(selected.bookingId ?? "").replace(/^#/, "")}
            </p>

            {/* DATE */}
            <Field label="Booking Date">
              <Input
                type="date"
                min={todayString}
                value={selected.bookingDate || ""}
                onChange={(e) =>
                  setSelected({
                    ...selected,
                    bookingDate: e.target.value,
                  })
                }
              />
            </Field>

            {/* HOTSEAT EDIT */}
            {selected.isHotseat ? (
              <>
                <Field label="Desk / Seat">
                  <Input
                    value={
                      selected.seatNumber ||
                      selected.roomName ||
                      "Hot Seat"
                    }
                    disabled
                  />
                </Field>

                <ScrollableTimePicker
                  label="Expected Check-in Time"
                  value={formatDisplayTime(
                    selected.expectedCheckIn || selected.startTime
                  )}
                  onChange={(val) =>
                    setSelected({
                      ...selected,
                      expectedCheckIn: val,
                      startTime: val,
                      endTime: val,
                    })
                  }
                  selectedDate={selected.bookingDate || selected.date}
                />

                <p className="text-[11px] text-slate-500">
                  Select a date and expected check-in time for your hotseat reservation.
                </p>
              </>
            ) : (
              /* ROOM EDIT */
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <ScrollableTimePicker
                    label="Start Time"
                    value={formatDisplayTime(selected.startTime)}
                    onChange={(val) =>
                      setSelected({
                        ...selected,
                        startTime: val,
                      })
                    }
                    selectedDate={selected.bookingDate || selected.date}
                  />

                  <ScrollableTimePicker
                    label="End Time"
                    value={formatDisplayTime(selected.endTime)}
                    onChange={(val) =>
                      setSelected({
                        ...selected,
                        endTime: val,
                      })
                    }
                    selectedDate={selected.bookingDate || selected.date}
                    minTime={selected.startTime}
                  />
                </div>

                <p className="text-[11px] text-slate-500">
                  Workspace operating hours: <span className="font-semibold text-slate-700">10:00 - 22:00</span>
                </p>
              </>
            )}

            {/* MODAL ACTION BUTTONS */}
            <div className="flex justify-end gap-2 pt-2.5 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={closeModal}
                className="text-xs px-2.5 py-1"
              >
                Cancel
              </Button>

              <Button type="submit" className="text-xs px-3 py-1">
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}
