// ─── Register Page ────────────────────────────────────────────
// Two-step registration form

import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks'
import AuthLayout from '../../../layouts/AuthLayout'
import Button from '../../../shared/components/Button'
import Input from '../../../shared/components/Input'
import Select from '../../../shared/components/Select'
import { BOARDS, LANGUAGES, CLASSES, getSubjectsForClass } from '../../../shared/constants/curriculum'

const Register: React.FC = () => {
  const navigate = useNavigate()
  const { register, isLoading, error, clearError } = useAuth()

  // Step 1: Credentials
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mobile, setMobile] = useState('')

  // Step 2: Profile
  const [standard, setStandard] = useState('Class 10')
  const [board, setBoard] = useState('CBSE')
  const [language, setLanguage] = useState('English')
  const [subjects, setSubjects] = useState<string[]>([])

  const availableSubjects = useMemo(() => getSubjectsForClass(standard), [standard])

  const toggleSubject = (subject: string) => {
    setSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    )
  }

  const handleStep1 = () => {
    clearError()
    
    if (!name.trim()) {
      return
    }
    if (!email.trim() || !email.includes('@')) {
      return
    }
    if (password.length < 6) {
      return
    }

    // Auto-select all subjects for the standard
    setSubjects([...availableSubjects])
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    const finalSubjects = subjects.length > 0 ? subjects : [...availableSubjects]

    const result = await register({
      email: email.trim(),
      password,
      name: name.trim(),
      standard,
      board,
      language,
      subjects: finalSubjects,
      mobile: mobile.trim(),
    })

    if (result.meta.requestStatus === 'fulfilled') {
      navigate('/app/home')
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Tab Toggle */}
        <div className="flex gap-1 bg-app-card2 rounded-xl p-1 mb-2">
          <Link
            to="/auth"
            className="flex-1 py-2.5 rounded-lg bg-transparent text-app-muted font-medium text-sm text-center no-underline hover:text-app-text transition-colors"
          >
            Login
          </Link>
          <div className="flex-1 py-2.5 rounded-lg bg-gradient-to-br from-app-green/20 to-app-blue/20 text-app-text font-bold text-sm text-center ring-1 ring-app-green/50">
            Register
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= 1 ? 'bg-app-green text-app-bg' : 'bg-app-card2 text-app-muted'
            }`}>
              1
            </div>
            <div className={`h-0.5 w-8 ${
              step >= 2 ? 'bg-app-green' : 'bg-app-card2'
            }`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= 2 ? 'bg-app-green text-app-bg' : 'bg-app-card2 text-app-muted'
            }`}>
              2
            </div>
          </div>
          <span className="text-sm text-app-muted ml-2">
            {step === 1 ? 'Your Details' : 'Academic Profile'}
          </span>
        </div>

        {/* ── Step 1: Credentials ── */}
        {step === 1 && (
          <>
            <Input
              label="Your Name"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Input
              type="email"
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <Input
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
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

            <Input
              type="tel"
              label="Mobile (optional)"
              placeholder="Your mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />

            {error && (
              <div className="text-xs text-app-red bg-app-red/15 rounded-lg py-2 px-3">
                {error}
              </div>
            )}

            <Button type="button" onClick={handleStep1} fullWidth size="lg">
              Continue
            </Button>
          </>
        )}

        {/* ── Step 2: Profile ── */}
        {step === 2 && (
          <>
            {/* Class Selection */}
            <Select
              label="Class"
              value={standard}
              onChange={(e) => {
                setStandard(e.target.value)
                setSubjects([])
              }}
              options={CLASSES}
            />

            {/* Board Selection */}
            <Select
              label="Board"
              value={board}
              onChange={(e) => setBoard(e.target.value)}
              options={BOARDS}
            />

            {/* Language Selection */}
            <Select
              label="Medium / Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              options={LANGUAGES}
            />

            {/* Subjects */}
            <div>
              <label className="text-[11px] text-app-muted font-semibold block mb-1.5">
                Subjects (tap to select)
              </label>
              <div className="flex flex-wrap gap-2">
                {availableSubjects.map((subject) => (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => toggleSubject(subject)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      subjects.includes(subject)
                        ? 'bg-app-green/20 border-app-green/50 text-app-green'
                        : 'bg-app-card2 border-app-border text-app-muted hover:text-app-text'
                    }`}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="text-xs text-app-red bg-app-red/15 rounded-lg py-2 px-3">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(1)} size="lg">
                ← Back
              </Button>
              <Button type="submit" isLoading={isLoading} fullWidth size="lg">
                {isLoading ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </>
        )}

        {/* Login Link */}
        <div className="text-center text-sm text-app-muted">
          Already have an account?{' '}
          <Link to="/auth" className="text-app-green font-semibold no-underline hover:underline">
            Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}

export default Register
