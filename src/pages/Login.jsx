import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ClipboardList, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน')
      return
    }

    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)

    if (error) {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
      toast.error('เข้าสู่ระบบล้มเหลว กรุณาตรวจสอบข้อมูล')
    } else {
      toast.success('เข้าสู่ระบบสำเร็จ!')
    }
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative bg-primary-900"
      style={{ backgroundImage: "url('/bg-login.jpg')" }}
    >
      {/* Background dark overlay for better readability */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-card-lg p-8 animate-fade-in">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary-700 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <ClipboardList size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">InternTrack</h1>
            <p className="text-gray-500 text-sm mt-1">ระบบติดตามการฝึกประสบการณ์วิชาชีพ</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" id="login-form">
            <div>
              <label htmlFor="email" className="label">อีเมล</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={error ? 'input-error' : 'input'}
                placeholder="กรอกอีเมลของคุณ"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="label">รหัสผ่าน</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`${error ? 'input-error' : 'input'} pr-10`}
                  placeholder="กรอกรหัสผ่านของคุณ"
                  autoComplete="current-password"
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

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-danger rounded-full flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base font-semibold disabled:opacity-60"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </div>
              ) : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            ติดต่อผู้ดูแลระบบหากไม่สามารถเข้าสู่ระบบได้
          </p>

          <p className="text-center text-sm text-gray-500 mt-4">
            ยังไม่มีบัญชี?{' '}
            <Link to="/register" className="text-primary-700 font-semibold hover:underline">
              สมัครสมาชิก
            </Link>
          </p>
        </div>

        <p className="text-center text-white/50 text-xs mt-4">
          © 2025 InternTrack. สงวนลิขสิทธิ์
        </p>
      </div>
    </div>
  )
}
