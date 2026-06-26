import { useState, useEffect, useCallback } from 'react'
import { Calendar as CalendarIcon, X, Clock, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import ScheduleCalendar from '../../components/shared/ScheduleCalendar'
import toast from 'react-hot-toast'
import format from 'date-fns/format'
import { th } from 'date-fns/locale'

export default function StudentSchedule() {
  const { user, profile } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const [view, setView] = useState('month')
  const [date, setDate] = useState(new Date())

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)

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

  const handleSelectEvent = (event) => {
    setSelectedEvent(event)
    setShowModal(true)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="text-primary-600" /> ตารางงานจากพี่เลี้ยง
          </h1>
          <p className="text-gray-500 mt-1">ดูกำหนดการ นัดหมาย และงานที่พี่เลี้ยงมอบหมาย</p>
        </div>
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
          onSelectSlot={null} // Read only
        />
      )}

      {/* View Event Modal */}
      {showModal && selectedEvent && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: selectedEvent.color || '#3b82f6' }} 
                />
                <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                  {selectedEvent.title}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm flex flex-col gap-2 border border-gray-100">
                <div className="flex items-start gap-2">
                  <Clock size={16} className="text-gray-400 mt-0.5" />
                  <div>
                    <span className="text-gray-500 text-xs block mb-0.5">เวลาเริ่ม</span>
                    <span className="font-medium text-gray-900">
                      {format(new Date(selectedEvent.start_time), 'EEEE d MMMM yyyy HH:mm', { locale: th })} น.
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock size={16} className="text-gray-400 mt-0.5 opacity-0" />
                  <div>
                    <span className="text-gray-500 text-xs block mb-0.5">เวลาสิ้นสุด</span>
                    <span className="font-medium text-gray-900">
                      {format(new Date(selectedEvent.end_time), 'EEEE d MMMM yyyy HH:mm', { locale: th })} น.
                    </span>
                  </div>
                </div>
              </div>

              {selectedEvent.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-2">
                    <FileText size={14} /> รายละเอียด
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap border border-gray-100">
                    {selectedEvent.description}
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button onClick={() => setShowModal(false)} className="btn-primary">
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
