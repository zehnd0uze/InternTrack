import { useState, useEffect } from 'react'
import { X, Bell, RefreshCw, ChevronRight, Zap } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

// ─── Bump this on every new deploy ────────────────────────────────────────────
const CURRENT_VERSION = '1.4.0'

const UPDATES_BY_ROLE = {
  mentor: [
    {
      icon: Bell,
      tag: 'การแจ้งเตือน',
      title: 'เปิด-ปิดการแจ้งเตือนได้เอง',
      desc: 'กดปุ่มกระดิ่งที่เมนูด้านซ้ายล่างเพื่อเปิดหรือปิดการรับการแจ้งเตือนแบบ Push ได้ทันที',
    },
    {
      icon: RefreshCw,
      tag: 'ประสิทธิภาพ',
      title: 'รีเฟรชข้อมูลอัตโนมัติ',
      desc: 'เมื่อกลับมาใช้งานแอปหลังจากออกไปนาน ระบบจะโหลดข้อมูลล่าสุดให้อัตโนมัติ ไม่ต้องรีเฟรชเอง',
    },
  ],
  student: [
    {
      icon: Bell,
      tag: 'การแจ้งเตือน',
      title: 'เปิด-ปิดการแจ้งเตือนได้เอง',
      desc: 'กดปุ่มกระดิ่งที่เมนูด้านซ้ายล่างเพื่อเปิดหรือปิดการรับการแจ้งเตือนแบบ Push ได้ทันที',
    },
    {
      icon: RefreshCw,
      tag: 'ประสิทธิภาพ',
      title: 'รีเฟรชข้อมูลอัตโนมัติ',
      desc: 'เมื่อกลับมาใช้งานแอปหลังจากออกไปนาน ระบบจะโหลดข้อมูลล่าสุดให้อัตโนมัติ ไม่ต้องรีเฟรชเอง',
    },
  ],
}

const ALLOWED_ROLES = ['mentor', 'student']

// Accent colors per update index
const ACCENTS = ['#6366f1', '#0ea5e9']

export default function WhatsNewModal() {
  const { activeRole } = useAuth()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [exiting, setExiting] = useState(false)

  const updates = UPDATES_BY_ROLE[activeRole] || []

  useEffect(() => {
    if (!ALLOWED_ROLES.includes(activeRole)) return
    const seen = localStorage.getItem('whatsNewVersion')
    if (seen !== CURRENT_VERSION) {
      const t = setTimeout(() => setOpen(true), 900)
      return () => clearTimeout(t)
    }
  }, [activeRole])

  const dismiss = () => {
    setExiting(true)
    setTimeout(() => {
      localStorage.setItem('whatsNewVersion', CURRENT_VERSION)
      setOpen(false)
      setExiting(false)
    }, 280)
  }

  const next = () => {
    if (step < updates.length - 1) {
      setStep(s => s + 1)
    } else {
      dismiss()
    }
  }

  if (!open || updates.length === 0) return null

  const cur = updates[step]
  const Icon = cur.icon
  const accent = ACCENTS[step % ACCENTS.length]
  const isLast = step === updates.length - 1

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998]"
        style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: exiting ? 'wn-fade-out 0.28s ease both' : 'wn-fade-in 0.3s ease both',
        }}
        onClick={dismiss}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-6 pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full sm:max-w-sm overflow-hidden"
          style={{
            borderRadius: '20px 20px 0 0',
            background: 'var(--color-card, #18181b)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 32px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
            animation: exiting
              ? 'wn-slide-down 0.28s cubic-bezier(.4,0,1,1) both'
              : 'wn-slide-up 0.38s cubic-bezier(.22,1,.36,1) both',
          }}
        >
          {/* Accent gradient bar */}
          <div style={{
            height: '3px',
            background: `linear-gradient(90deg, ${accent}, ${accent}99)`,
            transition: 'background 0.4s ease',
          }} />

          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-5 pb-0">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${accent}18` }}
              >
                <Zap size={15} style={{ color: accent }} />
              </div>
              <div>
                <p className="font-bold text-sm text-content leading-none">อัปเดตใหม่</p>
                <p className="text-xs mt-0.5" style={{ color: accent }}>เวอร์ชัน {CURRENT_VERSION}</p>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
              style={{ color: 'var(--color-content-muted)', background: 'var(--color-surface-hover)' }}
            >
              <X size={13} />
            </button>
          </div>

          {/* Feature card */}
          <div className="px-5 pt-5 pb-3">
            <div
              className="rounded-2xl p-4 transition-all duration-300"
              style={{
                background: `${accent}0D`,
                border: `1px solid ${accent}22`,
              }}
            >
              {/* Tag */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${accent}22` }}
                >
                  <Icon size={14} style={{ color: accent }} />
                </div>
                <span
                  className="text-xs font-semibold tracking-wide uppercase"
                  style={{ color: accent }}
                >
                  {cur.tag}
                </span>
              </div>

              {/* Title */}
              <h2 className="font-bold text-base text-content mb-1.5 leading-snug">
                {cur.title}
              </h2>

              {/* Desc */}
              <p className="text-xs text-content-muted leading-relaxed">
                {cur.desc}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-5" style={{ height: '1px', background: 'var(--color-border, rgba(255,255,255,0.06))' }} />

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4">
            {/* Progress dots */}
            <div className="flex gap-1.5 items-center">
              {updates.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className="rounded-full transition-all duration-300"
                  style={{
                    height: '5px',
                    width: i === step ? '18px' : '5px',
                    background: i === step ? accent : 'var(--color-border, rgba(255,255,255,0.15))',
                  }}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={dismiss}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  color: 'var(--color-content-muted)',
                  background: 'var(--color-surface-hover)',
                }}
              >
                ข้าม
              </button>
              <button
                onClick={next}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg text-white transition-all duration-200 hover:opacity-90 active:scale-95"
                style={{
                  background: accent,
                  boxShadow: `0 4px 12px ${accent}55`,
                }}
              >
                {isLast ? 'เข้าใจแล้ว' : 'ถัดไป'}
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes wn-fade-in   { from { opacity:0 } to { opacity:1 } }
        @keyframes wn-fade-out  { from { opacity:1 } to { opacity:0 } }
        @keyframes wn-slide-up  {
          from { transform: translateY(32px); opacity:0; }
          to   { transform: translateY(0);   opacity:1; }
        }
        @keyframes wn-slide-down {
          from { transform: translateY(0);   opacity:1; }
          to   { transform: translateY(32px); opacity:0; }
        }
        @media (min-width: 640px) {
          @keyframes wn-slide-up {
            from { transform: translateY(16px) scale(0.97); opacity:0; }
            to   { transform: translateY(0)    scale(1);    opacity:1; }
          }
          @keyframes wn-slide-down {
            from { transform: translateY(0)    scale(1);    opacity:1; }
            to   { transform: translateY(16px) scale(0.97); opacity:0; }
          }
        }
      `}</style>
    </>
  )
}
