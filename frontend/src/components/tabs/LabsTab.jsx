import { useState } from 'react'
import { COLORS, PLANS, planHasLab } from '../../App.jsx'
import PodcastLab from '../labs/PodcastLab.jsx'
import QuizLab from '../labs/QuizLab.jsx'
import EssayLab from '../labs/EssayLab.jsx'
import MentalLab from '../labs/MentalLab.jsx'
import ExaminerLab from '../labs/ExaminerLab.jsx'
import SamjhaoLab from '../labs/SamjhaoLab.jsx'

const LABS = [
  { key: "examiner", icon: "🎯", label: "Marks Hunter",          desc: "AI grades your written answer exactly like a real board examiner — keyword by keyword", color: "#FFD166" },
  { key: "samjhao",  icon: "🧪", label: "Samjhao Mode",          desc: "Explain any concept in your own words — get your Feynman Score and patch gaps instantly", color: "#7B9CFF" },
  { key: "quiz",     icon: "⚡", label: "Quiz Arena",             desc: "Adaptive board-exam MCQ practice with instant explanations + Galti Doctor",             color: "#00E5A0" },
  { key: "podcast",  icon: "🎙️", label: "AI Podcast Studio",     desc: "Two AI hosts debate your syllabus topics like a real podcast",                          color: "#FF6B35" },
  { key: "essay",    icon: "✍️",  label: "Essay Grader",          desc: "AI board examiner grades your writing with detailed feedback",                          color: "#FF6B6B" },
  { key: "mental",   icon: "🧘", label: "Mental Wellness Coach",  desc: "Exam anxiety, motivation, burnout — your personal counselor",                          color: "#00E5A0" },
]

export default function LabsTab(props) {
  const [activeLab, setActiveLab] = useState(null)
  const userPlan = props.profile?.plan || 'free'

  if (activeLab === "podcast")  return <PodcastLab  {...props} onBack={() => setActiveLab(null)} />
  if (activeLab === "quiz")     return <QuizLab     {...props} onBack={() => setActiveLab(null)} />
  if (activeLab === "essay")    return <EssayLab    {...props} onBack={() => setActiveLab(null)} />
  if (activeLab === "mental")   return <MentalLab   {...props} onBack={() => setActiveLab(null)} />
  if (activeLab === "examiner") return <ExaminerLab {...props} onBack={() => setActiveLab(null)} />
  if (activeLab === "samjhao")  return <SamjhaoLab  {...props} onBack={() => setActiveLab(null)} />

  // Labs accessible to user's plan
  const availableLabs = LABS.filter(lab => planHasLab(userPlan, lab.key))
  // Labs locked for user's plan (shown grayed out with upgrade info)
  const lockedLabs = LABS.filter(lab => !planHasLab(userPlan, lab.key))

  // Find the next plan that unlocks more labs
  const planOrder = ['free', 'basic', 'pro', 'premium']
  const nextPlan = planOrder.find(p => (PLANS[p]?.labs.length || 0) > (PLANS[userPlan]?.labs.length || 0))
  const nextPlanInfo = nextPlan ? PLANS[nextPlan] : null

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: COLORS.text, marginBottom: 4 }}>⚗️ Labs</h2>
      <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 20 }}>
        AI-powered learning experiments
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {availableLabs.map(lab => (
          <button
            key={lab.key}
            onClick={() => setActiveLab(lab.key)}
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 18,
              padding: 18,
              display: "flex",
              alignItems: "center",
              gap: 16,
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "Sora, sans-serif",
              width: "100%",
            }}
          >
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: `${lab.color}20`,
              border: `1.5px solid ${lab.color}40`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              flexShrink: 0,
            }}>
              {lab.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.text, marginBottom: 4 }}>
                {lab.label}
              </div>
              <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.4 }}>
                {lab.desc}
              </div>
            </div>
            <span style={{ fontSize: 18, color: COLORS.muted, flexShrink: 0 }}>›</span>
          </button>
        ))}

        {lockedLabs.length > 0 && nextPlanInfo && (
          <>
            <div style={{
              display: "flex", alignItems: "center", gap: 10, margin: "8px 0 4px",
            }}>
              <div style={{ flex: 1, height: 1, background: COLORS.border }} />
              <span style={{ fontSize: 11, color: COLORS.muted, whiteSpace: "nowrap", fontWeight: 600 }}>
                {nextPlanInfo.icon} Unlock with {nextPlanInfo.label} Plan
              </span>
              <div style={{ flex: 1, height: 1, background: COLORS.border }} />
            </div>
            {lockedLabs.map(lab => (
              <div
                key={lab.key}
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 18,
                  padding: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  opacity: 0.45,
                  cursor: "not-allowed",
                }}
              >
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: `${lab.color}10`,
                  border: `1.5px solid ${lab.color}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  flexShrink: 0,
                }}>
                  {lab.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.muted, marginBottom: 4 }}>
                    {lab.label}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.4 }}>
                    {lab.desc}
                  </div>
                </div>
                <span style={{ fontSize: 14, color: COLORS.muted, flexShrink: 0 }}>🔒</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
