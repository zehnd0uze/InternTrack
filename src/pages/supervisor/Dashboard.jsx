import { useState, useEffect, useCallback } from 'react'
import { format, startOfWeek, startOfMonth } from 'date-fns'
import { th } from 'date-fns/locale'
import { Users, UserCheck, Clock, AlertCircle, Search, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useViewAs } from '../../contexts/ViewAsContext'
import { SkeletonCard, SkeletonTable } from '../../components/ui/Skeleton'

export default function SupervisorDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { setViewingAs } = useViewAs()
  const [students, setStudents] = useState([])
  const [stats, setStats] = useState({ total: 0, clockedInToday: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

    // Get students assigned to this supervisor
    const { data: studentList } = await supabase
      .from('users')
      .select('id, full_name, email, target_hours, is_active')
      .eq('supervisor_id', user.id)
      .eq('role', 'student')
      .eq('is_active', true)

    if (!studentList) { setLoading(false); return }

    const studentIds = studentList.map(s => s.id)

    // Today's attendance
    const { data: todayAtt } = await supabase
      .from('attendance')
      .select('user_id, check_in, check_out')
      .in('user_id', studentIds)
      .eq('date', todayStr)

    // This week's hours
    const { data: weekAtt } = await supabase
      .from('attendance')
      .select('user_id, hours_worked')
      .in('user_id', studentIds)
      .gte('date', weekStart)
      .not('check_out', 'is', null)

    // Total hours
    const { data: allAtt } = await supabase
      .from('attendance')
      .select('user_id, hours_worked')
      .in('user_id', studentIds)
      .not('check_out', 'is', null)

    const todayMap = {}
    ;(todayAtt || []).forEach(r => { todayMap[r.user_id] = r })

    const weekMap = {}
    ;(weekAtt || []).forEach(r => {
      weekMap[r.user_id] = (weekMap[r.user_id] || 0) + parseFloat(r.hours_worked || 0)
    })

    const totalMap = {}
    ;(allAtt || []).forEach(r => {
      totalMap[r.user_id] = (totalMap[r.user_id] || 0) + parseFloat(r.hours_worked || 0)
    })

    const enriched = studentList.map(s => ({
      ...s,
      todayRecord: todayMap[s.id] || null,
      weekHours: weekMap[s.id] || 0,
      totalHours: totalMap[s.id] || 0,
    }))

    setStudents(enriched)
    setStats({
      total: studentList.length,
      clockedInToday: Object.keys(todayMap).length,
    })
    setLoading(false)
  }, [user.id])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  const statusBadge = (record) => {
    if (!record) return <span className="badge badge-gray">ยังไม่เข้า</span>
    if (!record.check_out) return <span className="badge badge-warning">กำลังทำงาน</span>
    return <span className="badge badge-success">เลิกงานแล้ว</span>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-content">แดชบอร์ดอาจารย์นิเทศ</h1>
        <p className="text-sm text-content-muted mt-0.5">
          {format(new Date(), 'EEEE, d MMMM yyyy', { locale: th })}
        </p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="stat-card border-l-4 border-primary-500">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-primary-500" />
              <span className="stat-label">นักศึกษาทั้งหมด</span>
            </div>
            <span className="stat-value">{stats.total} <span className="text-sm font-normal text-gray-400">คน</span></span>
          </div>
          <div className="stat-card border-l-4 border-success">
            <div className="flex items-center gap-2">
              <UserCheck size={16} className="text-success" />
              <span className="stat-label">เข้างานวันนี้</span>
            </div>
            <span className="stat-value">{stats.clockedInToday} <span className="text-sm font-normal text-gray-400">คน</span></span>
          </div>
        </div>
      )}

      {/* Student List */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="font-semibold text-content flex items-center gap-2">
            <Users size={18} className="text-primary-700" />
            รายชื่อนักศึกษา
          </h2>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อหรืออีเมล..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 text-sm w-64"
            />
          </div>
        </div>

        {loading ? (
          <SkeletonTable rows={5} cols={5} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>{search ? 'ไม่พบนักศึกษาที่ค้นหา' : 'ยังไม่มีนักศึกษาที่ได้รับมอบหมาย'}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>ชื่อ-นามสกุล</th>
                  <th>สถานะวันนี้</th>
                  <th>ชั่วโมงสัปดาห์นี้</th>
                  <th>ชั่วโมงสะสม</th>
                  <th>การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div>
                        <p className="font-medium text-content">{s.full_name}</p>
                        <p className="text-xs text-gray-400">{s.email}</p>
                      </div>
                    </td>
                    <td>{statusBadge(s.todayRecord)}</td>
                    <td>
                      <span className="font-semibold text-content">{s.weekHours.toFixed(1)}</span>
                      <span className="text-gray-400 text-xs"> ชม.</span>
                    </td>
                    <td>
                      <div>
                        <span className="font-semibold text-primary-700">{s.totalHours.toFixed(1)}</span>
                        <span className="text-gray-400 text-xs"> / {s.target_hours} ชม.</span>
                      </div>
                      <div className="w-24 h-1.5 bg-surface-hover rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full"
                          style={{ width: `${Math.min(100, (s.totalHours / s.target_hours) * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button
                          id={`view-student-${s.id}`}
                          onClick={() => navigate(`/supervisor/students/${s.id}`)}
                          className="btn-secondary btn-sm"
                        >
                          <Eye size={14} /> ดูรายละเอียด
                        </button>
                        <button
                          id={`supervisor-view-as-${s.id}`}
                          onClick={() => { setViewingAs({ id: s.id, full_name: s.full_name }); navigate('/view-as-student') }}
                          className="btn-primary btn-sm flex items-center gap-1"
                          title={`ดูหน้าในฐานะ ${s.full_name}`}
                        >
                          ดูหน้า
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
