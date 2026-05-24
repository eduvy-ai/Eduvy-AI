// ─── Login Page ───────────────────────────────────────────────
// Login form with email and password

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
      navigate('/app/home')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Tab Toggle */}
        <div className="flex gap-1 bg-app-card2 rounded-xl p-1 mb-2">
          <div className="flex-1 py-2.5 rounded-lg bg-gradient-to-br from-app-green/20 to-app-blue/20 text-app-text font-bold text-sm text-center ring-1 ring-app-green/50">
            Login
          </div>
          <Link
            to="/auth/register"
            className="flex-1 py-2.5 rounded-lg bg-transparent text-app-muted font-medium text-sm text-center no-underline hover:text-app-text transition-colors"
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
        />

        {/* Password */}
        <div>
          <Input
            type={showPassword ? 'text' : 'password'}
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="current-password"
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="bg-transparent border-none cursor-pointer text-app-muted hover:text-app-green transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            }
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-xs text-app-red bg-app-red/15 rounded-lg py-2 px-3">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button type="submit" isLoading={isLoading} fullWidth size="lg">
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>

        {/* Register Link */}
        <div className="text-center text-sm text-app-muted">
          Don't have an account?{' '}
          <Link to="/auth/register" className="text-app-green font-semibold no-underline hover:underline">
            Create account
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}

export default Login
