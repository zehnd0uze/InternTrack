import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  ArrowLeft, Calendar, Clock, Building2,
  Briefcase, MapPin, User, Target, UserCog,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { SkeletonTable, SkeletonCard } from '../../components/ui/Skeleton'
import StudentEditPanel from '../../components/StudentEditPanel'

const TABS = [
  { id: 'info',       label: 'ข้อมูลการฝึกงาน',     icon: Calendar },
  { id: 'edit',       label: 'แก้ไขข้อมูลนักศึกษา', icon: UserCog },
]

export default function MentorStudentDetail() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [placement, setPlacement] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [activeTab, setActiveTab] = useState('info')
  const ROWS = 15

  const fetchData = useCallback(async () => {
    setLoading(true)

    let attQuery = supabase
      .from('attendance')
      .select(`
        *,
        daily_logs ( log_text, mood )
      `, { count: 'exact' })
      .eq('user_id', studentId)
      .order('date', { ascending: false })
      .range((page - 1) * ROWS, page * ROWS - 1)

    if (dateFrom) attQuery = attQuery.gte('date', dateFrom)
    if (dateTo)   attQuery = attQuery.lte('date', dateTo)

    const [profileRes, placementRes, attRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', studentId).single(),
      supabase
        .from('internship_placements')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle(),
      attQuery,
    ])

    setStudent(profileRes.data)
    setPlacement(placementRes.data)
    setAttendance(attRes.data || [])
    setTotal(attRes.count || 0)
    setLoading(false)
  }, [studentId, page, dateFrom, dateTo])

  useEffect(() => { fetchData() }, [fetchData])

  const formatTime = dt => dt ? format(new Date(dt), 'HH:mm', { locale: th }) : '-'
  const formatDate = dt => dt ? format(new Date(dt), 'd MMM yyyy', { locale: th }) : '-'

  const totalHours = attendance.reduce((s, r) => s + parseFloat(r.hours_worked || 0), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/mentor')} className="btn-ghost btn-sm p-2">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-content">{student?.full_name || 'กำลังโหลด...'}</h1>
          <p className="text-sm text-gray-400">{student?.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1 -mb-px">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-primary-700 text-primary-700'
                  : 'border-transparent text-content-muted hover:text-content hover:border-gray-300'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Internship Placement Card */}
      {activeTab === 'info' && !loading && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} className="text-primary-700" />
            <h2 className="font-semibold text-content">ข้อมูลการฝึกงาน</h2>
            {placement && (
              <span className={`ml-auto badge ${placement.status === 'active' ? 'badge-success' : 'badge-gray'}`}>
                {placement.status === 'active' ? 'กำลังฝึกงาน' : 'เสร็จสิ้น'}
              </span>
            )}
          </div>
          {!placement ? (
            <p className="text-sm text-gray-400 italic">ยังไม่มีข้อมูลการฝึกงาน</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <Building2 size={15} className="text-primary-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">บริษัท</p>
                  <p className="text-sm font-semibold text-content mt-0.5">{placement.company_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Briefcase size={15} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">ตำแหน่ง</p>
                  <p className="text-sm font-semibold text-content mt-0.5">{placement.position}</p>
                </div>
              </div>
              {placement.department && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <MapPin size={15} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">แผนก</p>
                    <p className="text-sm font-semibold text-content mt-0.5">{placement.department}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <Calendar size={15} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">วันที่เริ่ม</p>
                  <p className="text-sm font-semibold text-content mt-0.5">{formatDate(placement.start_date)}</p>
                </div>
              </div>
              {placement.end_date && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <Calendar size={15} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">วันที่สิ้นสุด</p>
                    <p className="text-sm font-semibold text-content mt-0.5">{formatDate(placement.end_date)}</p>
                  </div>
                </div>
              )}
              {placement.notes && (
                <div className="sm:col-span-2 lg:col-span-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                    <User size={15} className="text-content-muted" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">หมายเหตุ</p>
                    <p className="text-sm text-content-muted mt-0.5">{placement.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      {!loading && student && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card border-l-4 border-primary-500">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-primary-500" />
              <span className="stat-label">ชั่วโมงสะสม (หน้านี้)</span>
            </div>
            <span className="stat-value">
              {totalHours.toFixed(1)} <span className="text-sm text-gray-400">/ {student.target_hours} ชม.</span>
            </span>
          </div>
          <div className="stat-card border-l-4 border-success">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-success" />
              <span className="stat-label">จำนวนวันทำงาน</span>
            </div>
            <span className="stat-value">{total} <span className="text-sm text-gray-400">วัน</span></span>
          </div>
          <div className="stat-card border-l-4 border-warning">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-warning" />
              <span className="stat-label">ความคืบหน้า</span>
            </div>
            <span className="stat-value">
              {Math.min(100, (totalHours / student.target_hours * 100)).toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* Edit Tab */}
      {activeTab === 'edit' && (
        <div className="card">
          <StudentEditPanel studentId={studentId} onSaved={fetchData} />
        </div>
      )}

      {/* Attendance History */}
      {activeTab === 'info' && (
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="font-semibold text-content flex items-center gap-2">
              <Calendar size={18} className="text-primary-700" />
              ประวัติการเข้างาน
            </h2>
            <div className="flex flex-wrap gap-2">
              <div>
                <label className="text-xs text-content-muted block mb-1">ตั้งแต่</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); setPage(1) }}
                  className="input text-xs py-1.5 w-36"
                />
              </div>
              <div>
                <label className="text-xs text-content-muted block mb-1">ถึง</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => { setDateTo(e.target.value); setPage(1) }}
                  className="input text-xs py-1.5 w-36"
                />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo(''); setPage(1) }}
                  className="btn-ghost btn-sm self-end"
                >
                  ล้าง
                </button>
              )}
            </div>
          </div>

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
                      <th>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map(r => (
                      <tr key={r.id}>
                        <td className="font-medium text-content">{formatDate(r.date)}</td>
                        <td>{formatTime(r.check_in)}</td>
                        <td>{formatTime(r.check_out)}</td>
                        <td>
                          {r.hours_worked
                            ? <span className="font-semibold text-success">{parseFloat(r.hours_worked).toFixed(1)}</span>
                            : <span className="text-gray-400">-</span>
                          }
                        </td>
                        <td className="max-w-xs">
                          {r.daily_logs?.[0]?.log_text ? (
                            <div className="flex items-center gap-1.5" title={r.daily_logs[0].log_text}>
                              {r.daily_logs[0].mood && (
                                <span className="text-lg leading-none shrink-0">
                                  {
                                    { great: '🤩', happy: '😊', neutral: '😐', stressed: '😫', bad: '😢' }[r.daily_logs[0].mood]
                                  }
                                </span>
                              )}
                              <p className="text-xs text-content-muted truncate max-w-[180px]">{r.daily_logs[0].log_text}</p>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">ไม่มีบันทึก</span>
                          )}
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
              <div className="flex items-center justify-between mt-4 text-sm">
                <span className="text-content-muted">
                  แสดง {Math.min((page - 1) * ROWS + 1, total)}–{Math.min(page * ROWS, total)} จาก {total} รายการ
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary btn-sm disabled:opacity-40"
                  >
                    ก่อนหน้า
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * ROWS >= total}
                    className="btn-secondary btn-sm disabled:opacity-40"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
