import React from 'react'

interface FABProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  label?: string
  variant?: 'primary' | 'accent'
  size?: 'md' | 'lg'
}

const FloatingActionButton: React.FC<FABProps> = ({
  icon,
  label,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const variantClasses = {
    primary: 'bg-t-primary hover:bg-t-primary-hover text-t-text-inverse shadow-[0_4px_16px_rgba(16,185,129,0.3)]',
    accent:  'bg-t-accent hover:bg-t-accent-hover text-white shadow-[0_4px_16px_rgba(139,92,246,0.3)]',
  }

  const sizeClasses = {
    md: label ? 'h-12 px-5 gap-2' : 'w-12 h-12',
    lg: label ? 'h-14 px-6 gap-2.5' : 'w-14 h-14',
  }

  return (
    <button
      className={`fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] right-4 md:bottom-6 md:right-6 z-[99]
        rounded-full flex items-center justify-center
        font-semibold transition-all duration-200
        active:scale-95 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {icon}
      {label && <span className="text-caption font-semibold">{label}</span>}
    </button>
  )
}

export default FloatingActionButton
