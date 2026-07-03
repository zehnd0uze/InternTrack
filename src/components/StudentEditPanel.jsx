/**
 * StudentEditPanel — shared component for admin / supervisor / mentor
 * to view and edit a student's full profile details.
 *
 * Props:
 *   studentId  — UUID of the student
 *   onSaved    — optional callback after a successful save
 *   compact    — if true, renders a compact version (for modal use)
 */
import { useState, useEffect, useCallback } from 'react'
import {
  User, Mail, Hash, Clock, Building2, BookOpen, GraduationCap,
  Target, Save, RefreshCw, CheckCircle, Phone, MapPin, Calendar,
  FileText, Shield
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const SECTION = ({ title, icon: Icon, color = 'text-primary-600', children }) => (
  <div className="space-y-3">
    <div className={`flex items-center gap-2 pb-2 border-b border-border`}>
      <Icon size={15} className={color} />
      <span className="text-xs font-semibold text-content-muted uppercase tracking-wider">{title}</span>
    </div>
    {children}
  </div>
)

const Field = ({ label, children, half }) => (
  <div className={half ? '' : 'col-span-2'}>
    <label className="block text-xs font-medium text-content-muted mb-1">{label}</label>
    {children}
  </div>
)

export default function StudentEditPanel({ studentId, onSaved, compact = false }) {
  const { activeRole } = useAuth()
  const isAdmin = activeRole === 'admin'

  // Raw student data
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [liveUpdated, setLiveUpdated] = useState(false)

  // Reference data
  const [supervisors, setSupervisors] = useState([])
  const [institutions, setInstitutions] = useState([])
  const [faculties, setFaculties] = useState([])
  const [majors, setMajors] = useState([])

  // Form state
  const [form, setForm] = useState({
    full_name: '',
    student_code: '',
    phone: '',
    address: '',
    target_hours: 1596,
    supervisor_id: '',
    work_start_time: '08:00',
    work_end_time: '17:00',
    institution_id: '',
    faculty_id: '',
    major_id: '',
    internship_start_date: '',
    internship_end_date: '',
    notes: '',
    is_active: true,
  })

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))

  // ---- Fetch student ----
  const fetchStudent = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('users').select('*').eq('id', studentId).single()
    if (data) {
      setStudent(data)
      setForm({
        full_name: data.full_name || '',
        student_code: data.student_code || '',
        phone: data.phone || '',
        address: data.address || '',
        target_hours: data.target_hours || 1596,
        supervisor_id: data.supervisor_id || '',
        work_start_time: data.work_start_time ? data.work_start_time.slice(0, 5) : '08:00',
        work_end_time: data.work_end_time ? data.work_end_time.slice(0, 5) : '17:00',
        institution_id: data.institution_id || '',
        faculty_id: data.faculty_id || '',
        major_id: data.major_id || '',
        internship_start_date: data.internship_start_date || '',
        internship_end_date: data.internship_end_date || '',
        notes: data.notes || '',
        is_active: data.is_active ?? true,
      })
    }
    setLoading(false)
  }, [studentId])

  // ---- Fetch reference data ----
  useEffect(() => {
    fetchStudent()
    supabase.from('users').select('id, full_name').eq('role', 'supervisor').order('full_name')
      .then(({ data }) => setSupervisors(data || []))
    supabase.from('institutions').select('id, short_name, full_name').eq('is_active', true).order('sort_order').order('full_name')
      .then(({ data }) => setInstitutions(data || []))
  }, [fetchStudent])

  // ---- Real-time sync: auto-refresh when student updates their own profile ----
  useEffect(() => {
    if (!studentId) return
    const channel = supabase
      .channel(`student-profile-${studentId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${studentId}`,
      }, () => {
        fetchStudent()
        setLiveUpdated(true)
        setTimeout(() => setLiveUpdated(false), 6000)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [studentId, fetchStudent])

  // Load faculties when institution changes
  useEffect(() => {
    if (!form.institution_id) { setFaculties([]); return }
    supabase.from('faculties').select('id, name').eq('institution_id', form.institution_id).eq('is_active', true).order('name')
      .then(({ data }) => setFaculties(data || []))
  }, [form.institution_id])

  // Load majors when faculty changes
  useEffect(() => {
    if (!form.faculty_id) { setMajors([]); return }
    supabase.from('majors').select('id, name').eq('faculty_id', form.faculty_id).eq('is_active', true).order('name')
      .then(({ data }) => setMajors(data || []))
  }, [form.faculty_id])

  // Seed faculties/majors from existing profile data on initial load
  useEffect(() => {
    if (student?.institution_id && institutions.length > 0 && faculties.length === 0) {
      supabase.from('faculties').select('id, name').eq('institution_id', student.institution_id).eq('is_active', true).order('name')
        .then(({ data }) => setFaculties(data || []))
    }
  }, [student, institutions, faculties.length])

  useEffect(() => {
    if (student?.faculty_id && faculties.length > 0 && majors.length === 0) {
      supabase.from('majors').select('id, name').eq('faculty_id', student.faculty_id).eq('is_active', true).order('name')
        .then(({ data }) => setMajors(data || []))
    }
  }, [student, faculties, majors.length])

  // ---- Save ----
  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error('กรุณากรอกชื่อ-นามสกุล'); return }
    setSaving(true)

    const payload = {
      full_name: form.full_name.trim(),
      student_code: form.student_code.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      target_hours: parseInt(form.target_hours) || 1596,
      supervisor_id: form.supervisor_id || null,
      work_start_time: form.work_start_time ? form.work_start_time + ':00' : null,
      work_end_time: form.work_end_time ? form.work_end_time + ':00' : null,
      institution_id: form.institution_id || null,
      faculty_id: form.faculty_id || null,
      major_id: form.major_id || null,
      internship_start_date: form.internship_start_date || null,
      internship_end_date: form.internship_end_date || null,
      notes: form.notes.trim() || null,
      ...(isAdmin && { is_active: form.is_active }),
    }

    const { error } = await supabase.from('users').update(payload).eq('id', studentId)

    if (error) {
      setSaving(false)
      toast.error('บันทึกล้มเหลว: ' + error.message)
      return
    }

    // Generate retroactive attendance if internship dates & work times are provided
    if (
      form.internship_start_date &&
      form.internship_end_date &&
      form.work_start_time &&
      form.work_end_time
    ) {
      try {
        const { data: recordsCreated, error: rpcErr } = await supabase.rpc('generate_retroactive_attendance', {
          p_user_id: studentId,
          p_start_date: form.internship_start_date,
          p_end_date: form.internship_end_date,
          p_start_time: form.work_start_time + ':00',
          p_end_time: form.work_end_time + ':00',
        })
        if (rpcErr) {
          console.error('Retroactive attendance error:', rpcErr)
        } else if (recordsCreated > 0) {
          toast.success(`สร้างประวัติการลงเวลาย้อนหลัง ${recordsCreated} วัน (จ.–ศ.) ให้นักศึกษาแล้ว`)
        }
      } catch (err) {
        console.error('RPC error:', err)
      }
    }

    setSaving(false)
    toast.success('บันทึกข้อมูลนักศึกษาสำเร็จ!')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    fetchStudent()
    if (onSaved) onSaved()
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!student) {
    return <p className="text-center py-8 text-gray-400">ไม่พบข้อมูลนักศึกษา</p>
  }

  return (
    <div className={`space-y-6 ${compact ? '' : 'max-w-2xl'}`}>
      {/* Header banner */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl p-4 border border-primary-100 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-2xl font-bold text-primary-700">
          {student.full_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-content text-lg truncate">{student.full_name}</p>
          <p className="text-sm text-content-muted">{student.email}</p>
          {student.student_code && (
            <span className="inline-block mt-1 text-xs font-medium bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
              รหัส: {student.student_code}
            </span>
          )}
        </div>
        <button onClick={fetchStudent} className="ml-auto btn-secondary btn-sm flex-shrink-0 flex items-center gap-1.5">
          <RefreshCw size={13} /> รีเฟรช
        </button>
      </div>

      {/* Live update banner */}
      {liveUpdated && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
          นักศึกษาเพิ่งอัปเดตข้อมูลของตัวเองแล้ว — ฟอร์มถูกโหลดใหม่อัตโนมัติ ✅
        </div>
      )}


      {/* Form grid */}
      <div className="space-y-6">

        {/* === Personal Info === */}
        <SECTION title="ข้อมูลส่วนตัว" icon={User} color="text-primary-600">
          <div className="grid grid-cols-2 gap-3">
            <Field label="ชื่อ-นามสกุล *">
              <div className="relative">
                <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)} className="input pl-8 text-sm" />
              </div>
            </Field>
            <Field label="รหัสนักศึกษา" half>
              <div className="relative">
                <Hash size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type="text" value={form.student_code} onChange={e => set('student_code', e.target.value)} className="input pl-8 text-sm" placeholder="เช่น 6412345678" />
              </div>
            </Field>
            <Field label="เบอร์โทรศัพท์" half>
              <div className="relative">
                <Phone size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className="input pl-8 text-sm" placeholder="0xx-xxx-xxxx" />
              </div>
            </Field>
            <Field label="ที่อยู่">
              <div className="relative">
                <MapPin size={14} className="absolute left-2.5 top-3 text-gray-400 pointer-events-none" />
                <textarea rows={2} value={form.address} onChange={e => set('address', e.target.value)} className="input pl-8 text-sm resize-none" placeholder="ที่อยู่ปัจจุบัน..." />
              </div>
            </Field>
          </div>
        </SECTION>

        {/* === Academic Info === */}
        <SECTION title="ข้อมูลสถาบันการศึกษา" icon={Building2} color="text-blue-600">
          <div className="grid grid-cols-2 gap-3">
            <Field label="สถาบันการศึกษา">
              <div className="relative">
                <Building2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  value={form.institution_id}
                  onChange={e => { set('institution_id', e.target.value); set('faculty_id', ''); set('major_id', '') }}
                  className="input pl-8 text-sm"
                >
                  <option value="">-- เลือกสถาบัน --</option>
                  {institutions.map(i => (
                    <option key={i.id} value={i.id}>{i.full_name} ({i.short_name})</option>
                  ))}
                </select>
              </div>
            </Field>
            <Field label="คณะ / แผนก" half>
              <div className="relative">
                <BookOpen size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  value={form.faculty_id}
                  onChange={e => { set('faculty_id', e.target.value); set('major_id', '') }}
                  className="input pl-8 text-sm"
                  disabled={!form.institution_id || faculties.length === 0}
                >
                  <option value="">-- เลือกคณะ --</option>
                  {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </Field>
            <Field label="สาขาวิชา" half>
              <div className="relative">
                <GraduationCap size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  value={form.major_id}
                  onChange={e => set('major_id', e.target.value)}
                  className="input pl-8 text-sm"
                  disabled={!form.faculty_id || majors.length === 0}
                >
                  <option value="">-- เลือกสาขา --</option>
                  {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </Field>
            <Field label="อาจารย์นิเทศ" half>
              <select
                value={form.supervisor_id}
                onChange={e => set('supervisor_id', e.target.value)}
                className="input text-sm"
              >
                <option value="">-- ไม่ระบุ --</option>
                {supervisors.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </Field>
          </div>
        </SECTION>

        {/* === Internship Info === */}
        <SECTION title="ข้อมูลการฝึกงาน" icon={Calendar} color="text-green-600">
          <div className="grid grid-cols-2 gap-3">
            <Field label="วันที่เริ่มฝึกงาน" half>
              <input type="date" value={form.internship_start_date} onChange={e => set('internship_start_date', e.target.value)} className="input text-sm" />
            </Field>
            <Field label="วันที่สิ้นสุดฝึกงาน" half>
              <input type="date" value={form.internship_end_date} onChange={e => set('internship_end_date', e.target.value)} className="input text-sm" />
            </Field>
            <Field label="เป้าหมายชั่วโมงทั้งหมด (ชม.)" half>
              <div className="relative">
                <Target size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type="number" min={1} value={form.target_hours} onChange={e => set('target_hours', e.target.value)} className="input pl-8 text-sm" />
              </div>
            </Field>
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <Field label="เวลาเข้างานปกติ" half>
                <div className="relative">
                  <Clock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input type="time" value={form.work_start_time} onChange={e => set('work_start_time', e.target.value)} className="input pl-8 text-sm" />
                </div>
              </Field>
              <Field label="เวลาเลิกงานปกติ" half>
                <div className="relative">
                  <Clock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input type="time" value={form.work_end_time} onChange={e => set('work_end_time', e.target.value)} className="input pl-8 text-sm" />
                </div>
              </Field>
            </div>
          </div>
        </SECTION>

        {/* === Notes === */}
        <SECTION title="บันทึกเพิ่มเติม (สำหรับอาจารย์/พี่เลี้ยง)" icon={FileText} color="text-amber-600">
          <textarea
            rows={4}
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            className="input text-sm resize-none w-full"
            placeholder="บันทึกข้อสังเกต คำแนะนำ หรือหมายเหตุเพิ่มเติมเกี่ยวกับนักศึกษาคนนี้..."
            maxLength={1000}
          />
          <p className="text-xs text-gray-400 text-right">{form.notes.length}/1000</p>
        </SECTION>

        {/* === Account (Admin only) === */}
        {isAdmin && (
          <SECTION title="การจัดการบัญชี (Admin เท่านั้น)" icon={Shield} color="text-red-500">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => set('is_active', !form.is_active)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.is_active ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm font-medium text-content">
                {form.is_active ? 'บัญชีใช้งานได้' : 'บัญชีถูกระงับ'}
              </span>
            </label>
          </SECTION>
        )}
      </div>

      {/* Save button */}
      <div className="pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
            saved
              ? 'bg-green-500 text-white'
              : 'btn-primary'
          }`}
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : saved ? (
            <><CheckCircle size={18} /> บันทึกสำเร็จ!</>
          ) : (
            <><Save size={18} /> บันทึกข้อมูลนักศึกษา</>
          )}
        </button>
      </div>
    </div>
  )
}
