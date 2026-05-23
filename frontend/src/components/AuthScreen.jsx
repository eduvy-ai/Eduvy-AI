import { useState } from 'react'
import { COLORS, BOARDS, LANGS, SUBS } from '../shared.js'
import { apiLogin, apiRegister, setAuthToken } from '../api.js'
import { li } from '../i18n/index.js'

const CLASSES = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)

const inp = {
  width: '100%',
  background: '#101022',
  border: '1px solid #ffffff18',
  borderRadius: 12,
  padding: '13px 14px',
  color: COLORS.text,
  fontSize: 14,
  fontFamily: 'Sora, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
}

const btn = {
  width: '100%',
  padding: '14px',
  borderRadius: 12,
  border: 'none',
  background: `linear-gradient(135deg, ${COLORS.green}, ${COLORS.blue})`,
  color: '#04040e',
  fontWeight: 700,
  fontSize: 15,
  fontFamily: 'Sora, sans-serif',
  cursor: 'pointer',
}

const linkBtn = {
  background: 'none',
  border: 'none',
  color: COLORS.green,
  fontFamily: 'Sora, sans-serif',
  fontSize: 13,
  cursor: 'pointer',
  fontWeight: 600,
  padding: 0,
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
  const [language, setLang]     = useState('English')
  const [subjects, setSubs]     = useState([])
  const [regStep, setRegStep]   = useState(1) // 1 = credentials, 2 = profile

  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  // i18n — use selected language during registration, default to English for login
  const ui = li(mode === 'register' ? language : 'English')

  const allSubs = SUBS[standard] || []

  const toggleSub = s => setSubs(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])

  // ── Login ──
  const doLogin = async () => {
    if (!email.trim() || !password) { setError('Enter email and password'); return }
    setError('')
    setLoading(true)
    try {
      const { token, profile } = await apiLogin({ email: email.trim(), password })
      setAuthToken(token)
      onAuth(profile)
    } catch (e) {
      setError(e.message || 'Login failed')
    }
    setLoading(false)
  }

  // ── Register step 1 → step 2 ──
  const goStep2 = () => {
    if (!name.trim()) { setError('Enter your name'); return }
    if (!email.trim() || !email.includes('@')) { setError('Enter a valid email'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setError('')
    setSubs([...allSubs]) // auto-select all subjects
    setRegStep(2)
  }

  // ── Register submit ──
  const doRegister = async () => {
    const finalSubs = subjects.length ? subjects : allSubs
    setError('')
    setLoading(true)
    try {
      const { token, profile } = await apiRegister({
        email: email.trim(),
        password,
        name: name.trim(),
        standard,
        board,
        language,
        subjects: finalSubs,
        mobile: mobile.trim(),
      })
      setAuthToken(token)
      onAuth(profile)
    } catch (e) {
      setError(e.message || 'Registration failed')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      fontFamily: 'Sora, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 42, marginBottom: 8 }}>🎓</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.text }}>Eduvy-AI</div>
          <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>
            {ui.tagline}
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: COLORS.card,
          borderRadius: 20,
          border: `1px solid ${COLORS.border}`,
          padding: 24,
        }}>
          {/* Tab toggle */}
          <div style={{ display: 'flex', gap: 4, background: COLORS.card2, borderRadius: 12, padding: 4, marginBottom: 24 }}>
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setRegStep(1) }}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 10, border: 'none',
                  background: mode === m ? `linear-gradient(135deg, ${COLORS.green}22, ${COLORS.blue}22)` : 'transparent',
                  color: mode === m ? COLORS.text : COLORS.muted,
                  fontWeight: mode === m ? 700 : 500,
                  fontSize: 14,
                  fontFamily: 'Sora, sans-serif',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: mode === m ? `1.5px solid ${COLORS.green}50` : 'none',
                }}
              >{m === 'login' ? ui.login : ui.register}</button>
            ))}
          </div>

          {/* ─── LOGIN FORM ─── */}
          {mode === 'login' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>{ui.emailLabel}</label>
                <input
                  style={inp}
                  type="email"
                  placeholder={ui.emailPlaceholder}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doLogin()}
                  autoComplete="email"
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>{ui.passwordLabel}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    style={inp}
                    type={showPw ? 'text' : 'password'}
                    placeholder={ui.passwordPlaceholder}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && doLogin()}
                    autoComplete="current-password"
                  />
                  <button
                    onClick={() => setShowPw(p => !p)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, fontSize: 16 }}
                  >{showPw ? '🙈' : '👁️'}</button>
                </div>
              </div>

              {error && <div style={{ fontSize: 12, color: COLORS.red, background: `${COLORS.red}15`, borderRadius: 8, padding: '8px 12px' }}>{error}</div>}

              <button onClick={doLogin} disabled={loading} style={{ ...btn, opacity: loading ? 0.7 : 1 }}>
                {loading ? ui.loggingIn : `${ui.login} →`}
              </button>

              <div style={{ textAlign: 'center', fontSize: 13, color: COLORS.muted }}>
                {ui.noAccount}{' '}
                <button style={linkBtn} onClick={() => { setMode('register'); setError('') }}>{ui.createAccount}</button>
              </div>
            </div>
          )}

          {/* ─── REGISTER FORM — STEP 1: Credentials ─── */}
          {mode === 'register' && regStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 2 }}>
                {ui.step1of2}
              </div>

              <div>
                <label style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>{ui.yourName}</label>
                <input style={inp} placeholder={ui.namePlaceholder} value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>{ui.emailLabel}</label>
                <input style={inp} type="email" placeholder={ui.emailPlaceholder} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>{ui.passwordLabel}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    style={inp}
                    type={showPw ? 'text' : 'password'}
                    placeholder={ui.passwordMinChars}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    onClick={() => setShowPw(p => !p)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, fontSize: 16 }}
                  >{showPw ? '🙈' : '👁️'}</button>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>{ui.mobileOptional}</label>
                <input style={inp} type="tel" placeholder={ui.mobilePlaceholder} value={mobile} onChange={e => setMobile(e.target.value)} />
              </div>

              {error && <div style={{ fontSize: 12, color: COLORS.red, background: `${COLORS.red}15`, borderRadius: 8, padding: '8px 12px' }}>{error}</div>}

              <button onClick={goStep2} style={btn}>{ui.nextProfile} →</button>

              <div style={{ textAlign: 'center', fontSize: 13, color: COLORS.muted }}>
                {ui.alreadyRegistered}{' '}
                <button style={linkBtn} onClick={() => { setMode('login'); setError('') }}>{ui.login}</button>
              </div>
            </div>
          )}

          {/* ─── REGISTER FORM — STEP 2: Student Profile ─── */}
          {mode === 'register' && regStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                <button onClick={() => setRegStep(1)} style={{ ...linkBtn, fontSize: 12 }}>← {ui.back}</button>
                <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{ui.step2of2}</span>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>{ui.classLabel}</label>
                  <select
                    style={{ ...inp, cursor: 'pointer' }}
                    value={standard}
                    onChange={e => { setStd(e.target.value); setSubs([]) }}
                  >
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>{ui.boardLabel}</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={board} onChange={e => setBoard(e.target.value)}>
                    {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>{ui.languageLabel}</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={language} onChange={e => setLang(e.target.value)}>
                  {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600 }}>{ui.subjectsLabel}</label>
                  <button
                    onClick={() => setSubs(subjects.length === allSubs.length ? [] : [...allSubs])}
                    style={{ ...linkBtn, fontSize: 11 }}
                  >{subjects.length === allSubs.length ? ui.deselectAll : ui.selectAll}</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {allSubs.map(s => (
                    <button
                      key={s}
                      onClick={() => toggleSub(s)}
                      style={{
                        padding: '6px 12px', borderRadius: 20, border: 'none', fontSize: 12,
                        fontFamily: 'Sora, sans-serif', cursor: 'pointer',
                        background: subjects.includes(s) ? `${COLORS.green}25` : COLORS.card2,
                        color: subjects.includes(s) ? COLORS.green : COLORS.muted,
                        outline: subjects.includes(s) ? `1.5px solid ${COLORS.green}60` : '1.5px solid transparent',
                        fontWeight: subjects.includes(s) ? 700 : 400,
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>

              {error && <div style={{ fontSize: 12, color: COLORS.red, background: `${COLORS.red}15`, borderRadius: 8, padding: '8px 12px' }}>{error}</div>}

              <button onClick={doRegister} disabled={loading} style={{ ...btn, opacity: loading ? 0.7 : 1 }}>
                {loading ? ui.creatingAccount : ui.startLearning}
              </button>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: COLORS.muted, lineHeight: 1.6 }}>
          {ui.termsNotice}
        </div>
      </div>
    </div>
  )
}
