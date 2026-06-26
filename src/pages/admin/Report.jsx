import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { BarChart3, Search, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { SkeletonTable } from '../../components/ui/Skeleton'

import * as XLSX from 'xlsx'

function downloadExcel(rows, filename) {
  const header = ['ชื่อ-นามสกุล', 'ชั่วโมงสะสม', 'เป้าหมาย', '% ความสำเร็จ', 'สถานะ']
  const data = [header, ...rows]
  
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')
  
  XLSX.writeFile(workbook, filename)
}

export default function AdminReport() {
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
      .select('id, full_name, target_hours')
      .eq('role', 'student')
      .eq('is_active', true)
      .then(({ data }) => setStudents(data || []))
  }, [])

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setFetched(false)

    const targets = selectedStudent
      ? students.filter(s => s.id === selectedStudent)
      : students

    const results = []
    for (const s of targets) {
      let q = supabase
        .from('attendance')
        .select('hours_worked')
        .eq('user_id', s.id)
        .not('check_out', 'is', null)

      if (dateFrom) q = q.gte('date', dateFrom)
      if (dateTo)   q = q.lte('date', dateTo)

      const { data: att } = await q
      const total = (att || []).reduce((sum, r) => sum + parseFloat(r.hours_worked || 0), 0)
      const pct = Math.min(100, (total / (s.target_hours || 1596)) * 100)

      results.push({
        id: s.id,
        full_name: s.full_name,
        totalHours: total,
        targetHours: s.target_hours || 1596,
        pct,
        status: pct >= 100 ? 'ครบแล้ว' : pct >= 50 ? 'กำลังดำเนินการ' : 'ยังน้อย',
      })
    }

    results.sort((a, b) => b.totalHours - a.totalHours)
    setData(results)
    setLoading(false)
    setFetched(true)
  }, [selectedStudent, dateFrom, dateTo, students])

  const handleDownload = () => {
    if (data.length === 0) { toast.error('ไม่มีข้อมูลสำหรับดาวน์โหลด'); return }
    const rows = data.map(r => [
      r.full_name,
      r.totalHours.toFixed(2),
      r.targetHours,
      r.pct.toFixed(1) + '%',
      r.status,
    ])
    downloadExcel(rows, `รายงานระบบ_${format(new Date(), 'yyyyMMdd')}.xlsx`)
    toast.success('ดาวน์โหลด Excel แล้ว!')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-content">รายงานระบบ</h1>
        <p className="text-sm text-content-muted mt-0.5">ดูและดาวน์โหลดสรุปชั่วโมงของนักศึกษาทั้งหมด</p>
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
              <option value="">-- นักศึกษาทั้งหมด --</option>
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
          <button id="admin-fetch-report" onClick={fetchReport} disabled={loading} className="btn-primary btn-sm">
            {loading ? 'กำลังโหลด...' : <><Search size={14}/> ดูรายงาน</>}
          </button>
          {data.length > 0 && (
            <button id="admin-download-excel" onClick={handleDownload} className="btn-secondary btn-sm">
              <Download size={14} /> ดาวน์โหลดทั้งหมด (Excel)
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : fetched ? (
        data.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
            <p>ไม่พบข้อมูลในช่วงเวลาที่เลือก</p>
          </div>
        ) : (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-content-muted">
                รายงานนักศึกษา <span className="font-semibold text-content">{data.length}</span> คน
              </p>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>ชื่อ-นามสกุล</th>
                    <th>ชั่วโมงสะสม</th>
                    <th>เป้าหมาย</th>
                    <th>ความคืบหน้า</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(r => (
                    <tr key={r.id}>
                      <td className="font-medium text-content">{r.full_name}</td>
                      <td>
                        <span className="font-semibold text-primary-700">{r.totalHours.toFixed(1)}</span>
                        <span className="text-xs text-gray-400"> ชม.</span>
                      </td>
                      <td className="text-content-muted">{r.targetHours} ชม.</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-surface-hover rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${r.pct >= 100 ? 'bg-success' : r.pct >= 50 ? 'bg-primary-500' : 'bg-warning'}`}
                              style={{ width: `${r.pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-content-muted font-medium">{r.pct.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          r.pct >= 100 ? 'badge-success' :
                          r.pct >= 50 ? 'badge-info' : 'badge-warning'
                        }`}>
                          {r.status}
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
