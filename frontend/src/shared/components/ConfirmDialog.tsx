// ─── Confirm Dialog Component ─────────────────────────────────
// Reusable confirmation dialog to replace native confirm() and alert()

import React from 'react'
import { Warning, Trash, CheckCircle, Info } from '@phosphor-icons/react'

type DialogVariant = 'danger' | 'warning' | 'success' | 'info'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string | React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: DialogVariant
  isLoading?: boolean
  showCancel?: boolean
}

const variantConfig = {
  danger: {
    icon: Trash,
    iconBg: 'bg-app-red/20 border-app-red/30',
    iconColor: 'text-app-red',
    buttonBg: 'bg-app-red hover:bg-app-red/90',
  },
  warning: {
    icon: Warning,
    iconBg: 'bg-app-yellow/20 border-app-yellow/30',
    iconColor: 'text-app-yellow',
    buttonBg: 'bg-app-yellow hover:bg-app-yellow/90 text-black',
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-app-green/20 border-app-green/30',
    iconColor: 'text-app-green',
    buttonBg: 'bg-app-green hover:bg-app-green/90',
  },
  info: {
    icon: Info,
    iconBg: 'bg-app-blue/20 border-app-blue/30',
    iconColor: 'text-app-blue',
    buttonBg: 'bg-app-blue hover:bg-app-blue/90',
  },
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  showCancel = true,
}) => {
  if (!isOpen) return null

  const config = variantConfig[variant]
  const IconComponent = config.icon

  const handleConfirm = () => {
    onConfirm()
    if (!isLoading) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-app-card rounded-2xl border border-app-border w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5">
          {/* Icon & Title */}
          <div className="flex items-start gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${config.iconBg}`}>
              <IconComponent size={20} className={config.iconColor} weight="bold" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-app-text mb-1">{title}</h3>
              <div className="text-sm text-app-muted">{message}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {showCancel && (
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-app-bg border border-app-border text-app-text text-sm font-semibold rounded-lg hover:bg-app-bg/80 transition-colors disabled:opacity-50"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`flex-1 px-4 py-2.5 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${config.buttonBg}`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
