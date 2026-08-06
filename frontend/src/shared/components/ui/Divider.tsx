import React from 'react'

interface DividerProps {
  label?: string
  className?: string
}

const Divider: React.FC<DividerProps> = ({ label, className = '' }) => {
  if (label) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex-1 h-px bg-t-border" />
        <span className="text-micro text-t-text-muted font-medium shrink-0">{label}</span>
        <div className="flex-1 h-px bg-t-border" />
      </div>
    )
  }

  return <div className={`h-px bg-t-border ${className}`} />
}

export default Divider
