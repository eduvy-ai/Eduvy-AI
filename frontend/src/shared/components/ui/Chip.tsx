import React from 'react'

type ChipVariant = 'default' | 'primary' | 'accent' | 'outline'

export interface ChipProps {
  children: React.ReactNode
  variant?: ChipVariant
  selected?: boolean
  icon?: React.ReactNode
  onPress?: () => void
  onRemove?: () => void
  className?: string
}

const Chip: React.FC<ChipProps> = ({
  children,
  variant = 'default',
  selected = false,
  icon,
  onPress,
  onRemove,
  className = '',
}) => {
  const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption font-medium transition-all duration-150'

  const variantClasses: Record<ChipVariant, string> = {
    default: selected
      ? 'bg-t-primary text-t-text-inverse'
      : 'bg-t-surface-hover text-t-text-secondary border border-t-border',
    primary: selected
      ? 'bg-t-primary text-t-text-inverse'
      : 'bg-[var(--t-primary-light)] text-t-primary border border-t-primary/20',
    accent: selected
      ? 'bg-t-accent text-white'
      : 'bg-[var(--t-accent-light)] text-t-accent border border-t-accent/20',
    outline: selected
      ? 'bg-t-primary/10 text-t-primary border-2 border-t-primary'
      : 'bg-transparent text-t-text-secondary border border-t-border-strong',
  }

  const interactive = onPress ? 'cursor-pointer active:scale-[0.96]' : ''

  const Tag = onPress ? 'button' : 'span'

  return (
    <Tag
      className={`${base} ${variantClasses[variant]} ${interactive} ${className}`}
      onClick={onPress}
      type={onPress ? 'button' : undefined}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="ml-0.5 -mr-1 w-4 h-4 rounded-full flex items-center justify-center bg-current/20 hover:bg-current/30 transition-colors"
          aria-label="Remove"
          type="button"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </Tag>
  )
}

export default Chip
