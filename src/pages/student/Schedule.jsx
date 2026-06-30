import { useState, useEffect, useCallback } from 'react'
import { Calendar as CalendarIcon, Plus, X, Trash2, Clock, FileText, Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import ScheduleCalendar from '../../components/shared/ScheduleCalendar'
import ConfirmModal from '../../components/ui/ConfirmModal'
import { SkeletonCard } from '../../components/ui/Skeleton'
import toast from 'react-hot-toast'
import format from 'date-fns/format'
import { th } from 'date-fns/locale'

export default function StudentSchedule() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
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
    color: '#10b981', // Default green for student personal events
  })
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchSchedule = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('schedules')
      .select('*')

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
  }, [])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  const toLocalISOString = (dateObj) => {
    const tzoffset = dateObj.getTimezoneOffset() * 60000 
    return new Date(dateObj.getTime() - tzoffset).toISOString().slice(0, -1)
  }

  const handleSelectSlot = ({ start, end }) => {
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
      color: '#10b981',
    })
    setEditEvent(null)
    setShowModal(true)
  }

  const handleSelectEvent = (event) => {
    if (event.isHoliday) return; // Holidays are not clickable
    
    setEditEvent(event)
    setForm({
      title: event.title,
      description: event.description || '',
      start_time: toLocalISOString(new Date(event.start_time)).slice(0, 16),
      end_time: toLocalISOString(new Date(event.end_time)).slice(0, 16),
      color: event.color || '#10b981',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      student_id: user.id,
      mentor_id: null, // student created this
      title: form.title,
      description: form.description,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
      color: form.color,
    }

    if (editEvent && editEvent.mentor_id === null) {
      const { error } = await supabase.from('schedules').update(payload).eq('id', editEvent.id)
      if (error) {
        toast.error('อัปเดตกิจกรรมล้มเหลว')
      } else {
        toast.success('อัปเดตกิจกรรมเรียบร้อย')
        setShowModal(false)
        fetchSchedule()
      }
    } else if (!editEvent) {
      const { error } = await supabase.from('schedules').insert(payload)
      if (error) {
        toast.error('สร้างกิจกรรมล้มเหลว')
      } else {
        toast.success('สร้างกิจกรรมส่วนตัวเรียบร้อย')
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
    { label: 'เขียว (Green)', value: '#10b981' },
    { label: 'ฟ้า (Blue)', value: '#3b82f6' },
    { label: 'เหลือง (Yellow)', value: '#f59e0b' },
    { label: 'ม่วง (Purple)', value: '#8b5cf6' },
    { label: 'ชมพู (Pink)', value: '#ec4899' },
  ]

  const isReadonly = editEvent && editEvent.mentor_id !== null

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-content flex items-center gap-2">
            <CalendarIcon className="text-primary-600" /> ตารางงานและกิจกรรม
          </h1>
          <p className="text-content-muted mt-1">ดูกำหนดการจากพี่เลี้ยง และสร้างตารางงานส่วนตัว</p>
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
              color: '#10b981'
            })
            setShowModal(true)
          }} 
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> สร้างกิจกรรมส่วนตัว
        </button>
      </div>

      {loading ? (
        <SkeletonCard className="h-[600px]" />
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

      {/* Add/Edit/View Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-content flex items-center gap-2">
                {isReadonly && <Lock size={16} className="text-gray-400" />}
                {isReadonly ? 'รายละเอียดกิจกรรม' : editEvent ? 'แก้ไขกิจกรรมส่วนตัว' : 'สร้างกิจกรรมส่วนตัว'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-content-muted">
                <X size={20} />
              </button>
            </div>

            {isReadonly ? (
              // Read-only View (Mentor's events)
              <div className="space-y-4">
                <div className="bg-amber-50 text-amber-800 text-xs px-3 py-2 rounded-md font-medium border border-amber-200">
                  กิจกรรมนี้สร้างโดยพี่เลี้ยง คุณสามารถดูได้อย่างเดียว
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: editEvent.color || '#3b82f6' }} />
                  <h4 className="text-base font-bold text-content">{editEvent.title}</h4>
                </div>
                
                <div className="bg-background rounded-lg p-3 text-sm flex flex-col gap-2 border border-border-light">
                  <div className="flex items-start gap-2">
                    <Clock size={16} className="text-gray-400 mt-0.5" />
                    <div>
                      <span className="text-content-muted text-xs block mb-0.5">เวลาเริ่ม</span>
                      <span className="font-medium text-content">
                        {format(new Date(editEvent.start_time), 'EEEE d MMMM yyyy HH:mm', { locale: th })} น.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock size={16} className="text-gray-400 mt-0.5 opacity-0" />
                    <div>
                      <span className="text-content-muted text-xs block mb-0.5">เวลาสิ้นสุด</span>
                      <span className="font-medium text-content">
                        {format(new Date(editEvent.end_time), 'EEEE d MMMM yyyy HH:mm', { locale: th })} น.
                      </span>
                    </div>
                  </div>
                </div>

                {editEvent.description && (
                  <div>
                    <h4 className="text-sm font-medium text-content-muted flex items-center gap-1 mb-2">
                      <FileText size={14} /> รายละเอียด
                    </h4>
                    <div className="bg-background rounded-lg p-3 text-sm text-content-muted whitespace-pre-wrap border border-border-light">
                      {editEvent.description}
                    </div>
                  </div>
                )}
                <div className="pt-4 flex justify-end">
                  <button onClick={() => setShowModal(false)} className="btn-primary">ปิด</button>
                </div>
              </div>
            ) : (
              // Editable Form (Student's events)
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">ชื่อกิจกรรม / หัวข้องาน *</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    className="input"
                    placeholder="เช่น ทำรายงาน, นัดพบอาจารย์"
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
            )}
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="ลบกิจกรรมนี้?"
          message={`คุณต้องการลบกิจกรรม "${deleteTarget.title}" ใช่หรือไม่?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          confirmLabel="ลบกิจกรรม"
          confirmStyle="danger"
        />
      )}
    </div>
  )
}
