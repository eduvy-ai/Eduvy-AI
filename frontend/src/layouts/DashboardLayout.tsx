// ─── Dashboard Layout ─────────────────────────────────────────
// Main app shell with navigation sidebar and bottom nav

import React, { useState, lazy, Suspense, useMemo } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth, useUser, usePlan, useXp, useStreak } from '../modules/auth/hooks'
import { PLANS, planHasTab, type TabKey } from '../shared/constants/plans'
import { apiUpdateProfile } from '../api.js'
import { li, getDisplayLang } from '../shared.js'

// Lazy load SettingsModal (legacy JSX component)
const SettingsModal = lazy(() => import('../components/SettingsModal.jsx'))

// Navigation items with i18n label keys (not actual labels)
const ALL_NAV_ITEMS: { key: TabKey; labelKey: string }[] = [
  { key: 'home', labelKey: 'homeTab' },
  { key: 'notebook', labelKey: 'notebookTab' },
  { key: 'videos', labelKey: 'videosTab' },
  { key: 'learntv', labelKey: 'learntvTab' },
  { key: 'sathi', labelKey: 'sathiTab' },
  { key: 'bhool', labelKey: 'bhoolTab' },
  { key: 'muqabla', labelKey: 'muqablaTab' },
  { key: 'labs', labelKey: 'labsTab' },
  { key: 'videocreator', labelKey: 'videoCreatorTab' },
]

const DashboardLayout: React.FC = () => {
  const location = useLocation()
  // Extract tab from pathname: /app/home -> home
  const tab = location.pathname.split('/')[2] || 'home'
  const navigate = useNavigate()
  const { logout, refresh } = useAuth()
  const user = useUser()
  const { plan } = usePlan()
  const { xp } = useXp()
  const { streak } = useStreak()
  
  // Settings modal state
  const [showSettings, setShowSettings] = useState(false)
  
  // Get UI translations based on display language preference
  const ui = useMemo(() => li(getDisplayLang(user)), [user])

  // Filter nav items based on user's plan
  const navItems = ALL_NAV_ITEMS.filter(n => planHasTab(plan, n.key))
  const planInfo = PLANS[plan] || PLANS.free
  
  // Helper to get translated label (removes emoji for sidebar, keeps for mobile)
  const getLabel = (labelKey: string, withIcon = false) => {
    const translated = ui[labelKey] || labelKey
    if (withIcon) return translated
    // Remove leading emoji for desktop sidebar (first 2-3 chars if emoji)
    return translated.replace(/^[\u{1F300}-\u{1F9FF}]\s*/u, '')
  }
  
  // Helper to get icon from translated string
  const getIcon = (labelKey: string) => {
    const translated = ui[labelKey] || ''
    const match = translated.match(/^([\u{1F300}-\u{1F9FF}])/u)
    return match ? match[1] : '📱'
  }

  const setTab = (key: TabKey) => {
    navigate(`/app/${key}`)
  }
  
  const handleLogout = () => {
    logout()
    navigate('/auth')
  }
  
  const handleProfileSave = async (updates: Record<string, unknown>) => {
    if (!user?.id) return
    try {
      await apiUpdateProfile(user.id, updates)
      // Refresh user data after update
      await refresh()
    } catch (e) {
      console.error('Failed to update profile:', e)
    }
  }

  return (
    <div className="app-shell">
      {/* ── Desktop Sidebar Nav ── */}
      <nav className="side-nav">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-4 px-2">
          <span className="text-[26px]">🎓</span>
          <span className="font-black text-lg text-app-green tracking-tight">Eduvy-AI</span>
        </div>

        {/* User identity card */}
        {user && (
          <div className="mb-4 px-1 pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-app-green/15 border border-app-green/25 flex items-center justify-center text-[14px] font-black text-app-green shrink-0">
                {(user.name || 'S').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-bold text-app-text truncate">{user.name || 'Student'}</div>
                <div className="text-[10px] text-app-muted truncate">{(user as any).standard} · {(user as any).board}</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-0.5 flex-1">
          {navItems.map(n => (
            <button
              key={n.key}
              onClick={() => setTab(n.key)}
              className={`rounded-xl py-2.5 px-3.5 flex items-center gap-3 cursor-pointer font-[Sora,sans-serif] text-left transition-all duration-150 border-[1.5px] active:scale-[0.97] relative ${
                tab === n.key
                  ? 'bg-app-green/10 border-app-green/30 side-active'
                  : 'bg-transparent border-transparent hover:bg-white/[0.04] hover:border-white/[0.05]'
              }`}
            >
              <span className="text-xl w-6 text-center">{getIcon(n.labelKey)}</span>
              <span className={`text-sm ${tab === n.key ? 'font-bold text-app-green' : 'font-medium text-app-text'}`}>
                {getLabel(n.labelKey)}
              </span>
            </button>
          ))}
        </div>

        {/* Stats & Settings */}
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
          <div
            className="rounded-[10px] py-1.5 px-3 flex items-center gap-1.5 border"
            style={{ background: `${planInfo.color}15`, borderColor: `${planInfo.color}40` }}
          >
            <span className="text-sm">{planInfo.icon}</span>
            <span className="text-xs font-bold" style={{ color: planInfo.color }}>
              {planInfo.label}
            </span>
            <span className="text-[10px] text-app-muted ml-auto">Plan</span>
          </div>

          {/* Settings button */}
          <button
            onClick={() => setShowSettings(true)}
            className="rounded-xl py-2.5 px-3 flex items-center gap-2 cursor-pointer font-[Sora,sans-serif] w-full border bg-app-card2 border-app-border hover:border-app-green/30 active:scale-[0.97] transition-all duration-150"
          >
            <span className="text-base">⚙️</span>
            <span className="text-sm font-medium text-app-text">{ui.settings || 'Settings'}</span>
          </button>
          
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="rounded-xl py-2.5 px-3 flex items-center gap-2 cursor-pointer font-[Sora,sans-serif] w-full border bg-app-red/10 border-app-red/30 hover:bg-app-red/20 active:scale-[0.97] transition-all duration-150"
          >
            <span className="text-base">🚪</span>
            <span className="text-sm font-medium text-app-red">{ui.logout || 'Logout'}</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile Bottom Nav — horizontally scrollable, shows all tabs ── */}
      <nav className="bottom-nav">
        {navItems.map(n => (
          <button
            key={n.key}
            onClick={() => setTab(n.key)}
            className={`flex-shrink-0 min-w-[64px] h-14 flex flex-col items-center justify-center gap-0.5 py-0 px-1 bg-transparent border-none cursor-pointer ${
              tab === n.key ? 'text-app-green nav-active' : 'text-app-muted'
            }`}
          >
            <span className="text-[22px] leading-none">{getIcon(n.labelKey)}</span>
            <span className={`text-[10px] leading-tight mt-0.5 max-w-[56px] text-center truncate ${tab === n.key ? 'font-bold' : 'font-medium'}`}>{getLabel(n.labelKey)}</span>
          </button>
        ))}
        {/* Settings always last */}
        <button
          onClick={() => setShowSettings(true)}
          className="flex-shrink-0 min-w-[64px] h-14 flex flex-col items-center justify-center gap-0.5 py-0 px-1 bg-transparent border-none cursor-pointer text-app-muted"
        >
          <span className="text-[22px] leading-none">⚙️</span>
          <span className="text-[10px] font-medium leading-tight mt-0.5">{ui.more || 'More'}</span>
        </button>
      </nav>

      {/* ── Main Content Area ── */}
      <main className="tab-content">
        {/* key={tab} re-mounts div on tab change, triggering the CSS fade-slide-up animation */}
        <div key={tab} className="tab-fade-in h-full flex flex-col">
          <Outlet />
        </div>
      </main>
      
      {/* ── Settings Modal ── */}
      {showSettings && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center"><span className="text-white">Loading...</span></div>}>
          <SettingsModal
            config={{}}
            savedKeys={{}}
            onSave={() => {}}
            onClose={() => setShowSettings(false)}
            onLogout={handleLogout}
            profile={user}
            onProfileSave={handleProfileSave}
          />
        </Suspense>
      )}
    </div>
  )
}

export default DashboardLayout
