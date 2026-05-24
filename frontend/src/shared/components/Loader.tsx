// ─── Loader Component ─────────────────────────────────────────
// Loading spinner with size variants

import React from 'react'

export type LoaderSize = 'sm' | 'md' | 'lg'

interface LoaderProps {
  size?: LoaderSize
  className?: string
}

const sizeClasses: Record<LoaderSize, string> = {
  sm: 'w-4 h-4 border-[2px]',
  md: 'w-6 h-6 border-[2px]',
  lg: 'w-10 h-10 border-[3px]',
}

const Loader: React.FC<LoaderProps> = ({ size = 'md', className = '' }) => {
  return (
    <div
      className={`rounded-full border-app-green/30 border-t-app-green animate-spin ${sizeClasses[size]} ${className}`}
    />
  )
}

export default Loader
