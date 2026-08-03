// ─── Admin Login Page ──────────────────────────────────────────
// Login/setup page for admin platform

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../../modules/admin/hooks'
import { GraduationCap, Envelope, Lock, User, Eye, EyeSlash } from '@phosphor-icons/react'
import Button from '../../../shared/components/Button'

const AdminLogin: React.FC = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading, error, login, setup, clearError } = useAdminAuth()

  // Form state
  const [isSetupMode, setIsSetupMode] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  })

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin')
    }
  }, [isAuthenticated, navigate])

  // Check if setup is needed
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/me`)
        if (response.status === 401) {
          const data = await response.json()
          if (data.detail?.includes('No admin')) {
            setIsSetupMode(true)
          }
        }
      } catch {
        // Ignore errors
      }
    }
    checkSetup()
  }, [])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (isSetupMode) {
      if (!formData.name.trim()) {
        return
      }
      await setup({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      })
    } else {
      await login({
        email: formData.email,
        password: formData.password,
      })
    }
  }

  // Handle input change
  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
  }

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-app-green/5 via-transparent to-app-blue/5" />

      {/* Login card */}
      <div className="relative w-full max-w-md">
        <div className="bg-app-card rounded-2xl border border-app-border p-8 shadow-xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-app-green/10 border border-app-green/25 flex items-center justify-center mb-4">
              <GraduationCap size={36} weight="duotone" className="text-app-green" />
            </div>
            <h1 className="text-2xl font-black text-app-text">Eduvy Admin</h1>
            <p className="text-sm text-app-muted mt-1">
              {isSetupMode ? 'Create your admin account' : 'Sign in to continue'}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-app-red/10 border border-app-red/30 text-sm text-app-red">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSetupMode && (
              <div>
                <label className="block text-sm font-medium text-app-muted mb-1.5">Name</label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted"
                  />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={handleChange('name')}
                    placeholder="Your name"
                    className="w-full h-11 pl-10 pr-4 bg-app-card2 border border-white/10 rounded-xl text-app-text placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50 focus:border-app-green/50 transition-all"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-app-muted mb-1.5">Email</label>
              <div className="relative">
                <Envelope
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted"
                />
                <input
                  type="email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  placeholder="admin@eduvy.ai"
                  className="w-full h-11 pl-10 pr-4 bg-app-card2 border border-white/10 rounded-xl text-app-text placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50 focus:border-app-green/50 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-muted mb-1.5">Password</label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange('password')}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-11 bg-app-card2 border border-white/10 rounded-xl text-app-text placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50 focus:border-app-green/50 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-text transition-colors"
                >
                  {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
              className="mt-6 h-12"
            >
              {isSetupMode ? 'Create Admin Account' : 'Sign In'}
            </Button>
          </form>

          {/* Setup mode toggle */}
          {!isSetupMode && (
            <p className="text-center text-sm text-app-muted mt-6">
              First time?{' '}
              <button
                onClick={() => setIsSetupMode(true)}
                className="text-app-green hover:underline font-medium"
              >
                Set up admin account
              </button>
            </p>
          )}

          {isSetupMode && (
            <p className="text-center text-sm text-app-muted mt-6">
              Already have an account?{' '}
              <button
                onClick={() => setIsSetupMode(false)}
                className="text-app-green hover:underline font-medium"
              >
                Sign in
              </button>
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-app-muted mt-6">
          Eduvy Admin Platform v2.0
        </p>
      </div>
    </div>
  )
}

export default AdminLogin
