import { describe, it, expect } from 'vitest'
import {
  parseLocally,
  ALL_SYSTEM_ROOMS,
} from '../api/geminiBookingBot'

describe('Aira AI Assistant & NLP Engine (geminiBookingBot.js)', () => {
  const todayIso = '2026-09-08'
  const mockNow = new Date('2026-09-08T10:00:00')
  const defaultStartTime = '11:00'
  const defaultEndTime = '12:00'
  const defaultDate = '2026-09-08'

  it('contains exactly 15 system rooms across 3 modules', () => {
    expect(ALL_SYSTEM_ROOMS).toHaveLength(15)
    
    const m1Rooms = ALL_SYSTEM_ROOMS.filter((r) => r.module.includes('Module 1 - Elcot'))
    const m2Rooms = ALL_SYSTEM_ROOMS.filter((r) => r.module.includes('Module 2 - Elcot'))
    const tidelRooms = ALL_SYSTEM_ROOMS.filter((r) => r.module.includes('Tidel'))

    expect(m1Rooms).toHaveLength(5)
    expect(m2Rooms).toHaveLength(5)
    expect(tidelRooms).toHaveLength(5)
  })

  it('classifies general greetings as general_query with readyToBook false', () => {
    const result = parseLocally(
      'Hello Aira!',
      ALL_SYSTEM_ROOMS,
      todayIso,
      mockNow,
      defaultStartTime,
      defaultEndTime,
      defaultDate
    )

    expect(result.intent).toBe('general_query')
    expect(result.readyToBook).toBe(false)
    expect(result.bookingDraft).toBeNull()
    expect(result.botReply).toContain('Aira')
  })

  it('answers operating hours queries accurately', () => {
    const result = parseLocally(
      'What are the office operating hours?',
      ALL_SYSTEM_ROOMS,
      todayIso,
      mockNow,
      defaultStartTime,
      defaultEndTime,
      defaultDate
    )

    expect(result.intent).toBe('general_query')
    expect(result.botReply).toContain('10:00 AM to 10:00 PM IST')
    expect(result.readyToBook).toBe(false)
  })

  it('answers check-in and auto-release questions accurately', () => {
    const result = parseLocally(
      'How does check-in and auto release work?',
      ALL_SYSTEM_ROOMS,
      todayIso,
      mockNow,
      defaultStartTime,
      defaultEndTime,
      defaultDate
    )

    expect(result.intent).toBe('general_query')
    expect(result.botReply).toContain('30-Minute Grace Period')
    expect(result.readyToBook).toBe(false)
  })

  it('answers hotseat desk inventory questions accurately', () => {
    const result = parseLocally(
      'How many hotseat desks do we have in Tidel Park?',
      ALL_SYSTEM_ROOMS,
      todayIso,
      mockNow,
      defaultStartTime,
      defaultEndTime,
      defaultDate
    )

    expect(result.intent).toBe('general_query')
    expect(result.botReply).toContain('453 Total')
    expect(result.botReply).toContain('224 Desks')
  })

  it('extracts booking details when user explicitly commands to book a room', () => {
    const result = parseLocally(
      'Book Training Room 1 in Module 2 for 25 people at 2:00 PM tomorrow',
      ALL_SYSTEM_ROOMS,
      todayIso,
      mockNow,
      defaultStartTime,
      defaultEndTime,
      defaultDate
    )

    expect(result.intent).toBe('book_room')
    expect(result.readyToBook).toBe(true)
    expect(result.bookingDraft).toBeDefined()
    expect(result.bookingDraft.attendees).toBe(25)
    expect(result.bookingDraft.roomId).toBe(6) // Training Room 1 in Module 2
    expect(result.bookingDraft.startTime).toBe('14:00')
    expect(result.bookingDraft.endTime).toBe('15:00')
  })
})
