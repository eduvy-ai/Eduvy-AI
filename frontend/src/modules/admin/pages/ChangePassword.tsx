// ─── Change Password Page ──────────────────────────────────────
// Required on first login for school admins

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Lock, Eye, EyeSlash, Key } from '@phosphor-icons/react'
import Button from '../../../shared/components/Button'
import adminService from '../service'
import { initializeAdmin } from '../slice'
import type { RootState, AppDispatch } from '../../../redux/store'

const ChangePassword: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.admin)

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      await adminService.changePassword(formData.password)
      // Refresh user state to clear must_change_password flag
      await dispatch(initializeAdmin())
      navigate('/admin')
    } catch (err: any) {
      setError(err.message || 'Failed to change password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
  }

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-app-green/5 via-transparent to-app-blue/5" />

      {/* Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-app-card rounded-2xl border border-app-border p-8 shadow-xl">
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-app-yellow/10 border border-app-yellow/25 flex items-center justify-center mb-4">
              <Key size={36} weight="duotone" className="text-app-yellow" />
            </div>
            <h1 className="text-2xl font-black text-app-text">Set Your Password</h1>
            <p className="text-sm text-app-muted mt-1 text-center">
              {user?.name ? `Welcome, ${user.name}!` : 'Welcome!'}<br />
              Please set a new password for your account.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-app-red/10 border border-app-red/30 text-sm text-app-red">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* New Password */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-app-muted">
                <Lock size={20} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="New password"
                value={formData.password}
                onChange={handleChange('password')}
                required
                minLength={8}
                className="w-full h-12 pl-12 pr-12 bg-app-card2 border border-app-border rounded-xl text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-text transition-colors"
              >
                {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-app-muted">
                <Lock size={20} />
              </div>
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                required
                className="w-full h-12 pl-12 pr-12 bg-app-card2 border border-app-border rounded-xl text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-text transition-colors"
              >
                {showConfirm ? <EyeSlash size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <p className="text-xs text-app-muted">
              Password must be at least 8 characters long.
            </p>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-12 mt-2"
              disabled={isLoading}
            >
              {isLoading ? 'Setting Password...' : 'Set Password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ChangePassword
