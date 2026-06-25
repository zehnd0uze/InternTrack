import React, { useState, useEffect, useCallback } from 'react'
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval 
} from 'date-fns'
import { th } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Clock, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

// Helper for Thai time formatting
const formatThaiTime = (dt) => {
  if (!dt) return '-'
  return format(new Date(dt), 'HH:mm', { locale: th })
}

// Thai Public Holidays
const FIXED_HOLIDAYS = {
  '01-01': 'วันขึ้นปีใหม่',
  '04-06': 'วันจักรี',
  '04-13': 'วันสงกรานต์',
  '04-14': 'วันสงกรานต์',
  '04-15': 'วันสงกรานต์',
  '05-01': 'วันแรงงานแห่งชาติ',
  '05-04': 'วันฉัตรมงคล',
  '06-03': 'วันเฉลิมฯ พระราชินี',
  '07-28': 'วันเฉลิมฯ รัชกาลที่ 10',
  '08-12': 'วันแม่แห่งชาติ',
  '10-13': 'วันนวมินทรมหาราช',
  '10-23': 'วันปิยมหาราช',
  '12-05': 'วันพ่อแห่งชาติ',
  '12-10': 'วันรัฐธรรมนูญ',
  '12-31': 'วันสิ้นปี'
}

const LUNAR_HOLIDAYS_2026 = {
  '2026-03-03': 'วันมาฆบูชา',
  '2026-07-20': 'วันอาสาฬหบูชา',
  '2026-07-21': 'วันเข้าพรรษา'
}

export default function AttendanceCalendar() {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [attendanceMap, setAttendanceMap] = useState({})
  const [loading, setLoading] = useState(true)

  const fetchMonthData = useCallback(async (date) => {
    setLoading(true)
    const startDate = format(startOfWeek(startOfMonth(date)), 'yyyy-MM-dd')
    const endDate = format(endOfWeek(endOfMonth(date)), 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) {
      console.error('Error fetching attendance for calendar:', error)
      setLoading(false)
      return
    }

    const map = {}
    if (data) {
      data.forEach(record => {
        map[record.date] = record
      })
    }
    setAttendanceMap(map)
    setLoading(false)
  }, [user.id])

  useEffect(() => {
    fetchMonthData(currentDate)
  }, [currentDate, fetchMonthData])

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const dateFormat = "MMMM yyyy"
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  const weekDays = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
        <h2 className="text-lg font-bold text-gray-800 capitalize">
          {format(currentDate, dateFormat, { locale: th })}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
            วันนี้
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
        {weekDays.map((day, i) => (
          <div key={i} className={`p-3 text-center text-sm font-semibold ${i === 0 || i === 6 ? 'text-danger' : 'text-gray-600'}`}>
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-[100px] sm:auto-rows-[120px] bg-gray-200 gap-[1px]">
        {days.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const mmdd = dateStr.substring(5)
          const record = attendanceMap[dateStr]
          const isToday = isSameDay(day, new Date())
          const isCurrentMonth = isSameMonth(day, monthStart)
          const holiday = LUNAR_HOLIDAYS_2026[dateStr] || FIXED_HOLIDAYS[mmdd]

          return (
            <div 
              key={i} 
              className={`bg-white p-2 flex flex-col gap-1 transition-colors hover:bg-gray-50
                ${!isCurrentMonth ? 'opacity-50 bg-gray-50/50' : ''}
              `}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full shrink-0
                    ${isToday ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-700'}
                  `}>
                    {format(day, 'd')}
                  </span>
                  {holiday && (
                    <span className="text-[10px] font-medium text-danger bg-danger/10 px-1.5 py-0.5 rounded truncate" title={holiday}>
                      {holiday}
                    </span>
                  )}
                </div>
                {record && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${record.check_out ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                    {record.check_out ? 'เสร็จสิ้น' : 'ทำงาน'}
                  </span>
                )}
              </div>

              {/* Data Block */}
              <div className="flex-1 mt-1 overflow-y-auto hide-scrollbar space-y-1">
                {loading ? (
                  isCurrentMonth && <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4"></div>
                ) : record ? (
                  <>
                    <div className="text-xs flex items-center gap-1 text-gray-600 bg-gray-50 p-1 rounded border border-gray-100">
                      <Clock size={12} className="text-primary-500 shrink-0" />
                      <span className="truncate">{formatThaiTime(record.check_in)}</span>
                      {record.check_out && (
                        <>
                          <span className="text-gray-400">-</span>
                          <span className="truncate">{formatThaiTime(record.check_out)}</span>
                        </>
                      )}
                    </div>
                    {record.hours_worked != null && (
                      <div className="text-xs font-semibold text-success flex items-center gap-1 bg-success/5 p-1 rounded border border-success/10">
                        <CheckCircle size={12} className="shrink-0" />
                        <span className="truncate">{parseFloat(record.hours_worked).toFixed(1)} ชม.</span>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
