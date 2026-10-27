import { useState, useEffect, useCallback, useRef } from 'react'
import { format, startOfWeek, startOfMonth, differenceInSeconds, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { Clock, CheckCircle, XCircle, BookOpen, Calendar, Target, AlertTriangle, Printer, Eye, Download, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useViewAs } from '../../contexts/ViewAsContext'
import { SkeletonCard, SkeletonTable } from '../../components/ui/Skeleton'
import ConfirmModal from '../../components/ui/ConfirmModal'
import AttendanceCalendar from '../../components/ui/AttendanceCalendar'
import { format as formatDate } from 'date-fns'
import * as XLSX from 'xlsx'
import { useTimeAlerts } from '../../hooks/useTimeAlerts'
import { useWebPush } from '../../hooks/useWebPush'
import { loadHolidays } from '../../lib/holidays'
import { calcHoursWorked, getPreviousWorkingDay, isWorkingDay, hasApprovedLeave, clockIn, clockOut } from '../../lib/attendance'
// ---- Helpers ----
function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatThaiTime(dt) {
  if (!dt) return '-'
  return format(new Date(dt), 'HH:mm น.', { locale: th })
}

function formatThaiDate(dt) {
  if (!dt) return '-'
  let dateObj
  if (typeof dt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dt)) {
    dateObj = new Date(dt + 'T12:00:00')
  } else {
    dateObj = new Date(dt)
  }
  const dayName = format(dateObj, 'E', { locale: th })
  return `${dayName} ${format(dateObj, 'd MMM yyyy', { locale: th })}`
}

function toLocalDatetimeInput(dtStr) {
  if (!dtStr) return ''
  const d = new Date(dtStr)
  if (isNaN(d.getTime())) return ''
  const tzoffset = d.getTimezoneOffset() * 60000 
  return new Date(d.getTime() - tzoffset).toISOString().slice(0, 16)
}

const STATUS_MAP = {
  approved: { label: 'อนุมัติแล้ว', cls: 'badge-success' },
  pending:  { label: 'รอการอนุมัติ', cls: 'badge-warning' },
  rejected: { label: 'ถูกปฏิเสธ', cls: 'badge-danger' },
  none:     { label: 'ยังไม่ส่ง', cls: 'badge-gray' },
}

export default function StudentDashboard() {
  const { user, profile, isAdmin } = useAuth()
  const { viewingAs } = useViewAs()
  // In preview mode, fetch data for the viewed student instead of the logged-in user
  const effectiveUserId = viewingAs?.id ?? user.id
  const isReadOnly = !!viewingAs
  const canEditLog = !isReadOnly || isAdmin

  // --- State ---
  const [today, setToday] = useState(null) // today's attendance record

  // Initialize time alerts
  useTimeAlerts(today, profile)
  const { isSubscribed, subscribeUser } = useWebPush(user)

  const [loading, setLoading] = useState(true)
  const [elapsed, setElapsed] = useState(0)

  const [stats, setStats] = useState({ totalHours: 0, weekHours: 0, monthDays: 0 })
  const [badges, setBadges] = useState([])
  const [statsLoading, setStatsLoading] = useState(true)

  const [logText, setLogText] = useState('')
  const [logMood, setLogMood] = useState('neutral')
  const [logSaved, setLogSaved] = useState(false)
  const [logLoading, setLogLoading] = useState(false)

  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const ROWS = 10

  const [viewMode, setViewMode] = useState('list') // 'list' or 'calendar'

  const [clockOutModal, setClockOutModal] = useState(false)
  const [clockLoading, setClockLoading] = useState(false)

  // Edit Log Modal
  const [editLogModal, setEditLogModal] = useState(false)
  const [editingAttendance, setEditingAttendance] = useState(null)
  const [editLogText, setEditLogText] = useState('')
  const [editLogMood, setEditLogMood] = useState('neutral')
  const [editCheckIn, setEditCheckIn] = useState('')
  const [editCheckOut, setEditCheckOut] = useState('')
  const [editLogLoading, setEditLogLoading] = useState(false)
  const [editLogSaving, setEditLogSaving] = useState(false)

  // Missed Check-In Modal
  const [missedCheckInModal, setMissedCheckInModal] = useState(false)
  const [missedAttId, setMissedAttId] = useState(null)
  const [missedDate, setMissedDate] = useState('')
  const [missedCheckInTime, setMissedCheckInTime] = useState('')
  const [missedCheckOutTime, setMissedCheckOutTime] = useState('')
  const [missedLogText, setMissedLogText] = useState('')
  const [missedSaving, setMissedSaving] = useState(false)

  const timerRef = useRef(null)

  // ---- Data Fetching ----
  const fetchToday = useCallback(async () => {
    setLoading(true)
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', effectiveUserId)
      .eq('date', todayStr)
      .maybeSingle()

    if (error) console.error(error)
    setToday(data || null)
    setLoading(false)
  }, [effectiveUserId])

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')

    const [allRes, weekRes, monthRes] = await Promise.all([
      supabase.from('attendance').select('hours_worked, date, check_in').eq('user_id', effectiveUserId).not('check_out', 'is', null),
      supabase.from('attendance').select('hours_worked').eq('user_id', effectiveUserId).gte('date', weekStart).not('check_out', 'is', null),
      supabase.from('attendance').select('id').eq('user_id', effectiveUserId).gte('date', monthStart).not('check_out', 'is', null),
    ])

    const totalHours = (allRes.data || []).reduce((s, r) => s + (parseFloat(r.hours_worked) || 0), 0)
    const weekHours  = (weekRes.data || []).reduce((s, r) => s + (parseFloat(r.hours_worked) || 0), 0)
    const monthDays  = (monthRes.data || []).length
    const totalDays  = (allRes.data || []).length

    // Compute Badges
    const newBadges = []
    if (totalHours >= 100) {
      newBadges.push({ id: 'marathoner', icon: '💯', title: 'Marathoner', desc: 'สะสมชั่วโมงทะลุ 100 ชม.', color: 'text-rose-500 bg-rose-50 border-rose-200' })
    }
    
    // Check all attendance for Early Bird / Weekend Warrior
    let hasEarly = false
    let hasWeekend = false
    ;(allRes.data || []).forEach(r => {
      if (!hasEarly && r.check_in) {
        const h = new Date(r.check_in).getHours()
        const m = new Date(r.check_in).getMinutes()
        if (h < 8 || (h === 8 && m === 0)) hasEarly = true
      }
      if (!hasWeekend && r.date) {
        const d = new Date(r.date).getDay()
        if (d === 0 || d === 6) hasWeekend = true
      }
    })

    if (hasEarly) {
      newBadges.push({ id: 'early', icon: '🌅', title: 'Early Bird', desc: 'เช็คอินก่อน 08:00 น.', color: 'text-amber-500 bg-amber-50 border-amber-200' })
    }
    if (hasWeekend) {
      newBadges.push({ id: 'weekend', icon: '👑', title: 'Weekend Warrior', desc: 'เข้างานวันหยุดเสาร์-อาทิตย์', color: 'text-purple-600 bg-purple-50 border-purple-200' })
    }
    if (monthDays >= 5) {
      newBadges.push({ id: 'fire', icon: '🔥', title: 'On Fire', desc: 'ทำงาน 5+ วันในเดือนนี้', color: 'text-orange-500 bg-orange-50 border-orange-200' })
    }

    setBadges(newBadges)
    setStats({ totalHours, weekHours, monthDays, totalDays })
    setStatsLoading(false)
  }, [effectiveUserId])

  const fetchLog = useCallback(async () => {
    if (!today?.id) return
    const { data } = await supabase
      .from('daily_logs')
      .select('log_text, mood')
      .eq('attendance_id', today.id)
      .maybeSingle()
    if (data?.log_text) {
      setLogText(data.log_text)
      if (data.mood) setLogMood(data.mood)
      setLogSaved(true)
    }
  }, [today?.id])

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)

    // Build query for effective user (view-as or own)
    let q2 = supabase
      .from('attendance')
      .select('*', { count: 'exact' })
      .eq('user_id', effectiveUserId)
      .order('date', { ascending: false })

    if (dateFrom) q2 = q2.gte('date', dateFrom)
    if (dateTo)   q2 = q2.lte('date', dateTo)
    q2 = q2.range((historyPage - 1) * ROWS, historyPage * ROWS - 1)

    const { data, count, error } = await q2
    if (error) console.error(error)
    setHistory(data || [])
    setHistoryTotal(count || 0)
    setHistoryLoading(false)
  }, [effectiveUserId, historyPage, dateFrom, dateTo])

  const handleDownloadExcel = async () => {
    const toastId = toast.loading('กำลังโหลดข้อมูล...')
    try {
      // Fetch student info
      const { data: studentInfo } = await supabase
        .from('users')
        .select('full_name, student_code')
        .eq('id', effectiveUserId)
        .maybeSingle()
        
      const studentName = studentInfo?.full_name || 'ไม่ทราบชื่อ'
      const studentCode = studentInfo?.student_code || '-'

      const { data, error } = await supabase
        .from('attendance')
        .select(`
          date, check_in, check_out, hours_worked,
          daily_logs ( log_text )
        `)
        .eq('user_id', effectiveUserId)
        .order('date', { ascending: false })

      if (error) throw error

      const rows = data.map(r => [
        formatDate(new Date(r.date), 'dd/MM/yyyy'),
        r.check_in ? formatThaiTime(r.check_in) : '-',
        r.check_out ? formatThaiTime(r.check_out) : '-',
        parseFloat(r.hours_worked || 0).toFixed(2),
        r.daily_logs?.[0]?.log_text || '',
        r.check_out ? 'เสร็จสิ้น' : 'ยังไม่เสร็จ'
      ])

      const header = ['วันที่', 'เวลาเข้า', 'เวลาออก', 'ชั่วโมง', 'บันทึกประจำวัน', 'สถานะ']
      const sheetData = [
        [`รายงานการฝึกงาน: ${studentName} (รหัสนักศึกษา: ${studentCode})`],
        [],
        header, 
        ...rows
      ]
      
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')
      
      XLSX.writeFile(workbook, `รายงานการฝึกงาน_${formatDate(new Date(), 'yyyyMMdd')}.xlsx`)
      toast.success('ดาวน์โหลด Excel แล้ว!', { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('ดาวน์โหลดล้มเหลว', { id: toastId })
    }
  }

  // ---- Timer ----
  useEffect(() => {
    if (today?.check_in && !today?.check_out) {
      const start = new Date(today.check_in).getTime()
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000))
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [today])

  // ---- Effects ----
  useEffect(() => { fetchToday() }, [fetchToday])
  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { fetchHistory() }, [fetchHistory])
  useEffect(() => { fetchLog() }, [fetchLog])

  // ---- Clock In ----
  // skipPrevDayCheck: student confirmed the missed day was a day off
  const handleClockIn = async ({ skipPrevDayCheck = false } = {}) => {
    if (isReadOnly && !isAdmin) { toast('โหมดดูอย่างเดียว — ไม่สามารถเช็คอินได้', { icon: '🔒' }); return }
    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')

    // Admin custom time check-in
    if (isReadOnly && isAdmin) {
      setMissedAttId(null)
      setMissedDate(todayStr)
      setMissedCheckInTime(profile?.work_start_time ? profile.work_start_time.slice(0, 5) : '08:00')
      setMissedCheckOutTime('')
      setMissedLogText('')
      setMissedCheckInModal(true)
      return
    }
    const hour = now.getHours()

    if (hour < 6) toast('⚠️ คุณกำลังเข้างานก่อน 06:00 น.', { icon: '⚠️', duration: 5000 })
    if (hour >= 22) toast('⚠️ คุณกำลังเข้างานหลัง 22:00 น.', { icon: '⚠️', duration: 5000 })

    setClockLoading(true)

    // Double-check no existing record
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('user_id', effectiveUserId)
      .eq('date', todayStr)
      .maybeSingle()

    if (existing) {
      toast.error('คุณได้เช็คอินวันนี้แล้ว')
      setClockLoading(false)
      return
    }

    // Check for missed check-out on ANY previous day
    const { data: incompleteRecord } = await supabase
      .from('attendance')
      .select('id, date, check_in')
      .eq('user_id', effectiveUserId)
      .lt('date', todayStr)
      .is('check_out', null)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (incompleteRecord) {
      setClockLoading(false)
      setMissedAttId(incompleteRecord.id)
      setMissedDate(incompleteRecord.date)
      setMissedCheckInTime(incompleteRecord.check_in ? format(new Date(incompleteRecord.check_in), 'HH:mm') : '')
      setMissedCheckOutTime(profile?.work_end_time ? profile.work_end_time.slice(0, 5) : '')
      setMissedLogText('')
      setMissedCheckInModal(true)
      return
    }

    // Check for missed previous working day (admin-managed holidays included)
    await loadHolidays()
    const prevDateStr = getPreviousWorkingDay(now)

    // Skip the previous-day check if that day is before the student's internship start date
    // (e.g. student just updated their profile today and internship starts today or later)
    const internshipStart = profile?.internship_start_date || null
    const prevDayBeforeInternship = internshipStart && prevDateStr < internshipStart

    if (!prevDayBeforeInternship && !skipPrevDayCheck) {
      const { data: prevRecord } = await supabase
        .from('attendance')
        .select('id')
        .eq('user_id', effectiveUserId)
        .eq('date', prevDateStr)
        .maybeSingle()

      // An approved leave covers the gap — don't force a fake check-in
      if (!prevRecord && !(await hasApprovedLeave(effectiveUserId, prevDateStr))) {
        setClockLoading(false)
        setMissedAttId(null)
        setMissedDate(prevDateStr)
        setMissedCheckInTime(profile?.work_start_time ? profile.work_start_time.slice(0, 5) : '')
        setMissedCheckOutTime(profile?.work_end_time ? profile.work_end_time.slice(0, 5) : '')
        setMissedLogText('')
        setMissedCheckInModal(true)
        return
      }
    }

    const { error } = await clockIn(effectiveUserId)

    setClockLoading(false)
    if (error) {
      toast.error(error.code === '23505' ? 'คุณได้เช็คอินวันนี้แล้ว' : 'เช็คอินล้มเหลว กรุณาลองใหม่')
    } else {
      toast.success('เช็คอินสำเร็จ!')
      fetchToday()
    }
  }

  // ---- Clock Out ----
  const doClockOut = async () => {
    if (isReadOnly && !isAdmin) { setClockOutModal(false); toast('โหมดดูอย่างเดียว — ไม่สามารถเช็คเอาท์ได้', { icon: '🔒' }); return }
    
    // Admin custom time check-out
    if (isReadOnly && isAdmin) {
      setClockOutModal(false)
      if (!today?.id) return
      setMissedAttId(today.id)
      setMissedDate(today.date)
      setMissedCheckInTime(today.check_in ? format(new Date(today.check_in), 'HH:mm') : '')
      setMissedCheckOutTime(profile?.work_end_time ? profile.work_end_time.slice(0, 5) : '17:00')
      setMissedLogText('')
      setMissedCheckInModal(true)
      return
    }
    setClockOutModal(false)
    if (!today?.id) return

    const now = new Date()
    const hour = now.getHours()
    if (hour >= 22) toast('⚠️ คุณกำลังเลิกงานหลัง 22:00 น.', { icon: '⚠️', duration: 5000 })

    const checkIn = new Date(today.check_in)
    const diffHours = (now - checkIn) / 3600000

    // Check for late checkout
    let isLateCheckout = false
    if (profile?.work_end_time) {
      const [h, m] = profile.work_end_time.split(':').map(Number)
      const expectedEnd = new Date(now)
      expectedEnd.setHours(h, m, 0, 0)
      if (now > expectedEnd && (now - expectedEnd) / 3600000 > 2) {
        isLateCheckout = true
      }
    } else if (diffHours > 12) {
      isLateCheckout = true
    }

    if (isLateCheckout) {
      setClockOutModal(false)
      toast('คุณกำลังเช็คเอาท์ช้าเกินไป กรุณาระบุเวลาที่ออกจริง', { icon: '⚠️' })
      setMissedAttId(today.id)
      setMissedDate(today.date)
      setMissedCheckInTime(format(checkIn, 'HH:mm'))
      setMissedCheckOutTime(profile?.work_end_time ? profile.work_end_time.slice(0, 5) : '')
      setMissedLogText('')
      setMissedCheckInModal(true)
      return
    }

    setClockLoading(true)
    const { data: saved, error } = await clockOut(today)

    setClockLoading(false)
    clearInterval(timerRef.current)

    if (error) {
      toast.error('เช็คเอาท์ล้มเหลว กรุณาลองใหม่')
    } else {
      const hoursWorked = parseFloat(saved?.hours_worked ?? calcHoursWorked(today.check_in, now) ?? 0)
      const lunchDeduct = diffHours - hoursWorked
      const msg = lunchDeduct > 0.01
        ? `เช็คเอาท์สำเร็จ! ทำงาน ${hoursWorked.toFixed(1)} ชั่วโมง (หักพัก ${Math.round(lunchDeduct * 60)} นาที)`
        : `เช็คเอาท์สำเร็จ! ทำงาน ${hoursWorked.toFixed(1)} ชั่วโมง`
      toast.success(msg)
      fetchToday()
      fetchStats()
      fetchHistory()
    }
  }

  // ---- Save Log ----
  const handleSaveLog = async () => {
    if (!canEditLog) { toast('โหมดดูอย่างเดียว — ไม่สามารถบันทึกได้', { icon: '🔒' }); return }
    if (!today?.id) { toast.error('ต้องเช็คอินก่อนบันทึกบันทึกประจำวัน'); return }
    if (!logText.trim()) { toast.error('กรุณากรอกสรุปงานประจำวัน'); return }
    setLogLoading(true)
    const todayStr = format(new Date(), 'yyyy-MM-dd')

    // Upsert
    const { error } = await supabase.from('daily_logs').upsert({
      user_id: effectiveUserId,
      attendance_id: today.id,
      log_text: logText.trim(),
      mood: logMood,
      date: todayStr,
    }, { onConflict: 'attendance_id' })

    setLogLoading(false)
    if (error) {
      toast.error('บันทึกล้มเหลว กรุณาลองใหม่')
    } else {
      toast.success('บันทึกประจำวันบันทึกแล้ว ✅')
      setLogSaved(true)
    }
  }

  // ---- Edit Log from History ----
  const handleOpenEditLog = async (attendance) => {
    setEditingAttendance(attendance)
    setEditLogText('')
    setEditLogMood('neutral')
    setEditCheckIn(toLocalDatetimeInput(attendance.check_in))
    setEditCheckOut(toLocalDatetimeInput(attendance.check_out))
    setEditLogModal(true)
    setEditLogLoading(true)

    const { data } = await supabase
      .from('daily_logs')
      .select('log_text, mood')
      .eq('attendance_id', attendance.id)
      .maybeSingle()
    
    if (data) {
      setEditLogText(data.log_text || '')
      setEditLogMood(data.mood || 'neutral')
    }
    setEditLogLoading(false)
  }

  const handleSaveEditLog = async () => {
    if (!canEditLog) { toast('โหมดดูอย่างเดียว — ไม่สามารถบันทึกได้', { icon: '🔒' }); return }
    if (!editLogText.trim()) { toast.error('กรุณากรอกสรุปงานประจำวัน'); return }
    setEditLogSaving(true)
    const todayStr = editingAttendance.date

    // Save Daily Log
    const { error: logError } = await supabase.from('daily_logs').upsert({
      user_id: effectiveUserId,
      attendance_id: editingAttendance.id,
      log_text: editLogText.trim(),
      mood: editLogMood,
      date: todayStr,
    }, { onConflict: 'attendance_id' })

    let attError = null
    if (isAdmin) {
      let hoursWorked = 0
      const tIn = editCheckIn ? new Date(editCheckIn) : null
      const tOut = editCheckOut ? new Date(editCheckOut) : null

      if (tIn && tOut) hoursWorked = calcHoursWorked(tIn, tOut) || 0
      
      const payload = {}
      payload.check_in = tIn ? tIn.toISOString() : null
      payload.check_out = tOut ? tOut.toISOString() : null
      payload.hours_worked = parseFloat(hoursWorked.toFixed(2))

      const { error } = await supabase.from('attendance').update(payload).eq('id', editingAttendance.id)
      attError = error
    }

    setEditLogSaving(false)
    if (logError || attError) {
      toast.error('บันทึกล้มเหลว กรุณาลองใหม่')
    } else {
      toast.success('อัปเดตข้อมูลแล้ว ✅')
      setEditLogModal(false)
      fetchHistory()
      fetchStats()
      // Update today's log view if editing today's attendance
      if (today?.id === editingAttendance.id) {
        fetchToday()
        setLogText(editLogText.trim())
        setLogMood(editLogMood)
      }
    }
  }

  // ---- Save Missed Check-In ----
  const handleSaveMissedCheckIn = async () => {
    if (!missedCheckInTime) {
      toast.error('กรุณาระบุเวลาเข้างาน'); return;
    }
    if (!missedCheckOutTime && !(isAdmin && isReadOnly && !missedAttId)) {
      toast.error('กรุณาระบุเวลาออกงาน'); return;
    }
    
    const tIn = new Date(`${missedDate}T${missedCheckInTime}`)
    let tOut = null
    let hoursWorked = 0

    if (missedCheckOutTime) {
      tOut = new Date(`${missedDate}T${missedCheckOutTime}`)
      if (tOut <= tIn) {
        toast.error('เวลาออกต้องมากกว่าเวลาเข้า'); return;
      }
      hoursWorked = calcHoursWorked(tIn, tOut)
    }

    setMissedSaving(true)

    let newAttId = missedAttId
    if (missedAttId) {
      const payload = { check_in: tIn.toISOString() }
      if (tOut) {
        payload.check_out = tOut.toISOString()
        payload.hours_worked = parseFloat(hoursWorked.toFixed(2))
      }
      const { error: attErr } = await supabase.from('attendance').update(payload).eq('id', missedAttId)
      
      if (attErr) {
        toast.error('บันทึกเวลาล้มเหลว')
        setMissedSaving(false)
        return
      }
    } else {
      const payload = {
        user_id: effectiveUserId,
        date: missedDate,
        check_in: tIn.toISOString()
      }
      if (tOut) {
        payload.check_out = tOut.toISOString()
        payload.hours_worked = parseFloat(hoursWorked.toFixed(2))
      }
      const { data: newAtt, error: attErr } = await supabase.from('attendance').insert(payload).select('id').single()

      if (attErr) {
        toast.error('บันทึกเวลาล้มเหลว')
        setMissedSaving(false)
        return
      }
      newAttId = newAtt.id
    }

    // 2. Insert Daily Log if provided
    if (missedLogText.trim() && newAttId) {
      await supabase.from('daily_logs').upsert({
        user_id: effectiveUserId,
        attendance_id: newAttId,
        date: missedDate,
        log_text: missedLogText.trim(),
        mood: 'neutral'
      }, { onConflict: 'attendance_id' })
    }

    setMissedSaving(false)
    toast.success('บันทึกเวลาย้อนหลังสำเร็จ')
    setMissedCheckInModal(false)
    fetchHistory()
    fetchStats()
    fetchToday()
    
    // Proceed with clock in for today ONLY IF fixing a past day
    if (missedDate < format(new Date(), 'yyyy-MM-dd')) {
      handleClockIn()
    }
  }

  // ---- Status Indicator ----
  const clockStatus = !today ? 'none' : today.check_out ? 'done' : 'working'

  let targetDays = 228
  let targetHours = profile?.target_hours || 1596

  if (profile?.internship_start_date && profile?.internship_end_date && profile?.work_start_time && profile?.work_end_time) {
    const start = parseISO(profile.internship_start_date)
    const end = parseISO(profile.internship_end_date)
    let count = 0
    let curr = new Date(start)
    while (curr <= end) {
      if (isWorkingDay(format(curr, 'yyyy-MM-dd'))) count++
      curr.setDate(curr.getDate() + 1)
    }
    targetDays = count > 0 ? count : 1 // prevent 0
    
    const dayIn = new Date(`2000-01-01T${profile.work_start_time}`)
    const dayOut = new Date(`2000-01-01T${profile.work_end_time}`)
    if (dayOut <= dayIn) dayOut.setDate(dayOut.getDate() + 1)
    const dailyHours = calcHoursWorked(dayIn, dayOut) || 0
    
    targetHours = targetDays * Math.max(0, dailyHours)
    if (targetHours === 0) targetHours = 1 // prevent division by zero
  }

  const progressPct = Math.min(100, (stats.totalHours / targetHours) * 100)

  const lunchMinutes = today?.check_out && today?.hours_worked != null
    ? Math.round(((new Date(today.check_out) - new Date(today.check_in)) / 3600000 - parseFloat(today.hours_worked)) * 60)
    : 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold text-content">
          {isReadOnly ? (
            <span className="flex items-center gap-2">
              <Eye size={20} className="text-amber-500" />
              แดชบอร์ดของ {viewingAs?.full_name}
            </span>
          ) : 'แดชบอร์ดนักศึกษา'}
        </h1>
        <p className="text-sm text-content-muted mt-0.5">
          {format(new Date(), 'EEEE, d MMMM yyyy', { locale: th })}
        </p>
      </div>

      {/* ---- Time Tracking Card ---- */}
      {loading ? (
        <SkeletonCard className="h-48" />
      ) : (
        <section
          aria-label="สถานะการลงเวลาวันนี้"
          className={`card relative overflow-hidden transition-colors duration-300 ${
            clockStatus === 'working' ? 'border-success/40' : ''
          }`}
        >
          {clockStatus === 'working' && (
            <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-success" />
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Status + timer */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center ${
                clockStatus === 'working' ? 'bg-success/10 text-success' :
                clockStatus === 'done'    ? 'bg-surface-hover text-content-muted' :
                                           'bg-primary-500/10 text-primary-600 dark:text-primary-300'
              }`}>
                {clockStatus === 'done' ? <CheckCircle size={28} /> : <Clock size={28} />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                  {clockStatus === 'working' ? 'กำลังทำงาน' :
                   clockStatus === 'done'    ? 'เลิกงานแล้ว' :
                                              'ยังไม่เริ่มงาน'}
                </p>
                {clockStatus === 'working' && (
                  <p className="text-3xl font-bold text-content tabular-nums leading-tight">
                    {formatElapsed(elapsed)}
                  </p>
                )}
                {clockStatus === 'done' && today?.hours_worked != null && (
                  <p className="text-3xl font-bold text-content tabular-nums leading-tight">
                    {parseFloat(today.hours_worked).toFixed(1)} <span className="text-base font-medium text-content-muted">ชม.</span>
                  </p>
                )}
                {clockStatus === 'none' && (
                  <p className="text-base text-content-muted mt-0.5">กดเช็คอินเมื่อเริ่มงาน ระบบจะบันทึกเวลาจากเซิร์ฟเวอร์</p>
                )}

                {today?.check_in && (
                  <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <div className="flex gap-1.5">
                      <dt className="text-content-muted">เข้า</dt>
                      <dd className="font-semibold text-content tabular-nums">{formatThaiTime(today.check_in)}</dd>
                    </div>
                    {today?.check_out && (
                      <div className="flex gap-1.5">
                        <dt className="text-content-muted">ออก</dt>
                        <dd className="font-semibold text-content tabular-nums">{formatThaiTime(today.check_out)}</dd>
                      </div>
                    )}
                    {lunchMinutes > 0 && (
                      <div className="text-content-muted">หักพัก {lunchMinutes} นาที</div>
                    )}
                  </dl>
                )}
              </div>
            </div>

            {/* Action */}
            <div className="sm:shrink-0">
              {clockStatus === 'none' && (
                <button
                  id="clock-in-btn"
                  onClick={handleClockIn}
                  disabled={clockLoading}
                  aria-busy={clockLoading}
                  className="btn-success btn-xl w-full sm:w-auto sm:min-w-[160px]"
                >
                  {clockLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Clock size={20} /> เช็คอิน</>
                  )}
                </button>
              )}
              {clockStatus === 'working' && (
                <button
                  id="clock-out-btn"
                  onClick={() => setClockOutModal(true)}
                  disabled={clockLoading}
                  aria-busy={clockLoading}
                  className="btn-danger btn-xl w-full sm:w-auto sm:min-w-[160px]"
                >
                  {clockLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><XCircle size={20} /> เช็คเอาท์</>
                  )}
                </button>
              )}
              {clockStatus === 'done' && (
                <span className="badge-success text-sm px-3 py-1 gap-1">
                  <CheckCircle size={14} /> เสร็จสิ้นวันนี้
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ---- Badges Section ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!statsLoading && badges.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {badges.map(b => (
              <div key={b.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm ${b.color}`} title={b.desc}>
                <span className="text-xl leading-none">{b.icon}</span>
                <span className="text-sm font-bold tracking-wide">{b.title}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Push Notification Toggle */}
        {!isReadOnly && !isSubscribed && (
          <button 
            onClick={subscribeUser}
            className="btn-ghost btn-sm flex items-center gap-2 ml-auto text-primary-600 hover:text-primary-700 hover:bg-primary-50"
          >
            <AlertTriangle size={16} />
            เปิดรับแจ้งเตือน (Push Notifications)
          </button>
        )}
      </div>

      {/* ---- Progress Section ---- */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <>
          {/* Progress Bar */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target size={18} className="text-primary-700" />
                <span className="font-semibold text-content">ความคืบหน้าชั่วโมงสะสม</span>
              </div>
              <span className="text-sm font-bold text-primary-700">
                {stats.totalHours.toFixed(1)} / {targetHours.toFixed(1)} ชม.
                <span className="ml-2 text-content-muted font-normal hidden sm:inline">({stats.totalDays || 0} / {targetDays} วัน)</span>
              </span>
            </div>
            <div className="progress-bar mb-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progressPct)} aria-label="ความคืบหน้าชั่วโมงสะสม">
              <div
                className="progress-fill bg-gradient-to-r from-primary-600 to-primary-400"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-content-muted tabular-nums">
              <span>{progressPct.toFixed(1)}% สำเร็จ</span>
              <span>เหลืออีก {Math.max(0, targetHours - stats.totalHours).toFixed(1)} ชม.</span>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Clock,    label: 'ชั่วโมงสัปดาห์นี้', value: stats.weekHours.toFixed(1), unit: 'ชม.', tone: 'bg-primary-500/10 text-primary-600 dark:text-primary-300' },
              { icon: Calendar, label: 'วันที่เข้าเดือนนี้', value: stats.monthDays, unit: 'วัน', tone: 'bg-success/10 text-success' },
              { icon: Target,   label: 'ชั่วโมงคงเหลือ', value: Math.max(0, targetHours - stats.totalHours).toFixed(1), unit: 'ชม.', tone: 'bg-warning/10 text-warning' },
            ].map(({ icon: Icon, label, value, unit, tone }) => (
              <div key={label} className="stat-card">
                <div className="flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${tone}`}><Icon size={16} /></span>
                  <span className="stat-label">{label}</span>
                </div>
                <span className="stat-value">{value} <span className="text-sm font-normal text-content-muted">{unit}</span></span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ---- Daily Log ---- */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-primary-700" />
            <h2 className="font-semibold text-content">บันทึกประจำวัน</h2>
            <span className="text-xs text-gray-400">({format(new Date(), 'd MMM yyyy', { locale: th })})</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDownloadExcel} className="btn-secondary btn-sm flex items-center gap-1">
              <Download size={16} /> Excel
            </button>
            <Link to={`/student/print-log?studentId=${effectiveUserId}`} target="_blank" className="btn-primary btn-sm flex items-center gap-1">
              <Printer size={16} /> พิมพ์รายงาน
            </Link>
          </div>
        </div>

        {!today?.id && (
          <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-100 dark:border-yellow-500/20 rounded-lg px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400 flex items-center gap-2 mb-4">
            <AlertTriangle size={16} />
            ต้องเช็คอินก่อนจึงจะบันทึกบันทึกประจำวันได้
          </div>
        )}

        <textarea
          id="daily-log-textarea"
          className={`textarea h-28 ${!canEditLog ? 'opacity-70 cursor-not-allowed bg-background' : ''}`}
          placeholder={!canEditLog ? 'โหมดดูอย่างเดียว' : 'สรุปงานที่ทำวันนี้... (ไม่เกิน 500 ตัวอักษร)'}
          maxLength={500}
          value={logText}
          onChange={e => { if (canEditLog) { setLogText(e.target.value); setLogSaved(false) } }}
          disabled={!today?.id || !canEditLog}
          readOnly={!canEditLog}
        />
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm font-medium text-content-muted">ความรู้สึกวันนี้:</span>
          <div className="flex items-center gap-1">
            {[
              { id: 'great', emoji: '🤩', label: 'ยอดเยี่ยม' },
              { id: 'happy', emoji: '😊', label: 'มีความสุข' },
              { id: 'neutral', emoji: '😐', label: 'เฉยๆ' },
              { id: 'stressed', emoji: '😫', label: 'เครียด' },
              { id: 'bad', emoji: '😢', label: 'แย่มาก' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => { if (canEditLog) { setLogMood(m.id); setLogSaved(false); } }}
                disabled={!today?.id || !canEditLog}
                title={m.label}
                className={`p-1.5 rounded-full text-xl transition-transform hover:scale-110 disabled:opacity-50 disabled:hover:scale-100 ${logMood === m.id ? 'bg-primary-100 ring-2 ring-primary-500 scale-110' : 'grayscale opacity-60 hover:grayscale-0 hover:opacity-100'}`}
              >
                {m.emoji}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs ${logText.length > 450 ? 'text-danger' : 'text-gray-400'}`}>
            {logText.length} / 500 ตัวอักษร
          </span>
          <button
            id="save-log-btn"
            onClick={handleSaveLog}
            disabled={logLoading || !today?.id || logSaved}
            className="btn-primary btn-sm disabled:opacity-50"
          >
            {logLoading ? 'กำลังบันทึก...' : logSaved ? '✅ บันทึกแล้ว' : 'บันทึก'}
          </button>
        </div>
      </div>

      {/* ---- Attendance History ---- */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-primary-700" />
            <h2 className="font-semibold text-content">ประวัติการเข้างาน</h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* View Toggle */}
            <div className="flex bg-surface-hover p-1 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'list' ? 'bg-card text-content shadow-sm' : 'text-content-muted hover:text-content-muted'}`}
              >
                รายการ
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'calendar' ? 'bg-card text-content shadow-sm' : 'text-content-muted hover:text-content-muted'}`}
              >
                ปฏิทิน
              </button>
            </div>

            {/* Date Filter (Only in list view) */}
            {viewMode === 'list' && (
              <div className="flex flex-wrap gap-2">
                <div>
                  <label className="text-xs text-content-muted block mb-1">ตั้งแต่</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => { setDateFrom(e.target.value); setHistoryPage(1) }}
                    className="input text-xs py-1.5 w-36"
                  />
                </div>
                <div>
                  <label className="text-xs text-content-muted block mb-1">ถึง</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => { setDateTo(e.target.value); setHistoryPage(1) }}
                    className="input text-xs py-1.5 w-36"
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => { setDateFrom(''); setDateTo(''); setHistoryPage(1) }}
                    className="btn-ghost btn-sm self-end"
                  >
                    ล้าง
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {viewMode === 'calendar' ? (
          <div className="-mx-4 sm:mx-0 mt-4">
            <AttendanceCalendar />
          </div>
        ) : (
          <>
            {historyLoading ? (
              <SkeletonTable rows={5} cols={5} />
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">ยังไม่มีข้อมูลการเข้างาน</p>
                <p className="text-sm mt-1">กดปุ่ม "เช็คอิน" เพื่อเริ่มบันทึกชั่วโมง</p>
              </div>
            ) : (
              <>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>วันที่</th>
                        <th>เวลาเข้า</th>
                        <th>เวลาออก</th>
                        <th>ชั่วโมง</th>
                        <th>สถานะ</th>
                        <th className="text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map(row => (
                        <tr key={row.id}>
                          <td className="font-medium text-content">{formatThaiDate(row.date)}</td>
                          <td>{formatThaiTime(row.check_in)}</td>
                          <td>{formatThaiTime(row.check_out)}</td>
                          <td>
                            {row.hours_worked
                              ? <span className="font-semibold text-success">{parseFloat(row.hours_worked).toFixed(1)}</span>
                              : <span className="text-gray-400">-</span>
                            }
                          </td>
                          <td>
                            <span className={`badge ${row.check_out ? 'badge-success' : 'badge-warning'}`}>
                              {row.check_out ? 'เสร็จสิ้น' : 'กำลังทำงาน'}
                            </span>
                          </td>
                          <td className="text-center">
                            <button
                              onClick={() => handleOpenEditLog(row)}
                              className="btn-ghost btn-sm text-primary-600 hover:text-primary-700 p-1"
                              title="แก้ไข/ดู บันทึกประจำวัน"
                            >
                              <BookOpen size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4 text-sm">
                  <span className="text-content-muted">
                    แสดง {Math.min((historyPage - 1) * ROWS + 1, historyTotal)}–{Math.min(historyPage * ROWS, historyTotal)} จาก {historyTotal} รายการ
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                      disabled={historyPage === 1}
                      className="btn-secondary btn-sm disabled:opacity-40"
                    >
                      ก่อนหน้า
                    </button>
                    <button
                      onClick={() => setHistoryPage(p => p + 1)}
                      disabled={historyPage * ROWS >= historyTotal}
                      className="btn-secondary btn-sm disabled:opacity-40"
                    >
                      ถัดไป
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Clock Out Confirm Modal */}
      {clockOutModal && (
        <ConfirmModal
          title="ยืนยันการเช็คเอาท์"
          message="คุณต้องการเลิกงานตอนนี้ใช่หรือไม่? ระบบจะคำนวณชั่วโมงทำงานโดยอัตโนมัติ"
          confirmLabel="เช็คเอาท์"
          onConfirm={doClockOut}
          onCancel={() => setClockOutModal(false)}
        />
      )}

      {/* Missed Check-In / Admin Custom Time Modal */}
      {missedCheckInModal && (
        <div className="modal-overlay" onClick={() => !missedSaving && setMissedCheckInModal(false)}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-content flex items-center gap-2">
                <Clock size={20} className="text-primary-600" />
                {isAdmin && isReadOnly ? 'กำหนดเวลาเข้า-ออกงาน (แอดมิน)' : 'บันทึกเวลาย้อนหลัง'}
              </h3>
              <button onClick={() => setMissedCheckInModal(false)} disabled={missedSaving} className="text-gray-400 hover:text-content-muted">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              {isAdmin && isReadOnly ? (
                <p className="text-sm text-content-muted bg-amber-50 text-amber-700 p-2 rounded-lg border border-amber-200">
                  คุณกำลังกำหนดเวลาแทนนักศึกษาในโหมดแอดมิน
                </p>
              ) : (
                <p className="text-sm text-content-muted">พบว่าคุณยังไม่ได้เช็คเอาท์หรือลืมเช็คอินในวันที่ <strong>{formatThaiDate(missedDate)}</strong></p>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">เวลาเข้างาน</label>
                  <input
                    type="time"
                    className="input py-2 text-sm"
                    value={missedCheckInTime}
                    onChange={e => setMissedCheckInTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">เวลาออกงาน {isAdmin && isReadOnly && !missedAttId && <span className="text-gray-400 font-normal">(เว้นว่างได้)</span>}</label>
                  <input
                    type="time"
                    className="input py-2 text-sm"
                    value={missedCheckOutTime}
                    onChange={e => setMissedCheckOutTime(e.target.value)}
                  />
                </div>
              </div>

              {!missedAttId && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">บันทึกประจำวัน (เว้นว่างได้)</label>
                  <textarea
                    className="textarea h-24"
                    placeholder="สรุปงานสั้นๆ..."
                    maxLength={500}
                    value={missedLogText}
                    onChange={e => setMissedLogText(e.target.value)}
                  />
                </div>
              )}

              {!missedAttId && !(isAdmin && isReadOnly) && missedDate < format(new Date(), 'yyyy-MM-dd') && (
                <div className="rounded-lg border border-border bg-surface-hover p-3 text-sm">
                  <p className="text-content-muted">วันนั้นเป็นวันหยุด (เช่น วันหยุดพิเศษ / วันพระ) หรือไม่ได้มาฝึกงาน?</p>
                  <button
                    type="button"
                    onClick={() => { setMissedCheckInModal(false); handleClockIn({ skipPrevDayCheck: true }) }}
                    disabled={missedSaving}
                    className="mt-2 font-semibold text-primary-700 dark:text-primary-300 hover:underline"
                  >
                    ข้ามวันนี้ แล้วเช็คอินวันนี้เลย →
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setMissedCheckInModal(false)} disabled={missedSaving} className="btn-secondary btn-sm">ยกเลิก</button>
                <button onClick={handleSaveMissedCheckIn} disabled={missedSaving} className="btn-primary btn-sm">
                  {missedSaving ? 'กำลังบันทึก...' : 'บันทึกเวลา'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Log Modal */}
      {editLogModal && (
        <div className="modal-overlay" onClick={() => !editLogSaving && setEditLogModal(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-content flex items-center gap-2">
                <BookOpen size={20} className="text-primary-600" />
                บันทึกประจำวัน ({formatThaiDate(editingAttendance?.date)})
              </h3>
              <button onClick={() => setEditLogModal(false)} disabled={editLogSaving} className="text-gray-400 hover:text-content-muted">
                <X size={20} />
              </button>
            </div>
            
            {editLogLoading ? (
               <div className="py-8 text-center text-gray-400">กำลังโหลด...</div>
            ) : (
               <div className="space-y-4">
                  {isAdmin && (
                    <div className="grid grid-cols-2 gap-4 bg-red-50/50 border border-red-100 rounded-lg p-3 mb-2">
                      <div className="col-span-2 text-xs font-semibold text-red-600 flex items-center gap-1">
                        <AlertTriangle size={14} /> ส่วนสำหรับแอดมิน: แก้ไขเวลาเข้า-ออก
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">เวลาเข้างาน</label>
                        <input
                          type="datetime-local"
                          className="input py-1.5 text-sm"
                          value={editCheckIn}
                          onChange={e => setEditCheckIn(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">เวลาออกงาน</label>
                        <input
                          type="datetime-local"
                          className="input py-1.5 text-sm"
                          value={editCheckOut}
                          onChange={e => setEditCheckOut(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                  <textarea
                    className={`textarea h-32 ${!canEditLog ? 'opacity-70 cursor-not-allowed bg-background' : ''}`}
                    placeholder={!canEditLog ? 'โหมดดูอย่างเดียว' : 'สรุปงานที่ทำ... (ไม่เกิน 500 ตัวอักษร)'}
                    maxLength={500}
                    value={editLogText}
                    onChange={e => { if (canEditLog) setEditLogText(e.target.value) }}
                    readOnly={!canEditLog}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-content-muted">ความรู้สึก:</span>
                    <div className="flex items-center gap-1">
                      {[
                        { id: 'great', emoji: '🤩', label: 'ยอดเยี่ยม' },
                        { id: 'happy', emoji: '😊', label: 'มีความสุข' },
                        { id: 'neutral', emoji: '😐', label: 'เฉยๆ' },
                        { id: 'stressed', emoji: '😫', label: 'เครียด' },
                        { id: 'bad', emoji: '😢', label: 'แย่มาก' }
                      ].map(m => (
                        <button
                          key={m.id}
                          onClick={() => { if (canEditLog) setEditLogMood(m.id) }}
                          disabled={!canEditLog}
                          title={m.label}
                          className={`p-1.5 rounded-full text-xl transition-transform hover:scale-110 disabled:opacity-50 disabled:hover:scale-100 ${editLogMood === m.id ? 'bg-primary-100 ring-2 ring-primary-500 scale-110' : 'grayscale opacity-60 hover:grayscale-0 hover:opacity-100'}`}
                        >
                          {m.emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
                    <span className={`text-xs ${editLogText.length > 450 ? 'text-danger' : 'text-gray-400'}`}>
                      {editLogText.length} / 500 ตัวอักษร
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => setEditLogModal(false)} disabled={editLogSaving} className="btn-secondary btn-sm">ปิด</button>
                      {canEditLog && (
                        <button onClick={handleSaveEditLog} disabled={editLogSaving} className="btn-primary btn-sm">
                          {editLogSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                      )}
                    </div>
                  </div>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
