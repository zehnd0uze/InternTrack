import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { NotificationProvider } from '../contexts/NotificationContext'

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
  const { user, profile, loading } = useAuth()

  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Redirect to correct role home
    const roleHome = {
      student: '/student',
      supervisor: '/supervisor',
      admin: '/admin',
    }
    return <Navigate to={roleHome[profile.role] || '/login'} replace />
  }

  return children
}

function RoleRedirect() {
  const { user, profile, loading, signOut } = useAuth()
  if (loading) return <PageLoader />
  
  if (user && !profile) {
    // Break the infinite loop if user is authenticated but profile is missing
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm w-full text-center space-y-4">
          <div className="text-red-500 font-semibold">Error: User profile not found</div>
          <p className="text-sm text-gray-500">
            Please make sure the database tables are created, then sign out and register again.
          </p>
          <button 
            onClick={() => signOut()}
            className="w-full bg-primary-700 text-white rounded-lg py-2 hover:bg-primary-800 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  if (!profile) return <Navigate to="/login" replace />
  const map = { student: '/student', supervisor: '/supervisor', admin: '/admin' }
  return <Navigate to={map[profile.role] || '/login'} replace />
}

export default function AppRouter() {
  const { user, loading } = useAuth()

  if (loading) return <PageLoader />

  return (
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

        {/* Root redirect */}
        <Route path="/" element={<RoleRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
