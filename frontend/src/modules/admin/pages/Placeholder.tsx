// ─── Admin Placeholder Page ────────────────────────────────────
// Placeholder for sections under development

import React from 'react'
import { useLocation } from 'react-router-dom'
import { Wrench, ArrowLeft } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'

const AdminPlaceholder: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  
  // Extract section name from path
  const pathParts = location.pathname.split('/').filter(Boolean)
  const sectionName = pathParts[pathParts.length - 1] || 'Section'
  const formattedName = sectionName
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-20 h-20 rounded-2xl bg-app-yellow/10 border border-app-yellow/25 flex items-center justify-center mx-auto mb-6">
          <Wrench size={40} className="text-app-yellow" />
        </div>
        <h1 className="text-2xl font-black text-app-text mb-2">{formattedName}</h1>
        <p className="text-app-muted mb-6">
          This section is under development and will be available soon. Check back later for updates.
        </p>
        <button
          onClick={() => navigate('/admin')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-app-card2 border border-app-border rounded-xl text-sm font-medium text-app-text hover:bg-white/[0.04] transition-all"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}

export default AdminPlaceholder
