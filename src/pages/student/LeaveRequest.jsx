import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { Calendar, FileText, Send, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { SkeletonTable } from '../../components/ui/Skeleton'

const STATUS_BADGE = {
  pending:  <span className="badge badge-warning">รอการอนุมัติ</span>,
  approved: <span className="badge badge-success">อนุมัติแล้ว</span>,
  rejected: <span className="badge badge-danger">ถูกปฏิเสธ</span>,
}

const TYPE_LABEL = {
  sick: 'ลาป่วย',
  personal: 'ลากิจ',
}

export default function StudentLeaveRequest() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    leave_type: 'sick',
    start_date: '',
    end_date: '',
    reason: ''
  })

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    setRequests(data || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.start_date || !form.end_date || !form.reason) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }

    if (new Date(form.end_date) < new Date(form.start_date)) {
      toast.error('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น')
      return
    }

    setSubmitting(true)

    // Get supervisor
    const { data: profile } = await supabase
      .from('users')
      .select('supervisor_id, full_name')
      .eq('id', user.id)
      .single()

    let supervisorId = profile?.supervisor_id

    if (!supervisorId) {
      const { data: placement } = await supabase
        .from('internship_placements')
        .select('mentor_id')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .maybeSingle()
      if (placement?.mentor_id) {
        supervisorId = placement.mentor_id
      }
    }

    const { error } = await supabase.from('leave_requests').insert({
      user_id: user.id,
      supervisor_id: supervisorId,
      leave_type: form.leave_type,
      start_date: form.start_date,
      end_date: form.end_date,
      reason: form.reason.trim(),
      status: 'pending'
    })

    if (!error && supervisorId) {
      // Notify supervisor
      await supabase.from('notifications').insert({
        user_id: supervisorId,
        message: `มีคำขอ${TYPE_LABEL[form.leave_type]}ใหม่ จาก ${profile?.full_name || 'นักศึกษา'}`,
        type: 'leave_request',
      })
    }

    setSubmitting(false)
    if (error) {
      toast.error('ส่งคำขอล้มเหลว กรุณาลองใหม่')
      console.error(error)
    } else {
      toast.success('ส่งคำขอลาเรียบร้อยแล้ว ✅')
      setForm({ leave_type: 'sick', start_date: '', end_date: '', reason: '' })
      fetchRequests()
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-gray-900">แจ้งลา ป่วย/กิจ</h1>
        <p className="text-sm text-gray-500 mt-0.5">ส่งคำขอลาป่วยหรือลากิจเพื่อให้อาจารย์นิเทศพิจารณา</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ---- Request Form ---- */}
        <div className="card lg:col-span-1 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-primary-700" />
            <h2 className="font-semibold text-gray-900">ฟอร์มขอลา</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">ประเภทการลา</label>
              <select 
                className="input" 
                value={form.leave_type} 
                onChange={e => setForm({...form, leave_type: e.target.value})}
              >
                <option value="sick">ลาป่วย</option>
                <option value="personal">ลากิจ</option>
              </select>
            </div>
            
            <div>
              <label className="label">วันที่เริ่มต้น</label>
              <input 
                type="date" 
                className="input" 
                value={form.start_date}
                onChange={e => setForm({...form, start_date: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="label">วันที่สิ้นสุด</label>
              <input 
                type="date" 
                className="input" 
                value={form.end_date}
                onChange={e => setForm({...form, end_date: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="label">เหตุผลการลา</label>
              <textarea 
                className="textarea h-24"
                placeholder="ระบุเหตุผลที่ขอลา..."
                value={form.reason}
                onChange={e => setForm({...form, reason: e.target.value})}
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={submitting} 
              className="btn-primary w-full disabled:opacity-50"
            >
              {submitting ? 'กำลังส่ง...' : <><Send size={16} className="mr-2" /> ส่งคำขอลา</>}
            </button>
          </form>
        </div>

        {/* ---- Request History ---- */}
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-primary-700" />
            <h2 className="font-semibold text-gray-900">ประวัติการขอลา</h2>
          </div>

          {loading ? (
            <SkeletonTable rows={4} cols={4} />
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Calendar size={40} className="mx-auto mb-3 opacity-30" />
              <p>ยังไม่มีประวัติการขอลา</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>วันที่ยื่นคำขอ</th>
                    <th>ประเภท</th>
                    <th>ช่วงวันที่ลา</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req.id}>
                      <td className="text-sm text-gray-500">
                        {format(new Date(req.created_at), 'd MMM yyyy', { locale: th })}
                      </td>
                      <td className="font-medium">
                        {TYPE_LABEL[req.leave_type]}
                      </td>
                      <td className="text-sm">
                        {req.start_date === req.end_date 
                          ? format(new Date(req.start_date), 'd MMM yyyy', { locale: th })
                          : `${format(new Date(req.start_date), 'd MMM', { locale: th })} - ${format(new Date(req.end_date), 'd MMM yyyy', { locale: th })}`
                        }
                      </td>
                      <td>
                        {STATUS_BADGE[req.status]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
