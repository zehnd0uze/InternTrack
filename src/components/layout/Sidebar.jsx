import { NavLink } from 'react-router-dom'
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
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import toast from 'react-hot-toast'

const NAV_ITEMS = {
  student: [
    { to: '/student', label: 'แดชบอร์ด', icon: LayoutDashboard, end: true },
    { to: '/student/weekly', label: 'ส่งชั่วโมงรายสัปดาห์', icon: Clock },
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
    { to: '/mentor/internships', label: 'ข้อมูลการฝึกงาน', icon: Building2 },
  ],
}

const ROLE_LABELS = {
  student: 'นักศึกษา',
  supervisor: 'อาจารย์นิเทศ',
  admin: 'ผู้ดูแลระบบ',
  mentor: 'พี่เลี้ยง / หัวหน้างาน',
}

export default function Sidebar({ role, collapsed, onToggle, mobile }) {
  const { profile, signOut } = useAuth()
  const { unreadCount } = useNotifications()
  const items = NAV_ITEMS[role] || []

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      toast.error('ออกจากระบบล้มเหลว')
    } else {
      toast.success('ออกจากระบบแล้ว')
    }
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
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{profile?.full_name || 'กำลังโหลด...'}</p>
              <p className="text-white/60 text-xs">{ROLE_LABELS[role]}</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto sidebar-scroll">
        {items.map(({ to, label, icon: Icon, end }) => (
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
            {!collapsed && label === 'อนุมัติชั่วโมง' && unreadCount > 0 && (
              <span className="ml-auto bg-danger text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {unreadCount}
              </span>
            )}
          </NavLink>
        ))}
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
