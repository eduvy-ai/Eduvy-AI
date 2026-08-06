// ─── Select Component ─────────────────────────────────────────
// Reusable form select — uses new design system tokens

import React, { forwardRef } from 'react'
import { CaretDown } from '@phosphor-icons/react'

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

    const normalizedOptions = options.map((opt) =>
      typeof opt === 'string' ? { value: opt, label: opt } : opt
    )

    return (
      <div className="w-full">
        {label && (
          <label className="text-label text-t-text-muted font-semibold block mb-1.5 uppercase">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`w-full bg-t-surface-2 border rounded-xl py-3 px-3.5 pr-10 text-t-text text-body-sm outline-none transition-all duration-150 appearance-none cursor-pointer
              ${hasError
                ? 'border-t-danger/50 focus:ring-2 focus:ring-t-danger/20'
                : 'border-t-border focus:border-t-primary/40 focus:ring-2 focus:ring-[var(--t-primary-light)]'}
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
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-t-text-muted">
            <CaretDown size={16} weight="bold" />
          </div>
        </div>
        {error && (
          <p className="text-micro text-t-danger mt-1.5">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-micro text-t-text-muted mt-1.5">{helperText}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export default Select
