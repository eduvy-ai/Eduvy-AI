// ─── Login Page ───────────────────────────────────────────────
// Premium mobile-first login form

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeSlash, EnvelopeSimple, Lock } from '@phosphor-icons/react'
import { useAuth } from '../hooks'
import AuthLayout from '../../../layouts/AuthLayout'
import Button from '../../../shared/components/Button'
import Input from '../../../shared/components/Input'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const { login, isLoading, error, clearError } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!email.trim() || !password) {
      return
    }

    const result = await login({ email: email.trim(), password })
    
    if (result.meta.requestStatus === 'fulfilled') {
      const payload = result.payload as { is_admin?: boolean; token?: string }
      if (payload?.is_admin) {
        localStorage.setItem('eduvyai_admin_token', payload.token || '')
        navigate('/admin/dashboard')
      } else {
        navigate('/app/home')
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Tab Toggle */}
        <div className="flex gap-1 bg-t-surface-2 rounded-xl p-1">
          <div className="flex-1 py-2.5 rounded-lg bg-[var(--t-primary-light)] text-t-primary font-bold text-body-sm text-center ring-1 ring-t-primary/30">
            Login
          </div>
          <Link
            to="/auth/register"
            className="flex-1 py-2.5 rounded-lg bg-transparent text-t-text-muted font-medium text-body-sm text-center no-underline hover:text-t-text transition-colors"
          >
            Register
          </Link>
        </div>

        {/* Email */}
        <Input
          type="email"
          label="Email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="email"
          leftIcon={<EnvelopeSimple size={18} weight="duotone" />}
        />

        {/* Password */}
        <Input
          type={showPassword ? 'text' : 'password'}
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="current-password"
          leftIcon={<Lock size={18} weight="duotone" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="bg-transparent border-none cursor-pointer text-t-text-muted hover:text-t-primary transition-colors p-0"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          }
        />

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-body-sm text-t-danger bg-[var(--t-danger-light)] rounded-xl py-3 px-4" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
            </svg>
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button type="submit" isLoading={isLoading} fullWidth size="lg">
          {isLoading ? 'Logging in...' : 'Continue'}
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-t-border" />
          <span className="text-micro text-t-text-muted">or</span>
          <div className="flex-1 h-px bg-t-border" />
        </div>

        {/* Register Link */}
        <p className="text-center text-body-sm text-t-text-secondary">
          Don't have an account?{' '}
          <Link to="/auth/register" className="text-t-primary font-semibold no-underline hover:underline">
            Create account
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default Login
