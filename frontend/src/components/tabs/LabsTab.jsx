import { useState } from 'react'
import { PLANS, planHasLab, getDisplayLang } from '../../shared.js'
import { li } from '../../i18n/index.js'
import PodcastLab from '../labs/PodcastLab.jsx'
import QuizLab from '../labs/QuizLab.jsx'
import EssayLab from '../labs/EssayLab.jsx'
import MentalLab from '../labs/MentalLab.jsx'
import ExaminerLab from '../labs/ExaminerLab.jsx'
import SamjhaoLab from '../labs/SamjhaoLab.jsx'

const getLabs = (ui) => [
  { key: "examiner", icon: "🎯", label: ui.marksHunter,    desc: ui.examinerLabDesc, color: "#FFD166" },
  { key: "samjhao",  icon: "🧪", label: ui.samjhao,        desc: ui.samjhaoLabDesc,  color: "#7B9CFF" },
  { key: "quiz",     icon: "⚡", label: ui.quizArena,      desc: ui.quizLabDesc,     color: "#00E5A0" },
  { key: "podcast",  icon: "🎙️", label: ui.aiPodcast,      desc: ui.podcastLabDesc,  color: "#FF6B35" },
  { key: "essay",    icon: "✍️",  label: ui.essayWriter,    desc: ui.essayLabDesc,    color: "#FF6B6B" },
  { key: "mental",   icon: "🧘", label: ui.wellnessCoach,   desc: ui.mentalLabDesc,   color: "#00E5A0" },
]

export default function LabsTab(props) {
  const [activeLab, setActiveLab] = useState(null)
  const userPlan = props.profile?.plan || 'free'
  const ui = li(getDisplayLang(props.profile))
  const LABS = getLabs(ui)

  if (activeLab === "podcast")  return <PodcastLab  {...props} onBack={() => setActiveLab(null)} />
  if (activeLab === "quiz")     return <QuizLab     {...props} onBack={() => setActiveLab(null)} />
  if (activeLab === "essay")    return <EssayLab    {...props} onBack={() => setActiveLab(null)} />
  if (activeLab === "mental")   return <MentalLab   {...props} onBack={() => setActiveLab(null)} />
  if (activeLab === "examiner") return <ExaminerLab {...props} onBack={() => setActiveLab(null)} />
  if (activeLab === "samjhao")  return <SamjhaoLab  {...props} onBack={() => setActiveLab(null)} />

  const availableLabs = LABS.filter(lab => planHasLab(userPlan, lab.key))
  const lockedLabs    = LABS.filter(lab => !planHasLab(userPlan, lab.key))

  const planOrder    = ['free', 'basic', 'pro', 'premium']
  const nextPlan     = planOrder.find(p => (PLANS[p]?.labs.length || 0) > (PLANS[userPlan]?.labs.length || 0))
  const nextPlanInfo = nextPlan ? PLANS[nextPlan] : null

  return (
    <div className="p-4 pb-6 md:p-6 lg:p-8">
      <h2 className="text-lg font-extrabold text-app-text mb-1">{ui.labsTitle}</h2>
      <p className="text-[13px] text-app-muted mb-5">{ui.labsSubtitle}</p>

      <div className="flex flex-col gap-3.5">
        {availableLabs.map(lab => (
          <button
            key={lab.key}
            onClick={() => setActiveLab(lab.key)}
            className="bg-app-card border border-app-border rounded-[18px] p-[18px] flex items-center gap-4 cursor-pointer text-left w-full hover:border-app-green/20 active:scale-[0.99] transition-all duration-150"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-[26px] shrink-0"
              style={{ background: `${lab.color}20`, border: `1.5px solid ${lab.color}40` }}
            >
              {lab.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-extrabold text-app-text mb-1">{lab.label}</div>
              <div className="text-xs text-app-muted leading-relaxed">{lab.desc}</div>
            </div>
            <span className="text-lg text-app-muted shrink-0">›</span>
          </button>
        ))}

        {lockedLabs.length > 0 && nextPlanInfo && (
          <>
            <div className="flex items-center gap-2.5 my-1">
              <div className="flex-1 h-px bg-app-border" />
              <span className="text-[11px] text-app-muted whitespace-nowrap font-semibold">
                {nextPlanInfo.icon} {ui.unlockWith} {nextPlanInfo.label} {ui.planLabel}
              </span>
              <div className="flex-1 h-px bg-app-border" />
            </div>
            {lockedLabs.map(lab => (
              <div
                key={lab.key}
                className="bg-app-card border border-app-border rounded-[18px] p-[18px] flex items-center gap-4 opacity-45 cursor-not-allowed"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-[26px] shrink-0"
                  style={{ background: `${lab.color}10`, border: `1.5px solid ${lab.color}20` }}
                >
                  {lab.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-extrabold text-app-muted mb-1">{lab.label}</div>
                  <div className="text-xs text-app-muted leading-relaxed">{lab.desc}</div>
                </div>
                <span className="text-sm text-app-muted shrink-0">🔒</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

