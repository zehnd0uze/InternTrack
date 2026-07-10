import { useState, useEffect, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  FileWarning, Clock, BookOpen, Search,
  Edit2, Trash2, X, Save, RefreshCw, Calendar, Plus, User, ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { SkeletonTable } from '../../components/ui/Skeleton'
import ConfirmModal from '../../components/ui/ConfirmModal'

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


export default function MissingLogs() {
  const [records, setRecords] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterUser, setFilterUser] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  
  // Form states
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [formType, setFormType] = useState('check_in')
  const [formNote, setFormNote] = useState('')
  const [formStudentId, setFormStudentId] = useState('')
  const [saving, setSaving] = useState(false)

  // Delete states
  const [deletingId, setDeletingId] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch users for the dropdown
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('id, full_name, email, student_code')
        .eq('role', 'student')
        .order('full_name')

      if (usersErr) throw usersErr
      setUsers(usersData || [])

      // Fetch missing attendance
      const { data: attendanceData, error: attErr } = await supabase
        .from('missing_attendance')
        .select(`
          *,
          users!inner (id, full_name, email, student_code)
        `)
        .order('date', { ascending: false })

      if (attErr) throw attErr
      
      setRecords(attendanceData || [])
    } catch (err) {
      console.error(err)
      toast.error('ไม่สามารถโหลดข้อมูลได้: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openAddModal = () => {
    setEditingRecord(null)
    setFormDate(format(new Date(), 'yyyy-MM-dd'))
    setFormType('both')
    setFormNote('')
    setFormStudentId('')
    setIsModalOpen(true)
  }

  const openEditModal = (rec) => {
    setEditingRecord(rec)
    setFormDate(rec.date)
    setFormType(rec.missing_type)
    setFormNote(rec.note || '')
    setFormStudentId(rec.student_id)
    setIsModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!formStudentId) {
      toast.error('กรุณาเลือกนักศึกษา')
      return
    }

    setSaving(true)
    try {
      if (editingRecord) {
        const { error } = await supabase
          .from('missing_attendance')
          .update({
            date: formDate,
            missing_type: formType,
            note: formNote
          })
          .eq('id', editingRecord.id)

        if (error) throw error
        toast.success('อัปเดตข้อมูลสำเร็จ')
      } else {
        const { error } = await supabase
          .from('missing_attendance')
          .insert({
            student_id: formStudentId,
            date: formDate,
            missing_type: formType,
            note: formNote
          })

        if (error) {
           if (error.code === '23505') {
               throw new Error('มีข้อมูลการลืมบันทึกเวลาของนักศึกษาคนนี้ในวันที่ระบุแล้ว')
           }
           throw error
        }
        toast.success('เพิ่มข้อมูลสำเร็จ')
      }
      setIsModalOpen(false)
      fetchData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('missing_attendance')
        .delete()
        .eq('id', deletingId)

      if (error) throw error
      toast.success('ลบข้อมูลสำเร็จ')
      setRecords(r => r.filter(x => x.id !== deletingId))
    } catch (err) {
      toast.error('ลบข้อมูลล้มเหลว: ' + err.message)
    } finally {
      setIsDeleting(false)
      setDeletingId(null)
    }
  }

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesSearch = !search || 
        r.users.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.users.student_code?.toLowerCase().includes(search.toLowerCase()) ||
        r.note?.toLowerCase().includes(search.toLowerCase())
      
      const matchesUser = !filterUser || r.student_id === filterUser

      return matchesSearch && matchesUser
    })
  }, [records, search, filterUser])
  
  const missingTypeLabels = {
      'check_in': 'ลืมเข้างาน',
      'check_out': 'ลืมออกงาน',
      'both': 'ลืมเข้าและออกงาน'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileWarning className="text-primary-600" />
            บันทึกเวลาที่ขาดหาย
          </h1>
          <p className="text-gray-500 mt-1">จัดการข้อมูลการลืมบันทึกเวลาเข้า-ออกงานของนักศึกษา</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn btn-secondary p-2.5"
            title="รีเฟรช"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openAddModal} className="btn btn-primary">
            <Plus size={18} />
            เพิ่มข้อมูลใหม่
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, รหัสนักศึกษา หรือหมายเหตุ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <div>
          <UserSelect users={users} value={filterUser} onChange={setFilterUser} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <SkeletonTable rows={5} columns={6} />
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-border text-xs uppercase text-gray-500 font-semibold">
                <tr>
                  <th className="px-6 py-4">นักศึกษา</th>
                  <th className="px-6 py-4">วันที่</th>
                  <th className="px-6 py-4">ประเภท</th>
                  <th className="px-6 py-4">หมายเหตุ</th>
                  <th className="px-6 py-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-surface-hover transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{rec.users.full_name}</div>
                        <div className="text-xs text-gray-500">{rec.users.student_code || 'ไม่มีรหัส'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {format(new Date(rec.date), 'dd MMM yyyy', { locale: th })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${
                            rec.missing_type === 'both' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
                        }`}>
                          {missingTypeLabels[rec.missing_type] || rec.missing_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={rec.note}>
                        {rec.note || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={() => openEditModal(rec)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="แก้ไข"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingId(rec.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="ลบ"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      ไม่มีข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
              <h3 className="text-lg font-bold text-content">
                {editingRecord ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              {!editingRecord && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-content block">นักศึกษา</label>
                  <select
                    value={formStudentId}
                    onChange={e => setFormStudentId(e.target.value)}
                    className="input w-full"
                    required
                  >
                    <option value="" disabled>-- เลือกนักศึกษา --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} {u.student_code ? `(${u.student_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {editingRecord && (
                 <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-content block">นักศึกษา</label>
                    <div className="input bg-gray-50 w-full text-gray-500">
                        {users.find(u => u.id === formStudentId)?.full_name || 'Loading...'}
                    </div>
                 </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-content block">วันที่</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="input w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-content block">ประเภท</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value)}
                    className="input w-full"
                    required
                  >
                    <option value="both">ลืมเข้าและออกงาน</option>
                    <option value="check_in">ลืมเข้างาน</option>
                    <option value="check_out">ลืมออกงาน</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-content block">หมายเหตุ</label>
                <textarea
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                  className="input w-full min-h-[100px] resize-none"
                  placeholder="ระบุเหตุผล หรือรายละเอียดเพิ่มเติม..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary px-6"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary px-6"
                >
                  {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="ลบข้อมูล"
        message="คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้? การกระทำนี้ไม่สามารถยกเลิกได้"
        confirmText="ลบข้อมูล"
        isDanger={true}
        loading={isDeleting}
      />
    </div>
  )
}
