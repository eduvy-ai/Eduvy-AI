import { useState, useEffect } from 'react'
import { BOARDS, LANGS } from '../shared.js'
import { apiLogin, apiRegister, setAuthToken } from '../api.js'
import { li } from '../i18n/index.js'
import { GraduationCap, Eye, EyeSlash } from '@phosphor-icons/react'

// Static fallback for standards
const CLASSES_FALLBACK = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)
const STREAMS = ['Science', 'Commerce', 'Arts']

// ── Curriculum API helpers ────────────────────────────────────
async function fetchBoards() {
  try {
    const res = await fetch('/api/curriculum/boards', { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) return data.map(b => b.name)
    }
  } catch {}
  return BOARDS
}

async function fetchStandards(board) {
  const boardSlug = board.toLowerCase().replace(/\s+/g, '-')
  try {
    const res = await fetch(
      `/api/curriculum/standards?board=${encodeURIComponent(boardSlug)}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) return data.map(s => s.name)
    }
  } catch {}
  return CLASSES_FALLBACK
}

async function fetchMediums(board, standard) {
  const boardSlug = board.toLowerCase().replace(/\s+/g, '-')
  const stdSlug   = standard.toLowerCase().replace(/\s+/g, '-')
  try {
    const res = await fetch(
      `/api/curriculum/mediums?board=${encodeURIComponent(boardSlug)}&standard=${encodeURIComponent(stdSlug)}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) return data.map(m => m.name)
    }
  } catch {}
  return LANGS
}

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  // Shared fields
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  // Register-only fields
  const [name, setName]         = useState('')
  const [mobile, setMobile]     = useState('')
  const [standard, setStd]      = useState('Class 10')
  const [board, setBoard]       = useState('CBSE')
  const [stream, setStream]     = useState('')
  const [language, setLang]     = useState('English')
  const [regStep, setRegStep]   = useState(1) // 1 = credentials, 2 = profile

  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  // Dynamic lists from API (with static fallbacks)
  const [boardList,    setBoardList]    = useState(BOARDS)
  const [standardList, setStandardList] = useState(CLASSES_FALLBACK)
  const [mediumList,   setMediumList]   = useState(LANGS)

  // i18n — use selected language during registration, default to English for login
  const ui = li(mode === 'register' ? language : 'English')
  const needsStream = standard.includes('11') || standard.includes('12')

  // Load boards once on mount
  useEffect(() => {
    fetchBoards().then(setBoardList)
  }, [])

  // When board changes → refresh standards
  useEffect(() => {
    fetchStandards(board).then(stds => {
      setStandardList(stds)
      if (!stds.includes(standard)) setStd(stds[0] || 'Class 10')
    })
  }, [board])

  // When board or standard changes → refresh mediums
  useEffect(() => {
    fetchMediums(board, standard).then(meds => {
      setMediumList(meds)
      if (!meds.includes(language)) setLang(meds[0] || 'English')
    })
  }, [board, standard])

  // ── Login ──
  const doLogin = async () => {
    if (!email.trim() || !password) { setError(ui.enterEmailPassword); return }
    setError('')
    setLoading(true)
    try {
      const { token, profile } = await apiLogin({ email: email.trim(), password })
      setAuthToken(token)
      onAuth(profile)
    } catch (e) {
      if (e.name === 'TimeoutError' || e.name === 'AbortError') {
        setError(ui.serverStarting)
      } else {
        setError(e.message || ui.loginFailed)
      }
    }
    setLoading(false)
  }

  // ── Register step 1 → step 2 ──
  const goStep2 = () => {
    if (!name.trim()) { setError(ui.enterName); return }
    if (!email.trim() || !email.includes('@')) { setError(ui.validEmail); return }
    if (password.length < 6) { setError(ui.passwordMinLength); return }
    setError('')
    setRegStep(2)
  }

  // ── Register submit ──
  const doRegister = async () => {
    setError('')
    if (needsStream && !stream) {
      setError('Please select your stream')
      return
    }
    setLoading(true)
    try {
      const { token, profile } = await apiRegister({
        email: email.trim(),
        password,
        name: name.trim(),
        standard,
        board,
        stream: needsStream ? stream : '',
        language,
        subjects: [], // auto-assigned by backend based on board+standard+medium
        mobile: mobile.trim(),
      })
      setAuthToken(token)
      onAuth(profile)
    } catch (e) {
      if (e.name === 'TimeoutError' || e.name === 'AbortError') {
        setError(ui.serverStarting)
      } else {
        setError(e.message || ui.registerFailed)
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-app-bg flex items-start justify-center overflow-y-auto p-4 pt-8 font-sans">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mb-2 flex justify-center"><GraduationCap size={42} weight="duotone" className="text-app-green" /></div>
          <div className="text-2xl font-extrabold text-app-text">Eduvy-AI</div>
          <div className="text-sm text-app-muted mt-1">{ui.tagline}</div>
        </div>

        {/* Card */}
        <div className="bg-app-card rounded-2xl border border-app-border p-6">
          {/* Tab toggle */}
          <div className="flex gap-1 bg-app-card2 rounded-xl p-1 mb-6">
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setRegStep(1) }}
                className={`flex-1 py-2.5 rounded-lg border-none text-sm cursor-pointer transition-all
                  ${mode === m 
                    ? 'bg-gradient-to-br from-app-green/20 to-app-blue/20 text-app-text font-bold ring-1 ring-app-green/50' 
                    : 'bg-transparent text-app-muted font-medium'
                  }`}
              >
                {m === 'login' ? ui.login : ui.register}
              </button>
            ))}
          </div>

          {/* ─── LOGIN FORM ─── */}
          {mode === 'login' && (
            <div className="flex flex-col gap-3.5">
              <div>
                <label className="text-[11px] text-app-muted font-semibold block mb-1.5">{ui.emailLabel}</label>
                <input
                  className="w-full bg-app-card2 border border-white/10 rounded-xl py-3 px-3.5 text-app-text text-sm outline-none focus:ring-1 focus:ring-app-green/50"
                  type="email"
                  placeholder={ui.emailPlaceholder}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doLogin()}
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="text-[11px] text-app-muted font-semibold block mb-1.5">{ui.passwordLabel}</label>
                <div className="relative">
                  <input
                    className="w-full bg-app-card2 border border-white/10 rounded-xl py-3 px-3.5 text-app-text text-sm outline-none focus:ring-1 focus:ring-app-green/50 pr-10"
                    type={showPw ? 'text' : 'password'}
                    placeholder={ui.passwordPlaceholder}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && doLogin()}
                    autoComplete="current-password"
                  />
                  <button
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-app-muted"
                  >
                    {showPw ? <EyeSlash size={18} weight="fill" /> : <Eye size={18} weight="fill" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-xs text-app-red bg-app-red/15 rounded-lg py-2 px-3">{error}</div>
              )}

              <button 
                onClick={doLogin} 
                disabled={loading} 
                className={`w-full py-3.5 rounded-xl border-none bg-gradient-to-br from-app-green to-app-blue text-app-bg font-bold text-[15px] cursor-pointer
                  ${loading ? 'opacity-70' : 'hover:opacity-90'}`}
              >
                {loading ? ui.loggingIn : `${ui.login} →`}
              </button>

              <div className="text-center text-sm text-app-muted">
                {ui.noAccount}{' '}
                <button 
                  className="bg-transparent border-none text-app-green font-semibold text-sm cursor-pointer p-0"
                  onClick={() => { setMode('register'); setError('') }}
                >
                  {ui.createAccount}
                </button>
              </div>
            </div>
          )}

          {/* ─── REGISTER FORM — STEP 1: Credentials ─── */}
          {mode === 'register' && regStep === 1 && (
            <div className="flex flex-col gap-3.5">
              <div className="text-sm font-bold text-app-text mb-0.5">{ui.step1of2}</div>

              <div>
                <label className="text-[11px] text-app-muted font-semibold block mb-1.5">{ui.yourName}</label>
                <input 
                  className="w-full bg-app-card2 border border-white/10 rounded-xl py-3 px-3.5 text-app-text text-sm outline-none focus:ring-1 focus:ring-app-green/50"
                  placeholder={ui.namePlaceholder} 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                />
              </div>
              <div>
                <label className="text-[11px] text-app-muted font-semibold block mb-1.5">{ui.emailLabel}</label>
                <input 
                  className="w-full bg-app-card2 border border-white/10 rounded-xl py-3 px-3.5 text-app-text text-sm outline-none focus:ring-1 focus:ring-app-green/50"
                  type="email" 
                  placeholder={ui.emailPlaceholder} 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  autoComplete="email" 
                />
              </div>
              <div>
                <label className="text-[11px] text-app-muted font-semibold block mb-1.5">{ui.passwordLabel}</label>
                <div className="relative">
                  <input
                    className="w-full bg-app-card2 border border-white/10 rounded-xl py-3 px-3.5 text-app-text text-sm outline-none focus:ring-1 focus:ring-app-green/50 pr-10"
                    type={showPw ? 'text' : 'password'}
                    placeholder={ui.passwordMinChars}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-app-muted"
                  >
                    {showPw ? <EyeSlash size={18} weight="fill" /> : <Eye size={18} weight="fill" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-app-muted font-semibold block mb-1.5">{ui.mobileOptional}</label>
                <input 
                  className="w-full bg-app-card2 border border-white/10 rounded-xl py-3 px-3.5 text-app-text text-sm outline-none focus:ring-1 focus:ring-app-green/50"
                  type="tel" 
                  placeholder={ui.mobilePlaceholder} 
                  value={mobile} 
                  onChange={e => setMobile(e.target.value)} 
                />
              </div>

              {error && (
                <div className="text-xs text-app-red bg-app-red/15 rounded-lg py-2 px-3">{error}</div>
              )}

              <button 
                onClick={goStep2} 
                className="w-full py-3.5 rounded-xl border-none bg-gradient-to-br from-app-green to-app-blue text-app-bg font-bold text-[15px] cursor-pointer hover:opacity-90"
              >
                {ui.nextProfile} →
              </button>

              <div className="text-center text-sm text-app-muted">
                {ui.alreadyRegistered}{' '}
                <button 
                  className="bg-transparent border-none text-app-green font-semibold text-sm cursor-pointer p-0"
                  onClick={() => { setMode('login'); setError('') }}
                >
                  {ui.login}
                </button>
              </div>
            </div>
          )}

          {/* ─── REGISTER FORM — STEP 2: Student Profile ─── */}
          {mode === 'register' && regStep === 2 && (
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center gap-2.5 mb-0.5">
                <button 
                  onClick={() => setRegStep(1)} 
                  className="bg-transparent border-none text-app-green font-semibold text-xs cursor-pointer p-0"
                >
                  ← {ui.back}
                </button>
                <span className="text-sm font-bold text-app-text">{ui.step2of2}</span>
              </div>

              <div className="flex gap-2.5">
                <div className="flex-1">
                  <label className="text-[11px] text-app-muted font-semibold block mb-1.5">{ui.classLabel}</label>
                  <select
                    className="w-full bg-app-card2 border border-white/10 rounded-xl py-3 px-3.5 text-app-text text-sm outline-none cursor-pointer focus:ring-1 focus:ring-app-green/50"
                    value={standard}
                    onChange={e => {
                      const nextStandard = e.target.value
                      setStd(nextStandard)
                      if (!(nextStandard.includes('11') || nextStandard.includes('12'))) {
                        setStream('')
                      }
                    }}
                  >
                    {standardList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[11px] text-app-muted font-semibold block mb-1.5">{ui.boardLabel}</label>
                  <select 
                    className="w-full bg-app-card2 border border-white/10 rounded-xl py-3 px-3.5 text-app-text text-sm outline-none cursor-pointer focus:ring-1 focus:ring-app-green/50"
                    value={board} 
                    onChange={e => setBoard(e.target.value)}
                  >
                    {boardList.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-app-muted font-semibold block mb-1.5">{ui.languageLabel}</label>
                <select 
                  className="w-full bg-app-card2 border border-white/10 rounded-xl py-3 px-3.5 text-app-text text-sm outline-none cursor-pointer focus:ring-1 focus:ring-app-green/50"
                  value={language} 
                  onChange={e => setLang(e.target.value)}
                >
                  {mediumList.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {needsStream && (
                <div>
                  <label className="text-[11px] text-app-muted font-semibold block mb-1.5">Stream</label>
                  <select
                    className="w-full bg-app-card2 border border-white/10 rounded-xl py-3 px-3.5 text-app-text text-sm outline-none cursor-pointer focus:ring-1 focus:ring-app-green/50"
                    value={stream}
                    onChange={e => setStream(e.target.value)}
                  >
                    <option value="">Select stream</option>
                    {STREAMS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              {error && (
                <div className="text-xs text-app-red bg-app-red/15 rounded-lg py-2 px-3">{error}</div>
              )}

              <button 
                onClick={doRegister} 
                disabled={loading} 
                className={`w-full py-3.5 rounded-xl border-none bg-gradient-to-br from-app-green to-app-blue text-app-bg font-bold text-[15px] cursor-pointer
                  ${loading ? 'opacity-70' : 'hover:opacity-90'}`}
              >
                {loading ? ui.creatingAccount : ui.startLearning}
              </button>
            </div>
          )}
        </div>

        <div className="text-center mt-5 text-[11px] text-app-muted leading-relaxed">
          {ui.termsNotice}
        </div>
      </div>
    </div>
  )
}
