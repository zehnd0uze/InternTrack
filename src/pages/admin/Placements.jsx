import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  Building2, Briefcase, MapPin, Calendar,
  CheckCircle2, Plus, X,
  Loader2, Pencil, Trash2,
  UserCircle, Search
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { SkeletonTable } from '../../components/ui/Skeleton'

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
      <div>
        <label className="block text-sm font-medium text-content-muted mb-1.5">
          ชื่อบริษัท / สถานประกอบการ <span className="text-danger">*</span>
        </label>
        <div className="relative">
          <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            className="input pl-9"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-content-muted mb-1.5">แผนก</label>
          <div className="relative">
            <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="input pl-9"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-content-muted mb-1.5">
            ตำแหน่งงาน <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={position}
              onChange={e => setPosition(e.target.value)}
              className="input pl-9"
              required
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-content-muted mb-1.5">
            วันที่เริ่ม <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="input pl-9"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-content-muted mb-1.5">วันที่สิ้นสุด</label>
          <div className="relative">
            <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              min={startDate}
              className="input pl-9"
            />
          </div>
        </div>
      </div>
      {setStatus && (
        <div>
          <label className="block text-sm font-medium text-content-muted mb-1.5">สถานะ</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="select">
            <option value="active">กำลังฝึกงาน</option>
            <option value="completed">เสร็จสิ้น</option>
          </select>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-content-muted mb-1.5">หมายเหตุ</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="textarea h-20"
          maxLength={300}
        />
      </div>
    </>
  )
}

function AddPlacementModal({ onClose, onSuccess }) {
  const [students, setStudents] = useState([])
  const [mentors, setMentors] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedMentor, setSelectedMentor] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const [stRes, mnRes] = await Promise.all([
        supabase.from('users').select('id, full_name, email').eq('role', 'student').eq('is_active', true).order('full_name'),
        supabase.from('users').select('id, full_name, email').eq('role', 'mentor').eq('is_active', true).order('full_name')
      ])
      setStudents(stRes.data || [])
      setMentors(mnRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedStudent || !selectedMentor) { toast.error('กรุณาเลือกนักศึกษาและพี่เลี้ยง'); return }
    if (!companyName.trim() || !position.trim() || !startDate) { toast.error('กรุณากรอกข้อมูลที่จำเป็น'); return }

    setSaving(true)
    const { error } = await supabase.from('internship_placements').upsert({
      student_id: selectedStudent,
      mentor_id: selectedMentor,
      company_name: companyName.trim(),
      department: department.trim() || null,
      position: position.trim(),
      start_date: startDate,
      end_date: endDate || null,
      notes: notes.trim() || null,
      status: 'active'
    }, { onConflict: 'student_id' })

    setSaving(false)
    if (error) {
      toast.error('บันทึกข้อมูลล้มเหลว: ' + error.message)
    } else {
      toast.success('เพิ่มข้อมูลสถานที่ฝึกงานเรียบร้อยแล้ว')
      onSuccess()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border-light flex items-center justify-between bg-surface-hover flex-shrink-0">
          <h2 className="text-lg font-bold text-content flex items-center gap-2">
            <Plus className="text-primary-600" size={20} /> เพิ่มสถานที่ฝึกงาน
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-content-muted hover:bg-surface-hover rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-primary-600" size={24} /></div>
          ) : (
            <form id="add-placement-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-content-muted mb-1.5">นักศึกษา <span className="text-danger">*</span></label>
                  <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="select" required>
                    <option value="">-- เลือกนักศึกษา --</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-content-muted mb-1.5">พี่เลี้ยง <span className="text-danger">*</span></label>
                  <select value={selectedMentor} onChange={e => setSelectedMentor(e.target.value)} className="select" required>
                    <option value="">-- เลือกพี่เลี้ยง --</option>
                    {mentors.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </div>
              </div>
              <PlacementFormFields
                companyName={companyName} setCompanyName={setCompanyName}
                department={department} setDepartment={setDepartment}
                position={position} setPosition={setPosition}
                startDate={startDate} setStartDate={setStartDate}
                endDate={endDate} setEndDate={setEndDate}
                notes={notes} setNotes={setNotes}
              />
            </form>
          )}
        </div>
        <div className="px-6 py-4 border-t border-border-light bg-background flex justify-end gap-2 flex-shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary">ยกเลิก</button>
          <button type="submit" form="add-placement-form" disabled={saving || loading} className="btn-primary flex items-center gap-2">
            {saving ? <><Loader2 size={16} className="animate-spin" /> บันทึก...</> : <><CheckCircle2 size={16} /> บันทึกข้อมูล</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditPlacementModal({ placement, onClose, onSuccess }) {
  const [mentors, setMentors] = useState([])
  const [selectedMentor, setSelectedMentor] = useState(placement.mentor_id || '')
  const [companyName, setCompanyName] = useState(placement.company_name)
  const [department, setDepartment] = useState(placement.department || '')
  const [position, setPosition] = useState(placement.position)
  const [startDate, setStartDate] = useState(placement.start_date)
  const [endDate, setEndDate] = useState(placement.end_date || '')
  const [status, setStatus] = useState(placement.status)
  const [notes, setNotes] = useState(placement.notes || '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const fetchMentors = async () => {
      const { data } = await supabase.from('users').select('id, full_name').eq('role', 'mentor').eq('is_active', true).order('full_name')
      setMentors(data || [])
    }
    fetchMentors()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('internship_placements').update({
      mentor_id: selectedMentor,
      company_name: companyName.trim(),
      department: department.trim() || null,
      position: position.trim(),
      start_date: startDate,
      end_date: endDate || null,
      status,
      notes: notes.trim() || null
    }).eq('id', placement.id)
    setSaving(false)
    if (error) toast.error('บันทึกล้มเหลว')
    else { toast.success('แก้ไขข้อมูลเรียบร้อย'); onSuccess() }
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await supabase.from('internship_placements').delete().eq('id', placement.id)
    setDeleting(false)
    if (error) toast.error('ลบข้อมูลล้มเหลว')
    else { toast.success('ลบข้อมูลเรียบร้อย'); onSuccess() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border-light flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-content flex items-center gap-2">
            <Pencil className="text-primary-600" size={20} /> แก้ไขสถานที่ฝึกงาน
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-content-muted hover:bg-surface-hover rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="edit-placement-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-content-muted mb-1.5">พี่เลี้ยง <span className="text-danger">*</span></label>
              <select value={selectedMentor} onChange={e => setSelectedMentor(e.target.value)} className="select" required>
                <option value="">-- เลือกพี่เลี้ยง --</option>
                {mentors.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
            <PlacementFormFields
              companyName={companyName} setCompanyName={setCompanyName}
              department={department} setDepartment={setDepartment}
              position={position} setPosition={setPosition}
              startDate={startDate} setStartDate={setStartDate}
              endDate={endDate} setEndDate={setEndDate}
              status={status} setStatus={setStatus}
              notes={notes} setNotes={setNotes}
            />
            <div className="border-t border-border-light pt-4">
              {!confirmDelete ? (
                <button type="button" onClick={() => setConfirmDelete(true)} className="w-full flex justify-center text-sm text-danger hover:bg-red-50 py-2 rounded-lg">
                  <Trash2 size={15} className="mr-2" /> ลบข้อมูลการฝึกงานนี้
                </button>
              ) : (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <p className="text-sm text-red-700 mb-3">ยืนยันการลบข้อมูลการฝึกงานของ {placement.student?.full_name}?</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleDelete} disabled={deleting} className="btn-danger flex-1">
                      {deleting ? 'กำลังลบ...' : 'ยืนยันลบ'}
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(false)} className="btn-secondary">ยกเลิก</button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
        <div className="px-6 py-4 border-t border-border-light bg-background flex justify-end gap-2 flex-shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary">ยกเลิก</button>
          <button type="submit" form="edit-placement-form" disabled={saving} className="btn-primary">
            {saving ? 'บันทึก...' : 'บันทึกข้อมูล'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminPlacements() {
  const [placements, setPlacements] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingPlacement, setEditingPlacement] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('internship_placements')
      .select('*, student:student_id(full_name, email, student_code), mentor:mentor_id(full_name)')
      .order('created_at', { ascending: false })
    if (!error) setPlacements(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = placements.filter(p => {
    const term = search.toLowerCase()
    return p.student?.full_name?.toLowerCase().includes(term) ||
           p.company_name?.toLowerCase().includes(term) ||
           p.mentor?.full_name?.toLowerCase().includes(term)
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-content">จัดการสถานที่ฝึกงาน</h1>
          <p className="text-sm text-content-muted mt-0.5">จัดการการจับคู่นักศึกษา พี่เลี้ยง และบริษัท</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> เพิ่มสถานที่ฝึกงาน
        </button>
      </div>

      <div className="card p-4">
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหานักศึกษา, บริษัท, หรือ พี่เลี้ยง..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10 max-w-sm"
          />
        </div>

        {loading ? (
          <SkeletonTable rows={5} columns={5} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-content-muted">ไม่พบข้อมูลสถานที่ฝึกงาน</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background text-content-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-tl-lg">นักศึกษา</th>
                  <th className="px-4 py-3 font-semibold">บริษัท/แผนก</th>
                  <th className="px-4 py-3 font-semibold">พี่เลี้ยง</th>
                  <th className="px-4 py-3 font-semibold">สถานะ</th>
                  <th className="px-4 py-3 font-semibold rounded-tr-lg text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-surface-hover">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-content">{p.student?.full_name}</div>
                      <div className="text-xs text-content-muted">{p.student?.student_code || p.student?.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{p.company_name}</div>
                      <div className="text-xs text-content-muted">{p.position} {p.department && `(${p.department})`}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <UserCircle size={14} className="text-gray-400"/>
                        {p.mentor?.full_name || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-surface-hover text-content-muted'}`}>
                        {p.status === 'active' ? 'กำลังฝึกงาน' : 'เสร็จสิ้น'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setEditingPlacement(p)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && <AddPlacementModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchData() }} />}
      {editingPlacement && <EditPlacementModal placement={editingPlacement} onClose={() => setEditingPlacement(null)} onSuccess={() => { setEditingPlacement(null); fetchData() }} />}
    </div>
  )
}
