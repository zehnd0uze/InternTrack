import { useState, useMemo } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { th as thLocale, enUS } from 'date-fns/locale'
import { getThaiHolidays } from '../../lib/holidays'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = {
  'th': thLocale,
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

export default function ScheduleCalendar({ events, onSelectEvent, onSelectSlot, view, onView, date, onNavigate }) {
  const messages = useMemo(() => ({
    allDay: 'ทั้งวัน',
    previous: 'ย้อนกลับ',
    next: 'ถัดไป',
    today: 'วันนี้',
    month: 'เดือน',
    week: 'สัปดาห์',
    day: 'วัน',
    agenda: 'กำหนดการ',
    date: 'วันที่',
    time: 'เวลา',
    event: 'กิจกรรม',
    noEventsInRange: 'ไม่มีกิจกรรมในช่วงเวลานี้',
    showMore: total => `+ ดูเพิ่มเติม (${total})`
  }), [])

  // Event styling
  const eventPropGetter = (event) => {
    if (event.isHoliday) {
      return {
        style: {
          backgroundColor: '#ef4444', // Red for holidays
          borderRadius: '6px',
          opacity: 0.9,
          color: 'white',
          border: 'none',
          display: 'block',
          fontSize: '0.85rem',
          padding: '2px 6px',
          fontWeight: 'bold'
        }
      }
    }
    return {
      style: {
        backgroundColor: event.color || '#3b82f6',
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
        fontSize: '0.85rem',
        padding: '2px 6px'
      }
    }
  }

  // Inject holidays into events
  const displayEvents = useMemo(() => {
    const currentYear = date ? date.getFullYear() : new Date().getFullYear()
    const holidays = getThaiHolidays(currentYear).map(h => {
      const [year, month, day] = h.date.split('-').map(Number)
      return {
        id: `holiday-${h.date}`,
        title: `🇹🇭 ${h.name}`,
        start: new Date(year, month - 1, day),
        end: new Date(year, month - 1, day),
        allDay: true,
        isHoliday: true
      }
    })
    return [...holidays, ...(events || [])]
  }, [events, date])

  return (
    <div className="h-[600px] w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <Calendar
        culture="th"
        localizer={localizer}
        events={displayEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        selectable={!!onSelectSlot}
        messages={messages}
        eventPropGetter={eventPropGetter}
        view={view}
        onView={onView}
        date={date}
        onNavigate={onNavigate}
        popup
      />
    </div>
  )
}
