// ─── Change Password Modal ────────────────────────────────────
// Modal for first-login password change flow

import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '../../../redux/store'
import { changePassword } from '../slice'
import Modal from '../../../shared/components/Modal'
import Button from '../../../shared/components/Button'
import { Lock, Eye, EyeSlash, ShieldCheck } from '@phosphor-icons/react'

const ChangePasswordModal: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { mustChangePassword, isLoading, error, user } = useSelector((state: RootState) => state.auth)
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleSubmit = async () => {
    setLocalError('')
    
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters')
      return
    }
    
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }
    
    try {
      await dispatch(changePassword(password)).unwrap()
    } catch (err: any) {
      setLocalError(err || 'Failed to change password')
    }
  }

  if (!mustChangePassword) return null

  const displayError = localError || error

  return (
    <Modal
      isOpen={mustChangePassword}
      onClose={() => {}} // Cannot close until password is changed
      title="Create Your Password"
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-app-green/20 flex items-center justify-center">
            <ShieldCheck size={32} className="text-app-green" />
          </div>
        </div>
        
        <p className="text-center text-app-muted text-sm">
          Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! Please create a new password to secure your account.
        </p>

        {displayError && (
          <div className="p-3 rounded-xl bg-app-red/10 border border-app-red/30 text-sm text-app-red text-center">
            {displayError}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-app-muted mb-1.5">
            New Password
          </label>
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 pl-10 pr-10 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50"
              placeholder="Enter new password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-text"
            >
              {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-app-muted mb-1.5">
            Confirm Password
          </label>
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-11 pl-10 pr-10 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50"
              placeholder="Confirm new password"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>

        <div className="text-xs text-app-muted">
          <ul className="list-disc list-inside space-y-0.5">
            <li className={password.length >= 6 ? 'text-app-green' : ''}>
              At least 6 characters
            </li>
            <li className={password && password === confirmPassword ? 'text-app-green' : ''}>
              Passwords match
            </li>
          </ul>
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleSubmit}
          disabled={isLoading || password.length < 6 || password !== confirmPassword}
        >
          {isLoading ? 'Setting Password...' : 'Set Password & Continue'}
        </Button>
      </div>
    </Modal>
  )
}

export default ChangePasswordModal
