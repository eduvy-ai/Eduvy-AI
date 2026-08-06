// ─── Register Page ────────────────────────────────────────────
// Two-step registration form with dynamic curriculum data

import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeSlash, User, EnvelopeSimple, Lock, Phone, ArrowLeft } from '@phosphor-icons/react'
import { useAuth } from '../hooks'
import AuthLayout from '../../../layouts/AuthLayout'
import Button from '../../../shared/components/Button'
import Input from '../../../shared/components/Input'
import Select from '../../../shared/components/Select'
import axiosInstance from '../../../services/axios'
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

  // Dynamic curriculum data from API
  const [availableMediums, setAvailableMediums] = useState<string[]>([...LANGUAGES])
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([])
  const [loadingCurriculum, setLoadingCurriculum] = useState(false)

  // Fetch mediums when board or standard changes
  const fetchMediums = useCallback(async (b: string, s: string) => {
    try {
      const res = await axiosInstance.get('/api/curriculum/mediums', { params: { board: b, standard: s } })
      const mediums = Array.isArray(res.data) ? res.data.map((m: { name?: string } | string) => typeof m === 'string' ? m : m.name || '') .filter(Boolean) : []
      if (mediums.length > 0) {
        setAvailableMediums(mediums)
        if (!mediums.includes(language)) setLanguage(mediums[0])
      }
    } catch {
      setAvailableMediums([...LANGUAGES])
    }
  }, [language])

  // Fetch subjects when board, standard, or medium changes
  const fetchSubjects = useCallback(async (b: string, s: string, m: string) => {
    setLoadingCurriculum(true)
    try {
      const res = await axiosInstance.get('/api/curriculum/subjects', { params: { board: b, standard: s, medium: m } })
      const subjs = Array.isArray(res.data) ? res.data : (res.data?.subjects || [])
      if (subjs.length > 0) {
        setAvailableSubjects(subjs)
        setSubjects([...subjs])
      } else {
        const fallback = [...getSubjectsForClass(s)]
        setAvailableSubjects(fallback)
        setSubjects([...fallback])
      }
    } catch {
      const fallback = [...getSubjectsForClass(s)]
      setAvailableSubjects(fallback)
      setSubjects([...fallback])
    } finally {
      setLoadingCurriculum(false)
    }
  }, [])

  // Reload mediums + subjects when board/standard/medium changes
  useEffect(() => {
    if (step === 2) {
      fetchMediums(board, standard)
    }
  }, [board, standard, step, fetchMediums])

  useEffect(() => {
    if (step === 2) {
      fetchSubjects(board, standard, language)
    }
  }, [board, standard, language, step, fetchSubjects])

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
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Tab Toggle */}
        <div className="flex gap-1 bg-t-surface-2 rounded-xl p-1">
          <Link
            to="/auth"
            className="flex-1 py-2.5 rounded-lg bg-transparent text-t-text-muted font-medium text-body-sm text-center no-underline hover:text-t-text transition-colors"
          >
            Login
          </Link>
          <div className="flex-1 py-2.5 rounded-lg bg-[var(--t-primary-light)] text-t-primary font-bold text-body-sm text-center ring-1 ring-t-primary/30">
            Register
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-caption font-bold transition-colors ${
              step >= 1 ? 'bg-t-primary text-t-text-inverse' : 'bg-t-surface-hover text-t-text-muted'
            }`}>
              1
            </div>
            <div className={`h-0.5 w-8 rounded-full transition-colors ${
              step >= 2 ? 'bg-t-primary' : 'bg-t-surface-hover'
            }`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-caption font-bold transition-colors ${
              step >= 2 ? 'bg-t-primary text-t-text-inverse' : 'bg-t-surface-hover text-t-text-muted'
            }`}>
              2
            </div>
          </div>
          <span className="text-body-sm text-t-text-secondary">
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
              leftIcon={<User size={18} weight="duotone" />}
            />

            <Input
              type="email"
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              leftIcon={<EnvelopeSimple size={18} weight="duotone" />}
            />

            <Input
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
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

            <Input
              type="tel"
              label="Mobile (optional)"
              placeholder="Your mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              leftIcon={<Phone size={18} weight="duotone" />}
            />

            {error && (
              <div className="flex items-center gap-2 text-body-sm text-t-danger bg-[var(--t-danger-light)] rounded-xl py-3 px-4" role="alert">
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
            <Select
              label="Class"
              value={standard}
              onChange={(e) => {
                setStandard(e.target.value)
                setSubjects([])
              }}
              options={CLASSES}
            />

            <Select
              label="Board"
              value={board}
              onChange={(e) => {
                setBoard(e.target.value)
                setSubjects([])
              }}
              options={BOARDS}
            />

            <Select
              label="Medium / Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              options={availableMediums}
            />

            {/* Subjects */}
            <div>
              <label className="text-label text-t-text-muted font-semibold block mb-2 uppercase">
                Subjects (tap to select/deselect)
              </label>
              {loadingCurriculum ? (
                <div className="flex gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="t-skeleton h-8 w-20 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableSubjects.map((subject) => (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => toggleSubject(subject)}
                      className={`py-2 px-3.5 rounded-xl text-caption font-medium border transition-all duration-150 cursor-pointer active:scale-[0.96] ${
                        subjects.includes(subject)
                          ? 'bg-[var(--t-primary-light)] border-t-primary/40 text-t-primary'
                          : 'bg-t-surface-hover border-t-border text-t-text-muted hover:text-t-text hover:border-t-border-strong'
                      }`}
                    >
                      {subject}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-body-sm text-t-danger bg-[var(--t-danger-light)] rounded-xl py-3 px-4" role="alert">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(1)}
                size="lg"
                leftIcon={<ArrowLeft size={16} />}
              >
                Back
              </Button>
              <Button type="submit" isLoading={isLoading} fullWidth size="lg">
                {isLoading ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-t-border" />
          <span className="text-micro text-t-text-muted">or</span>
          <div className="flex-1 h-px bg-t-border" />
        </div>

        {/* Login Link */}
        <p className="text-center text-body-sm text-t-text-secondary">
          Already have an account?{' '}
          <Link to="/auth" className="text-t-primary font-semibold no-underline hover:underline">
            Login
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default Register
