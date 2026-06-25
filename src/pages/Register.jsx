import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ClipboardList, Eye, EyeOff, UserPlus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.fullName.trim()) { setError('กรุณากรอกชื่อ-นามสกุล'); return }
    if (!form.email) { setError('กรุณากรอกอีเมล'); return }
    if (form.password.length < 6) { setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return }
    if (form.password !== form.confirmPassword) { setError('รหัสผ่านไม่ตรงกัน'); return }

    setLoading(true)
    const { error: signUpError } = await signUp(form.email, form.password, form.fullName.trim())
    setLoading(false)

    if (signUpError) {
      if (signUpError.message?.includes('already registered')) {
        setError('อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น')
      } else {
        setError('สมัครสมาชิกไม่สำเร็จ: ' + signUpError.message)
      }
      toast.error('สมัครสมาชิกล้มเหลว')
    } else {
      toast.success('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ')
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-700 to-primary-500 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="bg-white rounded-2xl shadow-card-lg p-8 animate-fade-in">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary-700 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <UserPlus size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">สมัครสมาชิก</h1>
            <p className="text-gray-500 text-sm mt-1">InternTrack — ระบบติดตามการฝึกประสบการณ์</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" id="register-form">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="label">ชื่อ-นามสกุล *</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={form.fullName}
                onChange={handleChange}
                className="input"
                placeholder="กรอกชื่อ-นามสกุล"
                autoComplete="name"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="label">อีเมล *</label>
              <input
                id="reg-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="input"
                placeholder="กรอกอีเมลของคุณ"
                autoComplete="email"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="label">รหัสผ่าน *</label>
              <div className="relative">
                <input
                  id="reg-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  className="input pr-10"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="แสดง/ซ่อนรหัสผ่าน"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="label">ยืนยันรหัสผ่าน *</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={handleChange}
                className="input"
                placeholder="กรอกรหัสผ่านอีกครั้ง"
                autoComplete="new-password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-danger rounded-full flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base font-semibold disabled:opacity-60"
            >
              {loading ? (
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังสมัครสมาชิก...
                </div>
              ) : 'สมัครสมาชิก'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            มีบัญชีอยู่แล้ว?{' '}
            <Link to="/login" className="text-primary-700 font-semibold hover:underline">
              เข้าสู่ระบบ
            </Link>
          </p>

          <p className="text-center text-xs text-gray-400 mt-2">
            หลังสมัครแล้ว กรุณาแจ้งผู้ดูแลระบบเพื่อกำหนดสิทธิ์การใช้งาน
          </p>
        </div>

        <p className="text-center text-white/50 text-xs mt-4">
          © 2025 InternTrack. สงวนลิขสิทธิ์
        </p>
      </div>
    </div>
  )
}
