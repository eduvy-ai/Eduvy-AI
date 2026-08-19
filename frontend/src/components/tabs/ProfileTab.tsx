/**
 * Profile Tab
 * User profile hub with settings, stats, and quick links.
 * Part of the 5-tab navigation redesign.
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
  MonitorPlay,
} from '@phosphor-icons/react'
import Loader from '@/shared/components/Loader'

// Lazy load SettingsModal
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
    className="w-full bg-app-card border border-white/[0.04] rounded-xl p-3.5
              hover:border-white/[0.08] transition-all active:scale-[0.99] text-left
              flex items-center gap-3"
  >
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}18`, border: `1.5px solid ${color}40` }}
    >
      <Icon size={20} weight="duotone" style={{ color }} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-bold text-app-text">{label}</span>
        {badge && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: `${color}20`, color }}
          >
            {badge}
          </span>
        )}
      </div>
      {description && (
        <p className="text-[11px] text-app-muted line-clamp-1">{description}</p>
      )}
    </div>
    <CaretRight size={16} className="text-app-muted flex-shrink-0" />
  </button>
)

interface StatItemProps {
  icon: React.ComponentType<any>
  value: string | number
  label: string
  color: string
}

const StatItem: React.FC<StatItemProps> = ({ icon: Icon, value, label, color }) => (
  <div className="flex-1 bg-app-card border border-white/[0.04] rounded-xl p-3 text-center">
    <Icon size={18} weight="duotone" className="mx-auto mb-1" style={{ color }} />
    <div className="text-[16px] font-bold text-app-text">{value}</div>
    <div className="text-[10px] text-app-muted">{label}</div>
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
  const goToLearnTV = () => navigate('/app/learntv')

  return (
    <div className="min-h-screen bg-app-bg p-4 pb-24 md:p-6 lg:p-8">
      {/* User Card */}
      <div className="bg-app-card border border-white/[0.04] rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-app-green/15 border border-app-green/25 flex items-center justify-center">
            <span className="text-2xl font-black text-app-green">
              {(user?.name || 'S').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[18px] font-bold text-app-text truncate">
              {user?.name || 'Student'}
            </h1>
            <p className="text-[13px] text-app-muted">
              {(user as any)?.standard} · {(user as any)?.board} · {(user as any)?.language}
            </p>
            {(user as any)?.school && (
              <p className="text-[12px] text-app-blue mt-0.5">
                🏫 {(user as any).school}
              </p>
            )}
            {!(user as any)?.school_id && (
              <div
                className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full"
                style={{ background: `${planInfo.color}15`, border: `1px solid ${planInfo.color}40` }}
              >
                <span className="text-sm">{planInfo.icon}</span>
                <span className="text-[11px] font-bold" style={{ color: planInfo.color }}>
                  {planInfo.label} Plan
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Stats Row */}
        <div className="flex gap-2.5">
          <StatItem icon={Lightning} value={(user as any)?.xp || 0} label={ui.xpLabel || 'XP'} color="#FFD166" />
          <StatItem icon={Fire} value={(user as any)?.streak || 0} label={ui.streak || 'Streak'} color="#FF6B35" />
          <StatItem icon={Medal} value={(user as any)?.battle_wins || 0} label={ui.wins || 'Wins'} color="#7B9CFF" />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-5">
        <h2 className="text-[14px] font-bold text-app-text mb-3">
          {ui.quickActions || 'Quick Actions'}
        </h2>
        <div className="space-y-2.5">
          <QuickLinkCard
            icon={GearSix}
            label={ui.settings || 'Settings'}
            description={ui.settingsDesc || 'Profile, language, AI usage'}
            color="#7B9CFF"
            onClick={() => setShowSettings(true)}
          />
        </div>
      </div>

      {/* More Features */}
      <div className="mb-5">
        <h2 className="text-[14px] font-bold text-app-text mb-3">
          {ui.moreFeatures || 'More Features'}
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          <QuickLinkCard
            icon={Notebook}
            label={ui.notebook || 'Notebook'}
            color="#BB86FC"
            onClick={goToNotebook}
          />
          <QuickLinkCard
            icon={MonitorPlay}
            label={ui.learnTV || 'LearnTV'}
            color="#00E5A0"
            onClick={goToLearnTV}
          />
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full bg-app-red/10 border border-app-red/30 rounded-xl py-3.5 
                  flex items-center justify-center gap-2 hover:bg-app-red/20 
                  active:scale-[0.99] transition-all"
      >
        <SignOut size={20} weight="fill" className="text-app-red" />
        <span className="text-[14px] font-bold text-app-red">{ui.logout || 'Logout'}</span>
      </button>

      {/* Settings Modal */}
      {showSettings && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50">
            <Loader size="lg" />
            <p className="text-app-muted mt-3 text-sm">Loading...</p>
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
