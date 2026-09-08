import { describe, it, expect } from 'vitest'
import {
  normalizeModules,
  normalizeRoomTypes,
  DEFAULT_MODULES,
  DEFAULT_ROOM_TYPES,
} from '../api/rooms'

describe('Room & Campus Normalizers (rooms.js)', () => {
  it('returns default campus modules when input is null, empty, or undefined', () => {
    expect(normalizeModules(null)).toEqual(DEFAULT_MODULES)
    expect(normalizeModules([])).toEqual(DEFAULT_MODULES)
    expect(normalizeModules({})).toEqual(DEFAULT_MODULES)
  })

  it('normalizes string arrays and removes duplicates for campus modules', () => {
    const raw = [
      'Module 1 - Elcot Park - CMB',
      'Module 2 - Elcot Park - CMB',
      'Module 1 - Elcot Park - CMB',
    ]
    const result = normalizeModules(raw)
    expect(result).toHaveLength(2)
    expect(result).toContain('Module 1 - Elcot Park - CMB')
    expect(result).toContain('Module 2 - Elcot Park - CMB')
  })

  it('normalizes module object arrays with moduleName or location fields', () => {
    const raw = [
      { moduleName: 'Module 1 - Tidel Park - CMB' },
      { name: 'Module 1 - Elcot Park - CMB' },
    ]
    const result = normalizeModules(raw)
    expect(result).toEqual([
      'Module 1 - Tidel Park - CMB',
      'Module 1 - Elcot Park - CMB',
    ])
  })

  it('returns default room types when input is empty', () => {
    expect(normalizeRoomTypes(null)).toEqual(DEFAULT_ROOM_TYPES)
    expect(normalizeRoomTypes([])).toEqual(DEFAULT_ROOM_TYPES)
  })

  it('correctly maps room type strings to ID and name objects', () => {
    const raw = ['Conference', 'Training Room', 'Discussion']
    const result = normalizeRoomTypes(raw)
    expect(result).toEqual([
      { id: 1, name: 'Conference' },
      { id: 2, name: 'Training Room' },
      { id: 3, name: 'Discussion' },
    ])
  })
})
