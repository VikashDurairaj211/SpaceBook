/**
 * SpaceBook Enterprise Booking Conflict & Check-In Window Engine
 * Provides deterministic time slot conflict detection, concurrency handling, and auto-release logic.
 */

import { timeToMinutes } from "./timeUtils";

/**
 * Checks whether two time slots on the same date conflict.
 * Uses interval intersection: [startA, endA) and [startB, endB)
 * Note: Back-to-back adjacent bookings (e.g. 10:00-11:00 and 11:00-12:00) do NOT conflict.
 */
export function hasTimeConflict(slotA, slotB) {
  if (!slotA || !slotB) return false;

  const startA = timeToMinutes(slotA.startTime);
  const endA = timeToMinutes(slotA.endTime);
  const startB = timeToMinutes(slotB.startTime);
  const endB = timeToMinutes(slotB.endTime);

  if (startA >= endA || startB >= endB) return false;

  // Overlap occurs if and only if: max(startA, startB) < min(endA, endB)
  return Math.max(startA, startB) < Math.min(endA, endB);
}

/**
 * Detects all existing bookings that conflict with the incoming booking request.
 */
export function findConflictingBookings(newBooking, existingBookings = []) {
  if (!newBooking || !Array.isArray(existingBookings)) return [];

  const targetRoomId = Number(newBooking.roomId);
  const targetDate = String(newBooking.bookingDate || newBooking.date || "").trim();

  return existingBookings.filter((existing) => {
    // Ignore cancelled or rejected bookings
    const status = String(existing.status || "").toUpperCase();
    if (status === "CANCELLED" || status === "REJECTED") return false;

    // Check same room and same date
    const existingRoomId = Number(existing.roomId);
    const existingDate = String(existing.bookingDate || existing.date || "").trim();

    if (existingRoomId !== targetRoomId || existingDate !== targetDate) {
      return false;
    }

    return hasTimeConflict(newBooking, existing);
  });
}

/**
 * Evaluates whether a reservation is within its 30-minute check-in grace period window.
 * Check-in is valid from: [bookingStartTime, bookingStartTime + 30 minutes]
 */
export function isCheckInEligible(bookingDate, startTime, currentTime = new Date()) {
  if (!bookingDate || !startTime) return false;

  const [year, month, day] = String(bookingDate).split("-").map(Number);
  const [hour, min] = String(startTime).split(":").map(Number);

  const slotStart = new Date(year, month - 1, day, hour, min, 0);
  const slotGraceEnd = new Date(slotStart.getTime() + 30 * 60 * 1000); // +30 mins

  const nowTime = currentTime instanceof Date ? currentTime.getTime() : new Date(currentTime).getTime();

  return nowTime >= slotStart.getTime() && nowTime <= slotGraceEnd.getTime();
}

/**
 * Evaluates whether an unconfirmed reservation must be auto-released.
 * Triggers if currentTime > bookingStartTime + 30 minutes and user has not checked in.
 */
export function isAutoReleaseRequired(bookingDate, startTime, isCheckedIn = false, currentTime = new Date()) {
  if (isCheckedIn || !bookingDate || !startTime) return false;

  const [year, month, day] = String(bookingDate).split("-").map(Number);
  const [hour, min] = String(startTime).split(":").map(Number);

  const slotGraceEnd = new Date(year, month - 1, day, hour, min + 30, 0);
  const nowTime = currentTime instanceof Date ? currentTime.getTime() : new Date(currentTime).getTime();

  return nowTime > slotGraceEnd.getTime();
}

/**
 * Simulates concurrent / race-condition booking requests attempting to book the same room simultaneously.
 * Guaranteed Atomic Isolation: First request locks the slot, subsequent conflicting requests receive 409 Conflict.
 */
export function simulateConcurrentBookings(bookingRequests = [], existingBookings = []) {
  const committed = [...existingBookings];
  const successful = [];
  const conflicted = [];

  for (const req of bookingRequests) {
    const conflicts = findConflictingBookings(req, committed);

    if (conflicts.length === 0) {
      committed.push(req);
      successful.push({
        status: 201,
        bookingId: req.id || Math.floor(1000 + Math.random() * 9000),
        booking: req,
      });
    } else {
      conflicted.push({
        status: 409,
        error: "409 Conflict - Time slot is already reserved by another transaction",
        conflictingWith: conflicts,
        attemptedBooking: req,
      });
    }
  }

  return { successful, conflicted, committed };
}
