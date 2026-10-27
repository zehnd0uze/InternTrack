import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { CalendarOff, Plus, RotateCcw, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { getThaiHolidays, loadHolidays, hasVerifiedHolidayList } from '../../lib/holidays'

function formatThaiDate(dateStr) {
  const d = parseISO(dateStr)
  return `${format(d, 'EEE', { locale: th })} ${format(d, 'd MMM', { locale: th })} ${d.getFullYear() + 543}`
}

export default function AdminHolidays() {
  const { user } = useAuth()
  const [year, setYear] = useState(new Date().getFullYear())
  const [custom, setCustom] = useState([]) // rows from public.holidays
  const [tableMissing, setTableMissing] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [, setVersion] = useState(0)

  const fetchCustom = useCallback(async () => {
    const { data, error } = await supabase
      .from('holidays')
      .select('date, name, is_day_off')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .order('date')
    setTableMissing(!!error)
    setCustom(data || [])
    await loadHolidays({ force: true })
    setVersion(v => v + 1)
  }, [year])

  useEffect(() => { fetchCustom() }, [fetchCustom])

  const effective = getThaiHolidays(year)
  const workingOverrides = custom.filter(h => !h.is_day_off)

  const upsert = async (row) => {
    setSaving(true)
    const { error } = await supabase.from('holidays').upsert({ ...row, created_by: user.id }, { onConflict: 'date' })
    setSaving(false)
    if (error) { toast.error('บันทึกล้มเหลว: ' + error.message); return false }
    await fetchCustom()
    return true
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newDate || !newName.trim()) { toast.error('กรุณาระบุวันที่และชื่อวันหยุด'); return }
    if (await upsert({ date: newDate, name: newName.trim(), is_day_off: true })) {
      toast.success('เพิ่มวันหยุดแล้ว')
      setNewDate(''); setNewName('')
    }
  }

  // Built-in day → mark as a working day; custom day → drop the override
  const handleRemove = async (h) => {
    if (h.source === 'builtin') {
      if (await upsert({ date: h.date, name: h.name, is_day_off: false })) toast.success('ตั้งเป็นวันทำงานแล้ว')
      return
    }
    const { error } = await supabase.from('holidays').delete().eq('date', h.date)
    if (error) toast.error('ลบไม่สำเร็จ'); else { toast.success('นำออกแล้ว'); fetchCustom() }
  }

  const handleRestore = async (date) => {
    const { error } = await supabase.from('holidays').delete().eq('date', date)
    if (error) toast.error('คืนค่าไม่สำเร็จ'); else { toast.success('คืนค่าเป็นวันหยุดแล้ว'); fetchCustom() }
  }

  const thisYear = new Date().getFullYear()
  const years = [thisYear - 1, thisYear, thisYear + 1, thisYear + 2]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-content">วันหยุด</h1>
          <p className="text-sm text-content-muted mt-0.5">
            ระบบใช้รายการนี้ตัดสินว่าวันไหนไม่ต้องลงเวลา (เช่น ตอนเตือนให้บันทึกเวลาย้อนหลัง)
          </p>
        </div>
        <select value={year} onChange={e => setYear(Number(e.target.value))} className="select w-auto" aria-label="เลือกปี">
          {years.map(y => <option key={y} value={y}>พ.ศ. {y + 543}</option>)}
        </select>
      </div>

      {tableMissing && (
        <div className="card border-warning/40 flex gap-3 text-sm">
          <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" />
          <p className="text-content">ยังไม่ได้สร้างตาราง <code>holidays</code> — กรุณารัน <code>025_holidays.sql</code> ใน Supabase SQL Editor ก่อนจึงจะแก้ไขได้</p>
        </div>
      )}

      {!hasVerifiedHolidayList(year) && (
        <div className="card border-warning/40 flex gap-3 text-sm">
          <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" />
          <p className="text-content">
            ปี {year + 543} มีเฉพาะวันหยุดวันที่คงที่และวันชดเชยที่ระบบคำนวณให้
            กรุณาเพิ่ม <strong>วันมาฆบูชา วันวิสาขบูชา วันอาสาฬหบูชา วันเข้าพรรษา</strong> และวันหยุดพิเศษตามประกาศ ครม.
          </p>
        </div>
      )}

      {/* Add */}
      <form onSubmit={handleAdd} className="card grid grid-cols-1 sm:grid-cols-[180px_1fr_auto] gap-3 items-end">
        <div>
          <label className="label" htmlFor="holiday-date">วันที่</label>
          <input id="holiday-date" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="holiday-name">ชื่อวันหยุด</label>
          <input id="holiday-name" type="text" maxLength={200} placeholder="เช่น วันหยุดพิเศษ (มติ ครม.)" value={newName} onChange={e => setNewName(e.target.value)} className="input" />
        </div>
        <button type="submit" disabled={saving || tableMissing} className="btn-primary">
          <Plus size={16} /> เพิ่มวันหยุด
        </button>
      </form>

      {/* List */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr><th>วันที่</th><th>ชื่อ</th><th>ที่มา</th><th className="text-right">จัดการ</th></tr>
          </thead>
          <tbody>
            {effective.map(h => (
              <tr key={h.date}>
                <td className="whitespace-nowrap tabular-nums">{formatThaiDate(h.date)}</td>
                <td>{h.name}</td>
                <td>
                  <span className={h.source === 'custom' ? 'badge-info' : 'badge-gray'}>
                    {h.source === 'custom' ? 'เพิ่มโดยแอดมิน' : 'ในระบบ'}
                  </span>
                </td>
                <td className="text-right">
                  <button onClick={() => handleRemove(h)} disabled={saving || tableMissing} className="btn-ghost btn-sm">
                    <CalendarOff size={14} /> {h.source === 'custom' ? 'นำออก' : 'ตั้งเป็นวันทำงาน'}
                  </button>
                </td>
              </tr>
            ))}
            {effective.length === 0 && (
              <tr><td colSpan={4} className="text-center text-content-muted py-8">ไม่มีวันหยุดในปีนี้</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {workingOverrides.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-content mb-3">วันหยุดในระบบที่ตั้งเป็นวันทำงาน</h2>
          <ul className="divide-y divide-border">
            {workingOverrides.map(h => (
              <li key={h.date} className="flex items-center justify-between py-2 text-sm">
                <span><span className="tabular-nums">{formatThaiDate(h.date)}</span> · <span className="text-content-muted">{h.name}</span></span>
                <button onClick={() => handleRestore(h.date)} className="btn-ghost btn-sm"><RotateCcw size={14} /> คืนเป็นวันหยุด</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
