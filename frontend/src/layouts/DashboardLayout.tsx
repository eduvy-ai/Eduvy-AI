// ─── Dashboard Layout ─────────────────────────────────────────
// Premium mobile-first app shell with navigation

import React, { useEffect, useMemo } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth, useUser } from '../modules/auth/hooks'
import { type TabKey } from '../shared/constants/plans'
import { li, getDisplayLang } from '../shared.js'
import { isRTL } from '../i18n/index.js'
import {
  House,
  MagicWand,
  BookOpen,
  Lightning,
  User,
  SignOut,
  GraduationCap,
} from '@phosphor-icons/react'
import type { IconWeight } from '@phosphor-icons/react'

const TAB_ICONS: Record<string, React.ComponentType<any>> = {
  home:     House,
  learn:    BookOpen,
  coach:    MagicWand,
  practice: Lightning,
  profile:  User,
}

const PRIMARY_NAV_ITEMS: { key: TabKey; labelKey: string }[] = [
  { key: 'home', labelKey: 'homeTab' },
  { key: 'learn', labelKey: 'learnTab' },
  { key: 'coach', labelKey: 'aiTutorTab' },
  { key: 'practice', labelKey: 'practiceTab' },
  { key: 'profile', labelKey: 'profileTab' },
]

const DashboardLayout: React.FC = () => {
  const location = useLocation()
  const tab = location.pathname.split('/')[2] || 'home'
  const navigate = useNavigate()
  const { logout } = useAuth()
  const user = useUser()
  
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
  
  const lang = getDisplayLang(user)
  const ui = useMemo(() => li(lang), [lang])
  const rtl = isRTL(lang)

  const getLabel = (labelKey: string) => {
    const translated = ui[labelKey] || labelKey
    return translated.replace(/^[\u{1F300}-\u{1F9FF}]\uFE0F?\s*/u, '').replace(/^[⚔️]\s*/u, '')
  }
  
  const renderIcon = (key: string, isActive: boolean, size = 22) => {
    const IconComponent = TAB_ICONS[key]
    if (!IconComponent) return null
    const weight: IconWeight = isActive ? 'fill' : 'regular'
    return <IconComponent size={size} weight={weight} />
  }

  const setTab = (key: TabKey) => {
    navigate(`/app/${key}`)
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
      <nav className="side-nav" style={{ background: 'var(--t-sidebar-bg)', borderColor: 'var(--t-nav-border)' }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-5 px-2">
          <div className="w-9 h-9 rounded-xl bg-[var(--t-primary-light)] flex items-center justify-center">
            <GraduationCap size={22} weight="duotone" className="text-t-primary" />
          </div>
          <span className="font-extrabold text-lg text-t-primary tracking-tight">Eduvy-AI</span>
        </div>

        {/* User identity */}
        {user && (
          <div className="mb-5 mx-1 p-3 rounded-xl bg-t-surface-hover/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[var(--t-primary-light)] border border-t-primary/20 flex items-center justify-center text-caption font-bold text-t-primary shrink-0">
                {(user.name || 'S').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-body-sm font-semibold text-t-text truncate">{user.name || 'Student'}</div>
                <div className="text-micro text-t-text-muted truncate">{(user as any).standard} · {(user as any).board}</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1 flex-1 overflow-y-auto px-1">
          {PRIMARY_NAV_ITEMS.map(n => (
            <button
              key={n.key}
              onClick={() => setTab(n.key)}
              className={`rounded-xl py-2.5 px-3 flex items-center gap-3 cursor-pointer text-left transition-all duration-150 active:scale-[0.97] relative ${
                tab === n.key
                  ? 'bg-[var(--t-primary-light)] text-t-primary side-active'
                  : 'bg-transparent text-t-text-secondary hover:bg-t-surface-hover hover:text-t-text'
              }`}
              aria-current={tab === n.key ? 'page' : undefined}
            >
              <span className="w-6 flex items-center justify-center">{renderIcon(n.key, tab === n.key, 20)}</span>
              <span className={`text-body-sm ${tab === n.key ? 'font-bold' : 'font-medium'}`}>
                {getLabel(n.labelKey)}
              </span>
            </button>
          ))}
        </div>

        {/* Logout */}
        <div className="mt-4 px-1">
          <button
            onClick={handleLogout}
            className="w-full rounded-xl py-2.5 px-3 flex items-center gap-2 cursor-pointer
              bg-[var(--t-danger-light)] text-t-danger border border-t-danger/15
              hover:bg-t-danger/15 active:scale-[0.97] transition-all duration-150"
          >
            <SignOut size={18} weight="fill" />
            <span className="text-body-sm font-medium">{ui.logout || 'Logout'}</span>
          </button>
        </div>
      </nav>

      {/* ── Main Content Area ── */}
      <main className="tab-content">
        <div key={tab} className="tab-fade-in h-full flex flex-col min-h-0">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
        {PRIMARY_NAV_ITEMS.map(n => (
          <button
            key={n.key}
            onClick={() => setTab(n.key)}
            className={`flex-1 h-14 flex flex-col items-center justify-center gap-0.5 py-0 px-1 bg-transparent border-none cursor-pointer transition-colors duration-150 ${
              tab === n.key ? 'text-t-primary nav-active' : 'text-t-text-muted'
            }`}
            aria-label={getLabel(n.labelKey)}
            aria-current={tab === n.key ? 'page' : undefined}
          >
            <span className="leading-none">{renderIcon(n.key, tab === n.key, 22)}</span>
            <span className={`text-[10px] leading-tight mt-0.5 max-w-[56px] text-center truncate ${tab === n.key ? 'font-bold' : 'font-medium'}`}>
              {getLabel(n.labelKey)}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default DashboardLayout
