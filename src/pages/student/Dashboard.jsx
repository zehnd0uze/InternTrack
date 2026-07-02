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
  return format(new Date(dt), 'd MMM yyyy', { locale: th })
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

function getPreviousWorkingDay(date = new Date()) {
  const d = new Date(date)
  do {
    d.setDate(d.getDate() - 1)
  } while (d.getDay() === 0 || d.getDay() === 6) // Skip Sunday(0) and Saturday(6)
  return format(d, 'yyyy-MM-dd')
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
  useTimeAlerts(today)
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
  const handleClockIn = async () => {
    if (isReadOnly) { toast('โหมดดูอย่างเดียว — ไม่สามารถเช็คอินได้', { icon: '🔒' }); return }
    const now = new Date()
    const hour = now.getHours()

    if (hour < 6) toast('⚠️ คุณกำลังเข้างานก่อน 06:00 น.', { icon: '⚠️', duration: 5000 })
    if (hour >= 22) toast('⚠️ คุณกำลังเข้างานหลัง 22:00 น.', { icon: '⚠️', duration: 5000 })

    setClockLoading(true)
    const todayStr = format(now, 'yyyy-MM-dd')

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

    // Check for missed previous working day
    const prevDateStr = getPreviousWorkingDay(now)
    const { data: prevRecord } = await supabase
      .from('attendance')
      .select('id')
      .eq('user_id', effectiveUserId)
      .eq('date', prevDateStr)
      .maybeSingle()

    if (!prevRecord) {
      setClockLoading(false)
      setMissedDate(prevDateStr)
      setMissedCheckInTime('')
      setMissedCheckOutTime('')
      setMissedLogText('')
      setMissedCheckInModal(true)
      return
    }

    const { error } = await supabase.from('attendance').insert({
      user_id: effectiveUserId,
      check_in: now.toISOString(),
      date: todayStr,
    })

    setClockLoading(false)
    if (error) {
      toast.error('เช็คอินล้มเหลว กรุณาลองใหม่')
    } else {
      toast.success('เช็คอินสำเร็จ!')
      fetchToday()
    }
  }

  // ---- Clock Out ----
  const doClockOut = async () => {
    if (isReadOnly) { setClockOutModal(false); toast('โหมดดูอย่างเดียว — ไม่สามารถเช็คเอาท์ได้', { icon: '🔒' }); return }
    setClockOutModal(false)
    if (!today?.id) return

    const now = new Date()
    const hour = now.getHours()
    if (hour >= 22) toast('⚠️ คุณกำลังเลิกงานหลัง 22:00 น.', { icon: '⚠️', duration: 5000 })

    // Calculate hours
    const checkIn = new Date(today.check_in)
    const diffHours = (now - checkIn) / 3600000
    const lunchDeduct = diffHours > 4 ? 1 : 0
    const hoursWorked = Math.max(0, diffHours - lunchDeduct)

    setClockLoading(true)
    const { error } = await supabase
      .from('attendance')
      .update({
        check_out: now.toISOString(),
        hours_worked: parseFloat(hoursWorked.toFixed(2)),
      })
      .eq('id', today.id)

    setClockLoading(false)
    clearInterval(timerRef.current)

    if (error) {
      toast.error('เช็คเอาท์ล้มเหลว กรุณาลองใหม่')
    } else {
      const msg = lunchDeduct > 0
        ? `เช็คเอาท์สำเร็จ! ทำงาน ${hoursWorked.toFixed(1)} ชั่วโมง (หักพัก 1 ชม.)`
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

      if (tIn && tOut) {
         const diffHours = (tOut - tIn) / 3600000
         const lunchDeduct = diffHours > 4 ? 1 : 0
         hoursWorked = Math.max(0, diffHours - lunchDeduct)
      }
      
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
    if (!missedCheckInTime || !missedCheckOutTime) {
      toast.error('กรุณาระบุเวลาเข้าและออกให้ครบถ้วน'); return;
    }
    
    // Create Date objects from inputs
    const tIn = new Date(`${missedDate}T${missedCheckInTime}`)
    const tOut = new Date(`${missedDate}T${missedCheckOutTime}`)

    if (tOut <= tIn) {
      toast.error('เวลาออกต้องมากกว่าเวลาเข้า'); return;
    }

    setMissedSaving(true)
    const diffHours = (tOut - tIn) / 3600000
    const lunchDeduct = diffHours > 4 ? 1 : 0
    const hoursWorked = Math.max(0, diffHours - lunchDeduct)

    // 1. Insert Attendance
    const { data: newAtt, error: attErr } = await supabase.from('attendance').insert({
      user_id: effectiveUserId,
      date: missedDate,
      check_in: tIn.toISOString(),
      check_out: tOut.toISOString(),
      hours_worked: parseFloat(hoursWorked.toFixed(2))
    }).select('id').single()

    if (attErr) {
      toast.error('บันทึกเวลาล้มเหลว')
      setMissedSaving(false)
      return
    }

    // 2. Insert Daily Log if provided
    if (missedLogText.trim() && newAtt?.id) {
      await supabase.from('daily_logs').insert({
        user_id: effectiveUserId,
        attendance_id: newAtt.id,
        date: missedDate,
        log_text: missedLogText.trim(),
        mood: 'neutral'
      })
    }

    setMissedSaving(false)
    toast.success('บันทึกเวลาย้อนหลังสำเร็จ')
    setMissedCheckInModal(false)
    fetchHistory()
    fetchStats()
    
    // Proceed with clock in for today
    handleClockIn()
  }

  // ---- Status Indicator ----
  const clockStatus = !today ? 'none' : today.check_out ? 'done' : 'working'

  const targetHours = profile?.target_hours || 1596
  const progressPct = Math.min(100, (stats.totalHours / targetHours) * 100)

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
        <div className={`card border-2 transition-all duration-300 ${
          clockStatus === 'working' ? 'border-success/30 bg-green-50/30' :
          clockStatus === 'done'    ? 'border-border' :
                                      'border-primary-100'
        }`}>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Status */}
            <div className="flex flex-col items-center gap-2 min-w-[140px]">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                clockStatus === 'working' ? 'bg-success/10 clock-pulse' :
                clockStatus === 'done'    ? 'bg-surface-hover' :
                                           'bg-primary-50'
              }`}>
                {clockStatus === 'working' && <Clock size={32} className="text-success" />}
                {clockStatus === 'done'    && <CheckCircle size={32} className="text-gray-400" />}
                {clockStatus === 'none'    && <Clock size={32} className="text-primary-400" />}
              </div>

              <div className="text-center">
                <p className={`font-bold text-lg ${
                  clockStatus === 'working' ? 'text-success' :
                  clockStatus === 'done'    ? 'text-content-muted' :
                                             'text-gray-400'
                }`}>
                  {clockStatus === 'working' ? 'กำลังทำงาน' :
                   clockStatus === 'done'    ? 'เลิกงานแล้ว' :
                                              'ยังไม่เริ่ม'}
                </p>
                {clockStatus === 'working' && (
                  <p className="text-2xl font-mono font-bold text-success mt-1">
                    {formatElapsed(elapsed)}
                  </p>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-2 text-sm text-center sm:text-left">
              {today?.check_in && (
                <div className="flex items-center justify-center sm:justify-start gap-2 text-content-muted">
                  <span className="font-medium text-content-muted">เวลาเข้า:</span>
                  <span className="font-semibold text-content">{formatThaiTime(today.check_in)}</span>
                </div>
              )}
              {today?.check_out && (
                <div className="flex items-center justify-center sm:justify-start gap-2 text-content-muted">
                  <span className="font-medium text-content-muted">เวลาออก:</span>
                  <span className="font-semibold text-content">{formatThaiTime(today.check_out)}</span>
                </div>
              )}
              {today?.hours_worked && (
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="font-medium text-content-muted">ชั่วโมงวันนี้:</span>
                  <span className="font-semibold text-success">{parseFloat(today.hours_worked).toFixed(1)} ชม.</span>
                  {parseFloat(today.hours_worked) > 4 && (
                    <span className="text-xs text-gray-400">(หักพัก 1 ชม.)</span>
                  )}
                </div>
              )}
              {clockStatus === 'none' && (
                <p className="text-gray-400 italic">ยังไม่มีข้อมูลการเข้างานวันนี้ กดปุ่มเช็คอินเพื่อเริ่ม</p>
              )}
            </div>

            {/* Button */}
            <div>
              {clockStatus === 'none' && (
                <button
                  id="clock-in-btn"
                  onClick={handleClockIn}
                  disabled={clockLoading}
                  className="btn-success btn-xl clock-pulse disabled:opacity-60 min-w-[140px]"
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
                  className="btn-danger btn-xl clock-pulse-red disabled:opacity-60 min-w-[140px]"
                >
                  {clockLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><XCircle size={20} /> เช็คเอาท์</>
                  )}
                </button>
              )}
              {clockStatus === 'done' && (
                <div className="text-center text-gray-400">
                  <CheckCircle size={32} className="mx-auto mb-1" />
                  <p className="text-sm font-medium">เสร็จสิ้นวันนี้</p>
                </div>
              )}
            </div>
          </div>
        </div>
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
                {stats.totalHours.toFixed(1)} / {targetHours} ชม.
                <span className="ml-2 text-content-muted font-normal hidden sm:inline">({stats.totalDays || 0} / 228 วัน)</span>
              </span>
            </div>
            <div className="progress-bar mb-2">
              <div
                className="progress-fill bg-gradient-to-r from-primary-600 to-primary-400"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{progressPct.toFixed(1)}% สำเร็จ</span>
              <span>เหลืออีก {Math.max(0, targetHours - stats.totalHours).toFixed(1)} ชม.</span>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="stat-card border-l-4 border-primary-500">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-primary-500" />
                <span className="stat-label">ชั่วโมงสัปดาห์นี้</span>
              </div>
              <span className="stat-value">{stats.weekHours.toFixed(1)} <span className="text-sm font-normal text-gray-400">ชม.</span></span>
            </div>
            <div className="stat-card border-l-4 border-success">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-success" />
                <span className="stat-label">วันที่เข้าเดือนนี้</span>
              </div>
              <span className="stat-value">{stats.monthDays} <span className="text-sm font-normal text-gray-400">วัน</span></span>
            </div>
            <div className="stat-card border-l-4 border-warning">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-warning" />
                <span className="stat-label">ชั่วโมงคงเหลือ</span>
              </div>
              <span className="stat-value">{Math.max(0, targetHours - stats.totalHours).toFixed(1)} <span className="text-sm font-normal text-gray-400">ชม.</span></span>
            </div>
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
