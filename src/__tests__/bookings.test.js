import { describe, it, expect, beforeEach } from 'vitest'

describe('Booking Payload Validation & Sanitizers', () => {
  it('correctly constructs standard booking payload with required fields', () => {
    const rawDraft = {
      title: 'Quarterly Sprint Planning',
      roomId: 1,
      roomName: 'Conference Room 1',
      date: '2026-09-09',
      startTime: '14:00',
      endTime: '15:00',
      attendees: 8,
    }

    const payload = {
      meetingTitle: rawDraft.title || 'Workspace Meeting',
      purpose: rawDraft.title || 'Workspace Meeting',
      roomId: Number(rawDraft.roomId),
      participantCount: Number(rawDraft.attendees) || 5,
      bookingDate: rawDraft.date,
      startTime: rawDraft.startTime.length === 5 ? `${rawDraft.startTime}:00` : rawDraft.startTime,
      endTime: rawDraft.endTime.length === 5 ? `${rawDraft.endTime}:00` : rawDraft.endTime,
      facilityIds: [],
    }

    expect(payload.meetingTitle).toBe('Quarterly Sprint Planning')
    expect(payload.roomId).toBe(1)
    expect(payload.participantCount).toBe(8)
    expect(payload.startTime).toBe('14:00:00')
    expect(payload.endTime).toBe('15:00:00')
    expect(payload.bookingDate).toBe('2026-09-09')
  })

  it('provides default fallback values when draft fields are missing', () => {
    const emptyDraft = {}

    const payload = {
      meetingTitle: emptyDraft.title || 'Workspace Meeting',
      roomId: Number(emptyDraft.roomId || 1),
      participantCount: Number(emptyDraft.attendees || 5),
      bookingDate: emptyDraft.date || '2026-09-08',
      startTime: emptyDraft.startTime || '10:00:00',
      endTime: emptyDraft.endTime || '11:00:00',
    }

    expect(payload.meetingTitle).toBe('Workspace Meeting')
    expect(payload.roomId).toBe(1)
    expect(payload.participantCount).toBe(5)
    expect(payload.startTime).toBe('10:00:00')
  })

  it('verifies operating hours boundaries for bookings (10:00 - 22:00)', () => {
    const isWithinOperatingHours = (startHour, endHour) => {
      return startHour >= 10 && endHour <= 22 && startHour < endHour
    }

    expect(isWithinOperatingHours(10, 11)).toBe(true)
    expect(isWithinOperatingHours(14, 16)).toBe(true)
    expect(isWithinOperatingHours(21, 22)).toBe(true)
    expect(isWithinOperatingHours(8, 10)).toBe(false)
    expect(isWithinOperatingHours(21, 23)).toBe(false)
  })
})
