import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
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
import StudentWeeklySubmit from '../pages/student/WeeklySubmit'
import PrintableLog from '../pages/student/PrintableLog'
import StudentLeaveRequest from '../pages/student/LeaveRequest'
import StudentProfile from '../pages/student/Profile'

// Supervisor pages
import SupervisorDashboard from '../pages/supervisor/Dashboard'
import SupervisorApprovals from '../pages/supervisor/Approvals'
import SupervisorLeaveApprovals from '../pages/supervisor/LeaveApprovals'
import SupervisorReport from '../pages/supervisor/Report'
import SupervisorStudentDetail from '../pages/supervisor/StudentDetail'

// Admin pages
import AdminDashboard from '../pages/admin/Dashboard'
import AdminUsers from '../pages/admin/Users'
import AdminReport from '../pages/admin/Report'
import AdminPlacements from '../pages/admin/Placements'
import AdminDataManager from '../pages/admin/DataManager'

// Mentor pages
import MentorDashboard from '../pages/mentor/Dashboard'
import MentorApprovals from '../pages/mentor/Approvals'
import MentorLeaveApprovals from '../pages/mentor/LeaveApprovals'
import MentorInternships from '../pages/mentor/Internships'
import MentorStudentDetail from '../pages/mentor/StudentDetail'

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
      {/* View-As Banner */}
      <div className="sticky top-0 z-30 bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-lg">👁</span>
          <span>
            กำลังดูในฐานะ:{' '}
            <strong>{viewingAs?.full_name || 'นักศึกษา'}</strong>
            {' '}—{' '}
            <span className="font-normal opacity-90">โหมดดูอย่างเดียว (ไม่สามารถแก้ไขข้อมูลได้)</span>
          </span>
        </div>
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-lg text-sm font-semibold"
        >
          ✕ ออกจากโหมดดู
        </button>
      </div>
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
            <Route path="weekly" element={<StudentWeeklySubmit />} />
            <Route path="leave" element={<StudentLeaveRequest />} />
            <Route path="profile" element={<StudentProfile />} />
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
            <Route path="approvals" element={<SupervisorApprovals />} />
            <Route path="leave" element={<SupervisorLeaveApprovals />} />
            <Route path="report" element={<SupervisorReport />} />
            <Route path="students/:studentId" element={<SupervisorStudentDetail />} />
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
            <Route path="approvals" element={<MentorApprovals />} />
            <Route path="leave" element={<MentorLeaveApprovals />} />
            <Route path="internships" element={<MentorInternships />} />
            <Route path="students/:studentId" element={<MentorStudentDetail />} />
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
