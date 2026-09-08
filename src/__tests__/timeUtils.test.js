import { describe, it, expect } from 'vitest'
import {
  timeToMinutes,
  minutesToTime,
  isValidTimeRange,
  durationInMinutes,
  formatTime24,
  formatDateWithZeros,
} from '../utils/timeUtils'

describe('Time and Date Utilities (timeUtils)', () => {
  it('correctly converts time strings to minutes', () => {
    expect(timeToMinutes('10:00')).toBe(600)
    expect(timeToMinutes('14:30')).toBe(870)
    expect(timeToMinutes('00:00')).toBe(0)
    expect(timeToMinutes('')).toBe(0)
  })

  it('correctly converts minutes to HH:MM time strings', () => {
    expect(minutesToTime(600)).toBe('10:00')
    expect(minutesToTime(870)).toBe('14:30')
    expect(minutesToTime(0)).toBe('00:00')
  })

  it('validates start and end time ranges', () => {
    expect(isValidTimeRange('10:00', '11:00')).toBe(true)
    expect(isValidTimeRange('14:00', '14:00')).toBe(false)
    expect(isValidTimeRange('16:00', '15:00')).toBe(false)
    expect(isValidTimeRange('', '11:00')).toBe(false)
  })

  it('calculates duration in minutes accurately', () => {
    expect(durationInMinutes('10:00', '11:30')).toBe(90)
    expect(durationInMinutes('14:00', '15:00')).toBe(60)
    expect(durationInMinutes('15:00', '14:00')).toBe(0)
  })

  it('formats ISO timestamps and strings to clean 24-hour HH:MM', () => {
    expect(formatTime24('2026-09-08T14:30:00')).toBe('14:30')
    expect(formatTime24('9:5:00')).toBe('09:05')
    expect(formatTime24('18:00')).toBe('18:00')
    expect(formatTime24('')).toBe('')
    expect(formatTime24(null)).toBe('')
  })

  it('formats date strings with leading zeros', () => {
    expect(formatDateWithZeros('2026-9-8')).toBe('2026-09-08')
    expect(formatDateWithZeros('2026-09-08T10:00:00')).toBe('2026-09-08')
    expect(formatDateWithZeros('8/9/2026')).toBe('08/09/2026')
    expect(formatDateWithZeros('')).toBe('')
    expect(formatDateWithZeros(null)).toBe('')
  })
})
