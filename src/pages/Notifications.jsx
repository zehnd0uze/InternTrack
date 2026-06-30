import { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { th } from 'date-fns/locale'
import { Bell, Check, CheckCircle2, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationContext'
import toast from 'react-hot-toast'

export default function NotificationsPage() {
  const { user } = useAuth()
  const { markRead: contextMarkRead, markAllRead: contextMarkAllRead } = useNotifications()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error(error)
      toast.error('ไม่สามารถดึงข้อมูลการแจ้งเตือนได้')
    } else {
      setNotifications(data || [])
    }
    setLoading(false)
  }, [user.id])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkRead = async (id) => {
    await contextMarkRead(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const handleMarkAllRead = async () => {
    await contextMarkAllRead()
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    toast.success('ทำเครื่องหมายว่าอ่านแล้วทั้งหมด')
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-fade-in pb-10 pt-4">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700/50 rounded animate-pulse mb-6"></div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="card p-5 flex gap-4 border border-gray-100 dark:border-gray-800">
            <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700/50 animate-pulse mt-1.5" />
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700/50 rounded animate-pulse w-3/4"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700/50 rounded animate-pulse w-1/4"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-content flex items-center gap-2">
            <Bell size={24} className="text-primary-600" /> การแจ้งเตือนทั้งหมด
          </h1>
          <p className="text-content-muted mt-1">ประวัติการแจ้งเตือนระบบและการเปลี่ยนแปลงสถานะต่างๆ</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="btn-secondary flex items-center gap-2 bg-card"
          >
            <CheckCircle2 size={16} className="text-green-600" />
            ทำเครื่องหมายว่าอ่านแล้วทั้งหมด ({unreadCount})
          </button>
        )}
      </div>

      <div className="card divide-y divide-gray-100 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Bell size={48} className="mx-auto mb-4 opacity-20" />
            <p>ยังไม่มีการแจ้งเตือนใดๆ</p>
          </div>
        ) : (
          notifications.map(n => (
            <div 
              key={n.id} 
              className={`p-5 flex gap-4 transition-colors group ${!n.is_read ? 'bg-blue-50/30' : 'hover:bg-background'}`}
            >
              <div className="mt-1 flex-shrink-0">
                {!n.is_read ? (
                  <div className="w-2.5 h-2.5 bg-primary-500 rounded-full mt-1.5" />
                ) : (
                  <Check size={16} className="text-gray-300 mt-1" />
                )}
              </div>
              <div className="flex-1">
                <p className={`text-[15px] ${!n.is_read ? 'text-content font-medium' : 'text-content-muted'}`}>
                  {n.message}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
                  <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: th })}</span>
                  <span>•</span>
                  <span>{format(new Date(n.created_at), 'd MMM yyyy HH:mm', { locale: th })} น.</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {!n.is_read && (
                  <button 
                    onClick={() => handleMarkRead(n.id)}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg text-sm font-medium"
                  >
                    อ่านแล้ว
                  </button>
                )}
                <button 
                  onClick={() => handleDelete(n.id)}
                  className="p-2 text-gray-400 hover:text-danger hover:bg-red-50 rounded-lg"
                  title="ลบการแจ้งเตือน"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
