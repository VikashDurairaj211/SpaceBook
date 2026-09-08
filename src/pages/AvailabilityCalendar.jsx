import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, User, Briefcase, Building2 } from "lucide-react";
import { Link } from "react-router-dom";

import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import AvailabilityGrid from "../components/calendar/AvailabilityGrid";
import BusinessDatePicker from "../components/common/BusinessDatePicker";
import { getRoomAvailability } from "../api/rooms";
import { Select } from "../components/common/Input";

const ROOM_TYPE_OPTIONS = [
  "All Rooms",
  "Conference",
  "Discussion",
  "Training",
];

// =====================================================
// GET LOCAL DATE
// =====================================================

function localDate(value = new Date()) {
  const offset = value.getTimezoneOffset() * 60000;

  return new Date(value.getTime() - offset)
    .toISOString()
    .slice(0, 10);
}

// =====================================================
// GET CURRENT TIME IN MINUTES
// =====================================================

function getNowMinutes() {
  const now = new Date();

  return now.getHours() * 60 + now.getMinutes();
}

// =====================================================
// CONVERT TIME TO MINUTES
// =====================================================

function timeToMinutes(time) {
  if (!time) return 0;

  const [hours, minutes] = String(time)
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

// =====================================================
// CHECK WEEKEND
// =====================================================

function isWeekend(dateString) {
  const date = new Date(`${dateString}T12:00:00`);

  const day = date.getDay();

  return day === 0 || day === 6;
}

// =====================================================
// GET NEXT / PREVIOUS WORKING DAY
// =====================================================

function getWorkingDay(dateString, delta) {
  const next = new Date(`${dateString}T12:00:00`);

  do {
    next.setDate(next.getDate() + delta);
  } while (
    next.getDay() === 0 ||
    next.getDay() === 6
  );

  return localDate(next);
}

// =====================================================
// NORMALIZE ROOM TYPE
// =====================================================

function normalizeRoomType(type) {
  if (!type) return "";

  const value = String(type)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  if (value.includes("conference")) {
    return "Conference";
  }

  if (value.includes("discussion")) {
    return "Discussion";
  }

  if (value.includes("training")) {
    return "Training";
  }

  return String(type).trim();
}

// =====================================================
// GET ROOM LOCATION
// =====================================================

function getRoomLocation(room) {
  if (!room) {
    return "Location not specified";
  }

  const possibleLocations = [
    room.resolvedLocation,
    room.module,
    room.Module,
    room.location,
    room.Location,
    room.roomLocation,
    room.RoomLocation,
    room.locationName,
    room.LocationName,
    room.officeLocation,

    room.office?.location,
    room.office?.Location,

    room.room?.resolvedLocation,
    room.room?.module,
    room.room?.Module,
    room.room?.location,
    room.room?.Location,
    room.room?.roomLocation,
    room.room?.RoomLocation,
  ];

  const validLocation =
    possibleLocations.find(
      (value) =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
    );

  return validLocation
    ? String(validLocation).trim()
    : "Location not specified";
}

// =====================================================
// NORMALIZE FACILITIES
// =====================================================

function normalizeFacilities(facilities) {
  if (!Array.isArray(facilities)) {
    return [];
  }

  return facilities.map((facility) => {
    if (typeof facility === "string") {
      return facility;
    }

    return (
      facility?.name ||
      facility?.facilityName ||
      facility?.Name ||
      facility?.FacilityName ||
      String(facility)
    );
  });
}

// =====================================================
// AVAILABILITY CALENDAR
// =====================================================

export default function AvailabilityCalendar() {
  const today = localDate();
  const maxDateObj = new Date();
  maxDateObj.setDate(maxDateObj.getDate() + 7);
  const maxDate = [
    maxDateObj.getFullYear(),
    String(maxDateObj.getMonth() + 1).padStart(2, '0'),
    String(maxDateObj.getDate()).padStart(2, '0'),
  ].join('-');

  const [selectedDate, setSelectedDate] =
    useState(today);

  const [rooms, setRooms] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(null);

  const [filters, setFilters] =
    useState({
      type: "All Rooms",
      capacity: "",
      startTime: "",
      endTime: "",
    });

  const [selectedSlot, setSelectedSlot] =
    useState(null);

  const [nowMinutes, setNowMinutes] =
    useState(getNowMinutes());

  // =====================================================
  // UPDATE CURRENT TIME EVERY MINUTE
  // =====================================================

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMinutes(getNowMinutes());
    }, 60000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  // =====================================================
  // FETCH ROOM AVAILABILITY
  // =====================================================

  useEffect(() => {
    let isMounted = true;

    if (isWeekend(selectedDate)) {
      setRooms([]);
      setLoading(false);
      setError(null);

      return;
    }

    setLoading(true);
    setError(null);

    getRoomAvailability(selectedDate)
      .then((data) => {
        if (!isMounted) return;

        console.log(
          "Room Availability API Response:",
          data
        );

        const availabilityRooms =
          Array.isArray(data)
            ? data
            : data?.rooms ||
            data?.data ||
            data?.result ||
            [];

        console.log(
          "Availability Rooms:",
          availabilityRooms
        );

        const mappedRooms =
          availabilityRooms.map((room) => {
            const rawRoomType =
              room.roomType ||
              room.type ||
              room.roomTypeName ||
              room.typeName ||
              "";

            const rawTimeSlots =
              room.timeSlots ||
              room.slots ||
              room.availabilitySlots ||
              [];

            // ===========================================
            // RESOLVE LOCATION ONCE
            // ===========================================

            const resolvedLocation =
              getRoomLocation(room);

            const normalizedFacilities =
              normalizeFacilities(
                room.facilities ||
                room.roomFacilities ||
                []
              );

            const isBlockedFlag =
              room.isBlocked === true ||
              room.IsBlocked === true ||
              String(room.isBlocked).toLowerCase() === "true" ||
              String(room.IsBlocked).toLowerCase() === "true" ||
              room.isBlocked === 1 ||
              room.IsBlocked === 1 ||
              String(room.status || "").toLowerCase() === "maintenance" ||
              String(room.roomStatus || "").toLowerCase() === "maintenance";

            const mappedRoom = {
              ...room,

              // -----------------------------------------
              // ROOM ID
              // -----------------------------------------

              id:
                room.roomId ||
                room.id ||
                room.roomID,

              roomId:
                room.roomId ||
                room.id ||
                room.roomID,

              // -----------------------------------------
              // ROOM NAME
              // -----------------------------------------

              name:
                room.roomName ||
                room.name ||
                room.roomNumber ||
                "Unnamed Room",

              roomName:
                room.roomName ||
                room.name ||
                room.roomNumber ||
                "Unnamed Room",

              // -----------------------------------------
              // ROOM TYPE
              // -----------------------------------------

              type:
                normalizeRoomType(
                  rawRoomType
                ),

              roomType:
                normalizeRoomType(
                  rawRoomType
                ),

              rawRoomType,

              // -----------------------------------------
              // LOCATION
              // -----------------------------------------

              resolvedLocation,
              location: resolvedLocation,
              roomLocation: resolvedLocation,
              module: resolvedLocation,

              // -----------------------------------------
              // CAPACITY
              // -----------------------------------------

              capacity:
                room.capacity ||
                room.roomCapacity ||
                room.maxCapacity ||
                0,

              // -----------------------------------------
              // FACILITIES
              // -----------------------------------------

              facilities:
                normalizedFacilities,

              roomFacilities:
                normalizedFacilities,

              // -----------------------------------------
              // STATUS & MAINTENANCE
              // -----------------------------------------

              isBlocked: isBlockedFlag,

              status: isBlockedFlag
                ? "Maintenance"
                : room.status || "Available",

              // -----------------------------------------
              // CURRENT BOOKING
              // -----------------------------------------

              currentBooking:
                room.currentBooking ||
                room.booking ||
                null,

              // -----------------------------------------
              // TIME SLOTS
              // -----------------------------------------

              timeSlots:
                rawTimeSlots.map((slot) => {
                  const b =
                    slot.booking ||
                    slot.currentBooking ||
                    room.currentBooking ||
                    room.booking ||
                    slot;

                  const bookedBy =
                    slot.bookedBy ||
                    slot.bookedByName ||
                    slot.employeeName ||
                    slot.requestedBy ||
                    slot.userName ||
                    slot.createdBy ||
                    slot.user?.name ||
                    b?.bookedBy ||
                    b?.bookedByName ||
                    b?.employeeName ||
                    b?.requestedBy ||
                    b?.userName ||
                    b?.createdBy ||
                    b?.employee?.name ||
                    b?.user?.name ||
                    null;

                  const title =
                    slot.title ||
                    slot.meetingTitle ||
                    slot.purpose ||
                    slot.reason ||
                    b?.title ||
                    b?.meetingTitle ||
                    b?.purpose ||
                    b?.reason ||
                    null;

                  const department =
                    slot.department ||
                    slot.employeeDepartment ||
                    b?.department ||
                    b?.employeeDepartment ||
                    b?.user?.department ||
                    b?.employee?.department ||
                    null;

                  const email =
                    slot.email ||
                    slot.userEmail ||
                    b?.email ||
                    b?.userEmail ||
                    b?.employeeEmail ||
                    b?.user?.email ||
                    null;

                  return {
                    ...slot,

                    start:
                      slot.start ||
                      slot.startTime ||
                      slot.fromTime ||
                      "",

                    end:
                      slot.end ||
                      slot.endTime ||
                      slot.toTime ||
                      "",

                    isBooked: isBlockedFlag
                      ? true
                      : slot.isBooked ??
                      slot.booked ??
                      false,

                    status: isBlockedFlag
                      ? "Maintenance"
                      : slot.status,

                    bookingInfo: {
                      bookedBy,
                      title,
                      department,
                      email,
                    },
                  };
                }),
            };

            console.log(
              "Mapped Room:",
              mappedRoom
            );

            console.log(
              "Resolved Location:",
              mappedRoom.resolvedLocation
            );

            return mappedRoom;
          });

        console.log(
          "Mapped Rooms:",
          mappedRooms
        );

        setRooms(mappedRooms);
      })

      .catch((err) => {
        if (isMounted) {
          setError(
            "Failed to load room availability."
          );
        }

        console.error(
          "Availability fetch error:",
          err
        );
      })

      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  // =====================================================
  // CHECK IF SELECTED DATE IS TODAY
  // =====================================================

  const selectedDateIsToday =
    selectedDate === today;

  // =====================================================
  // FILTER ROOMS
  // =====================================================

  const filteredRooms = useMemo(() => {
    const result = rooms.filter((room) => {
      // -----------------------------------------------
      // ROOM TYPE FILTER
      // -----------------------------------------------

      if (filters.type !== "All Rooms") {
        const selectedType =
          normalizeRoomType(
            filters.type
          );

        const roomType =
          normalizeRoomType(
            room.type
          );

        if (roomType !== selectedType) {
          return false;
        }
      }

      // -----------------------------------------------
      // CAPACITY FILTER
      // -----------------------------------------------

      if (
        filters.capacity &&
        Number(room.capacity) <
        Number(filters.capacity)
      ) {
        return false;
      }

      return true;
    });

    console.log(
      "Selected Room Type:",
      filters.type
    );

    console.log(
      "Filtered Rooms:",
      result
    );

    return result;
  }, [filters, rooms]);

  // =====================================================
  // REMOVE PAST TIME SLOTS FOR TODAY
  // =====================================================

  const roomsWithFutureSlots = useMemo(() => {
    if (!selectedDateIsToday) {
      return filteredRooms;
    }

    return filteredRooms
      .map((room) => {
        const futureSlots =
          (room.timeSlots || []).filter(
            (slot) => {
              const slotStart =
                slot.start ||
                slot.startTime;

              return (
                timeToMinutes(slotStart) >
                nowMinutes
              );
            }
          );

        return {
          ...room,
          timeSlots: futureSlots,
        };
      })
      .filter(
        (room) =>
          room.timeSlots.length > 0
      );
  }, [
    filteredRooms,
    selectedDateIsToday,
    nowMinutes,
  ]);

  // =====================================================
  // UPDATE FILTER
  // =====================================================

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  // =====================================================
  // CHANGE DAY
  // =====================================================

  function changeDays(delta) {
    const nextDate =
      getWorkingDay(
        selectedDate,
        delta
      );

    if (nextDate < today) {
      return;
    }

    setSelectedDate(nextDate);
    setSelectedSlot(null);
  }

  // =====================================================
  // DATE CHANGE
  // =====================================================

  function handleDateChange(value) {
    if (value < today) {
      return;
    }

    if (isWeekend(value)) {
      alert(
        "Room booking is not available on Saturdays and Sundays."
      );

      return;
    }

    setSelectedDate(value);
    setSelectedSlot(null);
  }

  // =====================================================
  // SELECT SLOT
  // =====================================================

  function handleSelectSlot(slot) {
    if (isWeekend(selectedDate)) {
      alert(
        "Room booking is not available on Saturdays and Sundays."
      );

      return;
    }

    if (
      selectedDateIsToday &&
      slot?.status === "Available"
    ) {
      const slotStart =
        slot.slot.start ||
        slot.slot.startTime;

      if (
        timeToMinutes(slotStart) <=
        nowMinutes
      ) {
        alert(
          "Cannot select or book a time slot in the past for today."
        );

        return;
      }
    }

    const resolvedLocation =
      getRoomLocation(slot.room);

    const selectedRoom = {
      ...slot.room,

      resolvedLocation,

      location:
        resolvedLocation,

      roomLocation:
        resolvedLocation,

      module:
        resolvedLocation,
    };

    const selectedSlotData = {
      ...slot,

      room:
        selectedRoom,
    };

    console.log(
      "Selected Slot:",
      selectedSlotData
    );

    console.log(
      "Selected Room:",
      selectedRoom
    );

    console.log(
      "FINAL MODAL LOCATION:",
      selectedRoom.resolvedLocation
    );

    setSelectedSlot(
      selectedSlotData
    );
  }

  // =====================================================
  // CREATE BOOKING LINK
  // =====================================================

  function bookingLink(slot) {
    const startTime =
      slot.slot.start ||
      slot.slot.startTime;

    const endTime =
      slot.slot.end ||
      slot.slot.endTime;

    const params =
      new URLSearchParams({
        roomId: String(
          slot.room.id
        ),

        date:
          selectedDate,

        startTime,

        endTime,

        ...(filters.capacity ? { attendees: String(filters.capacity) } : {}),

        location:
          getRoomLocation(
            slot.room
          ),
      });

    return `/book-room?${params.toString()}`;
  }

  // =====================================================
  // KEYBOARD ENTER TO CONTINUE BOOKING
  // =====================================================

  useEffect(() => {
    if (!selectedSlot) return;

    function handleKeyDown(e) {
      if (e.key === "Enter" && selectedSlot?.status === "Available") {
        e.preventDefault();
        const link = bookingLink(selectedSlot);
        setSelectedSlot(null);
        window.location.href = link;
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSelectedSlot(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedSlot, selectedDate, filters]);

  // =====================================================
  // STATUS BADGE
  // =====================================================

  const getStatusBadgeClass = (
    status
  ) => {
    const s =
      status?.toLowerCase() || "";

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
      s === "cancelled" ||
      s === "booked" ||
      s === "unavailable"
    ) {
      return "bg-[#B85450] text-white";
    }

    return "bg-slate-500 text-white";
  };

  // =====================================================
  // MODAL TITLE
  // =====================================================

  const modalTitle =
    selectedSlot?.status === "Available"
      ? "Book this room"
      : selectedSlot?.status === "Pending"
        ? "Pending approval"
        : selectedSlot?.status === "Completed"
          ? "Booking history"
          : "Booking details";

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="space-y-4">

      {/* HEADER */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Workspace Availability
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
              Live Timeline
            </span>
          </div>

          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Find the right workspace and book an available time slot in real time.
          </p>
        </div>
      </div>

      {/* CONTROL & FILTER TOOLBAR */}
      <div className="rounded-2xl border border-slate-200/85 bg-white p-3.5 shadow-card space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

          {/* DAY NAVIGATION GROUP */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              {/* PREVIOUS DAY */}
              <button
                type="button"
                onClick={() => changeDays(-1)}
                disabled={selectedDate <= today}
                aria-label="Previous day"
                className="p-1.5 rounded-lg text-slate-700 hover:bg-white hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
              >
                <ChevronLeft size={16} />
              </button>

              {/* DATE PICKER */}
              <div className="px-1">
                <BusinessDatePicker
                  min={today}
                  max={maxDate}
                  value={selectedDate}
                  onChange={(newDate) => handleDateChange(newDate)}
                />
              </div>

              {/* NEXT DAY */}
              <button
                type="button"
                onClick={() => changeDays(1)}
                disabled={selectedDate >= maxDate}
                aria-label="Next day"
                className="p-1.5 rounded-lg text-slate-700 hover:bg-white hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* JUMP TO TODAY BUTTON */}
            {selectedDate !== today && (
              <button
                type="button"
                onClick={() => handleDateChange(today)}
                className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition-all"
              >
                Jump to Today
              </button>
            )}
          </div>

          {/* ROOM TYPE FILTER BUTTONS / SELECTOR */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {ROOM_TYPE_OPTIONS.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => updateFilter("type", type)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all shrink-0 ${
                  filters.type === type
                    ? "bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-xs"
                    : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-white hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* STATUS LEGEND */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 text-xs">
          <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Legend:</span>
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500"></span>
            <span>Reserved / Booked</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
            <span>Under Maintenance</span>
          </div>
        </div>
      </div>

      {/* LOADING */}

      {loading && (
        <div className="p-8 text-center text-sm text-slate">
          Loading calendar schedule...
        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="p-8 text-center text-sm text-red-500">
          {error}
        </div>
      )}

      {/* AVAILABILITY GRID */}

      {!loading && !error && (
        <AvailabilityGrid
          rooms={roomsWithFutureSlots}
          date={selectedDate}
          isToday={selectedDateIsToday}
          nowMinutes={nowMinutes}
          onSelectSlot={handleSelectSlot}
        />
      )}

      {/* SLOT MODAL */}

      <Modal
        open={Boolean(selectedSlot)}
        title={modalTitle}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                setSelectedSlot(null)
              }
            >
              Close
            </Button>

            {selectedSlot?.status ===
              "Available" && (
                <Link
                  to={bookingLink(
                    selectedSlot
                  )}
                >
                  <Button
                    onClick={() =>
                      setSelectedSlot(null)
                    }
                  >
                    Continue to booking
                  </Button>
                </Link>
              )}
          </>
        }
      >

        {selectedSlot && (
          <div className="space-y-3">

            {/* ROOM NAME */}

            <p className="font-display text-base font-700 text-ink">
              {selectedSlot.room.name}
            </p>

            {/* ROOM TYPE AND CAPACITY */}

            <p>
              {selectedSlot.room.type}
              {" · "}
              Capacity{" "}
              {selectedSlot.room.capacity}
            </p>

            {/* LOCATION */}

            <p>
              Location:{" "}
              {selectedSlot.room.resolvedLocation ||
                getRoomLocation(
                  selectedSlot.room
                )}
            </p>

            {/* DATE AND TIME */}

            <p>
              {selectedDate}
              {", "}
              {selectedSlot.slot.start ||
                selectedSlot.slot.startTime}
              {" - "}
              {selectedSlot.slot.end ||
                selectedSlot.slot.endTime}
            </p>

            {/* FACILITIES */}

            <p>
              Facilities:{" "}

              {selectedSlot.room.facilities?.length
                ? selectedSlot.room.facilities.join(
                  ", "
                )
                : "None"}
            </p>

            {/* STATUS */}

            <div className="flex items-center gap-2">

              <span>
                Status:
              </span>

              <span
                className={`inline-block w-28 rounded-full py-1 text-center text-xs font-bold tracking-wider uppercase ${getStatusBadgeClass(
                  selectedSlot.status
                )}`}
              >
                {selectedSlot.status}
              </span>

            </div>

            {/* RESERVATION DETAILS (When slot is Booked / Pending) */}
            {selectedSlot.status !== "Available" && selectedSlot.status !== "Maintenance" && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3.5 space-y-2 text-xs">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-200/80">
                  Reservation Details
                </p>

                {selectedSlot.slot?.bookingInfo?.bookedBy || selectedSlot.booking?.bookedBy ? (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <User size={13} className="text-slate-400 shrink-0" />
                      Reserved By:
                    </span>
                    <span className="font-semibold text-slate-900">
                      {selectedSlot.slot?.bookingInfo?.bookedBy || selectedSlot.booking?.bookedBy}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <User size={13} className="text-slate-400 shrink-0" />
                      Status:
                    </span>
                    <span className="font-semibold text-slate-700 italic">Occupied</span>
                  </div>
                )}

                {(selectedSlot.slot?.bookingInfo?.department || selectedSlot.booking?.department) && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Building2 size={13} className="text-slate-400 shrink-0" />
                      Department:
                    </span>
                    <span className="font-medium text-slate-700">
                      {selectedSlot.slot?.bookingInfo?.department || selectedSlot.booking?.department}
                    </span>
                  </div>
                )}

                {(selectedSlot.slot?.bookingInfo?.title || selectedSlot.booking?.title) && (
                  <div className="flex justify-between items-start pt-1.5 border-t border-slate-200/70">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5 shrink-0">
                      <Briefcase size={13} className="text-slate-400 shrink-0" />
                      Meeting Purpose:
                    </span>
                    <span className="font-semibold text-slate-900 text-right max-w-[65%] truncate">
                      {selectedSlot.slot?.bookingInfo?.title || selectedSlot.booking?.title}
                    </span>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </Modal>

    </div>
  );
}