// ─── Input Component ──────────────────────────────────────────
// Reusable form input — uses new design system tokens

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
          <label className="text-label text-t-text-muted font-semibold block mb-1.5 uppercase">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t-text-muted">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            className={`w-full bg-t-surface-2 border rounded-xl py-3 px-3.5 text-t-text text-body-sm outline-none transition-all duration-150
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${hasError
                ? 'border-t-danger/50 focus:ring-2 focus:ring-t-danger/20'
                : 'border-t-border focus:border-t-primary/40 focus:ring-2 focus:ring-[var(--t-primary-light)]'}
              placeholder:text-t-text-muted
              ${className}`}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-t-text-muted">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p className="text-micro text-t-danger mt-1.5 flex items-center gap-1">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-micro text-t-text-muted mt-1.5">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
