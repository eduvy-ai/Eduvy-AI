import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PLANS, planHasLab, getDisplayLang } from '../../shared.js'
import { li } from '../../i18n/index.js'
import { Target, Flask, Lightning, Microphone, PencilLine, Flower, Lock, CaretLeft } from '@phosphor-icons/react'
import PodcastLab from '../labs/PodcastLab.jsx'
import QuizLab from '../labs/QuizLab.jsx'
import EssayLab from '../labs/EssayLab.jsx'
import MentalLab from '../labs/MentalLab.jsx'
import ExaminerLab from '../labs/ExaminerLab.jsx'
import SamjhaoLab from '../labs/SamjhaoLab.jsx'

const LAB_ICONS = {
  examiner: Target,
  samjhao: Flask,
  quiz: Lightning,
  podcast: Microphone,
  essay: PencilLine,
  mental: Flower,
}

const getLabs = (ui) => [
  { key: "examiner", label: ui.marksHunter,    desc: ui.examinerLabDesc, color: "#FBBF24" },
  { key: "samjhao",  label: ui.samjhao,        desc: ui.samjhaoLabDesc,  color: "#60A5FA" },
  { key: "quiz",     label: ui.quizArena,      desc: ui.quizLabDesc,     color: "#00F5A0" },
  { key: "podcast",  label: ui.aiPodcast,      desc: ui.podcastLabDesc,  color: "#F97316" },
  { key: "essay",    label: ui.essayWriter,    desc: ui.essayLabDesc,    color: "#FF5C5C" },
  { key: "mental",   label: ui.wellnessCoach,   desc: ui.mentalLabDesc,   color: "#00F5A0" },
]

export default function LabsTab(props) {
  const navigate = useNavigate()
  // Support initial lab from navigation state (e.g., from Practice tab)
  const [activeLab, setActiveLab] = useState(props.initialLab || null)
  // Track if we came from Practice tab (to know where back should go)
  const cameFromPractice = !!props.initialLab
  const userPlan = props.profile?.plan || 'free'
  const ui = li(getDisplayLang(props.profile))
  const LABS = getLabs(ui)

  // Back handler: if came from Practice, go back there; otherwise show labs list
  const handleLabBack = () => {
    if (cameFromPractice) {
      navigate('/app/practice')
    } else {
      setActiveLab(null)
    }
  }

  if (activeLab === "podcast")  return <PodcastLab  {...props} onBack={handleLabBack} />
  if (activeLab === "quiz")     return <QuizLab     {...props} onBack={handleLabBack} />
  if (activeLab === "essay")    return <EssayLab    {...props} onBack={handleLabBack} />
  if (activeLab === "mental")   return <MentalLab   {...props} onBack={handleLabBack} />
  if (activeLab === "examiner") return <ExaminerLab {...props} onBack={handleLabBack} />
  if (activeLab === "samjhao")  return <SamjhaoLab  {...props} onBack={handleLabBack} />

  const availableLabs = LABS.filter(lab => planHasLab(userPlan, lab.key))
  const lockedLabs    = LABS.filter(lab => !planHasLab(userPlan, lab.key))

  const planOrder    = ['free', 'basic', 'pro', 'premium']
  const nextPlan     = planOrder.find(p => (PLANS[p]?.labs.length || 0) > (PLANS[userPlan]?.labs.length || 0))
  const nextPlanInfo = nextPlan ? PLANS[nextPlan] : null

  return (
    <div className="p-4 pb-6 md:p-6 lg:p-8">
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/app/practice')}
          className="w-9 h-9 rounded-xl bg-app-card border border-app-border flex items-center justify-center cursor-pointer hover:border-app-green/30 active:scale-95 transition-all">
          <CaretLeft size={18} weight="bold" className="text-app-text" />
        </button>
        <div>
          <h2 className="text-lg font-extrabold text-app-text mb-0">{ui.labsTitle}</h2>
          <p className="text-[12px] text-app-muted mt-0.5 mb-0">{ui.labsSubtitle}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        {availableLabs.map(lab => (
          <button
            key={lab.key}
            onClick={() => setActiveLab(lab.key)}
            className="bg-app-card border border-app-border rounded-[18px] p-[18px] flex items-center gap-4 cursor-pointer text-left w-full hover:border-app-green/20 active:scale-[0.99] transition-all duration-150"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: `${lab.color}20`, border: `1.5px solid ${lab.color}40` }}
            >
              {(() => { const Icon = LAB_ICONS[lab.key]; return Icon ? <Icon size={26} weight="duotone" color={lab.color} /> : null })()}
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
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: `${lab.color}10`, border: `1.5px solid ${lab.color}20` }}
                >
                  {(() => { const Icon = LAB_ICONS[lab.key]; return Icon ? <Icon size={26} weight="duotone" color={lab.color} /> : null })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-extrabold text-app-muted mb-1">{lab.label}</div>
                  <div className="text-xs text-app-muted leading-relaxed">{lab.desc}</div>
                </div>
                <Lock size={16} weight="fill" className="text-app-muted shrink-0" />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

