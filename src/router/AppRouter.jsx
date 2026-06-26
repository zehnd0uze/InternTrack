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

// Supervisor pages
import SupervisorDashboard from '../pages/supervisor/Dashboard'
import SupervisorApprovals from '../pages/supervisor/Approvals'
import SupervisorReport from '../pages/supervisor/Report'
import SupervisorStudentDetail from '../pages/supervisor/StudentDetail'

// Admin pages
import AdminDashboard from '../pages/admin/Dashboard'
import AdminUsers from '../pages/admin/Users'
import AdminReport from '../pages/admin/Report'
import AdminDataManager from '../pages/admin/DataManager'

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
    }
    return <Navigate to={roleHome[activeRole] || '/login'} replace />
  }

  return children
}

function RoleRedirect() {
  const { profile, loading, activeRole } = useAuth()
  if (loading) return <PageLoader />
  if (!profile) return <Navigate to="/login" replace />
  const map = { student: '/student', supervisor: '/supervisor', admin: '/admin' }
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
    navigate(activeRole === 'admin' ? '/admin' : '/supervisor')
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
            <Route path="data" element={<AdminDataManager />} />
          </Route>

          {/* View As Student — accessible by admin & supervisor */}
          <Route
            path="/view-as-student"
            element={
              <RequireAuth allowedRoles={['admin', 'supervisor']}>
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
