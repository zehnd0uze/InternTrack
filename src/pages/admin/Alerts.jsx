import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Bell, Plus, Trash2, Clock, Calendar as CalendarIcon, Users, RefreshCw, Edit2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  // Form State
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [targetRole, setTargetRole] = useState('all')
  const [sendPattern, setSendPattern] = useState('everyday') // 'everyday', 'custom', 'once'
  const [selectedDays, setSelectedDays] = useState([]) // 0=Sun, 1=Mon, etc.
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [scheduleDate, setScheduleDate] = useState('')

  const WEEKDAYS = [
    { id: 1, label: 'จ.' },
    { id: 2, label: 'อ.' },
    { id: 3, label: 'พ.' },
    { id: 4, label: 'พฤ.' },
    { id: 5, label: 'ศ.' },
    { id: 6, label: 'ส.' },
    { id: 0, label: 'อา.' }
  ]
  const [saving, setSaving] = useState(false)

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) console.error(error)
    else setAlerts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setTitle('')
    setBody('')
    setTargetRole('all')
    setSendPattern('everyday')
    setSelectedDays([])
    setScheduleTime('09:00')
    setScheduleDate('')
  }

  const handleEdit = (alert) => {
    setEditingId(alert.id)
    setTitle(alert.title)
    setBody(alert.body)
    setTargetRole(alert.target_role)
    setSendPattern(
      !alert.is_recurring ? 'once' :
      (alert.days_of_week && alert.days_of_week.length > 0) ? 'custom' : 'everyday'
    )
    setSelectedDays(alert.days_of_week || [])
    setScheduleTime(alert.scheduled_time.substring(0, 5))
    setScheduleDate(alert.scheduled_date || '')
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!title.trim() || !body.trim() || !scheduleTime) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }
    if (sendPattern === 'once' && !scheduleDate) {
      toast.error('กรุณาระบุวันที่แจ้งเตือน')
      return
    }
    if (sendPattern === 'custom' && selectedDays.length === 0) {
      toast.error('กรุณาเลือกวันอย่างน้อย 1 วัน')
      return
    }

    setSaving(true)
    const payload = {
      title: title.trim(),
      body: body.trim(),
      target_role: targetRole,
      is_recurring: sendPattern !== 'once',
      days_of_week: sendPattern === 'custom' ? selectedDays : (sendPattern === 'everyday' ? [] : null),
      scheduled_time: scheduleTime.length === 5 ? scheduleTime + ':00' : scheduleTime,
      scheduled_date: sendPattern === 'once' ? scheduleDate : null,
      is_active: true
    }

    let error = null
    if (editingId) {
      const { error: updateError } = await supabase.from('scheduled_notifications').update(payload).eq('id', editingId)
      error = updateError
    } else {
      const { error: insertError } = await supabase.from('scheduled_notifications').insert(payload)
      error = insertError
    }

    setSaving(false)
    if (error) {
      toast.error('เกิดข้อผิดพลาดในการบันทึก')
      console.error(error)
    } else {
      toast.success(editingId ? 'แก้ไขการแจ้งเตือนสำเร็จ' : 'ตั้งค่าการแจ้งเตือนสำเร็จ')
      closeModal()
      fetchAlerts()
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบการแจ้งเตือนนี้?')) return
    const toastId = toast.loading('กำลังลบ...')
    const { error } = await supabase.from('scheduled_notifications').delete().eq('id', id)
    if (error) {
      toast.error('ลบล้มเหลว', { id: toastId })
    } else {
      toast.success('ลบสำเร็จ', { id: toastId })
      setAlerts(alerts.filter(a => a.id !== id))
    }
  }

  const toggleActive = async (id, currentStatus) => {
    const { error } = await supabase
      .from('scheduled_notifications')
      .update({ is_active: !currentStatus })
      .eq('id', id)
    if (!error) {
      fetchAlerts()
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-content flex items-center gap-2">
            <Bell size={24} className="text-primary-600" />
            ระบบแจ้งเตือน (Push Notifications)
          </h1>
          <p className="text-sm text-content-muted mt-1">
            ตั้งเวลาส่งข้อความแจ้งเตือนไปยังโทรศัพท์ของนักศึกษาหรือพี่เลี้ยง
          </p>
        </div>
        <button onClick={() => { closeModal(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> สร้างการแจ้งเตือน
        </button>
      </div>

      <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-200 text-sm flex gap-3">
        <Clock size={20} className="text-blue-600 shrink-0" />
        <div>
          <p className="font-semibold mb-1">สถานะระบบ Background Worker</p>
          <p>ฟีเจอร์นี้ต้องใช้ Supabase Edge Functions เพื่อทำงานในพื้นหลัง (ทุกๆ 1 นาที) หากคุณพบว่าการแจ้งเตือนไม่ทำงาน กรุณาตรวจสอบว่าได้ทำการ Deploy ฟังก์ชัน <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900">scheduled-alerts</code> และเปิดการทำงานของ pg_cron แล้ว</p>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center text-gray-400 py-10">
            <Bell size={48} className="mx-auto mb-3 opacity-20" />
            <p>ยังไม่มีการตั้งค่าการแจ้งเตือน</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface text-content-muted text-xs uppercase font-semibold border-b">
                <tr>
                  <th className="px-4 py-3">ข้อความ</th>
                  <th className="px-4 py-3">ผู้รับ</th>
                  <th className="px-4 py-3">เวลาส่ง</th>
                  <th className="px-4 py-3 text-center">สถานะ</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {alerts.map(a => (
                  <tr key={a.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-content">{a.title}</p>
                      <p className="text-content-muted text-xs truncate max-w-[250px]">{a.body}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        a.target_role === 'student' ? 'bg-blue-100 text-blue-700' :
                        a.target_role === 'mentor' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        <Users size={12} />
                        {a.target_role === 'all' ? 'ทุกคน' : a.target_role === 'student' ? 'นักศึกษา' : a.target_role === 'mentor' ? 'พี่เลี้ยง' : a.target_role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium flex items-center gap-1">
                          <Clock size={14} className="text-primary-500" />
                          {a.scheduled_time.substring(0, 5)} น.
                        </span>
                        <span className="text-xs text-content-muted flex items-center gap-1 mt-0.5">
                          {a.is_recurring ? (
                            <><RefreshCw size={12} /> {(!a.days_of_week || a.days_of_week.length === 0) ? 'ทุกวัน' : `ส่งเฉพาะ ${a.days_of_week.length} วัน/สัปดาห์`}</>
                          ) : (
                            <><CalendarIcon size={12} /> {a.scheduled_date ? format(new Date(a.scheduled_date), 'd MMM yyyy', { locale: th }) : ''}</>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => toggleActive(a.id, a.is_active)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${a.is_active ? 'bg-success' : 'bg-gray-300'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${a.is_active ? 'translate-x-5' : 'translate-x-0'}`}></span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(a)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="แก้ไข">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(a.id)} className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors" title="ลบ">
                          <Trash2 size={16} />
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

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-surface">
              <h3 className="font-bold text-lg text-content flex items-center gap-2">
                <Bell size={20} className="text-primary-600" />
                {editingId ? 'แก้ไขการแจ้งเตือน' : 'ตั้งเวลาแจ้งเตือนใหม่'}
              </h3>
              <button onClick={() => !saving && closeModal()} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-content-muted mb-1">หัวข้อแจ้งเตือน</label>
                  <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="เช่น: ประกาศสำคัญ, เตือนเข้างาน" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-content-muted mb-1">เนื้อหาข้อความ</label>
                  <textarea required value={body} onChange={e => setBody(e.target.value)} className="textarea h-20" placeholder="พิมพ์ข้อความที่ต้องการส่ง..." />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-content-muted mb-1">ส่งถึงใคร?</label>
                    <select value={targetRole} onChange={e => setTargetRole(e.target.value)} className="input">
                      <option value="all">ทุกคนในระบบ</option>
                      <option value="student">นักศึกษาทั้งหมด</option>
                      <option value="mentor">พี่เลี้ยงทั้งหมด</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-content-muted mb-1">เวลาส่ง (น.)</label>
                    <input type="time" required value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="input" />
                  </div>
                </div>

                <div className="border rounded-xl p-4 bg-surface mt-4">
                  <label className="block text-sm font-medium text-content mb-3">รูปแบบการส่ง</label>
                  <div className="flex gap-4 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="recurring" checked={sendPattern === 'everyday'} onChange={() => setSendPattern('everyday')} className="text-primary-600 focus:ring-primary-500" />
                      <span className="text-sm">ส่งทุกวัน</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="recurring" checked={sendPattern === 'custom'} onChange={() => setSendPattern('custom')} className="text-primary-600 focus:ring-primary-500" />
                      <span className="text-sm">เลือกวันส่งเอง</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="recurring" checked={sendPattern === 'once'} onChange={() => setSendPattern('once')} className="text-primary-600 focus:ring-primary-500" />
                      <span className="text-sm">ส่งแค่วันเดียว</span>
                    </label>
                  </div>
                  
                  {sendPattern === 'custom' && (
                    <div className="mt-4 pt-3 border-t">
                      <label className="block text-sm font-medium text-content-muted mb-2">เลือกวันในสัปดาห์</label>
                      <div className="flex gap-2 flex-wrap">
                        {WEEKDAYS.map(day => {
                          const isSelected = selectedDays.includes(day.id)
                          return (
                            <button
                              key={day.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) setSelectedDays(prev => prev.filter(d => d !== day.id))
                                else setSelectedDays(prev => [...prev, day.id])
                              }}
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                                isSelected 
                                  ? 'bg-primary-600 text-white shadow-sm' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {day.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {sendPattern === 'once' && (
                    <div className="mt-4 pt-3 border-t">
                      <label className="block text-sm font-medium text-content-muted mb-1">วันที่ต้องการส่ง</label>
                      <input type="date" required={sendPattern === 'once'} value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="input" />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={closeModal} disabled={saving} className="btn-ghost">ยกเลิก</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'กำลังบันทึก...' : 'บันทึกการแจ้งเตือน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
