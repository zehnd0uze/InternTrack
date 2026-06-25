import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  Building2, Briefcase, MapPin, Calendar,
  CheckCircle2, Clock3, Eye, Search, Plus, X,
  Loader2, Pencil, Trash2, AlertTriangle, CheckSquare,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import ConfirmModal from '../../components/ui/ConfirmModal'
import { useAuth } from '../../contexts/AuthContext'
import { SkeletonTable } from '../../components/ui/Skeleton'

// ---- Shared Form Fields used by both Add & Edit modals ----
function PlacementFormFields({
  companyName, setCompanyName,
  department, setDepartment,
  position, setPosition,
  startDate, setStartDate,
  endDate, setEndDate,
  status, setStatus,
  notes, setNotes,
}) {
  return (
    <>
      {/* Company Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          ชื่อบริษัท / สถานประกอบการ <span className="text-danger">*</span>
        </label>
        <div className="relative">
          <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            placeholder="เช่น บริษัท ABC จำกัด"
            className="input pl-9"
            required
          />
        </div>
      </div>

      {/* Department + Position */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">แผนก</label>
          <div className="relative">
            <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder="เช่น IT, HR"
              className="input pl-9"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            ตำแหน่งงาน <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={position}
              onChange={e => setPosition(e.target.value)}
              placeholder="เช่น Developer"
              className="input pl-9"
              required
            />
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            วันที่เริ่มฝึกงาน <span className="text-danger">*</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="input"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">วันที่สิ้นสุด</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="input"
            min={startDate}
          />
        </div>
      </div>

      {/* Status */}
      {setStatus && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">สถานะ</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="select"
          >
            <option value="active">กำลังฝึกงาน</option>
            <option value="completed">เสร็จสิ้น</option>
          </select>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">หมายเหตุ</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="ข้อมูลเพิ่มเติม (ถ้ามี)"
          className="textarea h-20"
          maxLength={300}
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{notes.length}/300</p>
      </div>
    </>
  )
}

// ---- Add Intern Modal ----
function AddInternModal({ onClose, onSuccess, mentorId }) {
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(true)
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [companyName, setCompanyName] = useState('')
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchStudents = async () => {
      setStudentsLoading(true)
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'student')
        .eq('is_active', true)
        .order('full_name')
      setStudents(data || [])
      setStudentsLoading(false)
    }
    fetchStudents()
  }, [])

  const filteredStudents = students.filter(s =>
    s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(studentSearch.toLowerCase())
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedStudent) { toast.error('กรุณาเลือกนักศึกษา'); return }
    if (!companyName.trim()) { toast.error('กรุณากรอกชื่อบริษัท'); return }
    if (!position.trim()) { toast.error('กรุณากรอกตำแหน่งงาน'); return }
    if (!startDate) { toast.error('กรุณาเลือกวันที่เริ่มฝึกงาน'); return }

    setSaving(true)
    const { error } = await supabase.from('internship_placements').upsert({
      student_id: selectedStudent.id,
      mentor_id: mentorId,
      company_name: companyName.trim(),
      department: department.trim() || null,
      position: position.trim(),
      start_date: startDate,
      end_date: endDate || null,
      notes: notes.trim() || null,
      status: 'active',
    }, { onConflict: 'student_id' })

    setSaving(false)
    if (error) {
      toast.error('บันทึกข้อมูลล้มเหลว: ' + (error.message || ''))
    } else {
      toast.success(`เพิ่ม ${selectedStudent.full_name} สำเร็จ ✅`)
      onSuccess()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Plus size={18} className="text-primary-700" />
            <h2 className="font-semibold text-gray-900">เพิ่มนักศึกษาฝึกงาน</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Student Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              นักศึกษา <span className="text-danger">*</span>
            </label>
            {selectedStudent ? (
              <div className="flex items-center gap-3 p-3 bg-primary-50 border border-primary-200 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                  {selectedStudent.full_name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{selectedStudent.full_name}</p>
                  <p className="text-xs text-gray-500">{selectedStudent.email}</p>
                </div>
                <button type="button" onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-danger p-1">
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อหรืออีเมลนักศึกษา..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border-0 outline-none focus:ring-0"
                    autoFocus
                  />
                </div>
                <div className="border-t border-gray-100 max-h-44 overflow-y-auto">
                  {studentsLoading ? (
                    <div className="flex items-center justify-center py-6 text-gray-400">
                      <Loader2 size={18} className="animate-spin mr-2" /> กำลังโหลด...
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="py-6 text-center text-sm text-gray-400">
                      {studentSearch ? 'ไม่พบนักศึกษา' : 'ไม่มีนักศึกษาในระบบ'}
                    </div>
                  ) : (
                    filteredStudents.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => { setSelectedStudent(s); setStudentSearch('') }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary-50 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs flex-shrink-0">
                          {s.full_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{s.full_name}</p>
                          <p className="text-xs text-gray-400">{s.email}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <PlacementFormFields
            companyName={companyName} setCompanyName={setCompanyName}
            department={department} setDepartment={setDepartment}
            position={position} setPosition={setPosition}
            startDate={startDate} setStartDate={setStartDate}
            endDate={endDate} setEndDate={setEndDate}
            notes={notes} setNotes={setNotes}
          />

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} id="add-intern-submit" className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? <><Loader2 size={15} className="animate-spin" /> กำลังบันทึก...</> : <><Plus size={15} /> เพิ่มนักศึกษา</>}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary px-5">ยกเลิก</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---- Edit Placement Modal ----
function EditPlacementModal({ placement, onClose, onSuccess, onDelete }) {
  const [companyName, setCompanyName] = useState(placement.company_name || '')
  const [department, setDepartment] = useState(placement.department || '')
  const [position, setPosition] = useState(placement.position || '')
  const [startDate, setStartDate] = useState(placement.start_date || '')
  const [endDate, setEndDate] = useState(placement.end_date || '')
  const [status, setStatus] = useState(placement.status || 'active')
  const [notes, setNotes] = useState(placement.notes || '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!companyName.trim()) { toast.error('กรุณากรอกชื่อบริษัท'); return }
    if (!position.trim()) { toast.error('กรุณากรอกตำแหน่งงาน'); return }
    if (!startDate) { toast.error('กรุณาเลือกวันที่เริ่มฝึกงาน'); return }

    setSaving(true)
    const { error } = await supabase
      .from('internship_placements')
      .update({
        company_name: companyName.trim(),
        department: department.trim() || null,
        position: position.trim(),
        start_date: startDate,
        end_date: endDate || null,
        status,
        notes: notes.trim() || null,
      })
      .eq('id', placement.id)

    setSaving(false)
    if (error) {
      toast.error('บันทึกข้อมูลล้มเหลว: ' + (error.message || ''))
    } else {
      toast.success('อัปเดตข้อมูลการฝึกงานสำเร็จ ✅')
      onSuccess()
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await supabase
      .from('internship_placements')
      .delete()
      .eq('id', placement.id)
    setDeleting(false)
    if (error) {
      toast.error('ลบข้อมูลล้มเหลว')
    } else {
      toast.success('ลบข้อมูลการฝึกงานแล้ว')
      onDelete()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Pencil size={16} className="text-primary-700" />
            <h2 className="font-semibold text-gray-900">แก้ไขข้อมูลการฝึกงาน</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Student info banner (read-only) */}
        <div className="mx-6 mt-5 flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
            {placement.student?.full_name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{placement.student?.full_name}</p>
            <p className="text-xs text-gray-400">{placement.student?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <PlacementFormFields
            companyName={companyName} setCompanyName={setCompanyName}
            department={department} setDepartment={setDepartment}
            position={position} setPosition={setPosition}
            startDate={startDate} setStartDate={setStartDate}
            endDate={endDate} setEndDate={setEndDate}
            status={status} setStatus={setStatus}
            notes={notes} setNotes={setNotes}
          />

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} id="edit-placement-save" className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? <><Loader2 size={15} className="animate-spin" /> กำลังบันทึก...</> : <><Pencil size={15} /> บันทึกการแก้ไข</>}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary px-5">ยกเลิก</button>
          </div>

          {/* Delete section */}
          <div className="border-t border-gray-100 pt-4">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full flex items-center justify-center gap-2 text-sm text-danger hover:bg-red-50 py-2 rounded-lg transition-colors"
              >
                <Trash2 size={15} /> ลบข้อมูลการฝึกงานนี้
              </button>
            ) : (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2 text-sm text-red-700">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <p>ยืนยันการลบ? ข้อมูลการฝึกงานของ <span className="font-semibold">{placement.student?.full_name}</span> จะถูกลบถาวร</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="btn-danger btn-sm flex-1 flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {deleting ? <><Loader2 size={13} className="animate-spin" /> กำลังลบ...</> : <><Trash2 size={13} /> ยืนยันลบ</>}
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="btn-secondary btn-sm">ยกเลิก</button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

// ---- Main Page ----
export default function MentorInternships() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [placements, setPlacements] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingPlacement, setEditingPlacement] = useState(null)
  const [completeTarget, setCompleteTarget] = useState(null) // placement to mark complete
  const [completing, setCompleting] = useState(false)

  const handleMarkComplete = async () => {
    if (!completeTarget) return
    setCompleting(true)
    const { error } = await supabase
      .from('internship_placements')
      .update({ status: 'completed', end_date: new Date().toISOString().split('T')[0] })
      .eq('id', completeTarget.id)
    setCompleting(false)
    if (error) {
      toast.error('ไม่สามารถอัปเดตสถานะได้')
    } else {
      toast.success(`${completeTarget.student?.full_name} เสร็จสิ้นการฝึกงานแล้ว ✅`)
      setCompleteTarget(null)
      fetchData()
    }
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ข้อมูลการฝึกงาน</h1>
          <p className="text-sm text-gray-500 mt-0.5">รายละเอียดการฝึกงานของนักศึกษาทั้งหมดในความดูแล</p>
        </div>
        <button
          id="add-intern-btn"
          onClick={() => setShowAddModal(true)}
          className="btn-primary btn-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus size={15} /> เพิ่มนักศึกษาฝึกงาน
        </button>
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
          <SkeletonTable rows={5} cols={8} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <Building2 size={44} className="mx-auto mb-3 opacity-25" />
            <p className="font-medium">
              {search || statusFilter !== 'all' ? 'ไม่พบข้อมูลที่ตรงกัน' : 'ยังไม่มีนักศึกษาฝึกงาน'}
            </p>
            {!search && statusFilter === 'all' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary btn-sm mt-4 inline-flex items-center gap-2"
              >
                <Plus size={14} /> เพิ่มนักศึกษาฝึกงานคนแรก
              </button>
            )}
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
                      ) : <span className="text-gray-300 text-xs">-</span>}
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
                      ) : <span className="text-gray-300 text-xs">ไม่กำหนด</span>}
                    </td>
                    <td>
                      <span className={`badge ${p.status === 'active' ? 'badge-success' : 'badge-gray'}`}>
                        {p.status === 'active' ? 'กำลังฝึกงาน' : 'เสร็จสิ้น'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button
                          id={`view-intern-${p.student_id}`}
                          onClick={() => navigate(`/mentor/students/${p.student_id}`)}
                          className="btn-secondary btn-sm px-2"
                          title="ดูรายละเอียด"
                        >
                          <Eye size={14} />
                        </button>
                        {p.status === 'active' && (
                          <button
                            id={`complete-intern-${p.student_id}`}
                            onClick={() => setCompleteTarget(p)}
                            className="btn-sm px-2 py-1.5 bg-green-50 text-success border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                            title="เสร็จสิ้นการฝึกงาน"
                          >
                            <CheckSquare size={14} />
                          </button>
                        )}
                        <button
                          id={`edit-intern-${p.student_id}`}
                          onClick={() => setEditingPlacement(p)}
                          className="btn-sm px-2 py-1.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                          title="แก้ไข"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          id={`delete-intern-${p.student_id}`}
                          onClick={() => setEditingPlacement(p)}
                          className="btn-sm px-2 py-1.5 bg-red-50 text-danger border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                          title="ลบ"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Intern Modal */}
      {showAddModal && (
        <AddInternModal
          mentorId={user.id}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchData() }}
        />
      )}

      {/* Edit Placement Modal */}
      {editingPlacement && (
        <EditPlacementModal
          placement={editingPlacement}
          onClose={() => setEditingPlacement(null)}
          onSuccess={() => { setEditingPlacement(null); fetchData() }}
          onDelete={() => { setEditingPlacement(null); fetchData() }}
        />
      )}

      {/* Complete Internship Confirm Modal */}
      {completeTarget && (
        <ConfirmModal
          title="ยืนยันเสร็จสิ้นการฝึกงาน"
          message={`คุณต้องการบันทึกว่า "${completeTarget.student?.full_name}" เสร็จสิ้นการฝึกงานแล้วใช่หรือไม่? ระบบจะบันทึกวันที่สิ้นสุดเป็นวันนี้และเปลี่ยนสถานะเป็น "เสร็จสิ้น"`}
          confirmLabel={completing ? 'กำลังบันทึก...' : 'ยืนยัน เสร็จสิ้น'}
          cancelLabel="ยกเลิก"
          onConfirm={handleMarkComplete}
          onCancel={() => setCompleteTarget(null)}
        />
      )}
    </div>
  )
}
