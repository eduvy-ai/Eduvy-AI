// ─── Modal Component ──────────────────────────────────────────
// Reusable modal dialog

import React, { useEffect, useCallback } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showCloseButton?: boolean
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
}) => {
  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={`relative bg-app-card rounded-2xl border border-app-border w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200`}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b border-app-border">
            {title && (
              <h2 className="text-lg font-bold text-app-text">{title}</h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-app-muted hover:text-app-text transition-colors text-xl bg-transparent border-none cursor-pointer p-1"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

export default Modal
