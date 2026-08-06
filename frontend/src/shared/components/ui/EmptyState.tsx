import React from 'react'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-t-surface-hover flex items-center justify-center text-t-text-muted mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-body font-semibold text-t-text mb-1">{title}</h3>
      {description && (
        <p className="text-body-sm text-t-text-muted max-w-[280px]">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export default EmptyState
