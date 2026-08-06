// ─── Button Component ─────────────────────────────────────────
// Reusable button with variants — uses new design system tokens

import React from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-t-primary hover:bg-t-primary-hover text-t-text-inverse shadow-[0_2px_8px_rgba(16,185,129,0.2)]',
  secondary: 'bg-t-surface-hover text-t-text border border-t-border hover:border-t-border-strong hover:bg-t-surface-active',
  outline:   'bg-transparent text-t-primary border border-t-primary/40 hover:bg-[var(--t-primary-light)] hover:border-t-primary/60',
  ghost:     'bg-transparent text-t-text-secondary hover:bg-t-surface-hover hover:text-t-text',
  danger:    'bg-[var(--t-danger-light)] text-t-danger border border-t-danger/20 hover:bg-t-danger/20',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'py-2 px-3.5 text-caption gap-1.5',
  md: 'py-2.5 px-5 text-body-sm gap-2',
  lg: 'py-3.5 px-6 text-body gap-2.5',
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`rounded-xl font-semibold transition-all duration-150 flex items-center justify-center active:scale-[0.97]
        ${variantClasses[variant]} ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || isLoading ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}
        ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  )
}

export default Button
