import { describe, it, expect } from 'vitest'
import { generateCorrelationId } from '../utils/logger'
import { sanitizeText, validateBookingDraft } from '../api/geminiBookingBot'

describe('Enterprise Security & AI Defense Guards', () => {
  it('generates unique, valid correlation IDs for request tracing', () => {
    const id1 = generateCorrelationId()
    const id2 = generateCorrelationId()
    expect(id1).toBeDefined()
    expect(id2).toBeDefined()
    expect(id1).not.toEqual(id2)
    expect(typeof id1).toBe('string')
  })

  it('sanitizes malicious XSS scripts from user or AI text', () => {
    const dirty = '<script>alert("hack")</script>Team Sync'
    const sanitized = sanitizeText(dirty)
    expect(sanitized).not.toContain('<script>')
    expect(sanitized).toBe('alert("hack")Team Sync')

    const jsInjection = 'javascript:evilCode()'
    expect(sanitizeText(jsInjection)).not.toContain('javascript:')
  })

  it('rejects AI drafts with non-existent room IDs', () => {
    const fakeDraft = {
      roomId: 999,
      date: '2026-09-09',
      startTime: '10:00',
      endTime: '11:00',
      attendees: 5,
    }

    const result = validateBookingDraft(fakeDraft)
    expect(result.isValid).toBe(false)
    expect(result.reason).toContain('Invalid room selection')
    expect(result.sanitizedDraft).toBeNull()
  })

  it('rejects AI drafts scheduled on weekends (Saturday/Sunday)', () => {
    const weekendDraft = {
      roomId: 1,
      date: '2026-09-12', // Saturday
      startTime: '10:00',
      endTime: '11:00',
      attendees: 5,
    }

    const result = validateBookingDraft(weekendDraft)
    expect(result.isValid).toBe(false)
    expect(result.reason).toContain('closed on weekends')
  })

  it('rejects AI drafts with out-of-bounds office hours (e.g. 23:00)', () => {
    const nightDraft = {
      roomId: 1,
      date: '2026-09-09',
      startTime: '22:00',
      endTime: '23:00',
      attendees: 5,
    }

    const result = validateBookingDraft(nightDraft)
    expect(result.isValid).toBe(false)
    expect(result.reason).toContain('between 10:00 AM and 10:00 PM')
  })

  it('clamps attendee count to room capacity limit', () => {
    const overCapacityDraft = {
      roomId: 2, // Discussion Room 1 (Capacity 8)
      date: '2026-09-09',
      startTime: '14:00',
      endTime: '15:00',
      attendees: 100,
    }

    const result = validateBookingDraft(overCapacityDraft)
    expect(result.isValid).toBe(true)
    expect(result.sanitizedDraft.attendees).toBe(8)
  })
})
