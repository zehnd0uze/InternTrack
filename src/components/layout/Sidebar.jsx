import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Clock,
  ClipboardList,
  Users,
  CheckSquare,
  FileText,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  Database,
  UserCircle,
  Briefcase,
  Building2,
  CalendarDays,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import toast from 'react-hot-toast'

const NAV_ITEMS = {
  student: [
    { to: '/student', label: 'แดชบอร์ด', icon: LayoutDashboard, end: true },
    { to: '/student/weekly', label: 'ส่งชั่วโมงรายสัปดาห์', icon: Clock },
    { to: '/student/leave', label: 'แจ้งลา ป่วย/กิจ', icon: CalendarDays },
    { to: '/student/profile', label: 'โปรไฟล์ของฉัน', icon: UserCircle },
  ],
  supervisor: [
    { to: '/supervisor', label: 'แดชบอร์ด', icon: LayoutDashboard, end: true },
    { to: '/supervisor/approvals', label: 'อนุมัติชั่วโมง', icon: CheckSquare },
    { to: '/supervisor/report', label: 'รายงาน', icon: FileText },
  ],
  admin: [
    { to: '/admin', label: 'ภาพรวมระบบ', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'จัดการผู้ใช้', icon: Users },
    { to: '/admin/report', label: 'รายงานระบบ', icon: BarChart3 },
    { to: '/admin/data', label: 'จัดการข้อมูล', icon: Database },
  ],
  mentor: [
    { to: '/mentor', label: 'แดชบอร์ด', icon: LayoutDashboard, end: true },
    { to: '/mentor/approvals', label: 'อนุมัติชั่วโมง', icon: CheckSquare },
    { to: '/mentor/leave', label: 'อนุมัติการลา', icon: CalendarDays },
    { to: '/mentor/internships', label: 'ข้อมูลการฝึกงาน', icon: Building2 },
  ],
  'view-as': [], // no nav items in preview mode
}

const ROLE_LABELS = {
  student: 'นักศึกษา',
  supervisor: 'พี่เลี้ยง',
  admin: 'ผู้ดูแลระบบ',
  mentor: 'พี่เลี้ยง / หัวหน้างาน',
  'view-as': 'โหมดดูนักศึกษา',
}

const ROLE_COLORS = {
  admin:      'bg-purple-100 text-purple-700',
  supervisor: 'bg-blue-100 text-blue-700',
  student:    'bg-green-100 text-green-700',
  mentor:     'bg-orange-100 text-orange-700',
}

export default function Sidebar({ role, collapsed, onToggle, mobile }) {
  const { profile, signOut, switchRole, hasDualRole, alternateRole, activeRole } = useAuth()
  const { notifications, unreadCount } = useNotifications()
  const navigate = useNavigate()
  const items = NAV_ITEMS[role] || []

  // Calculate unread counts by type
  const unreadApprovals = notifications.filter(n => !n.is_read && n.type === 'approval_request').length
  const unreadLeaves = notifications.filter(n => !n.is_read && n.type === 'leave_request').length

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      toast.error('ออกจากระบบล้มเหลว')
    } else {
      toast.success('ออกจากระบบแล้ว')
    }
  }

  const handleSwitchRole = () => {
    switchRole()
    // Navigate to the home of the new role
    const destMap = {
      admin: '/admin',
      supervisor: '/supervisor',
      student: '/student',
    }
    const dest = destMap[alternateRole] || '/'
    navigate(dest)
    toast.success(`สลับไปยังโหมด ${ROLE_LABELS[alternateRole] || alternateRole}`)
  }

  return (
    <div className="h-full bg-primary-700 flex flex-col shadow-lg">
      {/* Header */}
      <div className={`flex items-center h-16 px-4 border-b border-primary-600 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <ClipboardList size={18} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">InternTrack</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <ClipboardList size={18} className="text-white" />
          </div>
        )}

        {mobile ? (
          <button onClick={onToggle} className="text-white/70 hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        ) : (
          <button
            onClick={onToggle}
            className="text-white/70 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>

      {/* User Info */}
      {!collapsed && (
        <div className="px-4 py-4 border-b border-primary-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold text-sm truncate">{profile?.full_name || 'กำลังโหลด...'}</p>
              {/* Active role pill */}
              <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[activeRole] || 'bg-white/20 text-white'}`}>
                {ROLE_LABELS[activeRole] || activeRole}
              </span>
            </div>
          </div>

          {/* Switch Role Button — shown only if user has a secondary role */}
          {hasDualRole && (
            <button
              onClick={handleSwitchRole}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 transition-all duration-200 text-white text-xs font-semibold border border-white/20"
              title={`สลับไปยัง ${ROLE_LABELS[alternateRole]}`}
            >
              <RefreshCw size={13} />
              สลับเป็น {ROLE_LABELS[alternateRole] || alternateRole}
            </button>
          )}
        </div>
      )}

      {/* Switch Role (collapsed state — icon only) */}
      {collapsed && hasDualRole && (
        <div className="px-2 py-2 border-b border-primary-600">
          <button
            onClick={handleSwitchRole}
            className="w-full flex items-center justify-center p-2 rounded-lg bg-white/15 hover:bg-white/25 transition-colors text-white"
            title={`สลับไปยัง ${ROLE_LABELS[alternateRole]}`}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto sidebar-scroll">
        {items.map(({ to, label, icon: Icon, end }) => {
          let badgeCount = 0
          if (label === 'อนุมัติชั่วโมง') badgeCount = unreadApprovals
          if (label === 'อนุมัติการลา') badgeCount = unreadLeaves

          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                } ${collapsed ? 'justify-center' : ''}`
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
              {!collapsed && badgeCount > 0 && (
                <span className="ml-auto bg-danger text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {badgeCount}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t border-primary-600">
        <button
          onClick={handleSignOut}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'ออกจากระบบ' : undefined}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>ออกจากระบบ</span>}
        </button>
      </div>
    </div>
  )
}
