import { useState, useEffect } from 'react'
import { X, Bell, RefreshCw, ChevronRight, ArrowRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

// ─── Bump this version string on every new deploy ──────────────────────────
const CURRENT_VERSION = '1.4.0'

// Updates specific to each role
const UPDATES_BY_ROLE = {
  mentor: [
    {
      icon: Bell,
      title: 'Toggle Push Notifications',
      desc: 'You can now turn push notifications on or off directly from the sidebar. Look for the bell icon at the bottom left.',
    },
    {
      icon: RefreshCw,
      title: 'Auto-Refresh on Return',
      desc: 'When you come back to the app after being away, data refreshes automatically — no need to reload manually.',
    },
  ],
  student: [
    {
      icon: Bell,
      title: 'Toggle Push Notifications',
      desc: 'You can now turn push notifications on or off directly from the sidebar. Look for the bell icon at the bottom left.',
    },
    {
      icon: RefreshCw,
      title: 'Auto-Refresh on Return',
      desc: 'When you come back to the app after being away, data refreshes automatically — no need to reload manually.',
    },
  ],
}

const ALLOWED_ROLES = ['mentor', 'student']

export default function WhatsNewModal() {
  const { activeRole } = useAuth()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  const updates = UPDATES_BY_ROLE[activeRole] || []

  useEffect(() => {
    if (!ALLOWED_ROLES.includes(activeRole)) return
    const seen = localStorage.getItem('whatsNewVersion')
    if (seen !== CURRENT_VERSION) {
      const t = setTimeout(() => setOpen(true), 1000)
      return () => clearTimeout(t)
    }
  }, [activeRole])

  const handleClose = () => {
    localStorage.setItem('whatsNewVersion', CURRENT_VERSION)
    setOpen(false)
  }

  const handleNext = () => {
    if (step < updates.length - 1) {
      setStep(s => s + 1)
    } else {
      handleClose()
    }
  }

  if (!open || updates.length === 0) return null

  const current = updates[step]
  const Icon = current.icon
  const isLast = step === updates.length - 1

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }}
      onClick={handleClose}
    >
      <div
        className="w-full sm:max-w-sm bg-card rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{
          animation: 'wn-in 0.3s cubic-bezier(.22,1,.36,1) both',
          boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <span className="text-xs font-semibold tracking-widest uppercase text-content-muted">
            What&apos;s New &mdash; v{CURRENT_VERSION}
          </span>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-content-muted hover:text-content hover:bg-surface-hover transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pt-6 pb-2">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ background: 'var(--color-surface-hover)' }}
          >
            <Icon size={20} className="text-content-muted" />
          </div>

          {/* Step indicator */}
          <p className="text-xs text-content-muted mb-1">
            {step + 1} / {updates.length}
          </p>

          {/* Title */}
          <h2 className="text-content font-semibold text-lg leading-snug mb-2">
            {current.title}
          </h2>

          {/* Description */}
          <p className="text-content-muted text-sm leading-relaxed">
            {current.desc}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 px-5 pt-5">
          {updates.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === step ? '24px' : '6px',
                background: i === step ? 'var(--color-content)' : 'var(--color-border)',
              }}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 mt-2">
          <button
            onClick={handleClose}
            className="text-xs text-content-muted hover:text-content transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-2 text-sm font-semibold text-content border border-border rounded-lg px-4 py-2 hover:bg-surface-hover transition-colors"
          >
            {isLast ? 'Got it' : 'Next'}
            {isLast ? <ArrowRight size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes wn-in {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
      `}</style>
    </div>
  )
}
