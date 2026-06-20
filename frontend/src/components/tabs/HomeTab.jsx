import { useState, useEffect } from 'react'
import { COLORS, SUBS, getBhoolStats, parseAIArray, getDisplayLang } from '../../shared.js'
import { apiGetMastery, apiGetMySquad, apiGetPendingMuqabalaBattles, apiGetDailyContent, apiSaveDailyContent, apiGenerateDailyQuestions, apiGenerateDailyBrief, apiGenerateStudyPlan, apiGenerateExamOracle, apiGenerateDeepDive } from '../../api.js'
import { li } from '../../i18n/index.js'

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
  if (pct >= 75) return '#00E5A0'
  if (pct >= 45) return '#FFD166'
  return '#FF6B6B'
}

function masteryLabel(pct, lang) {
  const ui = li(lang)
  if (pct === 0)  return ui.notStarted
  if (pct >= 75)  return ui.mastered
  if (pct >= 45)  return ui.learning
  return ui.needsWork
}

// ── Quick action cards config (labels come from i18n) ────────
const QUICK_ACTION_KEYS = [
  { icon: "📖", labelKey: "smartNotes",    tab: "notebook", grad: "linear-gradient(135deg,#7B9CFF22,#7B9CFF08)", accent: "#7B9CFF" },
  { icon: "🤖", labelKey: "aiTutor",       tab: "tutor",    grad: "linear-gradient(135deg,#00E5A022,#00E5A008)", accent: "#00E5A0" },
  { icon: "🎯", labelKey: "takeQuiz",      tab: "labs",     grad: "linear-gradient(135deg,#FF6B6B22,#FF6B6B08)", accent: "#FF6B6B" },
  { icon: "🎙️", labelKey: "aiPodcast",    tab: "labs",     grad: "linear-gradient(135deg,#FFD16622,#FFD16608)", accent: "#FFD166" },
  { icon: "🎬", labelKey: "findVideos",    tab: "videos",   grad: "linear-gradient(135deg,#FF6B3522,#FF6B3508)", accent: "#FF6B35" },
  { icon: "🧘", labelKey: "wellnessCoach", tab: "labs",     grad: "linear-gradient(135deg,#00E5A022,#7B9CFF08)", accent: "#00E5A0" },
]

export default function HomeTab({ profile, userId, xp, streak, addXp, setTab }) {
  const [briefLoading, setBriefLoading]   = useState(false)
  const [brief, setBrief]                 = useState("")
  const [masteries, setMasteries]         = useState({})
  const [selectedSub, setSelectedSub]     = useState(null)
  const [subPlan, setSubPlan]             = useState("")
  const [subLoading, setSubLoading]       = useState(false)
  
  // ── Notifications & Squad ───────────────────────────────────
  const [pendingBattles, setPendingBattles] = useState([])
  const [mySquad, setMySquad]               = useState(null)
  const [lastTab, setLastTab]               = useState(null)

  // ── Mood Check ──────────────────────────────────────────────
  const [mood, setMood] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('eduvyai_mood') || 'null')
      if (saved && saved.date === new Date().toDateString()) return saved.value
    } catch {}
    return null
  })

  // ── Mera Sawaal (daily problems - 2 per day) ────────────────
  const [dailyQs, setDailyQs]       = useState([])  // Array of 2 questions
  const [dailyAns, setDailyAns]     = useState({})  // { 0: true, 1: false } - track which are revealed
  const [dailyQLoad, setDailyQLoad] = useState(false)
  
  // Track XP awards to prevent duplicates on refresh
  const [dailyXpAwarded, setDailyXpAwarded] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('eduvyai_dailyq_xp') || '{}')
      // Only use if same date
      if (saved.date === new Date().toDateString()) return saved
    } catch {}
    return { date: new Date().toDateString(), generate: false, show: {} }
  })
  
  const saveDailyXp = (updates) => {
    const newState = { ...dailyXpAwarded, ...updates, date: new Date().toDateString() }
    setDailyXpAwarded(newState)
    localStorage.setItem('eduvyai_dailyq_xp', JSON.stringify(newState))
  }

  // ── Exam Oracle ─────────────────────────────────────────────
  const [oracleTopics, setOracleTopics] = useState([])
  const [oracleLoading, setOracleLoading] = useState(false)
  const [oracleSel, setOracleSel] = useState(null)
  const [oracleDeep, setOracleDeep] = useState("")
  const [deepLoading, setDeepLoading] = useState(false)

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

  // ── Load notifications, squad, and last tab ─────────────
  useEffect(() => {
    // Last visited tab from localStorage
    try {
      const saved = localStorage.getItem('eduvyai_last_tab')
      if (saved && saved !== 'home') setLastTab(saved)
    } catch {}

    // Pending Muqabla battles
    apiGetPendingMuqabalaBattles()
      .then(data => { if (data?.battles?.length) setPendingBattles(data.battles) })
      .catch(() => {})

    // My squad info
    apiGetMySquad()
      .then(data => { if (data?.squad) setMySquad(data.squad) })
      .catch(() => {})
  }, [])

  // Overall mastery average (0% for untouched subjects)
  const masteryValues = subjects.map(s => masteries[s] ?? 0)
  const avgMastery = Math.round(masteryValues.reduce((a, b) => a + b, 0) / (masteryValues.length || 1))

  const saveMood = (m) => {
    setMood(m)
    try { localStorage.setItem('eduvyai_mood', JSON.stringify({ date: new Date().toDateString(), value: m })) } catch {}
  }

  // ── Daily Brief (mood-aware, generated by backend) ──────────────────────
  const generateBrief = async () => {
    const lang = profile.language || 'English'
    
    // Check if already generated today in database
    if (!brief) {
      try {
        const existing = await apiGetDailyContent('brief', lang)
        if (existing?.exists && existing.content) {
          setBrief(existing.content)
          return
        }
      } catch {}
    }
    
    setBriefLoading(true)
    setBrief("")
    
    try {
      const result = await apiGenerateDailyBrief({
        standard: profile.standard,
        board: profile.board || 'CBSE',
        language: lang,
        mood: mood || 'okay',
        subjects: subjects
      })
      
      if (result?.brief) {
        setBrief(result.brief)
        // Only award XP if freshly generated
        if (!result.saved) {
          addXp(5)
        }
      }
    } catch (err) {
      console.error('Brief generation error:', err)
      setBrief("आजचा brief तयार करण्यात त्रुटी आली. कृपया पुन्हा प्रयत्न करा.")
    }
    
    setBriefLoading(false)
  }

  // Load brief from database on mount
  useEffect(() => {
    const lang = profile.language || 'English'
    apiGetDailyContent('brief', lang)
      .then(data => { if (data?.exists && data.content) setBrief(data.content) })
      .catch(() => {})
  }, [])

  // ── Mera Sawaal: daily challenges (2 per day, generated by backend) ─────
  const generateDailyQ = async () => {
    setDailyQLoad(true)
    setDailyQs([])
    setDailyAns({})
    
    // Build full student context like a real teacher would know
    const weakTopics = [...bhool.overdue, ...bhool.soon].map(b => b.concept).slice(0, 5)
    
    try {
      // Call backend with full context - backend builds smart prompt
      const result = await apiGenerateDailyQuestions({
        standard: profile.standard,
        board: profile.board || 'CBSE',
        language: profile.language || 'English',
        mood: mood || 'okay',
        mathMastery: masteries['Mathematics'] || 0,
        scienceMastery: masteries['Science'] || 0,
        weakTopics: weakTopics,
        recentTopics: [] // TODO: track from recent quiz/notebook activity
      })
      
      if (result?.questions?.length > 0) {
        setDailyQs(result.questions.slice(0, 2))
        // Only award XP if freshly generated (not loaded from DB)
        if (!result.saved && !dailyXpAwarded.generate) {
          addXp(5)
          saveDailyXp({ generate: true })
        }
      }
    } catch (err) {
      console.error('Daily questions error:', err)
    }
    
    setDailyQLoad(false)
  }

  // Load daily questions from database on mount
  useEffect(() => {
    const weakTopics = [...bhool.overdue, ...bhool.soon].map(b => b.concept).slice(0, 5)
    
    apiGenerateDailyQuestions({
      standard: profile.standard,
      board: profile.board || 'CBSE',
      language: profile.language || 'English',
      mood: mood || 'okay',
      mathMastery: masteries['Mathematics'] || 0,
      scienceMastery: masteries['Science'] || 0,
      weakTopics: weakTopics,
      recentTopics: []
    })
      .then(result => {
        if (result?.questions?.length > 0) {
          setDailyQs(result.questions.slice(0, 2))
          // Restore revealed answers from localStorage (show = { 0: true, 1: true })
          if (dailyXpAwarded.show) {
            setDailyAns(dailyXpAwarded.show)
          }
        }
      })
      .catch(() => {})
  }, [mood, masteries])

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
    
    try {
      const pct = masteries[sub] ?? 0
      const result = await apiGenerateStudyPlan({
        subject: sub,
        mastery: pct,
        standard: profile.standard,
        board: profile.board || 'CBSE',
        language: profile.language || 'English'
      })
      
      setSubPlan(result?.plan || "No plan generated. Please try again.")
      // Only award XP if freshly generated
      if (!result?.saved) {
        addXp(3)
      }
    } catch (err) {
      console.error('Study plan error:', err)
      setSubPlan("अभ्यास योजना तयार करता आली नाही. कृपया पुन्हा प्रयत्न करा.")
    }
    
    setSubLoading(false)
  }

  // ── Exam Oracle: predict important topics (backend) ──────────────────
  const generateOracle = async () => {
    setOracleLoading(true)
    setOracleTopics([])
    setOracleSel(null)
    setOracleDeep("")
    
    try {
      const result = await apiGenerateExamOracle({
        standard: profile.standard,
        board: profile.board || 'CBSE',
        language: profile.language || 'English',
        subjects: subjects.slice(0, 4)
      })
      
      if (result?.topics?.length) {
        setOracleTopics(result.topics)
        // Only award XP if freshly generated
        if (!result?.saved) {
          addXp(5)
        }
      }
    } catch (err) {
      console.error('Oracle error:', err)
    }
    
    setOracleLoading(false)
  }

  // ── Deep Dive (backend) ─────────────────────────────────────
  const deepDive = async (topic) => {
    if (deepLoading) return
    setOracleSel(topic)
    setOracleDeep("")
    setDeepLoading(true)
    
    try {
      const result = await apiGenerateDeepDive({
        topic: topic.topic,
        subject: topic.subject,
        standard: profile.standard,
        board: profile.board || 'CBSE',
        language: profile.language || 'English'
      })
      
      setOracleDeep(result?.content || "माहिती तयार करता आली नाही.")
      // Only award XP if freshly generated
      if (!result?.saved) {
        addXp(3)
      }
    } catch (err) {
      console.error('Deep dive error:', err)
      setOracleDeep("माहिती तयार करता आली नाही. कृपया पुन्हा प्रयत्न करा.")
    }
    
    setDeepLoading(false)
  }

  const greeting = getTimeGreeting(getDisplayLang(profile))
  const ui = li(getDisplayLang(profile))

  return (
    <div className="py-4 px-4 md:px-6 lg:px-8 pb-6">

      {/* ── Mood Check (fresh each day) ───────────────────── */}
      {!mood ? (
        <div className="bg-app-card border border-app-border rounded-[18px] pt-4 px-4 pb-3.5 mb-3.5">
          <div className="text-sm font-bold text-app-text mb-3">
            {ui.moodCheck} 🌱
          </div>
          <div className="flex gap-2">
            {[
              { key: "fresh",    icon: "😄", labelKey: "moodFresh",    color: '#00E5A0'  },
              { key: "okay",     icon: "😐", labelKey: "moodOkay",     color: '#7B9CFF'   },
              { key: "stressed", icon: "😟", labelKey: "moodStressed", color: '#FFD166' },
              { key: "tired",    icon: "😴", labelKey: "moodTired",    color: '#6868a0'  },
            ].map(m => (
              <button 
                key={m.key} 
                onClick={() => saveMood(m.key)} 
                className="flex-1 rounded-xl py-2.5 px-1 cursor-pointer font-[Sora,sans-serif] flex flex-col items-center gap-1 border"
                style={{ background: `${m.color}15`, borderColor: `${m.color}30` }}
              >
                <span className="text-[22px]">{m.icon}</span>
                <span className="text-[10px] font-bold" style={{ color: m.color }}>{ui[m.labelKey]?.replace(/^😊|😴|😰|😐\s*/,'') || m.key}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-app-card2 border border-app-border rounded-[14px] py-2.5 px-3.5 mb-3.5 flex items-center justify-between">
          <span className="text-[13px] text-app-muted">
            {mood === "fresh"    && (ui.moodFreshFeedback || "😄 You're fresh — tackle the hard topics today! 🚀")}
            {mood === "okay"     && (ui.moodOkayFeedback || "😐 You're doing okay — steady progress wins. 💪")}
            {mood === "stressed" && (ui.moodStressedFeedback || "😟 You're stressed — quick wins only, no new topics. 🧘")}
            {mood === "tired"    && (ui.moodTiredFeedback || "😴 You're tired — try Story Mode in the Tutor tab. 📖")}
          </span>
          <button 
            onClick={() => { setMood(null); localStorage.removeItem('eduvyai_mood') }} 
            className="bg-transparent border-none text-[11px] text-app-muted cursor-pointer font-[Sora,sans-serif]"
          >{ui.change || 'change'}</button>
        </div>
      )}

      {/* ── Hero Card ──────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#0b1a2e] via-[#0b1422] to-[#0a1a15] border border-app-green/20 rounded-[20px] pt-5 px-5 pb-4 mb-3.5 relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute -top-10 -right-10 w-[120px] h-[120px] bg-[radial-gradient(circle,_#00E5A020,_transparent_70%)] pointer-events-none" />

        <div className="text-[13px] text-app-muted mb-1">
          {greeting}
        </div>
        <h2 className="text-[22px] font-black text-app-text m-0 mb-0.5">
          {profile.name || "Student"} 👋
        </h2>
        <p className="text-xs text-app-muted m-0 mb-4">
          {profile.standard} &nbsp;·&nbsp; {profile.board} &nbsp;·&nbsp; {profile.language}
        </p>

        {/* Stats row */}
        <div className="flex gap-2">
          <StatChip icon="⚡" value={`${xp} XP`} color={'#FFD166'} />
          <StatChip icon="🔥" value={`${streak} day${streak !== 1 ? "s" : ""}`} color={'#FF6B35'} />
          <StatChip icon="🧠" value={`${avgMastery}% avg`} color={masteryColor(avgMastery)} />
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────── */}
      <Section title={`⚡ ${ui.quickActions || 'Quick Actions'}`}>
        <div className="grid grid-cols-3 gap-2.5">
          {QUICK_ACTION_KEYS.map(btn => (
            <button
              key={btn.labelKey}
              onClick={() => setTab(btn.tab)}
              className="rounded-[14px] py-3.5 px-2 flex flex-col items-center justify-center gap-1.5 cursor-pointer font-[Sora,sans-serif] min-h-[76px] border"
              style={{ background: btn.grad, borderColor: `${btn.accent}30` }}
            >
              <span className="text-2xl">{btn.icon}</span>
              <span className="text-[11px] font-bold text-center leading-tight" style={{ color: btn.accent }}>
                {ui[btn.labelKey] || btn.labelKey}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Daily Brain Brief ─────────────────────────────── */}
      <Section title={`🌅 ${ui.dailyBrief?.replace(/^📋\s*/, '') || 'Daily Brain Brief'}`}>
        {!brief ? (
          <button onClick={generateBrief} disabled={briefLoading} className="primary-btn">
            {briefLoading ? `✨ ${ui.generating || 'Generating'}…` : ui.generateBrief || '✨ Generate Today\'s Brief'}
          </button>
        ) : (
          <div className="ai-card">
            <p className="text-[13px] text-app-text leading-[1.8] whitespace-pre-wrap m-0">{brief}</p>
          </div>
        )}
      </Section>

      {/* ── Bhool Curve Memory Health ─────────────────────── */}
      {bhoolDue > 0 && (
        <Section title={`🧠 ${ui.memoryHealth || 'Memory Health — Bhool Curve'}`}>
          <p className="text-xs text-app-muted mb-3">
            {ui.basedOnScience || 'Based on spaced repetition science — these concepts need review before you forget them'}
          </p>
          <div className="flex gap-2 mb-3.5">
            {bhool.overdue.length > 0 && (
              <div className="flex-1 bg-app-red/10 border border-app-red/30 rounded-xl py-2.5 px-3 text-center">
                <div className="text-xl mb-1">🔴</div>
                <div className="text-lg font-black text-app-red">{bhool.overdue.length}</div>
                <div className="text-[10px] text-app-muted mt-0.5">{ui.forgetToday || 'Forget today'}</div>
              </div>
            )}
            {bhool.soon.length > 0 && (
              <div className="flex-1 bg-app-yellow/10 border border-app-yellow/30 rounded-xl py-2.5 px-3 text-center">
                <div className="text-xl mb-1">🟡</div>
                <div className="text-lg font-black text-app-yellow">{bhool.soon.length}</div>
                <div className="text-[10px] text-app-muted mt-0.5">{ui.dueIn48h || 'Due in 48h'}</div>
              </div>
            )}
            {bhool.fresh.length > 0 && (
              <div className="flex-1 bg-app-green/10 border border-app-green/20 rounded-xl py-2.5 px-3 text-center">
                <div className="text-xl mb-1">🟢</div>
                <div className="text-lg font-black text-app-green">{bhool.fresh.length}</div>
                <div className="text-[10px] text-app-muted mt-0.5">{ui.freshLabel || 'Fresh'}</div>
              </div>
            )}
          </div>
          <div className="mb-2.5">
            {bhool.overdue.slice(0, 4).map((item, i) => (
              <div 
                key={i} 
                className="flex items-center gap-2 bg-app-card2 rounded-lg py-1.5 px-2.5 mb-1.5 border border-app-red/20"
              >
                <span className="text-[10px] bg-app-red text-white rounded py-px px-1.5 font-bold">{ui.reviewLabel || 'REVIEW'}</span>
                <span className="text-xs text-app-text font-semibold">{item.concept}</span>
                <span className="text-[11px] text-app-muted ml-auto">{item.subject}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setTab('labs')} className="primary-btn">
            {ui.quickReviseNow || '⚡ Quick Revise Now'}
          </button>
        </Section>
      )}

      {/* ── Mera Sawaal — 2 Daily Problems ────────────── */}
      <Section title={ui.todaysChallenge || "🎯 My Questions — Today's Challenge"}>
        <p className="text-xs text-app-muted mb-3">
          {ui.realWorldProblem || 'Two real-world problems using examples from your own state and culture'}
        </p>
        {dailyQs.length === 0 ? (
          <button onClick={generateDailyQ} disabled={dailyQLoad} className="primary-btn">
            {dailyQLoad ? `🎲 ${ui.generating || 'Generating'}…` : (ui.getTodaysProblem || "🎲 Get Today's Problems")}
          </button>
        ) : (
          <div className="flex flex-col gap-4">
            {dailyQs.map((q, idx) => (
              <div key={idx} className="flex flex-col gap-2.5">
                <div className="bg-app-card2 border border-app-blue/20 rounded-[14px] p-3.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[10px] font-black text-white bg-app-blue rounded-full w-5 h-5 flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-[11px] font-bold text-app-blue bg-app-blue/15 rounded-md py-0.5 px-2">
                      {q.subject}
                    </span>
                    <span className="text-[11px] text-app-muted">{q.concept}</span>
                  </div>
                  <p className="text-sm text-app-text font-semibold leading-relaxed m-0">
                    {q.q}
                  </p>
                </div>
                {!dailyAns[idx] ? (
                  <button 
                    onClick={() => { 
                      setDailyAns(prev => ({ ...prev, [idx]: true }))
                      // Only award XP if not already awarded for this question today
                      if (!dailyXpAwarded.show?.[idx]) {
                        addXp(4)
                        saveDailyXp({ show: { ...dailyXpAwarded.show, [idx]: true } })
                      }
                    }} 
                    className="primary-btn bg-app-yellow/20 border border-app-yellow/40 !text-app-yellow"
                  >
                    {dailyXpAwarded.show?.[idx] ? (ui.showSolution || '💡 Show Solution') : (ui.showSolutionXp?.replace('8', '4') || '💡 Show Solution (+4 XP)')}
                  </button>
                ) : (
                  <div className="bg-app-green/10 border border-app-green/20 rounded-xl p-3.5">
                    <div className="text-xs font-bold text-app-green mb-1.5">{ui.solution || '✅ Solution'}</div>
                    <p className="text-[13px] text-app-text leading-[1.7] whitespace-pre-wrap m-0">{q.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Subject Mastery ───────────────────────────────── */}
      <Section title={`📚 ${ui.subjectMastery || 'Subject Mastery'}`}>
        <p className="text-xs text-app-muted mb-3">
          {ui.tapSubjectForPlan || 'Tap a subject to get a personalised study plan'}
        </p>
        <div className="flex flex-col gap-2">
          {subjects.map(sub => {
            const pct = masteries[sub] ?? 0
            const color = pct === 0 ? '#6868a0' : masteryColor(pct)
            const isSelected = selectedSub === sub
            return (
              <button
                key={sub}
                onClick={() => tapSubject(sub)}
                className="rounded-[14px] py-3 px-3.5 cursor-pointer font-[Sora,sans-serif] text-left transition-all duration-150 border"
                style={{
                  background: isSelected ? `${color}12` : '#101022',
                  borderColor: isSelected ? `${color}50` : 'rgba(255,255,255,0.03)',
                }}
              >
                {/* Top row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{subIcon(sub)}</span>
                    <span className="text-[13px] font-bold text-app-text">{sub}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold" style={{ color }}>{masteryLabel(pct, getDisplayLang(profile))}</span>
                    <span 
                      className="text-xs font-black rounded-lg py-0.5 px-2"
                      style={{ color, background: `${color}15` }}
                    >{pct}%</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-[5px] bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-[width] duration-[600ms] ease-out"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}bb)` }}
                  />
                </div>
              </button>
            )
          })}
        </div>

        {/* Study plan output */}
        {(subLoading || subPlan) && (
          <div className="mt-3">
            {subLoading
              ? <LoadingDots label={`${ui.generatingFor || 'Generating plan for'} ${selectedSub}…`} />
              : (
                <div className="ai-card" style={{ borderColor: `${masteryColor(masteries[selectedSub] ?? 0)}30` }}>
                  <div className="text-xs font-bold mb-1.5" style={{ color: masteryColor(masteries[selectedSub] ?? 0) }}>
                    {ui.studyPlanFor || '📋 Study Plan —'} {selectedSub}
                  </div>
                  <p className="text-[13px] text-app-text leading-[1.8] whitespace-pre-wrap m-0">{subPlan}</p>
                </div>
              )
            }
          </div>
        )}
      </Section>

      {/* ── Exam Oracle ───────────────────────────────────── */}
      <Section title="🔮 Exam Oracle">
        <p className="text-xs text-app-muted mb-3">
          AI predicts the most likely topics for your {profile.board} {profile.standard} exam
        </p>
        {!oracleTopics.length ? (
          <button onClick={generateOracle} disabled={oracleLoading} className="primary-btn">
            {oracleLoading ? "🔮 Predicting…" : "⚡ Predict This Year's Topics"}
          </button>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {oracleTopics.map((t, i) => {
                const topicColor = t.pct >= 80 ? '#FF6B6B' : t.pct >= 60 ? '#FFD166' : '#00E5A0'
                return (
                  <button
                    key={i}
                    onClick={() => deepDive(t)}
                    className="rounded-xl py-3 px-3.5 flex items-center justify-between cursor-pointer font-[Sora,sans-serif] text-left border"
                    style={{
                      background: oracleSel?.topic === t.topic ? `${topicColor}12` : '#101022',
                      borderColor: oracleSel?.topic === t.topic ? `${topicColor}50` : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span 
                        className="text-[11px] font-extrabold rounded-md py-0.5 px-1.5 min-w-[20px] text-center"
                        style={{ color: topicColor, background: `${topicColor}15` }}
                      >{i + 1}</span>
                      <span className="text-[13px] text-app-text font-semibold">{t.topic}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${t.pct}%`, background: topicColor }} />
                      </div>
                      <span className="text-xs font-black min-w-[32px] text-right" style={{ color: topicColor }}>{t.pct}%</span>
                    </div>
                  </button>
                )
              })}
            </div>
            <button
              onClick={generateOracle}
              disabled={oracleLoading}
              className="ghost-btn mt-2.5"
            >
              {oracleLoading ? "Predicting…" : "↺ Re-predict"}
            </button>
          </>
        )}

        {(deepLoading || oracleDeep) && (
          <div className="mt-3">
            {deepLoading
              ? <LoadingDots label={`Deep diving into ${oracleSel?.topic}…`} />
              : (
                <div className="ai-card border-app-yellow/30">
                  <div className="text-xs font-bold text-app-yellow mb-1.5">
                    🔮 Deep Dive — {oracleSel?.topic}
                  </div>
                  <p className="text-[13px] text-app-text leading-[1.8] whitespace-pre-wrap m-0">{oracleDeep}</p>
                </div>
              )}
          </div>
        )}
      </Section>

      {/* ── Continue Learning ────────────────────────────────── */}
      {lastTab && (
        <Section title={`📚 ${ui.continueLearning || 'Continue Learning'}`}>
          <button
            onClick={() => setTab(lastTab)}
            className="w-full rounded-[14px] py-3.5 px-4 flex items-center justify-between cursor-pointer font-[Sora,sans-serif] border bg-app-card2 border-app-blue/30 hover:border-app-blue/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {lastTab === 'tutor' && '🤖'}
                {lastTab === 'notebook' && '📖'}
                {lastTab === 'videos' && '🎬'}
                {lastTab === 'labs' && '🧪'}
                {lastTab === 'sathi' && '👥'}
                {lastTab === 'bhool' && '🧠'}
                {lastTab === 'muqabla' && '⚔️'}
                {!['tutor','notebook','videos','labs','sathi','bhool','muqabla'].includes(lastTab) && '📌'}
              </span>
              <div>
                <div className="text-[13px] font-bold text-app-text">
                  {lastTab === 'tutor' && (ui.tutorTab?.replace(/^🤖\s*/, '') || 'Tutor')}
                  {lastTab === 'notebook' && (ui.notebookTab?.replace(/^📓\s*/, '') || 'Notebook')}
                  {lastTab === 'videos' && (ui.videosTab?.replace(/^🎬\s*/, '') || 'Videos')}
                  {lastTab === 'labs' && (ui.labsTab?.replace(/^🧪\s*/, '') || 'Labs')}
                  {lastTab === 'sathi' && (ui.sathiTab?.replace(/^🤝\s*/, '') || 'Companion')}
                  {lastTab === 'bhool' && (ui.bhoolTab?.replace(/^📛\s*/, '') || 'Mistakes')}
                  {lastTab === 'muqabla' && (ui.muqablaTab?.replace(/^⚔️\s*/, '') || 'Battle')}
                  {lastTab === 'learntv' && (ui.learntvTab?.replace(/^📺\s*/, '') || 'Learn TV')}
                  {!['tutor','notebook','videos','labs','sathi','bhool','muqabla','learntv'].includes(lastTab) && lastTab}
                </div>
                <div className="text-[11px] text-app-muted">{ui.pickUpWhereLeftOff || 'Pick up where you left off'}</div>
              </div>
            </div>
            <span className="text-app-blue text-lg">→</span>
          </button>
        </Section>
      )}

      {/* ── Notifications ────────────────────────────────────── */}
      {pendingBattles.length > 0 && (
        <Section title={`🔔 ${ui.notifications || 'Notifications'}`}>
          <div className="flex flex-col gap-2">
            {pendingBattles.slice(0, 3).map((battle, i) => (
              <button
                key={battle.id || i}
                onClick={() => setTab('muqabla')}
                className="w-full rounded-xl py-3 px-3.5 flex items-center gap-3 cursor-pointer font-[Sora,sans-serif] text-left border bg-app-red/10 border-app-red/30"
              >
                <span className="text-lg">⚔️</span>
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-app-text">
                    {battle.challenger_name || ui.someone || 'Someone'} {ui.challengedYou || 'challenged you!'}
                  </div>
                  <div className="text-[11px] text-app-muted">
                    {battle.subject} • {battle.question_count || 5} {ui.questionsCount || 'questions'}
                  </div>
                </div>
                <span className="text-[11px] font-bold text-app-red bg-app-red/20 rounded-lg py-1 px-2">{ui.accept || 'Accept'}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* ── Squad Activity ───────────────────────────────────── */}
      {mySquad && (
        <Section title={`👥 ${ui.yourSquad || 'Your Squad'}`}>
          <button
            onClick={() => setTab('sathi')}
            className="w-full rounded-[14px] py-3.5 px-4 flex items-center justify-between cursor-pointer font-[Sora,sans-serif] border bg-gradient-to-r from-app-green/10 to-app-blue/10 border-app-green/30 hover:border-app-green/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">👥</span>
              <div>
                <div className="text-[13px] font-bold text-app-text">{mySquad.name || ui.studySquad || 'Study Squad'}</div>
                <div className="text-[11px] text-app-muted">
                  {mySquad.member_count || mySquad.members?.length || '?'} {ui.members || 'members'} • {mySquad.focus_subject || 'General'}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              {mySquad.message_count > 0 && (
                <span className="text-[10px] font-bold text-white bg-app-green rounded-full py-0.5 px-2">
                  {mySquad.message_count} {ui.newMessages || 'new'}
                </span>
              )}
              <span className="text-app-green text-lg">→</span>
            </div>
          </button>
        </Section>
      )}

    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────

function getTimeGreeting(lang) {
  const h = new Date().getHours()
  const ui = li(lang)
  if (h < 12) return `${ui.goodMorning} ☀️`
  if (h < 17) return `${ui.goodAfternoon} 🌤️`
  if (h < 21) return `${ui.goodEvening} 🌙`
  return `${ui.lateNightStudy} 🌟`
}

function StatChip({ icon, value, color }) {
  return (
    <div 
      className="rounded-full py-1.5 px-3 flex items-center gap-1.5 text-xs font-bold flex-1 justify-center border"
      style={{ background: `${color}15`, borderColor: `${color}30`, color }}
    >
      <span>{icon}</span>
      <span>{value}</span>
    </div>
  )
}

function LoadingDots({ label }) {
  return (
    <div className="flex items-center gap-2 py-2.5 justify-center">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div 
            key={i} 
            className="w-1.5 h-1.5 rounded-full bg-app-green opacity-60"
            style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
      <span className="text-xs text-app-muted">{label}</span>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-app-card border border-app-border rounded-[18px] p-4 mb-3.5">
      <h3 className="text-sm font-extrabold text-app-text mb-3">{title}</h3>
      {children}
    </div>
  )
}

// Note: primaryBtn, ghostBtn, aiCard classes are defined in index.css
