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
  COLORS, BOARDS, LANGS, SUBS, LANG_RULES, UI_STRINGS, li, getDisplayLang,
  AI_PROVIDERS, getAIConfig, setAIConfig, callAI,
  buildSystemPrompt, parseAIObject, parseAIArray, checkStudentQuery,
  TEACHER_PERSONAS, updateBhool, getBhoolStats,
  PLANS, planHasTab, planHasLab,
} from './shared.js'

import { COLORS, AI_PROVIDERS, setAIConfig, PLANS, planHasTab, li, getDisplayLang } from './shared.js'

// ─── Defaults ────────────────────────────────────────────────
const DEFAULT_PROFILE = { name: '', standard: 'Class 10', board: 'CBSE', language: 'English', displayLanguage: 'medium', subjects: [], plan: 'free', plan_expires_at: '', is_drishti: false }
const DEFAULT_AI = { provider: 'groq', apiKey: '', model: 'llama-3.3-70b-versatile' }

// All possible nav items — labels come from i18n (filtered at render time by plan).
const ALL_NAV_ITEMS = [
  { key: 'home',     icon: '🏠', labelKey: 'homeTab'     },
  { key: 'notebook', icon: '📓', labelKey: 'notebookTab' },
  { key: 'tutor',    icon: '🤖', labelKey: 'tutorTab'    },
  { key: 'videos',   icon: '🎬', labelKey: 'videosTab'   },
  { key: 'learntv',  icon: '📺', labelKey: 'learntvTab'  },
  { key: 'sathi',    icon: '🤝', labelKey: 'sathiTab'    },
  { key: 'bhool',    icon: '📛', labelKey: 'bhoolTab'    },
  { key: 'muqabla',  icon: '⚔️', labelKey: 'muqablaTab'  },
  { key: 'labs',     icon: '🧪', labelKey: 'labsTab'     },
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
        <div className="flex items-center gap-2.5 mb-8 px-2">
          <span className="text-[26px]">🎓</span>
          <span className="font-black text-lg text-app-green tracking-tight">Eduvy-AI</span>
        </div>
        <div className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map(n => (
            <button 
              key={n.key} 
              onClick={() => setTab(n.key)} 
              className={`rounded-xl py-2.5 px-3.5 flex items-center gap-3 cursor-pointer font-[Sora,sans-serif] text-left transition-all duration-150 border-[1.5px] ${
                tab === n.key 
                  ? 'bg-app-green/10 border-app-green/30' 
                  : 'bg-transparent border-transparent'
              }`}
            >
              <span className="text-xl w-6 text-center">{n.icon}</span>
              <span className={`text-sm ${tab === n.key ? 'font-bold text-app-green' : 'font-medium text-app-text'}`}>
                {li(getDisplayLang(profile))[n.labelKey]?.replace(/^[^\s]+\s/, '') || n.key}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 mt-5">
          <div className="flex gap-1.5">
            <div className="flex-1 bg-app-card2 rounded-[10px] py-1.5 px-2 text-xs font-bold text-app-yellow text-center border border-app-border">
              ⚡ {xp} XP
            </div>
            <div className="flex-1 bg-app-card2 rounded-[10px] py-1.5 px-2 text-xs font-bold text-app-orange text-center border border-app-border">
              🔥 {streak}
            </div>
          </div>
          {/* Plan badge */}
          {(() => {
            const planInfo = PLANS[userPlan] || PLANS.free
            return (
              <div 
                className="rounded-[10px] py-1.5 px-3 flex items-center gap-1.5 border"
                style={{ background: `${planInfo.color}15`, borderColor: `${planInfo.color}40` }}
              >
                <span className="text-sm">{planInfo.icon}</span>
                <span className="text-xs font-bold" style={{ color: planInfo.color }}>{planInfo.label}</span>
                <span className="text-[10px] text-app-muted ml-auto">Plan</span>
              </div>
            )
          })()}
          <button 
            onClick={() => setShowSettings(true)} 
            className="rounded-[10px] py-2.5 px-3 flex items-center gap-2 cursor-pointer font-[Sora,sans-serif] w-full border"
            style={{ background: `${providerInfo.color}12`, borderColor: `${providerInfo.color}40` }}
          >
            <span className="text-base">{providerInfo.icon}</span>
            <div className="flex-1 text-left">
              <div className="text-[11px] font-bold" style={{ color: providerInfo.color }}>{providerInfo.label}</div>
              <div className="text-[10px] text-app-muted mt-px">⚙️ Change AI</div>
            </div>
          </button>
          <div className="text-[11px] text-app-muted text-center pt-1">
            {profile.name && `${profile.name} · ${profile.standard}`}
          </div>
          <button 
            onClick={handleLogout} 
            className="bg-app-red/10 border border-app-red/30 rounded-[10px] py-2 px-3 text-xs text-app-red cursor-pointer font-[Sora,sans-serif] w-full font-semibold"
          >🚪 Logout</button>
        </div>
      </nav>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Mobile top header */}
        <div className="app-header bg-app-card border-b border-app-border py-2.5 px-3.5 flex items-center justify-between sticky top-0 z-[100]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎓</span>
            <span className="font-extrabold text-base text-app-green">Eduvy-AI</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-app-card2 rounded-full py-0.5 px-2.5 text-xs font-bold text-app-yellow border border-app-border">⚡ {xp} XP</div>
            <div className="bg-app-card2 rounded-full py-0.5 px-2.5 text-xs font-bold text-app-orange border border-app-border">🔥 {streak}</div>
            <button 
              onClick={() => setShowSettings(true)} 
              className="rounded-full py-0.5 px-2.5 text-[11px] font-bold cursor-pointer font-[Sora,sans-serif] flex items-center gap-1 border"
              style={{ background: `${providerInfo.color}18`, borderColor: `${providerInfo.color}50`, color: providerInfo.color }}
            >{providerInfo.icon} {providerInfo.label.split(' ')[0]}</button>
            <button 
              onClick={() => setShowSettings(true)} 
              className="bg-transparent border border-app-border rounded-lg py-1 px-2 text-sm text-app-muted cursor-pointer font-[Sora,sans-serif]"
            >⚙️</button>
            <button 
              onClick={handleLogout} 
              className="bg-transparent border border-app-red/30 rounded-lg py-1 px-2 text-[13px] text-app-red cursor-pointer font-[Sora,sans-serif]"
            >🚪</button>
          </div>
        </div>
        <div className="tab-content">{tabs[tab]}</div>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map(n => (
          <button 
            key={n.key} 
            onClick={() => setTab(n.key)} 
            className="flex-1 bg-transparent border-none pt-2.5 pb-2 px-1 flex flex-col items-center gap-0.5 cursor-pointer font-[Sora,sans-serif]"
          >
            <span className="text-[19px]">{n.icon}</span>
            <span className={`text-[10px] ${tab === n.key ? 'font-bold text-app-green' : 'font-normal text-app-muted'}`}>
              {li(getDisplayLang(profile))[n.labelKey]?.replace(/^[^\s]+\s/, '') || n.key}
            </span>
            {tab === n.key && <div className="w-1 h-1 rounded-full bg-app-green" />}
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
        <div className="fixed bottom-[90px] right-4 z-[999] bg-app-card border border-app-border rounded-2xl py-3 px-3.5 flex flex-col gap-2 shadow-[0_4px_20px_#0008]">
          <div className="text-[11px] text-app-muted font-bold tracking-wider mb-1">👁️ DRISHTI</div>
          
          <button 
            onClick={() => setA11y(a => ({ ...a, ttsEnabled: !a.ttsEnabled }))} 
            className={`rounded-[10px] py-2 px-3 cursor-pointer font-[Sora,sans-serif] text-xs font-semibold flex items-center gap-2 border ${
              a11y.ttsEnabled 
                ? 'bg-app-green/20 border-app-green text-app-green' 
                : 'bg-transparent border-app-border text-app-text'
            }`}
          >
            <span>🔊</span> TTS {a11y.ttsEnabled ? 'On' : 'Off'}
          </button>
          
          <button 
            onClick={() => {
              const next = !a11y.highContrast
              setA11y(a => ({ ...a, highContrast: next }))
              document.body.classList.toggle('high-contrast', next)
            }} 
            className={`rounded-[10px] py-2 px-3 cursor-pointer font-[Sora,sans-serif] text-xs font-semibold flex items-center gap-2 border ${
              a11y.highContrast 
                ? 'bg-app-yellow/20 border-app-yellow text-app-yellow' 
                : 'bg-transparent border-app-border text-app-text'
            }`}
          >
            <span>☀️</span> Contrast
          </button>
          
          <button 
            onClick={() => {
              const sizes = ['normal', 'large', 'xlarge']
              const idx = sizes.indexOf(a11y.fontSize)
              const next = sizes[(idx + 1) % sizes.length]
              setA11y(a => ({ ...a, fontSize: next }))
              document.body.classList.remove('font-large', 'font-xlarge')
              if (next !== 'normal') document.body.classList.add(`font-${next}`)
            }} 
            className={`rounded-[10px] py-2 px-3 cursor-pointer font-[Sora,sans-serif] text-xs font-semibold flex items-center gap-2 border ${
              a11y.fontSize !== 'normal' 
                ? 'bg-app-blue/20 border-app-blue text-app-blue' 
                : 'bg-transparent border-app-border text-app-text'
            }`}
          >
            <span>🔤</span> Font: {a11y.fontSize === 'normal' ? 'A' : a11y.fontSize === 'large' ? 'A+' : 'A++'}
          </button>

          {a11y.ttsEnabled && (
            <button 
              onClick={() => stopSpeaking()} 
              className="bg-app-red/20 border border-app-red/40 rounded-[10px] py-1.5 px-3 cursor-pointer text-app-red font-[Sora,sans-serif] text-[11px] font-semibold"
            >
              ⏹ Stop Speaking
            </button>
          )}
        </div>
      )}

      {/* Helper Note Banner */}
      {profile.is_drishti && helperNotes.length > 0 && (
        <div className="fixed top-0 left-0 right-0 z-[998] bg-gradient-to-br from-app-blue/10 to-app-green/10 border-b border-app-border py-2.5 px-4 flex items-center gap-2.5">
          <span className="text-lg">💬</span>
          <div className="flex-1">
            <p className="text-app-text text-[13px] font-semibold m-0">
              From {helperNotes[0].helper_name}:
            </p>
            <p className="text-app-muted text-xs m-0 mt-0.5">
              {helperNotes[0].message}
            </p>
          </div>
          {a11y.ttsEnabled && (
            <button 
              onClick={() => speakText(helperNotes[0].message, profile.language === 'Hindi' ? 'hi-IN' : 'en-IN')} 
              className="bg-app-green border-none rounded-lg py-1.5 px-3 cursor-pointer text-[#04040e] font-[Sora,sans-serif] text-[11px] font-bold"
            >
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
      displayLanguage: data.display_language || 'medium',  // "english" or "medium"
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
    // Convert camelCase to snake_case for backend
    const apiData = { ...updates }
    if ('displayLanguage' in apiData) {
      apiData.display_language = apiData.displayLanguage
      delete apiData.displayLanguage
    }
    apiUpdateProfile(userId || getDeviceId(), apiData).catch(() => {})
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
