import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Clock, User } from 'lucide-react'

const BOTTOM_NAV = [
  { to: '/student', label: 'หน้าหลัก', icon: LayoutDashboard, end: true },
  { to: '/student/weekly', label: 'ส่งชั่วโมง', icon: Clock },
  { to: '/student/profile', label: 'โปรไฟล์', icon: User },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border-light md:hidden z-30 shadow-lg">
      <div className="flex items-center justify-around h-16">
        {BOTTOM_NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive ? 'text-primary-700' : 'text-gray-400 hover:text-content-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} />
                <span className={`text-xs font-medium ${isActive ? 'text-primary-700' : 'text-gray-400'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
