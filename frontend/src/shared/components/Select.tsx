// ─── Select Component ─────────────────────────────────────────
// Reusable form select with label and error state

import React, { forwardRef } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  error?: string
  helperText?: string
  options: readonly string[] | SelectOption[]
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, placeholder, className = '', ...props }, ref) => {
    const hasError = Boolean(error)

    // Normalize options to { value, label } format
    const normalizedOptions = options.map((opt) =>
      typeof opt === 'string' ? { value: opt, label: opt } : opt
    )

    return (
      <div className="w-full">
        {label && (
          <label className="text-[11px] text-app-muted font-semibold block mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`w-full bg-app-card2 border rounded-xl py-3 px-3.5 text-app-text text-sm outline-none transition-all duration-150 appearance-none cursor-pointer
              ${hasError ? 'border-app-red/50 focus:ring-1 focus:ring-app-red/50' : 'border-white/10 focus:ring-1 focus:ring-app-green/50 focus:border-app-green/30'}
              ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {normalizedOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {/* Dropdown arrow */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-app-muted">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
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

Select.displayName = 'Select'

export default Select
