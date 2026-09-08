import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sparkles, X } from 'lucide-react'

import TopNav from './TopNav'
import Sidebar from './Sidebar'
import { ToastProvider } from '../common/ToastProvider'
import SpaceBookCopilot from '../SpaceBookCopilot'
import SessionExpiredModal from '../common/SessionExpiredModal'
import UserGuideModal from '../common/UserGuideModal'
import GeminiBookingBot from '../common/GeminiBookingBot'

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isCopilotOpen, setIsCopilotOpen] = useState(false)
  const [showCopilotBubble, setShowCopilotBubble] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [isGeminiBotOpen, setIsGeminiBotOpen] = useState(false)

  // Listen for session expiry from API interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      setSessionExpired(true)
    }

    const handleOpenGuide = () => {
      setIsGuideOpen(true)
    }

    const handleOpenGeminiBot = () => {
      setIsGeminiBotOpen(true)
    }

    window.addEventListener('spacebook_session_expired', handleSessionExpired)
    window.addEventListener('openSpaceBookGuide', handleOpenGuide)
    window.addEventListener('openGeminiBookingBot', handleOpenGeminiBot)

    return () => {
      window.removeEventListener('spacebook_session_expired', handleSessionExpired)
      window.removeEventListener('openSpaceBookGuide', handleOpenGuide)
      window.removeEventListener('openGeminiBookingBot', handleOpenGeminiBot)
    }
  }, [])



  // compute sidebar width classes for main margin
  const mainMarginClass = sidebarCollapsed ? 'md:ml-20' : 'md:ml-56'

  return (
    <ToastProvider>

      {/* Root container */}
      <div className="flex h-screen w-full flex-col overflow-hidden bg-sky-50/40 dark:bg-slate-950 transition-colors">

        {/* Top Navigation */}
        <TopNav
          onToggleSidebar={() =>
            setSidebarCollapsed((v) => !v)
          }
          sidebarCollapsed={sidebarCollapsed}
        />

        {/* Lower section */}
        <div className="flex flex-1 overflow-hidden relative pt-[52px]">

          {/* Sidebar */}
          <Sidebar collapsed={sidebarCollapsed} />

          {/* Main content */}
          <main
            className={`flex-1 overflow-y-auto ${mainMarginClass} transition-all duration-200 bg-sky-50/40 dark:bg-slate-950`}
          >
            <div className="mx-auto max-w-7xl">

              <div className="rounded-2xl bg-white/80 dark:bg-slate-900/90 backdrop-blur-sm border border-sky-100 dark:border-slate-800 p-4 m-4 md:p-5 md:m-5 shadow-xs transition-all">

                <Outlet />

              </div>

            </div>
          </main>

        </div>

        {/* ================================
            SPACEBOOK AI ASSISTANT (AIRA)
            Native intelligent assistant
           ================================= */}

        <GeminiBookingBot
          isOpen={isGeminiBotOpen}
          onClose={() => setIsGeminiBotOpen(false)}
        />

        {!isGeminiBotOpen && (
          <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2.5 select-none pointer-events-auto">
            {/* Ultra-compact Sleek Help Bubble */}
            {showCopilotBubble && (
              <div
                onClick={() => setIsGeminiBotOpen(true)}
                className="relative group cursor-pointer flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-sky-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:border-sky-400 hover:-translate-x-0.5"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setIsGeminiBotOpen(true)
                  }
                }}
              >
                {/* Compact Dismiss button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowCopilotBubble(false)
                  }}
                  className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center shadow-xs transition"
                  title="Dismiss message"
                  aria-label="Dismiss help message"
                >
                  <X size={10} />
                </button>

                {/* Animated Sparkle Icon */}
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center text-white shadow-xs">
                  <Sparkles size={11} className="animate-pulse" />
                </div>

                {/* Message Content */}
                <div className="flex flex-col text-left pr-0.5">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-[11px] text-sky-950 dark:text-sky-200 leading-tight">Aira</span>
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-[10px] text-sky-700 dark:text-sky-400 font-medium leading-tight whitespace-nowrap">Ask assistant</span>
                </div>

                {/* Pointer Tail pointing right to the button */}
                <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-white dark:bg-slate-900 border-t border-r border-sky-200 dark:border-slate-700 rotate-45"></div>
              </div>
            )}

            {/* Branded Aira Assistant Button */}
            <button
              type="button"
              onClick={() => setIsGeminiBotOpen(true)}
              className="relative flex items-center justify-center rounded-full bg-gradient-to-tr from-sky-700 via-sky-600 to-sky-500 text-white shadow-md shadow-sky-600/30 hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-200 group flex-shrink-0"
              style={{ width: '50px', height: '50px' }}
              title="Aira Assistant - Ask doubts or get help"
              aria-label="Open Aira Assistant"
            >
              {/* Inner container with Logo */}
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/95 dark:bg-slate-900/95 shadow-inner p-1">
                <img
                  src="/Logo.png"
                  alt="Aira Assistant"
                  className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
                />
              </div>

              {/* Sparkle AI Badge */}
              <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-sm border border-white dark:border-slate-800">
                <Sparkles size={10} className="fill-amber-950" />
              </span>
            </button>
          </div>
        )}

        {/* ================================
            SESSION EXPIRED POPUP MODAL
           ================================= */}
        <SessionExpiredModal
          open={sessionExpired}
          onClose={() => setSessionExpired(false)}
        />

        {/* ================================
            SPACEBOOK USER GUIDE & HELP MODAL
           ================================= */}
        <UserGuideModal
          open={isGuideOpen}
          onClose={() => setIsGuideOpen(false)}
        />

        {/* ================================
            GEMINI AI SMART BOOKING BOT MODAL
           ================================= */}
        <GeminiBookingBot
          isOpen={isGeminiBotOpen}
          onClose={() => setIsGeminiBotOpen(false)}
        />

      </div>

    </ToastProvider>
  )
}