import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { apiGetParentView } from '../api.js'
import { GraduationCap, LockSimple, UsersThree, Lightning, Fire, CalendarBlank, Robot, ChartBar, Exam, Target, Brain, Circle, Warning, CoinVertical, Sword, ClipboardText, Gift, Star, RocketLaunch, Crown } from '@phosphor-icons/react'

// Standalone color tokens — no import from App.jsx (public page, no auth)
const C = {
  bg:     '#0D0D1F',
  card:   '#1A1A3A',
  card2:  '#202048',
  border: '#ffffff0d',
  green:  '#00F5A0',
  yellow: '#FBBF24',
  red:    '#FF5C5C',
  blue:   '#60A5FA',
  orange: '#F97316',
  text:   '#FFFFFF',
  muted:  '#7878A8',
}

const PLAN_INFO = {
  free:    { label: 'Free',    Icon: Gift,         color: '#7878A8' },
  basic:   { label: 'Basic',   Icon: Star,         color: '#FBBF24' },
  pro:     { label: 'Pro',     Icon: RocketLaunch, color: '#60A5FA' },
  premium: { label: 'Premium', Icon: Crown,        color: '#00F5A0' },
}

// ── Helpers ────────────────────────────────────────────────────
function Card({ children, className = '' }) {
  return (
    <div className={`bg-app-card border border-app-border rounded-2xl py-4 px-[18px] ${className}`}>
      {children}
    </div>
  )
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <h3 className="text-app-text text-[15px] font-extrabold m-0 mb-3 flex items-center gap-2">
      {typeof Icon === 'function' ? <Icon size={18} weight="duotone" className="text-app-green" /> : <span>{Icon}</span>}{title}
    </h3>
  )
}

function StatBox({ label, value, color = C.text, icon: Icon }) {
  return (
    <div className="bg-app-card2 rounded-xl py-3 px-3.5 flex flex-col gap-1 flex-1">
      {Icon && (typeof Icon === 'function' ? <Icon size={20} weight="duotone" style={{ color }} /> : <span className="text-xl">{Icon}</span>)}
      <div className="text-[22px] font-black" style={{ color }}>{value}</div>
      <div className="text-app-muted text-[11px]">{label}</div>
    </div>
  )
}

function MasteryBar({ subject, score }) {
  const color = score >= 75 ? C.green : score >= 50 ? C.yellow : C.red
  return (
    <div className="mb-2.5">
      <div className="flex justify-between mb-1">
        <span className="text-app-text text-[13px]">{subject}</span>
        <span className="text-[13px] font-bold" style={{ color }}>{score}%</span>
      </div>
      <div className="bg-app-card2 rounded h-2">
        <div 
          className="h-2 rounded transition-[width] duration-500 ease-out"
          style={{ background: color, width: `${score}%` }}
        />
      </div>
    </div>
  )
}

function ActivityDots({ activity }) {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const match = activity.find(a => a.day === key)
    days.push({ key, quizzes: match?.quizzes || 0, day: d.toLocaleDateString('en', { weekday: 'short' }) })
  }
  const max = Math.max(...days.map(d => d.quizzes), 1)
  return (
    <div className="flex gap-1.5 items-end h-[60px]">
      {days.map(d => (
        <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
          <div 
            className="w-full rounded"
            style={{
              background: d.quizzes > 0 ? C.green : C.card2,
              opacity: d.quizzes > 0 ? 0.4 + 0.6 * (d.quizzes / max) : 1,
              height: `${Math.max(8, (d.quizzes / max) * 44)}px`,
            }}
          />
          <span className="text-app-muted text-[10px]">{d.day}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────
export default function ParentDashboard() {
  const { pin } = useParams()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState('')

  useEffect(() => {
    if (!pin) return
    setLoading(true)
    apiGetParentView(pin)
      .then(d => { setData(d); setLoading(false) })
      .catch(e => {
        setErr(e.message.includes('404')
          ? 'This link is invalid or has expired. Ask your child to generate a new one.'
          : 'Could not load dashboard. Please try again.')
        setLoading(false)
      })
  }, [pin])

  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center flex-col gap-4 font-[Sora,sans-serif]">
        <div className="flex justify-center"><GraduationCap size={48} weight="duotone" className="text-app-green" /></div>
        <p className="text-app-muted text-sm">Loading dashboard…</p>
      </div>
    )
  }

  if (err) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center flex-col gap-4 font-[Sora,sans-serif] p-6 text-center">
        <div className="flex justify-center"><LockSimple size={56} weight="duotone" className="text-app-muted" /></div>
        <h2 className="text-app-text m-0">Link Not Found</h2>
        <p className="text-app-muted text-sm max-w-[380px]">{err}</p>
        <div className="text-app-muted text-xs">Powered by Eduvy-AI</div>
      </div>
    )
  }

  const { profile, ai_today, monthly_calls, mastery, quizzes, bhool, muqabla, activity } = data
  const planInfo = PLAN_INFO[profile.plan] || PLAN_INFO.free
  const avgQuizScore = quizzes.length
    ? Math.round(quizzes.reduce((a, q) => a + (q.correct / q.total) * 100, 0) / quizzes.length)
    : null

  return (
    <div className="min-h-screen bg-app-bg font-[Sora,sans-serif] text-app-text pb-12">
      {/* ── Header ── */}
      <div 
        className="border-b border-app-border py-5 px-5"
        style={{ background: `linear-gradient(135deg, ${C.card} 0%, #0e0e28 100%)` }}
      >
        <div className="max-w-[720px] mx-auto">
          <div className="flex items-center gap-2.5 mb-4">
            <GraduationCap size={28} weight="duotone" className="text-app-green" />
            <span className="font-black text-lg text-app-green">Eduvy-AI</span>
            <span className="ml-auto bg-app-muted/15 border border-app-border text-app-muted rounded-[10px] py-0.5 px-2.5 text-[11px]">
              <UsersThree size={12} weight="fill" className="inline" /> Parent View • Read Only
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Avatar */}
            <div 
              className="w-[60px] h-[60px] rounded-full shrink-0 flex items-center justify-center text-2xl font-black"
              style={{ 
                background: `hsl(${((profile.name?.charCodeAt(0) || 65) * 37) % 360},55%,30%)`,
                border: `3px solid ${C.green}44` 
              }}
            >{profile.name?.charAt(0)?.toUpperCase() || '?'}</div>
            <div>
              <h1 className="m-0 text-[22px] font-black">{profile.name}</h1>
              <div className="text-app-muted text-[13px] mt-0.5">
                {profile.standard} · {profile.board}
                {profile.school && ` · ${profile.school}`}
              </div>
              <div className="mt-1.5 flex gap-1.5">
                <span 
                  className="text-[11px] rounded-[10px] py-0.5 px-2 font-bold"
                  style={{ background: `${planInfo.color}20`, border: `1px solid ${planInfo.color}40`, color: planInfo.color }}
                >{planInfo.Icon && <planInfo.Icon size={11} weight="fill" className="inline" />} {planInfo.label}</span>
                <span className="bg-app-yellow/10 border border-app-yellow/20 text-app-yellow text-[11px] rounded-[10px] py-0.5 px-2 font-bold flex items-center gap-0.5">
                  <Lightning size={11} weight="fill" /> {profile.xp} XP
                </span>
                <span className="bg-app-orange/10 border border-app-orange/20 text-app-orange text-[11px] rounded-[10px] py-0.5 px-2 font-bold flex items-center gap-0.5">
                  <Fire size={11} weight="fill" /> {profile.streak} day streak
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-[720px] mx-auto py-5 px-4 flex flex-col gap-4">

        {/* ── Activity 7-day ── */}
        <Card>
          <SectionTitle icon={CalendarBlank} title="7-Day Activity" />
          <ActivityDots activity={activity} />
          <p className="text-app-muted text-xs mt-2 m-0">
            Quizzes attempted per day this week
          </p>
        </Card>

        {/* ── Quick stats ── */}
        <div className="flex gap-2.5 flex-wrap">
          <StatBox icon={Robot} label="AI Calls Today"  value={ai_today.call_count || 0} color={C.blue}   />
          <StatBox icon={ChartBar} label="AI Calls (Month)" value={monthly_calls || 0}      color={C.blue}   />
          <StatBox icon={Exam} label="Quizzes Taken"    value={quizzes.length}          color={C.yellow} />
          {avgQuizScore !== null && (
            <StatBox
              icon={Target} label="Avg Quiz Score"
              value={`${avgQuizScore}%`}
              color={avgQuizScore >= 70 ? C.green : avgQuizScore >= 50 ? C.yellow : C.red}
            />
          )}
        </div>

        {/* ── Mastery ── */}
        {mastery.length > 0 && (
          <Card>
            <SectionTitle icon={Brain} title="Subject Mastery" />
            {[...mastery].sort((a, b) => a.score - b.score).map(m => (
              <MasteryBar key={m.subject} subject={m.subject} score={m.score} />
            ))}
            <p className="text-app-muted text-[11px] mt-2 m-0 flex items-center gap-1 flex-wrap">
              <Circle size={10} weight="fill" className="text-app-red" /> Below 50 = needs attention · <Circle size={10} weight="fill" className="text-app-yellow" /> 50–74 = improving · <Circle size={10} weight="fill" className="text-app-green" /> 75+ = strong
            </p>
          </Card>
        )}

        {/* ── Recent Quizzes ── */}
        {quizzes.length > 0 && (
          <Card>
            <SectionTitle icon={Exam} title="Recent Quizzes" />
            <div className="flex flex-col gap-2">
              {quizzes.map((q, i) => {
                const pct = Math.round((q.correct / q.total) * 100)
                const color = pct >= 70 ? C.green : pct >= 50 ? C.yellow : C.red
                return (
                  <div key={i} className="flex items-center gap-3 bg-app-card2 rounded-[10px] py-2.5 px-3">
                    <div 
                      className="w-10 h-10 rounded-[10px] shrink-0 flex items-center justify-center font-black text-sm"
                      style={{ background: `${color}22`, border: `1px solid ${color}44`, color }}
                    >{pct}%</div>
                    <div className="flex-1">
                      <div className="text-app-text text-[13px] font-semibold">{q.subject}</div>
                      <div className="text-app-muted text-[11px]">
                        {q.correct}/{q.total} correct · {q.difficulty}
                      </div>
                    </div>
                    <div className="text-app-muted text-[11px]">
                      {new Date(q.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* ── Mistakes + Battles stats side by side ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card>
            <SectionTitle icon={Warning} title="Mistake Cards" />
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-app-muted text-[13px]">Cards saved</span>
                <span className="text-app-text font-bold">{bhool.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-app-muted text-[13px]">Published</span>
                <span className="text-app-green font-bold">{bhool.published}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-app-muted text-[13px]">Collected</span>
                <span className="text-app-blue font-bold">{bhool.collected}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-app-muted text-[13px] flex items-center gap-0.5"><CoinVertical size={12} weight="fill" /> Coins</span>
                <span className="text-app-orange font-bold">{bhool.coins}</span>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle icon={Sword} title="Battles" />
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-app-muted text-[13px]">Battles</span>
                <span className="text-app-text font-bold">{muqabla.battles_played}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-app-muted text-[13px]">Wins</span>
                <span className="text-app-green font-bold">{muqabla.battles_won}</span>
              </div>
              {muqabla.battles_played > 0 && (
                <div className="flex justify-between">
                  <span className="text-app-muted text-[13px]">Win rate</span>
                  <span className="text-app-yellow font-bold">
                    {Math.round((muqabla.battles_won / muqabla.battles_played) * 100)}%
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── Footer ── */}
        <div className="text-center pt-2">
          <div className="text-app-muted text-[11px] flex items-center justify-center gap-1">
            <ClipboardText size={11} weight="fill" /> Last updated: {new Date(data.fetched_at).toLocaleString()}
          </div>
          <div className="text-app-muted text-[11px] mt-1">
            Powered by <span className="text-app-green font-bold">Eduvy-AI</span> · Read-only parent view
          </div>
          <div className="text-app-muted text-[10px] mt-1.5">
            To revoke access, ask your child to go to Settings → Profile → Revoke Access
          </div>
        </div>
      </div>
    </div>
  )
}
