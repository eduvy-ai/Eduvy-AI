import React from 'react'

type IconButtonVariant = 'ghost' | 'subtle' | 'filled' | 'outline'
type IconButtonSize = 'sm' | 'md' | 'lg'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  variant?: IconButtonVariant
  size?: IconButtonSize
  'aria-label': string
}

const variantClasses: Record<IconButtonVariant, string> = {
  ghost:   'bg-transparent text-t-text-secondary hover:bg-t-surface-hover hover:text-t-text',
  subtle:  'bg-t-surface-hover text-t-text-secondary hover:bg-t-surface-active hover:text-t-text',
  filled:  'bg-t-primary text-t-text-inverse hover:bg-t-primary-hover',
  outline: 'bg-transparent border border-t-border text-t-text-secondary hover:border-t-border-strong hover:text-t-text',
}

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
}

const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'ghost',
  size = 'md',
  className = '',
  ...props
}) => {
  return (
    <button
      className={`rounded-xl flex items-center justify-center shrink-0 transition-all duration-150 active:scale-95
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {icon}
    </button>
  )
}

export default IconButton
