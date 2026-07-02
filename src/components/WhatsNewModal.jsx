import { useState, useEffect } from 'react'
import { X, Bell, ChevronRight, ChevronLeft, Zap } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const CURRENT_VERSION = '1.4.0'
const DISMISS_KEY = 'whatsNew_dismissed_v' + CURRENT_VERSION

const UPDATES_BY_ROLE = {
  mentor: [
    {
      icon: Bell,
      tag: 'การแจ้งเตือน',
      title: 'เปิด-ปิดแจ้งเตือนได้เอง',
      desc: 'กดปุ่มกระดิ่งที่เมนูด้านซ้ายล่างเพื่อเปิดหรือปิดการรับแจ้งเตือนแบบ Push ได้ทันที',
      accent: '#6366f1',
    },
  ],
  student: [
    {
      icon: Bell,
      tag: 'การแจ้งเตือน',
      title: 'เปิด-ปิดแจ้งเตือนได้เอง',
      desc: 'กดปุ่มกระดิ่งที่เมนูด้านซ้ายล่างเพื่อเปิดหรือปิดการรับแจ้งเตือนแบบ Push ได้ทันที',
      accent: '#6366f1',
    },
  ],
}

const ALLOWED_ROLES = ['mentor', 'student']

export default function WhatsNewModal() {
  const { activeRole } = useAuth()
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [step, setStep] = useState(0)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const updates = UPDATES_BY_ROLE[activeRole] || []

  useEffect(() => {
    if (!ALLOWED_ROLES.includes(activeRole)) return
    // Only skip if user explicitly checked "don't show again"
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (dismissed === 'true') return
    const t = setTimeout(() => setVisible(true), 1000)
    return () => clearTimeout(t)
  }, [activeRole])

  const dismiss = () => {
    if (dontShowAgain) {
      localStorage.setItem(DISMISS_KEY, 'true')
    }
    setExiting(true)
    setTimeout(() => {
      setVisible(false)
      setExiting(false)
      setStep(0)
    }, 320)
  }

  const next = () => {
    if (step < updates.length - 1) setStep(s => s + 1)
    else dismiss()
  }

  const prev = () => {
    if (step > 0) setStep(s => s - 1)
  }

  if (!visible || updates.length === 0) return null

  const cur = updates[step]
  const Icon = cur.icon
  const accent = cur.accent
  const isLast = step === updates.length - 1

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '20px',
        zIndex: 9999,
        width: 'min(340px, calc(100vw - 40px))',
        animation: exiting
          ? 'wn-out 0.32s cubic-bezier(.4,0,1,1) both'
          : 'wn-in 0.42s cubic-bezier(.22,1,.36,1) both',
      }}
    >
      <div
        style={{
          borderRadius: '16px',
          background: 'var(--color-card, #1c1c1e)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: `0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04), 0 0 40px ${accent}18`,
          overflow: 'hidden',
        }}
      >
        {/* Accent stripe */}
        <div style={{
          height: '2px',
          background: `linear-gradient(90deg, ${accent} 0%, ${accent}44 100%)`,
          transition: 'background 0.4s ease',
        }} />

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '8px',
              background: `${accent}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Zap size={13} color={accent} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-content, #f4f4f5)', letterSpacing: '-0.01em' }}>
              อัปเดตใหม่
            </span>
            <span style={{
              fontSize: '10px', fontWeight: 600,
              padding: '2px 7px', borderRadius: '20px',
              background: `${accent}18`, color: accent, border: `1px solid ${accent}30`,
            }}>
              v{CURRENT_VERSION}
            </span>
          </div>
          <button
            onClick={dismiss}
            style={{
              width: '24px', height: '24px', borderRadius: '50%', border: 'none',
              background: 'rgba(255,255,255,0.06)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-content-muted, #71717a)', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >
            <X size={12} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '14px' }}>
          <div style={{
            borderRadius: '12px',
            background: `${accent}0C`,
            border: `1px solid ${accent}1A`,
            padding: '12px',
            transition: 'all 0.3s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '7px',
                background: `${accent}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={12} color={accent} />
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: accent }}>
                {cur.tag}
              </span>
            </div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-content, #f4f4f5)', lineHeight: 1.4, marginBottom: '6px' }}>
              {cur.title}
            </p>
            <p style={{ fontSize: '11.5px', color: 'var(--color-content-muted, #a1a1aa)', lineHeight: 1.6 }}>
              {cur.desc}
            </p>
          </div>
        </div>

        {/* Don't show again checkbox */}
        <div style={{ padding: '0 14px 10px' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            cursor: 'pointer', userSelect: 'none',
          }}>
            <div
              onClick={() => setDontShowAgain(v => !v)}
              style={{
                width: '15px', height: '15px',
                borderRadius: '4px',
                border: dontShowAgain ? `2px solid ${accent}` : '2px solid rgba(255,255,255,0.2)',
                background: dontShowAgain ? accent : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.18s ease',
                flexShrink: 0,
                cursor: 'pointer',
              }}
            >
              {dontShowAgain && (
                <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                  <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span
              onClick={() => setDontShowAgain(v => !v)}
              style={{ fontSize: '11px', color: 'var(--color-content-muted, #a1a1aa)' }}
            >
              ไม่ต้องแสดงอีก
            </span>
          </label>
        </div>

        {/* Divider */}
        <div style={{ margin: '0 14px', height: '1px', background: 'rgba(255,255,255,0.06)' }} />

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px 13px',
        }}>
          {/* Dots + back arrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {updates.length > 1 && (
              <button
                onClick={prev}
                disabled={step === 0}
                style={{
                  width: '22px', height: '22px', borderRadius: '50%', border: 'none',
                  background: step === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
                  cursor: step === 0 ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: step === 0 ? 'rgba(255,255,255,0.18)' : 'var(--color-content-muted, #a1a1aa)',
                  transition: 'background 0.15s',
                }}
              >
                <ChevronLeft size={11} />
              </button>
            )}
            {updates.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                style={{
                  height: '4px', width: i === step ? '16px' : '4px',
                  borderRadius: '2px', border: 'none', cursor: 'pointer', padding: 0,
                  background: i === step ? accent : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.25s ease',
                }}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={dismiss}
              style={{
                fontSize: '11px', fontWeight: 600, padding: '5px 10px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
                color: 'var(--color-content-muted, #71717a)', cursor: 'pointer',
                transition: 'background 0.15s', fontFamily: 'inherit',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              ปิด
            </button>
            <button
              onClick={next}
              style={{
                fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '8px',
                border: 'none', background: accent, color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
                boxShadow: `0 4px 14px ${accent}55`,
                transition: 'opacity 0.15s, transform 0.1s', fontFamily: 'inherit',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {isLast ? 'เข้าใจแล้ว' : 'ถัดไป'}
              <ChevronRight size={11} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes wn-in {
          from { transform: translateY(20px) scale(0.95); opacity: 0; }
          to   { transform: translateY(0)    scale(1);    opacity: 1; }
        }
        @keyframes wn-out {
          from { transform: translateY(0)    scale(1);    opacity: 1; }
          to   { transform: translateY(16px) scale(0.96); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
