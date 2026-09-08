<div align="center">

# 🚀 SpaceBook

### **Enterprise Workspace, Hot-Desk & Meeting Room Management Platform**
*Powered by React 18, Vite, Tailwind CSS, and Google Gemini AI with Real-Time Two-Way Voice*

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-AI_Assistant-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Vitest](https://img.shields.io/badge/Tests-26%2F26_Passed-22C55E?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

[Features](#-key-features) • [Aira AI Assistant](#-aira-ai-assistant--voice-engine) • [Enterprise Hardening](./docs/ENTERPRISE_HARDENING.md) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [Testing](#-automated-tests) • [API Docs](./docs/API_DOCUMENTATION.md)

</div>

---

## 📖 Overview

**SpaceBook** is a production-ready enterprise reservation system designed to streamline meeting room bookings, hotseat desk allocations, and workplace analytics across multi-building corporate campuses in Coimbatore (Elcot Park & Tidel Park).

It features **Aira**, an intelligent conversational AI assistant powered by **Google Gemini** with native browser-level **two-way voice listening (Speech-to-Text) and natural voice speaking (Text-to-Speech)**.

---

## 🌟 Key Features

### 🏢 1. Employee Workspace Portal
- **Interactive Workspace Search**: Real-time room availability matrix, campus filtering, capacity selectors, and amenity filters (4K Projector, Smart TV, Audio, Whiteboard).
- **Interactive Hot-Desk Map**: Live floor map across **453 workstations** with real-time status indicators (🟢 Available, 🔵 Selected, 🔴 Occupied, ⚪ Maintenance) and shift booking (Full Day, Morning, Afternoon).
- **My Bookings & Check-In**: Manage active, completed, and cancelled reservations with **1-click 30-minute check-in** and instant cancellation space releases.
- **Microsoft 365 Outlook & Teams Sync**: 1-click calendar sync directly opens pre-filled Outlook Web events.
- **Live Notifications Center**: Instant alert center with unread counters, mark as read, and bulk clear.

### 🛡️ 2. Executive & Admin Portal
- **Executive BI Reports & Analytics**: Interactive charts powered by Recharts (Booking Trends, Module Demand Distribution, Status Breakdown, Peak Check-In Hours).
- **Workspace Administration**: Inventory management for creating, editing, and disabling rooms and amenities.
- **Hotseat Workstation Governance**: Live desk oversight, force check-in/check-out, maintenance locking, and CSV data export.
- **Admin Booking Audit**: Searchable booking log with paginated audit inspection modal (8 items/page).

---

## 🎙️ Aira AI Assistant & Voice Engine

Aira brings modern conversational AI into corporate facility reservation:

```
                  ┌───────────────────────────────┐
                  │ 🎙️ User Speaks / Types Query   │
                  └──────────────┬────────────────┘
                                 │
                 Web Speech API  │ Speech-to-Text
                                 ▼
                  ┌───────────────────────────────┐
                  │   Aira Conversational Engine  │
                  └──────────────┬────────────────┘
                                 │
           ┌─────────────────────┴─────────────────────┐
           ▼                                           ▼
┌─────────────────────────┐                 ┌─────────────────────────┐
│  Google Gemini 1.5/2.0  │ (Primary)       │   Local Rule NLP Engine │ (Fallback)
│  Natural Language Model │                 │   100% Offline Support  │
└──────────┬──────────────┘                 └──────────┬──────────────┘
           │                                           │
           └─────────────────────┬─────────────────────┘
                                 ▼
                  ┌───────────────────────────────┐
                  │   Intent & Entity Extraction  │
                  │   (Room, Date, Time, Pax)     │
                  └──────────────┬────────────────┘
                                 │
       ┌─────────────────────────┴─────────────────────────┐
       ▼                                                   ▼
┌───────────────────────────────┐           ┌───────────────────────────────┐
│ ⚡ In-Chat Booking Card       │           │ 🔊 Natural Voice Speech (TTS) │
│ 1-Click DB Reservation        │           │ Play / Stop / Mute Controls   │
└───────────────────────────────┘           └───────────────────────────────┘
```

- **Two-Way Voice**: Speak queries via microphone; listen to answers via natural Text-to-Speech audio readout.
- **Context-Aware Intent Classification**: Differentiates general Q&A (timings, policies, desk count) from room booking requests.
- **Smart Time Logic**: Relative dates (*"tomorrow"*, *"next Monday"*), past-time rollover, and 24-hour office hour limits (10:00 – 22:00 IST).
- **In-Chat Booking Cards**: Direct interactive reservation cards with title editing and instant room switching.

---

## 🏢 Campus & Facility Specifications

SpaceBook manages **15 Meeting Rooms** and **453 Hotseat Desks** in Coimbatore:

| Campus Module | Rooms | Capacity Range | Workstation Desks | Desk ID Format |
| :--- | :---: | :---: | :---: | :---: |
| **Module 1 — Elcot Park** | 5 | 8 – 30 Seats | 98 Desks | `EO1-01` to `EO1-98` |
| **Module 2 — Elcot Park** | 5 | 8 – 50 Seats | 131 Desks | `EO2-01` to `EO2-131` |
| **Module 1 — Tidel Park** | 5 | 8 – 25 Seats | 224 Desks | `WS-04-001` to `WS-04-224` |
| **Total** | **15 Rooms** | **Up to 50 Seats** | **453 Desks** | *3 Campus Modules* |

---

## 📋 Operating Rules & Policies
1. **Operating Hours**: Monday to Friday: 10:00 AM – 10:00 PM IST (10:00 – 22:00). Strictly closed on Weekends.
2. **Instant Auto-Approval**: All room and hotseat bookings are auto-confirmed instantly in real-time.
3. **Check-In Window**: Active from reservation start time with a **30-minute grace period**.
4. **Auto-Release Policy**: Unconfirmed reservations are automatically released after 30 minutes.
5. **Fair Use Desk Policy**: 1 active hotseat desk reservation per employee per day.

---

## 🛠️ Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/spacebook.git
cd spacebook

# Install dependencies
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
# Backend .NET API Base URL (Live Render Server)
VITE_API_BASE_URL=https://spacebook-505h.onrender.com/api

# Google Gemini AI API Key (for Aira assistant)
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Build for Production
```bash
npm run build
```

---

## 🧪 Automated Tests

SpaceBook includes comprehensive automated test suites powered by **Vitest**:

```bash
# Run all unit and integration tests
npm test

# Run tests in live interactive watch mode
npm run test:watch
```

### Test Coverage Highlights:
- **`src/__tests__/geminiBookingBot.test.js`**: Intent classification, relative date calculations, past-time rollover, room & attendee extraction.
- **`src/__tests__/timeUtils.test.js`**: 24-hour time formatting, ISO conversions, duration calculations, date normalizers.
- **`src/__tests__/rooms.test.js`**: Campus module normalizers, room type resolvers, default fallback mappings.

---

## 📁 Project Structure

```
src/
├── __tests__/            Automated test suites (Vitest)
│   ├── geminiBookingBot.test.js
│   ├── timeUtils.test.js
│   └── rooms.test.js
├── api/                  Axios client & resource API endpoints
│   ├── client.js             Axios instance with JWT interceptors
│   ├── geminiBookingBot.js   Google Gemini & Local NLP Engine
│   ├── adminReports.js       BI Analytics & CSV streaming
│   ├── adminHotseat.js       Hotseat admin queries
│   ├── rooms.js              Room availability & lookups
│   └── bookings.js           Reservation CRUD
├── components/
│   ├── common/           Aira Bot (GeminiBookingBot), Toast, Modal, Buttons, Pickers
│   ├── cards/            DashboardCard, RoomCard
│   ├── HotseatMap/       Interactive floor map & seat status grid
│   └── layout/           TopNav, Sidebar, AppShell
├── context/              AuthContext (JWT session, roles, timeout)
├── pages/
│   ├── admin/            Reports, RoomManagement, HotseatManagement, BookingManagement
│   ├── Dashboard.jsx     Employee Dashboard
│   ├── SearchRooms.jsx   Workspace Search with filters
│   ├── BookRoom.jsx      Room booking flow
│   ├── MyBookings.jsx    Active/Past reservations & check-in
│   └── Notifications.jsx Live notifications center
└── utils/                Time formatters, export helpers, time utilities
```

---

## 📚 Documentation Links
- 📘 [API Documentation](./docs/API_DOCUMENTATION.md)
- 📐 [System Architecture Diagrams](./docs/ARCHITECTURE.md)

---

## 📄 License
This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.
