// ─── Account Request Page ─────────────────────────────────────
// Public form for school/individual account requests

import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../../../layouts/AuthLayout'
import Input from '../../../shared/components/Input'
import Select from '../../../shared/components/Select'
import Button from '../../../shared/components/Button'
import { authApi } from '../api'
import { BOARDS, CLASSES, LANGUAGES } from '../../../shared/constants/curriculum'

type RequestType = 'school' | 'individual'

const AccountRequest: React.FC = () => {
  const [requestType, setRequestType] = useState<RequestType>('individual')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [standard, setStandard] = useState('Class 10')
  const [board, setBoard] = useState('CBSE')
  const [stream, setStream] = useState('')
  const [language, setLanguage] = useState('English')
  const [city, setCity] = useState('')
  const [stateName, setStateName] = useState('')
  const [message, setMessage] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const needsStream = useMemo(() => ['Class 11', 'Class 12'].includes(standard), [standard])

  const resetForm = () => {
    setFullName('')
    setEmail('')
    setPhone('')
    setSchoolName('')
    setStandard('Class 10')
    setBoard('CBSE')
    setStream('')
    setLanguage('English')
    setCity('')
    setStateName('')
    setMessage('')
  }

  const validate = (): string | null => {
    if (!fullName.trim()) return 'Full name is required'
    if (!email.trim() || !email.includes('@')) return 'Valid email is required'
    if (requestType === 'school' && !schoolName.trim()) return 'School name is required for school requests'
    if (requestType === 'individual' && needsStream && !stream.trim()) return 'Please select a stream for Class 11/12'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    try {
      const result = await authApi.requestAccount({
        request_type: requestType,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        school_name: schoolName.trim(),
        standard: requestType === 'individual' ? standard : '',
        board: requestType === 'individual' ? board : '',
        stream: requestType === 'individual' ? stream : '',
        language: requestType === 'individual' ? language : '',
        city: city.trim(),
        state: stateName.trim(),
        message: message.trim(),
      })
      setSuccessMessage(result.message || 'Request submitted successfully')
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="text-center mb-1">
          <h2 className="text-xl font-black text-app-text">Request Account Access</h2>
          <p className="text-xs text-app-muted mt-1">Share your details to request access. Approval updates and onboarding credentials are sent to your email.</p>
        </div>

        <div className="flex gap-1 bg-app-card2 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setRequestType('individual')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              requestType === 'individual'
                ? 'bg-gradient-to-br from-app-green/20 to-app-blue/20 text-app-text ring-1 ring-app-green/50'
                : 'text-app-muted hover:text-app-text'
            }`}
          >
            Individual Student
          </button>
          <button
            type="button"
            onClick={() => setRequestType('school')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              requestType === 'school'
                ? 'bg-gradient-to-br from-app-green/20 to-app-blue/20 text-app-text ring-1 ring-app-green/50'
                : 'text-app-muted hover:text-app-text'
            }`}
          >
            School
          </button>
        </div>

        <Input
          label="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your full name"
        />

        <Input
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <Input
          type="tel"
          label="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Your phone number"
        />

        {requestType === 'school' ? (
          <>
            <Input
              label="School Name"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="School or institute name"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
              />
              <Input
                label="State"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                placeholder="State"
              />
            </div>
          </>
        ) : (
          <>
            <Select
              label="Class"
              value={standard}
              onChange={(e) => {
                setStandard(e.target.value)
                setStream('')
              }}
              options={CLASSES}
            />
            <Select
              label="Board"
              value={board}
              onChange={(e) => setBoard(e.target.value)}
              options={BOARDS}
            />
            {needsStream && (
              <Select
                label="Stream"
                value={stream}
                onChange={(e) => setStream(e.target.value)}
                options={['Science', 'Commerce', 'Arts']}
                placeholder="Select stream"
              />
            )}
            <Select
              label="Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              options={LANGUAGES}
            />
          </>
        )}

        <div>
          <label className="text-[11px] text-app-muted font-semibold block mb-1.5">Message (optional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share context for your request"
            rows={4}
            className="w-full bg-app-card2 border border-white/10 rounded-xl py-3 px-3.5 text-app-text text-sm outline-none transition-all duration-150 focus:ring-1 focus:ring-app-green/50"
          />
        </div>

        {error && (
          <div className="text-sm text-app-red bg-app-red/15 border border-app-red/30 rounded-xl py-3 px-4 text-center font-medium">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="text-sm text-app-green bg-app-green/15 border border-app-green/30 rounded-xl py-3 px-4 text-center font-medium">
            {successMessage}
          </div>
        )}

        <Button type="submit" isLoading={isSubmitting} fullWidth size="lg">
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </Button>

        <div className="text-center text-sm text-app-muted">
          Already have credentials?{' '}
          <Link to="/auth" className="text-app-green font-semibold no-underline hover:underline">
            Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}

export default AccountRequest
