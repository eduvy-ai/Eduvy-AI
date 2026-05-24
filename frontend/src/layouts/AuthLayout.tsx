// ─── Auth Layout ──────────────────────────────────────────────
// Layout wrapper for login/register pages

import React from 'react'

interface AuthLayoutProps {
  children: React.ReactNode
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="fixed inset-0 bg-app-bg overflow-auto">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-app-green/5 via-transparent to-app-blue/5 pointer-events-none z-0" />
      
      <div className="relative z-10 py-8 px-4 min-h-full">
        <div className="w-full max-w-md sm:max-w-lg mx-auto">
          {/* Logo Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-app-green/20 to-app-blue/20 border border-app-green/30 mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-app-green">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>
            <div className="text-2xl font-extrabold text-app-text tracking-tight">Eduvy-AI</div>
            <div className="text-sm text-app-muted mt-1">Your AI-Powered Study Companion</div>
          </div>

          {/* Content Card */}
          <div className="bg-app-card rounded-2xl border border-app-border p-6 shadow-xl shadow-black/20">
            {children}
          </div>
          
          {/* Footer */}
          <div className="text-center mt-6 pb-4 text-xs text-app-muted/60">
            By continuing, you agree to our Terms of Service
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
