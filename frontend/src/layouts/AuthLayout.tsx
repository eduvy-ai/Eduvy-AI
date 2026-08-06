// ─── Auth Layout ──────────────────────────────────────────────
// Premium mobile-first layout for login/register pages

import React from 'react'
import { GraduationCap } from '@phosphor-icons/react'

interface AuthLayoutProps {
  children: React.ReactNode
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="fixed inset-0 bg-t-bg overflow-auto">
      {/* Gradient mesh background */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: 'var(--t-gradient-hero)' }} />
      {/* Subtle pattern overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '32px 32px' }}
      />

      <div className="relative z-10 py-10 px-5 min-h-full flex flex-col">
        <div className="w-full max-w-[420px] mx-auto flex-1 flex flex-col">
          {/* Logo Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--t-primary-light)] border border-t-primary/20 mb-5 shadow-[0_4px_16px_rgba(16,185,129,0.15)]">
              <GraduationCap size={32} weight="duotone" className="text-t-primary" />
            </div>
            <h1 className="text-h1 text-t-text tracking-tight">Eduvy-AI</h1>
            <p className="text-body-sm text-t-text-secondary mt-1.5">Your AI-Powered Study Companion</p>
          </div>

          {/* Content Card */}
          <div className="bg-t-surface rounded-2xl border border-t-border p-6 shadow-soft-lg">
            {children}
          </div>

          {/* Footer */}
          <div className="text-center mt-8 pb-6 text-micro text-t-text-muted">
            By continuing, you agree to our Terms of Service
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
