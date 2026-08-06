import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'
import { CheckCircle, Warning, XCircle, Info, X } from '@phosphor-icons/react'

type ToastVariant = 'success' | 'warning' | 'error' | 'info'

export interface ToastProps {
  id: string
  message: string
  variant?: ToastVariant
  duration?: number
  action?: { label: string; onClick: () => void }
}

interface ToastContextValue {
  show: (toast: Omit<ToastProps, 'id'>) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const variantConfig: Record<ToastVariant, { icon: React.ReactNode; bg: string; border: string }> = {
  success: {
    icon: <CheckCircle size={20} weight="fill" />,
    bg: 'bg-[var(--t-success-light)]',
    border: 'border-t-success/20',
  },
  warning: {
    icon: <Warning size={20} weight="fill" />,
    bg: 'bg-[var(--t-warning-light)]',
    border: 'border-t-warning/20',
  },
  error: {
    icon: <XCircle size={20} weight="fill" />,
    bg: 'bg-[var(--t-danger-light)]',
    border: 'border-t-danger/20',
  },
  info: {
    icon: <Info size={20} weight="fill" />,
    bg: 'bg-[var(--t-info-light)]',
    border: 'border-t-info/20',
  },
}

const variantTextColor: Record<ToastVariant, string> = {
  success: 'text-t-success',
  warning: 'text-t-warning',
  error:   'text-t-danger',
  info:    'text-t-info',
}

const ToastItem: React.FC<ToastProps & { onDismiss: () => void }> = ({
  message,
  variant = 'info',
  action,
  onDismiss,
}) => {
  const cfg = variantConfig[variant]

  return (
    <div
      role="alert"
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl
        ${cfg.bg} ${cfg.border} animate-toast-in shadow-soft-lg max-w-[calc(100vw-32px)] mx-auto`}
    >
      <span className={`shrink-0 ${variantTextColor[variant]}`}>{cfg.icon}</span>
      <p className="flex-1 text-body-sm font-medium text-t-text">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className={`text-caption font-bold ${variantTextColor[variant]} shrink-0`}
          type="button"
        >
          {action.label}
        </button>
      )}
      <button
        onClick={onDismiss}
        className="shrink-0 text-t-text-muted hover:text-t-text transition-colors"
        aria-label="Dismiss"
        type="button"
      >
        <X size={16} weight="bold" />
      </button>
    </div>
  )
}

let toastCounter = 0

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback((toast: Omit<ToastProps, 'id'>) => {
    const id = `toast-${++toastCounter}`
    const newToast = { ...toast, id }
    setToasts(prev => [...prev.slice(-4), newToast]) // max 5 toasts

    const duration = toast.duration ?? 4000
    const timer = setTimeout(() => dismiss(id), duration)
    timers.current.set(id, timer)
  }, [dismiss])

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout)
    }
  }, [])

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      {/* Toast container */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-[calc(72px+env(safe-area-inset-bottom,8px))] md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[380px] z-[400] flex flex-col gap-2 pointer-events-none"
          aria-live="polite"
        >
          {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem {...toast} onDismiss={() => dismiss(toast.id)} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export default ToastItem
