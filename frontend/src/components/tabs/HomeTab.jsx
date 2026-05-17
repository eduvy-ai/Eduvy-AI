import { useState, useEffect } from 'react'
import { COLORS, callAI, buildSystemPrompt, SUBS, getBhoolStats, parseAIObject } from '../../shared.js'
import { apiGetMastery } from '../../api.js'

// ── Bhool Curve stats (reads localStorage) ───────────────────
function useBhoolStats() {
  const [stats, setStats] = useState({ overdue: [], soon: [], fresh: [] })
  useEffect(() => {
    setStats(getBhoolStats())
  }, [])
  return stats
}

// Subject emoji map for visual flair
const SUB_ICONS = {
  Mathematics: "📐", Science: "🔬", Physics: "⚡", Chemistry: "🧪",
  Biology: "🌿", English: "📝", Hindi: "🇮🇳", History: "🏛️",
  Geography: "🌍", "Social Science": "🌐", "Social Studies": "🌐",
  Economics: "📊", Accountancy: "📒", "Business Studies": "💼",
  Computer: "💻", "Computer Science": "💻", IT: "💻", Sanskrit: "📜",
  EVS: "🌱", Drawing: "🎨", Punjabi: "📖",
}

function subIcon(sub) {
  for (const [key, icon] of Object.entries(SUB_ICONS)) {
    if (sub.toLowerCase().includes(key.toLowerCase())) return icon
  }
  return "📚"
}

function masteryColor(pct) {
  if (pct >= 75) return COLORS.green
  if (pct >= 45) return COLORS.yellow
  return COLORS.red
}

function masteryLabel(pct) {
  if (pct === 0)  return "Not started"
  if (pct >= 75) return "Mastered"
  if (pct >= 45) return "Learning"
  return "Needs Work"
}

// ── Quick action cards config ────────────────────────────────
const QUICK_ACTIONS = [
  { icon: "📖", label: "Smart Notes",    tab: "notebook", grad: "linear-gradient(135deg,#7B9CFF22,#7B9CFF08)", accent: "#7B9CFF" },
  { icon: "🤖", label: "AI Tutor",       tab: "tutor",    grad: "linear-gradient(135deg,#00E5A022,#00E5A008)", accent: "#00E5A0" },
  { icon: "🎯", label: "Take a Quiz",    tab: "labs",     grad: "linear-gradient(135deg,#FF6B6B22,#FF6B6B08)", accent: "#FF6B6B" },
  { icon: "🎙️", label: "AI Podcast",    tab: "labs",     grad: "linear-gradient(135deg,#FFD16622,#FFD16608)", accent: "#FFD166" },
  { icon: "🎬", label: "Find Videos",    tab: "videos",   grad: "linear-gradient(135deg,#FF6B3522,#FF6B3508)", accent: "#FF6B35" },
  { icon: "🧘", label: "Wellness Coach", tab: "labs",     grad: "linear-gradient(135deg,#00E5A022,#7B9CFF08)", accent: "#00E5A0" },
]

export default function HomeTab({ profile, userId, xp, streak, addXp, setTab }) {
  const [briefLoading, setBriefLoading]   = useState(false)
  const [brief, setBrief]                 = useState("")
  const [masteries, setMasteries]         = useState({})
  const [selectedSub, setSelectedSub]     = useState(null)
  const [subPlan, setSubPlan]             = useState("")
  const [subLoading, setSubLoading]       = useState(false)
  const [oracleTopics, setOracleTopics]   = useState([])
  const [oracleLoading, setOracleLoading] = useState(false)
  const [oracleSel, setOracleSel]         = useState(null)
  const [oracleDeep, setOracleDeep]       = useState("")
  const [deepLoading, setDeepLoading]     = useState(false)

  // ── Mood Check ──────────────────────────────────────────────
  const [mood, setMood] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('eduvyai_mood') || 'null')
      if (saved && saved.date === new Date().toDateString()) return saved.value
    } catch {}
    return null
  })

  // ── Mera Sawaal (daily problem) ────────────────────────────
  const [dailyQ, setDailyQ]         = useState(null)
  const [dailyAns, setDailyAns]     = useState(false)
  const [dailyQLoad, setDailyQLoad] = useState(false)

  // ── Bhool Curve ─────────────────────────────────────────────
  const bhool = useBhoolStats()
  const bhoolDue = bhool.overdue.length + bhool.soon.length

  const subjects = profile.subjects?.length ? profile.subjects : (SUBS[profile.standard] || [])

  // ── Load mastery from backend on mount ─────────────────────
  useEffect(() => {
    if (!userId) return
    apiGetMastery(userId)
      .then(data => { if (data && Object.keys(data).length) setMasteries(data) })
      .catch(() => {})
  }, [userId])

  // Overall mastery average (0% for untouched subjects)
  const masteryValues = subjects.map(s => masteries[s] ?? 0)
  const avgMastery = Math.round(masteryValues.reduce((a, b) => a + b, 0) / (masteryValues.length || 1))

  const saveMood = (m) => {
    setMood(m)
    try { localStorage.setItem('eduvyai_mood', JSON.stringify({ date: new Date().toDateString(), value: m })) } catch {}
  }

  // ── Daily Brief (mood-aware) ────────────────────────────────
  const generateBrief = async () => {
    const moodNote = mood === 'stressed'
      ? 'The student is feeling STRESSED today. Focus on quick wins, review of already-known topics, and include one breathing tip. Be extra gentle and encouraging.'
      : mood === 'tired'
      ? 'The student is TIRED today. Suggest only 2-3 short 20-minute study blocks. Recommend story-mode learning (Tutor → Story tab). Skip hard new topics.'
      : mood === 'fresh'
      ? 'The student is FRESH and energized! This is the perfect time for hard new topics. Challenge them and set ambitious goals for today.'
      : 'Normal paced study plan.'
    setBriefLoading(true)
    setBrief("")
    const sys = buildSystemPrompt(profile, `Generate a personalized 90-second morning study plan for today. ${moodNote}
Include: focus topic for today, a board-specific exam tip for ${profile.board}, a motivational message, and one concept to master tonight. Keep it warm, energetic, and in ${profile.language}.`)
    const res = await callAI(`Create my daily brain brief for today. I study ${subjects.slice(0,3).join(", ")}.`, sys)
    setBrief(res)
    addXp(5)
    setBriefLoading(false)
  }

  // ── Mera Sawaal: daily hyper-local problem ─────────────────
  const generateDailyQ = async () => {
    setDailyQLoad(true)
    setDailyQ(null)
    setDailyAns(false)
    const localExamples = {
      'Gujarati': 'kirana store, Navratri, Surat textile market, groundnut oil, sugarcane fields',
      'Hindi': 'chai stall, cricket match, Delhi metro, mango season, Diwali crackers',
      'Marathi': 'Pune traffic, sugarcane, Ganpati festival, coconut, Mumbai dabbawalas',
      'Tamil': 'rice paddy, Chennai marina, auto-rickshaw, Pongal harvest, coconut trees',
      'Telugu': 'Hyderabad biryani, Charminar, paddy fields, Sankranti kite flying, IT Park',
      'Kannada': 'Bengaluru traffic, coffee plantation, Mysore palace, Dasara festival, silk saree',
      'Bengali': 'Durga Puja, mustard fields, Kolkata tram, hilsa fish, Sundarbans',
      'Punjabi': 'wheat harvest, bhangra, langar, tractor, Golden Temple',
      'Odia': 'Rath Yatra, Mahanadi river, paddy, Puri beach, Odissi dance',
      'Urdu': 'biryani, rickshaw, Lucknow tehzeeb, jasmine flowers, Eid celebration',
      'English': 'cricket match, chai, auto-rickshaw, Diwali, ISRO rocket launch',
    }
    const examples = localExamples[profile.language] || localExamples.English
    const subject = subjects[Math.floor(Math.random() * Math.min(subjects.length, 4))] || subjects[0] || 'Mathematics'
    const sys = buildSystemPrompt(profile, `Generate ONE application problem for ${profile.standard} ${profile.board} ${subject}.
Use a real, hyper-local Indian example from: ${examples}. The numbers must be realistic and grounded.
Respond ONLY in ${profile.language} with this JSON (no markdown):
{"q":"the full problem","a":"step-by-step solution","concept":"concept being tested","subject":"${subject}"}`)
    const res = await callAI(`Generate a daily challenge problem for ${subject} using local Indian examples.`, sys, [], 2, 600)
    const parsed = parseAIObject(res)
    if (parsed?.q) {
      setDailyQ(parsed)
      addXp(3)
    }
    setDailyQLoad(false)
  }

  // ── Subject mastery tap ────────────────────────────────────
  const tapSubject = async (sub) => {
    if (subLoading) return
    // Toggle collapse: tap same subject again to dismiss plan
    if (selectedSub === sub) {
      setSelectedSub(null)
      setSubPlan("")
      return
    }
    setSelectedSub(sub)
    setSubPlan("")
    setSubLoading(true)
    // Use stored mastery if available, else 0 as neutral starting point.
    // Never write a random fabricated value — mastery is only updated by quiz results.
    const pct = masteries[sub] ?? 0
    const sys = buildSystemPrompt(profile, `Create a personalized study plan for ${sub}. The student's current mastery is ${pct}%. Give specific topics to study today, key formulas, and an exam tip. Keep it concise and actionable. Write in ${profile.language}.`)
    const res = await callAI(`Give me a study plan for ${sub}. My mastery is ${pct}%.`, sys)
    setSubPlan(res || "No plan generated. Please try again.")
    addXp(3)
    setSubLoading(false)
  }

  // ── Exam Oracle ───────────────────────────────────────────
  const generateOracle = async () => {
    setOracleLoading(true)
    setOracleTopics([])
    setOracleSel(null)
    setOracleDeep("")
    const sys = buildSystemPrompt(profile, `You are an exam oracle. Based on ${profile.board} ${profile.standard} patterns, list exactly 5 most likely exam topics this year. For each topic give a probability percentage. Format as a simple numbered list: 1. Topic Name — XX%. Write topic names in ${profile.language}.`)
    const res = await callAI(`List the 5 most likely exam topics for ${profile.board} ${profile.standard} this year.`, sys)
    const lines = res.split('\n').filter(l => /^\d+\./.test(l.trim()))
    const parsed = lines.slice(0, 5).map(l => {
      const match = l.match(/^\d+\.\s*(.+?)[\s—-]+(\d+)%/)
      return match ? { topic: match[1].trim(), pct: Number(match[2]) } : { topic: l.replace(/^\d+\.\s*/, '').trim(), pct: 70 }
    })
    setOracleTopics(parsed.length ? parsed : [{ topic: res, pct: 80 }])
    addXp(5)
    setOracleLoading(false)
  }

  const deepDive = async (topic) => {
    setOracleSel(topic)
    setDeepLoading(true)
    setOracleDeep("")
    const sys = buildSystemPrompt(profile, `For the exam topic "${topic.topic}", provide:
- Likely question types that may appear
- Key formulas or facts to remember
- A memory trick
- Common mistakes students make
Write entirely in ${profile.language}.`)
    const res = await callAI(`Give me deep dive on: ${topic.topic}`, sys)
    setOracleDeep(res)
    addXp(3)
    setDeepLoading(false)
  }

  const greeting = getTimeGreeting()

  return (
    <div style={{ padding: "16px 16px 24px", maxWidth: 720, margin: "0 auto" }}>

      {/* ── Mood Check (fresh each day) ───────────────────── */}
      {!mood ? (
        <div style={{
          background: COLORS.card, border: `1px solid ${COLORS.border}`,
          borderRadius: 18, padding: "16px 16px 14px", marginBottom: 14,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>
            How are you feeling today? 🌱
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { key: "fresh",    icon: "😄", label: "Fresh",    color: COLORS.green  },
              { key: "okay",     icon: "😐", label: "Okay",     color: COLORS.blue   },
              { key: "stressed", icon: "😟", label: "Stressed", color: COLORS.yellow },
              { key: "tired",    icon: "😴", label: "Tired",    color: COLORS.muted  },
            ].map(m => (
              <button key={m.key} onClick={() => saveMood(m.key)} style={{
                flex: 1, background: `${m.color}15`, border: `1px solid ${m.color}30`,
                borderRadius: 12, padding: "10px 4px", cursor: "pointer",
                fontFamily: "Sora, sans-serif",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}>
                <span style={{ fontSize: 22 }}>{m.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: m.color }}>{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          background: COLORS.card2, border: `1px solid ${COLORS.border}`,
          borderRadius: 14, padding: "10px 14px", marginBottom: 14,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 13, color: COLORS.muted }}>
            {mood === "fresh"    && "😄 You're fresh — tackle the hard topics today! 🚀"}
            {mood === "okay"     && "😐 You're doing okay — steady progress wins. 💪"}
            {mood === "stressed" && "😟 You're stressed — quick wins only, no new topics. 🧘"}
            {mood === "tired"    && "😴 You're tired — try Story Mode in the Tutor tab. 📖"}
          </span>
          <button onClick={() => { setMood(null); localStorage.removeItem('eduvyai_mood') }} style={{
            background: "transparent", border: "none", fontSize: 11,
            color: COLORS.muted, cursor: "pointer", fontFamily: "Sora, sans-serif",
          }}>change</button>
        </div>
      )}

      {/* ── Hero Card ──────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #0b1a2e 0%, #0b1422 60%, #0a1a15 100%)",
        border: `1px solid ${COLORS.green}25`,
        borderRadius: 20,
        padding: "20px 20px 16px",
        marginBottom: 14,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative glow */}
        <div style={{
          position: "absolute", top: -40, right: -40,
          width: 120, height: 120,
          background: `radial-gradient(circle, ${COLORS.green}20, transparent 70%)`,
          pointerEvents: "none",
        }} />

        <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 4 }}>
          {greeting}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: COLORS.text, margin: "0 0 2px" }}>
          {profile.name || "Student"} 👋
        </h2>
        <p style={{ fontSize: 12, color: COLORS.muted, margin: "0 0 16px" }}>
          {profile.standard} &nbsp;·&nbsp; {profile.board} &nbsp;·&nbsp; {profile.language}
        </p>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 8 }}>
          <StatChip icon="⚡" value={`${xp} XP`} color={COLORS.yellow} />
          <StatChip icon="🔥" value={`${streak} day${streak !== 1 ? "s" : ""}`} color={COLORS.orange} />
          <StatChip icon="🧠" value={`${avgMastery}% avg`} color={masteryColor(avgMastery)} />
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────── */}
      <Section title="⚡ Quick Actions">
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
        }}>
          {QUICK_ACTIONS.map(btn => (
            <button
              key={btn.label}
              onClick={() => setTab(btn.tab)}
              style={{
                background: btn.grad,
                border: `1px solid ${btn.accent}30`,
                borderRadius: 14,
                padding: "14px 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                cursor: "pointer",
                fontFamily: "Sora, sans-serif",
                minHeight: 76,
              }}
            >
              <span style={{ fontSize: 24 }}>{btn.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: btn.accent, textAlign: "center", lineHeight: 1.2 }}>
                {btn.label}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Daily Brain Brief ─────────────────────────────── */}
      <Section title="🌅 Daily Brain Brief">
        {!brief ? (
          <button onClick={generateBrief} disabled={briefLoading} style={primaryBtn}>
            {briefLoading ? "✨ Generating…" : "✨ Generate Today's Brief"}
          </button>
        ) : (
          <>
            <div style={aiCard}>
              <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0 }}>{brief}</p>
            </div>
            <button onClick={generateBrief} disabled={briefLoading} style={{ ...ghostBtn, marginTop: 10 }}>
              {briefLoading ? "Refreshing…" : "↺ Refresh Brief"}
            </button>
          </>
        )}
      </Section>

      {/* ── Bhool Curve Memory Health ─────────────────────── */}
      {bhoolDue > 0 && (
        <Section title="🧠 Memory Health — Bhool Curve">
          <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>
            Based on spaced repetition science — these concepts need review before you forget them
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {bhool.overdue.length > 0 && (
              <div style={{ flex: 1, background: `${COLORS.red}12`, border: `1px solid ${COLORS.red}30`, borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>🔴</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: COLORS.red }}>{bhool.overdue.length}</div>
                <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>Forget today</div>
              </div>
            )}
            {bhool.soon.length > 0 && (
              <div style={{ flex: 1, background: `${COLORS.yellow}12`, border: `1px solid ${COLORS.yellow}30`, borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>🟡</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: COLORS.yellow }}>{bhool.soon.length}</div>
                <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>Due in 48h</div>
              </div>
            )}
            {bhool.fresh.length > 0 && (
              <div style={{ flex: 1, background: `${COLORS.green}10`, border: `1px solid ${COLORS.green}25`, borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>🟢</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: COLORS.green }}>{bhool.fresh.length}</div>
                <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>Fresh</div>
              </div>
            )}
          </div>
          <div style={{ marginBottom: 10 }}>
            {bhool.overdue.slice(0, 4).map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                background: COLORS.card2, borderRadius: 8, padding: "7px 10px", marginBottom: 6,
                border: `1px solid ${COLORS.red}20`,
              }}>
                <span style={{ fontSize: 10, background: COLORS.red, color: "#fff", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>REVIEW</span>
                <span style={{ fontSize: 12, color: COLORS.text, fontWeight: 600 }}>{item.concept}</span>
                <span style={{ fontSize: 11, color: COLORS.muted, marginLeft: "auto" }}>{item.subject}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setTab('labs')} style={primaryBtn}>
            ⚡ Quick Revise Now
          </button>
        </Section>
      )}

      {/* ── Mera Sawaal — Hyper-local Daily Problem ──────── */}
      <Section title="🎯 Mera Sawaal — Today's Challenge">
        <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>
          A real-world problem using examples from your own state and culture
        </p>
        {!dailyQ ? (
          <button onClick={generateDailyQ} disabled={dailyQLoad} style={primaryBtn}>
            {dailyQLoad ? "🎲 Generating…" : "🎲 Get Today's Problem"}
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{
              background: COLORS.card2, border: `1px solid ${COLORS.blue}25`,
              borderRadius: 14, padding: 14,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.blue, background: `${COLORS.blue}18`, borderRadius: 6, padding: "2px 8px" }}>
                  {dailyQ.subject}
                </span>
                <span style={{ fontSize: 11, color: COLORS.muted }}>{dailyQ.concept}</span>
              </div>
              <p style={{ fontSize: 14, color: COLORS.text, fontWeight: 600, lineHeight: 1.6, margin: 0 }}>
                {dailyQ.q}
              </p>
            </div>
            {!dailyAns ? (
              <button onClick={() => { setDailyAns(true); addXp(8) }} style={{
                ...primaryBtn,
                background: `${COLORS.yellow}20`,
                border: `1px solid ${COLORS.yellow}40`,
                color: COLORS.yellow,
              }}>
                💡 Show Solution (+8 XP)
              </button>
            ) : (
              <div style={{ background: `${COLORS.green}10`, border: `1px solid ${COLORS.green}25`, borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.green, marginBottom: 6 }}>✅ Solution</div>
                <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>{dailyQ.a}</p>
              </div>
            )}
            <button onClick={generateDailyQ} disabled={dailyQLoad} style={ghostBtn}>
              {dailyQLoad ? "Generating…" : "↺ New Problem"}
            </button>
          </div>
        )}
      </Section>

      {/* ── Subject Mastery ───────────────────────────────── */}
      <Section title="📚 Subject Mastery">
        <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>
          Tap a subject to get a personalised study plan
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {subjects.map(sub => {
            const pct = masteries[sub] ?? 0
            const color = pct === 0 ? COLORS.muted : masteryColor(pct)
            const isSelected = selectedSub === sub
            return (
              <button
                key={sub}
                onClick={() => tapSubject(sub)}
                style={{
                  background: isSelected ? `${color}12` : COLORS.card2,
                  border: `1px solid ${isSelected ? color + "50" : COLORS.border}`,
                  borderRadius: 14,
                  padding: "12px 14px",
                  cursor: "pointer",
                  fontFamily: "Sora, sans-serif",
                  textAlign: "left",
                  transition: "border-color 0.15s, background 0.15s",
                }}
              >
                {/* Top row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{subIcon(sub)}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{sub}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color, fontWeight: 700 }}>{masteryLabel(pct)}</span>
                    <span style={{
                      fontSize: 12, fontWeight: 900, color,
                      background: `${color}15`, borderRadius: 8, padding: "2px 8px",
                    }}>{pct}%</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ height: 5, background: "#ffffff10", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${color}, ${color}bb)`,
                    borderRadius: 999,
                    transition: "width 0.6s ease",
                  }} />
                </div>
              </button>
            )
          })}
        </div>

        {/* Study plan output */}
        {(subLoading || subPlan) && (
          <div style={{ marginTop: 12 }}>
            {subLoading
              ? <LoadingDots label={`Generating plan for ${selectedSub}…`} />
              : (
                <div style={{ ...aiCard, borderColor: `${masteryColor(masteries[selectedSub] ?? 0)}30` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: masteryColor(masteries[selectedSub] ?? 0), marginBottom: 6 }}>
                    📋 Study Plan — {selectedSub}
                  </div>
                  <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0 }}>{subPlan}</p>
                </div>
              )
            }
          </div>
        )}
      </Section>

      {/* ── Exam Oracle ───────────────────────────────────── */}
      <Section title="🔮 Exam Oracle">
        <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>
          AI predicts the most likely topics for your {profile.board} {profile.standard} exam
        </p>
        {!oracleTopics.length ? (
          <button onClick={generateOracle} disabled={oracleLoading} style={primaryBtn}>
            {oracleLoading ? "🔮 Predicting…" : "⚡ Predict This Year's Topics"}
          </button>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {oracleTopics.map((t, i) => {
                const topicColor = t.pct >= 80 ? COLORS.red : t.pct >= 60 ? COLORS.yellow : COLORS.green
                return (
                  <button
                    key={i}
                    onClick={() => deepDive(t)}
                    style={{
                      background: oracleSel?.topic === t.topic ? `${topicColor}12` : COLORS.card2,
                      border: `1px solid ${oracleSel?.topic === t.topic ? topicColor + "50" : COLORS.border}`,
                      borderRadius: 12,
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      fontFamily: "Sora, sans-serif",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 800, color: topicColor,
                        background: `${topicColor}15`, borderRadius: 6,
                        padding: "2px 7px", minWidth: 20, textAlign: "center",
                      }}>{i + 1}</span>
                      <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>{t.topic}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <div style={{ width: 48, height: 4, background: "#ffffff10", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${t.pct}%`, height: "100%", background: topicColor, borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 900, color: topicColor, minWidth: 32, textAlign: "right" }}>{t.pct}%</span>
                    </div>
                  </button>
                )
              })}
            </div>
            <button
              onClick={generateOracle}
              disabled={oracleLoading}
              style={{ ...ghostBtn, marginTop: 10 }}
            >
              {oracleLoading ? "Predicting…" : "↺ Re-predict"}
            </button>
          </>
        )}

        {(deepLoading || oracleDeep) && (
          <div style={{ marginTop: 12 }}>
            {deepLoading
              ? <LoadingDots label={`Deep diving into ${oracleSel?.topic}…`} />
              : (
                <div style={{ ...aiCard, borderColor: `${COLORS.yellow}30` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.yellow, marginBottom: 6 }}>
                    🔮 Deep Dive — {oracleSel?.topic}
                  </div>
                  <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0 }}>{oracleDeep}</p>
                </div>
              )
            }
          </div>
        )}
      </Section>

    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────

function getTimeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning ☀️"
  if (h < 17) return "Good afternoon 🌤️"
  if (h < 21) return "Good evening 🌙"
  return "Burning midnight oil 🌟"
}

function StatChip({ icon, value, color }) {
  return (
    <div style={{
      background: `${color}15`,
      border: `1px solid ${color}30`,
      borderRadius: 20,
      padding: "5px 12px",
      display: "flex",
      alignItems: "center",
      gap: 5,
      fontSize: 12,
      fontWeight: 700,
      color,
      flex: 1,
      justifyContent: "center",
    }}>
      <span>{icon}</span>
      <span>{value}</span>
    </div>
  )
}

function LoadingDots({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", justifyContent: "center" }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: COLORS.green, opacity: 0.6,
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <span style={{ fontSize: 12, color: COLORS.muted }}>{label}</span>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{
      background: COLORS.card,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 18,
      padding: 16,
      marginBottom: 14,
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 800, color: COLORS.text, marginBottom: 12 }}>{title}</h3>
      {children}
    </div>
  )
}

const primaryBtn = {
  background: "linear-gradient(135deg, #00E5A0, #33cc88)",
  color: "#04040e",
  border: "none",
  borderRadius: 13,
  padding: "12px 18px",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  width: "100%",
  fontFamily: "Sora, sans-serif",
}

const ghostBtn = {
  background: "transparent",
  color: COLORS.muted,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: "8px 14px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  width: "100%",
  fontFamily: "Sora, sans-serif",
}

const aiCard = {
  background: COLORS.card2,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 14,
  padding: 16,
}
