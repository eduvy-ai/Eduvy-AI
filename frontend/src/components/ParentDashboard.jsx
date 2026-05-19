import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { apiGetParentView } from '../api.js'

// Standalone color tokens — no import from App.jsx (public page, no auth)
const C = {
  bg:     '#04040e',
  card:   '#0b0b1c',
  card2:  '#101022',
  border: '#ffffff08',
  green:  '#00E5A0',
  yellow: '#FFD166',
  red:    '#FF6B6B',
  blue:   '#7B9CFF',
  orange: '#FF6B35',
  text:   '#eeeeff',
  muted:  '#6868a0',
}

const PLAN_INFO = {
  free:    { label: 'Free',    icon: '🆓', color: '#6868a0' },
  basic:   { label: 'Basic',   icon: '⭐', color: '#FFD166' },
  pro:     { label: 'Pro',     icon: '🚀', color: '#7B9CFF' },
  premium: { label: 'Premium', icon: '👑', color: '#00E5A0' },
}

// ── Helpers ────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: '16px 18px', ...style,
    }}>
      {children}
    </div>
  )
}

function SectionTitle({ icon, title }) {
  return (
    <h3 style={{ color: C.text, fontSize: 15, fontWeight: 800, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span>{icon}</span>{title}
    </h3>
  )
}

function StatBox({ label, value, color = C.text, icon }) {
  return (
    <div style={{
      background: C.card2, borderRadius: 12, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 4, flex: 1,
    }}>
      {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
      <div style={{ color, fontSize: 22, fontWeight: 900 }}>{value}</div>
      <div style={{ color: C.muted, fontSize: 11 }}>{label}</div>
    </div>
  )
}

function MasteryBar({ subject, score }) {
  const color = score >= 75 ? C.green : score >= 50 ? C.yellow : C.red
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: C.text, fontSize: 13 }}>{subject}</span>
        <span style={{ color, fontSize: 13, fontWeight: 700 }}>{score}%</span>
      </div>
      <div style={{ background: C.card2, borderRadius: 4, height: 8 }}>
        <div style={{
          background: color, height: 8, borderRadius: 4,
          width: `${score}%`, transition: 'width .6s ease',
        }} />
      </div>
    </div>
  )
}

function ActivityDots({ activity }) {
  // Show last 7 days, fill in missing days
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const match = activity.find(a => a.day === key)
    days.push({ key, quizzes: match?.quizzes || 0, day: d.toLocaleDateString('en', { weekday: 'short' }) })
  }
  const max = Math.max(...days.map(d => d.quizzes), 1)
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 60 }}>
      {days.map(d => (
        <div key={d.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: '100%', borderRadius: 4,
            background: d.quizzes > 0 ? C.green : C.card2,
            opacity: d.quizzes > 0 ? 0.4 + 0.6 * (d.quizzes / max) : 1,
            height: `${Math.max(8, (d.quizzes / max) * 44)}px`,
          }} />
          <span style={{ color: C.muted, fontSize: 10 }}>{d.day}</span>
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
      <div style={{
        minHeight: '100vh', background: C.bg, display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16,
        fontFamily: 'Sora, sans-serif',
      }}>
        <div style={{ fontSize: 48 }}>🎓</div>
        <p style={{ color: C.muted, fontSize: 14 }}>Loading dashboard…</p>
      </div>
    )
  }

  if (err) {
    return (
      <div style={{
        minHeight: '100vh', background: C.bg, display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16,
        fontFamily: 'Sora, sans-serif', padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 56 }}>🔒</div>
        <h2 style={{ color: C.text, margin: 0 }}>Link Not Found</h2>
        <p style={{ color: C.muted, fontSize: 14, maxWidth: 380 }}>{err}</p>
        <div style={{ color: C.muted, fontSize: 12 }}>Powered by Eduvy-AI</div>
      </div>
    )
  }

  const { profile, ai_today, monthly_calls, mastery, quizzes, bhool, muqabla, activity } = data
  const planInfo = PLAN_INFO[profile.plan] || PLAN_INFO.free
  const avgQuizScore = quizzes.length
    ? Math.round(quizzes.reduce((a, q) => a + (q.correct / q.total) * 100, 0) / quizzes.length)
    : null

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      fontFamily: 'Sora, sans-serif', color: C.text,
      padding: '0 0 48px',
    }}>
      {/* ── Header ── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.card} 0%, #0e0e28 100%)`,
        borderBottom: `1px solid ${C.border}`,
        padding: '24px 20px 20px',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 28 }}>🎓</span>
            <span style={{ fontWeight: 900, fontSize: 18, color: C.green }}>Eduvy-AI</span>
            <span style={{
              marginLeft: 'auto', background: `${C.muted}22`,
              border: `1px solid ${C.border}`, color: C.muted,
              borderRadius: 10, padding: '3px 10px', fontSize: 11,
            }}>👨‍👩‍👦 Parent View • Read Only</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Avatar */}
            <div style={{
              width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
              background: `hsl(${((profile.name?.charCodeAt(0) || 65) * 37) % 360},55%,30%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 900, border: `3px solid ${C.green}44`,
            }}>{profile.name?.charAt(0)?.toUpperCase() || '?'}</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{profile.name}</h1>
              <div style={{ color: C.muted, fontSize: 13, marginTop: 3 }}>
                {profile.standard} · {profile.board}
                {profile.school && ` · ${profile.school}`}
              </div>
              <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                <span style={{
                  background: `${planInfo.color}20`, border: `1px solid ${planInfo.color}40`,
                  color: planInfo.color, fontSize: 11, borderRadius: 10, padding: '2px 8px', fontWeight: 700,
                }}>{planInfo.icon} {planInfo.label}</span>
                <span style={{
                  background: `${C.yellow}15`, border: `1px solid ${C.yellow}30`,
                  color: C.yellow, fontSize: 11, borderRadius: 10, padding: '2px 8px', fontWeight: 700,
                }}>⚡ {profile.xp} XP</span>
                <span style={{
                  background: `${C.orange}15`, border: `1px solid ${C.orange}30`,
                  color: C.orange, fontSize: 11, borderRadius: 10, padding: '2px 8px', fontWeight: 700,
                }}>🔥 {profile.streak} day streak</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Activity 7-day ── */}
        <Card>
          <SectionTitle icon="📅" title="7-Day Activity" />
          <ActivityDots activity={activity} />
          <p style={{ color: C.muted, fontSize: 12, margin: '8px 0 0' }}>
            Quizzes attempted per day this week
          </p>
        </Card>

        {/* ── Quick stats ── */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <StatBox icon="🤖" label="AI Calls Today"  value={ai_today.call_count || 0} color={C.blue}   />
          <StatBox icon="📊" label="AI Calls (Month)" value={monthly_calls || 0}      color={C.blue}   />
          <StatBox icon="📝" label="Quizzes Taken"    value={quizzes.length}          color={C.yellow} />
          {avgQuizScore !== null && (
            <StatBox
              icon="🎯" label="Avg Quiz Score"
              value={`${avgQuizScore}%`}
              color={avgQuizScore >= 70 ? C.green : avgQuizScore >= 50 ? C.yellow : C.red}
            />
          )}
        </div>

        {/* ── Mastery ── */}
        {mastery.length > 0 && (
          <Card>
            <SectionTitle icon="🧠" title="Subject Mastery" />
            {/* Weak first */}
            {[...mastery].sort((a, b) => a.score - b.score).map(m => (
              <MasteryBar key={m.subject} subject={m.subject} score={m.score} />
            ))}
            <p style={{ color: C.muted, fontSize: 11, margin: '8px 0 0' }}>
              🔴 Below 50 = needs attention · 🟡 50–74 = improving · 🟢 75+ = strong
            </p>
          </Card>
        )}

        {/* ── Recent Quizzes ── */}
        {quizzes.length > 0 && (
          <Card>
            <SectionTitle icon="📝" title="Recent Quizzes" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {quizzes.map((q, i) => {
                const pct = Math.round((q.correct / q.total) * 100)
                const color = pct >= 70 ? C.green : pct >= 50 ? C.yellow : C.red
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: C.card2, borderRadius: 10, padding: '10px 12px',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: `${color}22`, border: `1px solid ${color}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 900, color, fontSize: 14,
                    }}>{pct}%</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{q.subject}</div>
                      <div style={{ color: C.muted, fontSize: 11 }}>
                        {q.correct}/{q.total} correct · {q.difficulty}
                      </div>
                    </div>
                    <div style={{ color: C.muted, fontSize: 11 }}>
                      {new Date(q.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* ── Bhool + Muqabla stats side by side ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Card>
            <SectionTitle icon="📛" title="Bhool Bazaar" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.muted, fontSize: 13 }}>Cards saved</span>
                <span style={{ color: C.text, fontWeight: 700 }}>{bhool.total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.muted, fontSize: 13 }}>Published</span>
                <span style={{ color: C.green, fontWeight: 700 }}>{bhool.published}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.muted, fontSize: 13 }}>Collected</span>
                <span style={{ color: C.blue, fontWeight: 700 }}>{bhool.collected}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.muted, fontSize: 13 }}>🪙 Coins</span>
                <span style={{ color: C.orange, fontWeight: 700 }}>{bhool.coins}</span>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle icon="⚔️" title="Muqabla" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.muted, fontSize: 13 }}>Battles</span>
                <span style={{ color: C.text, fontWeight: 700 }}>{muqabla.battles_played}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.muted, fontSize: 13 }}>Wins</span>
                <span style={{ color: C.green, fontWeight: 700 }}>{muqabla.battles_won}</span>
              </div>
              {muqabla.battles_played > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: C.muted, fontSize: 13 }}>Win rate</span>
                  <span style={{ color: C.yellow, fontWeight: 700 }}>
                    {Math.round((muqabla.battles_won / muqabla.battles_played) * 100)}%
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── Footer ── */}
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <div style={{ color: C.muted, fontSize: 11 }}>
            📋 Last updated: {new Date(data.fetched_at).toLocaleString()}
          </div>
          <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
            Powered by <span style={{ color: C.green, fontWeight: 700 }}>Eduvy-AI</span> · Read-only parent view
          </div>
          <div style={{ color: C.muted, fontSize: 10, marginTop: 6 }}>
            To revoke access, ask your child to go to Settings → Profile → Revoke Access
          </div>
        </div>
      </div>
    </div>
  )
}
