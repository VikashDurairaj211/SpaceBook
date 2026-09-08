import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import { AuthProvider } from '../context/AuthContext'
import { ThemeProvider } from '../context/ThemeContext'
import RequireAuth from '../components/RequireAuth'
import AppShell from '../components/layout/AppShell'
import LoginPage from '../pages/Login'

import DashboardPage from '../pages/Dashboard'
import SearchRoomsPage from '../pages/SearchRooms'
import RoomDetailsPage from '../pages/RoomDetails'
import AvailabilityCalendarPage from '../pages/AvailabilityCalendar'
import BookRoomPage from '../pages/BookRoom'
import MyBookingsPage from '../pages/MyBookings'
import NotificationsPage from '../pages/Notifications'
import ProfilePage from '../pages/Profile'
import HotseatBookingPage from '../components/HotseatMap/HotseatBooking'

import AdminRoomManagementPage from '../pages/Admin/RoomManagement'
import AdminBookingManagementPage from '../pages/Admin/BookingManagement'
import AdminHotseatManagementPage from '../pages/Admin/HotseatManagement'
import AdminReportsPage from '../pages/Admin/Reports'

export default function AppRoutes() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
        <Routes>

          {/* PUBLIC ROUTES */}
          <Route
            path="/login"
            element={<LoginPage />}
          />

          {/* PROTECTED ROUTES */}
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            {/* EMPLOYEE */}
            <Route
              path="/"
              element={<DashboardPage />}
            />

            <Route
              path="/dashboard"
              element={<DashboardPage />}
            />

            <Route
              path="/workspace-search"
              element={<SearchRoomsPage />}
            />
            <Route
              path="/search-rooms"
              element={<Navigate to="/workspace-search" replace />}
            />

            <Route
              path="/room-details"
              element={<RoomDetailsPage />}
            />

            <Route
              path="/workspace-availability"
              element={<AvailabilityCalendarPage />}
            />
            <Route
              path="/availability-calendar"
              element={<Navigate to="/workspace-availability" replace />}
            />

            <Route
              path="/hotseat-reservation"
              element={<HotseatBookingPage />}
            />
            <Route
              path="/office-map"
              element={<Navigate to="/hotseat-reservation" replace />}
            />

            <Route
              path="/book-room"
              element={<BookRoomPage />}
            />

            <Route
              path="/my-bookings"
              element={<MyBookingsPage />}
            />

            <Route
              path="/notifications"
              element={<NotificationsPage />}
            />

            <Route
              path="/profile"
              element={<ProfilePage />}
            />

            {/* ADMIN */}
            <Route
              path="/admin"
              element={<Navigate to="/admin/reports" replace />}
            />

            <Route
              path="/admin/dashboard"
              element={<Navigate to="/admin/reports" replace />}
            />

            <Route
              path="/admin/workspace-administration"
              element={
                <RequireAuth allowedRoles={['Admin']}>
                  <AdminRoomManagementPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/room-management"
              element={<Navigate to="/admin/workspace-administration" replace />}
            />

            <Route
              path="/admin/booking-management"
              element={<Navigate to="/admin/reports" replace />}
            />

            <Route
              path="/admin/hotseat-management"
              element={
                <RequireAuth allowedRoles={['Admin']}>
                  <AdminHotseatManagementPage />
                </RequireAuth>
              }
            />

            <Route
              path="/admin/reports"
              element={
                <RequireAuth allowedRoles={['Admin']}>
                  <AdminReportsPage />
                </RequireAuth>
              }
            />

            <Route
              path="/admin/notifications"
              element={
                <RequireAuth allowedRoles={['Admin']}>
                  <NotificationsPage />
                </RequireAuth>
              }
            />
          </Route>

          {/* FALLBACK */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
  )
}