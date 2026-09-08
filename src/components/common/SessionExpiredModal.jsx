import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  ShieldAlert,
  LogIn,
  Lock,
  ArrowRight,
} from 'lucide-react'

export default function SessionExpiredModal({ open, onClose }) {
  const navigate = useNavigate()
  const TOTAL_SECONDS = 15
  const [countdown, setCountdown] = useState(TOTAL_SECONDS)

  useEffect(() => {
    if (!open) {
      setCountdown(TOTAL_SECONDS)
      return
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          handleLoginRedirect()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [open])

  const handleLoginRedirect = () => {
    localStorage.removeItem('spacebook_token')
    localStorage.removeItem('spacebook_user')
    if (onClose) onClose()
    navigate('/login')
  }

  if (!open || typeof document === 'undefined') return null

  // SVG Circular progress calculation
  const radius = 24
  const circumference = 2 * Math.PI * radius
  const progressOffset = circumference - (countdown / TOTAL_SECONDS) * circumference
  const isUrgent = countdown <= 5

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md animate-in fade-in duration-200"
      style={{ fontFamily: 'var(--fontFamilyBase, "Segoe UI Variable", "Segoe UI", sans-serif)' }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-300/60 bg-white/95 dark:bg-slate-900/95 p-6 sm:p-7 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200">
        {/* Animated Top Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 animate-pulse" />

        {/* Ambient background decorative glow */}
        <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-amber-400/15 blur-2xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-orange-500/10 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col items-center text-center">
          {/* Animated Shield with Ripple Radar Effect */}
          <div className="relative mb-5 flex items-center justify-center">
            {/* Outer Ripple 1 */}
            <div className="absolute h-24 w-24 rounded-full bg-amber-400/20 animate-ping duration-1000" />
            {/* Outer Ripple 2 */}
            <div className="absolute h-20 w-20 rounded-full bg-amber-400/25 animate-pulse" />

            {/* Core Shield Badge */}
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/30 ring-4 ring-white dark:ring-slate-800">
              <ShieldAlert size={32} className="animate-bounce duration-700" />
            </div>

            {/* Lock Mini Icon Badge */}
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-amber-400 shadow-sm border border-white dark:border-slate-800">
              <Lock size={12} />
            </div>
          </div>

          <h3 className="font-display text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Security Session Expired
          </h3>

          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm">
            For corporate compliance and workspace data safety, your active session timed out due to inactivity.
          </p>

          {/* Interactive Live Countdown Ring Container */}
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-900/60 px-4 py-2.5 shadow-inner">
            {/* Circular SVG Timer */}
            <div className="relative flex h-14 w-14 items-center justify-center shrink-0">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 60 60">
                {/* Background Track */}
                <circle
                  cx="30"
                  cy="30"
                  r={radius}
                  className="stroke-amber-200/80 dark:stroke-amber-900/40"
                  strokeWidth="4"
                  fill="transparent"
                />
                {/* Active Progress Ring */}
                <circle
                  cx="30"
                  cy="30"
                  r={radius}
                  className={`transition-all duration-1000 ease-linear ${
                    isUrgent
                      ? 'stroke-rose-600 dark:stroke-rose-500'
                      : 'stroke-amber-500 dark:stroke-amber-400'
                  }`}
                  strokeWidth="4"
                  strokeDasharray={circumference}
                  strokeDashoffset={progressOffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              {/* Center Counter text */}
              <span
                className={`absolute font-mono font-black text-sm ${
                  isUrgent ? 'text-rose-600 dark:text-rose-400 animate-pulse' : 'text-amber-900 dark:text-amber-200'
                }`}
              >
                {countdown}s
              </span>
            </div>

            {/* Informative Text */}
            <div className="text-left">
              <div className="text-xs font-bold text-amber-950 dark:text-amber-200">
                {isUrgent ? 'Redirecting shortly...' : 'Automatic Redirection'}
              </div>
              <div className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                Logging out in {countdown} seconds
              </div>
            </div>
          </div>

          {/* Action Button: Log In Again */}
          <div className="mt-6 w-full">
            <button
              type="button"
              onClick={handleLoginRedirect}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white px-5 py-3 text-sm font-bold shadow-lg shadow-sky-600/25 hover:shadow-xl hover:shadow-sky-600/30 transition-all duration-200 active:scale-98"
            >
              <LogIn size={16} />
              <span>Log In Again</span>
              <ArrowRight size={15} className="ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
