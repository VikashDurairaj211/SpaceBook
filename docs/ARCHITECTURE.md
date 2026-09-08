# 📐 SpaceBook System Architecture

This document details the architectural design, component layers, conversational AI pipeline, and security models of **SpaceBook**.

---

## 1. High-Level System Architecture

```mermaid
graph TD
    subgraph Client ["Client Browser (React 18 + Vite)"]
        UI["User Interface Components (Tailwind CSS)"]
        Auth["AuthContext (JWT Session & Timeout)"]
        Router["React Router (Role Guards)"]
        AiraUI["Aira AI Floating Assistant + Voice UI"]
    end

    subgraph AIEngine ["Conversational AI & Voice Engine"]
        STT["Web Speech API (Speech-to-Text)"]
        TTS["Web Speech API (Speech Synthesis)"]
        Gemini["Google Gemini 1.5/2.0 Flash API"]
        LocalNLP["Deterministic Local NLP Fallback"]
    end

    subgraph BackendServices ["Backend Infrastructure (.NET Web API)"]
        API["RESTful API Gateway (Render Cloud)"]
        AuthService["JWT Authentication Service"]
        RoomService["Room Reservation & Conflict Engine"]
        HotseatService["Hotseat Desk Engine (453 Workstations)"]
        ReportService["BI Analytics & CSV Streaming"]
        DB[(PostgreSQL Database)]
    end

    subgraph Integrations ["External Cloud Services"]
        Outlook["Microsoft 365 Outlook Web Calendar"]
        GoogleCloud["Google Generative Language API"]
    end

    UI --> Router
    Router --> Auth
    Auth --> API
    UI --> API
    
    AiraUI --> STT
    STT --> Gemini
    Gemini -.->|API Failure / Limit| LocalNLP
    Gemini --> TTS
    AiraUI --> API

    API --> AuthService
    API --> RoomService
    API --> HotseatService
    API --> ReportService
    
    RoomService --> DB
    HotseatService --> DB
    ReportService --> DB
    AuthService --> DB

    UI -.-> Outlook
    Gemini --> GoogleCloud
```

---

## 2. Conversational AI & Voice Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Mic as Web Speech (STT)
    participant Aira as Aira Assistant Engine
    participant Gemini as Google Gemini API
    participant Speaker as Web Speech (TTS)
    participant Backend as SpaceBook .NET API
    participant DB as PostgreSQL

    User->>Mic: Clicks Mic & Speaks "Book Conference Room 1 tomorrow at 2 PM"
    Mic->>Aira: Transcribes live speech to text
    Aira->>Gemini: Sends context (15 rooms, 453 desks, time, rules) + User Message
    
    alt Gemini API Success
        Gemini-->>Aira: Returns JSON (Intent: book_room, Room: 1, Date, Time)
    else API Timeout / Offline
        Aira->>Aira: Activates parseLocally() fallback engine
    end

    Aira->>Speaker: Plays spoken voice response (TTS)
    Aira->>User: Displays interactive in-chat booking card
    User->>Aira: Clicks "Confirm & Book Workspace"
    Aira->>Backend: POST /api/bookings (payload)
    Backend->>DB: Validates time slot conflict & commits booking
    Backend-->>Aira: 201 Created (Booking ID #4092)
    Aira-->>User: Displays green confirmation badge with My Bookings link
```

---

## 3. Security & Access Control Architecture

```mermaid
graph LR
    User([Incoming User Request]) --> LoginCheck{Is Authenticated?}
    LoginCheck -->|No| LoginRedirect[Redirect to /login]
    LoginCheck -->|Yes| RoleCheck{User Role?}
    
    RoleCheck -->|Employee| EmpRoutes[Employee Portal: /dashboard, /search-rooms, /my-bookings, /hotseat-reservation]
    RoleCheck -->|Admin| AdminRoutes[Admin Portal: /admin/reports, /admin/room-management, /admin/hotseat-management, /admin/bookings]
    
    EmpRoutes --> TokenCheck[Axios JWT Bearer Interceptor]
    AdminRoutes --> TokenCheck
    TokenCheck --> BackendAPI[Render Cloud Backend API]
```

---

## 4. Resilience & Hybrid Fallback Model

To ensure zero downtime:
1. **Network / Offline Resilience**: If Google Gemini API key is missing or rate limited, the deterministic local NLP engine (`parseLocally`) seamlessly parses queries and generates booking cards without throwing errors.
2. **Master Inventory Resilience**: If the backend database is unseeded or missing room records, `DEFAULT_INITIAL_ROOMS` in `RoomManagement.jsx` ensures all 15 campus rooms remain accessible.
3. **Storage Synchronization**: Custom meeting titles created in the conversational bot are cached in `localStorage` (`spacebook_meeting_titles`) to guarantee continuity across page reloads.
