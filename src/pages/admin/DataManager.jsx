import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  Database, Clock, BookOpen, CheckSquare, Search,
  Edit2, Trash2, X, Save, RefreshCw, CheckCircle, XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { SkeletonTable } from '../../components/ui/Skeleton'
import ConfirmModal from '../../components/ui/ConfirmModal'

const TABS = [
  { id: 'attendance', label: 'การเข้างาน', icon: Clock },
  { id: 'logs', label: 'บันทึกประจำวัน', icon: BookOpen },
]

const STATUS_LABELS = { pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธ' }
const STATUS_COLORS = {
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-danger',
}

// ----- Attendance Tab -----
function AttendanceTab() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editRow, setEditRow] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('attendance')
      .select('*, user:user_id(full_name, email)')
      .order('date', { ascending: false })
      .limit(200)
    setRows(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const filtered = rows.filter(r => {
    const name = r.user?.full_name?.toLowerCase() || ''
    const email = r.user?.email?.toLowerCase() || ''
    const s = search.toLowerCase()
    return name.includes(s) || email.includes(s) || r.date?.includes(s)
  })

  const getLocalTimeFromIso = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d)) return '';
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch {
      return '';
    }
  }

  const combineToIso = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    try {
      const [year, month, day] = dateStr.split('-');
      const [hours, minutes] = timeStr.split(':');
      const d = new Date(year, month - 1, day, hours, minutes);
      return d.toISOString();
    } catch {
      return null;
    }
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
    else { toast.success('บันทึกสำเร็จ!'); setEditRow(null); fetch() }
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('attendance').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    if (error) { toast.error('ลบล้มเหลว') } else { toast.success('ลบข้อมูลแล้ว'); fetch() }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="ค้นหาชื่อ, อีเมล, วันที่..." value={search}
            onChange={e => setSearch(e.target.value)} className="input pl-9 text-sm" />
        </div>
        <button onClick={fetch} className="btn-secondary btn-sm"><RefreshCw size={14} /> รีเฟรช</button>
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
                <tr key={r.id}>
                  <td>
                    <div>
                      <p className="font-medium text-content">{r.user?.full_name || '-'}</p>
                      <p className="text-xs text-gray-400">{r.user?.email}</p>
                    </div>
                  </td>
                  <td className="text-content-muted">{r.date}</td>
                  <td className="text-content-muted">{r.check_in ? getLocalTimeFromIso(r.check_in) : <span className="text-gray-300">-</span>}</td>
                  <td className="text-content-muted">{r.check_out ? getLocalTimeFromIso(r.check_out) : <span className="text-gray-300">-</span>}</td>
                  <td className="text-content-muted">
                    {r.hours_worked ? `${parseFloat(r.hours_worked).toFixed(2)} ชม.` : <span className="text-gray-300">-</span>}
                  </td>
                  <td>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(r)} className="btn-secondary btn-sm"><Edit2 size={12} /></button>
                      <button onClick={() => setDeleteTarget(r)} className="btn-danger btn-sm"><Trash2 size={12} /></button>
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
            <p className="text-sm text-content-muted mb-4 font-medium">{editRow.user?.full_name}</p>
            <div className="space-y-3">
              <div>
                <label className="label">วันที่</label>
                <input type="date" value={editForm.date} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label">เวลาเข้างาน</label>
                <input type="time" value={editForm.check_in} onChange={e => setEditForm(p => ({ ...p, check_in: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label">เวลาออกงาน</label>
                <input type="time" value={editForm.check_out} onChange={e => setEditForm(p => ({ ...p, check_out: e.target.value }))} className="input" />
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
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editRow, setEditRow] = useState(null)
  const [editLog, setEditLog] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('daily_logs')
      .select('*, user:user_id(full_name, email)')
      .order('log_date', { ascending: false })
      .limit(200)
    setRows(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const filtered = rows.filter(r => {
    const name = r.user?.full_name?.toLowerCase() || ''
    const s = search.toLowerCase()
    return name.includes(s) || r.log_date?.includes(s) || r.log_text?.toLowerCase().includes(s)
  })

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('daily_logs').update({ log_text: editLog }).eq('id', editRow.id)
    setSaving(false)
    if (error) { toast.error('บันทึกล้มเหลว') }
    else { toast.success('บันทึกสำเร็จ!'); setEditRow(null); fetch() }
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('daily_logs').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    if (error) { toast.error('ลบล้มเหลว') } else { toast.success('ลบข้อมูลแล้ว'); fetch() }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="ค้นหาชื่อ, วันที่, บันทึก..." value={search}
            onChange={e => setSearch(e.target.value)} className="input pl-9 text-sm" />
        </div>
        <button onClick={fetch} className="btn-secondary btn-sm"><RefreshCw size={14} /> รีเฟรช</button>
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
                <tr key={r.id}>
                  <td>
                    <div>
                      <p className="font-medium text-content">{r.user?.full_name || '-'}</p>
                      <p className="text-xs text-gray-400">{r.user?.email}</p>
                    </div>
                  </td>
                  <td className="text-content-muted whitespace-nowrap">{r.log_date}</td>
                  <td className="text-content-muted max-w-xs">
                    <p className="truncate">{r.log_text || <span className="text-gray-300">ไม่มีบันทึก</span>}</p>
                  </td>
                  <td>
                    <div className="flex gap-1.5">
                      <button onClick={() => { setEditRow(r); setEditLog(r.log_text || '') }} className="btn-secondary btn-sm"><Edit2 size={12} /></button>
                      <button onClick={() => setDeleteTarget(r)} className="btn-danger btn-sm"><Trash2 size={12} /></button>
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
            <p className="text-sm text-content-muted mb-1">{editRow.user?.full_name} — {editRow.log_date}</p>
            <textarea
              value={editLog}
              onChange={e => setEditLog(e.target.value)}
              rows={6}
              maxLength={500}
              className="input resize-none mt-3"
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
          message={`ลบบันทึกวันที่ ${deleteTarget.log_date} ของ ${deleteTarget.user?.full_name}`}
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
