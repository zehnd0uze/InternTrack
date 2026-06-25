import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { Users, Search, Plus, Edit2, UserX, UserCheck, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { SkeletonTable } from '../../components/ui/Skeleton'
import ConfirmModal from '../../components/ui/ConfirmModal'

const ROLE_LABELS = { student: 'นักศึกษา', supervisor: 'อาจารย์นิเทศ', admin: 'ผู้ดูแลระบบ' }

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [supervisors, setSupervisors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [suspendTarget, setSuspendTarget] = useState(null)
  const [formLoading, setFormLoading] = useState(false)

  const [form, setForm] = useState({
    full_name: '', email: '', role: 'student',
    supervisor_id: '', target_hours: 1596, password: ''
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
    setForm({ full_name: '', email: '', role: 'student', supervisor_id: '', target_hours: 1596, password: '' })
    setShowModal(true)
  }

  const openEdit = (u) => {
    setEditUser(u)
    setForm({
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      supervisor_id: u.supervisor_id || '',
      target_hours: u.target_hours || 1596,
      password: ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormLoading(true)

    if (editUser) {
      // Edit existing user
      const updates = {
        full_name: form.full_name,
        role: form.role,
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
      // Create new user via Supabase Auth
      if (!form.password || form.password.length < 6) {
        toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
        setFormLoading(false)
        return
      }

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: form.email,
        password: form.password,
        email_confirm: true,
      })

      if (authError) {
        // Fallback: use signUp
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
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
            supervisor_id: form.role === 'student' ? form.supervisor_id || null : null,
            target_hours: form.role === 'student' ? parseInt(form.target_hours) : 1596,
            is_active: true,
          })
        }
      } else {
        const userId = authData.user?.id
        if (userId) {
          await supabase.from('users').insert({
            id: userId,
            email: form.email,
            full_name: form.full_name,
            role: form.role,
            supervisor_id: form.role === 'student' ? form.supervisor_id || null : null,
            target_hours: form.role === 'student' ? parseInt(form.target_hours) : 1596,
            is_active: true,
          })
        }
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">จัดการผู้ใช้</h1>
          <p className="text-sm text-gray-500 mt-0.5">เพิ่ม แก้ไข และจัดการผู้ใช้ในระบบ</p>
        </div>
        <button id="add-user-btn" onClick={openAdd} className="btn-primary btn-sm">
          <Plus size={16} /> เพิ่มผู้ใช้
        </button>
      </div>

      {/* Filters */}
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
            <option value="admin">ผู้ดูแลระบบ</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p>{search || roleFilter ? 'ไม่พบผู้ใช้ที่ค้นหา' : 'ยังไม่มีผู้ใช้ในระบบ'}</p>
        </div>
      ) : (
        <div className="table-wrapper bg-white">
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
                      <p className="font-medium text-gray-900">{u.full_name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      u.role === 'admin' ? 'badge-info' :
                      u.role === 'supervisor' ? 'badge-warning' : 'badge-gray'
                    }`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="text-sm text-gray-600">
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
                        id={`edit-user-${u.id}`}
                        onClick={() => openEdit(u)}
                        className="btn-secondary btn-sm"
                      >
                        <Edit2 size={13} /> แก้ไข
                      </button>
                      <button
                        id={`toggle-user-${u.id}`}
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">
                {editUser ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" id="user-form">
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
                <label className="label">บทบาท *</label>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="select"
                >
                  <option value="student">นักศึกษา</option>
                  <option value="supervisor">อาจารย์นิเทศ</option>
                  <option value="admin">ผู้ดูแลระบบ</option>
                </select>
              </div>

              {form.role === 'student' && (
                <>
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

      {/* Suspend Confirm Modal */}
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
