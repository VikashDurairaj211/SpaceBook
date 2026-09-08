# 📘 SpaceBook API Technical Documentation

Complete reference for all backend API endpoints and AI integration specifications for SpaceBook.

**Base URL**: `https://spacebook-505h.onrender.com/api`  
**Authentication**: Bearer JWT (`Authorization: Bearer <token>`)

---

## 📑 Table of Contents
1. [Authentication API](#1-authentication-api)
2. [Meeting Rooms API](#2-meeting-rooms-api)
3. [Room Bookings API](#3-room-bookings-api)
4. [Hotseat Workstations API](#4-hotseat-workstations-api)
5. [Admin BI Reports & Analytics API](#5-admin-bi-reports--analytics-api)
6. [Admin Hotseat Management API](#6-admin-hotseat-management-api)
7. [Notifications API](#7-notifications-api)
8. [Google Gemini AI Assistant Specification](#8-google-gemini-ai-assistant-specification)

---

## 1. Authentication API

### `POST /auth/login`
Authenticates a user and returns a JWT token.
- **Request Body**:
  ```json
  {
    "email": "employee@spacebook.com",
    "password": "Password123!"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 101,
      "name": "Jane Doe",
      "email": "employee@spacebook.com",
      "role": "Employee"
    }
  }
  ```

### `POST /auth/register`
Registers a new employee account.
- **Request Body**:
  ```json
  {
    "name": "John Smith",
    "email": "john@spacebook.com",
    "password": "Password123!",
    "department": "Engineering"
  }
  ```

---

## 2. Meeting Rooms API

### `GET /rooms/availability`
Fetches room availability matrix for a specified date and time window.
- **Query Parameters**:
  - `date` (string, required): `YYYY-MM-DD`
  - `startTime` (string, optional): `HH:MM`
  - `endTime` (string, optional): `HH:MM`
  - `moduleId` (number, optional): `1`, `2`, or `3`
- **Success Response (`200 OK`)**:
  ```json
  [
    {
      "roomId": 1,
      "roomName": "Conference Room 1",
      "roomNumber": "CBE-05-EO1-001",
      "module": "Module 1 - Elcot Park - CMB",
      "capacity": 20,
      "roomType": "Conference",
      "amenities": ["4K Projector", "Smart TV", "Whiteboard", "Wi-Fi"],
      "isAvailable": true
    }
  ]
  ```

---

## 3. Room Bookings API

### `POST /bookings`
Creates a new meeting room reservation.
- **Request Body**:
  ```json
  {
    "meetingTitle": "Quarterly Sprint Planning",
    "purpose": "Sprint Planning",
    "roomId": 1,
    "participantCount": 8,
    "bookingDate": "2026-09-09",
    "startTime": "14:00:00",
    "endTime": "15:00:00",
    "facilityIds": []
  }
  ```
- **Success Response (`201 Created` / `200 OK`)**:
  ```json
  {
    "bookingId": 4092,
    "status": "Confirmed",
    "message": "Room booked successfully"
  }
  ```

### `GET /bookings/my-bookings`
Returns all room reservations created by the authenticated employee.

### `DELETE /bookings/{id}`
Cancels an existing booking and releases the room slot.

---

## 4. Hotseat Workstations API

### `GET /Hotseat`
Fetches hotseat desk statuses across campus modules.
- **Query Parameters**:
  - `date`: `YYYY-MM-DD`
  - `module`: Module name string
  - `shift`: `Full Day`, `Morning`, or `Afternoon`

### `POST /Hotseat`
Reserves a hotseat desk workstation.
- **Request Body**:
  ```json
  {
    "seatNumber": "EO1-24",
    "module": "Module 1 - Elcot Park - CMB",
    "date": "2026-09-09",
    "shift": "Full Day"
  }
  ```

### `POST /Hotseat/{id}/check-in`
Confirms check-in for an active hotseat reservation within the 30-minute grace period.

---

## 5. Admin BI Reports & Analytics API

### `POST /admin/reports/bookingtrend`
Returns chronological booking counts grouped by month or day.

### `POST /admin/reports/bookingstatus`
Returns distribution of Confirmed, Pending, and Cancelled reservations.

### `POST /admin/reports/roomusage`
Returns utilization rates broken down by Conference, Training, and Discussion rooms.

### `GET /admin/reports/export-csv`
Streams a downloadable CSV export containing all historical booking audit logs.

---

## 6. Admin Hotseat Management API

### `GET /admin/hotseats/dashboard`
Fetches high-level workstation KPIs (Total Desks, Occupied, Check-In Rate, Force Releases).

### `POST /admin/hotseats/records`
Returns paginated desk reservation logs with filter criteria.

---

## 7. Notifications API

### `GET /employee/notifications` & `GET /admin/notifications`
Fetches real-time alert notifications for the logged-in user.

### `PATCH /employee/notifications/read-all`
Marks all alerts as read.

---

## 8. Google Gemini AI Assistant Specification

Aira utilizes Google Generative Language API (`gemini-1.5-flash` / `gemini-2.0-flash`):

- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={VITE_GEMINI_API_KEY}`
- **Generation Config**:
  ```json
  {
    "temperature": 0.2,
    "topK": 40,
    "topP": 0.95
  }
  ```
- **Output Schema**:
  ```json
  {
    "intent": "general_query" | "book_room",
    "botReply": "Markdown formatted string response",
    "readyToBook": true | false,
    "bookingDraft": {
      "title": "Meeting Title",
      "roomId": 1,
      "roomName": "Conference Room 1",
      "module": "Module 1 - Elcot Park - CMB",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "attendees": 5
    }
  }
  ```
