import React from 'react'

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  lines?: number
  className?: string
}

const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  lines = 1,
  className = '',
}) => {
  const base = 't-skeleton'

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${base} h-4 rounded-md`}
            style={{
              width: i === lines - 1 ? '60%' : '100%',
            }}
          />
        ))}
      </div>
    )
  }

  const variantClasses = {
    text:        'h-4 rounded-md',
    circular:    'rounded-full',
    rectangular: 'rounded-none',
    rounded:     'rounded-xl',
  }

  return (
    <div
      className={`${base} ${variantClasses[variant]} ${className}`}
      style={{
        width: width ?? (variant === 'circular' ? '48px' : '100%'),
        height: height ?? (variant === 'circular' ? '48px' : variant === 'text' ? '16px' : '80px'),
      }}
      aria-hidden="true"
    />
  )
}

// Pre-composed skeleton patterns for common layouts
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-t-surface border border-t-border rounded-2xl p-4 ${className}`} aria-hidden="true">
    <div className="flex items-center gap-3 mb-4">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1">
        <Skeleton width="60%" height={14} className="mb-2" />
        <Skeleton width="40%" height={12} />
      </div>
    </div>
    <Skeleton variant="text" lines={2} />
  </div>
)

export const SkeletonList: React.FC<{ count?: number; className?: string }> = ({ count = 3, className = '' }) => (
  <div className={`flex flex-col gap-3 ${className}`} aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3">
        <Skeleton variant="rounded" width={48} height={48} />
        <div className="flex-1">
          <Skeleton width="70%" height={14} className="mb-2" />
          <Skeleton width="50%" height={12} />
        </div>
      </div>
    ))}
  </div>
)

export default Skeleton
