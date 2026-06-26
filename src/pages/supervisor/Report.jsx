import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { FileText, Download, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { SkeletonTable } from '../../components/ui/Skeleton'

import * as XLSX from 'xlsx'

function downloadExcel(rows, filename, titleText) {
  const header = ['วันที่', 'เวลาเข้า', 'เวลาออก', 'ชั่วโมง', 'บันทึกประจำวัน', 'สถานะ']
  
  let data = []
  if (titleText) {
    data.push([titleText], [])
  }
  data.push(header, ...rows)
  
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')
  
  XLSX.writeFile(workbook, filename)
}

export default function SupervisorReport() {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    supabase
      .from('users')
      .select('id, full_name')
      .eq('supervisor_id', user.id)
      .eq('role', 'student')
      .then(({ data }) => setStudents(data || []))
  }, [user.id])

  const fetchReport = useCallback(async () => {
    if (!selectedStudent) { toast.error('กรุณาเลือกนักศึกษา'); return }
    setLoading(true)
    setFetched(false)

    let q = supabase
      .from('attendance')
      .select('*, daily_logs(log_text), weekly_approvals!left(status)')
      .eq('user_id', selectedStudent)
      .order('date', { ascending: false })

    if (dateFrom) q = q.gte('date', dateFrom)
    if (dateTo)   q = q.lte('date', dateTo)

    // Fallback: simpler query
    let q2 = supabase
      .from('attendance')
      .select('*, daily_logs(log_text)')
      .eq('user_id', selectedStudent)
      .order('date', { ascending: false })

    if (dateFrom) q2 = q2.gte('date', dateFrom)
    if (dateTo)   q2 = q2.lte('date', dateTo)

    const { data: rows, error } = await q2
    setLoading(false)
    setFetched(true)
    if (error) { toast.error('โหลดรายงานล้มเหลว'); return }
    setData(rows || [])
  }, [selectedStudent, dateFrom, dateTo])

  const handleDownload = () => {
    if (data.length === 0) { toast.error('ไม่มีข้อมูลสำหรับดาวน์โหลด'); return }
    const student = students.find(s => s.id === selectedStudent)
    const rows = data.map(r => [
      r.date,
      r.check_in ? format(new Date(r.check_in), 'HH:mm') : '-',
      r.check_out ? format(new Date(r.check_out), 'HH:mm') : '-',
      parseFloat(r.hours_worked || 0).toFixed(2),
      r.daily_logs?.[0]?.log_text || '',
      r.check_out ? 'เสร็จสิ้น' : 'ยังไม่เสร็จ',
    ])
    const title = `รายงานการเข้างาน: ${student?.full_name || 'ทั้งหมด'}`
    downloadExcel(rows, `รายงาน_${student?.full_name}_${format(new Date(), 'yyyyMMdd')}.xlsx`, title)
    toast.success('ดาวน์โหลด Excel แล้ว!')
  }

  const formatTime = dt => dt ? format(new Date(dt), 'HH:mm', { locale: th }) : '-'
  const formatDateThai = dt => dt ? format(new Date(dt), 'd MMM yyyy', { locale: th }) : '-'

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-content">รายงานการเข้างาน</h1>
        <p className="text-sm text-content-muted mt-0.5">ดูและดาวน์โหลดข้อมูลการเข้างานของนักศึกษา</p>
      </div>

      {/* Filters */}
      <div className="card">
        <h2 className="font-semibold text-content mb-4 flex items-center gap-2">
          <Search size={18} className="text-primary-700" /> ตัวกรองรายงาน
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="label">นักศึกษา</label>
            <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="select">
              <option value="">-- เลือกนักศึกษา --</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">ตั้งแต่</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">ถึง</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input" />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button id="fetch-report-btn" onClick={fetchReport} disabled={loading} className="btn-primary btn-sm">
            {loading ? 'กำลังโหลด...' : <><Search size={14}/> ดูรายงาน</>}
          </button>
          {data.length > 0 && (
            <button id="download-excel-btn" onClick={handleDownload} className="btn-secondary btn-sm">
              <Download size={14} /> ดาวน์โหลด Excel
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : fetched ? (
        data.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p>ไม่พบข้อมูลในช่วงเวลาที่เลือก</p>
          </div>
        ) : (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-content-muted">
                พบ <span className="font-semibold text-content">{data.length}</span> รายการ
              </p>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>วันที่</th>
                    <th>เวลาเข้า</th>
                    <th>เวลาออก</th>
                    <th>ชั่วโมง</th>
                    <th>บันทึกประจำวัน</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(r => (
                    <tr key={r.id}>
                      <td className="font-medium text-content">{formatDateThai(r.date)}</td>
                      <td>{formatTime(r.check_in)}</td>
                      <td>{formatTime(r.check_out)}</td>
                      <td>
                        {r.hours_worked
                          ? <span className="font-semibold text-success">{parseFloat(r.hours_worked).toFixed(1)}</span>
                          : '-'}
                      </td>
                      <td className="max-w-xs">
                        {r.daily_logs?.[0]?.log_text
                          ? <p className="text-xs text-content-muted truncate max-w-[200px]">{r.daily_logs[0].log_text}</p>
                          : <span className="text-gray-300 text-xs">ไม่มีบันทึก</span>}
                      </td>
                      <td>
                        <span className={`badge ${r.check_out ? 'badge-success' : 'badge-warning'}`}>
                          {r.check_out ? 'เสร็จสิ้น' : 'กำลังทำงาน'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : null}
    </div>
  )
}
