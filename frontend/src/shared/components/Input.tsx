// ─── Input Component ──────────────────────────────────────────
// Reusable form input with label and error state

import React, { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', ...props }, ref) => {
    const hasError = Boolean(error)

    return (
      <div className="w-full">
        {label && (
          <label className="text-[11px] text-app-muted font-semibold block mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            className={`w-full bg-app-card2 border rounded-xl py-3 px-3.5 text-app-text text-sm outline-none transition-all duration-150
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${hasError ? 'border-app-red/50 focus:ring-1 focus:ring-app-red/50' : 'border-white/10 focus:ring-1 focus:ring-app-green/50'}
              ${className}`}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-app-muted">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p className="text-xs text-app-red mt-1.5">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-app-muted mt-1.5">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
