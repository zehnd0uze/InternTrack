import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { NotificationProvider } from '../contexts/NotificationContext'
import { ViewAsProvider, useViewAs } from '../contexts/ViewAsContext'

// Layouts
import AppLayout from '../components/layout/AppLayout'

// Public
import Login from '../pages/Login'
import Register from '../pages/Register'

// Student pages
import StudentDashboard from '../pages/student/Dashboard'
import PrintableLog from '../pages/student/PrintableLog'
import StudentLeaveRequest from '../pages/student/LeaveRequest'
import StudentProfile from '../pages/student/Profile'
import StudentSchedule from '../pages/student/Schedule'

// Supervisor pages
import SupervisorDashboard from '../pages/supervisor/Dashboard'
import SupervisorReport from '../pages/supervisor/Report'
import SupervisorStudentDetail from '../pages/supervisor/StudentDetail'

import NotificationsPage from '../pages/Notifications'

// Admin pages
import AdminDashboard from '../pages/admin/Dashboard'
import AdminUsers from '../pages/admin/Users'
import AdminReport from '../pages/admin/Report'
import AdminPlacements from '../pages/admin/Placements'
import AdminDataManager from '../pages/admin/DataManager'
import AdminAlerts from '../pages/admin/Alerts'
import AdminInstitutions from '../pages/admin/Institutions'
import AdminMissingLogs from '../pages/admin/MissingLogs'

// Mentor pages
import MentorDashboard from '../pages/mentor/Dashboard'
import MentorLeaveApprovals from '../pages/mentor/LeaveApprovals'
import MentorInternships from '../pages/mentor/Internships'
import MentorStudentDetail from '../pages/mentor/StudentDetail'
import MentorSchedule from '../pages/mentor/Schedule'

// Skeletons / loading
import PageLoader from '../components/ui/PageLoader'

function RequireAuth({ children, allowedRoles }) {
  const { user, profile, loading, activeRole } = useAuth()

  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && profile && !allowedRoles.includes(activeRole)) {
    // Redirect to correct role home
    const roleHome = {
      student: '/student',
      supervisor: '/supervisor',
      admin: '/admin',
      mentor: '/mentor',
    }
    return <Navigate to={roleHome[activeRole] || '/login'} replace />
  }

  return children
}

function RoleRedirect() {
  const { profile, loading, activeRole } = useAuth()
  if (loading) return <PageLoader />
  if (!profile) return <Navigate to="/login" replace />
  const map = { student: '/student', supervisor: '/supervisor', admin: '/admin', mentor: '/mentor' }
  return <Navigate to={map[activeRole] || '/login'} replace />
}

/**
 * ViewAsStudentPage — renders the Student Dashboard inside the
 * admin or supervisor layout, with a "viewing as" banner.
 * Accessible only to admin/supervisor.
 */
function ViewAsStudentPage() {
  const { viewingAs, exitViewAs } = useViewAs()
  const navigate = useNavigate()
  const { activeRole } = useAuth()

  const handleExit = () => {
    exitViewAs()
    const homeMap = {
      admin: '/admin',
      supervisor: '/supervisor',
      mentor: '/mentor'
    }
    navigate(homeMap[activeRole] || '/')
  }

  return (
    <div className="space-y-0">
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <StudentDashboard />
        </div>
      </div>
    </div>
  )
}

export default function AppRouter() {
  const { user, loading } = useAuth()

  if (loading) return <PageLoader />

  return (
    <ViewAsProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route
            path="/login"
            element={user ? <RoleRedirect /> : <Login />}
          />
          <Route
            path="/register"
            element={user ? <RoleRedirect /> : <Register />}
          />

          {/* Printable Report (Standalone, no layout) */}
          <Route
            path="/student/print-log"
            element={
              <RequireAuth allowedRoles={['student', 'admin', 'supervisor', 'mentor']}>
                <PrintableLog />
              </RequireAuth>
            }
          />

          {/* Student */}
          <Route
            path="/student"
            element={
              <RequireAuth allowedRoles={['student']}>
                <NotificationProvider>
                  <AppLayout role="student" />
                </NotificationProvider>
              </RequireAuth>
            }
          >
            <Route index element={<StudentDashboard />} />
            <Route path="leave" element={<StudentLeaveRequest />} />
            <Route path="profile" element={<StudentProfile />} />
            <Route path="schedule" element={<StudentSchedule />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>

          {/* Supervisor */}
          <Route
            path="/supervisor"
            element={
              <RequireAuth allowedRoles={['supervisor']}>
                <NotificationProvider>
                  <AppLayout role="supervisor" />
                </NotificationProvider>
              </RequireAuth>
            }
          >
            <Route index element={<SupervisorDashboard />} />
            <Route path="report" element={<SupervisorReport />} />
            <Route path="students/:studentId" element={<SupervisorStudentDetail />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <RequireAuth allowedRoles={['admin']}>
                <NotificationProvider>
                  <AppLayout role="admin" />
                </NotificationProvider>
              </RequireAuth>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="report" element={<AdminReport />} />
            <Route path="placements" element={<AdminPlacements />} />
            <Route path="data" element={<AdminDataManager />} />
            <Route path="alerts" element={<AdminAlerts />} />
            <Route path="institutions" element={<AdminInstitutions />} />
            <Route path="missing-logs" element={<AdminMissingLogs />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>

          {/* Mentor */}
          <Route
            path="/mentor"
            element={
              <RequireAuth allowedRoles={['mentor']}>
                <NotificationProvider>
                  <AppLayout role="mentor" />
                </NotificationProvider>
              </RequireAuth>
            }
          >
            <Route index element={<MentorDashboard />} />
            <Route path="leave" element={<MentorLeaveApprovals />} />
            <Route path="internships" element={<MentorInternships />} />
            <Route path="schedule" element={<MentorSchedule />} />
            <Route path="students/:studentId" element={<MentorStudentDetail />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>

          {/* View As Student — accessible by admin, supervisor & mentor */}
          <Route
            path="/view-as-student"
            element={
              <RequireAuth allowedRoles={['admin', 'supervisor', 'mentor']}>
                <NotificationProvider>
                  <AppLayout role="view-as" />
                </NotificationProvider>
              </RequireAuth>
            }
          >
            <Route index element={<ViewAsStudentPage />} />
          </Route>

          {/* Root redirect */}
          <Route path="/" element={<RoleRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ViewAsProvider>
  )
}
