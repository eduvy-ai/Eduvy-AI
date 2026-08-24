/**
 * Practice Tab
 * Unified practice hub combining Quiz, Battles, and Mistake review.
 * Part of the 5-tab navigation redesign.
 */

import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '@/redux/store'
import { getDisplayLang, planHasLab } from '@/shared.js'
import { li } from '@/i18n/index.js'
import {
  Lightning,
  Sword,
  Warning,
  Target,
  CaretRight,
  Trophy,
  Sparkle,
  BookOpen,
  Fire,
} from '@phosphor-icons/react'

interface QuickActionProps {
  icon: React.ComponentType<any>
  label: string
  description: string
  color: string
  onClick: () => void
  badge?: string
}

const QuickActionCard: React.FC<QuickActionProps> = ({
  icon: Icon,
  label,
  description,
  color,
  onClick,
  badge,
}) => (
  <button
    onClick={onClick}
    className="w-full bg-app-card border border-white/[0.04] rounded-2xl p-4 
              hover:border-white/[0.08] transition-all active:scale-[0.99] text-left
              flex items-center gap-4"
  >
    <div
      className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}18`, border: `1.5px solid ${color}40` }}
    >
      <Icon size={26} weight="duotone" style={{ color }} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-[15px] font-bold text-app-text">{label}</span>
        {badge && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${color}20`, color }}
          >
            {badge}
          </span>
        )}
      </div>
      <p className="text-[12px] text-app-muted line-clamp-1">{description}</p>
    </div>
    <CaretRight size={18} className="text-app-muted flex-shrink-0" />
  </button>
)

interface StatCardProps {
  icon: React.ComponentType<any>
  value: string | number
  label: string
  color: string
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, value, label, color }) => (
  <div className="bg-app-card border border-white/[0.04] rounded-xl p-3 text-center">
    <Icon size={20} weight="duotone" className="mx-auto mb-1" style={{ color }} />
    <div className="text-[18px] font-bold text-app-text">{value}</div>
    <div className="text-[11px] text-app-muted">{label}</div>
  </div>
)

const PracticeTab: React.FC = () => {
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth.user)
  
  const lang = getDisplayLang(user)
  const ui = useMemo(() => li(lang), [lang])
  const userPlan = user?.plan || 'free'

  // Check if user has access to quiz lab
  const hasQuizAccess = planHasLab(userPlan, 'quiz')

  // Navigate to specific practice features
  const goToQuiz = () => navigate('/app/labs', { state: { openLab: 'quiz' } })
  const goToBattles = () => navigate('/app/battles')
  const goToMistakes = () => navigate('/app/mistakes')
  const goToExaminer = () => navigate('/app/labs', { state: { openLab: 'examiner' } })

  return (
    <div className="min-h-screen bg-app-bg p-4 pb-24 md:p-6 lg:p-8">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-[22px] font-extrabold text-app-text mb-1 flex items-center gap-2">
          <Lightning size={24} weight="duotone" className="text-app-green" />
          {ui.practiceTitle || 'Practice Hub'}
        </h1>
        <p className="text-[13px] text-app-muted">
          {ui.practiceSubtitle || 'Test your knowledge and improve your skills'}
        </p>
      </header>

      {/* Quick Stats — only show streak (real data from backend) */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard
          icon={Fire}
          value={(user as any)?.streak || 0}
          label={ui.streak || 'Streak'}
          color="#FF6B35"
        />
        <StatCard
          icon={Trophy}
          value={(user as any)?.xp || 0}
          label="XP"
          color="#FFD166"
        />
        <StatCard
          icon={BookOpen}
          value={Math.round((user as any)?.mastery_avg || 0)}
          label={ui.mastery || 'Mastery'}
          color="#00E5A0"
        />
      </div>

      {/* Practice Modes */}
      <div className="mb-6">
        <h2 className="text-[14px] font-bold text-app-text mb-3 flex items-center gap-2">
          <Sparkle size={16} weight="duotone" className="text-app-yellow" />
          {ui.practiceModesTitle || 'Practice Modes'}
        </h2>
        <div className="space-y-3">
          <QuickActionCard
            icon={Lightning}
            label={ui.quickQuiz || 'Quick Quiz'}
            description={ui.quickQuizDesc || 'AI-generated quiz on any topic'}
            color="#00E5A0"
            onClick={goToQuiz}
            badge={hasQuizAccess ? undefined : ui.proLabel || 'PRO'}
          />
          <QuickActionCard
            icon={Sword}
            label={ui.muqabalaBattle || 'Battle'}
            description={ui.battleDesc || '1v1 quiz battles with classmates'}
            color="#FF6B35"
            onClick={goToBattles}
          />
          <QuickActionCard
            icon={Warning}
            label={ui.bhoolReview || 'Mistake Review'}
            description={ui.bhoolDesc || 'Learn from your mistakes'}
            color="#FF6B6B"
            onClick={goToMistakes}
          />
          <QuickActionCard
            icon={Target}
            label={ui.mockExam || 'Mock Exam'}
            description={ui.mockExamDesc || 'Board exam style questions'}
            color="#FFD166"
            onClick={goToExaminer}
            badge={planHasLab(userPlan, 'examiner') ? undefined : ui.proLabel || 'PRO'}
          />
        </div>
      </div>
    </div>
  )
}

export default PracticeTab
