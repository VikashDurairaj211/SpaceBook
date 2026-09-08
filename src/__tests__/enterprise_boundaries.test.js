import { describe, it, expect } from 'vitest'
import { validateBookingDraft } from '../api/geminiBookingBot'

describe('Enterprise Operational Boundaries & Policy Rules', () => {
  // -------------------------------------------------------------
  // 1. Operating Hours Strict Boundaries (10:00 - 22:00 IST)
  // -------------------------------------------------------------
  describe('Operating Hours Boundaries (10:00 - 22:00)', () => {
    it('ALLOWS booking at EXACT earliest opening time (10:00 - 11:00)', () => {
      const draft = { roomId: 1, date: '2026-09-09', startTime: '10:00', endTime: '11:00', attendees: 5 }
      expect(validateBookingDraft(draft).isValid).toBe(true)
    })

    it('ALLOWS booking at EXACT latest closing time (21:00 - 22:00)', () => {
      const draft = { roomId: 1, date: '2026-09-09', startTime: '21:00', endTime: '22:00', attendees: 5 }
      expect(validateBookingDraft(draft).isValid).toBe(true)
    })

    it('REJECTS booking before 10:00 AM (e.g. 09:00 - 10:00)', () => {
      const draft = { roomId: 1, date: '2026-09-09', startTime: '09:00', endTime: '10:00', attendees: 5 }
      const res = validateBookingDraft(draft)
      expect(res.isValid).toBe(false)
      expect(res.reason).toContain('between 10:00 AM and 10:00 PM')
    })

    it('REJECTS booking extending past 22:00 PM (e.g. 21:30 - 22:30)', () => {
      const draft = { roomId: 1, date: '2026-09-09', startTime: '21:30', endTime: '22:30', attendees: 5 }
      const res = validateBookingDraft(draft)
      expect(res.isValid).toBe(false)
      expect(res.reason).toContain('between 10:00 AM and 10:00 PM')
    })

    it('REJECTS overnight or reverse time slots (e.g. 14:00 - 12:00)', () => {
      const draft = { roomId: 1, date: '2026-09-09', startTime: '14:00', endTime: '12:00', attendees: 5 }
      const res = validateBookingDraft(draft)
      expect(res.isValid).toBe(false)
    })
  })

  // -------------------------------------------------------------
  // 2. Weekend Restriction (Saturday & Sunday Lockout)
  // -------------------------------------------------------------
  describe('Weekend Lockout Policies', () => {
    it('ALLOWS bookings on Monday through Friday (Working Days)', () => {
      const monday = { roomId: 1, date: '2026-09-07', startTime: '10:00', endTime: '11:00', attendees: 5 } // Monday
      const wednesday = { roomId: 1, date: '2026-09-09', startTime: '10:00', endTime: '11:00', attendees: 5 } // Wednesday
      const friday = { roomId: 1, date: '2026-09-11', startTime: '10:00', endTime: '11:00', attendees: 5 } // Friday

      expect(validateBookingDraft(monday).isValid).toBe(true)
      expect(validateBookingDraft(wednesday).isValid).toBe(true)
      expect(validateBookingDraft(friday).isValid).toBe(true)
    })

    it('STRICTLY REJECTS bookings on Saturday', () => {
      const saturday = { roomId: 1, date: '2026-09-12', startTime: '10:00', endTime: '11:00', attendees: 5 }
      const res = validateBookingDraft(saturday)
      expect(res.isValid).toBe(false)
      expect(res.reason).toContain('closed on weekends')
    })

    it('STRICTLY REJECTS bookings on Sunday', () => {
      const sunday = { roomId: 1, date: '2026-09-13', startTime: '10:00', endTime: '11:00', attendees: 5 }
      const res = validateBookingDraft(sunday)
      expect(res.isValid).toBe(false)
      expect(res.reason).toContain('closed on weekends')
    })
  })

  // -------------------------------------------------------------
  // 3. Hotseat Fair-Use Policy & Room Capacity Limits
  // -------------------------------------------------------------
  describe('Capacity Bounds & Fair-Use Policy', () => {
    it('enforces 1-desk-per-employee fair use policy on the same day', () => {
      const existingUserBookings = [
        { id: 501, userId: 101, date: '2026-09-09', seatNumber: 'EO1-15', status: 'Confirmed' },
      ]

      const isHotseatEligible = (userId, date, bookings) => {
        return !bookings.some(
          (b) => b.userId === userId && b.date === date && b.status !== 'Cancelled'
        )
      }

      // Same user on same day -> Rejected
      expect(isHotseatEligible(101, '2026-09-09', existingUserBookings)).toBe(false)

      // Same user on NEXT day -> Allowed
      expect(isHotseatEligible(101, '2026-09-10', existingUserBookings)).toBe(true)

      // Different user on same day -> Allowed
      expect(isHotseatEligible(102, '2026-09-09', existingUserBookings)).toBe(true)
    })

    it('clamps attendee numbers between minimum 1 and physical room capacity', () => {
      const zeroPax = { roomId: 1, date: '2026-09-09', startTime: '10:00', endTime: '11:00', attendees: 0 }
      const resultZero = validateBookingDraft(zeroPax)
      expect(resultZero.sanitizedDraft.attendees).toBe(1) // minimum 1

      const excessivePax = { roomId: 2, date: '2026-09-09', startTime: '10:00', endTime: '11:00', attendees: 999 } // Room 2 max is 8
      const resultExcess = validateBookingDraft(excessivePax)
      expect(resultExcess.sanitizedDraft.attendees).toBe(8) // clamped to 8
    })
  })
})
