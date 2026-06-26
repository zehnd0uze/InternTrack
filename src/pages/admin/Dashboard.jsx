import { useState, useEffect, useCallback, useRef } from 'react'
import { format, startOfWeek, subWeeks, addDays } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  Users, UserCheck, AlertCircle, CheckCircle, BarChart3,
  Clock, FileText, Activity, RefreshCw, Wifi, WifiOff,
  ChevronUp, ChevronDown, Check, X as XIcon, Eye
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useViewAs } from '../../contexts/ViewAsContext'
import { SkeletonCard } from '../../components/ui/Skeleton'

// ─── Live badge ────────────────────────────────────────────────────────────────
function LiveBadge({ connected }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
      connected ? 'bg-green-100 text-green-700' : 'bg-surface-hover text-content-muted'
    }`}>
      {connected
        ? <><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />LIVE</>
        : <><WifiOff size={10} />OFFLINE</>}
    </span>
  )
}

// ─── Progress bar ───────────────────────────────────────────────────────────────
function ProgressBar({ pct }) {
  const clamped = Math.min(100, pct)
  const color = clamped >= 100 ? 'bg-green-500' : clamped >= 50 ? 'bg-blue-500' : 'bg-amber-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-hover rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs text-content-muted w-9 text-right">{clamped.toFixed(0)}%</span>
    </div>
  )
}

// ─── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, borderColor, loading }) {
  return (
    <div className={`stat-card border-l-4 ${borderColor}`}>
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-8 bg-gray-200 rounded w-16" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Icon size={16} className={color} />
            <span className="stat-label">{label}</span>
          </div>
          <span className="stat-value">{value}</span>
        </>
      )}
    </div>
  )
}

const COLORS = ['#1B3A6B','#3b82f6','#10B981','#F59E0B','#EF4444','#8b5cf6','#f97316','#06b6d4']

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { setViewingAs } = useViewAs()
  const [stats, setStats] = useState({ totalStudents: 0, clockedToday: 0, pendingApprovals: 0, approvedThisWeek: 0 })
  const [statsLoading, setStatsLoading] = useState(true)
  const [liveAttendance, setLiveAttendance] = useState([])
  const [attLoading, setAttLoading] = useState(true)
  const [pendingList, setPendingList] = useState([])
  const [pendingLoading, setPendingLoading] = useState(true)
  const [studentsProgress, setStudentsProgress] = useState([])
  const [progressLoading, setProgressLoading] = useState(true)
  const [recentLogs, setRecentLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [chartData, setChartData] = useState([])
  const [chartStudents, setChartStudents] = useState([])
  const [chartLoading, setChartLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)
  const [approvingId, setApprovingId] = useState(null)
  const channelRef = useRef(null)

  // ── Fetch helpers ──────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const [studRes, todayRes, pendRes, approvedRes] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact' }).eq('role', 'student').eq('is_active', true),
      supabase.from('attendance').select('id', { count: 'exact' }).eq('date', todayStr),
      supabase.from('weekly_approvals').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('weekly_approvals').select('id', { count: 'exact' }).eq('status', 'approved').gte('approved_at', weekStart),
    ])
    setStats({
      totalStudents: studRes.count || 0,
      clockedToday: todayRes.count || 0,
      pendingApprovals: pendRes.count || 0,
      approvedThisWeek: approvedRes.count || 0,
    })
    setStatsLoading(false)
  }, [])

  const fetchLiveAttendance = useCallback(async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const { data } = await supabase
      .from('attendance')
      .select('id, user_id, check_in, check_out, hours_worked, users:user_id(full_name)')
      .eq('date', todayStr)
      .order('check_in', { ascending: false })
    setLiveAttendance(data || [])
    setAttLoading(false)
  }, [])

  const fetchPending = useCallback(async () => {
    const { data } = await supabase
      .from('weekly_approvals')
      .select('id, student_id, week_start, total_hours, status, users:student_id(full_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20)
    setPendingList(data || [])
    setPendingLoading(false)
  }, [])

  const fetchStudentsProgress = useCallback(async () => {
    const { data: students } = await supabase
      .from('users')
      .select('id, full_name, target_hours')
      .eq('role', 'student')
      .eq('is_active', true)
      .order('full_name')

    if (!students) { setProgressLoading(false); return }

    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const results = await Promise.all(students.map(async (s) => {
      const [{ data: att }, { data: todayAtt }] = await Promise.all([
        supabase.from('attendance').select('hours_worked').eq('user_id', s.id).not('check_out', 'is', null),
        supabase.from('attendance').select('check_in, check_out').eq('user_id', s.id).eq('date', todayStr).single(),
      ])
      const total = (att || []).reduce((sum, r) => sum + parseFloat(r.hours_worked || 0), 0)
      const pct = (total / (s.target_hours || 1596)) * 100
      return {
        ...s,
        totalHours: total,
        pct,
        clockedIn: !!todayAtt && !todayAtt.check_out,
        clockedOut: !!todayAtt && !!todayAtt.check_out,
      }
    }))
    results.sort((a, b) => b.totalHours - a.totalHours)
    setStudentsProgress(results)
    setProgressLoading(false)
  }, [])

  const fetchRecentLogs = useCallback(async () => {
    const { data } = await supabase
      .from('daily_logs')
      .select('id, log_text, date, created_at, users:user_id(full_name)')
      .order('created_at', { ascending: false })
      .limit(10)
    setRecentLogs(data || [])
    setLogsLoading(false)
  }, [])

  const fetchChart = useCallback(async () => {
    setChartLoading(true)
    const { data: studentList } = await supabase
      .from('users').select('id, full_name').eq('role', 'student').eq('is_active', true).limit(8)
    setChartStudents(studentList || [])
    const weeks = []
    for (let i = 3; i >= 0; i--) {
      const ws = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 })
      const weekStartStr = format(ws, 'yyyy-MM-dd')
      const weekEndStr = format(addDays(ws, 6), 'yyyy-MM-dd')
      const label = format(ws, 'd MMM', { locale: th })
      const weekData = { week: label }
      for (const s of (studentList || [])) {
        const { data } = await supabase.from('attendance').select('hours_worked')
          .eq('user_id', s.id).gte('date', weekStartStr).lte('date', weekEndStr).not('check_out', 'is', null)
        weekData[s.full_name] = (data || []).reduce((sum, r) => sum + parseFloat(r.hours_worked || 0), 0)
      }
      weeks.push(weekData)
    }
    setChartData(weeks)
    setChartLoading(false)
  }, [])

  const fetchAll = useCallback(() => {
    fetchStats()
    fetchLiveAttendance()
    fetchPending()
    fetchStudentsProgress()
    fetchRecentLogs()
    fetchChart()
  }, [fetchStats, fetchLiveAttendance, fetchPending, fetchStudentsProgress, fetchRecentLogs, fetchChart])

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Supabase Realtime ───────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase.channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        fetchStats(); fetchLiveAttendance(); fetchStudentsProgress()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_approvals' }, () => {
        fetchStats(); fetchPending()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_logs' }, () => {
        fetchRecentLogs()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchStats(); fetchStudentsProgress(); fetchChart()
      })
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    // Chart auto-refresh every 60s
    const chartTimer = setInterval(fetchChart, 60000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(chartTimer)
    }
  }, [fetchStats, fetchLiveAttendance, fetchPending, fetchStudentsProgress, fetchRecentLogs, fetchChart])

  // ── Approve / Reject ────────────────────────────────────────────────────────
  const handleApproval = async (id, action) => {
    setApprovingId(id)
    const { error } = await supabase.from('weekly_approvals').update({
      status: action,
      approved_at: new Date().toISOString(),
    }).eq('id', id)
    setApprovingId(null)
    if (error) {
      toast.error('ดำเนินการล้มเหลว')
    } else {
      toast.success(action === 'approved' ? '✅ อนุมัติแล้ว' : '❌ ปฏิเสธแล้ว')
      fetchPending(); fetchStats()
    }
  }

  const fmt = (ts) => ts ? format(new Date(ts), 'HH:mm', { locale: th }) : '—'

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-content">ภาพรวมระบบ</h1>
          <p className="text-sm text-content-muted mt-0.5">
            {format(new Date(), 'EEEE, d MMMM yyyy', { locale: th })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge connected={isLive} />
          <button
            onClick={fetchAll}
            className="btn-secondary btn-sm"
            title="รีเฟรชทั้งหมด"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="นักศึกษาทั้งหมด" value={stats.totalStudents} color="text-primary-500" borderColor="border-primary-500" loading={statsLoading} />
        <StatCard icon={UserCheck} label="เข้างานวันนี้" value={stats.clockedToday} color="text-green-500" borderColor="border-green-500" loading={statsLoading} />
        <StatCard icon={AlertCircle} label="รออนุมัติ" value={stats.pendingApprovals} color="text-amber-500" borderColor="border-amber-500" loading={statsLoading} />
        <StatCard icon={CheckCircle} label="อนุมัติสัปดาห์นี้" value={stats.approvedThisWeek} color="text-blue-500" borderColor="border-blue-500" loading={statsLoading} />
      </div>

      {/* Live Attendance + Pending side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Live Attendance Feed */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-green-600" />
              <h2 className="font-semibold text-content">การเข้างานวันนี้</h2>
            </div>
            <span className="text-xs text-gray-400">{format(new Date(), 'dd/MM/yyyy')}</span>
          </div>
          {attLoading ? (
            <div className="space-y-3">{[1,2,3].map(i=>(
              <div key={i} className="animate-pulse flex gap-3 items-center">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-200 rounded w-32" />
                  <div className="h-2.5 bg-surface-hover rounded w-24" />
                </div>
              </div>
            ))}</div>
          ) : liveAttendance.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">ยังไม่มีนักศึกษาเข้างานวันนี้</div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {liveAttendance.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-background hover:bg-surface-hover transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.check_out ? 'bg-gray-400' : 'bg-green-500 animate-pulse'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-content truncate">{a.users?.full_name || '—'}</p>
                    <p className="text-xs text-gray-400">
                      เข้า {fmt(a.check_in)}
                      {a.check_out ? ` · ออก ${fmt(a.check_out)}` : ' · กำลังทำงาน'}
                    </p>
                  </div>
                  {a.hours_worked && (
                    <span className="text-xs font-semibold text-blue-600 flex-shrink-0">
                      {parseFloat(a.hours_worked).toFixed(1)} ชม.
                    </span>
                  )}
                  {!a.check_out && (
                    <span className="text-xs text-green-600 font-medium flex-shrink-0">ใช้งานอยู่</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Approvals */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={18} className="text-amber-500" />
            <h2 className="font-semibold text-content">รายการรออนุมัติ</h2>
            {pendingList.length > 0 && (
              <span className="ml-auto text-xs font-bold text-white bg-amber-500 rounded-full w-5 h-5 flex items-center justify-center">
                {pendingList.length}
              </span>
            )}
          </div>
          {pendingLoading ? (
            <div className="space-y-3">{[1,2,3].map(i=>(
              <div key={i} className="animate-pulse space-y-1.5">
                <div className="h-3.5 bg-gray-200 rounded w-40" />
                <div className="h-2.5 bg-surface-hover rounded w-28" />
              </div>
            ))}</div>
          ) : pendingList.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">ไม่มีรายการรออนุมัติ ✅</div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {pendingList.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-content truncate">{a.users?.full_name || '—'}</p>
                    <p className="text-xs text-content-muted">
                      สัปดาห์ {format(new Date(a.week_start), 'd MMM yyyy', { locale: th })}
                      {a.total_hours && ` · ${parseFloat(a.total_hours).toFixed(1)} ชม.`}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleApproval(a.id, 'approved')}
                      disabled={approvingId === a.id}
                      className="p-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors disabled:opacity-50"
                      title="อนุมัติ"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => handleApproval(a.id, 'rejected')}
                      disabled={approvingId === a.id}
                      className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-colors disabled:opacity-50"
                      title="ปฏิเสธ"
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All Students Progress */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-primary-700" />
          <h2 className="font-semibold text-content">ความคืบหน้านักศึกษาทั้งหมด</h2>
        </div>
        {progressLoading ? (
          <div className="space-y-3">{[1,2,3,4].map(i=>(
            <div key={i} className="animate-pulse space-y-1.5">
              <div className="flex justify-between"><div className="h-3.5 bg-gray-200 rounded w-36" /><div className="h-3.5 bg-surface-hover rounded w-16" /></div>
              <div className="h-1.5 bg-surface-hover rounded-full" />
            </div>
          ))}</div>
        ) : studentsProgress.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">ยังไม่มีนักศึกษาในระบบ</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table min-w-full">
              <thead>
                <tr>
                  <th>ชื่อ-นามสกุล</th>
                  <th>สถานะวันนี้</th>
                  <th className="w-48">ความคืบหน้า</th>
                  <th>ชั่วโมงสะสม</th>
                  <th>เป้าหมาย</th>
                  <th>ดูหน้า</th>
                </tr>
              </thead>
              <tbody>
                {studentsProgress.map(s => (
                  <tr key={s.id}>
                    <td className="font-medium text-content">{s.full_name}</td>
                    <td>
                      {s.clockedIn
                        ? <span className="badge badge-success flex items-center gap-1 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />อยู่</span>
                        : s.clockedOut
                          ? <span className="badge badge-gray">เสร็จแล้ว</span>
                          : <span className="badge badge-gray">ยังไม่เข้า</span>}
                    </td>
                    <td><ProgressBar pct={s.pct} /></td>
                    <td className="font-semibold text-primary-700">{s.totalHours.toFixed(1)} <span className="text-xs text-gray-400">ชม.</span></td>
                    <td className="text-content-muted text-sm">{s.target_hours} ชม.</td>
                    <td>
                      <button
                        id={`admin-view-as-${s.id}`}
                        onClick={() => { setViewingAs({ id: s.id, full_name: s.full_name }); navigate('/view-as-student') }}
                        className="btn-secondary btn-sm flex items-center gap-1"
                        title={`ดูหน้าในฐานะ ${s.full_name}`}
                      >
                        <Eye size={13} /> ดูหน้า
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Logs */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={18} className="text-primary-700" />
          <h2 className="font-semibold text-content">บันทึกประจำวันล่าสุด</h2>
        </div>
        {logsLoading ? (
          <div className="space-y-3">{[1,2,3].map(i=>(
            <div key={i} className="animate-pulse space-y-1.5">
              <div className="h-3 bg-gray-200 rounded w-48" />
              <div className="h-3 bg-surface-hover rounded w-full" />
            </div>
          ))}</div>
        ) : recentLogs.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">ยังไม่มีบันทึกประจำวัน</p>
        ) : (
          <div className="space-y-3">
            {recentLogs.map(log => (
              <div key={log.id} className="p-3 rounded-lg bg-background border-l-2 border-primary-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-content">{log.users?.full_name || '—'}</span>
                  <span className="text-xs text-gray-400">{format(new Date(log.date), 'd MMM yyyy', { locale: th })}</span>
                </div>
                <p className="text-sm text-content-muted line-clamp-2">{log.log_text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-primary-700" />
            <h2 className="font-semibold text-content">ชั่วโมงทำงานรายสัปดาห์ (4 สัปดาห์ล่าสุด)</h2>
          </div>
          <span className="text-xs text-gray-400">รีเฟรชทุก 60 วิ</span>
        </div>
        {chartLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex gap-1.5">
              {[0,1,2].map(i=>(
                <div key={i} className="w-2 h-2 bg-primary-300 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}} />
              ))}
            </div>
          </div>
        ) : chartData.length === 0 || chartStudents.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">ไม่มีข้อมูล</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} unit=" ชม." />
              <Tooltip
                contentStyle={{ fontFamily: 'Inter, Sarabun, sans-serif', fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
                formatter={(val) => [`${parseFloat(val).toFixed(1)} ชม.`]}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
              {chartStudents.map((s, i) => (
                <Bar key={s.id} dataKey={s.full_name} fill={COLORS[i % COLORS.length]} radius={[3,3,0,0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
