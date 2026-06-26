import { useState, useEffect, useCallback } from 'react'
import { format, addDays } from 'date-fns'
import { th } from 'date-fns/locale'
import { CheckSquare, ChevronDown, ChevronUp, Check, X, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { SkeletonCard } from '../../components/ui/Skeleton'

export default function SupervisorApprovals() {
  const { user } = useAuth()
  const [pending, setPending] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [rejectId, setRejectId] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [processing, setProcessing] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [pendingRes, historyRes] = await Promise.all([
      supabase
        .from('weekly_approvals')
        .select('*, student:student_id(full_name, email)')
        .eq('supervisor_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('weekly_approvals')
        .select('*, student:student_id(full_name, email)')
        .eq('supervisor_id', user.id)
        .neq('status', 'pending')
        .order('approved_at', { ascending: false })
        .limit(20),
    ])
    setPending(pendingRes.data || [])
    setHistory(historyRes.data || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { fetchData() }, [fetchData])

  const fetchDailyDetail = async (approvalId, weekStart, studentId) => {
    const weekEnd = format(addDays(new Date(weekStart), 6), 'yyyy-MM-dd')
    const { data } = await supabase
      .from('attendance')
      .select('*, daily_logs(log_text)')
      .eq('user_id', studentId)
      .gte('date', weekStart)
      .lte('date', weekEnd)
      .order('date')
    return data || []
  }

  const [expandedData, setExpandedData] = useState({})

  const toggleExpand = async (approval) => {
    const id = approval.id
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!expandedData[id]) {
      const data = await fetchDailyDetail(id, approval.week_start, approval.student_id)
      setExpandedData(p => ({ ...p, [id]: data }))
    }
  }

  const handleApprove = async (approvalId, studentId) => {
    setProcessing(approvalId)
    const { error } = await supabase
      .from('weekly_approvals')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', approvalId)

    if (!error) {
      await supabase.from('notifications').insert({
        user_id: studentId,
        message: 'ชั่วโมงทำงานประจำสัปดาห์ของคุณได้รับการอนุมัติแล้ว ✅',
        type: 'approval_result',
      })
      toast.success('อนุมัติเรียบร้อยแล้ว!')
      fetchData()
    } else {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    }
    setProcessing(null)
  }

  const handleReject = async (approvalId, studentId) => {
    if (!rejectNote.trim()) { toast.error('กรุณากรอกเหตุผลที่ปฏิเสธ'); return }
    setProcessing(approvalId)
    const { error } = await supabase
      .from('weekly_approvals')
      .update({ status: 'rejected', note: rejectNote.trim(), approved_at: new Date().toISOString() })
      .eq('id', approvalId)

    if (!error) {
      await supabase.from('notifications').insert({
        user_id: studentId,
        message: `ชั่วโมงทำงานของคุณถูกปฏิเสธ: ${rejectNote.trim()}`,
        type: 'approval_result',
      })
      toast.success('ปฏิเสธคำขอแล้ว')
      setRejectId(null)
      setRejectNote('')
      fetchData()
    } else {
      toast.error('เกิดข้อผิดพลาด')
    }
    setProcessing(null)
  }

  const WeekRange = ({ weekStart }) => {
    const s = new Date(weekStart)
    const e = addDays(s, 6)
    return <span>{format(s, 'd MMM', { locale: th })} – {format(e, 'd MMM yyyy', { locale: th })}</span>
  }

  const ApprovalCard = ({ approval, showActions }) => {
    const isExpanded = expanded === approval.id
    const details = expandedData[approval.id] || []

    return (
      <div className="border border-border-light rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-shadow">
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-card cursor-pointer"
          onClick={() => toggleExpand(approval)}
        >
          <div className="flex-1">
            <p className="font-semibold text-content">{approval.student?.full_name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              สัปดาห์: <WeekRange weekStart={approval.week_start} />
            </p>
            <p className="text-sm text-content-muted mt-1">
              รวม <span className="font-bold text-primary-700">{parseFloat(approval.total_hours).toFixed(1)} ชั่วโมง</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!showActions && (
              <span className={`badge ${approval.status === 'approved' ? 'badge-success' : 'badge-danger'}`}>
                {approval.status === 'approved' ? 'อนุมัติแล้ว' : 'ถูกปฏิเสธ'}
              </span>
            )}
            {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          </div>
        </div>

        {/* Expanded Detail */}
        {isExpanded && (
          <div className="border-t border-border-light bg-background p-4 space-y-3">
            <h4 className="text-sm font-semibold text-content-muted">รายละเอียดรายวัน</h4>
            {details.length === 0 ? (
              <p className="text-sm text-gray-400">ไม่มีข้อมูล</p>
            ) : (
              <div className="space-y-2">
                {details.map(d => (
                  <div key={d.id} className="bg-card rounded-lg p-3 border border-border-light">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-content">
                        {format(new Date(d.date), 'd MMM yyyy', { locale: th })}
                      </span>
                      <span className="text-success font-semibold">{parseFloat(d.hours_worked || 0).toFixed(1)} ชม.</span>
                    </div>
                    <p className="text-xs text-content-muted mt-1">
                      {format(new Date(d.check_in), 'HH:mm', { locale: th })} – {d.check_out ? format(new Date(d.check_out), 'HH:mm', { locale: th }) : '-'}
                    </p>
                    {d.daily_logs?.[0]?.log_text && (
                      <p className="text-xs text-content-muted mt-1.5 bg-background rounded p-2 italic">
                        "{d.daily_logs[0].log_text}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {showActions && (
              <div className="pt-2 space-y-3">
                {rejectId === approval.id ? (
                  <div className="space-y-2">
                    <textarea
                      className="textarea h-20 text-sm"
                      placeholder="กรุณาระบุเหตุผลที่ปฏิเสธ..."
                      value={rejectNote}
                      onChange={e => setRejectNote(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(approval.id, approval.student_id)}
                        disabled={processing === approval.id}
                        className="btn-danger btn-sm flex-1"
                      >
                        {processing === approval.id ? 'กำลังดำเนินการ...' : 'ยืนยันการปฏิเสธ'}
                      </button>
                      <button onClick={() => { setRejectId(null); setRejectNote('') }} className="btn-secondary btn-sm">
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(approval.id, approval.student_id)}
                      disabled={processing === approval.id}
                      className="btn-success btn-sm flex-1"
                    >
                      <Check size={16} /> อนุมัติ
                    </button>
                    <button
                      onClick={() => setRejectId(approval.id)}
                      className="btn-danger btn-sm flex-1"
                    >
                      <X size={16} /> ปฏิเสธ
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-content">อนุมัติชั่วโมงทำงาน</h1>
        <p className="text-sm text-content-muted mt-0.5">ตรวจสอบและอนุมัติคำขอชั่วโมงทำงานของนักศึกษา</p>
      </div>

      {/* Pending */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-semibold text-content">รอการอนุมัติ</h2>
          {pending.length > 0 && (
            <span className="badge badge-warning">{pending.length}</span>
          )}
        </div>
        {loading ? (
          <div className="space-y-3">{[1,2].map(i=><SkeletonCard key={i}/>)}</div>
        ) : pending.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            <CheckSquare size={40} className="mx-auto mb-3 opacity-30" />
            <p>ไม่มีคำขอรอการอนุมัติ</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(a => <ApprovalCard key={a.id} approval={a} showActions />)}
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="font-semibold text-content mb-4">ประวัติการอนุมัติ</h2>
          <div className="space-y-3">
            {history.map(a => <ApprovalCard key={a.id} approval={a} showActions={false} />)}
          </div>
        </div>
      )}
    </div>
  )
}
