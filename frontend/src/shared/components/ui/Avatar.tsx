import React from 'react'

export interface AvatarProps {
  name?: string
  src?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
}

const Avatar: React.FC<AvatarProps> = ({ name, src, size = 'md', className = '' }) => {
  const initial = (name || '?').charAt(0).toUpperCase()

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={`${sizes[size]} rounded-full object-cover ring-2 ring-t-border shrink-0 ${className}`}
        loading="lazy"
      />
    )
  }

  return (
    <div
      className={`${sizes[size]} rounded-full bg-[var(--t-primary-light)] border border-t-primary/25 flex items-center justify-center font-bold text-t-primary shrink-0 ${className}`}
      role="img"
      aria-label={name || 'User avatar'}
    >
      {initial}
    </div>
  )
}

export default Avatar
