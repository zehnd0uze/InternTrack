// Shared attendance rules. The database (migration 024) is the source of
// truth for hours_worked; these helpers mirror it for previews and fallbacks.
import { format } from 'date-fns'
import { supabase } from './supabase'
import { isThaiHoliday, getThaiHolidays } from './holidays'

// Lunch: deduct up to 1h, only the part beyond 4h (no cliff at exactly 4h).
export function calcHoursWorked(checkIn, checkOut) {
  if (!checkIn || !checkOut) return null
  const diff = (new Date(checkOut) - new Date(checkIn)) / 3600000
  if (diff <= 0) return null
  const lunch = Math.min(1, Math.max(0, diff - 4))
  return Math.round((diff - lunch) * 100) / 100
}

export function isWorkingDay(dateStr) {
  const day = new Date(`${dateStr}T00:00:00`).getDay()
  return day !== 0 && day !== 6 && !isThaiHoliday(dateStr)
}

// Previous Mon–Fri that is not a Thai public holiday.
export function getPreviousWorkingDay(date = new Date()) {
  const d = new Date(date)
  let str
  do {
    d.setDate(d.getDate() - 1)
    str = format(d, 'yyyy-MM-dd')
  } while (!isWorkingDay(str))
  return str
}

export async function hasApprovedLeave(userId, dateStr) {
  const { data } = await supabase
    .from('leave_requests')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .lte('start_date', dateStr)
    .gte('end_date', dateStr)
    .limit(1)
  return (data || []).length > 0
}

export function getHolidayDatesBetween(startStr, endStr) {
  const startYear = parseInt(startStr.slice(0, 4))
  const endYear = parseInt(endStr.slice(0, 4))
  const dates = []
  for (let y = startYear; y <= endYear; y++) {
    getThaiHolidays(y).forEach(h => { if (h.date >= startStr && h.date <= endStr) dates.push(h.date) })
  }
  return dates
}

// PostgREST "function not found": migration 024 not applied yet.
const isMissingRpc = (error) => error?.code === 'PGRST202' || error?.code === '42883'

export async function generateRetroactiveAttendance({ userId, startDate, endDate, startTime, endTime }) {
  const args = {
    p_user_id: userId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_start_time: startTime,
    p_end_time: endTime,
  }
  const res = await supabase.rpc('generate_retroactive_attendance', {
    ...args, p_skip_dates: getHolidayDatesBetween(startDate, endDate),
  })
  return isMissingRpc(res.error) ? supabase.rpc('generate_retroactive_attendance', args) : res
}

export async function clockIn(userId) {
  const { data, error } = await supabase.rpc('clock_in')
  if (!isMissingRpc(error)) return { data, error }
  const now = new Date()
  return supabase.from('attendance')
    .insert({ user_id: userId, check_in: now.toISOString(), date: format(now, 'yyyy-MM-dd') })
    .select().single()
}

export async function clockOut(attendance) {
  const { data, error } = await supabase.rpc('clock_out', { p_attendance_id: attendance.id })
  if (!isMissingRpc(error)) return { data, error }
  const now = new Date()
  return supabase.from('attendance')
    .update({ check_out: now.toISOString(), hours_worked: calcHoursWorked(attendance.check_in, now) })
    .eq('id', attendance.id)
    .select().single()
}
