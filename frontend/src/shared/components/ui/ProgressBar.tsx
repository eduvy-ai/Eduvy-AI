import React from 'react'

export interface ProgressBarProps {
  value: number // 0-100
  max?: number
  variant?: 'primary' | 'accent' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  label?: string
  className?: string
}

const variantColors: Record<string, string> = {
  primary: 'bg-t-primary',
  accent:  'bg-t-accent',
  success: 'bg-t-success',
  warning: 'bg-t-warning',
  danger:  'bg-t-danger',
}

const sizeClasses: Record<string, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  label,
  className = '',
}) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-caption text-t-text-secondary">{label}</span>}
          {showLabel && <span className="text-caption font-semibold text-t-text-secondary">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        className={`w-full rounded-full bg-t-surface-hover overflow-hidden ${sizeClasses[size]}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${variantColors[variant]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default ProgressBar
