// ─── Dashboard Layout ─────────────────────────────────────────
// Main app shell with navigation sidebar and bottom nav

import React, { useState, lazy, Suspense } from 'react'
import { useNavigate, useParams, Outlet } from 'react-router-dom'
import { useAuth, useUser, usePlan, useXp, useStreak } from '../modules/auth/hooks'
import { PLANS, planHasTab, type TabKey } from '../shared/constants/plans'
import { apiUpdateProfile } from '../api.js'

// Lazy load SettingsModal (legacy JSX component)
const SettingsModal = lazy(() => import('../components/SettingsModal.jsx'))

// Navigation items with i18n label keys
const ALL_NAV_ITEMS: { key: TabKey; icon: string; label: string }[] = [
  { key: 'home', icon: '🏠', label: 'Home' },
  { key: 'notebook', icon: '📓', label: 'Notebook' },
  { key: 'tutor', icon: '🤖', label: 'Tutor' },
  { key: 'videos', icon: '🎬', label: 'Videos' },
  { key: 'learntv', icon: '📺', label: 'LearnTV' },
  { key: 'sathi', icon: '🤝', label: 'Sathi' },
  { key: 'bhool', icon: '📛', label: 'Bhool' },
  { key: 'muqabla', icon: '⚔️', label: 'Muqabla' },
  { key: 'labs', icon: '🧪', label: 'Labs' },
]

const DashboardLayout: React.FC = () => {
  const { tab = 'home' } = useParams<{ tab: string }>()
  const navigate = useNavigate()
  const { logout, refresh } = useAuth()
  const user = useUser()
  const { plan } = usePlan()
  const { xp } = useXp()
  const { streak } = useStreak()
  
  // Settings modal state
  const [showSettings, setShowSettings] = useState(false)

  // Filter nav items based on user's plan
  const navItems = ALL_NAV_ITEMS.filter(n => planHasTab(plan, n.key))
  const planInfo = PLANS[plan] || PLANS.free

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
        <div className="flex items-center gap-2.5 mb-8 px-2">
          <span className="text-[26px]">🎓</span>
          <span className="font-black text-lg text-app-green tracking-tight">Eduvy-AI</span>
        </div>

        <div className="flex flex-col gap-1 flex-1">
          {navItems.map(n => (
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
                {n.label}
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
            className="rounded-[10px] py-2.5 px-3 flex items-center gap-2 cursor-pointer font-[Sora,sans-serif] w-full border bg-app-card2 border-app-border hover:border-app-green/30 transition-colors"
          >
            <span className="text-base">⚙️</span>
            <span className="text-sm font-medium text-app-text">Settings</span>
          </button>
          
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="rounded-[10px] py-2.5 px-3 flex items-center gap-2 cursor-pointer font-[Sora,sans-serif] w-full border bg-app-red/10 border-app-red/30 hover:bg-app-red/20 transition-colors"
          >
            <span className="text-base">🚪</span>
            <span className="text-sm font-medium text-app-red">Logout</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="bottom-nav">
        {navItems.slice(0, 4).map(n => (
          <button
            key={n.key}
            onClick={() => setTab(n.key)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 bg-transparent border-none cursor-pointer ${
              tab === n.key ? 'text-app-green' : 'text-app-muted'
            }`}
          >
            <span className="text-lg">{n.icon}</span>
            <span className="text-[10px] font-medium">{n.label}</span>
          </button>
        ))}
        {/* Settings/More button on mobile */}
        <button
          onClick={() => setShowSettings(true)}
          className="flex-1 flex flex-col items-center gap-0.5 py-2 bg-transparent border-none cursor-pointer text-app-muted"
        >
          <span className="text-lg">⚙️</span>
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

      {/* ── Main Content Area ── */}
      <main className="tab-content">
        <Outlet />
      </main>
      
      {/* ── Settings Modal ── */}
      {showSettings && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center"><span className="text-white">Loading...</span></div>}>
          <SettingsModal
            config={{}}
            savedKeys={{}}
            onSave={() => {}}
            onClose={() => setShowSettings(false)}
            profile={user}
            onProfileSave={handleProfileSave}
          />
        </Suspense>
      )}
    </div>
  )
}

export default DashboardLayout
