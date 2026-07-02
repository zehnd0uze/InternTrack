import { useState, useEffect } from 'react'
import { X, Bell, ChevronRight, ChevronLeft, AlertTriangle, RefreshCw, User, FileText } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const CURRENT_VERSION = '1.5.0'
const DISMISS_KEY = 'whatsNew_dismissed_v' + CURRENT_VERSION

// Global app gradient (Emerald -> Sky Blue -> Indigo)
const GRADIENT = 'linear-gradient(135deg, #10B981 0%, #0EA5E9 50%, #6366F1 100%)'
const GRADIENT_HORIZ = 'linear-gradient(90deg, #10B981 0%, #0EA5E9 50%, #6366F1 100%)'

const UPDATES_BY_ROLE = {
  mentor: [
    {
      icon: AlertTriangle,
      tag: '\u0e1bระกาศจากทีมงาน',
      title: '\u0e1bรับปรุงระบบฐานข้อมูล',
      desc: '\u0e40มื่อคืน 2 ก.ย. 2569 ทีมงานได้ดำเนินการปรับปรุงฐานข้อมูลสถาบันการศึกษา ซึ่งอาจทำให้ข้อมูลบางส่วนสูญหายไป ขออภัยในความไม่สะดวกที่เกิดขึ้น',
    },
    {
      icon: User,
      tag: '\u0e2aิ่งที่ต้องทำ',
      title: '\u0e15รวจสอบข้อมูลโปรไฟล์ของท่าน',
      desc: '\u0e01รุณาเข้าไปที่ \u201c\u0e42ปรไฟล์\u201d \u0e41ละตรวจสอบว่าชื่อและข้อมูลถูกต้องครบถ้วน \u0e2bากข้อมูลไม่ครบกรุณาแก้ไขให้เรียบร้อยครับ',
    },
  ],
  student: [
    {
      icon: AlertTriangle,
      tag: '\u0e1bระกาศจากทีมงาน',
      title: '\u0e1bรับปรุงระบบฐานข้อมูล',
      desc: '\u0e40มื่อคืน 2 ก.ย. 2569 ทีมงานได้ดำเนินการปรับปรุงฐานข้อมูลสถาบันการศึกษา ซึ่งอาจทำให้ข้อมูลการลงเวลาและบันทึกประจำวันสูญหายไป ขออภัยในความไม่สะดวกที่เกิดขึ้น',
    },
    {
      icon: User,
      tag: '\u0e2aิ่งที่ต้องทำ 1',
      title: '\u0e01รอกข้อมูลโปรไฟล์ใหม่',
      desc: '\u0e01รุณาไปที่ \u201c\u0e42ปรไฟล์\u201d \u0e41ละกรอกข้อมูลให้ครบ\n\u2022 \u0e0aื่อ-นามสกุล\n\u2022 \u0e23หัสนักศึกษา\n\u2022 สถาบัน / คณะ / สาขา',
    },
    {
      icon: FileText,
      tag: '\u0e2aิ่งที่ต้องทำ 2',
      title: '\u0e23ะบบยังใช้งานได้ตามปกติ',
      desc: '\u0e2bลังกรอกโปรไฟล์เรียบร้อยแล้ว สามารถลงเวลาและบันทึกประจำวันได้ตามปกติได้เลยครับ \u0e02อเป็นกำลังใจในการฝึกงานได้เลยนะครับ! \ud83d\ude4f',
    },
  ],
  admin: [
    {
      icon: AlertTriangle,
      tag: '\u0e2aำหรับ Admin',
      title: '\u0e1bรับปรุงระบบฐานข้อมูล',
      desc: '\u0e40มื่อคืน 2 ก.ย. 2569 \u0e1bรับปรุงฐานข้อมูลสถาบัน ทำให้ระบบการลงเวลาและบันทึกประจำวันของนักศึกษาทั้งหมดสูญหายไป ขอโทษแทนทีมอย่างจริงจัง สามารถบอกให้นักศึกษาแต่ละคนกรอกข้อมูลโปรไฟล์ใหม่ได้เลยครับ',
    },
    {
      icon: RefreshCw,
      tag: '\u0e2aิ่งที่ยังใช้งานได้ปกติ',
      title: '\u0e23ะบบยังคงใช้งานได้ทุกฟีเจอร์',
      desc: '\u0e23ะบบทั้งหมดยังใช้งานได้ตามปกติ มีแค่ข้อมูลส่วนประวัติการลงเวลา/บันทึกที่ต้องเริ่มใหม่เท่านั้น',
    },
  ],
  supervisor: [
    {
      icon: AlertTriangle,
      tag: '\u0e1bระกาศ',
      title: '\u0e1bรับปรุงระบบฐานข้อมูล',
      desc: '\u0e40มื่อคืน 2 ก.ย. 2569 \u0e40กิดการปรับปรุงระบบทำให้ข้อมูลบางส่วนสูญหาย \u0e2a่งผลให้การลงเวลาของนักศึกษาหายไป ขอโทษแทนครับ แนะนำให้นักศึกษาในความดูแลของท่านกรอกโปรไฟล์ใหม่ด้วยนะครับ',
    },
  ],
}

const ALLOWED_ROLES = ['mentor', 'student', 'admin', 'supervisor']

export default function WhatsNewModal() {
  const { activeRole } = useAuth()
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [step, setStep] = useState(0)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const updates = UPDATES_BY_ROLE[activeRole] || []

  useEffect(() => {
    if (!ALLOWED_ROLES.includes(activeRole)) return
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
  const isLast = step === updates.length - 1

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '20px',
        zIndex: 9999,
        width: 'min(330px, calc(100vw - 40px))',
        animation: exiting
          ? 'wn-out 0.32s cubic-bezier(.4,0,1,1) both'
          : 'wn-in 0.42s cubic-bezier(.22,1,.36,1) both',
      }}
    >
      <div
        style={{
          borderRadius: '18px',
          background: 'var(--color-card, #1c1c1e)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Accent stripe */}
        <div style={{ height: '3px', background: GRADIENT_HORIZ }} />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 18px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Logo SVG matching the favicon */}
            <svg viewBox="0 0 100 100" width="24" height="24">
              <rect width="100" height="100" rx="22.5" fill="url(#wn-grad)" />
              <path d="M 25 35 h 50" fill="none" stroke="white" strokeWidth="12" strokeLinecap="round" />
              <path d="M 50 35 v 40" fill="none" stroke="white" strokeWidth="12" strokeLinecap="round" />
              <circle cx="75" cy="75" r="6" fill="white" />
              <defs>
                <linearGradient id="wn-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="50%" stopColor="#0EA5E9" />
                  <stop offset="100%" stopColor="#6366F1" />
                </linearGradient>
              </defs>
            </svg>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-content, #fff)', letterSpacing: '-0.01em', lineHeight: 1 }}>
                อัปเดตใหม่
              </p>
              <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-content-muted, #a1a1aa)', marginTop: '3px' }}>
                เวอร์ชัน {CURRENT_VERSION}
              </p>
            </div>
          </div>
          <button
            onClick={dismiss}
            style={{
              width: '26px', height: '26px', borderRadius: '50%', border: 'none',
              background: 'rgba(255,255,255,0.04)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-content-muted, #71717a)', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '0 18px 12px' }}>
          <div style={{
            borderRadius: '14px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
            padding: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Icon size={14} color="#0EA5E9" />
              <span style={{ 
                fontSize: '11px', fontWeight: 700, letterSpacing: '0.02em',
                background: GRADIENT_HORIZ, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>
                {cur.tag}
              </span>
            </div>
            <p style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-content, #fff)', lineHeight: 1.4, marginBottom: '6px' }}>
              {cur.title}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-content-muted, #a1a1aa)', lineHeight: 1.55 }}>
              {cur.desc}
            </p>
          </div>
        </div>

        {/* Checkbox */}
        <div style={{ padding: '0 18px 16px' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            cursor: 'pointer', userSelect: 'none', width: 'fit-content'
          }}>
            <div
              onClick={() => setDontShowAgain(v => !v)}
              style={{
                width: '16px', height: '16px', borderRadius: '4px',
                border: dontShowAgain ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                background: dontShowAgain ? GRADIENT : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', flexShrink: 0,
              }}
            >
              {dontShowAgain && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1.5 4.5L4 7L8.5 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span
              onClick={() => setDontShowAgain(v => !v)}
              style={{ fontSize: '12px', color: 'var(--color-content-muted, #94a3b8)', fontWeight: 500 }}
            >
              ไม่ต้องแสดงอีก
            </span>
          </label>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px 16px',
        }}>
          {/* Dots / back arrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {updates.length > 1 && (
              <button
                onClick={prev}
                disabled={step === 0}
                style={{
                  width: '24px', height: '24px', borderRadius: '50%', border: 'none',
                  background: step === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
                  cursor: step === 0 ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: step === 0 ? 'rgba(255,255,255,0.15)' : '#fff',
                  transition: 'background 0.15s', padding: 0
                }}
              >
                <ChevronLeft size={12} />
              </button>
            )}
            {updates.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                style={{
                  height: '4px', width: i === step ? '18px' : '4px',
                  borderRadius: '2px', border: 'none', cursor: 'pointer', padding: 0,
                  background: i === step ? '#0EA5E9' : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.25s ease',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={dismiss}
              style={{
                fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '8px',
                border: 'none', background: 'transparent',
                color: 'var(--color-content-muted, #94a3b8)', cursor: 'pointer',
                transition: 'color 0.15s', fontFamily: 'inherit',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-content-muted, #94a3b8)'}
            >
              ปิด
            </button>
            <button
              onClick={next}
              style={{
                fontSize: '12px', fontWeight: 700, padding: '6px 14px', borderRadius: '8px',
                border: 'none', background: GRADIENT, color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
                transition: 'opacity 0.15s, transform 0.1s', fontFamily: 'inherit',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {isLast ? 'เข้าใจแล้ว' : 'ถัดไป'}
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes wn-in {
          from { transform: translateY(20px) scale(0.96); opacity: 0; }
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
