import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmModal({ title, message, confirmLabel = 'ยืนยัน', cancelLabel = 'ยกเลิก', onConfirm, onCancel, danger = false, children }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-100' : 'bg-yellow-100'}`}>
            <AlertTriangle size={20} className={danger ? 'text-danger' : 'text-warning'} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {message && <p className="text-sm text-gray-500 mt-1">{message}</p>}
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {children && <div className="mb-4">{children}</div>}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary btn-sm">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={danger ? 'btn-danger btn-sm' : 'btn-primary btn-sm'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
