import { useState, useEffect, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  Database, Clock, BookOpen, Search,
  Edit2, Trash2, X, Save, RefreshCw, Calendar, Filter, ChevronDown, User
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { SkeletonTable } from '../../components/ui/Skeleton'
import ConfirmModal from '../../components/ui/ConfirmModal'

const TABS = [
  { id: 'attendance', label: 'การเข้างาน', icon: Clock },
  { id: 'logs', label: 'บันทึกประจำวัน', icon: BookOpen },
]

// ---- Shared filter components ----
function UserSelect({ users, value, onChange }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const filtered = useMemo(() =>
    users.filter(u =>
      !q || u.full_name?.toLowerCase().includes(q.toLowerCase()) || u.email?.toLowerCase().includes(q.toLowerCase())
    ), [users, q])

  const selected = users.find(u => u.id === value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="input flex items-center justify-between gap-2 min-w-[200px] text-sm"
      >
        <div className="flex items-center gap-2 truncate">
          <User size={14} className="text-gray-400 flex-shrink-0" />
          <span className={selected ? 'text-content' : 'text-gray-400'}>
            {selected ? selected.full_name : 'ทุกคน'}
          </span>
        </div>
        <ChevronDown size={14} className={`text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 top-full mt-1 left-0 w-72 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อหรืออีเมล..."
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  className="input py-1.5 pl-8 text-sm w-full"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); setQ('') }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-surface-hover transition-colors ${!value ? 'text-primary-700 font-semibold bg-primary-50/50' : 'text-content'}`}
              >
                <User size={13} />
                ทุกคน
              </button>
              {filtered.map(u => (
                <button
                  type="button"
                  key={u.id}
                  onClick={() => { onChange(u.id); setOpen(false); setQ('') }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-hover transition-colors ${value === u.id ? 'text-primary-700 font-semibold bg-primary-50/50' : ''}`}
                >
                  <p className="font-medium text-content">{u.full_name}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-4">ไม่พบรายชื่อ</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ----- Attendance Tab -----
function AttendanceTab() {
  const [rows, setRows] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [editRow, setEditRow] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('attendance')
      .select('*, user:user_id(id, full_name, email)')
      .order('date', { ascending: false })
      .limit(500)
    setRows(data || [])

    // Extract unique users
    const seen = new Set()
    const uniqueUsers = []
    for (const r of data || []) {
      if (r.user && !seen.has(r.user.id)) {
        seen.add(r.user.id)
        uniqueUsers.push(r.user)
      }
    }
    uniqueUsers.sort((a, b) => a.full_name?.localeCompare(b.full_name, 'th'))
    setUsers(uniqueUsers)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = useMemo(() => rows.filter(r => {
    if (filterUser && r.user?.id !== filterUser) return false
    if (filterDateFrom && r.date < filterDateFrom) return false
    if (filterDateTo && r.date > filterDateTo) return false
    if (search) {
      const s = search.toLowerCase()
      const name = r.user?.full_name?.toLowerCase() || ''
      const email = r.user?.email?.toLowerCase() || ''
      if (!name.includes(s) && !email.includes(s) && !r.date?.includes(s)) return false
    }
    return true
  }), [rows, filterUser, filterDateFrom, filterDateTo, search])

  const hasFilters = filterUser || filterDateFrom || filterDateTo || search

  const clearFilters = () => {
    setFilterUser('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setSearch('')
  }

  const getLocalTimeFromIso = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d)) return '';
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch { return ''; }
  }

  const combineToIso = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    try {
      const [year, month, day] = dateStr.split('-');
      const [hours, minutes] = timeStr.split(':');
      const d = new Date(year, month - 1, day, hours, minutes);
      return d.toISOString();
    } catch { return null; }
  }

  const openEdit = (r) => {
    setEditRow(r)
    setEditForm({
      date: r.date,
      check_in: getLocalTimeFromIso(r.check_in),
      check_out: getLocalTimeFromIso(r.check_out),
      hours_worked: r.hours_worked || '',
    })
  }

  const handleSave = async () => {
    setSaving(true)
    const hours = parseFloat(editForm.hours_worked) || null
    const { error } = await supabase
      .from('attendance')
      .update({
        date: editForm.date,
        check_in: combineToIso(editForm.date, editForm.check_in),
        check_out: combineToIso(editForm.date, editForm.check_out),
        hours_worked: hours,
      })
      .eq('id', editRow.id)
    setSaving(false)
    if (error) { toast.error('บันทึกล้มเหลว: ' + error.message) }
    else { toast.success('บันทึกสำเร็จ!'); setEditRow(null); fetchData() }
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('attendance').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    if (error) { toast.error('ลบล้มเหลว') } else { toast.success('ลบข้อมูลแล้ว'); fetchData() }
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-surface border border-border rounded-xl p-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-primary-700 flex-shrink-0" />
          <span className="text-sm font-medium text-content">ตัวกรอง</span>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-xs text-danger hover:underline font-medium"
            >
              <X size={12} /> ล้างทั้งหมด
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          {/* Name search / dropdown */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-content-muted mb-1">ชื่อนักศึกษา</label>
            <UserSelect users={users} value={filterUser} onChange={setFilterUser} />
          </div>

          {/* Date from */}
          <div>
            <label className="block text-xs font-medium text-content-muted mb-1">วันที่เริ่มต้น</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className="input pl-8 text-sm"
              />
            </div>
          </div>

          {/* Date to */}
          <div>
            <label className="block text-xs font-medium text-content-muted mb-1">วันที่สิ้นสุด</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className="input pl-8 text-sm"
              />
            </div>
          </div>

          {/* Keyword search */}
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-content-muted mb-1">ค้นหาทั่วไป</label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ชื่อ, อีเมล, วันที่..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-8 text-sm w-full"
              />
            </div>
          </div>

          <button onClick={fetchData} className="btn-secondary btn-sm flex-shrink-0 flex items-center gap-1.5">
            <RefreshCw size={14} /> รีเฟรช
          </button>
        </div>

        {/* Results count */}
        <p className="text-xs text-content-muted">
          แสดง <span className="font-semibold text-content">{filtered.length}</span> รายการ
          {hasFilters && ` (จากทั้งหมด ${rows.length} รายการ)`}
        </p>
      </div>

      {loading ? <SkeletonTable rows={6} cols={6} /> : (
        <div className="table-wrapper bg-card">
          <table className="table text-sm">
            <thead>
              <tr>
                <th>ชื่อนักศึกษา</th>
                <th>วันที่</th>
                <th>เข้างาน</th>
                <th>ออกงาน</th>
                <th>ชั่วโมง</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">ไม่มีข้อมูล</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td>
                    <div>
                      <p className="font-medium text-content">{r.user?.full_name || '-'}</p>
                      <p className="text-xs text-gray-400">{r.user?.email}</p>
                    </div>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-surface rounded-lg text-xs font-medium text-content-muted border border-border">
                      <Calendar size={11} />
                      {r.date}
                    </span>
                  </td>
                  <td className={r.check_in ? 'text-green-600 font-medium' : ''}>
                    {r.check_in ? getLocalTimeFromIso(r.check_in) : <span className="text-gray-300">-</span>}
                  </td>
                  <td className={r.check_out ? 'text-content-muted' : 'text-amber-500'}>
                    {r.check_out ? getLocalTimeFromIso(r.check_out) : <span className="text-amber-400 text-xs">ยังไม่เช็คเอาท์</span>}
                  </td>
                  <td className="text-content-muted">
                    {r.hours_worked ? `${parseFloat(r.hours_worked).toFixed(2)} ชม.` : <span className="text-gray-300">-</span>}
                  </td>
                  <td>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(r)} className="btn-secondary btn-sm" title="แก้ไข">
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => setDeleteTarget(r)} className="btn-danger btn-sm" title="ลบ">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editRow && (
        <div className="modal-overlay" onClick={() => setEditRow(null)}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-content">แก้ไขข้อมูลการเข้างาน</h3>
              <button onClick={() => setEditRow(null)} className="text-gray-400 hover:text-content-muted p-1"><X size={18} /></button>
            </div>
            <div className="bg-primary-50 rounded-xl px-3 py-2 mb-4 border border-primary-100">
              <p className="text-sm font-semibold text-primary-900">{editRow.user?.full_name}</p>
              <p className="text-xs text-primary-700">{editRow.user?.email}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">วันที่</label>
                <input type="date" value={editForm.date} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))} className="input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">เวลาเข้างาน</label>
                  <input type="time" value={editForm.check_in} onChange={e => setEditForm(p => ({ ...p, check_in: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="label">เวลาออกงาน</label>
                  <input type="time" value={editForm.check_out} onChange={e => setEditForm(p => ({ ...p, check_out: e.target.value }))} className="input" />
                </div>
              </div>
              <div>
                <label className="label">ชั่วโมงที่ทำงาน (ชม.)</label>
                <input type="number" step="0.01" min="0" value={editForm.hours_worked}
                  onChange={e => setEditForm(p => ({ ...p, hours_worked: e.target.value }))} className="input" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditRow(null)} className="btn-secondary flex-1">ยกเลิก</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                <Save size={14} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="ลบข้อมูลการเข้างาน?"
          message={`ลบข้อมูลวันที่ ${deleteTarget.date} ของ ${deleteTarget.user?.full_name} — การกระทำนี้ไม่สามารถย้อนกลับได้`}
          confirmLabel="ลบ"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ----- Daily Logs Tab -----
function DailyLogsTab() {
  const [rows, setRows] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [editRow, setEditRow] = useState(null)
  const [editLog, setEditLog] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('daily_logs')
      .select('*, user:user_id(id, full_name, email)')
      .order('log_date', { ascending: false })
      .limit(500)
    setRows(data || [])

    const seen = new Set()
    const uniqueUsers = []
    for (const r of data || []) {
      if (r.user && !seen.has(r.user.id)) {
        seen.add(r.user.id)
        uniqueUsers.push(r.user)
      }
    }
    uniqueUsers.sort((a, b) => a.full_name?.localeCompare(b.full_name, 'th'))
    setUsers(uniqueUsers)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = useMemo(() => rows.filter(r => {
    if (filterUser && r.user?.id !== filterUser) return false
    const dateField = r.log_date || r.date
    if (filterDateFrom && dateField < filterDateFrom) return false
    if (filterDateTo && dateField > filterDateTo) return false
    if (search) {
      const s = search.toLowerCase()
      const name = r.user?.full_name?.toLowerCase() || ''
      if (!name.includes(s) && !dateField?.includes(s) && !r.log_text?.toLowerCase().includes(s)) return false
    }
    return true
  }), [rows, filterUser, filterDateFrom, filterDateTo, search])

  const hasFilters = filterUser || filterDateFrom || filterDateTo || search

  const clearFilters = () => {
    setFilterUser('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setSearch('')
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('daily_logs').update({ log_text: editLog }).eq('id', editRow.id)
    setSaving(false)
    if (error) { toast.error('บันทึกล้มเหลว') }
    else { toast.success('บันทึกสำเร็จ!'); setEditRow(null); fetchData() }
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('daily_logs').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    if (error) { toast.error('ลบล้มเหลว') } else { toast.success('ลบข้อมูลแล้ว'); fetchData() }
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-surface border border-border rounded-xl p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-primary-700 flex-shrink-0" />
          <span className="text-sm font-medium text-content">ตัวกรอง</span>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-xs text-danger hover:underline font-medium"
            >
              <X size={12} /> ล้างทั้งหมด
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-content-muted mb-1">ชื่อนักศึกษา</label>
            <UserSelect users={users} value={filterUser} onChange={setFilterUser} />
          </div>

          <div>
            <label className="block text-xs font-medium text-content-muted mb-1">วันที่เริ่มต้น</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="input pl-8 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-content-muted mb-1">วันที่สิ้นสุด</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="input pl-8 text-sm" />
            </div>
          </div>

          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-content-muted mb-1">ค้นหาทั่วไป</label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ชื่อ, วันที่, บันทึก..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-8 text-sm w-full"
              />
            </div>
          </div>

          <button onClick={fetchData} className="btn-secondary btn-sm flex-shrink-0 flex items-center gap-1.5">
            <RefreshCw size={14} /> รีเฟรช
          </button>
        </div>

        <p className="text-xs text-content-muted">
          แสดง <span className="font-semibold text-content">{filtered.length}</span> รายการ
          {hasFilters && ` (จากทั้งหมด ${rows.length} รายการ)`}
        </p>
      </div>

      {loading ? <SkeletonTable rows={6} cols={4} /> : (
        <div className="table-wrapper bg-card">
          <table className="table text-sm">
            <thead>
              <tr>
                <th>ชื่อนักศึกษา</th>
                <th>วันที่</th>
                <th>บันทึกการทำงาน</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">ไม่มีข้อมูล</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td>
                    <div>
                      <p className="font-medium text-content">{r.user?.full_name || '-'}</p>
                      <p className="text-xs text-gray-400">{r.user?.email}</p>
                    </div>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-surface rounded-lg text-xs font-medium text-content-muted border border-border whitespace-nowrap">
                      <Calendar size={11} />
                      {r.log_date || r.date}
                    </span>
                  </td>
                  <td className="text-content-muted max-w-xs">
                    <p className="truncate">{r.log_text || <span className="text-gray-300">ไม่มีบันทึก</span>}</p>
                  </td>
                  <td>
                    <div className="flex gap-1.5">
                      <button onClick={() => { setEditRow(r); setEditLog(r.log_text || '') }} className="btn-secondary btn-sm" title="แก้ไข">
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => setDeleteTarget(r)} className="btn-danger btn-sm" title="ลบ">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editRow && (
        <div className="modal-overlay" onClick={() => setEditRow(null)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-content">แก้ไขบันทึกประจำวัน</h3>
              <button onClick={() => setEditRow(null)} className="text-gray-400 hover:text-content-muted p-1"><X size={18} /></button>
            </div>
            <div className="bg-primary-50 rounded-xl px-3 py-2 mb-4 border border-primary-100">
              <p className="text-sm font-semibold text-primary-900">{editRow.user?.full_name}</p>
              <p className="text-xs text-primary-700">{editRow.log_date || editRow.date}</p>
            </div>
            <textarea
              value={editLog}
              onChange={e => setEditLog(e.target.value)}
              rows={6}
              maxLength={500}
              className="input resize-none mt-1"
              placeholder="บันทึกการทำงาน..."
            />
            <p className="text-xs text-gray-400 text-right mt-1">{editLog.length}/500</p>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditRow(null)} className="btn-secondary flex-1">ยกเลิก</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                <Save size={14} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="ลบบันทึกประจำวัน?"
          message={`ลบบันทึกวันที่ ${deleteTarget.log_date || deleteTarget.date} ของ ${deleteTarget.user?.full_name}`}
          confirmLabel="ลบ"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}


// ----- Main Component -----
export default function AdminDataManager() {
  const [activeTab, setActiveTab] = useState('attendance')

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Database size={20} className="text-primary-700" />
          <h1 className="text-xl font-bold text-content">จัดการข้อมูลระบบ</h1>
        </div>
        <p className="text-sm text-content-muted">ดู แก้ไข และจัดการข้อมูลดิบในฐานข้อมูล (สำหรับผู้ดูแลระบบ)</p>
      </div>

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <span className="text-amber-500 mt-0.5 text-lg">⚠️</span>
        <p className="text-sm text-amber-800">
          <strong>คำเตือน:</strong> การแก้ไขข้อมูลในหน้านี้จะมีผลทันทีต่อฐานข้อมูลจริง กรุณาตรวจสอบก่อนบันทึกทุกครั้ง
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1 -mb-px">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-primary-700 text-primary-700'
                  : 'border-transparent text-content-muted hover:text-content-muted hover:border-gray-300'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'attendance' && <AttendanceTab />}
        {activeTab === 'logs' && <DailyLogsTab />}
      </div>
    </div>
  )
}
