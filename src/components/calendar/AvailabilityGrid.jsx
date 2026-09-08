import {
  CalendarDays,
  Clock3,
  MapPin,
  Users,
  User,
  Briefcase,
  Building2,
} from "lucide-react";

import StatusTag from "../common/StatusTag";
import Button from "../common/Button";

// =====================================================
// CONVERT TIME TO MINUTES
// =====================================================

const toMinutes = (time) => {
  if (!time) return 0;

  const [hours, minutes] = String(time)
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
};

// =====================================================
// FORMAT TIME
// =====================================================

function formatTime(time) {
  if (!time) return "";

  const [hour, minute] = String(time)
    .split(":")
    .map(Number);

  if (isNaN(hour)) return time;

  return `${String(hour).padStart(2, "0")}:${String(
    minute || 0
  ).padStart(2, "0")}`;
}

// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(date) {
  if (!date) return "";

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(
    new Date(`${date}T12:00:00`)
  );
}

// =====================================================
// GET ROOM LOCATION
// =====================================================

function getLocation(room) {
  if (!room) {
    return "Location not specified";
  }

  const location =
    room.module ??
    room.Module ??
    room.location ??
    room.Location ??
    room.roomLocation ??
    room.RoomLocation ??
    room.locationName ??
    room.LocationName ??
    room.room?.module ??
    room.room?.Module ??
    room.room?.location ??
    room.room?.Location;

  if (
    location === null ||
    location === undefined ||
    String(location).trim() === ""
  ) {
    return "Location not specified";
  }

  return String(location).trim();
}

// =====================================================
// GET SLOT STATUS
// =====================================================

function getSlotStatus(room, slot) {
  const id = String(room.id ?? room.roomId ?? '').trim();
  const code = String(room.roomNumber ?? room.roomCode ?? room.code ?? '').trim().toLowerCase();
  try {
    const overrides = JSON.parse(localStorage.getItem('spacebook_room_status_overrides') || '{}');
    const blocked = JSON.parse(localStorage.getItem('spacebook_blocked_rooms') || '[]');
    if (overrides[id] === 'Maintenance' || (code && overrides[code] === 'Maintenance')) return 'Maintenance';
    if (id && blocked.map(String).includes(id)) return 'Maintenance';
  } catch {
    // ignore
  }

  const rawRoomStatus = String(room.status ?? room.roomStatus ?? '').toLowerCase();
  if (rawRoomStatus === 'maintenance' || rawRoomStatus === 'blocked' || room.isBlocked === true || room.IsBlocked === true || room.isAvailable === false) {
    return 'Maintenance';
  }

  if (slot.status) {
    const status = String(slot.status)
      .trim()
      .toLowerCase();

    if (status === "maintenance" || status === "blocked") {
      return "Maintenance";
    }

    if (status === "available") {
      return "Available";
    }

    if (status === "pending") {
      return "Pending";
    }

    if (status === "completed") {
      return "Completed";
    }

    if (
      status === "booked" ||
      status === "approved" ||
      status === "confirmed"
    ) {
      return "Booked";
    }
  }

  if (slot.isBooked === true) {
    const bookingStatus =
      room.currentBooking?.status ||
      room.booking?.status ||
      slot.booking?.status ||
      "";

    const normalizedStatus =
      String(bookingStatus)
        .trim()
        .toLowerCase();

    if (normalizedStatus === "pending") {
      return "Pending";
    }

    if (normalizedStatus === "completed") {
      return "Completed";
    }

    return "Booked";
  }

  return "Available";
}

// =====================================================
// NORMALIZE FACILITIES
// =====================================================

function getFacilities(room) {
  const facilities =
    room.facilities ||
    room.roomFacilities ||
    [];

  if (!Array.isArray(facilities)) {
    return [];
  }

  return facilities.map((facility) => {
    if (typeof facility === "string") {
      return facility;
    }

    return (
      facility.name ||
      facility.facilityName ||
      String(facility)
    );
  });
}

// =====================================================
// AVAILABILITY GRID
// =====================================================

export default function AvailabilityGrid({
  rooms = [],
  date,
  isToday,
  nowMinutes,
  onSelectSlot,
}) {
  // ===================================================
  // CREATE CARDS
  // ===================================================

  const cards = rooms
    .flatMap((room) => {
      const timeSlots =
        room.timeSlots ||
        room.slots ||
        [];

      return timeSlots
        .filter((slot) => {
          if (!isToday) {
            return true;
          }

          const startTime =
            slot.start ||
            slot.startTime ||
            slot.fromTime;

          return (
            toMinutes(startTime) >
            nowMinutes
          );
        })
        .map((slot) => {
          const start =
            slot.start ||
            slot.startTime ||
            slot.fromTime ||
            "";

          const end =
            slot.end ||
            slot.endTime ||
            slot.toTime ||
            "";

          const status =
            getSlotStatus(
              room,
              slot
            );

          // IMPORTANT:
          // Resolve the location here and preserve it
          // with the card and selected slot.
          const location =
            getLocation(room);

          return {
            room: {
              ...room,

              // Explicitly preserve both location and module
              location,
              module:
                room.module ||
                room.Module ||
                location,
            },

            location,

            slot: {
              ...slot,
              start,
              end,
            },

            status,

            booking:
              slot.booking ||
              room.currentBooking ||
              room.booking ||
              null,

            bookingInfo: slot.bookingInfo || {
              bookedBy:
                slot.bookedBy ||
                slot.bookedByName ||
                slot.employeeName ||
                slot.requestedBy ||
                slot.userName ||
                slot.createdBy ||
                slot.user?.name ||
                slot.booking?.bookedBy ||
                slot.booking?.employeeName ||
                slot.booking?.userName ||
                room.currentBooking?.bookedBy ||
                room.currentBooking?.employeeName ||
                room.booking?.bookedBy ||
                null,
              title:
                slot.title ||
                slot.meetingTitle ||
                slot.purpose ||
                slot.reason ||
                slot.booking?.title ||
                slot.booking?.meetingTitle ||
                slot.booking?.purpose ||
                room.currentBooking?.title ||
                room.currentBooking?.meetingTitle ||
                null,
              department:
                slot.department ||
                slot.employeeDepartment ||
                slot.booking?.department ||
                slot.user?.department ||
                room.currentBooking?.department ||
                null,
              email:
                slot.email ||
                slot.userEmail ||
                slot.booking?.email ||
                slot.booking?.userEmail ||
                null,
            },
          };
        });
    })
    .sort((a, b) => {
      const timeDifference =
        toMinutes(a.slot.start) -
        toMinutes(b.slot.start);

      if (timeDifference !== 0) {
        return timeDifference;
      }

      return (
        a.room.name ||
        a.room.roomName ||
        ""
      ).localeCompare(
        b.room.name ||
        b.room.roomName ||
        ""
      );
    });

  // ===================================================
  // NO RESULTS
  // ===================================================

  if (!cards.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
        <p className="font-display text-lg font-700 text-ink">
          No rooms available for the selected criteria.
        </p>

        <p className="mt-2 text-sm text-slate">
          Try changing the date or room type.
        </p>
      </div>
    );
  }

  // ===================================================
  // GRID
  // ===================================================

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map(
        ({
          room,
          slot,
          status,
          booking,
          location,
        }) => {
          const facilities =
            getFacilities(room);

          return (
            <article
              key={`${room.id}-${slot.start}`}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200/85 bg-white p-4 shadow-card hover:shadow-card-hover hover:border-sky-300 transition-all"
            >
              <div>
                {/* HEADER */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                      {room.name ||
                        room.roomName}
                    </h2>

                    <div className="mt-1 inline-flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200/60 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {room.type ||
                          room.roomType}
                      </span>
                    </div>
                  </div>

                  <StatusTag
                    status={status}
                  />
                </div>

                {/* ROOM DETAILS */}
                <div className="mt-3 space-y-2 border-y border-slate-100 py-3 text-xs text-slate-600">
                  {/* TIME SLOT */}
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-2.5 py-1.5 font-semibold text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Clock3
                        size={14}
                        className="text-sky-600"
                      />
                      <span>
                        {formatTime(slot.start)} - {formatTime(slot.end)}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">1 hr</span>
                  </div>

                  {/* BOOKED BY / ORGANIZER INFO (When slot is Booked or Pending) */}
                  {status !== "Available" && status !== "Maintenance" && (
                    <div className="rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 p-2 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-950 dark:text-amber-300 truncate">
                        <User size={12} className="text-amber-700 dark:text-amber-400 shrink-0" />
                        <span className="truncate">
                          Booked by:{" "}
                          <span className="font-bold text-slate-900 dark:text-amber-100">
                            {slot.bookingInfo?.bookedBy || booking?.bookedBy || "Reserved"}
                          </span>
                          {(slot.bookingInfo?.department || booking?.department) && (
                            <span className="text-amber-800/80 dark:text-amber-400/90 font-normal">
                              {" "}
                              ({slot.bookingInfo?.department || booking?.department})
                            </span>
                          )}
                        </span>
                      </div>

                      {(slot.bookingInfo?.title || booking?.title) && (
                        <div className="flex items-center gap-1.5 text-[10.5px] text-amber-900/90 dark:text-amber-300/90 truncate">
                          <Briefcase size={11} className="text-amber-700 dark:text-amber-400 shrink-0" />
                          <span className="truncate italic">
                            "{slot.bookingInfo?.title || booking?.title}"
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* DATE & LOCATION */}
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <CalendarDays
                      size={13}
                      className="text-slate-400 shrink-0"
                    />
                    <span>{formatDate(date)}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-600">
                    <MapPin
                      size={13}
                      className="text-slate-400 shrink-0"
                    />
                    <span className="truncate" title={location}>{location}</span>
                  </div>

                  {/* CAPACITY */}
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Users
                      size={13}
                      className="text-slate-400 shrink-0"
                    />
                    <span>Capacity: {room.capacity} seats</span>
                  </div>
                </div>

                {/* FACILITIES */}
                <div className="mt-3">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Amenities
                  </p>

                  {facilities.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {facilities.map(
                        (facility, index) => (
                          <span
                            key={`${facility}-${index}`}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200/70 px-1.5 py-0.5 text-[9.5px] font-medium text-slate-700"
                          >
                            ✓ {facility}
                          </span>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="mt-1 text-[10px] text-slate-400 italic">
                      Standard amenities
                    </p>
                  )}
                </div>
              </div>

              {/* BUTTON */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={status === "Maintenance"}
                  onClick={() => {
                    if (status === "Maintenance") return;
                    onSelectSlot({
                      room: {
                        ...room,
                        location,
                        module:
                          room.module ||
                          location,
                      },
                      location,
                      slot,
                      status,
                      booking,
                    });
                  }}
                  className={`w-full rounded-xl py-2 px-3 text-xs font-bold transition-all ${
                    status === "Available"
                      ? "bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-xs shadow-sky-500/25 hover:scale-[1.01] active:scale-[0.99]"
                      : status === "Maintenance"
                        ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200"
                  }`}
                >
                  {status === "Available"
                    ? "Book This Slot"
                    : status === "Maintenance"
                      ? "Under Maintenance"
                      : status === "Pending"
                        ? "Pending Approval"
                        : status === "Completed"
                          ? "View History"
                          : "View Details"}
                </button>
              </div>
            </article>
          );
        }
      )}
    </div>
  );
}