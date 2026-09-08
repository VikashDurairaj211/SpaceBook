import { describe, it, expect } from 'vitest'
import {
  hasTimeConflict,
  findConflictingBookings,
  isCheckInEligible,
  isAutoReleaseRequired,
  simulateConcurrentBookings,
} from '../utils/bookingConflict'

describe('Enterprise Concurrency, Conflicts & Auto-Release Engine', () => {
  // -------------------------------------------------------------
  // 1. Time Slot Overlap Matrix
  // -------------------------------------------------------------
  describe('Time Slot Overlap Matrix', () => {
    it('detects exact time overlap as a conflict (10:00-12:00 vs 10:00-12:00)', () => {
      const slotA = { startTime: '10:00', endTime: '12:00' }
      const slotB = { startTime: '10:00', endTime: '12:00' }
      expect(hasTimeConflict(slotA, slotB)).toBe(true)
    })

    it('detects partial start overlap as a conflict (10:00-12:00 vs 11:00-13:00)', () => {
      const slotA = { startTime: '10:00', endTime: '12:00' }
      const slotB = { startTime: '11:00', endTime: '13:00' }
      expect(hasTimeConflict(slotA, slotB)).toBe(true)
    })

    it('detects partial end overlap as a conflict (11:00-13:00 vs 10:00-12:00)', () => {
      const slotA = { startTime: '11:00', endTime: '13:00' }
      const slotB = { startTime: '10:00', endTime: '12:00' }
      expect(hasTimeConflict(slotA, slotB)).toBe(true)
    })

    it('detects enclosed subset overlap as a conflict (10:00-14:00 vs 11:00-12:00)', () => {
      const slotA = { startTime: '10:00', endTime: '14:00' }
      const slotB = { startTime: '11:00', endTime: '12:00' }
      expect(hasTimeConflict(slotA, slotB)).toBe(true)
    })

    it('ALLOWS back-to-back adjacent bookings without conflict (10:00-11:00 followed by 11:00-12:00)', () => {
      const slotA = { startTime: '10:00', endTime: '11:00' }
      const slotB = { startTime: '11:00', endTime: '12:00' }
      expect(hasTimeConflict(slotA, slotB)).toBe(false)
    })

    it('ALLOWS non-overlapping separate time slots (10:00-11:00 and 14:00-15:00)', () => {
      const slotA = { startTime: '10:00', endTime: '11:00' }
      const slotB = { startTime: '14:00', endTime: '15:00' }
      expect(hasTimeConflict(slotA, slotB)).toBe(false)
    })
  })

  // -------------------------------------------------------------
  // 2. Existing Bookings Conflict Filtering
  // -------------------------------------------------------------
  describe('Room & Date Specific Conflict Filtering', () => {
    const existingList = [
      { id: 101, roomId: 1, date: '2026-09-09', startTime: '10:00', endTime: '12:00', status: 'Confirmed' },
      { id: 102, roomId: 1, date: '2026-09-09', startTime: '14:00', endTime: '16:00', status: 'Confirmed' },
      { id: 103, roomId: 2, date: '2026-09-09', startTime: '10:00', endTime: '12:00', status: 'Confirmed' },
      { id: 104, roomId: 1, date: '2026-09-09', startTime: '16:00', endTime: '17:00', status: 'Cancelled' },
    ]

    it('finds conflict for same room, same date, overlapping time', () => {
      const req = { roomId: 1, date: '2026-09-09', startTime: '11:00', endTime: '13:00' }
      const conflicts = findConflictingBookings(req, existingList)
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].id).toBe(101)
    })

    it('ignores bookings in DIFFERENT rooms on the same time slot', () => {
      const req = { roomId: 3, date: '2026-09-09', startTime: '10:00', endTime: '12:00' }
      const conflicts = findConflictingBookings(req, existingList)
      expect(conflicts).toHaveLength(0)
    })

    it('ignores CANCELLED bookings so slots can be re-booked immediately', () => {
      const req = { roomId: 1, date: '2026-09-09', startTime: '16:00', endTime: '17:00' }
      const conflicts = findConflictingBookings(req, existingList)
      expect(conflicts).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------
  // 3. Concurrent Booking & Race Condition Simulation
  // -------------------------------------------------------------
  describe('Concurrent Race Condition Handling', () => {
    it('guarantees only 1 booking succeeds when 10 users simultaneously book the exact same slot', () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => ({
        id: 200 + i,
        userId: 1000 + i,
        roomId: 1,
        date: '2026-09-09',
        startTime: '14:00',
        endTime: '15:00',
      }))

      const { successful, conflicted } = simulateConcurrentBookings(concurrentRequests, [])

      expect(successful).toHaveLength(1)
      expect(successful[0].status).toBe(201)

      expect(conflicted).toHaveLength(9)
      conflicted.forEach((c) => {
        expect(c.status).toBe(409)
        expect(c.error).toContain('409 Conflict')
      })
    })

    it('permits all concurrent requests if they target DIFFERENT rooms', () => {
      const parallelRoomsRequests = Array.from({ length: 5 }, (_, i) => ({
        id: 300 + i,
        userId: 2000 + i,
        roomId: i + 1, // Room 1, 2, 3, 4, 5
        date: '2026-09-09',
        startTime: '10:00',
        endTime: '11:00',
      }))

      const { successful, conflicted } = simulateConcurrentBookings(parallelRoomsRequests, [])
      expect(successful).toHaveLength(5)
      expect(conflicted).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------
  // 4. 30-Minute Check-in Window & Auto-Release Policy
  // -------------------------------------------------------------
  describe('30-Minute Check-in & Auto-Release Verification', () => {
    const bookingDate = '2026-09-09'
    const startTime = '14:00'

    it('rejects check-in BEFORE reservation start time (e.g. at 13:45)', () => {
      const earlyTime = new Date('2026-09-09T13:45:00')
      expect(isCheckInEligible(bookingDate, startTime, earlyTime)).toBe(false)
    })

    it('ALLOWS check-in AT the start time (e.g. at 14:00)', () => {
      const atStartTime = new Date('2026-09-09T14:00:00')
      expect(isCheckInEligible(bookingDate, startTime, atStartTime)).toBe(true)
    })

    it('ALLOWS check-in WITHIN 30-minute grace window (e.g. at 14:20)', () => {
      const withinGrace = new Date('2026-09-09T14:20:00')
      expect(isCheckInEligible(bookingDate, startTime, withinGrace)).toBe(true)
    })

    it('ALLOWS check-in AT EXACT boundary (e.g. at 14:30:00)', () => {
      const boundaryTime = new Date('2026-09-09T14:30:00')
      expect(isCheckInEligible(bookingDate, startTime, boundaryTime)).toBe(true)
    })

    it('REJECTS check-in AFTER 30-minute grace period has expired (e.g. at 14:31)', () => {
      const expiredTime = new Date('2026-09-09T14:31:00')
      expect(isCheckInEligible(bookingDate, startTime, expiredTime)).toBe(false)
    })

    it('triggers auto-release for unconfirmed reservation after 30 minutes (at 14:35)', () => {
      const pastGrace = new Date('2026-09-09T14:35:00')
      expect(isAutoReleaseRequired(bookingDate, startTime, false, pastGrace)).toBe(true)
    })

    it('DOES NOT trigger auto-release if employee has already checked in', () => {
      const pastGrace = new Date('2026-09-09T14:35:00')
      expect(isAutoReleaseRequired(bookingDate, startTime, true, pastGrace)).toBe(false)
    })
  })
})
