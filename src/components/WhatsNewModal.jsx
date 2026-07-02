import { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft, AlertTriangle, User, FileText, Bell, Shield, Database, Star, CheckCircle2, Clock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const CURRENT_VERSION = '1.6.2'
const DISMISS_KEY = 'whatsNew_dismissed_v' + CURRENT_VERSION

const GRADIENT = 'linear-gradient(135deg, #10B981 0%, #0EA5E9 50%, #6366F1 100%)'
const GRADIENT_HORIZ = 'linear-gradient(90deg, #10B981 0%, #0EA5E9 50%, #6366F1 100%)'

// What's new for each role — comprehensive update
const UPDATES_BY_ROLE = {
  student: [
    {
      icon: AlertTriangle,
      color: '#F59E0B',
      tag: 'ประกาศสำคัญ',
      title: 'ระบบมีการอัปเดตข้อมูลครั้งใหญ่',
      desc: 'เมื่อคืนวันที่ 2 ก.ค. 2569 ทีมงานได้ปรับปรุงฐานข้อมูลสถาบันการศึกษา ซึ่งทำให้ข้อมูลการลงเวลาและบันทึกประจำวันสูญหายไป ขออภัยในความไม่สะดวกที่เกิดขึ้นอย่างจริงใจครับ',
      actions: [],
    },
    {
      icon: User,
      color: '#0EA5E9',
      tag: 'สิ่งที่ต้องทำ — โปรไฟล์',
      title: 'อัปเดตข้อมูลโปรไฟล์ของคุณ',
      desc: 'กรุณาไปที่หน้า "โปรไฟล์" และกรอกข้อมูลให้ครบถ้วน',
      actions: [
        'ชื่อ-นามสกุลภาษาไทยและภาษาอังกฤษ',
        'รหัสนักศึกษา (Student ID)',
        'สถาบัน / คณะ / สาขาวิชา',
        'ข้อมูลสถานที่ฝึกงานและวันเริ่มต้น-สิ้นสุด',
      ],
    },
    {
      icon: CheckCircle2,
      color: '#10B981',
      tag: 'ข่าวดี',
      title: 'ฟีเจอร์ใหม่ที่เพิ่มเข้ามา',
      desc: 'นอกจากการแก้ไขปัญหา ยังมีสิ่งใหม่ๆ ที่เพิ่มเข้ามาด้วย',
      actions: [
        'เลือกวันแจ้งเตือนได้เอง (จ-อา)',
        'ข้อมูลสถาบันการศึกษาครบถ้วนกว่าเดิม',
        'ค้นหาสถาบันด้วยชื่อภาษาอังกฤษได้แล้ว',
        'เพิ่มสาขาวิชาใหม่หลายร้อยสาขา',
      ],
    },
    {
      icon: Shield,
      color: '#0EA5E9',
      tag: 'ความปลอดภัย',
      title: 'ข้อมูลของคุณปลอดภัยแล้ว',
      desc: 'เพื่อป้องกันข้อมูลสูญหายในอนาคต เราได้ติดตั้งระบบสำรองข้อมูล (Backup) อัตโนมัติทุกวัน ข้อมูลการลงเวลาและบันทึกของคุณจะถูกเก็บรักษาอย่างดีครับ',
      actions: [],
    },
    {
      icon: Bell,
      color: '#6366F1',
      tag: 'การแจ้งเตือน',
      title: 'อย่าลืมเปิดรับการแจ้งเตือน',
      desc: 'ระบบสามารถแจ้งเตือนการลงเวลาและข่าวสารสำคัญได้แล้ว',
      actions: [
        'คลิกที่ "ไอคอนกระดิ่ง" มุมซ้ายล่างของหน้าจอ',
        'กดปุ่ม "เปิดรับการแจ้งเตือน (Push)"',
        'กดยอมรับ (Allow) ในหน้าต่างที่เด้งขึ้นมา',
      ],
    },
  ],
  mentor: [
    {
      icon: AlertTriangle,
      color: '#F59E0B',
      tag: 'ประกาศสำคัญ',
      title: 'ระบบมีการอัปเดตข้อมูลครั้งใหญ่',
      desc: 'เมื่อคืนวันที่ 2 ก.ค. 2569 ทีมงานได้ปรับปรุงฐานข้อมูลสถาบันการศึกษา ข้อมูลบางส่วนของผู้ใช้อาจสูญหายไป กรุณาตรวจสอบโปรไฟล์ของท่านให้ครบถ้วนครับ',
      actions: [],
    },
    {
      icon: Bell,
      color: '#6366F1',
      tag: 'ฟีเจอร์ใหม่',
      title: 'ตั้งวันแจ้งเตือนได้เองแล้ว!',
      desc: 'ตอนนี้สามารถเลือกวันในสัปดาห์ที่ต้องการส่งแจ้งเตือนได้แล้ว',
      actions: [
        'เลือกส่งเฉพาะวันจันทร์ถึงศุกร์',
        'หรือเลือกทุกวันตามต้องการ',
        'ตั้งค่าได้ที่เมนู "การแจ้งเตือน"',
      ],
    },
    {
      icon: Shield,
      color: '#0EA5E9',
      tag: 'ความปลอดภัย',
      title: 'ระบบสำรองข้อมูลอัตโนมัติ',
      desc: 'เพื่อความอุ่นใจ เราได้เพิ่มระบบ Backup ฐานข้อมูลอัตโนมัติทุกวัน เพื่อป้องกันเหตุข้อมูลสูญหายในอนาคตครับ',
      actions: [],
    },
    {
      icon: Bell,
      color: '#6366F1',
      tag: 'การแจ้งเตือน',
      title: 'อย่าลืมเปิดรับการแจ้งเตือน',
      desc: 'ระบบสามารถแจ้งเตือนเวลามีนักศึกษาส่งลางานหรือบันทึกประจำวันได้',
      actions: [
        'คลิกที่ "ไอคอนกระดิ่ง" มุมซ้ายล่างของหน้าจอ',
        'กดปุ่ม "เปิดรับการแจ้งเตือน (Push)"',
        'กดยอมรับ (Allow) ในหน้าต่างที่เด้งขึ้นมา',
      ],
    },
  ],
  supervisor: [
    {
      icon: AlertTriangle,
      color: '#F59E0B',
      tag: 'ประกาศ',
      title: 'ระบบมีการอัปเดตข้อมูลครั้งใหญ่',
      desc: 'เมื่อคืนวันที่ 2 ก.ค. 2569 เกิดการปรับปรุงระบบทำให้ข้อมูลประวัติการลงเวลาของนักศึกษาสูญหายไป ขอโทษแทนครับ กรุณาแจ้งให้นักศึกษาในความดูแลกรอกข้อมูลโปรไฟล์ใหม่ด้วยนะครับ',
      actions: ['กรุณาตรวจสอบรายชื่อนักศึกษาในความดูแล'],
    },
    {
      icon: CheckCircle2,
      color: '#10B981',
      tag: 'สิ่งที่ยังใช้งานได้',
      title: 'ระบบยังทำงานได้ครบทุกฟีเจอร์',
      desc: 'ฟีเจอร์ทั้งหมดยังใช้งานได้ตามปกติครับ',
      actions: [
        'อนุมัติการลางาน',
        'ดูรายงานนักศึกษา',
        'จัดการข้อมูลนักศึกษา',
      ],
    },
    {
      icon: Shield,
      color: '#0EA5E9',
      tag: 'ความปลอดภัย',
      title: 'ระบบสำรองข้อมูลอัตโนมัติ',
      desc: 'เพื่อความมั่นใจในการใช้งาน เราได้เพิ่มระบบ Backup ฐานข้อมูลอัตโนมัติทุกวัน ข้อมูลนักศึกษาในความดูแลของท่านจะปลอดภัยแน่นอนครับ',
      actions: [],
    },
    {
      icon: Bell,
      color: '#6366F1',
      tag: 'การแจ้งเตือน',
      title: 'อย่าลืมเปิดรับการแจ้งเตือน',
      desc: 'ระบบสามารถแจ้งเตือนข่าวสารที่เกี่ยวข้องกับนักศึกษาได้',
      actions: [
        'คลิกที่ "ไอคอนกระดิ่ง" มุมซ้ายล่างของหน้าจอ',
        'กดปุ่ม "เปิดรับการแจ้งเตือน (Push)"',
        'กดยอมรับ (Allow) ในหน้าต่างที่เด้งขึ้นมา',
      ],
    },
  ],
  admin: [
    {
      icon: Database,
      color: '#EF4444',
      tag: 'สำหรับ Admin',
      title: 'ข้อมูลฐานข้อมูลได้รับการปรับปรุง',
      desc: 'เมื่อคืนที่ผ่านมา เกิดเหตุการณ์ที่ทำให้ข้อมูลการลงเวลาของนักศึกษาทั้งหมดสูญหาย ขอโทษอย่างจริงใจ ระบบกู้คืน Users ทั้งหมดกลับมาแล้ว แต่ประวัติการลงเวลายังกู้คืนไม่ได้',
      actions: [
        'แจ้งให้นักศึกษากรอกโปรไฟล์ใหม่',
        'ตรวจสอบ Role ของผู้ใช้ให้ถูกต้อง',
        'Assign Supervisor ให้นักศึกษาใหม่',
      ],
    },
    {
      icon: Shield,
      color: '#10B981',
      tag: 'ระบบ Backup',
      title: 'เพิ่ม Backup อัตโนมัติแล้ว!',
      desc: 'เพื่อป้องกันปัญหาซ้ำในอนาคต ได้เพิ่มระบบ Backup อัตโนมัติผ่าน GitHub Actions แล้วครับ',
      actions: [
        'Backup ทุกคืน 01:00 น. อัตโนมัติ',
        'เก็บ Backup ไว้ 90 วัน',
        'ดาวน์โหลดได้ที่ GitHub → Actions',
      ],
    },
    {
      icon: Star,
      color: '#6366F1',
      tag: 'อัปเดตระบบ',
      title: 'สิ่งที่เพิ่มในรอบนี้',
      desc: 'นอกจากการแก้ไขปัญหา ยังมีฟีเจอร์ใหม่เพิ่มเข้ามาด้วยครับ',
      actions: [
        'ตั้งวันแจ้งเตือนแบบ Custom ได้แล้ว (จ-อา)',
        'ข้อมูลสถาบัน คณะ และสาขาวิชาครบถ้วน',
        'ค้นหาสถาบันด้วยชื่อภาษาอังกฤษและสาขา',
        'กรองนักศึกษาตามสถาบันการศึกษาได้แล้ว',
      ],
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
    const t = setTimeout(() => setVisible(true), 800)
    return () => clearTimeout(t)
  }, [activeRole])

  const dismiss = () => {
    if (dontShowAgain) localStorage.setItem(DISMISS_KEY, 'true')
    setExiting(true)
    setTimeout(() => { setVisible(false); setExiting(false); setStep(0) }, 350)
  }

  const next = () => { if (step < updates.length - 1) setStep(s => s + 1); else dismiss() }
  const prev = () => { if (step > 0) setStep(s => s - 1) }

  if (!visible || updates.length === 0) return null

  const cur = updates[step]
  const Icon = cur.icon
  const isLast = step === updates.length - 1
  const hasActions = cur.actions && cur.actions.length > 0

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={dismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          animation: exiting ? 'bd-out 0.35s ease both' : 'bd-in 0.3s ease both',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '100%', maxWidth: '440px',
            pointerEvents: 'auto',
            animation: exiting
              ? 'modal-out 0.35s cubic-bezier(.4,0,1,1) both'
              : 'modal-in 0.45s cubic-bezier(.22,1,.36,1) both',
          }}
        >
          <div style={{
            borderRadius: '24px',
            background: 'var(--color-card, #18181b)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
            overflow: 'hidden',
          }}>
            {/* Gradient top bar */}
            <div style={{ height: '3px', background: GRADIENT_HORIZ }} />

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 22px 0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: GRADIENT,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg viewBox="0 0 100 100" width="20" height="20">
                    <path d="M 25 35 h 50" fill="none" stroke="white" strokeWidth="14" strokeLinecap="round" />
                    <path d="M 50 35 v 40" fill="none" stroke="white" strokeWidth="14" strokeLinecap="round" />
                    <circle cx="75" cy="75" r="7" fill="white" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-content, #fff)', lineHeight: 1 }}>
                    สิ่งที่เกิดขึ้น & อัปเดตใหม่
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--color-content-muted, #71717a)', marginTop: '3px' }}>
                    เวอร์ชัน {CURRENT_VERSION} · {step + 1} / {updates.length}
                  </p>
                </div>
              </div>
              <button
                onClick={dismiss}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%', border: 'none',
                  background: 'rgba(255,255,255,0.05)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-content-muted, #71717a)', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--color-content-muted, #71717a)' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '18px 22px 0' }}>
              {/* Icon & Tag */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                  background: cur.color + '18',
                  border: `1px solid ${cur.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={20} color={cur.color} />
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: cur.color,
                }}>
                  {cur.tag}
                </span>
              </div>

              {/* Title */}
              <p style={{
                fontSize: '16px', fontWeight: 800,
                color: 'var(--color-content, #fff)',
                lineHeight: 1.35, marginBottom: '10px',
                letterSpacing: '-0.02em',
              }}>
                {cur.title}
              </p>

              {/* Desc */}
              <p style={{
                fontSize: '13px', color: 'var(--color-content-muted, #a1a1aa)',
                lineHeight: 1.65, marginBottom: hasActions ? '14px' : '0',
              }}>
                {cur.desc}
              </p>

              {/* Action list */}
              {hasActions && (
                <div style={{
                  borderRadius: '14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  padding: '12px 14px',
                  display: 'flex', flexDirection: 'column', gap: '8px',
                }}>
                  {cur.actions.map((action, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                        background: cur.color + '20',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginTop: '1px',
                      }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: cur.color }} />
                      </div>
                      <span style={{ fontSize: '12.5px', color: 'var(--color-content, #e4e4e7)', lineHeight: 1.5 }}>
                        {action}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Progress dots */}
            <div style={{
              display: 'flex', justifyContent: 'center', gap: '6px',
              padding: '16px 22px 0',
            }}>
              {updates.map((u, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  style={{
                    height: '4px', width: i === step ? '24px' : '6px',
                    borderRadius: '2px', border: 'none', cursor: 'pointer', padding: 0,
                    background: i === step ? (UPDATES_BY_ROLE[activeRole][i]?.color || '#0EA5E9') : 'rgba(255,255,255,0.12)',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 22px 22px',
            }}>
              {/* Don't show again */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                <div
                  onClick={() => setDontShowAgain(v => !v)}
                  style={{
                    width: '17px', height: '17px', borderRadius: '5px', flexShrink: 0,
                    border: dontShowAgain ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                    background: dontShowAgain ? GRADIENT : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  {dontShowAgain && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1.5 4.5L4 7L8.5 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span onClick={() => setDontShowAgain(v => !v)} style={{ fontSize: '11.5px', color: 'var(--color-content-muted, #94a3b8)' }}>
                  ไม่ต้องแสดงอีก
                </span>
              </label>

              {/* Nav buttons */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {step > 0 && (
                  <button
                    onClick={prev}
                    style={{
                      height: '36px', padding: '0 14px', borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                      color: 'var(--color-content, #fff)', cursor: 'pointer',
                      fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
                      transition: 'background 0.15s', fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <ChevronLeft size={14} /> ย้อนกลับ
                  </button>
                )}
                <button
                  onClick={next}
                  style={{
                    height: '36px', padding: '0 18px', borderRadius: '10px',
                    border: 'none', background: GRADIENT, color: '#fff',
                    cursor: 'pointer', fontSize: '12.5px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '5px',
                    transition: 'opacity 0.15s, transform 0.1s', fontFamily: 'inherit',
                    boxShadow: '0 4px 14px rgba(14,165,233,0.3)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {isLast ? 'เข้าใจแล้ว ✓' : 'ถัดไป'}
                  {!isLast && <ChevronRight size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bd-in   { from { opacity: 0 } to { opacity: 1 } }
        @keyframes bd-out  { from { opacity: 1 } to { opacity: 0 } }
        @keyframes modal-in  { from { transform: scale(0.92) translateY(24px); opacity: 0 } to { transform: scale(1) translateY(0); opacity: 1 } }
        @keyframes modal-out { from { transform: scale(1) translateY(0);    opacity: 1 } to { transform: scale(0.94) translateY(12px); opacity: 0 } }
      `}</style>
    </>
  )
}
