import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom'
import LandingPage from './components/LandingPage.jsx'
import Onboard from './components/Onboard.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import HelperPortal from './components/HelperPortal.jsx'
import HomeTab from './components/tabs/HomeTab.jsx'
import NotebookTab from './components/tabs/NotebookTab.jsx'
import TutorTab from './components/tabs/TutorTab.jsx'
import VideosTab from './components/tabs/VideosTab.jsx'
import LabsTab from './components/tabs/LabsTab.jsx'
import LearnTVTab from './components/tabs/LearnTVTab.jsx'
import SathiTab from './components/tabs/SathiTab.jsx'
import BhoolBazaarTab from './components/tabs/BhoolBazaarTab.jsx'
import MuqablaTab from './components/tabs/MuqablaTab.jsx'
import ParentDashboard from './components/ParentDashboard.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import {
  getDeviceId, apiAddXp, apiUpdateStreak,
  apiUpdateProfile, computeStreak,
  getAuthToken, setAuthToken, clearAuth, apiGetMe,
} from './api.js'
import { speakText, stopSpeaking, DEFAULT_A11Y } from './shared.js'

// Re-export from shared.js so all tab components keep working unchanged.
export {
  COLORS, BOARDS, LANGS, SUBS, LANG_RULES, UI_STRINGS, li,
  AI_PROVIDERS, getAIConfig, setAIConfig, callAI,
  buildSystemPrompt, parseAIObject, parseAIArray, checkStudentQuery,
  TEACHER_PERSONAS, updateBhool, getBhoolStats,
  PLANS, planHasTab, planHasLab,
} from './shared.js'

import { COLORS, AI_PROVIDERS, setAIConfig, PLANS, planHasTab } from './shared.js'

// ─── Defaults ────────────────────────────────────────────────
const DEFAULT_PROFILE = { name: '', standard: 'Class 10', board: 'CBSE', language: 'English', subjects: [], plan: 'free', plan_expires_at: '', is_drishti: false }
const DEFAULT_AI = { provider: 'groq', apiKey: '', model: 'llama-3.3-70b-versatile' }

// All possible nav items — filtered at render time by plan.
const ALL_NAV_ITEMS = [
  { key: 'home',     icon: '🏠', label: 'Home'     },
  { key: 'notebook', icon: '📓', label: 'Notebook'  },
  { key: 'tutor',    icon: '🤖', label: 'Tutor'    },
  { key: 'videos',   icon: '🎬', label: 'Videos'   },
  { key: 'learntv',  icon: '📺', label: 'Learn TV' },
  { key: 'sathi',    icon: '🤝', label: 'Sathi'     },
  { key: 'bhool',    icon: '📛', label: 'Bhool'     },
  { key: 'muqabla',  icon: '⚔️',  label: 'Muqabla'  },
  { key: 'labs',     icon: '🧪',  label: 'Labs'     },
]

// ─── AppShell ─────────────────────────────────────────────────
// Rendered at /app/:tab — reads tab from URL, all state via props.
function AppShell({
  profile, userId, xp, streak, addXp,
  docCtx, setDocCtx, docName, setDocName,
  showSettings, setShowSettings,
  aiConfig, savedAiKeys,
  handleLogout, handleAIConfigSave, handleProfileSave,
  a11y, setA11y, helperNotes,
}) {
  const { tab = 'home' } = useParams()
  const navigate = useNavigate()
  const setTab = (key) => navigate(`/app/${key}`)

  const providerInfo = AI_PROVIDERS[aiConfig.provider] || AI_PROVIDERS.gemini
  const sharedProps = { profile, userId, xp, streak, addXp, docCtx, setDocCtx, docName, setDocName, setTab }

  // Filter nav items based on the user's plan
  const userPlan = profile.plan || 'free'
  const NAV_ITEMS = ALL_NAV_ITEMS.filter(n => planHasTab(userPlan, n.key))

  const tabs = {
    home:     <HomeTab     {...sharedProps} />,
    notebook: <NotebookTab {...sharedProps} />,
    tutor:    <TutorTab    {...sharedProps} />,
    videos:   <VideosTab   {...sharedProps} />,
    learntv:  <LearnTVTab  {...sharedProps} />,
    sathi:    <SathiTab        {...sharedProps} />,
    bhool:    <BhoolBazaarTab  {...sharedProps} />,
    muqabla:  <MuqablaTab      {...sharedProps} />,
    labs:     <LabsTab         {...sharedProps} />,
  }

  // If tab is not in the user's plan, redirect to home
  if (!tabs[tab] || !planHasTab(userPlan, tab)) return <Navigate to="/app/home" replace />

  return (
    <div className="app-shell">

      {/* ── Desktop Sidebar Nav ── */}
      <nav className="side-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, padding: '0 8px' }}>
          <span style={{ fontSize: 26 }}>🎓</span>
          <span style={{ fontWeight: 900, fontSize: 18, color: COLORS.green, letterSpacing: '-0.5px' }}>Eduvy-AI</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {NAV_ITEMS.map(n => (
            <button key={n.key} onClick={() => setTab(n.key)} style={{
              background: tab === n.key ? `${COLORS.green}15` : 'transparent',
              border: `1.5px solid ${tab === n.key ? COLORS.green + '40' : 'transparent'}`,
              borderRadius: 12, padding: '11px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
              cursor: 'pointer', fontFamily: 'Sora, sans-serif', textAlign: 'left',
              transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: 20, width: 24, textAlign: 'center' }}>{n.icon}</span>
              <span style={{ fontSize: 14, fontWeight: tab === n.key ? 700 : 500, color: tab === n.key ? COLORS.green : COLORS.text }}>
                {n.label}
              </span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1, background: COLORS.card2, borderRadius: 10, padding: '7px 8px', fontSize: 12, fontWeight: 700, color: COLORS.yellow, textAlign: 'center', border: `1px solid ${COLORS.border}` }}>
              ⚡ {xp} XP
            </div>
            <div style={{ flex: 1, background: COLORS.card2, borderRadius: 10, padding: '7px 8px', fontSize: 12, fontWeight: 700, color: COLORS.orange, textAlign: 'center', border: `1px solid ${COLORS.border}` }}>
              🔥 {streak}
            </div>
          </div>
          {/* Plan badge */}
          {(() => {
            const planInfo = PLANS[userPlan] || PLANS.free
            return (
              <div style={{
                background: `${planInfo.color}15`, border: `1px solid ${planInfo.color}40`,
                borderRadius: 10, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 14 }}>{planInfo.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: planInfo.color }}>{planInfo.label}</span>
                <span style={{ fontSize: 10, color: COLORS.muted, marginLeft: 'auto' }}>Plan</span>
              </div>
            )
          })()}
          <button onClick={() => setShowSettings(true)} style={{
            background: `${providerInfo.color}12`, border: `1px solid ${providerInfo.color}40`,
            borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center',
            gap: 8, cursor: 'pointer', fontFamily: 'Sora, sans-serif', width: '100%',
          }}>
            <span style={{ fontSize: 16 }}>{providerInfo.icon}</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: providerInfo.color }}>{providerInfo.label}</div>
              <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 1 }}>⚙️ Change AI</div>
            </div>
          </button>
          <div style={{ fontSize: 11, color: COLORS.muted, textAlign: 'center', paddingTop: 4 }}>
            {profile.name && `${profile.name} · ${profile.standard}`}
          </div>
          <button onClick={handleLogout} style={{
            background: `${COLORS.red}10`, border: `1px solid ${COLORS.red}30`,
            borderRadius: 10, padding: '8px 12px', fontSize: 12, color: COLORS.red,
            cursor: 'pointer', fontFamily: 'Sora, sans-serif', width: '100%', fontWeight: 600,
          }}>🚪 Logout</button>
        </div>
      </nav>

      {/* ── Right panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        {/* Mobile top header */}
        <div className="app-header" style={{
          background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`,
          padding: '11px 14px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🎓</span>
            <span style={{ fontWeight: 800, fontSize: 16, color: COLORS.green }}>Eduvy-AI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: COLORS.card2, borderRadius: 20, padding: '3px 9px', fontSize: 12, fontWeight: 700, color: COLORS.yellow, border: `1px solid ${COLORS.border}` }}>⚡ {xp} XP</div>
            <div style={{ background: COLORS.card2, borderRadius: 20, padding: '3px 9px', fontSize: 12, fontWeight: 700, color: COLORS.orange, border: `1px solid ${COLORS.border}` }}>🔥 {streak}</div>
            <button onClick={() => setShowSettings(true)} style={{
              background: `${providerInfo.color}18`, border: `1px solid ${providerInfo.color}50`,
              borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
              color: providerInfo.color, cursor: 'pointer', fontFamily: 'Sora, sans-serif',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>{providerInfo.icon} {providerInfo.label.split(' ')[0]}</button>
            <button onClick={() => setShowSettings(true)} style={{
              background: 'transparent', border: `1px solid ${COLORS.border}`,
              borderRadius: 8, padding: '4px 8px', fontSize: 14, color: COLORS.muted,
              cursor: 'pointer', fontFamily: 'Sora, sans-serif',
            }}>⚙️</button>
            <button onClick={handleLogout} style={{
              background: 'transparent', border: `1px solid ${COLORS.red}30`,
              borderRadius: 8, padding: '4px 8px', fontSize: 13, color: COLORS.red,
              cursor: 'pointer', fontFamily: 'Sora, sans-serif',
            }}>🚪</button>
          </div>
        </div>
        <div className="tab-content">{tabs[tab]}</div>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map(n => (
          <button key={n.key} onClick={() => setTab(n.key)} style={{
            flex: 1, background: 'transparent', border: 'none',
            padding: '10px 4px 8px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 3, cursor: 'pointer', fontFamily: 'Sora, sans-serif',
          }}>
            <span style={{ fontSize: 19 }}>{n.icon}</span>
            <span style={{ fontSize: 10, fontWeight: tab === n.key ? 700 : 400, color: tab === n.key ? COLORS.green : COLORS.muted }}>
              {n.label}
            </span>
            {tab === n.key && <div style={{ width: 4, height: 4, borderRadius: '50%', background: COLORS.green }} />}
          </button>
        ))}
      </nav>

      {showSettings && (
        <SettingsModal
          config={aiConfig}
          savedKeys={savedAiKeys}
          profile={profile}
          onSave={handleAIConfigSave}
          onProfileSave={handleProfileSave}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Drishti Accessibility Toolbar */}
      {profile.is_drishti && (
        <div style={{
          position: 'fixed', bottom: 90, right: 16, zIndex: 999,
          background: COLORS.card, border: `1px solid ${COLORS.border}`,
          borderRadius: 16, padding: '12px 14px',
          display: 'flex', flexDirection: 'column', gap: 8,
          boxShadow: '0 4px 20px #0008',
        }}>
          <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>👁️ DRISHTI</div>
          
          <button onClick={() => setA11y(a => ({ ...a, ttsEnabled: !a.ttsEnabled }))} style={{
            background: a11y.ttsEnabled ? `${COLORS.green}25` : 'transparent',
            border: `1px solid ${a11y.ttsEnabled ? COLORS.green : COLORS.border}`,
            borderRadius: 10, padding: '8px 12px', cursor: 'pointer',
            color: a11y.ttsEnabled ? COLORS.green : COLORS.text,
            fontFamily: 'Sora, sans-serif', fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>🔊</span> TTS {a11y.ttsEnabled ? 'On' : 'Off'}
          </button>
          
          <button onClick={() => {
            const next = !a11y.highContrast
            setA11y(a => ({ ...a, highContrast: next }))
            document.body.classList.toggle('high-contrast', next)
          }} style={{
            background: a11y.highContrast ? `${COLORS.yellow}25` : 'transparent',
            border: `1px solid ${a11y.highContrast ? COLORS.yellow : COLORS.border}`,
            borderRadius: 10, padding: '8px 12px', cursor: 'pointer',
            color: a11y.highContrast ? COLORS.yellow : COLORS.text,
            fontFamily: 'Sora, sans-serif', fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>☀️</span> Contrast
          </button>
          
          <button onClick={() => {
            const sizes = ['normal', 'large', 'xlarge']
            const idx = sizes.indexOf(a11y.fontSize)
            const next = sizes[(idx + 1) % sizes.length]
            setA11y(a => ({ ...a, fontSize: next }))
            document.body.classList.remove('font-large', 'font-xlarge')
            if (next !== 'normal') document.body.classList.add(`font-${next}`)
          }} style={{
            background: a11y.fontSize !== 'normal' ? `${COLORS.blue}25` : 'transparent',
            border: `1px solid ${a11y.fontSize !== 'normal' ? COLORS.blue : COLORS.border}`,
            borderRadius: 10, padding: '8px 12px', cursor: 'pointer',
            color: a11y.fontSize !== 'normal' ? COLORS.blue : COLORS.text,
            fontFamily: 'Sora, sans-serif', fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>🔤</span> Font: {a11y.fontSize === 'normal' ? 'A' : a11y.fontSize === 'large' ? 'A+' : 'A++'}
          </button>

          {a11y.ttsEnabled && (
            <button onClick={() => stopSpeaking()} style={{
              background: `${COLORS.red}25`, border: `1px solid ${COLORS.red}40`,
              borderRadius: 10, padding: '6px 12px', cursor: 'pointer',
              color: COLORS.red, fontFamily: 'Sora, sans-serif', fontSize: 11, fontWeight: 600,
            }}>
              ⏹ Stop Speaking
            </button>
          )}
        </div>
      )}

      {/* Helper Note Banner */}
      {profile.is_drishti && helperNotes.length > 0 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 998,
          background: `linear-gradient(135deg, ${COLORS.blue}15, ${COLORS.green}15)`,
          borderBottom: `1px solid ${COLORS.border}`,
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>💬</span>
          <div style={{ flex: 1 }}>
            <p style={{ color: COLORS.text, fontSize: 13, fontWeight: 600, margin: 0 }}>
              From {helperNotes[0].helper_name}:
            </p>
            <p style={{ color: COLORS.muted, fontSize: 12, margin: '2px 0 0' }}>
              {helperNotes[0].message}
            </p>
          </div>
          {a11y.ttsEnabled && (
            <button onClick={() => speakText(helperNotes[0].message, profile.language === 'Hindi' ? 'hi-IN' : 'en-IN')} style={{
              background: COLORS.green, border: 'none', borderRadius: 8,
              padding: '6px 12px', cursor: 'pointer', color: '#04040e',
              fontFamily: 'Sora, sans-serif', fontSize: 11, fontWeight: 700,
            }}>
              🔊 Play
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── App Root ─────────────────────────────────────────────────
export default function App() {
  const navigate   = useNavigate()
  const location   = useLocation()

  // ── App state ─────────────────────────────────────────────
  const [profile,        setProfile]        = useState(() => {
    try {
      const cached = localStorage.getItem('eduvyai_profile')
      if (cached) return { ...DEFAULT_PROFILE, ...JSON.parse(cached) }
    } catch {}
    return DEFAULT_PROFILE
  })
  const [userId,         setUserId]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('eduvyai_profile') || 'null')?.id || null } catch { return null }
  })
  const [xp,             setXp]             = useState(() => {
    try { return JSON.parse(localStorage.getItem('eduvyai_profile') || 'null')?.xp || 0 } catch { return 0 }
  })
  const [streak,         setStreak]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('eduvyai_profile') || 'null')?.streak || 1 } catch { return 1 }
  })
  const [docCtx,         setDocCtx]         = useState('')
  const [docName,        setDocName]        = useState('')
  const [showSettings,   setShowSettings]   = useState(false)
  const [aiConfig,       setAiConfigState]  = useState(DEFAULT_AI)
  const [savedAiKeys,    setSavedAiKeys]    = useState({})
  
  // Drishti accessibility state
  const [a11y, setA11y] = useState({ ttsEnabled: false, highContrast: false, fontSize: 'normal' })
  const [helperNotes, setHelperNotes] = useState([])

  // (splash coordination removed — LandingPage handles auth check itself)

  // ── Hydrate from profile row ──────────────────────────────
  const hydrateProfile = (data) => {
    const p = {
      name:            data.name,
      standard:        data.standard,
      board:           data.board,
      language:        data.language,
      subjects:        Array.isArray(data.subjects) ? data.subjects : [],
      mobile:          data.mobile || '',
      parent_mobile:   data.parent_mobile || '',
      plan:            data.plan || 'free',
      plan_expires_at: data.plan_expires_at || '',
      is_drishti:      data.is_drishti || false,
    }
    setProfile(p)
    setUserId(data.id)
    try { localStorage.setItem('eduvyai_profile', JSON.stringify({ ...p, id: data.id, xp: data.xp || 0, streak: data.streak || 1 })) } catch {}
    setXp(data.xp || 0)
    
    // If Drishti user, enable TTS by default and fetch helper notes
    if (data.is_drishti) {
      setA11y(a => ({ ...a, ttsEnabled: true }))
      fetchHelperNotes(data.id)
    }

    const { streak: newStreak, changed } = computeStreak(data.last_active || '', data.streak || 1)
    setStreak(newStreak)
    if (changed) apiUpdateStreak(data.id, newStreak).catch(() => {})

    const keys = (typeof data.ai_keys === 'object' && data.ai_keys) ? data.ai_keys : {}
    let prov   = data.ai_provider || 'groq'
    let model  = data.ai_model    || 'llama-3.3-70b-versatile'
    let apiKey = data.ai_key || keys[prov] || ''
    if (data.ai_key && !keys[prov]) keys[prov] = data.ai_key
    if (!apiKey && prov !== 'groq') {
      prov = 'groq'; model = 'llama-3.3-70b-versatile'; apiKey = keys['groq'] || ''
    }
    setSavedAiKeys(keys)
    const cfg = { provider: prov, model, apiKey }
    setAIConfig(cfg)
    setAiConfigState(cfg)
  }

  // ── Auth check on mount ───────────────────────────────────
  // Note: the landing page (/) handles its own auth redirect.
  // This effect only handles /app/* and /auth routes.
  useEffect(() => {
    async function load() {
      const token = getAuthToken()
      if (!token) {
        if (location.pathname.startsWith('/app')) navigate('/auth', { replace: true })
        return
      }

      let data = null
      try {
        data = await apiGetMe()
      } catch {
        // Network error / backend down — stay on current page with cached profile
        return
      }

      if (data) {
        hydrateProfile(data)
        // Admin routes manage their own auth — don't redirect them
        if (location.pathname.startsWith('/admin')) return
        if (location.pathname === '/') return
        if (location.pathname.startsWith('/auth')) {
          navigate('/app/home', { replace: true })
        }
        return
      }

      // data is null → 401/404 → token is genuinely invalid
      clearAuth()
      if (location.pathname.startsWith('/admin')) return
      if (location.pathname === '/') return
      if (location.pathname.startsWith('/app')) {
        navigate('/auth', { replace: true })
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Fetch helper notes for Drishti users ──────────────────
  const fetchHelperNotes = async (uid) => {
    try {
      const token = getAuthToken()
      const res = await fetch(`/api/profile/${uid}/helper-notes`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const notes = await res.json()
        setHelperNotes(Array.isArray(notes) ? notes : [])
      }
    } catch {}
  }

  // ── Handlers ─────────────────────────────────────────────
  const handleAuth = (data) => {
    hydrateProfile(data)
    navigate(data.name ? '/app/home' : '/onboard', { replace: true })
  }

  const handleOnboardComplete = (p) => {
    setProfile(p)
    navigate('/app/home', { replace: true })
  }

  const handleProfileSave = (updates) => {
    const newProfile = { ...profile, ...updates }
    setProfile(newProfile)
    try { localStorage.setItem('eduvyai_profile', JSON.stringify(newProfile)) } catch {}
    apiUpdateProfile(userId || getDeviceId(), updates).catch(() => {})
  }

  const handleAIConfigSave = (cfg) => {
    // AI config is server-managed — only update local state/localStorage
    setAIConfig(cfg)
    setAiConfigState(cfg)
  }

  const handleLogout = () => {
    clearAuth()
    setProfile(DEFAULT_PROFILE)
    setUserId(null)
    setXp(0)
    setStreak(1)
    navigate('/auth', { replace: true })
  }

  const addXp = (pts) => {
    setXp(prev => {
      const next = prev + pts
      apiAddXp(userId || getDeviceId(), pts).then(res => {
        setXp(res.xp)
        try {
          const cached = JSON.parse(localStorage.getItem('eduvyai_profile') || '{}')
          localStorage.setItem('eduvyai_profile', JSON.stringify({ ...cached, xp: res.xp }))
        } catch {}
      }).catch(() => {})
      return next
    })
  }

  // ── Shell props (passed to AppShell via Route element) ────
  const shellProps = {
    profile, userId, xp, streak, addXp,
    docCtx, setDocCtx, docName, setDocName,
    showSettings, setShowSettings,
    aiConfig, savedAiKeys,
    handleLogout, handleAIConfigSave, handleProfileSave,
    a11y, setA11y, helperNotes,
  }

  // ── Routes ────────────────────────────────────────────────
  return (
    <Routes>
      {/* Landing page — shown to unauthenticated visitors */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth */}
      <Route path="/auth" element={<AuthScreen onAuth={handleAuth} />} />

      {/* Onboarding */}
      <Route path="/onboard" element={<Onboard onComplete={handleOnboardComplete} />} />

      {/* Main app — tab is part of the URL */}
      <Route path="/app" element={<Navigate to="/app/home" replace />} />
      <Route path="/app/:tab" element={<AppShell {...shellProps} />} />

      {/* Admin — redirect bare /admin to login; AdminPanel handles auth */}
      <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/:section" element={<AdminPanel />} />

      {/* Parent Dashboard — public, no auth */}
      <Route path="/parent/:pin" element={<ParentDashboard />} />

      {/* Drishti Helper Portal — token-based auth */}
      <Route path="/helper/:token" element={<HelperPortal />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
