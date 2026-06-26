import { useState, useEffect, useCallback } from 'react'
import { format, startOfWeek, addDays, subWeeks } from 'date-fns'
import { th } from 'date-fns/locale'
import { Send, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { SkeletonCard } from '../../components/ui/Skeleton'

export default function StudentWeeklySubmit() {
  const { user } = useAuth()
  const [weeks, setWeeks] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(null)

  const fetchWeeks = useCallback(async () => {
    setLoading(true)
    // Last 4 weeks
    const items = []
    for (let i = 0; i < 4; i++) {
      const weekStart = format(startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const weekEnd = format(addDays(new Date(weekStart), 6), 'yyyy-MM-dd')

      // Get attendance for the week
      const { data: att } = await supabase
        .from('attendance')
        .select('hours_worked')
        .eq('user_id', user.id)
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .not('check_out', 'is', null)

      const totalHours = (att || []).reduce((s, r) => s + (parseFloat(r.hours_worked) || 0), 0)

      // Check existing approval
      const { data: approval } = await supabase
        .from('weekly_approvals')
        .select('*')
        .eq('student_id', user.id)
        .eq('week_start', weekStart)
        .maybeSingle()

      items.push({ weekStart, weekEnd, totalHours, approval })
    }
    setWeeks(items)
    setLoading(false)
  }, [user.id])

  useEffect(() => { fetchWeeks() }, [fetchWeeks])

  const handleSubmit = async (weekStart, totalHours) => {
    setSubmitting(weekStart)
    // Get supervisor
    const { data: profile } = await supabase
      .from('users')
      .select('supervisor_id, full_name')
      .eq('id', user.id)
      .single()

    // Get mentor
    const { data: placement } = await supabase
      .from('internship_placements')
      .select('mentor_id')
      .eq('student_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    const { error } = await supabase.from('weekly_approvals').insert({
      student_id: user.id,
      supervisor_id: profile?.supervisor_id || placement?.mentor_id || null,
      week_start: weekStart,
      total_hours: parseFloat(totalHours.toFixed(2)),
      status: 'pending',
    })

    // Create notification for supervisor and mentor
    if (!error) {
      const notifyIds = []
      if (profile?.supervisor_id) notifyIds.push(profile.supervisor_id)
      if (placement?.mentor_id && placement.mentor_id !== profile?.supervisor_id) notifyIds.push(placement.mentor_id)

      if (notifyIds.length > 0) {
        const notifications = notifyIds.map(id => ({
          user_id: id,
          message: `มีคำขออนุมัติชั่วโมงใหม่จาก ${profile?.full_name || 'นักศึกษา'} — สัปดาห์ ${weekStart}`,
          type: 'approval_request',
        }))
        await supabase.from('notifications').insert(notifications)
      }
    }

    setSubmitting(null)
    if (error) {
      if (error.code === '23505') {
        toast.error('คุณส่งคำขอสัปดาห์นี้แล้ว')
      } else {
        toast.error('ส่งคำขอล้มเหลว')
      }
    } else {
      toast.success('ส่งคำขออนุมัติแล้ว!')
      fetchWeeks()
    }
  }

  const STATUS_BADGE = {
    pending:  <span className="badge badge-warning">รอการอนุมัติ</span>,
    approved: <span className="badge badge-success">อนุมัติแล้ว ✅</span>,
    rejected: <span className="badge badge-danger">ถูกปฏิเสธ ❌</span>,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-gray-900">ส่งชั่วโมงรายสัปดาห์</h1>
        <p className="text-sm text-gray-500 mt-0.5">ส่งสรุปชั่วโมงทำงานให้อาจารย์นิเทศอนุมัติ</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : weeks.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <Clock size={40} className="mx-auto mb-3 opacity-30" />
          <p>ยังไม่มีข้อมูลชั่วโมง</p>
        </div>
      ) : (
        <div className="space-y-4">
          {weeks.map(({ weekStart, weekEnd, totalHours, approval }) => {
            const wStart = new Date(weekStart)
            const wEnd = new Date(weekEnd)
            const alreadySubmitted = !!approval
            const isCurrentWeek = weekStart === format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

            return (
              <div key={weekStart} className="card">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {format(wStart, 'd MMM', { locale: th })} – {format(wEnd, 'd MMM yyyy', { locale: th })}
                      </h3>
                      {isCurrentWeek && (
                        <span className="badge badge-info text-xs">สัปดาห์นี้</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      ชั่วโมงทั้งหมด: <span className="font-semibold text-gray-900">{totalHours.toFixed(1)} ชม.</span>
                    </p>
                    {approval?.note && (
                      <div className="mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm text-red-700 flex items-start gap-2">
                        <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                        <span><strong>หมายเหตุ:</strong> {approval.note}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {alreadySubmitted ? (
                      <div className="text-center">
                        {STATUS_BADGE[approval.status]}
                      </div>
                    ) : totalHours === 0 ? (
                      <span className="text-sm text-gray-400 italic">ไม่มีชั่วโมงทำงาน</span>
                    ) : (
                      <button
                        id={`submit-week-${weekStart}`}
                        onClick={() => handleSubmit(weekStart, totalHours)}
                        disabled={submitting === weekStart}
                        className="btn-primary btn-sm disabled:opacity-60"
                      >
                        {submitting === weekStart ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <><Send size={14} /> ส่งขออนุมัติ</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
