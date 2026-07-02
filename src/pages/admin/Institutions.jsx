import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  GraduationCap, Building2, BookOpen, Plus, Edit2, Trash2,
  X, Save, ChevronDown, ChevronRight, Search, RefreshCw, School
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import ConfirmModal from '../../components/ui/ConfirmModal'

// ---- helpers ----
function useDebounce(value, delay = 300) {
  const [deb, setDeb] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return deb
}

// ---- Small reusable modal ----
function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-content">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-content-muted p-1"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ====================================================
// INSTITUTIONS TAB
// ====================================================
function InstitutionsTab({ onSelectInstitution }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({ short_name: '', full_name: '', full_name_en: '', type: 'university', province: 'เชียงใหม่', is_active: true })
  const [saving, setSaving] = useState(false)
  const debouncedSearch = useDebounce(search)

  const TYPE_LABELS = { university: 'มหาวิทยาลัย', vocational: 'อาชีวศึกษา', college: 'วิทยาลัย', institute: 'สถาบัน' }
  const TYPE_COLORS = {
    university: 'bg-blue-50 text-blue-700 border-blue-200',
    vocational: 'bg-amber-50 text-amber-700 border-amber-200',
    college: 'bg-purple-50 text-purple-700 border-purple-200',
    institute: 'bg-green-50 text-green-700 border-green-200',
  }

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('institutions').select('*').order('sort_order').order('full_name')
    setRows(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const filtered = useMemo(() =>
    rows.filter(r =>
      !debouncedSearch ||
      r.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      r.short_name?.toLowerCase().includes(debouncedSearch.toLowerCase())
    ), [rows, debouncedSearch])

  const resetForm = () => setForm({ short_name: '', full_name: '', full_name_en: '', type: 'university', province: 'เชียงใหม่', is_active: true })

  const openEdit = (r) => {
    setEditRow(r)
    setForm({ short_name: r.short_name, full_name: r.full_name, full_name_en: r.full_name_en || '', type: r.type, province: r.province || 'เชียงใหม่', is_active: r.is_active })
  }

  const handleSave = async () => {
    if (!form.short_name.trim() || !form.full_name.trim()) { toast.error('กรุณากรอกชื่อย่อและชื่อเต็ม'); return }
    setSaving(true)
    const payload = { short_name: form.short_name.trim(), full_name: form.full_name.trim(), full_name_en: form.full_name_en.trim() || null, type: form.type, province: form.province, is_active: form.is_active }
    let error
    if (editRow) {
      ({ error } = await supabase.from('institutions').update(payload).eq('id', editRow.id))
    } else {
      ({ error } = await supabase.from('institutions').insert(payload))
    }
    setSaving(false)
    if (error) { toast.error('บันทึกล้มเหลว: ' + error.message) }
    else { toast.success(editRow ? 'แก้ไขสำเร็จ!' : 'เพิ่มสำเร็จ!'); setEditRow(null); setShowAdd(false); resetForm(); fetch() }
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('institutions').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    if (error) { toast.error('ลบล้มเหลว — อาจมีข้อมูลผูกกับสถาบันนี้อยู่') } else { toast.success('ลบสำเร็จ'); fetch() }
  }

  const FormBody = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">ชื่อย่อ <span className="text-danger">*</span></label>
          <input className="input" placeholder="เช่น CMU" value={form.short_name} onChange={e => setForm(p => ({ ...p, short_name: e.target.value }))} />
        </div>
        <div>
          <label className="label">ประเภท</label>
          <select className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
            <option value="university">มหาวิทยาลัย</option>
            <option value="college">วิทยาลัย</option>
            <option value="vocational">อาชีวศึกษา</option>
            <option value="institute">สถาบัน</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">ชื่อเต็ม (ภาษาไทย) <span className="text-danger">*</span></label>
        <input className="input" placeholder="มหาวิทยาลัย..." value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
      </div>
      <div>
        <label className="label">ชื่อเต็ม (ภาษาอังกฤษ)</label>
        <input className="input" placeholder="University of..." value={form.full_name_en} onChange={e => setForm(p => ({ ...p, full_name_en: e.target.value }))} />
      </div>
      <div>
        <label className="label">จังหวัด</label>
        <input className="input" value={form.province} onChange={e => setForm(p => ({ ...p, province: e.target.value }))} />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4" />
        <span className="text-sm font-medium text-content-muted">เปิดใช้งาน</span>
      </label>
      <div className="flex gap-3 pt-2">
        <button onClick={() => { setShowAdd(false); setEditRow(null); resetForm() }} className="btn-secondary flex-1">ยกเลิก</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          <Save size={14} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="ค้นหาชื่อสถาบัน..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-8 text-sm w-full" />
        </div>
        <button onClick={fetch} className="btn-secondary btn-sm flex items-center gap-1.5"><RefreshCw size={13} /> รีเฟรช</button>
        <button onClick={() => { resetForm(); setShowAdd(true) }} className="btn-primary btn-sm flex items-center gap-1.5"><Plus size={14} /> เพิ่มสถาบัน</button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-content-muted">กำลังโหลด...</div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 && <p className="text-center py-10 text-gray-400">ไม่มีข้อมูล</p>}
          {filtered.map(r => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:bg-surface-hover/30 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center flex-shrink-0">
                <Building2 size={18} className="text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-content">{r.full_name}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${TYPE_COLORS[r.type] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    {TYPE_LABELS[r.type] || r.type}
                  </span>
                  {!r.is_active && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">ปิดใช้งาน</span>}
                </div>
                <p className="text-sm text-content-muted">{r.short_name}{r.full_name_en ? ` · ${r.full_name_en}` : ''}</p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={() => onSelectInstitution(r)}
                  className="btn-secondary btn-sm text-xs flex items-center gap-1"
                  title="จัดการคณะ/สาขา"
                >
                  <BookOpen size={12} /> คณะ/สาขา
                </button>
                <button onClick={() => openEdit(r)} className="btn-secondary btn-sm" title="แก้ไข"><Edit2 size={12} /></button>
                <button onClick={() => setDeleteTarget(r)} className="btn-danger btn-sm" title="ลบ"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showAdd || editRow) && (
        <Modal title={editRow ? 'แก้ไขสถาบันการศึกษา' : 'เพิ่มสถาบันการศึกษาใหม่'} onClose={() => { setShowAdd(false); setEditRow(null); resetForm() }}>
          <FormBody />
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="ลบสถาบันการศึกษา?"
          message={`ลบ "${deleteTarget.full_name}" — คณะและสาขาทั้งหมดของสถาบันนี้จะถูกลบด้วย`}
          confirmLabel="ลบ"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ====================================================
// FACULTIES TAB (for a specific institution)
// ====================================================
function FacultiesPanel({ institution, onSelectFaculty }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({ name: '', name_en: '', is_active: true })
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('faculties').select('*').eq('institution_id', institution.id).order('name')
    setRows(data || [])
    setLoading(false)
  }, [institution.id])

  useEffect(() => { fetch() }, [fetch])

  const resetForm = () => setForm({ name: '', name_en: '', is_active: true })

  const openEdit = (r) => {
    setEditRow(r)
    setForm({ name: r.name, name_en: r.name_en || '', is_active: r.is_active })
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('กรุณากรอกชื่อคณะ'); return }
    setSaving(true)
    const payload = { name: form.name.trim(), name_en: form.name_en.trim() || null, is_active: form.is_active, institution_id: institution.id }
    let error
    if (editRow) {
      ({ error } = await supabase.from('faculties').update(payload).eq('id', editRow.id))
    } else {
      ({ error } = await supabase.from('faculties').insert(payload))
    }
    setSaving(false)
    if (error) { toast.error('บันทึกล้มเหลว') }
    else { toast.success(editRow ? 'แก้ไขสำเร็จ!' : 'เพิ่มสำเร็จ!'); setEditRow(null); setShowAdd(false); resetForm(); fetch() }
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('faculties').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    if (error) { toast.error('ลบล้มเหลว — อาจมีสาขาผูกกับคณะนี้อยู่') } else { toast.success('ลบสำเร็จ'); fetch() }
  }

  const FormBody = () => (
    <div className="space-y-3">
      <div>
        <label className="label">ชื่อคณะ/แผนก (ภาษาไทย) <span className="text-danger">*</span></label>
        <input className="input" placeholder="คณะ..." value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
      </div>
      <div>
        <label className="label">ชื่อ (ภาษาอังกฤษ)</label>
        <input className="input" placeholder="Faculty of..." value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4" />
        <span className="text-sm font-medium text-content-muted">เปิดใช้งาน</span>
      </label>
      <div className="flex gap-3 pt-2">
        <button onClick={() => { setShowAdd(false); setEditRow(null); resetForm() }} className="btn-secondary flex-1">ยกเลิก</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          <Save size={14} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-content-muted">คณะ/แผนกทั้งหมด {rows.length} รายการ</p>
        <button onClick={() => { resetForm(); setShowAdd(true) }} className="btn-primary btn-sm flex items-center gap-1.5">
          <Plus size={13} /> เพิ่มคณะ
        </button>
      </div>

      {loading ? <div className="py-8 text-center text-content-muted text-sm">กำลังโหลด...</div> : (
        <div className="space-y-1.5">
          {rows.length === 0 && <p className="text-center py-6 text-sm text-gray-400">ยังไม่มีคณะ/แผนก</p>}
          {rows.map(r => (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 bg-surface rounded-xl border border-border group hover:bg-surface-hover/50 transition-colors">
              <BookOpen size={14} className="text-primary-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-content">{r.name}</p>
                {r.name_en && <p className="text-xs text-content-muted">{r.name_en}</p>}
              </div>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onSelectFaculty(r)}
                  className="btn-secondary btn-sm text-xs flex items-center gap-1"
                  title="จัดการสาขา"
                >
                  <GraduationCap size={11} /> สาขา
                </button>
                <button onClick={() => openEdit(r)} className="btn-secondary btn-sm"><Edit2 size={11} /></button>
                <button onClick={() => setDeleteTarget(r)} className="btn-danger btn-sm"><Trash2 size={11} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showAdd || editRow) && (
        <Modal title={editRow ? 'แก้ไขคณะ/แผนก' : `เพิ่มคณะ/แผนกใหม่ — ${institution.short_name}`} onClose={() => { setShowAdd(false); setEditRow(null); resetForm() }}>
          <FormBody />
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="ลบคณะ/แผนก?"
          message={`ลบ "${deleteTarget.name}" — สาขาทั้งหมดในคณะนี้จะถูกลบด้วย`}
          confirmLabel="ลบ"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ====================================================
// MAJORS PANEL (for a specific faculty)
// ====================================================
function MajorsPanel({ faculty }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({ name: '', name_en: '', is_active: true })
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('majors').select('*').eq('faculty_id', faculty.id).order('name')
    setRows(data || [])
    setLoading(false)
  }, [faculty.id])

  useEffect(() => { fetch() }, [fetch])

  const resetForm = () => setForm({ name: '', name_en: '', is_active: true })

  const openEdit = (r) => {
    setEditRow(r)
    setForm({ name: r.name, name_en: r.name_en || '', is_active: r.is_active })
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('กรุณากรอกชื่อสาขา'); return }
    setSaving(true)
    const payload = { name: form.name.trim(), name_en: form.name_en.trim() || null, is_active: form.is_active, faculty_id: faculty.id }
    let error
    if (editRow) {
      ({ error } = await supabase.from('majors').update(payload).eq('id', editRow.id))
    } else {
      ({ error } = await supabase.from('majors').insert(payload))
    }
    setSaving(false)
    if (error) { toast.error('บันทึกล้มเหลว') }
    else { toast.success(editRow ? 'แก้ไขสำเร็จ!' : 'เพิ่มสำเร็จ!'); setEditRow(null); setShowAdd(false); resetForm(); fetch() }
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('majors').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    if (error) { toast.error('ลบล้มเหลว') } else { toast.success('ลบสำเร็จ'); fetch() }
  }

  const FormBody = () => (
    <div className="space-y-3">
      <div>
        <label className="label">ชื่อสาขา (ภาษาไทย) <span className="text-danger">*</span></label>
        <input className="input" placeholder="สาขา..." value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
      </div>
      <div>
        <label className="label">ชื่อ (ภาษาอังกฤษ)</label>
        <input className="input" placeholder="Major in..." value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4" />
        <span className="text-sm font-medium text-content-muted">เปิดใช้งาน</span>
      </label>
      <div className="flex gap-3 pt-2">
        <button onClick={() => { setShowAdd(false); setEditRow(null); resetForm() }} className="btn-secondary flex-1">ยกเลิก</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          <Save size={14} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-content-muted">สาขาทั้งหมด {rows.length} สาขา</p>
        <button onClick={() => { resetForm(); setShowAdd(true) }} className="btn-primary btn-sm flex items-center gap-1.5">
          <Plus size={13} /> เพิ่มสาขา
        </button>
      </div>

      {loading ? <div className="py-6 text-center text-content-muted text-sm">กำลังโหลด...</div> : (
        <div className="space-y-1.5">
          {rows.length === 0 && <p className="text-center py-6 text-sm text-gray-400">ยังไม่มีสาขาวิชา</p>}
          {rows.map(r => (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 bg-surface rounded-xl border border-border group hover:bg-surface-hover/50 transition-colors">
              <GraduationCap size={14} className="text-green-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-content">{r.name}</p>
                {r.name_en && <p className="text-xs text-content-muted">{r.name_en}</p>}
              </div>
              {!r.is_active && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">ปิดใช้งาน</span>}
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(r)} className="btn-secondary btn-sm"><Edit2 size={11} /></button>
                <button onClick={() => setDeleteTarget(r)} className="btn-danger btn-sm"><Trash2 size={11} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showAdd || editRow) && (
        <Modal title={editRow ? 'แก้ไขสาขาวิชา' : `เพิ่มสาขาวิชาใหม่ — ${faculty.name}`} onClose={() => { setShowAdd(false); setEditRow(null); resetForm() }}>
          <FormBody />
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="ลบสาขาวิชา?"
          message={`ลบสาขา "${deleteTarget.name}"`}
          confirmLabel="ลบ"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ====================================================
// MAIN PAGE
// ====================================================
export default function AdminInstitutions() {
  const [selectedInstitution, setSelectedInstitution] = useState(null)
  const [selectedFaculty, setSelectedFaculty] = useState(null)

  const handleSelectInstitution = (inst) => {
    setSelectedInstitution(inst)
    setSelectedFaculty(null)
  }

  const handleSelectFaculty = (fac) => {
    setSelectedFaculty(fac)
  }

  const handleBack = () => {
    if (selectedFaculty) {
      setSelectedFaculty(null)
    } else {
      setSelectedInstitution(null)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <School size={20} className="text-primary-700" />
          <h1 className="text-xl font-bold text-content">จัดการสถาบันการศึกษา</h1>
        </div>
        <p className="text-sm text-content-muted">เพิ่ม แก้ไข และจัดการข้อมูลสถาบัน คณะ และสาขาวิชา</p>
      </div>

      {/* Breadcrumb navigation */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => { setSelectedInstitution(null); setSelectedFaculty(null) }}
          className={`font-medium transition-colors ${!selectedInstitution ? 'text-primary-700' : 'text-content-muted hover:text-content'}`}
        >
          สถาบันการศึกษา
        </button>
        {selectedInstitution && (
          <>
            <ChevronRight size={14} className="text-gray-400" />
            <button
              onClick={() => setSelectedFaculty(null)}
              className={`font-medium transition-colors ${!selectedFaculty ? 'text-primary-700' : 'text-content-muted hover:text-content'}`}
            >
              {selectedInstitution.short_name} — คณะ/แผนก
            </button>
          </>
        )}
        {selectedFaculty && (
          <>
            <ChevronRight size={14} className="text-gray-400" />
            <span className="font-medium text-primary-700">{selectedFaculty.name} — สาขาวิชา</span>
          </>
        )}
      </div>

      {/* Panels */}
      {!selectedInstitution && (
        <InstitutionsTab onSelectInstitution={handleSelectInstitution} />
      )}

      {selectedInstitution && !selectedFaculty && (
        <div className="space-y-4">
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Building2 size={20} className="text-primary-600" />
              <div>
                <p className="font-bold text-primary-900">{selectedInstitution.full_name}</p>
                <p className="text-sm text-primary-700">{selectedInstitution.full_name_en || selectedInstitution.short_name}</p>
              </div>
              <button onClick={handleBack} className="ml-auto btn-secondary btn-sm">← กลับ</button>
            </div>
          </div>
          <div className="card">
            <h2 className="font-semibold text-content mb-4 flex items-center gap-2">
              <BookOpen size={16} className="text-primary-600" /> คณะ / แผนกวิชา
            </h2>
            <FacultiesPanel institution={selectedInstitution} onSelectFaculty={handleSelectFaculty} />
          </div>
        </div>
      )}

      {selectedInstitution && selectedFaculty && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <BookOpen size={20} className="text-green-600" />
              <div>
                <p className="font-bold text-green-900">{selectedFaculty.name}</p>
                <p className="text-sm text-green-700">{selectedInstitution.full_name}</p>
              </div>
              <button onClick={handleBack} className="ml-auto btn-secondary btn-sm">← กลับ</button>
            </div>
          </div>
          <div className="card">
            <h2 className="font-semibold text-content mb-4 flex items-center gap-2">
              <GraduationCap size={16} className="text-green-600" /> สาขาวิชา
            </h2>
            <MajorsPanel faculty={selectedFaculty} />
          </div>
        </div>
      )}
    </div>
  )
}
