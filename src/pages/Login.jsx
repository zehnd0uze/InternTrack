import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ClipboardList, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn, signInWithOAuth } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCMUModal, setShowCMUModal] = useState(false)

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

  const handleOAuthLogin = () => {
    setShowCMUModal(true)
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
        <div className="bg-card rounded-2xl shadow-card-lg p-8 animate-fade-in">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-[14px] flex items-center justify-center shadow-md mb-5 ring-1 ring-black/5 overflow-hidden">
              <img src="/favicon.svg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold text-content tracking-tight">TernieTrack</h1>
            <p className="text-content-muted text-sm mt-1.5 font-medium">ระบบติดตามการฝึกประสบการณ์วิชาชีพ</p>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-content-muted transition-colors"
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

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-content-muted">หรือ</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOAuthLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-border rounded-xl text-content font-medium hover:bg-surface-hover transition-colors disabled:opacity-60"
          >
            <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
              <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </svg>
            เข้าสู่ระบบด้วย CMU Account
          </button>

          <p className="text-center text-xs text-gray-400 mt-6">
            ติดต่อผู้ดูแลระบบหากไม่สามารถเข้าสู่ระบบได้
          </p>

          <p className="text-center text-sm text-content-muted mt-4">
            ยังไม่มีบัญชี?{' '}
            <Link to="/register" className="text-primary-700 font-semibold hover:underline">
              สมัครสมาชิก
            </Link>
          </p>
        </div>

        <p className="text-center text-white/50 text-xs mt-4">
          © 2026 TernieTrack by Zehntin Co. สงวนลิขสิทธิ์
        </p>
      </div>

      {showCMUModal && (
        <div className="modal-overlay" onClick={() => setShowCMUModal(false)}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertCircle size={28} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-content mb-2">ยังไม่เปิดให้บริการ</h3>
              <p className="text-content-muted text-sm mb-6 text-balance">
                การเข้าสู่ระบบด้วย CMU Account กำลังอยู่ในขั้นตอนประสานงานกับ ITSC มหาวิทยาลัยเชียงใหม่ กรุณารอการอัปเดตในภายหลัง
              </p>
              <button 
                onClick={() => setShowCMUModal(false)}
                className="btn-primary w-full"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
