/**
 * Profile Tab — redesigned with design system tokens
 */

import React, { useState, useMemo, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth'
import { PLANS } from '@/shared/constants/plans'
import { getDisplayLang } from '@/shared.js'
import { apiUpdateProfile } from '@/api.js'
import { li } from '@/i18n/index.js'
import {
  GearSix,
  SignOut,
  Lightning,
  Fire,
  CaretRight,
  Medal,
  Notebook,
  FilmSlate,
  MonitorPlay,
  Moon,
  Sun,
} from '@phosphor-icons/react'
import { Loader, Avatar, Badge, Card } from '@/shared/components'
import { useTheme } from '@/shared/hooks'

const SettingsModal = lazy(() => import('@/components/SettingsModal.jsx'))

interface QuickLinkProps {
  icon: React.ComponentType<any>
  label: string
  description?: string
  color: string
  onClick: () => void
  badge?: string
}

const QuickLinkCard: React.FC<QuickLinkProps> = ({
  icon: Icon,
  label,
  description,
  color,
  onClick,
  badge,
}) => (
  <button
    onClick={onClick}
    className="w-full bg-t-surface border border-t-border rounded-xl p-3.5
              hover:border-t-border-strong transition-all active:scale-[0.98] text-left
              flex items-center gap-3 shadow-soft-sm"
  >
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}14` }}
    >
      <Icon size={20} weight="duotone" style={{ color }} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-body-sm font-semibold text-t-text">{label}</span>
        {badge && (
          <span
            className="text-micro font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: `${color}18`, color }}
          >
            {badge}
          </span>
        )}
      </div>
      {description && (
        <p className="text-caption text-t-text-muted line-clamp-1">{description}</p>
      )}
    </div>
    <CaretRight size={16} className="text-t-text-muted flex-shrink-0" />
  </button>
)

interface StatItemProps {
  icon: React.ComponentType<any>
  value: string | number
  label: string
  color: string
}

const StatItem: React.FC<StatItemProps> = ({ icon: Icon, value, label, color }) => (
  <div className="flex-1 bg-t-surface border border-t-border rounded-xl p-3 text-center shadow-soft-sm">
    <Icon size={18} weight="duotone" className="mx-auto mb-1" style={{ color }} />
    <div className="text-h3 font-bold text-t-text">{value}</div>
    <div className="text-micro text-t-text-muted">{label}</div>
  </div>
)

const ProfileTab: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout, refresh } = useAuth()
  
  const [showSettings, setShowSettings] = useState(false)
  
  const lang = getDisplayLang(user)
  const ui = useMemo(() => li(lang), [lang])
  
  const userPlan = (user as any)?.plan || 'free'
  const planInfo = PLANS[userPlan as keyof typeof PLANS] || PLANS.free
  
  const handleLogout = () => {
    logout()
    navigate('/auth')
  }
  
  const handleProfileSave = async (updates: Record<string, unknown>) => {
    if (!user?.id) return
    try {
      await apiUpdateProfile(user.id, updates)
      await refresh()
    } catch (e) {
      console.error('Failed to update profile:', e)
      throw e
    }
  }

  // Navigate to secondary features (not in bottom nav)
  const goToNotebook = () => navigate('/app/notebook')
  const goToVideos = () => navigate('/app/videos')
  const goToLearnTV = () => navigate('/app/learntv')

  const { toggle: toggleTheme, isDark } = useTheme()

  return (
    <div className="min-h-screen bg-t-bg p-4 pb-24 md:p-6 lg:p-8">
      {/* User Card */}
      <Card variant="elevated" padding="lg" className="mb-5">
        <div className="flex items-center gap-4 mb-5">
          <Avatar name={user?.name} size="xl" />
          <div className="flex-1 min-w-0">
            <h1 className="text-h2 text-t-text truncate">
              {user?.name || 'Student'}
            </h1>
            <p className="text-caption text-t-text-secondary mt-0.5">
              {(user as any)?.standard} · {(user as any)?.board} · {(user as any)?.language}
            </p>
            <Badge variant="primary" dot className="mt-2">
              {planInfo.icon} {planInfo.label} Plan
            </Badge>
          </div>
        </div>
        
        {/* Stats Row */}
        <div className="flex gap-2.5">
          <StatItem icon={Lightning} value={(user as any)?.xp || 0} label={ui.xpLabel || 'XP'} color="var(--t-warning)" />
          <StatItem icon={Fire} value={(user as any)?.streak || 0} label={ui.streak || 'Streak'} color="#F97316" />
          <StatItem icon={Medal} value={(user as any)?.battle_wins || 0} label={ui.wins || 'Wins'} color="var(--t-info)" />
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="mb-5">
        <h2 className="text-body-sm font-bold text-t-text mb-3">
          {ui.quickActions || 'Quick Actions'}
        </h2>
        <div className="space-y-2.5">
          <QuickLinkCard
            icon={GearSix}
            label={ui.settings || 'Settings'}
            description={ui.settingsDesc || 'Profile, language, AI usage'}
            color="var(--t-info)"
            onClick={() => setShowSettings(true)}
          />
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full bg-t-surface border border-t-border rounded-xl p-3.5
              hover:border-t-border-strong transition-all active:scale-[0.98] text-left
              flex items-center gap-3 shadow-soft-sm"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-t-accent/10">
              {isDark ? <Moon size={20} weight="duotone" className="text-t-accent" /> : <Sun size={20} weight="duotone" className="text-t-amber" />}
            </div>
            <div className="flex-1">
              <span className="text-body-sm font-semibold text-t-text">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
              <p className="text-caption text-t-text-muted">Tap to switch theme</p>
            </div>
          </button>
        </div>
      </div>

      {/* More Features */}
      <div className="mb-5">
        <h2 className="text-body-sm font-bold text-t-text mb-3">
          {ui.moreFeatures || 'More Features'}
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          <QuickLinkCard
            icon={Notebook}
            label={ui.notebook || 'Notebook'}
            color="#8B5CF6"
            onClick={goToNotebook}
          />
          <QuickLinkCard
            icon={FilmSlate}
            label={ui.videos || 'Videos'}
            color="#F97316"
            onClick={goToVideos}
          />
          <QuickLinkCard
            icon={MonitorPlay}
            label={ui.learnTV || 'LearnTV'}
            color="var(--t-primary)"
            onClick={goToLearnTV}
          />
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full bg-[var(--t-danger-light)] border border-t-danger/20 rounded-xl py-3.5
                  flex items-center justify-center gap-2 hover:bg-t-danger/15
                  active:scale-[0.98] transition-all"
      >
        <SignOut size={20} weight="fill" className="text-t-danger" />
        <span className="text-body-sm font-bold text-t-danger">{ui.logout || 'Logout'}</span>
      </button>

      {/* Settings Modal */}
      {showSettings && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-[var(--t-overlay)] flex items-center justify-center z-50">
            <Loader size="lg" />
          </div>
        }>
          <SettingsModal
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

export default ProfileTab
