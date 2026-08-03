import { useState, useEffect, useCallback } from 'react'
import { callAI, parseAIObject, SUBS, getDisplayLang } from '../../shared.js'
import { li } from '../../i18n/index.js'
import { getDeviceId, apiSaveQuizResult, apiGetQuizStats } from '../../api.js'
import { 
  ChartBar, CheckCircle, XCircle, Brain, Lightning, 
  Trophy, Target, ArrowRight, ArrowCounterClockwise,
  Fire, Sparkle, Clock, CaretLeft
} from '@phosphor-icons/react'

const DIFFICULTIES = ["Easy", "Medium", "Hard"]
const QUIZ_LENGTHS = [
  { count: 5, label: "Quick", icon: "⚡", color: "#00E5A0", time: "~3 min" },
  { count: 10, label: "Standard", icon: "📝", color: "#FFD166", time: "~6 min" },
  { count: 15, label: "Challenge", icon: "🔥", color: "#FF6B35", time: "~10 min" },
]

// ── Bhool Curve: track every concept answered in localStorage ─
function _updateBhool(subject, concept, correct) {
  if (!concept) return
  try {
    const data = JSON.parse(localStorage.getItem('eduvyai_bhool') || '{}')
    const key = `${subject}:${concept}`
    const ex = data[key] || { stability: 1, streak: 0 }
    if (correct) {
      ex.streak = (ex.streak || 0) + 1
      ex.stability = Math.min(30, Math.max(1, (ex.stability || 1) * 2))
    } else {
      ex.streak = 0
      ex.stability = 1
    }
    ex.lastReviewed = Date.now()
    ex.concept = concept
    ex.subject = subject
    data[key] = ex
    localStorage.setItem('eduvyai_bhool', JSON.stringify(data))
  } catch {}
}

const ERROR_TYPE_LABELS = {
  CONCEPT_GAP:         { label: "Concept Gap",          color: "#FF6B6B" },
  CALCULATION_ERROR:   { label: "Calculation Error",     color: "#FFD166" },
  MISSING_PREREQUISITE:{ label: "Missing Prerequisite",  color: "#FF6B35" },
  MISREAD_QUESTION:    { label: "Misread Question",      color: "#7B9CFF" },
  CARELESS:            { label: "Careless Mistake",      color: "#6868a0" },
}

// ── Quiz States ──
const QUIZ_STATE = {
  SETUP: 'setup',      // Selecting subject, difficulty, quiz length
  ACTIVE: 'active',    // Answering questions
  SUMMARY: 'summary',  // Showing results
}

export default function QuizLab({ profile, addXp, userId, onBack }) {
  const ui = li(getDisplayLang(profile))
  const uid = userId || getDeviceId()
  // Always use standard-based subjects as the canonical list; profile.subjects may be stale or from wrong class
  const standardSubjects = SUBS[profile.standard] || SUBS['Class 10'] || []
  const subjects = standardSubjects.length > 0 ? standardSubjects 
    : (profile.subjects?.length ? profile.subjects : ['Mathematics', 'Science'])
  
  // Setup state
  const [selSub, setSelSub] = useState(subjects[0] || "")
  const [difficulty, setDiff] = useState("Medium")
  const [quizLength, setQuizLength] = useState(10)
  
  // Quiz state
  const [quizState, setQuizState] = useState(QUIZ_STATE.SETUP)
  const [questions, setQuestions] = useState([])  // All questions for current quiz
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState([])  // { selected, correct, question }
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [startTime, setStartTime] = useState(null)
  const [endTime, setEndTime] = useState(null)
  
  // Galti Doctor
  const [galtiDiag, setGaltiDiag] = useState(null)
  const [galtiLoad, setGaltiLoad] = useState(false)
  
  // Lifetime stats
  const [lifetimeStats, setLifetimeStats] = useState({ correct: 0, total: 0 })

  // Load lifetime stats
  useEffect(() => {
    apiGetQuizStats(uid)
      .then(stats => {
        if (stats && stats[selSub]) {
          setLifetimeStats({ correct: stats[selSub].correct, total: stats[selSub].total })
        } else {
          setLifetimeStats({ correct: 0, total: 0 })
        }
      })
      .catch(() => {})
  }, [selSub, uid])

  // Track asked concepts to avoid repetition
  const [askedConcepts, setAskedConcepts] = useState([])

  // Generate a single question with randomness
  const generateQuestion = useCallback(async () => {
    // Add randomness to avoid same question
    const randomSeed = Math.random().toString(36).slice(2, 8)
    const avoidList = askedConcepts.length > 0 
      ? `\nIMPORTANT: Do NOT ask about these concepts (already asked): ${askedConcepts.join(', ')}. Pick a DIFFERENT topic.`
      : ''
    
    const res = await callAI(
      `Generate a unique ${difficulty} MCQ on ${selSub} for Class ${profile.standard} ${profile.board}.${avoidList}\n[seed:${randomSeed}]`,
      "", [], 3, 800, "quiz_generate"
    )
    const parsed = parseAIObject(res)
    
    // Track this concept to avoid repetition
    if (parsed?.concept) {
      setAskedConcepts(prev => [...prev, parsed.concept])
    }
    
    return parsed
  }, [difficulty, selSub, profile.standard, profile.board, askedConcepts])

  // Start a new quiz
  const startQuiz = async () => {
    setLoading(true)
    setError("")
    setQuestions([])
    setAnswers([])
    setCurrentIndex(0)
    setSelected(null)
    setGaltiDiag(null)
    setStartTime(Date.now())
    setEndTime(null)
    setAskedConcepts([])  // Reset asked concepts for new quiz
    
    // Generate first question
    const q = await generateQuestion()
    if (q?.q && q?.o?.length === 4) {
      setQuestions([q])
      setQuizState(QUIZ_STATE.ACTIVE)
    } else {
      setError(ui.couldNotGenerate || "Could not generate question. Try again.")
    }
    setLoading(false)
  }

  // Answer current question
  const answerQuestion = async (letter) => {
    if (selected) return
    setSelected(letter)
    setGaltiDiag(null)
    
    const currentQ = questions[currentIndex]
    const isCorrect = letter === currentQ.c
    
    // Record answer
    const newAnswer = { selected: letter, correct: isCorrect, question: currentQ }
    setAnswers(prev => [...prev, newAnswer])
    
    // XP and Bhool tracking
    addXp(isCorrect ? 5 : 1)
    _updateBhool(selSub, currentQ.concept, isCorrect)
    
    // Persist to backend
    apiSaveQuizResult(uid, {
      subject: selSub,
      difficulty,
      correct: isCorrect ? 1 : 0,
      total: 1,
    }).catch(() => {})
  }

  // Move to next question or finish
  const nextQuestion = async () => {
    const nextIndex = currentIndex + 1
    
    // Check if quiz is complete
    if (nextIndex >= quizLength) {
      setEndTime(Date.now())
      setQuizState(QUIZ_STATE.SUMMARY)
      return
    }
    
    setLoading(true)
    setSelected(null)
    setGaltiDiag(null)
    
    // Generate next question if needed
    if (nextIndex >= questions.length) {
      const q = await generateQuestion()
      if (q?.q && q?.o?.length === 4) {
        setQuestions(prev => [...prev, q])
      }
    }
    
    setCurrentIndex(nextIndex)
    setLoading(false)
  }

  // Diagnose error
  const diagnoseError = async () => {
    const currentQ = questions[currentIndex]
    if (!currentQ || selected === currentQ.c) return
    
    setGaltiLoad(true)
    const opts = ["A","B","C","D"]
    const correctOpt = currentQ.o[opts.indexOf(currentQ.c)] || ""
    const wrongOpt = currentQ.o[opts.indexOf(selected)] || ""
    
    const res = await callAI(
      `Question: "${currentQ.q}"\nCorrect answer: ${currentQ.c}) ${correctOpt}\nStudent chose: ${selected}) ${wrongOpt}\nDiagnose my error.`,
      "", [], 2, 500, "quiz_diagnose"
    )
    const parsed = parseAIObject(res)
    setGaltiDiag(parsed?.type ? parsed : { type: "CONCEPT_GAP", diagnosis: res, fix: "", similar: "" })
    setGaltiLoad(false)
  }

  // Reset to setup
  const resetQuiz = () => {
    setQuizState(QUIZ_STATE.SETUP)
    setQuestions([])
    setAnswers([])
    setCurrentIndex(0)
    setSelected(null)
    setError("")
    setGaltiDiag(null)
    setAskedConcepts([])
  }

  // Option styling
  const getOptionClass = (letter) => {
    const currentQ = questions[currentIndex]
    if (!currentQ) return ""
    const base = "w-full bg-app-card border-[1.5px] border-app-border rounded-xl px-3.5 py-3 text-[13px] font-medium text-app-text text-left transition-all duration-200 active:scale-[0.99]"
    if (!selected) return `${base} cursor-pointer hover:border-app-green/30`
    if (letter === currentQ.c) return "w-full rounded-xl px-3.5 py-3 text-[13px] font-bold text-left bg-app-green/15 border-[1.5px] border-app-green text-app-green cursor-default"
    if (letter === selected && letter !== currentQ.c) return "w-full rounded-xl px-3.5 py-3 text-[13px] font-medium text-left bg-app-red/10 border-[1.5px] border-app-red text-app-red cursor-default"
    return "w-full rounded-xl px-3.5 py-3 text-[13px] font-medium text-left bg-app-card border-[1.5px] border-app-border text-app-text opacity-40 cursor-default"
  }

  // Calculate stats
  const correctCount = answers.filter(a => a.correct).length
  const accuracy = answers.length ? Math.round((correctCount / answers.length) * 100) : 0
  const accuracyColor = accuracy >= 70 ? "#00E5A0" : accuracy >= 40 ? "#FFD166" : "#FF6B6B"
  const timeTaken = endTime && startTime ? Math.round((endTime - startTime) / 1000) : 0
  const timePerQ = answers.length ? Math.round(timeTaken / answers.length) : 0

  // ── SETUP SCREEN ──
  if (quizState === QUIZ_STATE.SETUP) {
    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="bg-app-card border-b border-app-border px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={onBack} className="w-9 h-9 rounded-xl bg-app-card border border-app-border flex items-center justify-center cursor-pointer hover:border-app-green/30 active:scale-95 transition-all">
            <CaretLeft size={18} weight="bold" className="text-app-text" />
          </button>
          <span className="text-[15px] font-extrabold text-app-text">{ui.quizArenaTitle || 'Quiz Arena'}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-6">
          {/* Title */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-app-green/15 flex items-center justify-center mx-auto mb-3">
              <Lightning size={32} weight="duotone" className="text-app-green" />
            </div>
            <h2 className="text-xl font-extrabold text-app-text mb-1">{ui.startQuizTitle || 'Start a Quiz'}</h2>
            <p className="text-[13px] text-app-muted">{ui.chooseSettings || 'Choose your quiz settings'}</p>
          </div>

          {/* Subject Selection */}
          <div className="mb-5">
            <label className="text-xs font-bold text-app-muted mb-2 block">{ui.selectSubject || 'SUBJECT'}</label>
            <div className="flex flex-wrap gap-1.5">
              {subjects.map(s => (
                <button key={s} onClick={() => setSelSub(s)}
                  className={`rounded-2xl px-3.5 py-2 text-xs font-medium cursor-pointer transition-all active:scale-95 ${
                    selSub === s 
                      ? 'bg-app-green/15 border border-app-green text-app-green font-bold' 
                      : 'bg-app-card border border-app-border text-app-muted hover:text-app-text'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Selection */}
          <div className="mb-5">
            <label className="text-xs font-bold text-app-muted mb-2 block">{ui.difficulty || 'DIFFICULTY'}</label>
            <div className="flex gap-2">
              {DIFFICULTIES.map(d => {
                const dColor = d === "Easy" ? "#00E5A0" : d === "Hard" ? "#FF6B6B" : "#FFD166"
                const isActive = difficulty === d
                return (
                  <button key={d} onClick={() => setDiff(d)} 
                    className="flex-1 rounded-xl py-2.5 text-xs font-medium cursor-pointer transition-all active:scale-95"
                    style={{ 
                      background: isActive ? `${dColor}18` : undefined, 
                      border: `1.5px solid ${isActive ? dColor : 'rgba(255,255,255,0.08)'}`, 
                      color: isActive ? dColor : '#6868a0', 
                      fontWeight: isActive ? 700 : 500 
                    }}>
                    {d}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quiz Length Selection */}
          <div className="mb-6">
            <label className="text-xs font-bold text-app-muted mb-2 block">{ui.quizLength || 'QUIZ LENGTH'}</label>
            <div className="grid grid-cols-3 gap-2">
              {QUIZ_LENGTHS.map(({ count, label, icon, color, time }) => {
                const isActive = quizLength === count
                return (
                  <button key={count} onClick={() => setQuizLength(count)}
                    className="rounded-xl py-3 px-2 text-center cursor-pointer transition-all active:scale-95"
                    style={{ 
                      background: isActive ? `${color}18` : 'rgba(255,255,255,0.02)', 
                      border: `1.5px solid ${isActive ? color : 'rgba(255,255,255,0.08)'}`,
                    }}>
                    <div className="text-xl mb-1">{icon}</div>
                    <div className="text-xs font-bold" style={{ color: isActive ? color : '#e6e6e6' }}>{label}</div>
                    <div className="text-[10px] text-app-muted">{count} Q · {time}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Lifetime Stats */}
          {lifetimeStats.total > 0 && (
            <div className="bg-app-card border border-app-border rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
              <Trophy size={24} weight="duotone" className="text-app-yellow" />
              <div className="flex-1">
                <div className="text-xs text-app-muted">Your {selSub} Stats</div>
                <div className="text-sm font-bold text-app-text">
                  {lifetimeStats.correct}/{lifetimeStats.total} correct · {Math.round((lifetimeStats.correct / lifetimeStats.total) * 100)}% accuracy
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-app-red text-[13px] mb-4">{error}</p>}

          {/* Start Button */}
          <button onClick={startQuiz} disabled={loading}
            className="w-full bg-gradient-to-r from-app-green to-[#33cc88] text-app-bg text-[14px] font-extrabold rounded-xl py-3.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] transition-all flex items-center justify-center gap-2">
            {loading ? (
              <>{ui.generatingQ || 'Generating...'}</>
            ) : (
              <>
                <Lightning size={18} weight="fill" />
                {ui.startQuiz || 'Start Quiz'} ({quizLength} Questions)
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  // ── SUMMARY SCREEN ──
  if (quizState === QUIZ_STATE.SUMMARY) {
    const grade = accuracy >= 90 ? 'A+' : accuracy >= 80 ? 'A' : accuracy >= 70 ? 'B' : accuracy >= 60 ? 'C' : accuracy >= 50 ? 'D' : 'F'
    const gradeColor = accuracy >= 70 ? "#00E5A0" : accuracy >= 50 ? "#FFD166" : "#FF6B6B"
    const wrongAnswers = answers.filter(a => !a.correct)
    
    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="bg-app-card border-b border-app-border px-4 py-3 flex items-center gap-2.5 shrink-0">
          <span className="text-[15px] font-extrabold text-app-text">{ui.quizComplete || 'Quiz Complete!'}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-6">
          {/* Score Circle */}
          <div className="text-center mb-6">
            <div className="relative w-28 h-28 mx-auto mb-4">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <circle cx="56" cy="56" r="50" fill="none" stroke={accuracyColor} strokeWidth="8" 
                  strokeLinecap="round" strokeDasharray={`${accuracy * 3.14} 314`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black" style={{ color: accuracyColor }}>{accuracy}%</span>
                <span className="text-xs text-app-muted">Accuracy</span>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: `${gradeColor}20` }}>
              <span className="text-xl font-black" style={{ color: gradeColor }}>Grade: {grade}</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="bg-app-card border border-app-border rounded-xl p-3 text-center">
              <CheckCircle size={20} weight="duotone" className="text-app-green mx-auto mb-1" />
              <div className="text-lg font-bold text-app-text">{correctCount}</div>
              <div className="text-[10px] text-app-muted">Correct</div>
            </div>
            <div className="bg-app-card border border-app-border rounded-xl p-3 text-center">
              <XCircle size={20} weight="duotone" className="text-app-red mx-auto mb-1" />
              <div className="text-lg font-bold text-app-text">{answers.length - correctCount}</div>
              <div className="text-[10px] text-app-muted">Wrong</div>
            </div>
            <div className="bg-app-card border border-app-border rounded-xl p-3 text-center">
              <Clock size={20} weight="duotone" className="text-app-blue mx-auto mb-1" />
              <div className="text-lg font-bold text-app-text">{timePerQ}s</div>
              <div className="text-[10px] text-app-muted">Per Q</div>
            </div>
          </div>

          {/* XP Earned */}
          <div className="bg-gradient-to-r from-app-yellow/15 to-app-orange/15 border border-app-yellow/30 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
            <Sparkle size={24} weight="duotone" className="text-app-yellow" />
            <div>
              <div className="text-sm font-bold text-app-text">+{correctCount * 5 + (answers.length - correctCount)} XP Earned</div>
              <div className="text-xs text-app-muted">Keep practicing to level up!</div>
            </div>
          </div>

          {/* Wrong Answers Review */}
          {wrongAnswers.length > 0 && (
            <div className="mb-5">
              <h3 className="text-sm font-bold text-app-text mb-3 flex items-center gap-2">
                <Brain size={18} weight="duotone" className="text-app-orange" />
                {ui.reviewMistakes || 'Review Your Mistakes'}
              </h3>
              <div className="space-y-2">
                {wrongAnswers.slice(0, 3).map((a, i) => (
                  <div key={i} className="bg-app-card border border-app-border rounded-xl p-3">
                    <div className="text-[11px] font-bold text-app-blue bg-app-blue/10 rounded-md px-2 py-0.5 w-fit mb-2">
                      {a.question.concept}
                    </div>
                    <p className="text-[12px] text-app-text mb-2 line-clamp-2">{a.question.q}</p>
                    <div className="text-[11px]">
                      <span className="text-app-red">You: {a.selected}</span>
                      <span className="text-app-muted mx-2">·</span>
                      <span className="text-app-green">Correct: {a.question.c}</span>
                    </div>
                  </div>
                ))}
                {wrongAnswers.length > 3 && (
                  <p className="text-xs text-app-muted text-center">+{wrongAnswers.length - 3} more mistakes to review</p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button onClick={onBack}
              className="flex-1 bg-app-card border border-app-border text-app-text text-[13px] font-bold rounded-xl py-3 cursor-pointer hover:bg-white/[0.08] active:scale-[0.99] transition-all flex items-center justify-center gap-2">
              {ui.exitLab || 'Exit'}
            </button>
            <button onClick={resetQuiz}
              className="flex-1 bg-gradient-to-r from-app-green to-[#33cc88] text-app-bg text-[13px] font-extrabold rounded-xl py-3 cursor-pointer active:scale-[0.99] transition-all flex items-center justify-center gap-2">
              <ArrowCounterClockwise size={16} weight="bold" />
              {ui.playAgain || 'Play Again'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── ACTIVE QUIZ ──
  const currentQ = questions[currentIndex]
  const progress = ((currentIndex + (selected ? 1 : 0)) / quizLength) * 100

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header with Progress */}
      <div className="bg-app-card border-b border-app-border px-4 py-3 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-bold text-app-muted">
            Question {currentIndex + 1} of {quizLength}
          </span>
          <span className="text-[13px] font-bold" style={{ color: accuracyColor }}>
            {correctCount}/{answers.length} correct
          </span>
        </div>
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full bg-app-green rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-6">
        {loading && !currentQ ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Lightning size={40} weight="duotone" className="text-app-green mb-3 animate-pulse" />
            <p className="text-[13px] text-app-muted">{ui.generatingQ || 'Generating question...'}</p>
          </div>
        ) : currentQ ? (
          <div className="flex flex-col gap-3">
            {/* Concept tag */}
            <div className="text-[11px] font-bold text-app-blue bg-app-blue/10 rounded-md px-2.5 py-1 w-fit">
              {currentQ.concept}
            </div>

            {/* Question */}
            <div className="bg-app-card border border-app-border rounded-2xl p-4 text-sm text-app-text leading-relaxed font-semibold">
              {currentQ.q}
            </div>

            {/* Options */}
            <div className="flex flex-col gap-2">
              {currentQ.o?.map((opt, i) => {
                const letter = ["A", "B", "C", "D"][i]
                return (
                  <button key={letter} onClick={() => answerQuestion(letter)} className={getOptionClass(letter)}>
                    <span className="font-bold mr-2">{letter}.</span> {opt}
                  </button>
                )
              })}
            </div>

            {/* Explanation after answering */}
            {selected && (
              <>
                <div className={`rounded-xl p-3.5 border ${selected === currentQ.c ? 'bg-app-green/10 border-app-green/25' : 'bg-app-red/10 border-app-red/25'}`}>
                  <div className={`text-xs font-bold mb-1.5 flex items-center gap-1.5 ${selected === currentQ.c ? 'text-app-green' : 'text-app-red'}`}>
                    {selected === currentQ.c 
                      ? <><CheckCircle size={16} weight="fill" /> {ui.correctLabel || 'Correct!'}</>
                      : <><XCircle size={16} weight="fill" /> {ui.incorrectLabel || 'Incorrect'} — Correct: {currentQ.c}</>}
                  </div>
                  <p className="text-[13px] text-app-text leading-relaxed">{currentQ.e}</p>
                </div>

                {/* Galti Doctor for wrong answers */}
                {selected !== currentQ.c && (
                  <div className="flex flex-col gap-2">
                    {!galtiDiag && !galtiLoad && (
                      <button onClick={diagnoseError}
                        className="bg-app-orange/10 border border-app-orange/25 rounded-xl px-3.5 py-2.5 w-full text-[13px] font-bold text-app-orange cursor-pointer text-left flex items-center gap-2 hover:bg-app-orange/15 active:scale-[0.99] transition-all">
                        <span className="text-lg">🩺</span>
                        <div>
                          <div>{ui.mistakeDoctor || 'Mistake Doctor'}</div>
                          <div className="text-[11px] font-medium text-app-muted">{ui.whyWrongQuiz || 'Understand why you got it wrong'}</div>
                        </div>
                      </button>
                    )}
                    {galtiLoad && (
                      <div className="text-center text-app-muted text-xs py-3.5">{ui.diagnosingMistake || 'Diagnosing...'}</div>
                    )}
                    {galtiDiag && (() => {
                      const typeInfo = ERROR_TYPE_LABELS[galtiDiag.type] || { label: galtiDiag.type, color: "#6868a0" }
                      return (
                        <div className="rounded-xl p-3.5 border" style={{ background: `${typeInfo.color}10`, borderColor: `${typeInfo.color}30` }}>
                          <div className="flex items-center gap-2 mb-2.5">
                            <span className="text-lg">🩺</span>
                            <span className="text-[13px] font-extrabold" style={{ color: typeInfo.color }}>{ui.mistakeDoctor}</span>
                            <span className="text-[10px] font-bold text-white rounded-md px-2 py-0.5" style={{ background: typeInfo.color }}>
                              {typeInfo.label}
                            </span>
                          </div>
                          <p className="text-[13px] text-app-text leading-relaxed mb-2">
                            <strong>{ui.whatWentWrongLabel || 'What went wrong:'}</strong> {galtiDiag.diagnosis}
                          </p>
                          {galtiDiag.fix && (
                            <p className="text-[13px] text-app-green leading-relaxed mb-2 flex items-start gap-1.5">
                              <CheckCircle size={16} weight="fill" className="shrink-0 mt-0.5" /> 
                              <span><strong>{ui.fixLabel || 'Fix:'}</strong> {galtiDiag.fix}</span>
                            </p>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Next/Finish Button */}
                <button onClick={nextQuestion} disabled={loading}
                  className="w-full bg-gradient-to-r from-app-green to-[#33cc88] text-app-bg text-[13px] font-extrabold rounded-xl py-3 cursor-pointer disabled:opacity-50 active:scale-[0.99] transition-all flex items-center justify-center gap-2">
                  {loading ? (
                    ui.generatingQ || 'Loading...'
                  ) : currentIndex + 1 >= quizLength ? (
                    <><Target size={18} weight="fill" /> {ui.finishQuiz || 'Finish Quiz'}</>
                  ) : (
                    <><ArrowRight size={18} weight="bold" /> {ui.nextQuestion || 'Next Question'}</>
                  )}
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
