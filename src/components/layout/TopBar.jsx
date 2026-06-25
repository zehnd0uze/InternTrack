import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, Bell, ChevronDown, User, UserCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'

export default function TopBar({ onMenuClick }) {
  const { profile, signOut } = useAuth()
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications()
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const notifRef = useRef(null)
  const userRef = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const ROLE_LABELS = {
    student: 'นักศึกษา',
    supervisor: 'อาจารย์นิเทศ',
    admin: 'ผู้ดูแลระบบ',
    mentor: 'พี่เลี้ยง / หัวหน้างาน',
  }

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 flex-shrink-0 shadow-sm">
      {/* Left: Hamburger (mobile) */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="เปิดเมนู"
      >
        <Menu size={20} />
      </button>

      <div className="hidden md:flex items-center">
        <h1 className="text-sm text-gray-500 font-medium">
          ยินดีต้อนรับ, <span className="text-gray-900 font-semibold">{profile?.full_name}</span>
        </h1>
      </div>

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            id="notification-bell"
            onClick={() => { setNotifOpen(v => !v); setUserOpen(false) }}
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
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
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-card-lg border border-gray-100 z-50 animate-slide-in overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-gray-900 text-sm">การแจ้งเตือน</span>
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
                      className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                    >
                      <p className={`text-sm ${!n.is_read ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                        {n.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: th })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userRef}>
          <button
            id="user-menu"
            onClick={() => { setUserOpen(v => !v); setNotifOpen(false) }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-800 leading-tight">{profile?.full_name}</p>
              <p className="text-xs text-gray-400">{ROLE_LABELS[profile?.role]}</p>
            </div>
            <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
          </button>

          {userOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-card-lg border border-gray-100 z-50 animate-slide-in py-1">
              <div className="px-3 py-2 border-b border-gray-50">
                <p className="text-xs text-gray-400">เข้าสู่ระบบในฐานะ</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{profile?.full_name}</p>
              </div>
              {profile?.role === 'student' && (
                <NavLink
                  to="/student/profile"
                  onClick={() => setUserOpen(false)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <UserCircle size={15} className="text-gray-400" />
                  แก้ไขโปรไฟล์
                </NavLink>
              )}
              <button
                onClick={signOut}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                ออกจากระบบ
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
