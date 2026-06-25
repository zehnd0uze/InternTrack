import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  Building2, Briefcase, MapPin, Calendar,
  CheckCircle2, Clock3, Eye, Search,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { SkeletonTable } from '../../components/ui/Skeleton'

export default function MentorInternships() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [placements, setPlacements] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('internship_placements')
      .select('*, student:student_id(id, full_name, email, target_hours)')
      .eq('mentor_id', user.id)
      .order('created_at', { ascending: false })

    if (!error) setPlacements(data || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = placements.filter(p => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    const matchSearch =
      p.student?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.position?.toLowerCase().includes(search.toLowerCase()) ||
      p.department?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const formatDate = dt => dt ? format(new Date(dt), 'd MMM yyyy', { locale: th }) : '-'

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-gray-900">ข้อมูลการฝึกงาน</h1>
        <p className="text-sm text-gray-500 mt-0.5">รายละเอียดการฝึกงานของนักศึกษาทั้งหมดในความดูแล</p>
      </div>

      {/* Summary badges */}
      {!loading && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-100">
            <CheckCircle2 size={15} className="text-success" />
            <span className="text-sm font-medium text-green-700">
              กำลังฝึกงาน: {placements.filter(p => p.status === 'active').length} คน
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
            <Clock3 size={15} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-600">
              เสร็จสิ้น: {placements.filter(p => p.status === 'completed').length} คน
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, บริษัท, ตำแหน่ง..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 text-sm w-full"
            />
          </div>
          {/* Status filter */}
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'ทั้งหมด' },
              { value: 'active', label: 'กำลังฝึกงาน' },
              { value: 'completed', label: 'เสร็จสิ้น' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`btn-sm px-3 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === opt.value
                    ? 'bg-primary-700 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <SkeletonTable rows={5} cols={7} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Building2 size={40} className="mx-auto mb-3 opacity-30" />
            <p>{search || statusFilter !== 'all' ? 'ไม่พบข้อมูลที่ตรงกัน' : 'ยังไม่มีข้อมูลการฝึกงาน'}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>นักศึกษา</th>
                  <th>บริษัท</th>
                  <th>แผนก</th>
                  <th>ตำแหน่ง</th>
                  <th>วันที่เริ่ม</th>
                  <th>วันที่สิ้นสุด</th>
                  <th>สถานะ</th>
                  <th>การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs flex-shrink-0">
                          {p.student?.full_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 whitespace-nowrap">{p.student?.full_name}</p>
                          <p className="text-xs text-gray-400">{p.student?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Building2 size={13} className="text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-800 whitespace-nowrap">{p.company_name}</span>
                      </div>
                    </td>
                    <td>
                      {p.department ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700">{p.department}</span>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">-</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Briefcase size={13} className="text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700">{p.position}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-gray-700">
                        <Calendar size={13} className="text-gray-400 flex-shrink-0" />
                        {formatDate(p.start_date)}
                      </div>
                    </td>
                    <td>
                      {p.end_date ? (
                        <div className="flex items-center gap-1 text-gray-700">
                          <Calendar size={13} className="text-gray-400 flex-shrink-0" />
                          {formatDate(p.end_date)}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">ไม่กำหนด</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${p.status === 'active' ? 'badge-success' : 'badge-gray'}`}>
                        {p.status === 'active' ? 'กำลังฝึกงาน' : 'เสร็จสิ้น'}
                      </span>
                    </td>
                    <td>
                      <button
                        id={`view-intern-detail-${p.student_id}`}
                        onClick={() => navigate(`/mentor/students/${p.student_id}`)}
                        className="btn-secondary btn-sm"
                      >
                        <Eye size={14} /> ดูรายละเอียด
                      </button>
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
