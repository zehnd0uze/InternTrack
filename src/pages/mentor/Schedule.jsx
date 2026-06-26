import { useState, useEffect, useCallback } from 'react'
import { Calendar as CalendarIcon, Plus, X, Trash2, Clock, Users, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import ScheduleCalendar from '../../components/shared/ScheduleCalendar'
import ConfirmModal from '../../components/ui/ConfirmModal'
import toast from 'react-hot-toast'

export default function MentorSchedule() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  const [view, setView] = useState('month')
  const [date, setDate] = useState(new Date())

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    color: '#3b82f6',
    student_id: '' // empty means all
  })
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchSchedule = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('schedules')
      .select('*, student:users!schedules_student_id_fkey(full_name)')
      .eq('mentor_id', user.id)

    if (error) {
      console.error(error)
      toast.error('ไม่สามารถดึงตารางงานได้')
    } else {
      const formatted = (data || []).map(row => ({
        ...row,
        start: new Date(row.start_time),
        end: new Date(row.end_time),
      }))
      setEvents(formatted)
    }
    setLoading(false)
  }, [user.id])

  const fetchStudents = useCallback(async () => {
    const { data, error } = await supabase
      .from('internship_placements')
      .select('student:users!internship_placements_student_id_fkey(id, full_name)')
      .eq('mentor_id', user.id)
      .eq('status', 'active')

    if (!error && data) {
      // Remove duplicates just in case
      const unique = []
      const map = new Map()
      for (const item of data) {
        if (!map.has(item.student.id)) {
          map.set(item.student.id, true)
          unique.push(item.student)
        }
      }
      setStudents(unique)
    }
  }, [user.id])

  useEffect(() => {
    fetchSchedule()
    fetchStudents()
  }, [fetchSchedule, fetchStudents])

  // Handle selecting a slot (empty space) in the calendar
  const handleSelectSlot = ({ start, end }) => {
    // If it's an all day selection or month view, `end` might be the next day at 00:00.
    // Let's adjust end time to be 1 hour after start if they are the same day or month view.
    const isAllDay = start.getHours() === 0 && end.getHours() === 0
    let adjustedEnd = end
    let adjustedStart = start
    
    if (isAllDay) {
      adjustedStart.setHours(9, 0, 0, 0)
      adjustedEnd = new Date(start)
      adjustedEnd.setHours(10, 0, 0, 0)
    } else if (start.getTime() === end.getTime()) {
      adjustedEnd = new Date(start.getTime() + 60 * 60 * 1000)
    }

    setForm({
      title: '',
      description: '',
      start_time: toLocalISOString(adjustedStart).slice(0, 16),
      end_time: toLocalISOString(adjustedEnd).slice(0, 16),
      color: '#3b82f6',
      student_id: ''
    })
    setEditEvent(null)
    setShowModal(true)
  }

  // Handle clicking an existing event
  const handleSelectEvent = (event) => {
    setEditEvent(event)
    setForm({
      title: event.title,
      description: event.description || '',
      start_time: toLocalISOString(new Date(event.start_time)).slice(0, 16),
      end_time: toLocalISOString(new Date(event.end_time)).slice(0, 16),
      color: event.color || '#3b82f6',
      student_id: event.student_id || ''
    })
    setShowModal(true)
  }

  // Helper to format date for datetime-local input
  const toLocalISOString = (date) => {
    const tzoffset = date.getTimezoneOffset() * 60000 // offset in milliseconds
    return new Date(date.getTime() - tzoffset).toISOString().slice(0, -1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      mentor_id: user.id,
      title: form.title,
      description: form.description,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
      color: form.color,
      student_id: form.student_id ? form.student_id : null
    }

    if (editEvent) {
      const { error } = await supabase.from('schedules').update(payload).eq('id', editEvent.id)
      if (error) {
        toast.error('อัปเดตกิจกรรมล้มเหลว')
      } else {
        toast.success('อัปเดตกิจกรรมเรียบร้อย')
        setShowModal(false)
        fetchSchedule()
      }
    } else {
      const { error } = await supabase.from('schedules').insert(payload)
      if (error) {
        toast.error('สร้างกิจกรรมล้มเหลว')
      } else {
        toast.success('สร้างกิจกรรมเรียบร้อย')
        setShowModal(false)
        fetchSchedule()
      }
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const { error } = await supabase.from('schedules').delete().eq('id', deleteTarget.id)
    if (error) {
      toast.error('ลบกิจกรรมล้มเหลว')
    } else {
      toast.success('ลบกิจกรรมเรียบร้อย')
      setDeleteTarget(null)
      setShowModal(false)
      fetchSchedule()
    }
  }

  const colors = [
    { label: 'ฟ้า (Blue)', value: '#3b82f6' },
    { label: 'เขียว (Green)', value: '#10b981' },
    { label: 'แดง (Red)', value: '#ef4444' },
    { label: 'เหลือง (Yellow)', value: '#f59e0b' },
    { label: 'ม่วง (Purple)', value: '#8b5cf6' },
    { label: 'ชมพู (Pink)', value: '#ec4899' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-content flex items-center gap-2">
            <CalendarIcon className="text-primary-600" /> ตารางงานและนัดหมาย
          </h1>
          <p className="text-content-muted mt-1">วางแผนงาน มอบหมายงาน และจัดตารางนัดหมายกับนักศึกษา</p>
        </div>
        <button 
          onClick={() => {
            setEditEvent(null)
            const now = new Date()
            now.setMinutes(0)
            const later = new Date(now.getTime() + 60 * 60 * 1000)
            setForm({
              title: '', description: '', 
              start_time: toLocalISOString(now).slice(0, 16), 
              end_time: toLocalISOString(later).slice(0, 16), 
              color: '#3b82f6', student_id: ''
            })
            setShowModal(true)
          }} 
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> สร้างกิจกรรม
        </button>
      </div>

      {loading ? (
        <div className="card h-[600px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <ScheduleCalendar
          events={events}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
        />
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-content">
                {editEvent ? 'แก้ไขกิจกรรม' : 'สร้างกิจกรรมใหม่'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-content-muted">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">ชื่อกิจกรรม / หัวข้องาน *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="input"
                  placeholder="เช่น ประชุมสัปดาห์, ส่งรายงานรอบที่ 1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label flex items-center gap-1"><Clock size={14}/> เวลาเริ่ม *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.start_time}
                    onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-1"><Clock size={14}/> เวลาสิ้นสุด *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.end_time}
                    onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label flex items-center gap-1"><Users size={14}/> มอบหมายให้</label>
                <select
                  value={form.student_id}
                  onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}
                  className="select"
                >
                  <option value="">-- นักศึกษาในการดูแลทุกคน --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">สีป้ายกำกับ</label>
                <div className="flex gap-3 mt-1">
                  {colors.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, color: c.value }))}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${form.color === c.value ? 'scale-110 border-gray-600' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="label flex items-center gap-1"><FileText size={14}/> รายละเอียดเพิ่มเติม (ไม่บังคับ)</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="input min-h-[80px]"
                  placeholder="รายละเอียดงาน, สถานที่นัดหมาย, หรือสิ่งที่ต้องเตรียม..."
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border-light mt-6">
                {editEvent ? (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(editEvent)}
                    className="text-danger hover:text-red-700 font-medium text-sm flex items-center gap-1"
                  >
                    <Trash2 size={16} /> ลบกิจกรรม
                  </button>
                ) : <div/>}
                
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                    ยกเลิก
                  </button>
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="ลบกิจกรรมนี้?"
          message={`คุณต้องการลบกิจกรรม "${deleteTarget.title}" ใช่หรือไม่? ข้อมูลนี้จะหายไปจากตารางของนักศึกษาด้วย`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          confirmLabel="ลบกิจกรรม"
          confirmStyle="danger"
        />
      )}
    </div>
  )
}
