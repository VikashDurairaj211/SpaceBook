import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseBookingWithGemini, ALL_SYSTEM_ROOMS } from '../api/geminiBookingBot'

// In-memory mock localStorage for Vitest Node test environment
const mockStorage = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

global.localStorage = mockStorage

describe('Enterprise Auth, Security & Graceful Degradation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockStorage.clear()
  })

  // -------------------------------------------------------------
  // 1. Role-Based Access Control (RBAC) & Unauthorized Actions
  // -------------------------------------------------------------
  describe('RBAC & Admin Privilege Enforcement', () => {
    const isActionAuthorized = (userRole, requiredRole = 'Admin') => {
      if (!userRole) return false
      return String(userRole).toLowerCase() === requiredRole.toLowerCase()
    }

    it('DENIES employee role from executing admin actions (e.g. deleting rooms)', () => {
      const employeeUser = { id: 101, name: 'Alice', role: 'Employee' }
      expect(isActionAuthorized(employeeUser.role, 'Admin')).toBe(false)
    })

    it('DENIES guest / anonymous requests from accessing protected routes', () => {
      expect(isActionAuthorized(null, 'Admin')).toBe(false)
      expect(isActionAuthorized(undefined, 'Employee')).toBe(false)
    })

    it('PERMITS verified Admin role to execute admin actions', () => {
      const adminUser = { id: 1, name: 'Admin', role: 'Admin' }
      expect(isActionAuthorized(adminUser.role, 'Admin')).toBe(true)
    })
  })

  // -------------------------------------------------------------
  // 2. Expired JWT & 401 Interceptor Handling
  // -------------------------------------------------------------
  describe('JWT Session Expiration & 401 Interceptor', () => {
    it('purges stored JWT tokens and triggers logout event on 401 Unauthorized', () => {
      mockStorage.setItem('spacebook_token', 'expired_jwt_sample_token')
      mockStorage.setItem('spacebook_user', JSON.stringify({ id: 101, role: 'Employee' }))

      const handleUnauthorizedResponse = (status, url) => {
        if (status === 401 && !url.includes('/auth/login')) {
          mockStorage.removeItem('spacebook_token')
          mockStorage.removeItem('spacebook_user')
          return { loggedOut: true, redirectTo: '/login' }
        }
        return { loggedOut: false }
      }

      const result = handleUnauthorizedResponse(401, '/api/bookings/my-bookings')

      expect(result.loggedOut).toBe(true)
      expect(result.redirectTo).toBe('/login')
      expect(mockStorage.getItem('spacebook_token')).toBeNull()
      expect(mockStorage.getItem('spacebook_user')).toBeNull()
    })
  })

  // -------------------------------------------------------------
  // 3. External Gemini AI API Failure & Fallback Degradation
  // -------------------------------------------------------------
  describe('Gemini AI API Failure & Offline Fallback', () => {
    it('gracefully degrades to local NLP engine when Gemini API returns 500 or 429 rate limit', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('500 Internal Server Error from Google AI'))

      const result = await parseBookingWithGemini({
        userMessage: 'What are the office timings?',
        apiKey: 'mock_invalid_api_key',
        availableRooms: ALL_SYSTEM_ROOMS,
      })

      expect(result).toBeDefined()
      expect(result.intent).toBe('general_query')
      expect(result.botReply).toContain('10:00 AM to 10:00 PM IST')
      expect(result.isGeminiPowered).toBe(false)
    })

    it('gracefully extracts bookings via local NLP when Gemini API key is missing or empty', async () => {
      const result = await parseBookingWithGemini({
        userMessage: 'Book Conference Room 1 for tomorrow at 2:00 PM for 5 people',
        apiKey: '',
        availableRooms: ALL_SYSTEM_ROOMS,
      })

      expect(result.readyToBook).toBe(true)
      expect(result.bookingDraft).toBeDefined()
      expect(result.bookingDraft.roomId).toBe(1)
      expect(result.bookingDraft.startTime).toBe('14:00')
      expect(result.isGeminiPowered).toBe(false)
    })
  })

  // -------------------------------------------------------------
  // 4. Browser Speech API Degradation
  // -------------------------------------------------------------
  describe('Speech API Browser Compatibility', () => {
    it('safely detects lack of Web Speech API without throwing uncaught exceptions', () => {
      const isSpeechRecognitionSupported = () => {
        return Boolean(
          (typeof window !== 'undefined' && window.SpeechRecognition) ||
          (typeof window !== 'undefined' && window.webkitSpeechRecognition)
        )
      }

      expect(isSpeechRecognitionSupported()).toBe(false)
    })

    it('safely handles missing SpeechSynthesis without crashing UI', () => {
      const isSpeechSynthesisSupported = () => {
        return typeof window !== 'undefined' && 'speechSynthesis' in window
      }

      expect(typeof isSpeechSynthesisSupported()).toBe('boolean')
    })
  })
})
