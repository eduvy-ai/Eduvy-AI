import React from 'react'

type CardVariant = 'default' | 'outlined' | 'elevated' | 'interactive' | 'glass'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: 'none' | 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

const variantClasses: Record<CardVariant, string> = {
  default:     'bg-t-surface border border-t-border shadow-soft-sm',
  outlined:    'bg-transparent border border-t-border-strong',
  elevated:    'bg-t-surface border border-t-border shadow-soft-lg',
  interactive: 'bg-t-surface border border-t-border shadow-soft-sm transition-all duration-200 cursor-pointer hover:shadow-soft hover:border-t-border-strong hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]',
  glass:       'bg-t-surface/60 backdrop-blur-xl border border-t-border',
}

const paddingClasses: Record<string, string> = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-5',
}

const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`rounded-2xl ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
