import React from 'react'

type BadgeVariant = 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

export interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  dot?: boolean
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default:  'bg-t-surface-hover text-t-text-secondary',
  primary:  'bg-[var(--t-primary-light)] text-t-primary',
  accent:   'bg-[var(--t-accent-light)] text-t-accent',
  success:  'bg-[var(--t-success-light)] text-t-success',
  warning:  'bg-[var(--t-warning-light)] text-t-warning',
  danger:   'bg-[var(--t-danger-light)] text-t-danger',
  info:     'bg-[var(--t-info-light)] text-t-info',
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', dot, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-micro font-semibold ${variantClasses[variant]} ${className}`}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      )}
      {children}
    </span>
  )
}

export default Badge
