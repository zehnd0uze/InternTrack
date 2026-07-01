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
    { to: '/student/weekly', label: 'บันทึกรายสัปดาห์', icon: FileText },
    { to: '/student/leave', label: 'แจ้งลา ป่วย/กิจ', icon: Clock },
    { to: '/student/schedule', label: 'ตารางงาน', icon: CalendarDays },
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
    { to: '/admin/placements', label: 'จัดการสถานที่ฝึกงาน', icon: Building2 },
    { to: '/admin/report', label: 'รายงานระบบ', icon: BarChart3 },
    { to: '/admin/data', label: 'จัดการข้อมูล', icon: Database },
  ],
  mentor: [
    { to: '/mentor', label: 'แดชบอร์ด', icon: LayoutDashboard, end: true },
    { to: '/mentor/approvals', label: 'อนุมัติเวลา', icon: CheckSquare },
    { to: '/mentor/leave', label: 'อนุมัติการลา', icon: CalendarDays },
    { to: '/mentor/schedule', label: 'ตารางงาน', icon: CalendarDays },
    { to: '/mentor/internships', label: 'สถานที่ฝึกงาน', icon: Building2 },
  ],
  'view-as': [], // no nav items in preview mode
}

const ROLE_LABELS = {
  student: 'นักศึกษา',
  supervisor: 'อาจารย์นิเทศ',
  admin: 'ผู้ดูแลระบบ',
  mentor: 'พี่เลี้ยง / หัวหน้างาน',
  'view-as': 'โหมดดูนักศึกษา',
}

const ROLE_COLORS = {
  admin:      'bg-surface-hover text-content-muted border border-border',
  supervisor: 'bg-surface-hover text-content-muted border border-border',
  student:    'bg-surface-hover text-content-muted border border-border',
  mentor:     'bg-surface-hover text-content-muted border border-border',
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
      mentor: '/mentor',
    }
    const dest = destMap[alternateRole] || '/'
    navigate(dest)
    toast.success(`สลับไปยังโหมด ${ROLE_LABELS[alternateRole] || alternateRole}`)
  }

  return (
    <div className="h-full bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Header */}
      <div className={`flex items-center h-16 px-4 border-b border-sidebar-border ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <ClipboardList size={18} className="text-white" />
            </div>
            <span className="text-sidebar-fg font-bold text-lg tracking-tight">TernieTrack</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <ClipboardList size={18} className="text-white" />
          </div>
        )}

        {mobile ? (
          <button onClick={onToggle} className="text-sidebar-muted hover:text-sidebar-fg transition-colors p-1">
            <X size={20} />
          </button>
        ) : (
          <button
            onClick={onToggle}
            className="text-sidebar-muted hover:text-sidebar-fg transition-colors p-1 rounded-md hover:bg-sidebar-hover"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>

      {/* Switch Role (collapsed state — icon only) */}
      {collapsed && hasDualRole && (
        <div className="px-2 py-2 border-b border-sidebar-border">
          <button
            onClick={handleSwitchRole}
            className="w-full flex items-center justify-center p-2 rounded-md bg-sidebar-hover hover:bg-sidebar-active transition-colors text-sidebar-fg border border-sidebar-border"
            title={`สลับไปยัง ${ROLE_LABELS[alternateRole]}`}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto sidebar-scroll">
        {!collapsed && items.length > 0 && (
          <p className="px-3 text-xs font-bold tracking-wider text-sidebar-muted mb-3 mt-2 uppercase">Menu</p>
        )}
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
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-sidebar-active text-sidebar-active-fg font-semibold shadow-sm'
                    : 'text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover hover:translate-x-1'
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

      {/* User Info & Sign Out (Bottom) */}
      <div className="p-3 border-t border-sidebar-border">
        {!collapsed && hasDualRole && (
          <button
            onClick={handleSwitchRole}
            className="mb-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md hover:bg-sidebar-hover transition-colors text-sidebar-muted hover:text-sidebar-fg text-xs font-medium"
          >
            <RefreshCw size={13} />
            สลับเป็น {ROLE_LABELS[alternateRole]}
          </button>
        )}

        <div className={`flex items-center ${collapsed ? 'justify-center flex-col gap-2' : 'gap-3'} px-2 py-2 rounded-md hover:bg-sidebar-hover transition-colors cursor-pointer relative group`}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-sidebar-border" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-sidebar-hover border border-sidebar-border flex items-center justify-center text-sidebar-fg font-bold text-xs flex-shrink-0">
              {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0 flex-1 flex items-center justify-between">
              <div className="truncate">
                <p className="text-sidebar-fg font-semibold text-sm truncate">{profile?.full_name || 'Loading...'}</p>
                <p className="text-sidebar-muted text-xs truncate">{profile?.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 text-sidebar-muted hover:text-danger hover:bg-red-50 rounded-md transition-colors"
                title="ออกจากระบบ"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
          
          {collapsed && (
            <button
              onClick={handleSignOut}
              className="p-1.5 text-sidebar-muted hover:text-danger hover:bg-red-50 rounded-md transition-colors w-full flex justify-center"
              title="ออกจากระบบ"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
