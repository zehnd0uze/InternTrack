import { useState, useEffect } from 'react'
import { User, Mail, Save, Lock, Eye, EyeOff, ShieldCheck, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function StudentProfile() {
  const { user, profile, refreshProfile, isStudent, activeRole } = useAuth()

  // ---- Profile fields ----
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [studentCode, setStudentCode] = useState(profile?.student_code || '')
  const [email, setEmail]       = useState(user?.email || '')
  const [profileLoading, setProfileLoading] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [bgUploading, setBgUploading] = useState(false)
  const [badges, setBadges] = useState([])

  // ---- Fetch Badges ----
  useEffect(() => {
    async function fetchBadges() {
      if (!user?.id) return
      const { data } = await supabase.from('attendance').select('hours_worked, date, check_in').eq('user_id', user.id)
      if (!data) return
      
      const totalHours = data.reduce((s, r) => s + (parseFloat(r.hours_worked) || 0), 0)
      const monthDays = data.filter(r => new Date(r.date).getMonth() === new Date().getMonth()).length
      
      const newBadges = []
      if (totalHours >= 100) newBadges.push({ id: 'marathoner', icon: '💯', title: 'Marathoner', color: 'text-rose-500 bg-rose-50 border-rose-200', desc: 'สะสมชั่วโมงทะลุ 100 ชม.' })
      
      let hasEarly = false, hasWeekend = false
      data.forEach(r => {
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

      if (hasEarly) newBadges.push({ id: 'early', icon: '🌅', title: 'Early Bird', color: 'text-amber-500 bg-amber-50 border-amber-200', desc: 'เช็คอินก่อน 08:00 น.' })
      if (hasWeekend) newBadges.push({ id: 'weekend', icon: '👑', title: 'Weekend Warrior', color: 'text-purple-600 bg-purple-50 border-purple-200', desc: 'เข้างานวันหยุดเสาร์-อาทิตย์' })
      if (monthDays >= 5) newBadges.push({ id: 'fire', icon: '🔥', title: 'On Fire', color: 'text-orange-500 bg-orange-50 border-orange-200', desc: 'ทำงาน 5+ วันในเดือนนี้' })
      
      setBadges(newBadges)
    }
    fetchBadges()
  }, [user?.id])

  // ---- Password fields ----
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent]         = useState(false)
  const [showNew, setShowNew]                 = useState(false)
  const [showConfirm, setShowConfirm]         = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  // ---- Save profile (name + email) ----
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    const trimmedName = fullName.trim()
    if (!trimmedName) {
      toast.error('กรุณากรอกชื่อ-นามสกุล')
      return
    }

    setProfileLoading(true)
    try {
      // 1. Update display name & student code in `users` table
      const { error: dbErr } = await supabase
        .from('users')
        .update({ 
          full_name: trimmedName,
          student_code: studentCode.trim() || null
        })
        .eq('id', user.id)

      if (dbErr) throw dbErr

      // 2. If email changed — update via Supabase Auth (sends confirmation email)
      const trimmedEmail = email.trim().toLowerCase()
      if (trimmedEmail && trimmedEmail !== user.email) {
        const { error: emailErr } = await supabase.auth.updateUser({ email: trimmedEmail })
        if (emailErr) throw emailErr
        toast.success('บันทึกชื่อสำเร็จ! ระบบส่งลิงก์ยืนยันไปยังอีเมลใหม่แล้ว')
      } else {
        toast.success('บันทึกข้อมูลโปรไฟล์สำเร็จ')
      }

      await refreshProfile()
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'บันทึกข้อมูลล้มเหลว กรุณาลองใหม่')
    } finally {
      setProfileLoading(false)
    }
  }

  // ---- Change password ----
  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!newPassword) { toast.error('กรุณากรอกรหัสผ่านใหม่'); return }
    if (newPassword.length < 6) { toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return }
    if (newPassword !== confirmPassword) { toast.error('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน'); return }

    setPasswordLoading(true)
    try {
      // Re-authenticate first by signing in with current password
      const { error: reAuthErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (reAuthErr) throw new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง')

      // Update password
      const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword })
      if (pwErr) throw pwErr

      toast.success('เปลี่ยนรหัสผ่านสำเร็จ')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'เปลี่ยนรหัสผ่านล้มเหลว กรุณาลองใหม่')
    } finally {
      setPasswordLoading(false)
    }
  }

  const avatarLetter = profile?.full_name?.charAt(0)?.toUpperCase() || '?'

  const handleAvatarUpload = async (e) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return
      
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      setAvatarUploading(true)

      // Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get Public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const avatarUrl = data.publicUrl

      // Update users table
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      toast.success('อัปเดตรูปโปรไฟล์สำเร็จ')
      await refreshProfile()
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error('อัปโหลดรูปภาพล้มเหลว กรุณาลองใหม่')
    } finally {
      setAvatarUploading(false)
    }
  }

  const DEFAULT_BACKGROUNDS = [
    { id: 'warm', url: '/backgrounds/bg_warm.png', label: 'Warm Pastel' },
    { id: 'cool', url: '/backgrounds/bg_cool.png', label: 'Cool Blue' },
    { id: 'landscape', url: '/backgrounds/bg_landscape.png', label: 'Minimal Landscape' },
    { id: 'dark', url: '/backgrounds/bg_dark.png', label: 'Dark Mode Glow' },
  ]

  const handleSelectDefaultBackground = async (bgUrl) => {
    try {
      setBgUploading(true)
      const { error } = await supabase.from('users').update({ background_url: bgUrl }).eq('id', user.id)
      if (error) throw error
      toast.success('อัปเดตรูปพื้นหลังสำเร็จ')
      await refreshProfile()
    } catch (err) {
      toast.error('อัปเดตรูปพื้นหลังล้มเหลว')
    } finally {
      setBgUploading(false)
    }
  }

  const handleBackgroundUpload = async (e) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return
      
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      setBgUploading(true)

      // Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('backgrounds')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get Public URL
      const { data } = supabase.storage
        .from('backgrounds')
        .getPublicUrl(filePath)

      const bgUrl = data.publicUrl

      // Update users table
      const { error: updateError } = await supabase
        .from('users')
        .update({ background_url: bgUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      toast.success('อัปเดตรูปพื้นหลังสำเร็จ')
      await refreshProfile()
    } catch (error) {
      console.error('Error uploading background:', error)
      toast.error('อัปโหลดรูปพื้นหลังล้มเหลว กรุณาลองใหม่')
    } finally {
      setBgUploading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold text-content">โปรไฟล์ของฉัน</h1>
        <p className="text-sm text-content-muted mt-0.5">จัดการข้อมูลส่วนตัวและการตั้งค่าบัญชี</p>
      </div>

      {/* Avatar + name banner */}
      <div className="card flex items-center gap-5">
        <div className="relative group flex-shrink-0">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" className="w-16 h-16 rounded-full object-cover shadow-md border border-border" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary-700 flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {avatarLetter}
            </div>
          )}
          
          <label className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity duration-200">
            {avatarUploading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span className="text-white text-xs font-medium">เปลี่ยนรูป</span>
            )}
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleAvatarUpload}
              disabled={avatarUploading}
              className="hidden"
            />
          </label>
        </div>
        <div className="flex-1">
          <p className="text-lg font-bold text-content">{profile?.full_name || '—'}</p>
          <p className="text-sm text-content-muted">{user?.email}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="px-2 py-0.5 bg-primary-50 text-primary-700 text-xs font-semibold rounded-full border border-primary-200">
              {activeRole === 'student' ? 'นักศึกษา' : activeRole === 'supervisor' ? 'พี่เลี้ยง' : activeRole === 'admin' ? 'ผู้ดูแลระบบ' : activeRole}
            </span>
            {badges.map(b => (
              <span key={b.id} title={b.desc} className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${b.color}`}>
                {b.icon} {b.title}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Change Background ---- */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon size={18} className="text-primary-700" />
          <h2 className="font-semibold text-content">รูปภาพพื้นหลัง</h2>
        </div>
        <div className="flex items-center gap-4">
          {profile?.background_url ? (
            <div className="h-24 w-40 rounded-xl overflow-hidden shadow border border-border relative group">
              <img src={profile.background_url} alt="Background" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <label className="text-white text-xs font-medium cursor-pointer py-1 px-3 bg-black/40 rounded-full hover:bg-black/60 transition-colors">
                  {bgUploading ? 'กำลังอัปโหลด...' : 'เปลี่ยนรูป'}
                  <input type="file" accept="image/*" onChange={handleBackgroundUpload} disabled={bgUploading} className="hidden" />
                </label>
              </div>
            </div>
          ) : (
            <div className="h-24 w-40 rounded-xl bg-surface-hover border-2 border-dashed border-border flex flex-col items-center justify-center text-content-muted">
              <ImageIcon size={24} className="mb-2 opacity-50" />
              <span className="text-xs">ไม่มีรูปพื้นหลัง</span>
            </div>
          )}
          
          <div className="flex-1">
            <p className="text-sm text-content-muted mb-3">
              เพิ่มรูปภาพพื้นหลังที่ต้องการเพื่อปรับแต่งหน้าแดชบอร์ดให้เป็นสไตล์ของคุณ
            </p>
            {!profile?.background_url && (
              <label className="btn-primary btn-sm inline-flex items-center gap-2 cursor-pointer">
                {bgUploading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ImageIcon size={15} />
                )}
                {bgUploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปของฉัน'}
                <input type="file" accept="image/*" onChange={handleBackgroundUpload} disabled={bgUploading} className="hidden" />
              </label>
            )}
            {profile?.background_url && (
              <button
                type="button"
                disabled={bgUploading}
                onClick={async () => {
                  try {
                    setBgUploading(true)
                    const { error } = await supabase.from('users').update({ background_url: null }).eq('id', user.id)
                    if (error) throw error
                    toast.success('ลบรูปพื้นหลังสำเร็จ')
                    await refreshProfile()
                  } catch (err) {
                    toast.error('ลบรูปพื้นหลังล้มเหลว')
                  } finally {
                    setBgUploading(false)
                  }
                }}
                className="text-xs text-danger hover:underline font-medium"
              >
                ลบรูปภาพพื้นหลัง
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <p className="text-sm font-semibold text-content mb-3">หรือเลือกจากรูปภาพเริ่มต้น:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DEFAULT_BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                type="button"
                onClick={() => handleSelectDefaultBackground(bg.url)}
                disabled={bgUploading}
                className={`relative rounded-xl overflow-hidden border-2 transition-all h-24 group ${profile?.background_url === bg.url ? 'border-primary-600 shadow-md ring-2 ring-primary-100 ring-offset-1' : 'border-border hover:border-primary-400'}`}
              >
                <img src={bg.url} alt={bg.label} className="w-full h-full object-cover" />
                <div className={`absolute inset-0 bg-black/40 flex flex-col items-center justify-center transition-opacity ${profile?.background_url === bg.url ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <span className="text-white text-[10px] font-bold px-2 py-1 bg-black/60 rounded-full backdrop-blur-sm shadow-sm">{profile?.background_url === bg.url ? 'ใช้อยู่' : 'เลือกรูปนี้'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Edit Profile Form ---- */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <User size={18} className="text-primary-700" />
          <h2 className="font-semibold text-content">แก้ไขข้อมูลส่วนตัว</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* Full Name */}
          <div>
            <label htmlFor="profile-full-name" className="block text-sm font-medium text-content-muted mb-1.5">
              ชื่อ-นามสกุล <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                id="profile-full-name"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="ชื่อ-นามสกุล"
                className="input pl-9"
                required
              />
            </div>
          </div>

          {/* Student ID (Only for students) */}
          {isStudent && (
            <div>
              <label htmlFor="profile-student-code" className="block text-sm font-medium text-content-muted mb-1.5">
                รหัสนักศึกษา
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="profile-student-code"
                  type="text"
                  value={studentCode}
                  onChange={e => setStudentCode(e.target.value)}
                  placeholder="รหัสนักศึกษา"
                  className="input pl-9"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="profile-email" className="block text-sm font-medium text-content-muted mb-1.5">
              อีเมล
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="อีเมล"
                className="input pl-9"
              />
            </div>
            {email.trim().toLowerCase() !== user?.email && (
              <p className="text-xs text-warning mt-1.5 flex items-center gap-1">
                <ShieldCheck size={12} />
                การเปลี่ยนอีเมลจะต้องยืนยันผ่านลิงก์ที่ส่งไปยังอีเมลใหม่
              </p>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <button
              id="save-profile-btn"
              type="submit"
              disabled={profileLoading}
              className="btn-primary btn-sm disabled:opacity-60 flex items-center gap-2"
            >
              {profileLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={15} />
              )}
              {profileLoading ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
          </div>
        </form>
      </div>

      {/* ---- Change Password Form ---- */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <Lock size={18} className="text-primary-700" />
          <h2 className="font-semibold text-content">เปลี่ยนรหัสผ่าน</h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-5">
          {/* Current Password */}
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-content-muted mb-1.5">
              รหัสผ่านปัจจุบัน <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                id="current-password"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="รหัสผ่านปัจจุบัน"
                className="input pl-9 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-content-muted"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-content-muted mb-1.5">
              รหัสผ่านใหม่ <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                id="new-password"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                className="input pl-9 pr-10"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-content-muted"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-content-muted mb-1.5">
              ยืนยันรหัสผ่านใหม่ <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="ยืนยันรหัสผ่านใหม่"
                className={`input pl-9 pr-10 ${
                  confirmPassword && newPassword !== confirmPassword ? 'border-danger/60 focus:ring-danger/30' : ''
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-content-muted"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-danger mt-1.5">รหัสผ่านไม่ตรงกัน</p>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <button
              id="change-password-btn"
              type="submit"
              disabled={passwordLoading}
              className="btn-primary btn-sm disabled:opacity-60 flex items-center gap-2"
            >
              {passwordLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Lock size={15} />
              )}
              {passwordLoading ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
