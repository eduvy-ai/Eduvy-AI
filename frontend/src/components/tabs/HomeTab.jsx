import { useState, useEffect } from 'react'
import { getBhoolStats, getDisplayLang } from '../../shared.js'
import { apiGetMastery, apiGetPendingMuqabalaBattles, apiGetDailyContent, apiGenerateDailyQuestions, apiGenerateDailyBrief, apiGetChapterSubjects, apiGetRecentPractice } from '../../api.js'
import { li } from '../../i18n/index.js'
import { Lightning, Fire, Brain, SunHorizon, Sparkle, Lightbulb, CheckCircle, DiceFive, HandWaving, Plant, Circle, Sword, Flask, UsersThree, Bell, Notebook, MapPin, Sun, CloudSun, Target } from '@phosphor-icons/react'

const HOME_BUDGET_KEY = 'eduvyai_study_budget_min'

// ── Bhool Curve stats (reads localStorage) ───────────────────
function useBhoolStats() {
  const [stats, setStats] = useState({ overdue: [], soon: [], fresh: [] })
  useEffect(() => {
    setStats(getBhoolStats())
  }, [])
  return stats
}

function masteryColor(pct) {
  if (pct >= 75) return '#00E5A0'
  if (pct >= 45) return '#FFD166'
  return '#FF6B6B'
}

export default function HomeTab({ profile, userId, xp, streak, addXp, setTab }) {
  const [briefLoading, setBriefLoading]   = useState(false)
  const [brief, setBrief]                 = useState("")
  const [masteries, setMasteries]         = useState({})
  const [recentPractice, setRecentPractice] = useState([])
  
  // ── Notifications ───────────────────────────────────────────
  const [pendingBattles, setPendingBattles] = useState([])
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
  const [studyBudgetMin, setStudyBudgetMin] = useState(() => {
    const profileBudget = readProfileStudyBudget(profile)
    if (profileBudget > 0) return profileBudget
    try {
      const raw = Number(localStorage.getItem(HOME_BUDGET_KEY) || 0)
      return Number.isFinite(raw) && raw > 0 ? raw : 0
    } catch {
      return 0
    }
  })
  
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

  // ── Bhool Curve ─────────────────────────────────────────────
  const bhool = useBhoolStats()
  const bhoolDue = bhool.overdue.length + bhool.soon.length
  const lang = getDisplayLang(profile)
  const ui = li(lang)
  const greeting = getTimeGreeting(lang)

  // ── Subjects from chapters API (same as Learn tab) ──────────
  const [subjects, setSubjects] = useState(profile.subjects?.length ? profile.subjects : [])

  useEffect(() => {
    const board = profile.board || 'CBSE'
    const standard = profile.standard || 'Class 10'
    const stream = profile.stream || ''
    apiGetChapterSubjects(board, standard, stream).then(subs => {
      if (subs.length > 0) setSubjects(subs)
      else if (profile.subjects?.length) setSubjects(profile.subjects)
    })
  }, [profile.board, profile.standard, profile.stream])

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

    if (userId) {
      apiGetRecentPractice()
        .then(items => setRecentPractice(Array.isArray(items) ? items.slice(0, 4) : []))
        .catch(() => setRecentPractice([]))
    }
  }, [userId])

  // Overall mastery average (0% for untouched subjects)
  const masteryValues = subjects.map(s => masteries[s] ?? 0)
  const avgMastery = Math.round(masteryValues.reduce((a, b) => a + b, 0) / (masteryValues.length || 1))
  const weakestSubjects = [...subjects]
    .map(subject => ({ subject, score: masteries[subject] ?? 0 }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)

  const daysToExam = estimateDaysToExam(profile.standard, getProfileExamDate(profile))

  useEffect(() => {
    const profileBudget = readProfileStudyBudget(profile)
    if (profileBudget > 0 && profileBudget !== studyBudgetMin) {
      setStudyBudgetMin(profileBudget)
      return
    }
  }, [profile, studyBudgetMin])

  useEffect(() => {
    if (studyBudgetMin > 0) return
    const recommended = daysToExam <= 45 ? 90 : (daysToExam <= 90 ? 60 : 35)
    setStudyBudgetMin(recommended)
    try {
      localStorage.setItem(HOME_BUDGET_KEY, String(recommended))
    } catch {}
  }, [studyBudgetMin, daysToExam])

  const trackHomeEvent = (eventName, meta = {}) => {
    try {
      window.dispatchEvent(new CustomEvent('analytics:home', {
        detail: {
          event: eventName,
          ts: Date.now(),
          user_id: userId || '',
          standard: profile.standard || '',
          board: profile.board || '',
          ...meta,
        },
      }))
    } catch {}
  }

  const goWithTrack = (tab, source, meta = {}) => {
    trackHomeEvent('home_navigate', { tab, source, ...meta })
    setTab(tab)
  }

  const startRecallWarmup = () => {
    const focusSubject = weakestSubjects[0]?.subject || (subjects[0] || 'Mathematics')
    try {
      localStorage.setItem('eduvyai_practice_focus_subject', focusSubject)
      localStorage.setItem('eduvyai_practice_session_mode', 'recall_sprint_5q')
    } catch {}
    trackHomeEvent('home_recall_warmup_start', {
      focus_subject: focusSubject,
      budget_min: studyBudgetMin,
      days_to_exam: daysToExam,
    })
    setTab('practice')
  }

  const todayMission = (() => {
    if (daysToExam <= 30 && weakestSubjects.length > 0) {
      return {
        title: `${ui.examSprint || 'Exam sprint'}: ${weakestSubjects[0].subject}`,
        subtitle: ui.examSprintDesc || 'Board exam is close. Do a focused recall sprint first.',
        eta: `${Math.max(15, Math.min(studyBudgetMin || 45, 45))} min`,
        reward: '+25 XP',
        actionLabel: ui.startExamSprint || 'Start Exam Sprint',
        action: () => {
          trackHomeEvent('home_mission_click', { mission: 'exam_sprint', days_to_exam: daysToExam })
          startRecallWarmup()
        },
      }
    }
    if (pendingBattles.length > 0 && daysToExam > 30) {
      return {
        title: ui.joinBattleMission || 'Battle challenge waiting',
        subtitle: ui.joinBattleMissionDesc || 'Complete your pending Muqabla challenge first.',
        eta: ui.eta5Min || '5 min',
        reward: '+20 XP',
        actionLabel: ui.acceptBattle || 'Accept Battle',
        action: () => {
          trackHomeEvent('home_mission_click', { mission: 'pending_battle' })
          goWithTrack('battles', 'today_mission', { mission: 'pending_battle' })
        },
      }
    }
    if (bhool.overdue.length > 0) {
      return {
        title: ui.revisionMission || 'Urgent revision mission',
        subtitle: ui.revisionMissionDesc || 'Review concepts due today before they fade.',
        eta: `${Math.max(12, Math.min(studyBudgetMin || 30, 30))} min`,
        reward: '+15 XP',
        actionLabel: ui.startRevision || 'Start Revision',
        action: () => {
          trackHomeEvent('home_mission_click', { mission: 'urgent_revision' })
          goWithTrack('mistakes', 'today_mission', { mission: 'urgent_revision' })
        },
      }
    }
    if ((studyBudgetMin || 0) <= 20) {
      return {
        title: ui.quickWinMission || 'Quick win mission',
        subtitle: ui.quickWinMissionDesc || 'Short time today. Complete a 5-question recall warm-up.',
        eta: ui.eta8Min || '8 min',
        reward: '+10 XP',
        actionLabel: ui.startWarmup || 'Start Warm-up',
        action: () => {
          trackHomeEvent('home_mission_click', { mission: 'quick_warmup' })
          startRecallWarmup()
        },
      }
    }
    if (weakestSubjects.length > 0) {
      return {
        title: `${ui.focusMission || 'Focus mission'}: ${weakestSubjects[0].subject}`,
        subtitle: ui.focusMissionDesc || 'Do a quick recall sprint on your weakest subject.',
        eta: ui.eta10Min || '10 min',
        reward: '+12 XP',
        actionLabel: ui.startPractice || 'Start Practice',
        action: () => {
          trackHomeEvent('home_mission_click', { mission: 'weak_subject' })
          startRecallWarmup()
        },
      }
    }
    return {
      title: ui.continueMission || 'Continue your learning flow',
      subtitle: ui.continueMissionDesc || 'Pick up where you left off and keep the momentum.',
      eta: ui.eta8Min || '8 min',
      reward: '+8 XP',
      actionLabel: ui.continueNow || 'Continue Now',
      action: () => {
        trackHomeEvent('home_mission_click', { mission: 'continue_flow' })
        goWithTrack(lastTab || 'learn', 'today_mission', { mission: 'continue_flow' })
      },
    }
  })()

  const saveMood = (m) => {
    setMood(m)
    try { localStorage.setItem('eduvyai_mood', JSON.stringify({ date: new Date().toDateString(), value: m })) } catch {}
  }

  // ── Daily Brief (mood-aware, generated by backend) ──────────────────────
  const generateBrief = async () => {
    const lang = profile.language || 'English'
    
    // Check if already generated today in database for current language
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
      setBrief(ui.noPlanGenerated || "Could not generate brief. Please try again.")
    }
    
    setBriefLoading(false)
  }

  // Load brief from database on mount and when language changes
  useEffect(() => {
    setBrief('')
    const lang = profile.language || 'English'
    apiGetDailyContent('brief', lang)
      .then(data => { if (data?.exists && data.content) setBrief(data.content) })
      .catch(() => {})
  }, [profile.language])

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
        subjects: profile.subjects || [],
        masteries: masteries,
        weakTopics: weakTopics,
        recentTopics: []
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

  // Load daily questions from database on mount and when language changes
  useEffect(() => {
    setDailyQs([])
    setDailyAns({})
    const weakTopics = [...bhool.overdue, ...bhool.soon].map(b => b.concept).slice(0, 5)
    
    apiGenerateDailyQuestions({
      standard: profile.standard,
      board: profile.board || 'CBSE',
      language: profile.language || 'English',
      mood: mood || 'okay',
      mathMastery: masteries['Mathematics'] || 0,
      scienceMastery: masteries['Science'] || 0,
      subjects: profile.subjects || [],
      masteries: masteries,
      weakTopics: weakTopics,
      recentTopics: []
    })
      .then(result => {
        if (result?.questions?.length > 0) {
          setDailyQs(result.questions.slice(0, 2))
          if (dailyXpAwarded.show) {
            setDailyAns(dailyXpAwarded.show)
          }
        }
      })
      .catch(() => {})
  }, [mood, masteries, profile.language])

  return (
    <div className="py-4 px-4 md:px-6 lg:px-8 pb-6">

      {/* ── Mood Check (fresh each day) ───────────────────── */}
      {!mood ? (
        <div className="bg-app-card border border-app-border rounded-[18px] pt-4 px-4 pb-3.5 mb-3.5">
          <div className="text-sm font-bold text-app-text mb-3 flex items-center gap-1.5">
            {ui.moodCheck} <Plant size={16} weight="duotone" className="text-app-green" />
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
            {mood === "tired"    && (ui.moodTiredFeedback || "😴 You're tired — try watching a video or take it easy. 📖")}
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

        <div className="text-[13px] text-app-muted mb-1 flex items-center gap-1.5">
          {greeting.text} <greeting.Icon size={16} weight="fill" style={{ color: greeting.color }} />
        </div>
        <h2 className="text-lg sm:text-[22px] font-black text-app-text m-0 mb-0.5">
          {profile.name || ui.student || "Student"} <HandWaving size={20} weight="fill" className="inline text-app-yellow" />
        </h2>
        <p className="text-xs text-app-muted m-0 mb-4">
          {profile.standard} &nbsp;·&nbsp; {profile.board} &nbsp;·&nbsp; {profile.language}
        </p>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-bold text-app-blue bg-app-blue/15 border border-app-blue/30 rounded-full px-2.5 py-1">
            {daysToExam <= 120 ? `${daysToExam}d to exam` : (ui.longTermPrep || 'Long-term prep')}
          </span>
          <span className="text-[11px] font-bold text-app-green bg-app-green/15 border border-app-green/30 rounded-full px-2.5 py-1">
            {studyBudgetMin || 35} min today
          </span>
        </div>

        {/* Stats row */}
        <div className="flex gap-2">
          <StatChip icon={<Lightning size={14} weight="fill" />} value={`${xp} ${ui.xpLabel || 'XP'}`} color={'#FFD166'} />
          <StatChip icon={<Fire size={14} weight="fill" />} value={`${streak} ${ui.streakLabel || 'day streak'}`} color={'#FF6B35'} />
          <StatChip icon={<Brain size={14} weight="fill" />} value={`${avgMastery}% ${ui.avgLabel || 'avg'}`} color={masteryColor(avgMastery)} />
        </div>
      </div>

      {/* ── Today Mission ───────────────────────────────────── */}
      <Section title={<><Target size={16} weight="duotone" className="inline text-app-green" /> {ui.todayMission || 'Today Mission'}</>}>
        <div className="rounded-2xl border border-app-green/25 bg-gradient-to-br from-app-green/10 via-app-green/5 to-transparent p-4">
          <div className="text-[15px] font-black text-app-text mb-1">{todayMission.title}</div>
          <div className="text-[12px] text-app-muted leading-relaxed mb-3">{todayMission.subtitle}</div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-bold text-app-blue bg-app-blue/15 border border-app-blue/30 rounded-full px-2.5 py-1">⏱ {todayMission.eta}</span>
            <span className="text-[11px] font-bold text-app-yellow bg-app-yellow/15 border border-app-yellow/30 rounded-full px-2.5 py-1">⚡ {todayMission.reward}</span>
          </div>
          <button onClick={todayMission.action} className="primary-btn">{todayMission.actionLabel}</button>
        </div>
      </Section>

      {/* ── Recall Warm-up Launcher ───────────────────────── */}
      <Section title={<><Lightning size={16} weight="duotone" className="inline text-app-yellow" /> {ui.recallWarmup || 'Recall Warm-up'}</>}>
        <div className="bg-app-card2 border border-app-border rounded-xl p-3.5 mb-3">
          <div className="text-[13px] font-bold text-app-text mb-1">
            {weakestSubjects[0]?.subject ? `${weakestSubjects[0].subject} · 5Q Sprint` : (ui.fiveQuestionSprint || '5-Question Sprint')}
          </div>
          <div className="text-[12px] text-app-muted">
            {ui.recallWarmupHint || 'Answer from memory first, then check feedback. Stronger recall, faster revision.'}
          </div>
        </div>
        {weakestSubjects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
            {weakestSubjects.map(item => (
              <div key={item.subject} className="bg-app-card2 border border-app-border rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-bold text-app-text">{item.subject}</span>
                  <span className="text-[11px] font-bold" style={{ color: masteryColor(item.score) }}>{item.score}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(4, item.score)}%`, background: masteryColor(item.score) }} />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button onClick={startRecallWarmup} className="primary-btn">{ui.startWarmup || 'Start Warm-up'}</button>
          <button onClick={() => goWithTrack('coach', 'warmup_explain', { subject: weakestSubjects[0]?.subject || '' })} className="ghost-btn">{ui.explainQuickly || 'Explain Quickly'}</button>
          <button onClick={() => goWithTrack('notebook', 'warmup_flashcards', { subject: weakestSubjects[0]?.subject || '' })} className="ghost-btn">{ui.makeFlashcards || 'Make Flashcards'}</button>
        </div>
      </Section>

      {/* ── Due Review Queue ───────────────────────────────── */}
      <Section title={<><Brain size={16} weight="duotone" className="inline text-app-blue" /> {ui.dueReviewQueue || 'Due Review Queue'}</>}>
        <div className="grid grid-cols-3 gap-2.5 mb-3.5">
          <MiniMetric label={ui.overdueLabel || 'Overdue'} value={bhool.overdue.length} tone="red" />
          <MiniMetric label={ui.todayLabel || 'Today'} value={bhool.soon.length} tone="yellow" />
          <MiniMetric label={ui.freshLabel || 'Fresh'} value={bhool.fresh.length} tone="green" />
        </div>
        <div className="text-[12px] text-app-muted mb-3">
          {ui.reviewQueueHint || 'Short spaced reviews now will make recall faster during tests.'}
        </div>
        <button onClick={() => goWithTrack('mistakes', 'due_review_queue')} className="primary-btn">
          {ui.reviewNow || 'Review Now'}
        </button>
      </Section>

      {/* ── Quick Launch ────────────────────────────────────── */}
      <Section title={<><Sparkle size={16} weight="duotone" className="inline text-app-blue" /> {ui.quickActions || 'Quick Actions'}</>}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <QuickLaunch label={ui.practiceTab?.replace(/^📝\s*/, '') || 'Practice'} icon={<Target size={16} weight="fill" />} onClick={() => goWithTrack('practice', 'quick_launch')} />
          <QuickLaunch label={ui.aiTutorTab?.replace(/^🤖\s*/, '') || 'Coach'} icon={<Brain size={16} weight="fill" />} onClick={() => goWithTrack('coach', 'quick_launch')} />
          <QuickLaunch label={ui.notebookTab?.replace(/^📓\s*/, '') || 'Notebook'} icon={<Notebook size={16} weight="fill" />} onClick={() => goWithTrack('notebook', 'quick_launch')} />
          <QuickLaunch label={ui.learntvTab?.replace(/^📺\s*/, '') || 'LearnTV'} icon={<Flask size={16} weight="fill" />} onClick={() => goWithTrack('learntv', 'quick_launch')} />
        </div>
      </Section>

      {/* ── Daily Brain Brief ─────────────────────────────── */}
      <Section title={<><SunHorizon size={16} weight="duotone" className="inline text-app-orange" /> {ui.dailyBrief?.replace(/^📋\s*/, '') || 'Daily Brain Brief'}</>}>
        {!brief ? (
          <button onClick={generateBrief} disabled={briefLoading} className="primary-btn">
            {briefLoading ? <><Sparkle size={14} weight="fill" className="inline" /> {ui.generating || 'Generating'}…</> : <><Sparkle size={14} weight="fill" className="inline" /> {ui.generateBrief || 'Generate Today\'s Brief'}</>}
          </button>
        ) : (
          <div className="ai-card">
            <p className="text-[13px] text-app-text leading-[1.8] whitespace-pre-wrap m-0">{brief}</p>
          </div>
        )}
      </Section>

      {/* ── Bhool Curve Memory Health ─────────────────────── */}
      {bhoolDue > 0 && (
        <Section title={<><Brain size={16} weight="duotone" className="inline text-app-blue" /> {ui.memoryHealth || 'Memory Health — Spaced Review'}</>}>
          <p className="text-xs text-app-muted mb-3">
            {ui.basedOnScience || 'Based on spaced repetition science — these concepts need review before you forget them'}
          </p>
          <div className="flex gap-2 mb-3.5">
            {bhool.overdue.length > 0 && (
              <div className="flex-1 bg-app-red/10 border border-app-red/30 rounded-xl py-2.5 px-3 text-center">
                <div className="text-xl mb-1"><Circle size={20} weight="fill" className="text-app-red" /></div>
                <div className="text-lg font-black text-app-red">{bhool.overdue.length}</div>
                <div className="text-[10px] text-app-muted mt-0.5">{ui.forgetToday || 'Forget today'}</div>
              </div>
            )}
            {bhool.soon.length > 0 && (
              <div className="flex-1 bg-app-yellow/10 border border-app-yellow/30 rounded-xl py-2.5 px-3 text-center">
                <div className="text-xl mb-1"><Circle size={20} weight="fill" className="text-app-yellow" /></div>
                <div className="text-lg font-black text-app-yellow">{bhool.soon.length}</div>
                <div className="text-[10px] text-app-muted mt-0.5">{ui.dueIn48h || 'Due in 48h'}</div>
              </div>
            )}
            {bhool.fresh.length > 0 && (
              <div className="flex-1 bg-app-green/10 border border-app-green/20 rounded-xl py-2.5 px-3 text-center">
                <div className="text-xl mb-1"><Circle size={20} weight="fill" className="text-app-green" /></div>
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
          <button onClick={() => goWithTrack('labs', 'memory_health_quick_revise')} className="primary-btn">
            {ui.quickReviseNow || <><Lightning size={14} weight="fill" className="inline" /> Quick Revise Now</>}
          </button>
        </Section>
      )}

      {/* ── Mera Sawaal — 2 Daily Problems ────────────── */}
      <Section title={<><Target size={16} weight="duotone" className="inline text-app-blue" /> {ui.todaysChallenge || "My Questions — Today's Challenge"}</>}>
        <p className="text-xs text-app-muted mb-3">
          {ui.realWorldProblem || 'Two real-world problems using examples from your own state and culture'}
        </p>
        {dailyQs.length === 0 ? (
          <button onClick={generateDailyQ} disabled={dailyQLoad} className="primary-btn">
            {dailyQLoad ? <><DiceFive size={14} weight="fill" className="inline" /> {ui.generating || 'Generating'}…</> : (ui.getTodaysProblem || <><DiceFive size={14} weight="fill" className="inline" /> Get Today's Problems</>)}
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
                    className="primary-btn !bg-app-yellow !from-app-yellow !to-app-yellow text-app-bg"
                  >
                    {dailyXpAwarded.show?.[idx] ? (ui.showSolution || <><Lightbulb size={14} weight="fill" className="inline" /> Show Solution</>) : (ui.showSolutionXp?.replace('8', '4') || <><Lightbulb size={14} weight="fill" className="inline" /> Show Solution (+4 XP)</>)}
                  </button>
                ) : (
                  <div className="bg-app-green/10 border border-app-green/20 rounded-xl p-3.5">
                    <div className="text-xs font-bold text-app-green mb-1.5 flex items-center gap-1"><CheckCircle size={14} weight="fill" /> {ui.solution || 'Solution'}</div>
                    <p className="text-[13px] text-app-text leading-[1.7] whitespace-pre-wrap m-0">{q.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Continue Learning ────────────────────────────────── */}
      {lastTab && (
        <Section title={`📚 ${ui.continueLearning || 'Continue Learning'}`}>
          <button
            onClick={() => goWithTrack(lastTab, 'continue_learning')}
            className="w-full rounded-[14px] py-3.5 px-4 flex items-center justify-between cursor-pointer font-[Sora,sans-serif] border bg-app-card2 border-app-blue/30 hover:border-app-blue/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {lastTab === 'notebook' && <Notebook size={24} weight="duotone" className="text-app-blue" />}
                {lastTab === 'labs' && <Flask size={24} weight="duotone" className="text-app-green" />}
                {lastTab === 'squads' && <UsersThree size={24} weight="duotone" className="text-app-blue" />}
                {lastTab === 'mistakes' && <Brain size={24} weight="duotone" className="text-app-red" />}
                {lastTab === 'battles' && <Sword size={24} weight="duotone" className="text-app-orange" />}
                {!['notebook','labs','squads','mistakes','battles'].includes(lastTab) && <MapPin size={24} weight="duotone" className="text-app-muted" />}
              </span>
              <div>
                <div className="text-[13px] font-bold text-app-text">
                  {lastTab === 'notebook' && (ui.notebookTab?.replace(/^📓\s*/, '') || 'Notebook')}
                  {lastTab === 'labs' && (ui.labsTab?.replace(/^🧪\s*/, '') || 'Labs')}
                  {lastTab === 'squads' && (ui.sathiTab?.replace(/^🤝\s*/, '') || 'Study Squads')}
                  {lastTab === 'mistakes' && (ui.bhoolTab?.replace(/^📛\s*/, '') || 'Mistakes')}
                  {lastTab === 'battles' && (ui.muqablaTab?.replace(/^⚔️\s*/, '') || 'Battles')}
                  {lastTab === 'learntv' && (ui.learntvTab?.replace(/^📺\s*/, '') || 'Learn TV')}
                  {!['notebook','labs','squads','mistakes','battles','learntv'].includes(lastTab) && lastTab}
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
        <Section title={<span className="flex items-center gap-1.5"><Bell size={16} weight="fill" className="text-app-yellow" /> {ui.notifications || 'Notifications'}</span>}>
          <div className="flex flex-col gap-2">
            {pendingBattles.slice(0, 3).map((battle, i) => (
              <button
                key={battle.id || i}
                onClick={() => goWithTrack('battles', 'pending_battle_notification', { battle_id: battle.id || '' })}
                className="w-full rounded-xl py-3 px-3.5 flex items-center gap-3 cursor-pointer font-[Sora,sans-serif] text-left border bg-app-red/10 border-app-red/30"
              >
                <span className="text-lg"><Sword size={20} weight="duotone" className="text-app-orange" /></span>
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

      {/* ── Recent Practice Snapshot ────────────────────────── */}
      {recentPractice.length > 0 && (
        <Section title={<><Lightning size={16} weight="duotone" className="inline text-app-yellow" /> {ui.recentPractice || 'Recent Practice Snapshot'}</>}>
          <div className="flex flex-col gap-2">
            {recentPractice.map((item, idx) => (
              <div key={`${item.type}-${idx}`} className="bg-app-card2 border border-app-border rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[12px] font-bold text-app-text truncate">
                    {(item.subject || ui.general || 'General')} · {formatActivityType(item.type, ui)}
                  </div>
                  <div className="text-[11px] text-app-muted truncate">
                    {item.chapter_name || item.difficulty || item.result || (ui.practice || 'Practice')}
                  </div>
                </div>
                <div className="text-[12px] font-black text-app-green shrink-0">
                  {typeof item.score === 'number' && typeof item.total === 'number' ? `${item.score}/${item.total}` : '—'}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────

function getTimeGreeting(lang) {
  const h = new Date().getHours()
  const ui = li(lang)
  if (h < 12) return { text: ui.goodMorning, Icon: Sun, color: '#FFD166' }
  if (h < 17) return { text: ui.goodAfternoon, Icon: CloudSun, color: '#FF9F1C' }
  if (h < 21) return { text: ui.goodEvening, Icon: SunHorizon, color: '#7B9CFF' }
  return { text: ui.lateNightStudy, Icon: Sparkle, color: '#A78BFA' }
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

function Section({ title, children }) {
  return (
    <div className="bg-app-card border border-app-border rounded-[18px] p-4 mb-3.5">
      <h3 className="text-sm font-extrabold text-app-text mb-3">{title}</h3>
      {children}
    </div>
  )
}

function MiniMetric({ label, value, tone = 'green' }) {
  const tones = {
    red: { bg: 'bg-app-red/10', border: 'border-app-red/30', text: 'text-app-red' },
    yellow: { bg: 'bg-app-yellow/10', border: 'border-app-yellow/30', text: 'text-app-yellow' },
    green: { bg: 'bg-app-green/10', border: 'border-app-green/20', text: 'text-app-green' },
  }
  const t = tones[tone] || tones.green

  return (
    <div className={`rounded-xl border ${t.border} ${t.bg} text-center px-2 py-2.5`}>
      <div className={`text-[18px] font-black ${t.text}`}>{value}</div>
      <div className="text-[10px] text-app-muted">{label}</div>
    </div>
  )
}

function QuickLaunch({ label, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-app-border bg-app-card2 hover:border-app-green/30 py-2.5 px-2 flex items-center justify-center gap-1.5 text-[12px] font-bold text-app-text"
    >
      <span className="text-app-green">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function formatActivityType(type, ui) {
  if (type === 'quiz') return ui.quiz || 'Quiz'
  if (type === 'battle') return ui.muqablaTab?.replace(/^⚔️\s*/, '') || 'Battle'
  if (type === 'chapter_quiz') return ui.chapterQuiz || 'Chapter Quiz'
  return type || 'Practice'
}

function estimateDaysToExam(standard, examDateIso) {
  const parsedExamDate = parseOptionalDate(examDateIso)
  if (parsedExamDate) {
    return Math.max(1, Math.ceil((parsedExamDate.getTime() - Date.now()) / 86400000))
  }

  const now = new Date()
  const year = now.getFullYear()
  const std = String(standard || '')

  // Approximation: board exams for Class 10/12 generally around March.
  if (std.includes('10') || std.includes('12')) {
    const currentYearExam = new Date(year, 2, 1)
    const nextExam = now <= currentYearExam ? currentYearExam : new Date(year + 1, 2, 1)
    return Math.max(1, Math.ceil((nextExam.getTime() - now.getTime()) / 86400000))
  }

  // For other classes, default to a medium-horizon cycle.
  return 120
}

function getProfileExamDate(profile) {
  if (!profile || typeof profile !== 'object') return ''
  const candidates = [
    profile.examDate,
    profile.exam_date,
    profile.targetExamDate,
    profile.target_exam_date,
  ]
  const found = candidates.find(Boolean)
  return typeof found === 'string' ? found : ''
}

function parseOptionalDate(value) {
  if (!value || typeof value !== 'string') return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  if (d.getTime() <= Date.now()) return null
  return d
}

function readProfileStudyBudget(profile) {
  if (!profile || typeof profile !== 'object') return 0
  const candidates = [
    profile.dailyStudyMinutes,
    profile.daily_study_minutes,
    profile.studyBudgetMinutes,
    profile.study_budget_minutes,
  ]
  for (const value of candidates) {
    const minutes = Number(value)
    if (Number.isFinite(minutes) && minutes > 0) return minutes
  }
  return 0
}

// Note: primaryBtn, ghostBtn, aiCard classes are defined in index.css
