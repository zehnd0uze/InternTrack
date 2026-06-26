import { useState, useEffect, useCallback } from 'react'
import { format, startOfWeek } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  Users, UserCheck, AlertCircle, Search, Eye,
  Building2, Clock, Target,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useViewAs } from '../../contexts/ViewAsContext'
import { SkeletonCard, SkeletonTable } from '../../components/ui/Skeleton'

export default function MentorDashboard() {
  const { user } = useAuth()
  const { setViewingAs } = useViewAs()
  const navigate = useNavigate()
  const [interns, setInterns] = useState([])
  const [stats, setStats] = useState({ total: 0, clockedInToday: 0, pendingCount: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

    // Get interns assigned to this mentor via internship_placements
    const { data: placements } = await supabase
      .from('internship_placements')
      .select('*, student:student_id(id, full_name, email, target_hours, is_active)')
      .eq('mentor_id', user.id)

    if (!placements || placements.length === 0) {
      setLoading(false)
      return
    }

    const studentIds = placements.map(p => p.student_id)

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

    // Pending approvals
    const { count: pendingCount } = await supabase
      .from('weekly_approvals')
      .select('id', { count: 'exact' })
      .in('student_id', studentIds)
      .eq('status', 'pending')

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

    const enriched = placements.map(p => ({
      ...p.student,
      placement: p,
      todayRecord: todayMap[p.student_id] || null,
      weekHours: weekMap[p.student_id] || 0,
      totalHours: totalMap[p.student_id] || 0,
    }))

    setInterns(enriched)
    setStats({
      total: placements.length,
      clockedInToday: Object.keys(todayMap).length,
      pendingCount: pendingCount || 0,
    })
    setLoading(false)
  }, [user.id])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = interns.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.placement?.company_name?.toLowerCase().includes(search.toLowerCase())
  )

  const statusBadge = (record) => {
    if (!record) return <span className="badge badge-gray">ยังไม่เข้า</span>
    if (!record.check_out) return <span className="badge badge-warning">กำลังทำงาน</span>
    return <span className="badge badge-success">เลิกงานแล้ว</span>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-content">แดชบอร์ดพี่เลี้ยง</h1>
        <p className="text-sm text-content-muted mt-0.5">
          {format(new Date(), 'EEEE, d MMMM yyyy', { locale: th })}
        </p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card border-l-4 border-primary-500">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-primary-500" />
              <span className="stat-label">นักศึกษาฝึกงานทั้งหมด</span>
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
          <div className="stat-card border-l-4 border-warning">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-warning" />
              <span className="stat-label">รออนุมัติชั่วโมง</span>
              {stats.pendingCount > 0 && (
                <span className="ml-auto badge badge-warning">{stats.pendingCount}</span>
              )}
            </div>
            <span className="stat-value">{stats.pendingCount} <span className="text-sm font-normal text-gray-400">รายการ</span></span>
          </div>
        </div>
      )}

      {/* Intern List */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="font-semibold text-content flex items-center gap-2">
            <Users size={18} className="text-primary-700" />
            รายชื่อนักศึกษาฝึกงาน
          </h2>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, อีเมล, หรือบริษัท..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 text-sm w-72"
            />
          </div>
        </div>

        {loading ? (
          <SkeletonTable rows={5} cols={6} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>{search ? 'ไม่พบนักศึกษาที่ค้นหา' : 'ยังไม่มีนักศึกษาฝึกงานที่ได้รับมอบหมาย'}</p>
            {!search && (
              <p className="text-sm mt-1">ผู้ดูแลระบบต้องสร้างข้อมูลการฝึกงานและมอบหมายให้คุณก่อน</p>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>นักศึกษา</th>
                  <th>บริษัท / ตำแหน่ง</th>
                  <th>สถานะวันนี้</th>
                  <th>ชม. สัปดาห์นี้</th>
                  <th>ชม. สะสม</th>
                  <th>การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs flex-shrink-0">
                          {s.full_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-content">{s.full_name}</p>
                          <p className="text-xs text-gray-400">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      {s.placement ? (
                        <div>
                          <p className="font-medium text-content flex items-center gap-1">
                            <Building2 size={12} className="text-gray-400" />
                            {s.placement.company_name}
                          </p>
                          <p className="text-xs text-gray-400">{s.placement.position}</p>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">ไม่มีข้อมูล</span>
                      )}
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
                          id={`view-intern-${s.id}`}
                          onClick={() => navigate(`/mentor/students/${s.id}`)}
                          className="btn-secondary btn-sm"
                        >
                          <Eye size={14} /> ดูรายละเอียด
                        </button>
                        <button
                          id={`mentor-view-as-${s.id}`}
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
