import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { Users, Search, Plus, Edit2, UserX, UserCheck, X, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { SkeletonTable } from '../../components/ui/Skeleton'
import ConfirmModal from '../../components/ui/ConfirmModal'

const ROLE_LABELS = { student: 'นักศึกษา', supervisor: 'อาจารย์นิเทศ', mentor: 'พี่เลี้ยง / หัวหน้างาน', admin: 'ผู้ดูแลระบบ' }

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [supervisors, setSupervisors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [suspendTarget, setSuspendTarget] = useState(null)
  
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, successes: 0, errors: [] })
  const fileInputRef = useRef(null)
  const [formLoading, setFormLoading] = useState(false)

  const [form, setForm] = useState({
    full_name: '', email: '', role: 'student',
    student_code: '', supervisor_id: '', target_hours: 1596, password: '', secondary_role: ''
  })

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select('*, supervisor:supervisor_id(full_name)')
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setSupervisors((data || []).filter(u => u.role === 'supervisor'))
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const filtered = users.filter(u => {
    const matchSearch = u.full_name.toLowerCase().includes(search.toLowerCase()) ||
                        u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = !roleFilter || u.role === roleFilter
    return matchSearch && matchRole
  })

  const openAdd = () => {
    setEditUser(null)
    setForm({ full_name: '', email: '', role: 'student', student_code: '', supervisor_id: '', target_hours: 1596, password: '' })
    setShowModal(true)
  }

  const openEdit = (u) => {
    setEditUser(u)
    setForm({
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      student_code: u.student_code || '',
      supervisor_id: u.supervisor_id || '',
      target_hours: u.target_hours || 1596,
      password: '',
      secondary_role: u.secondary_role || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormLoading(true)

    if (editUser) {
      const updates = {
        full_name: form.full_name,
        role: form.role,
        secondary_role: form.secondary_role || null,
        student_code: form.role === 'student' ? form.student_code || null : null,
        supervisor_id: form.role === 'student' ? form.supervisor_id || null : null,
        target_hours: form.role === 'student' ? parseInt(form.target_hours) : null,
      }
      const { error } = await supabase.from('users').update(updates).eq('id', editUser.id)
      setFormLoading(false)
      if (error) {
        toast.error('แก้ไขผู้ใช้ล้มเหลว')
      } else {
        toast.success('แก้ไขผู้ใช้สำเร็จ!')
        setShowModal(false)
        fetchUsers()
      }
    } else {
      if (!form.password || form.password.length < 6) {
        toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
        setFormLoading(false)
        return
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.full_name,
            role: form.role,
            student_code: form.role === 'student' ? form.student_code || null : null,
          }
        }
      })

      if (signUpError) {
        toast.error('สร้างผู้ใช้ล้มเหลว: ' + signUpError.message)
        setFormLoading(false)
        return
      }

      const userId = signUpData.user?.id
      if (userId) {
        await supabase.from('users').upsert({
          id: userId,
          email: form.email,
          full_name: form.full_name,
          role: form.role,
          student_code: form.role === 'student' ? form.student_code || null : null,
          supervisor_id: form.role === 'student' ? form.supervisor_id || null : null,
          target_hours: form.role === 'student' ? parseInt(form.target_hours) : 1596,
          is_active: true,
        })
      }

      setFormLoading(false)
      toast.success('เพิ่มผู้ใช้สำเร็จ!')
      setShowModal(false)
      fetchUsers()
    }
  }

  const handleSuspend = async () => {
    if (!suspendTarget) return
    const { error } = await supabase
      .from('users')
      .update({ is_active: !suspendTarget.is_active })
      .eq('id', suspendTarget.id)
    setSuspendTarget(null)
    if (error) {
      toast.error('ดำเนินการล้มเหลว')
    } else {
      toast.success(suspendTarget.is_active ? 'ระงับผู้ใช้แล้ว' : 'เปิดใช้งานผู้ใช้แล้ว')
      fetchUsers()
    }
  }

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(worksheet)

      if (rows.length === 0) {
        toast.error('ไม่พบข้อมูลในไฟล์ Excel')
        setImporting(false)
        return
      }

      setImportProgress({ current: 0, total: rows.length, successes: 0, errors: [] })

      let successes = 0
      const errors = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        setImportProgress(prev => ({ ...prev, current: i + 1 }))

        try {
          const email = row['อีเมล'] || row['Email'] || row['email']
          const fullName = row['ชื่อ-นามสกุล'] || row['Name'] || row['full_name'] || row['fullname']
          const password = row['รหัสผ่าน'] || row['Password'] || row['password'] || 'password123'
          const role = row['บทบาท'] || row['Role'] || row['role'] || 'student'
          const studentCode = row['รหัสนักศึกษา'] || row['Student Code'] || row['student_code'] || null

          if (!email || !fullName) {
            errors.push(`แถวที่ ${i + 2}: ข้อมูลอีเมลหรือชื่อไม่ครบถ้วน`)
            continue
          }

          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email.toString().trim(),
            password: password.toString().trim(),
            options: {
              data: {
                full_name: fullName.toString().trim(),
                role: role.toString().trim().toLowerCase(),
                student_code: studentCode ? studentCode.toString().trim() : null,
              }
            }
          })

          if (authError && authError.message.includes('User already registered')) {
            errors.push(`แถวที่ ${i + 2}: อีเมล ${email} มีในระบบแล้ว`)
            continue
          } else if (authError) {
            errors.push(`แถวที่ ${i + 2}: ${authError.message}`)
            continue
          }

          const userId = authData?.user?.id
          if (userId) {
            const { error: dbError } = await supabase.from('users').upsert({
              id: userId,
              email: email.toString().trim(),
              full_name: fullName.toString().trim(),
              role: role.toString().trim().toLowerCase(),
              student_code: studentCode ? studentCode.toString().trim() : null,
              target_hours: 1596,
              is_active: true,
            })
            if (dbError) {
              errors.push(`แถวที่ ${i + 2}: บันทึกข้อมูลลงฐานข้อมูลล้มเหลว (${email})`)
            } else {
              successes++
            }
          }
        } catch (err) {
          errors.push(`แถวที่ ${i + 2}: เกิดข้อผิดพลาดไม่ทราบสาเหตุ`)
        }
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      setImportProgress(prev => ({ ...prev, successes, errors }))
      fetchUsers()
      if (successes > 0) toast.success(`นำเข้าสำเร็จ ${successes} รายการ`)
      if (errors.length > 0) toast.error(`นำเข้าไม่สำเร็จ ${errors.length} รายการ`)

    } catch (error) {
      console.error(error)
      toast.error('เกิดข้อผิดพลาดในการอ่านไฟล์')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      'อีเมล': 'student@example.com',
      'รหัสผ่าน': 'password123',
      'ชื่อ-นามสกุล': 'นายสมชาย ใจดี',
      'บทบาท': 'student',
      'รหัสนักศึกษา': '641234567'
    }])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Users')
    XLSX.writeFile(wb, 'import_users_template.xlsx')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-content">จัดการผู้ใช้ระบบ</h1>
          <p className="text-content-muted mt-1">เพิ่ม แก้ไข และระงับการใช้งานของบัญชีต่างๆ</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadTemplate} className="text-primary-600 hover:text-primary-700 text-sm font-medium underline flex items-center self-center mr-2">
            โหลดเทมเพลต Excel
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx,.xls,.csv" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="btn-secondary flex items-center gap-2">
            <FileSpreadsheet size={16} /> นำเข้า Excel
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> เพิ่มผู้ใช้
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อหรืออีเมล..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="select w-40">
            <option value="">ทุกบทบาท</option>
            <option value="student">นักศึกษา</option>
            <option value="supervisor">อาจารย์นิเทศ</option>
            <option value="mentor">พี่เลี้ยง / หัวหน้างาน</option>
            <option value="admin">ผู้ดูแลระบบ</option>
          </select>
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p>{search || roleFilter ? 'ไม่พบผู้ใช้ที่ค้นหา' : 'ยังไม่มีผู้ใช้ในระบบ'}</p>
        </div>
      ) : (
        <div className="table-wrapper bg-card">
          <table className="table">
            <thead>
              <tr>
                <th>ชื่อ-นามสกุล</th>
                <th>บทบาท</th>
                <th>อาจารย์ที่ดูแล</th>
                <th>สถานะ</th>
                <th>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div>
                      <p className="font-medium text-content">{u.full_name}</p>
                      <div className="flex flex-col text-xs text-gray-400">
                        <span>{u.email}</span>
                        {u.role === 'student' && u.student_code && (
                          <span className="text-primary-600 font-medium">รหัส: {u.student_code}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      u.role === 'admin' ? 'badge-info' :
                      u.role === 'supervisor' ? 'badge-warning' : 
                      u.role === 'mentor' ? 'badge-primary bg-orange-100 text-orange-700' : 'badge-gray'
                    }`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="text-sm text-content-muted">
                    {u.supervisor?.full_name || <span className="text-gray-300">-</span>}
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {u.is_active ? 'ใช้งาน' : 'ระงับ'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="btn-secondary btn-sm"
                      >
                        <Edit2 size={13} /> แก้ไข
                      </button>
                      <button
                        onClick={() => setSuspendTarget(u)}
                        className={u.is_active ? 'btn-danger btn-sm' : 'btn-success btn-sm'}
                      >
                        {u.is_active ? <><UserX size={13}/> ระงับ</> : <><UserCheck size={13}/> เปิดใช้</>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-content">
                {editUser ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-content-muted p-1">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">ชื่อ-นามสกุล *</label>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  className="input"
                  placeholder="กรอกชื่อ-นามสกุล"
                />
              </div>

              {!editUser && (
                <div>
                  <label className="label">อีเมล *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="input"
                    placeholder="กรอกอีเมล"
                  />
                </div>
              )}

              <div>
                <label className="label">บทบาทหลัก *</label>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="select"
                >
                  <option value="student">นักศึกษา</option>
                  <option value="supervisor">อาจารย์นิเทศ</option>
                  <option value="mentor">พี่เลี้ยง / หัวหน้างาน</option>
                  <option value="admin">ผู้ดูแลระบบ</option>
                </select>
              </div>

              {editUser && (
                <div>
                  <label className="label">บทบาทเสริม (Dual-Role)</label>
                  <select
                    value={form.secondary_role}
                    onChange={e => setForm(p => ({ ...p, secondary_role: e.target.value }))}
                    className="select"
                  >
                    <option value="">-- ไม่มีบทบาทเสริม --</option>
                    {form.role !== 'student'    && <option value="student">นักศึกษา</option>}
                    {form.role !== 'supervisor' && <option value="supervisor">อาจารย์นิเทศ (Supervisor)</option>}
                    {form.role !== 'mentor'     && <option value="mentor">พี่เลี้ยง (Mentor)</option>}
                    {form.role !== 'admin'      && <option value="admin">ผู้ดูแลระบบ (Admin)</option>}
                  </select>
                </div>
              )}

              {form.role === 'student' && (
                <>
                  <div>
                    <label className="label">รหัสนักศึกษา</label>
                    <input
                      type="text"
                      value={form.student_code}
                      onChange={e => setForm(p => ({ ...p, student_code: e.target.value }))}
                      className="input"
                      placeholder="กรอกรหัสนักศึกษา"
                    />
                  </div>
                  <div>
                    <label className="label">อาจารย์ที่ดูแล</label>
                    <select
                      value={form.supervisor_id}
                      onChange={e => setForm(p => ({ ...p, supervisor_id: e.target.value }))}
                      className="select"
                    >
                      <option value="">-- ไม่ระบุ --</option>
                      {supervisors.map(s => (
                        <option key={s.id} value={s.id}>{s.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">เป้าหมายชั่วโมง (ชม.)</label>
                    <input
                      type="number"
                      min={1}
                      value={form.target_hours}
                      onChange={e => setForm(p => ({ ...p, target_hours: e.target.value }))}
                      className="input"
                    />
                  </div>
                </>
              )}

              {!editUser && (
                <div>
                  <label className="label">รหัสผ่าน *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    className="input"
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  ยกเลิก
                </button>
                <button type="submit" disabled={formLoading} className="btn-primary flex-1">
                  {formLoading ? 'กำลังบันทึก...' : editUser ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ใช้'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {importing && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <h3 className="text-lg font-semibold text-content mb-4">นำเข้าข้อมูลผู้ใช้</h3>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1 text-content-muted">
                <span>กำลังดำเนินการ... {importProgress.current} / {importProgress.total}</span>
                <span>{Math.round((importProgress.current / (importProgress.total || 1)) * 100)}%</span>
              </div>
              <div className="w-full bg-surface-hover rounded-full h-2.5">
                <div 
                  className="bg-primary-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${(importProgress.current / (importProgress.total || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
            {importProgress.current === importProgress.total && importProgress.total > 0 && (
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 text-sm font-medium">
                  <CheckCircle size={16} /> นำเข้าสำเร็จ: {importProgress.successes} รายการ
                </div>
                {importProgress.errors.length > 0 && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    <div className="font-medium flex items-center gap-2 mb-2">
                      <AlertTriangle size={16} /> นำเข้าล้มเหลว: {importProgress.errors.length} รายการ
                    </div>
                    <ul className="list-disc list-inside text-xs space-y-1 max-h-32 overflow-y-auto pl-1">
                      {importProgress.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </div>
                )}
                <div className="mt-6 flex justify-end">
                  <button onClick={() => setImporting(false)} className="btn-primary">ปิด</button>
                </div>
              </div>
            )}
            {importProgress.current < importProgress.total && (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-primary-600" size={32} />
              </div>
            )}
          </div>
        </div>
      )}

      {suspendTarget && (
        <ConfirmModal
          title={suspendTarget.is_active ? `ระงับผู้ใช้ ${suspendTarget.full_name}?` : `เปิดใช้งาน ${suspendTarget.full_name}?`}
          message={suspendTarget.is_active
            ? 'ผู้ใช้นี้จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะเปิดใช้งานอีกครั้ง'
            : 'ผู้ใช้นี้จะสามารถเข้าสู่ระบบได้อีกครั้ง'}
          confirmLabel={suspendTarget.is_active ? 'ระงับ' : 'เปิดใช้งาน'}
          danger={suspendTarget.is_active}
          onConfirm={handleSuspend}
          onCancel={() => setSuspendTarget(null)}
        />
      )}
    </div>
  )
}
