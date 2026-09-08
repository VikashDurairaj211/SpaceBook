import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  searchRooms,
  getRoomAvailability,
  getModules,
  getRoomTypes,
  DEFAULT_MODULES,
  DEFAULT_ROOM_TYPES,
} from "../api/rooms";
import { getMyBookings } from "../api/bookings";
import client from "../api/client";

import { Field, Input, Select } from "../components/common/Input";
import BusinessDatePicker from "../components/common/BusinessDatePicker";
import ScrollableTimePicker from "../components/common/ScrollableTimePicker";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Loader from "../components/common/Loader";
import Modal from "../components/common/Modal";
import {
  Sparkles,
  Building2,
  Users,
  Presentation,
  Tv,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  Search,
  MapPin,
  Layers,
  ChevronRight,
  ShieldCheck,
  Video,
  Monitor,
} from "lucide-react";

const isWeekendDate = (dateStr) => {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay();
  return day === 0 || day === 6;
};

const getNextBusinessDayFormatted = () => {
  const next = new Date();
  const day = next.getDay();
  if (day === 6) {
    next.setDate(next.getDate() + 2);
  } else if (day === 0) {
    next.setDate(next.getDate() + 1);
  }
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, "0");
  const d = String(next.getDate()).padStart(2, "0");
  return `${year}-${month}-${d}`;
};

const INITIAL_FILTERS = {
  module: "",
  roomTypeId: "",
  capacity: "",
  date: getNextBusinessDayFormatted(),
  startTime: "",
  endTime: "",
};

// =====================================================
// OFFICE HOURS
// =====================================================

const OFFICE_START_TIME = "10:00";
const OFFICE_END_TIME = "22:00";

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function normalizeTime(time) {
  if (!time) return "";

  return String(time).substring(0, 5);
}

function timeToMinutes(time) {
  if (!time) return null;

  const normalized = normalizeTime(time);
  const [hours, minutes] = normalized.split(":").map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function isBookingActive(status) {
  const value = String(status || "")
    .trim()
    .toLowerCase();

  return ![
    "cancelled",
    "canceled",
    "rejected",
    "declined",
  ].includes(value);
}

function getRoomTypeName(room) {
  if (!room) return 'Conference';
  if (typeof room === 'string' && room.trim()) return room;
  if (typeof room.roomType === 'string' && room.roomType.trim()) return room.roomType;
  if (typeof room.roomType === 'object' && room.roomType?.name) return room.roomType.name;
  if (typeof room.roomTypeName === 'string' && room.roomTypeName.trim()) return room.roomTypeName;
  if (typeof room.typeName === 'string' && room.typeName.trim()) return room.typeName;
  if (typeof room.type === 'string' && room.type.trim()) return room.type;

  const typeId = Number(room.roomTypeId ?? room.typeId ?? room.roomType?.id ?? 0);
  if (typeId === 1) return 'Conference';
  if (typeId === 2) return 'Training';
  if (typeId === 3) return 'Discussion';

  const name = String(room.roomName || room.name || '').toLowerCase();
  if (name.includes('train')) return 'Training';
  if (name.includes('disc')) return 'Discussion';
  if (name.includes('conf')) return 'Conference';

  return 'Conference';
}

function getRoomModuleName(room) {
  if (!room) return 'Module 1 - Elcot Park - CMB';
  if (typeof room.module === 'string' && room.module.includes(' - ')) return room.module;
  if (typeof room.moduleName === 'string' && room.moduleName.includes(' - ')) return room.moduleName;

  const modId = Number(room.moduleId ?? room.moduleid ?? 0);
  if (modId === 3) return 'Module 1 - Tidel Park - CMB';
  if (modId === 2) return 'Module 2 - Elcot Park - CMB';
  if (modId === 1) return 'Module 1 - Elcot Park - CMB';

  const str = String(room.module || room.moduleName || room.roomNumber || room.code || '').toLowerCase();
  if (str.includes('tidel') || str.includes('tidal') || str.includes('to1')) return 'Module 1 - Tidel Park - CMB';
  if (str.includes('module 2') || str.includes('m2') || str.includes('eo2')) return 'Module 2 - Elcot Park - CMB';
  return 'Module 1 - Elcot Park - CMB';
}

function normalizeRoomFacilities(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((f) => {
      if (typeof f === 'string') return f;
      if (typeof f === 'object' && f !== null) return f.facilityName || f.name || f.facility || '';
      if (typeof f === 'number') {
        const facilityMap = { 1: 'Projector', 2: 'Video Conferencing', 3: 'Whiteboard', 4: 'Wi-Fi', 5: 'Monitor', 6: 'Speaker' };
        return facilityMap[f] || `Facility ${f}`;
      }
      return String(f);
    }).filter(Boolean);
  }
  return [];
}

// =====================================================
// SEARCH ROOMS PAGE
// =====================================================

export default function SearchRooms() {
  const [searchParams] = useSearchParams();

  const [modules, setModules] = useState(DEFAULT_MODULES);
  const [roomTypes, setRoomTypes] = useState(DEFAULT_ROOM_TYPES);

  const [filters, setFilters] =
    useState(INITIAL_FILTERS);

  // Load dynamic modules and room types from backend
  useEffect(() => {
    let isMounted = true;

    async function loadDynamicFilters() {
      try {
        const [modData, typeData] = await Promise.allSettled([
          getModules(),
          getRoomTypes(),
        ]);

        if (isMounted) {
          if (
            modData.status === "fulfilled" &&
            Array.isArray(modData.value) &&
            modData.value.length > 0
          ) {
            setModules(modData.value);
          }
          if (
            typeData.status === "fulfilled" &&
            Array.isArray(typeData.value) &&
            typeData.value.length > 0
          ) {
            setRoomTypes(typeData.value);
          }
        }
      } catch (err) {
        console.warn("Using fallback room options:", err);
      }
    }

    loadDynamicFilters();

    return () => {
      isMounted = false;
    };
  }, []);

  // ===================================================
  // TOP NAV & DASHBOARD RECOMMENDATION PARAMETER SYNC
  // ===================================================

  const lastProcessedSearchRef = useRef("");

  useEffect(() => {
    const searchString = searchParams.toString();
    if (!searchString) return;
    if (lastProcessedSearchRef.current === searchString) return;
    lastProcessedSearchRef.current = searchString;

    const moduleParam = searchParams.get("module") || "";
    const roomTypeParam = searchParams.get("roomType") || "";
    const roomTypeIdParam = searchParams.get("roomTypeId") || "";
    const capacityParam = searchParams.get("capacity") || searchParams.get("attendees") || "";
    const dateParam = searchParams.get("date") || "";
    const startTimeParam = searchParams.get("startTime") || "";
    const endTimeParam = searchParams.get("endTime") || "";
    const autoSearch = searchParams.get("autoSearch") === "true";
    const query = String(
      searchParams.get("q") ||
      searchParams.get("search") ||
      ""
    ).toLowerCase().trim();

    if (!moduleParam && !roomTypeParam && !roomTypeIdParam && !capacityParam && !dateParam && !startTimeParam && !endTimeParam && !query) return;

    let nextModule = "";
    let nextRoomTypeId = "";

    if (moduleParam) {
      if (moduleParam.toLowerCase().includes("tidel") || moduleParam.toLowerCase().includes("tidal")) {
        nextModule = "Module 1 - Tidel Park - CMB";
      } else if (moduleParam.toLowerCase().includes("module 2") || moduleParam.toLowerCase().includes("m2")) {
        nextModule = "Module 2 - Elcot Park - CMB";
      } else if (moduleParam.toLowerCase().includes("module 1") || moduleParam.toLowerCase().includes("m1")) {
        nextModule = "Module 1 - Elcot Park - CMB";
      } else {
        nextModule = moduleParam;
      }
    }

    if (roomTypeIdParam) {
      nextRoomTypeId = String(roomTypeIdParam);
    } else if (roomTypeParam) {
      const found = roomTypes.find(t => t.name.toLowerCase() === roomTypeParam.toLowerCase());
      if (found) {
        nextRoomTypeId = String(found.id);
      }
    }

    if (!nextModule && query) {
      if (query.includes("tidel") || query.includes("tidal") || query.includes("to1")) {
        nextModule = "Module 1 - Tidel Park - CMB";
      } else if (query.includes("module 2") || query.includes("m2") || query.includes("eo2")) {
        nextModule = "Module 2 - Elcot Park - CMB";
      } else if (query.includes("module 1") || query.includes("m1") || query.includes("eo1")) {
        nextModule = "Module 1 - Elcot Park - CMB";
      }
    }

    if (!nextRoomTypeId && query) {
      if (query.includes("conference")) {
        nextRoomTypeId = "1";
        if (!nextModule) {
          nextModule = "Module 1 - Elcot Park - CMB";
        }
      } else if (query.includes("training")) {
        nextRoomTypeId = "2";
        if (!nextModule) {
          nextModule = "Module 2 - Elcot Park - CMB";
        }
      } else if (query.includes("discussion")) {
        nextRoomTypeId = "3";
      }
    }

    setFilters((prev) => {
      const updated = {
        ...prev,
        module: nextModule || prev.module,
        roomTypeId: nextRoomTypeId || prev.roomTypeId,
        capacity: capacityParam || prev.capacity,
        date: dateParam || prev.date,
        startTime: startTimeParam || prev.startTime,
        endTime: endTimeParam || prev.endTime,
      };

      if (autoSearch && updated.module && updated.roomTypeId) {
        setTimeout(() => {
          executeSearch(updated, null, query);
        }, 100);
      }

      return updated;
    });
  }, [searchParams, roomTypes]);

  const [results, setResults] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [bookings, setBookings] =
    useState([]);

  const [resultsOpen, setResultsOpen] =
    useState(false);

  const [selectedRoom, setSelectedRoom] =
    useState(null);

  const [detailsOpen, setDetailsOpen] =
    useState(false);

  // ===================================================
  // SEARCH MESSAGE
  // ===================================================

  const [searchMessage, setSearchMessage] =
    useState("");

  const [capacityExceeded, setCapacityExceeded] =
    useState(false);

  // ===================================================
  // CONFLICT WARNING
  // ===================================================

  const [conflictOpen, setConflictOpen] =
    useState(false);

  const [conflictingBooking, setConflictingBooking] =
    useState(null);

  const [pendingRoomId, setPendingRoomId] =
    useState(null);

  // ===================================================
  // LOAD BOOKINGS FROM BACKEND
  // ===================================================

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      const data =
        await getMyBookings();

      setBookings(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      console.error(
        "Unable to load bookings:",
        err
      );

      setBookings([]);
    }
  }

  // ===================================================
  // SEARCH CRITERIA
  // ===================================================

  const canSearch =
    Boolean(filters.module) &&
    Boolean(filters.roomTypeId);

  const canChooseType =
    Boolean(filters.module);

  // ===================================================
  // DYNAMICALLY FILTER ROOM TYPES BASED ON MODULE
  // ===================================================

  const availableRoomTypes = useMemo(() => {
    return roomTypes.filter((type) => {
      if (
        filters.module === "Module 2 - Elcot Park - CMB" &&
        type.name === "Conference"
      ) {
        return false;
      }
      if (
        filters.module === "Module 1 - Elcot Park - CMB" &&
        type.name === "Training"
      ) {
        return false;
      }
      return true;
    });
  }, [roomTypes, filters.module]);

  // ===================================================
  // UPDATE FILTER
  // ===================================================

  function updateFilter(
    key,
    value
  ) {
    setFilters((current) => {
      const next = {
        ...current,
        [key]: value,
      };

      if (key === "module") {
        next.roomTypeId = "";
      }

      if (key === "date") {
        next.startTime = "";
        next.endTime = "";
      }

      if (key === "startTime") {
        next.endTime = "";
      }

      return next;
    });

    setCapacityExceeded(false);
    setSearchMessage("");
    setError("");
  }
  // ===================================================
  // GET ROOM TYPE NAME
  // ===================================================

  function getRoomTypeName(customRoomTypeId = null) {
    const targetId = customRoomTypeId ?? filters.roomTypeId;
    const roomType =
      roomTypes.find(
        (type) =>
          String(type.id) ===
          String(targetId)
      );

    return roomType?.name || "";
  }

  // ===================================================
  // MODULE / ROOM TYPE VALIDATION
  // ===================================================

  function validateModuleRoomType(customModule = null, customRoomTypeId = null) {
    const mod = customModule ?? filters.module;
    const roomType = getRoomTypeName(customRoomTypeId);

    if (
      mod === "Module 2 - Elcot Park - CMB" &&
      roomType === "Conference"
    ) {
      setSearchMessage(
        "Conference rooms are available only in Module 1 - Elcot Park - CMB. Please select Module 1."
      );

      return false;
    }

    if (
      mod === "Module 1 - Elcot Park - CMB" &&
      roomType === "Training"
    ) {
      setSearchMessage(
        "Training rooms are available only in Module 2 - Elcot Park - CMB. Please select Module 2."
      );

      return false;
    }

    return true;
  }

  // ===================================================
  // SEARCH ROOMS
  // ===================================================

  async function executeSearch(customFilters = null, e = null, queryParam = "") {
    if (e?.preventDefault) {
      e.preventDefault();
    }

    const currentFilters = customFilters || filters;

    setCapacityExceeded(false);
    setSearchMessage("");
    setResults([]);
    setError("");

    // =================================================
    // REQUIRED FIELDS
    // =================================================

    if (!currentFilters.module) {
      setError(
        "Please select a module."
      );
      return;
    }

    if (!currentFilters.roomTypeId) {
      setError(
        "Please select a room type."
      );
      return;
    }

    // =================================================
    // MODULE / ROOM TYPE
    // =================================================

    if (!validateModuleRoomType(currentFilters.module, currentFilters.roomTypeId)) {
      setResultsOpen(true);
      return;
    }

    // =================================================
    // PARTICIPANT VALIDATION & CAPACITY CHECK
    // =================================================

    const requestedCapacity = currentFilters.capacity
      ? Number(currentFilters.capacity)
      : 0;

    if (currentFilters.capacity && requestedCapacity < 1) {
      setError(
        "Number of participants must be at least 1."
      );
      return;
    }

    // =================================================
    // START / END TIME
    // =================================================

    if (
      currentFilters.startTime &&
      currentFilters.endTime &&
      currentFilters.startTime >=
      currentFilters.endTime
    ) {
      setError(
        "End time must be after start time."
      );
      return;
    }

    // =================================================
    // OFFICE HOURS
    // =================================================

    if (
      currentFilters.startTime &&
      currentFilters.startTime <
      OFFICE_START_TIME
    ) {
      setError(
        "Bookings are allowed only during office hours: 10:00 to 22:00."
      );
      return;
    }

    if (
      currentFilters.endTime &&
      currentFilters.endTime >
      OFFICE_END_TIME
    ) {
      setError(
        "Bookings are allowed only during office hours: 10:00 to 22:00."
      );
      return;
    }

    // =================================================
    // DATE VALIDATION
    // =================================================

    if (currentFilters.date) {
      const selectedDate =
        new Date(
          `${currentFilters.date}T00:00:00`
        );

      const today =
        new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      const maxAllowedDate =
        new Date();

      maxAllowedDate.setDate(
        maxAllowedDate.getDate() + 7
      );

      maxAllowedDate.setHours(
        0,
        0,
        0,
        0
      );

      if (
        selectedDate < today
      ) {
        setError(
          "Cannot search rooms for past dates."
        );
        return;
      }

      if (
        selectedDate >
        maxAllowedDate
      ) {
        setError(
          "Rooms can only be searched up to 1 week in advance."
        );
        return;
      }

      // ===============================================
      // TODAY TIME VALIDATION
      // ===============================================

      const now =
        new Date();

      const todayStr = [
        now.getFullYear(),
        String(
          now.getMonth() + 1
        ).padStart(2, "0"),
        String(
          now.getDate()
        ).padStart(2, "0"),
      ].join("-");

      if (
        currentFilters.date === todayStr
      ) {
        const currentTime =
          `${String(
            now.getHours()
          ).padStart(2, "0")}:${String(
            now.getMinutes()
          ).padStart(2, "0")}`;

        if (
          currentFilters.startTime &&
          currentFilters.startTime <=
          currentTime
        ) {
          setError(
            "The selected start time has already passed. Please select a future time."
          );
          return;
        }

        if (
          currentFilters.endTime &&
          currentFilters.endTime <=
          currentTime
        ) {
          setError(
            "The selected end time has already passed. Please select a future time."
          );
          return;
        }
      }
    }

    // =================================================
    // CALL API
    // =================================================

    setLoading(true);

    try {
      const searchPayload = {
        module:
          currentFilters.module ||
          undefined,

        roomTypeId:
          currentFilters.roomTypeId
            ? Number(
              currentFilters.roomTypeId
            )
            : undefined,

        participantCount:
          currentFilters.capacity
            ? Number(
              currentFilters.capacity
            )
            : undefined,

        facilityIds: [],

        bookingDate:
          currentFilters.date ||
          undefined,

        startTime:
          currentFilters.startTime
            ? `${currentFilters.startTime}:00`
            : undefined,

        endTime:
          currentFilters.endTime
            ? `${currentFilters.endTime}:00`
            : undefined,
      };

      const data =
        await searchRooms(
          searchPayload
        );

      // =================================================
      // RESPONSE
      // =================================================

      let searchResults = [];
      let backendMessage = "";
      let isCapacityExceeded = false;

      if (
        Array.isArray(data)
      ) {
        searchResults = data;
      } else if (
        data &&
        typeof data === "object"
      ) {
        if (
          Array.isArray(data.rooms)
        ) {
          searchResults =
            data.rooms;
        } else if (
          Array.isArray(data.data)
        ) {
          searchResults =
            data.data;
        } else if (
          Array.isArray(data.result)
        ) {
          searchResults =
            data.result;
        }

        backendMessage =
          data.message ||
          data.Message ||
          "";

        isCapacityExceeded =
          Boolean(
            data.isCapacityExceeded
          );
      }

      const initialCount = searchResults.length;
      let maintenanceCount = 0;

      // Filter out maintenance/blocked rooms
      searchResults = searchResults.filter((room) => {
        const id = String(room.roomId || room.id || '').trim();
        const code = String(room.roomNumber || room.roomCode || room.code || '').trim().toLowerCase();

        try {
          const overrides = JSON.parse(localStorage.getItem('spacebook_room_status_overrides') || '{}');
          const blocked = JSON.parse(localStorage.getItem('spacebook_blocked_rooms') || '[]');

          if (overrides[id] === 'Maintenance' || (code && overrides[code] === 'Maintenance')) {
            maintenanceCount++;
            return false;
          }
          if (id && blocked.map(String).includes(id)) {
            maintenanceCount++;
            return false;
          }
        } catch {
          // ignore
        }

        const roomStatus = String(room.status || room.roomStatus || '').toLowerCase();
        const isBlocked =
          room.isBlocked === true ||
          room.IsBlocked === true ||
          String(room.isBlocked).toLowerCase() === 'true' ||
          String(room.IsBlocked).toLowerCase() === 'true' ||
          room.isBlocked === 1 ||
          room.IsBlocked === 1 ||
          roomStatus === 'maintenance' ||
          roomStatus === 'blocked';

        if (isBlocked || room.isAvailable === false) {
          maintenanceCount++;
          return false;
        }

        return true;
      });

      // Normalize room types, modules, capacity, and facilities
      searchResults = searchResults.map((room) => {
        const id = room.roomId ?? room.id ?? room.RoomId;
        const name = room.roomName ?? room.name ?? room.RoomName ?? 'Room';
        const code = room.roomNumber ?? room.roomCode ?? room.code ?? '';
        const roomType = getRoomTypeName(room.roomTypeId ?? room.roomType);
        const moduleName = getRoomModuleName(room);
        const capacity = Number(room.capacity ?? room.roomCapacity ?? 4);
        const facilities = normalizeRoomFacilities(room.facilities);

        return {
          ...room,
          roomId: id,
          id: id,
          roomName: name,
          roomNumber: code,
          roomType: roomType,
          module: moduleName,
          capacity: capacity,
          facilities: facilities,
        };
      });

      // If query was provided, prioritize matching room
      if (queryParam) {
        const qLower = String(queryParam).toLowerCase();
        searchResults.sort((a, b) => {
          const aMatch = String(a.roomName || "").toLowerCase().includes(qLower) ? 1 : 0;
          const bMatch = String(b.roomName || "").toLowerCase().includes(qLower) ? 1 : 0;
          return bMatch - aMatch;
        });
      }

      // Check if backend message indicates capacity failure
      const lowerBackendMsg = String(backendMessage).toLowerCase();
      if (
        isCapacityExceeded ||
        lowerBackendMsg.includes("accommodate") ||
        (lowerBackendMsg.includes("capacity") &&
          lowerBackendMsg.includes("participant"))
      ) {
        isCapacityExceeded = true;
        backendMessage =
          "No room can accommodate the selected number of participants.";
      }

      let finalMessage = backendMessage;

      // =================================================
      // NO-RESULT MESSAGE (Maintenance vs Availability vs Capacity)
      // =================================================

      if (searchResults.length === 0) {
        if (maintenanceCount > 0 && initialCount > 0) {
          finalMessage =
            maintenanceCount === 1
              ? "The requested room is currently under maintenance and temporarily unavailable for booking."
              : "The matching rooms are currently under maintenance and temporarily unavailable for booking.";
        } else if (
          isCapacityExceeded
        ) {
          finalMessage =
            "No room can accommodate the selected number of participants.";
        } else {
          const roomType = getRoomTypeName(currentFilters.roomTypeId);

          if (
            roomType === "Conference" &&
            currentFilters.module === "Module 2 - Elcot Park - CMB"
          ) {
            finalMessage =
              "Conference rooms are available only in Module 1 - Elcot Park - CMB.";
          } else if (
            roomType === "Training" &&
            currentFilters.module === "Module 1 - Elcot Park - CMB"
          ) {
            finalMessage =
              "Training rooms are available only in Module 2 - Elcot Park - CMB.";
          } else {
            finalMessage =
              "No rooms are available for the selected date and time. The rooms may already be booked or unavailable.";
          }
        }
      } else if (
        lowerBackendMsg.includes("success") ||
        lowerBackendMsg.includes("found")
      ) {
        finalMessage = "";
      }

      setCapacityExceeded(
        isCapacityExceeded
      );

      setSearchMessage(
        finalMessage
      );

      setResults(
        searchResults
      );

      setResultsOpen(true);
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
        err?.response?.data?.Message ||
        "Unable to search rooms."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e) {
    return executeSearch(null, e);
  }

  // ===================================================
  // ROOM DETAILS
  // ===================================================

  function handleOpenDetails(room) {
    setSelectedRoom(room);
    setDetailsOpen(true);
  }

  // ===================================================
  // BUILD BOOKING LINK
  // ===================================================

  function bookRoomLink(roomId) {
    const params =
      new URLSearchParams();

    params.set(
      "roomId",
      roomId
    );

    if (filters.date) {
      params.set(
        "date",
        filters.date
      );
    }

    if (filters.startTime) {
      params.set(
        "startTime",
        filters.startTime
      );
    }

    if (filters.endTime) {
      params.set(
        "endTime",
        filters.endTime
      );
    }

    if (filters.capacity) {
      params.set(
        "attendees",
        filters.capacity
      );
    }

    return `/book-room?${params.toString()}`;
  }

  // ===================================================
  // CHECK WHETHER USER HAS TIME CONFLICT
  // ===================================================

  function findUserTimeConflict(roomId) {
    if (
      !filters.date ||
      !filters.startTime ||
      !filters.endTime
    ) {
      return null;
    }

    const requestedStart =
      timeToMinutes(
        filters.startTime
      );

    const requestedEnd =
      timeToMinutes(
        filters.endTime
      );

    if (
      requestedStart === null ||
      requestedEnd === null
    ) {
      return null;
    }

    const conflict =
      bookings.find((booking) => {
        if (
          !isBookingActive(
            booking.status
          )
        ) {
          return false;
        }

        // Same date
        const bookingDate =
          String(
            booking.bookingDate ||
            booking.date ||
            ""
          ).substring(0, 10);

        if (
          bookingDate !==
          filters.date
        ) {
          return false;
        }

        const bookingStart =
          timeToMinutes(
            booking.startTime
          );

        const bookingEnd =
          timeToMinutes(
            booking.endTime
          );

        if (
          bookingStart === null ||
          bookingEnd === null
        ) {
          return false;
        }

        // Check time overlap
        const overlaps =
          requestedStart <
          bookingEnd &&
          requestedEnd >
          bookingStart;

        if (!overlaps) {
          return false;
        }

        // Same room is not the warning
        // we want here. Backend availability
        // should already remove it.
        const bookedRoomId =
          String(
            booking.roomId ?? ""
          );

        const selectedRoomId =
          String(
            roomId ?? ""
          );

        if (
          bookedRoomId ===
          selectedRoomId
        ) {
          return false;
        }

        return true;
      });

    return conflict || null;
  }

  // ===================================================
  // HANDLE BOOK NOW
  // ===================================================

  function handleBookRoom(roomId) {
    const conflict =
      findUserTimeConflict(
        roomId
      );

    if (conflict) {
      setPendingRoomId(roomId);
      setConflictingBooking(
        conflict
      );
      setConflictOpen(true);
      return;
    }

    // No conflict - go directly
    // to booking page.
    window.location.href =
      bookRoomLink(roomId);
  }

  // ===================================================
  // PROCEED AFTER WARNING
  // ===================================================

  function proceedWithBooking() {
    if (!pendingRoomId) {
      return;
    }

    const link =
      bookRoomLink(
        pendingRoomId
      );

    setConflictOpen(false);
    setConflictingBooking(null);
    setPendingRoomId(null);
    setResultsOpen(false);

    window.location.href = link;
  }

  // ===================================================
  // CANCEL WARNING
  // ===================================================

  function cancelConflict() {
    setConflictOpen(false);
    setConflictingBooking(null);
    setPendingRoomId(null);
  }

  // ===================================================
  // STATUS BADGE
  // ===================================================

  const getStatusBadgeClass =
    (status) => {
      const s =
        status?.toLowerCase() ||
        "";

      if (
        s === "approved" ||
        s === "confirmed" ||
        s === "available"
      ) {
        return "bg-[#658362] text-white";
      }

      if (s === "pending") {
        return "bg-[#E09F3E] text-white";
      }

      if (
        s === "rejected" ||
        s === "cancelled"
      ) {
        return "bg-[#B85450] text-white";
      }

      return "bg-slate-500 text-white";
    };

  // ===================================================
  // DATE LIMITS
  // ===================================================

  const today =
    new Date();

  const todayStr = [
    today.getFullYear(),
    String(
      today.getMonth() + 1
    ).padStart(2, "0"),
    String(
      today.getDate()
    ).padStart(2, "0"),
  ].join("-");

  const maxDateObj =
    new Date();

  maxDateObj.setDate(
    maxDateObj.getDate() + 7
  );

  const maxDateStr = [
    maxDateObj.getFullYear(),
    String(
      maxDateObj.getMonth() + 1
    ).padStart(2, "0"),
    String(
      maxDateObj.getDate()
    ).padStart(2, "0"),
  ].join("-");

  // ===================================================
  // UI
  // ===================================================

  return (
    <div className="space-y-5">

      {/* PAGE HERO HEADER */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Workspace Search
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
              <Sparkles size={12} className="text-sky-500" />
              Smart Finder
            </span>
          </div>

          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Find and book the ideal conference, discussion, or training space across office campuses.
          </p>
        </div>
      </div>

      {/* WORKSPACE QUICK CATEGORY SHOWCASE */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Discussion */}
        <div
          onClick={() => {
            if (!filters.module && modules.length > 0) {
              updateFilter("module", modules[0]);
            }
            updateFilter("roomTypeId", "3");
          }}
          className={`group cursor-pointer rounded-2xl border p-4 transition-all shadow-card hover:shadow-card-hover ${
            filters.roomTypeId === "3"
              ? "border-sky-500 bg-sky-50/50 ring-2 ring-sky-500/20"
              : "border-slate-200/80 bg-white hover:border-sky-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
              <Users size={20} />
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
              8–10 Seats
            </span>
          </div>
          <h3 className="mt-3 font-bold text-sm text-slate-900 group-hover:text-sky-700 transition-colors">
            Discussion Rooms
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">
            Whiteboard, Video Conf & high-speed Wi-Fi for team syncs.
          </p>
        </div>

        {/* Conference */}
        <div
          onClick={() => {
            if (!filters.module && modules.length > 0) {
              updateFilter("module", modules[0]);
            }
            updateFilter("roomTypeId", "1");
          }}
          className={`group cursor-pointer rounded-2xl border p-4 transition-all shadow-card hover:shadow-card-hover ${
            filters.roomTypeId === "1"
              ? "border-sky-500 bg-sky-50/50 ring-2 ring-sky-500/20"
              : "border-slate-200/80 bg-white hover:border-sky-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 group-hover:scale-105 transition-transform">
              <Building2 size={20} />
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
              Up to 20 Seats
            </span>
          </div>
          <h3 className="mt-3 font-bold text-sm text-slate-900 group-hover:text-sky-700 transition-colors">
            Conference Rooms
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">
            TV Monitor, Speaker & Video Conferencing for board reviews.
          </p>
        </div>

        {/* Training */}
        <div
          onClick={() => {
            if (!filters.module && modules.length > 0) {
              updateFilter("module", modules[0]);
            }
            updateFilter("roomTypeId", "2");
          }}
          className={`group cursor-pointer rounded-2xl border p-4 transition-all shadow-card hover:shadow-card-hover ${
            filters.roomTypeId === "2"
              ? "border-sky-500 bg-sky-50/50 ring-2 ring-sky-500/20"
              : "border-slate-200/80 bg-white hover:border-sky-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform">
              <Presentation size={20} />
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
              Up to 50 Seats
            </span>
          </div>
          <h3 className="mt-3 font-bold text-sm text-slate-900 group-hover:text-indigo-700 transition-colors">
            Training Rooms
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">
            Projector, Microphone & surround audio for large workshops.
          </p>
        </div>
      </div>

      {/* SEARCH FILTER CARD */}
      <div className="rounded-2xl border border-slate-200/85 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-sky-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Filter Available Workspaces
            </h2>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            Fill in requirements to see live room options
          </span>
        </div>

        <form
          onSubmit={handleSearch}
          className="space-y-5"
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

            {/* MODULE */}
            <Field
              label={
                <span className="font-semibold text-slate-700 text-xs flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700">1</span>
                  Select Campus Module <span className="text-rose-500">*</span>
                </span>
              }
            >
              <Select
                value={filters.module}
                onChange={(e) =>
                  updateFilter(
                    "module",
                    e.target.value
                  )
                }
              >
                <option value="">
                  Select Campus Module
                </option>

                {modules.map(
                  (module) => (
                    <option
                      key={module}
                      value={module}
                    >
                      {module}
                    </option>
                  )
                )}
              </Select>
            </Field>

            {/* ROOM TYPE */}
            <Field
              label={
                <span className="font-semibold text-slate-700 text-xs flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700">2</span>
                  Select Room Type <span className="text-rose-500">*</span>
                </span>
              }
            >
              <Select
                disabled={!canChooseType}
                value={
                  filters.roomTypeId
                }
                onChange={(e) =>
                  updateFilter(
                    "roomTypeId",
                    e.target.value
                  )
                }
              >
                <option value="">
                  {canChooseType
                    ? "Select Room Type"
                    : "Choose Module First"}
                </option>

                {availableRoomTypes.map(
                  (type) => (
                    <option
                      key={type.id}
                      value={type.id}
                    >
                      {type.name}
                    </option>
                  )
                )}
              </Select>
            </Field>

            {/* PARTICIPANTS */}
            <Field
              label={
                <span className="font-semibold text-slate-700 text-xs flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700">3</span>
                  Required Capacity (Seats)
                </span>
              }
            >
              <Input
                type="number"
                min="1"
                value={filters.capacity}
                placeholder="e.g. 8"
                onChange={(e) =>
                  updateFilter(
                    "capacity",
                    e.target.value
                  )
                }
              />
            </Field>

            {/* DATE */}
            <BusinessDatePicker
              label={
                <span className="font-semibold text-slate-700 text-xs flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700">4</span>
                  Reservation Date
                </span>
              }
              min={todayStr}
              max={maxDateStr}
              value={filters.date}
              onChange={(value) =>
                updateFilter("date", value)
              }
            />

            {/* START TIME */}
            <ScrollableTimePicker
              label={
                <span className="font-semibold text-slate-700 text-xs flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700">5</span>
                  Start Time
                </span>
              }
              value={filters.startTime}
              selectedDate={filters.date}
              onChange={(value) =>
                updateFilter(
                  "startTime",
                  value
                )
              }
            />

            {/* END TIME */}
            <ScrollableTimePicker
              label={
                <span className="font-semibold text-slate-700 text-xs flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700">6</span>
                  End Time
                </span>
              }
              value={filters.endTime}
              selectedDate={filters.date}
              minTime={filters.startTime}
              onChange={(value) =>
                updateFilter(
                  "endTime",
                  value
                )
              }
            />
          </div>

          {/* ERROR */}
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs font-semibold text-rose-800 shadow-2xs">
              {error}
            </div>
          )}

          {/* SEARCH BUTTON */}
          <div className="flex items-center justify-end pt-1">
            <button
              type="submit"
              disabled={
                !canSearch ||
                loading
              }
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 disabled:opacity-50 px-7 py-3 text-xs font-bold text-white shadow-sm shadow-sky-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Search size={15} className="stroke-[2.5]" />
              <span>
                {loading
                  ? "Searching available spaces..."
                  : "Search Available Meeting Spaces"}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* MY BOOKINGS */}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              My Recent Bookings
            </h2>
            <p className="text-xs text-slate-500">
              Your active workspace reservations
            </p>
          </div>

          <Link
            to="/my-bookings"
            className="text-xs font-bold text-sky-600 hover:text-sky-800 transition-colors"
          >
            View All
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className="p-6 text-center text-xs font-medium text-slate-400">
            No bookings found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {bookings
              .slice(0, 3)
              .map((booking) => (
                <div
                  key={
                    booking.bookingId
                  }
                  className="flex items-center justify-between p-3.5 hover:bg-sky-50/30 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-xs text-slate-900">
                      {
                        booking.roomName
                      }
                    </p>

                    <p className="text-[11px] text-slate-500 font-medium">
                      {
                        booking.bookingDate
                      }

                      {" • "}

                      {booking.startTime
                        ? normalizeTime(
                          booking.startTime
                        )
                        : ""}

                      {" - "}

                      {booking.endTime
                        ? normalizeTime(
                          booking.endTime
                        )
                        : ""}
                    </p>
                  </div>

                  <span
                    className={`inline-block w-24 rounded-full py-0.5 text-center text-[10px] font-bold tracking-wider uppercase ${getStatusBadgeClass(
                      booking.status
                    )}`}
                  >
                    {
                      booking.status
                    }
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* LOADER */}

      {loading && (
        <Loader
          label="Searching available rooms..."
        />
      )}

      {/* =================================================
          AVAILABLE ROOMS MODAL
          ================================================= */}

      <Modal
        open={
          resultsOpen &&
          !loading
        }
        title="Available Workspaces"
        footer={
          <button
            type="button"
            className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors shadow-xs active:scale-95 cursor-pointer"
            onClick={() =>
              setResultsOpen(false)
            }
          >
            Close
          </button>
        }
      >
        {results.length > 0 && (
          <p className="mb-4 text-xs font-semibold text-slate-600">
            {results.length} available workspace{results.length !== 1 ? "s" : ""} found for your criteria:
          </p>
        )}

        {/* NO RESULTS */}

        {results.length === 0 ? (
          <div className="space-y-3">
            <div
              className={`rounded-2xl border p-4 ${searchMessage.toLowerCase().includes("maintenance")
                  ? "border-amber-200 bg-amber-50/80 text-amber-950"
                  : capacityExceeded
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
            >
              <p className="text-xs font-bold">
                {searchMessage ||
                  "No rooms are available for the selected criteria."}
              </p>

              {searchMessage.toLowerCase().includes("maintenance") && (
                <p className="mt-1 text-xs text-amber-800">
                  Facilities staff are currently servicing this workspace. Please select an alternative room type, time slot, or campus module.
                </p>
              )}

              {capacityExceeded && (
                <p className="mt-1 text-xs text-rose-600">
                  Please enter a smaller number of participants and search again.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {results.map(
              (room) => (
                <div
                  key={
                    room.roomId
                  }
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card hover:shadow-card-hover transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {
                          room.roomName
                        }
                      </h3>

                      <p className="text-xs text-slate-500 font-medium">
                        {
                          room.module
                        }
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 shadow-2xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Available
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-2">
                      <span className="font-semibold text-slate-500 text-[10px] uppercase">Type</span>
                      <p className="font-bold text-slate-800">{room.roomType}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-2">
                      <span className="font-semibold text-slate-500 text-[10px] uppercase">Capacity</span>
                      <p className="font-bold text-slate-800">{room.capacity} seats</p>
                    </div>
                  </div>

                  {room.facilities?.length > 0 && (
                    <div className="mt-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amenities</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {room.facilities.map((fac, idx) => (
                          <span
                            key={idx}
                            className="rounded-md bg-slate-100 border border-slate-200/70 px-1.5 py-0.5 text-[9.5px] font-medium text-slate-700"
                          >
                            ✓ {typeof fac === 'object' ? fac.name : fac}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className="flex-1 inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors shadow-xs active:scale-95 cursor-pointer"
                      onClick={() =>
                        handleOpenDetails(
                          room
                        )
                      }
                    >
                      View Details
                    </button>

                    <button
                      type="button"
                      className="flex-1 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-all"
                      onClick={() =>
                        handleBookRoom(
                          room.roomId
                        )
                      }
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </Modal>

      {/* =================================================
          ROOM DETAILS MODAL
          ================================================= */}

      <Modal
        open={detailsOpen}
        title={
          selectedRoom
            ? selectedRoom.roomName
            : "Room Details"
        }
        footer={
          <button
            type="button"
            className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors shadow-xs active:scale-95 cursor-pointer"
            onClick={() =>
              setDetailsOpen(false)
            }
          >
            Back
          </button>
        }
      >
        {selectedRoom && (
          <div className="space-y-4 text-sm">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-base font-bold text-slate-900">
                  {
                    selectedRoom.roomName
                  }
                </p>

                <p className="text-slate-500">
                  {
                    selectedRoom.module
                  }
                </p>
              </div>

              <span
                className={`inline-block rounded-full px-3 py-1 text-center text-xs font-bold tracking-wider uppercase ${getStatusBadgeClass(
                  "Available"
                )}`}
              >
                Available
              </span>
            </div>

            <div className="space-y-2 border-t border-line pt-3">

              <p>
                <span className="font-medium text-slate-700">
                  Room Type:
                </span>{" "}
                {
                  selectedRoom.roomType
                }
              </p>

              <p>
                <span className="font-medium text-slate-700">
                  Capacity:
                </span>{" "}
                {
                  selectedRoom.capacity
                }{" "}
                People
              </p>

              <p>
                <span className="font-medium text-slate-700">
                  Facilities:
                </span>{" "}
                {selectedRoom
                  .facilities
                  ?.length
                  ? selectedRoom.facilities.join(
                    ", "
                  )
                  : "None"}
              </p>

              {filters.date && (
                <p>
                  <span className="font-medium text-slate-700">
                    Selected Date:
                  </span>{" "}
                  {
                    filters.date
                  }
                </p>
              )}

              {(filters.startTime ||
                filters.endTime) && (
                  <p>
                    <span className="font-medium text-slate-700">
                      Time Slot:
                    </span>{" "}
                    {
                      filters.startTime ||
                      "--:--"
                    }
                    {" - "}
                    {
                      filters.endTime ||
                      "--:--"
                    }
                  </p>
                )}
            </div>

            <div className="pt-2">

              <Button
                className="w-full"
                onClick={() => {
                  setDetailsOpen(
                    false
                  );

                  handleBookRoom(
                    selectedRoom.roomId
                  );
                }}
              >
                Proceed to Book
              </Button>

            </div>
          </div>
        )}
      </Modal>

      {/* =================================================
          SAME USER TIME CONFLICT WARNING
          ================================================= */}

      <Modal
        open={conflictOpen}
        title="Existing Booking Found"
        footer={
          <div className="flex justify-end gap-3">

            <button
              type="button"
              className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors shadow-xs active:scale-95 cursor-pointer"
              onClick={
                cancelConflict
              }
            >
              Cancel
            </button>

            <Button
              onClick={
                proceedWithBooking
              }
            >
              Proceed
            </Button>

          </div>
        }
      >
        <div className="space-y-4">

          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">

            <p className="font-semibold text-amber-800">
              You already have a booking for another room during this time.
            </p>

            <p className="mt-2 text-sm text-amber-700">
              Do you want to proceed with booking this different room as well?
            </p>

          </div>

          {conflictingBooking && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">

              <p className="font-semibold text-slate-800">
                Existing Booking
              </p>

              <div className="mt-2 space-y-1 text-slate-600">

                <p>
                  <span className="font-medium">
                    Room:
                  </span>{" "}
                  {
                    conflictingBooking.roomName ||
                    "Another room"
                  }
                </p>

                <p>
                  <span className="font-medium">
                    Date:
                  </span>{" "}
                  {
                    conflictingBooking.bookingDate ||
                    filters.date
                  }
                </p>

                <p>
                  <span className="font-medium">
                    Time:
                  </span>{" "}
                  {
                    conflictingBooking.startTime
                      ? normalizeTime(
                        conflictingBooking.startTime
                      )
                      : "--:--"
                  }
                  {" - "}
                  {
                    conflictingBooking.endTime
                      ? normalizeTime(
                        conflictingBooking.endTime
                      )
                      : "--:--"
                  }
                </p>

              </div>
            </div>
          )}

          <p className="text-sm text-slate-500">
            Click <strong>Proceed</strong> to continue with the new room, or <strong>Cancel</strong> to keep your existing booking.
          </p>

        </div>
      </Modal>

    </div>
  );
}