import { useState, useEffect, useCallback } from 'react'
import { format, startOfWeek, subWeeks, addDays } from 'date-fns'
import { th } from 'date-fns/locale'
import { Users, UserCheck, AlertCircle, CheckCircle, BarChart3 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { SkeletonCard } from '../../components/ui/Skeleton'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalStudents: 0, clockedToday: 0, pendingApprovals: 0, approvedThisWeek: 0 })
  const [chartData, setChartData] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    setLoading(true)
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
    setLoading(false)
  }, [])

  const fetchChart = useCallback(async () => {
    setChartLoading(true)
    // Get students
    const { data: studentList } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('role', 'student')
      .eq('is_active', true)
      .limit(8)

    setStudents(studentList || [])

    // Build chart data for last 4 weeks
    const weeks = []
    for (let i = 3; i >= 0; i--) {
      const ws = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 })
      const weekStartStr = format(ws, 'yyyy-MM-dd')
      const weekEndStr = format(addDays(ws, 6), 'yyyy-MM-dd')
      const label = `${format(ws, 'd MMM', { locale: th })}`

      const weekData = { week: label }
      for (const s of (studentList || [])) {
        const { data } = await supabase
          .from('attendance')
          .select('hours_worked')
          .eq('user_id', s.id)
          .gte('date', weekStartStr)
          .lte('date', weekEndStr)
          .not('check_out', 'is', null)
        weekData[s.full_name] = (data || []).reduce((sum, r) => sum + parseFloat(r.hours_worked || 0), 0)
      }
      weeks.push(weekData)
    }
    setChartData(weeks)
    setChartLoading(false)
  }, [])

  useEffect(() => { fetchStats(); fetchChart() }, [fetchStats, fetchChart])

  const COLORS = ['#1B3A6B', '#3b82f6', '#10B981', '#F59E0B', '#EF4444', '#8b5cf6', '#f97316', '#06b6d4']

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-gray-900">ภาพรวมระบบ</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {format(new Date(), 'EEEE, d MMMM yyyy', { locale: th })}
        </p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i=><SkeletonCard key={i}/>)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card border-l-4 border-primary-500">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-primary-500" />
              <span className="stat-label">นักศึกษาทั้งหมด</span>
            </div>
            <span className="stat-value">{stats.totalStudents}</span>
          </div>
          <div className="stat-card border-l-4 border-success">
            <div className="flex items-center gap-2">
              <UserCheck size={16} className="text-success" />
              <span className="stat-label">เข้างานวันนี้</span>
            </div>
            <span className="stat-value">{stats.clockedToday}</span>
          </div>
          <div className="stat-card border-l-4 border-warning">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-warning" />
              <span className="stat-label">รออนุมัติ</span>
            </div>
            <span className="stat-value">{stats.pendingApprovals}</span>
          </div>
          <div className="stat-card border-l-4 border-primary-400">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-primary-400" />
              <span className="stat-label">อนุมัติสัปดาห์นี้</span>
            </div>
            <span className="stat-value">{stats.approvedThisWeek}</span>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="card">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 size={18} className="text-primary-700" />
          <h2 className="font-semibold text-gray-900">ชั่วโมงทำงานรายสัปดาห์ (4 สัปดาห์ล่าสุด)</h2>
        </div>
        {chartLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex gap-1.5">
              {[0,1,2].map(i=>(
                <div key={i} className="w-2 h-2 bg-primary-300 rounded-full animate-bounce"
                     style={{animationDelay:`${i*0.15}s`}}/>
              ))}
            </div>
          </div>
        ) : chartData.length === 0 || students.length === 0 ? (
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
              {students.map((s, i) => (
                <Bar key={s.id} dataKey={s.full_name} fill={COLORS[i % COLORS.length]} radius={[3,3,0,0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
