import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom'
import LandingPage from './components/LandingPage.jsx'
import Onboard from './components/Onboard.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import AdminPanel from './components/AdminPanel.jsx'
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
const DEFAULT_PROFILE = { name: '', standard: 'Class 10', board: 'CBSE', language: 'English', subjects: [], plan: 'free', plan_expires_at: '' }
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
  { key: 'labs',     icon: '⚗️',  label: 'Labs'     },
]

// ─── AppShell ─────────────────────────────────────────────────
// Rendered at /app/:tab — reads tab from URL, all state via props.
function AppShell({
  profile, userId, xp, streak, addXp,
  docCtx, setDocCtx, docName, setDocName,
  showSettings, setShowSettings,
  aiConfig, savedAiKeys,
  handleLogout, handleAIConfigSave, handleProfileSave,
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
    </div>
  )
}

// ─── App Root ─────────────────────────────────────────────────
export default function App() {
  const navigate   = useNavigate()
  const location   = useLocation()

  // ── App state ─────────────────────────────────────────────
  const [profile,        setProfile]        = useState(DEFAULT_PROFILE)
  const [userId,         setUserId]         = useState(null)
  const [xp,             setXp]             = useState(0)
  const [streak,         setStreak]         = useState(1)
  const [docCtx,         setDocCtx]         = useState('')
  const [docName,        setDocName]        = useState('')
  const [showSettings,   setShowSettings]   = useState(false)
  const [aiConfig,       setAiConfigState]  = useState(DEFAULT_AI)
  const [savedAiKeys,    setSavedAiKeys]    = useState({})

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
    }
    setProfile(p)
    setUserId(data.id)
    try { localStorage.setItem('eduvyai_profile', JSON.stringify(p)) } catch {}
    setXp(data.xp || 0)

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
      if (token) {
        try {
          const data = await apiGetMe()
          if (data) {
            hydrateProfile(data)
            // Admin routes manage their own auth — don't redirect them
            if (location.pathname.startsWith('/admin')) return
            // Landing page manages its own redirect — skip it here
            if (location.pathname === '/') return
            if (location.pathname.startsWith('/auth')) {
              // Already had valid token, go to app
              navigate('/app/home', { replace: true })
            }
            // Already on /app/* — stay there, state is now hydrated
            return
          }
        } catch { /* token expired */ }
        clearAuth()
      }
      // Not authenticated — admin routes manage their own auth
      if (location.pathname.startsWith('/admin')) return
      // Landing page manages its own state
      if (location.pathname === '/') return
      if (location.pathname.startsWith('/app')) {
        navigate('/auth', { replace: true })
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      apiAddXp(userId || getDeviceId(), pts).then(res => setXp(res.xp)).catch(() => {})
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

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
