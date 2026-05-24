// ─── Button Component ─────────────────────────────────────────
// Reusable button with variants

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
  primary: 'bg-gradient-to-br from-app-green to-app-blue text-app-bg hover:opacity-90',
  secondary: 'bg-app-card2 text-app-text border border-app-border hover:border-app-green/30',
  outline: 'bg-transparent text-app-green border border-app-green/50 hover:bg-app-green/10',
  ghost: 'bg-transparent text-app-text hover:bg-app-card2',
  danger: 'bg-app-red/20 text-app-red border border-app-red/30 hover:bg-app-red/30',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'py-2 px-3 text-xs',
  md: 'py-2.5 px-4 text-sm',
  lg: 'py-3.5 px-6 text-[15px]',
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
  const baseClasses = 'rounded-xl border-none font-bold cursor-pointer transition-all duration-150 flex items-center justify-center gap-2 font-[Sora,sans-serif]'
  const disabledClasses = 'opacity-50 cursor-not-allowed'

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${disabled || isLoading ? disabledClasses : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : (
        <>
          {leftIcon && <span>{leftIcon}</span>}
          {children}
          {rightIcon && <span>{rightIcon}</span>}
        </>
      )}
    </button>
  )
}

export default Button
