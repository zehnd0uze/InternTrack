import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { ArrowLeft, Calendar, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { SkeletonTable, SkeletonCard } from '../../components/ui/Skeleton'

export default function SupervisorStudentDetail() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const ROWS = 15

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [profileRes, attRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', studentId).single(),
      supabase
        .from('attendance')
        .select('*, daily_logs(log_text)', { count: 'exact' })
        .eq('user_id', studentId)
        .order('date', { ascending: false })
        .range((page - 1) * ROWS, page * ROWS - 1),
    ])
    setStudent(profileRes.data)
    setAttendance(attRes.data || [])
    setTotal(attRes.count || 0)
    setLoading(false)
  }, [studentId, page])

  useEffect(() => { fetchData() }, [fetchData])

  const formatTime = dt => dt ? format(new Date(dt), 'HH:mm', { locale: th }) : '-'
  const formatDate = dt => dt ? format(new Date(dt), 'd MMM yyyy', { locale: th }) : '-'

  const totalHours = attendance.reduce((s, r) => s + parseFloat(r.hours_worked || 0), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/supervisor')} className="btn-ghost btn-sm p-2">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{student?.full_name || 'กำลังโหลด...'}</h1>
          <p className="text-sm text-gray-400">{student?.email}</p>
        </div>
      </div>

      {!loading && student && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card border-l-4 border-primary-500">
            <span className="stat-label">ชั่วโมงสะสม</span>
            <span className="stat-value">{totalHours.toFixed(1)} <span className="text-sm text-gray-400">/ {student.target_hours} ชม.</span></span>
          </div>
          <div className="stat-card border-l-4 border-success">
            <span className="stat-label">จำนวนวันทำงาน</span>
            <span className="stat-value">{total} <span className="text-sm text-gray-400">วัน</span></span>
          </div>
          <div className="stat-card border-l-4 border-warning">
            <span className="stat-label">ความคืบหน้า</span>
            <span className="stat-value">{Math.min(100, (totalHours / student.target_hours * 100)).toFixed(1)}%</span>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-primary-700" />
          ประวัติการเข้างาน
        </h2>
        {loading ? (
          <SkeletonTable rows={10} cols={5} />
        ) : attendance.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Calendar size={40} className="mx-auto mb-3 opacity-30" />
            <p>ยังไม่มีข้อมูลการเข้างาน</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>วันที่</th>
                    <th>เวลาเข้า</th>
                    <th>เวลาออก</th>
                    <th>ชั่วโมง</th>
                    <th>บันทึกประจำวัน</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map(r => (
                    <tr key={r.id}>
                      <td className="font-medium text-gray-900">{formatDate(r.date)}</td>
                      <td>{formatTime(r.check_in)}</td>
                      <td>{formatTime(r.check_out)}</td>
                      <td>
                        {r.hours_worked
                          ? <span className="font-semibold text-success">{parseFloat(r.hours_worked).toFixed(1)}</span>
                          : <span className="text-gray-400">-</span>
                        }
                      </td>
                      <td className="max-w-xs">
                        {r.daily_logs?.[0]?.log_text
                          ? <p className="text-xs text-gray-600 truncate">{r.daily_logs[0].log_text}</p>
                          : <span className="text-gray-300 text-xs">ไม่มีบันทึก</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-gray-500">แสดง {Math.min((page-1)*ROWS+1, total)}–{Math.min(page*ROWS,total)} จาก {total} รายการ</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1} className="btn-secondary btn-sm disabled:opacity-40">ก่อนหน้า</button>
                <button onClick={() => setPage(p=>p+1)} disabled={page*ROWS>=total} className="btn-secondary btn-sm disabled:opacity-40">ถัดไป</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
