import { useState, useEffect } from 'react'
import { X, Sparkles, CheckCircle, Bell, RefreshCw, Shield, Edit3, ChevronRight } from 'lucide-react'

// ─── Update this version string every time you deploy new features ───────────
const CURRENT_VERSION = '1.4.0'

const UPDATES = [
  {
    icon: Edit3,
    color: '#3b82f6',
    bg: '#eff6ff',
    title: 'แก้ไขข้อมูลการเข้างานได้',
    desc: 'ผู้ดูแลระบบสามารถแก้ไขเวลาเข้า-ออก และชั่วโมงทำงานของนักศึกษาได้โดยตรง',
  },
  {
    icon: Bell,
    color: '#8b5cf6',
    bg: '#f5f3ff',
    title: 'เปิด/ปิดการแจ้งเตือน',
    desc: 'สามารถกดปุ่มเพื่อเปิดหรือปิดรับการแจ้งเตือนแบบ Push ได้ที่เมนูด้านซ้าย',
  },
  {
    icon: RefreshCw,
    color: '#10b981',
    bg: '#ecfdf5',
    title: 'รีเฟรชข้อมูลอัตโนมัติ',
    desc: 'เมื่อกลับมาใช้งานแอปหลังจากหยุดพักนาน ระบบจะโหลดข้อมูลใหม่ให้อัตโนมัติ',
  },
  {
    icon: Shield,
    color: '#f59e0b',
    bg: '#fffbeb',
    title: 'ระบบจัดการข้อผิดพลาด',
    desc: 'หน้าเว็บจะไม่ขาวโล่งอีกต่อไป หากเกิดปัญหาจะมีปุ่มกด "โหลดใหม่" ให้ทันที',
  },
]

export default function WhatsNewModal() {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    const seen = localStorage.getItem('whatsNewVersion')
    if (seen !== CURRENT_VERSION) {
      // Small delay so the app loads first
      const t = setTimeout(() => setOpen(true), 1200)
      return () => clearTimeout(t)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem('whatsNewVersion', CURRENT_VERSION)
    setOpen(false)
  }

  if (!open) return null

  const active = UPDATES[activeIdx]

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={handleClose}
    >
      <div
        className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: 'slideUp 0.35s cubic-bezier(.22,1,.36,1) both' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 text-center"
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
          }}
        >
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X size={16} />
          </button>

          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 mb-3 mx-auto">
            <Sparkles size={28} className="text-white" />
          </div>
          <h2 className="text-white font-bold text-xl">มีอัปเดตใหม่! 🎉</h2>
          <p className="text-white/75 text-sm mt-1">เวอร์ชัน {CURRENT_VERSION}</p>
        </div>

        {/* Update cards — horizontally scrollable */}
        <div className="px-6 py-5 space-y-3">
          {UPDATES.map((u, i) => {
            const Icon = u.icon
            const isActive = i === activeIdx
            return (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-200"
                style={{
                  background: isActive ? u.bg : 'transparent',
                  border: `2px solid ${isActive ? u.color + '40' : 'transparent'}`,
                }}
              >
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: u.bg }}
                >
                  <Icon size={18} style={{ color: u.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-content">{u.title}</p>
                  {isActive && (
                    <p className="text-xs text-content-muted mt-0.5 leading-relaxed">
                      {u.desc}
                    </p>
                  )}
                </div>
                {isActive && (
                  <CheckCircle size={16} style={{ color: u.color, flexShrink: 0 }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Dot indicators + CTA */}
        <div className="px-6 pb-6 flex flex-col items-center gap-4">
          {/* Dots */}
          <div className="flex gap-1.5">
            {UPDATES.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i === activeIdx ? '20px' : '6px',
                  height: '6px',
                  background: i === activeIdx ? '#6366f1' : '#d1d5db',
                }}
              />
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={activeIdx < UPDATES.length - 1 ? () => setActiveIdx(i => i + 1) : handleClose}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
            }}
          >
            {activeIdx < UPDATES.length - 1 ? (
              <>ถัดไป <ChevronRight size={16} /></>
            ) : (
              <>เริ่มใช้งานเลย! <Sparkles size={16} /></>
            )}
          </button>

          <button
            onClick={handleClose}
            className="text-xs text-content-muted hover:text-content transition-colors"
          >
            ข้ามและไม่แสดงอีก
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
      `}</style>
    </div>
  )
}
