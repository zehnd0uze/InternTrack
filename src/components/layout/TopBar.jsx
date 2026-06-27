import { useState, useRef, useEffect } from 'react'
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { Menu, Bell, ChevronDown, UserCircle, Palette, Sparkles, Moon } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { useViewAs } from '../../contexts/ViewAsContext'
import { useTheme } from '../../contexts/ThemeContext'
import { formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'

export default function TopBar({ onMenuClick }) {
  const { profile, signOut, activeRole } = useAuth()
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications()
  const { viewingAs, exitViewAs } = useViewAs()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Generate breadcrumbs from path
  const pathSegments = location.pathname.split('/').filter(Boolean)
  const breadcrumbs = ['Home', ...pathSegments.map(s => s.charAt(0).toUpperCase() + s.slice(1))]

  const ROLE_LABELS = {
    student: 'นักศึกษา',
    supervisor: 'อาจารย์นิเทศ',
    admin: 'ผู้ดูแลระบบ',
    mentor: 'พี่เลี้ยง / หัวหน้างาน',
  }

  const handleExitViewAs = () => {
    exitViewAs()
    navigate(activeRole === 'admin' ? '/admin' : '/supervisor')
  }

  return (
    <header className="bg-card border-b border-border-light flex-shrink-0 shadow-sm">
      {/* View-As Banner */}
      {viewingAs && location.pathname.includes('/view-as-student') && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span></span>
            <span>
              กำลังดูในฐานะ: <strong>{viewingAs.full_name}</strong>
              <span className="ml-2 font-normal opacity-90">— โหมดดูอย่างเดียว</span>
            </span>
          </div>
          <button
            onClick={handleExitViewAs}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-lg text-xs font-semibold"
          >
            ✕ ออกจากโหมดดู
          </button>
        </div>
      )}

      {/* Main TopBar */}
      <div className="h-16 flex items-center justify-between px-4 md:px-6">
        {/* Left: Hamburger (mobile) */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg text-content-muted hover:bg-surface-hover transition-colors"
          aria-label="เปิดเมนู"
        >
          <Menu size={20} />
        </button>

        <div className="hidden md:flex items-center text-sm font-medium text-content-muted">
          {breadcrumbs.map((crumb, idx) => (
            <div key={idx} className="flex items-center">
              {idx > 0 && <span className="mx-2 text-border">/</span>}
              <span className={idx === breadcrumbs.length - 1 ? "text-content font-semibold" : ""}>
                {crumb}
              </span>
            </div>
          ))}
        </div>

        {/* Right: Notifications + Theme */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-content-muted hover:bg-surface-hover hover:text-content-muted transition-colors"
          >
            {theme === 'classic' && <Sparkles size={20} className="text-amber-500" title="เปลี่ยนเป็น Minimal Theme" />}
            {theme === 'minimal' && <Moon size={20} className="text-slate-600" title="เปลี่ยนเป็น Dark Theme" />}
            {theme === 'dark' && <Palette size={20} className="text-blue-400" title="เปลี่ยนเป็น Classic Theme" />}
          </button>

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              id="notification-bell"
              onClick={() => { setNotifOpen(v => !v); setUserOpen(false) }}
              className="relative p-2 rounded-lg text-content-muted hover:bg-surface-hover hover:text-content-muted transition-colors"
              aria-label="การแจ้งเตือน"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-danger rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-card rounded-xl shadow-card-lg border border-border-light z-50 animate-slide-in overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
                  <span className="font-semibold text-content text-sm">การแจ้งเตือน</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-primary-700 hover:underline font-medium"
                    >
                      ทำเครื่องหมายว่าอ่านแล้วทั้งหมด
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-400 text-sm">
                      ไม่มีการแจ้งเตือน
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => markRead(n.id)}
                        className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-background transition-colors ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                      >
                        <p className={`text-sm ${!n.is_read ? 'font-medium text-content' : 'text-content-muted'}`}>
                          {n.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: th })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="px-4 py-2 border-t border-border-light bg-background text-center">
                    <Link
                      to={`/${activeRole}/notifications`}
                      onClick={() => setNotifOpen(false)}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-800"
                    >
                      ดูการแจ้งเตือนทั้งหมด
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
