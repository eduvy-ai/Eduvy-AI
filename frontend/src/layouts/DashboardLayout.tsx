// ─── Dashboard Layout ─────────────────────────────────────────
// Main app shell with navigation sidebar and bottom nav

import React, { useEffect, useMemo } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth, useUser } from '../modules/auth/hooks'
import { type TabKey } from '../shared/constants/plans'
import { li, getDisplayLang } from '../shared.js'
import { isRTL } from '../i18n/index.js'
import {
  House,
  MagicWand,
  NotePencil,
  MonitorPlay,
  UsersThree,
  Warning,
  Sword,
  Flask,
  SignOut,
  Lightning,
  GraduationCap,
  BookOpen,
  User,
  Microphone,
} from '@phosphor-icons/react'
import type { IconWeight } from '@phosphor-icons/react'
import { useStudentVoiceCopilot } from '../modules/student-copilot/useStudentVoiceCopilot'

// Icon mapping: tabKey -> Phosphor Icon component
const TAB_ICONS: Record<string, React.ComponentType<any>> = {
  home:         House,
  learn:        BookOpen,
  practice:     Lightning,
  profile:      User,
  coach:        MagicWand,
  notebook:     NotePencil,
  learntv:      MonitorPlay,
  squads:       UsersThree,
  mistakes:     Warning,
  battles:      Sword,
  labs:         Flask,
}

// Primary 5-tab navigation (shown in both mobile bottom nav and desktop sidebar)
const PRIMARY_NAV_ITEMS: { key: TabKey; labelKey: string }[] = [
  { key: 'home', labelKey: 'homeTab' },
  { key: 'learn', labelKey: 'learnTab' },
  { key: 'coach', labelKey: 'aiTutorTab' },
  { key: 'practice', labelKey: 'practiceTab' },
  { key: 'profile', labelKey: 'profileTab' },
]

const DashboardLayout: React.FC = () => {
  const location = useLocation()
  // Extract tab from pathname: /app/home -> home
  const tab = location.pathname.split('/')[2] || 'home'
  const navigate = useNavigate()
  const { logout } = useAuth()
  const user = useUser()
  
  // Lock body scroll when dashboard is active (prevents Android WebView viewport issues)
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    html.style.overflow = 'hidden'
    html.style.height = '100%'
    body.style.overflow = 'hidden'
    body.style.height = '100%'
    return () => {
      html.style.overflow = ''
      html.style.height = ''
      body.style.overflow = ''
      body.style.height = ''
    }
  }, [])
  
  // Get UI translations based on display language preference
  const lang = getDisplayLang(user)
  const ui = useMemo(() => li(lang), [lang])
  const rtl = isRTL(lang)
  const { isListening, lastMessage, pendingAlternatives, chooseAlternative, runVoiceCommand } = useStudentVoiceCopilot(user?.language)

  // Primary 5-tab nav (shown in both mobile bottom nav and desktop sidebar)
  const primaryNavItems = PRIMARY_NAV_ITEMS
  
  // Helper to get translated label (strip leading emoji from i18n strings)
  const getLabel = (labelKey: string) => {
    const translated = ui[labelKey] || labelKey
    return translated.replace(/^[\u{1F300}-\u{1F9FF}]\uFE0F?\s*/u, '').replace(/^[⚔️]\s*/u, '')
  }
  
  // Render Phosphor icon for a tab (filled when active, regular when inactive)
  const renderIcon = (key: string, isActive: boolean, size = 22) => {
    const IconComponent = TAB_ICONS[key]
    if (!IconComponent) return null
    const weight: IconWeight = isActive ? 'fill' : 'regular'
    return <IconComponent size={size} weight={weight} />
  }

  const setTab = (key: TabKey) => {
    navigate(`/app/${key}`)
    // Haptic feedback on tab switch (native only)
    import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
    }).catch(() => {})
  }
  
  const handleLogout = () => {
    logout()
    navigate('/auth')
  }

  return (
    <div className="app-shell" dir={rtl ? 'rtl' : 'ltr'}>
      {/* ── Desktop Sidebar Nav ── */}
      <nav className="side-nav">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-4 px-2">
          <GraduationCap size={26} weight="duotone" className="text-app-green" />
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

        <div className="flex flex-col gap-0.5 flex-1 overflow-y-auto">
          {/* Primary Navigation */}
          {primaryNavItems.map(n => (
            <button
              key={n.key}
              onClick={() => setTab(n.key)}
              className={`rounded-xl py-2.5 px-3.5 flex items-center gap-3 cursor-pointer font-[Sora,sans-serif] text-left transition-all duration-150 border-[1.5px] active:scale-[0.97] relative ${
                tab === n.key
                  ? 'bg-app-green/10 border-app-green/30 side-active'
                  : 'bg-transparent border-transparent hover:bg-white/[0.04] hover:border-white/[0.05]'
              }`}
            >
              <span className="w-6 flex items-center justify-center">{renderIcon(n.key, tab === n.key, 20)}</span>
              <span className={`text-sm ${tab === n.key ? 'font-bold text-app-green' : 'font-medium text-app-text'}`}>
                {getLabel(n.labelKey)}
              </span>
            </button>
          ))}
        </div>

        {/* Logout */}
        <div className="flex flex-col gap-2 mt-5">
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="rounded-xl py-2.5 px-3 flex items-center gap-2 cursor-pointer font-[Sora,sans-serif] w-full border bg-app-red/10 border-app-red/30 hover:bg-app-red/20 active:scale-[0.97] transition-all duration-150"
          >
            <SignOut size={18} weight="fill" className="text-app-red" />
            <span className="text-sm font-medium text-app-red">{ui.logout || 'Logout'}</span>
          </button>
        </div>
      </nav>

      {/* ── Main Content Area ── */}
      <main className="tab-content">
        {/* key={tab} re-mounts div on tab change, triggering the CSS fade-slide-up animation */}
        <div key={tab} className="tab-fade-in h-full flex flex-col min-h-0">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile Bottom Nav — 5 primary tabs, no scroll needed ── */}
      <nav className="bottom-nav">
        {primaryNavItems.map(n => (
          <button
            key={n.key}
            onClick={() => setTab(n.key)}
            className={`flex-1 h-14 flex flex-col items-center justify-center gap-0.5 py-0 px-1 bg-transparent border-none cursor-pointer ${
              tab === n.key ? 'text-app-green nav-active' : 'text-app-muted'
            }`}
          >
            <span className="leading-none">{renderIcon(n.key, tab === n.key, 22)}</span>
            <span className={`text-[10px] leading-tight mt-0.5 max-w-[56px] text-center truncate ${tab === n.key ? 'font-bold' : 'font-medium'}`}>{getLabel(n.labelKey)}</span>
          </button>
        ))}
      </nav>

      {/* Student Voice Copilot trigger */}
      <button
        type="button"
        onClick={() => { runVoiceCommand().catch(() => {}) }}
        aria-label={isListening ? 'Listening for command' : 'Start voice command'}
        className={`fixed right-4 z-50 w-12 h-12 rounded-full border shadow-lg flex items-center justify-center transition-all duration-150 ${
          isListening
            ? 'bottom-24 bg-app-green text-app-bg border-app-green animate-pulse'
            : 'bottom-24 bg-app-card text-app-green border-app-green/40 hover:border-app-green'
        }`}
      >
        <Microphone size={20} weight="fill" />
      </button>

      {lastMessage && (
        <div className="fixed right-4 bottom-40 z-50 max-w-[260px] px-3 py-2 rounded-xl bg-app-card border border-app-border text-[11px] text-app-text shadow-lg">
          {lastMessage}
          {pendingAlternatives.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {pendingAlternatives.map((tabOption) => (
                <button
                  key={tabOption}
                  type="button"
                  onClick={() => { chooseAlternative(tabOption) }}
                  className="px-2 py-1 rounded-lg bg-app-card2 border border-app-green/30 text-app-green text-[10px] font-semibold"
                >
                  {tabOption}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DashboardLayout
