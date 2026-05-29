import { useState, useEffect } from 'react'
import { callAI, parseAIObject, SUBS } from '../../shared.js'
import { getDeviceId, apiSaveQuizResult, apiGetQuizStats } from '../../api.js'


const DIFFICULTIES = ["Easy", "Medium", "Hard"]

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

export default function QuizLab({ profile, addXp, userId, onBack }) {
  const uid            = userId || getDeviceId()
  const subjects       = profile.subjects?.length ? profile.subjects : (SUBS[profile.standard] || [])
  const [selSub, setSelSub]         = useState(subjects[0] || "")
  const [difficulty, setDiff]       = useState("Medium")
  const [question, setQuestion]     = useState(null)
  const [loading, setLoading]       = useState(false)
  const [selected, setSelected]     = useState(null)  // "A" | "B" | "C" | "D"
  const [score, setScore]           = useState({ correct: 0, total: 0 })
  const [error, setError]           = useState("")
  // Galti Doctor — error diagnosis
  const [galtiDiag, setGaltiDiag]   = useState(null)
  const [galtiLoad, setGaltiLoad]   = useState(false)

  // Load cumulative stats from backend for the current subject
  useEffect(() => {
    apiGetQuizStats(uid)
      .then(stats => {
        if (stats && stats[selSub]) {
          const s = stats[selSub]
          setScore({ correct: s.correct, total: s.total })
        } else {
          setScore({ correct: 0, total: 0 })
        }
      })
      .catch(() => {})
  }, [selSub])

  const generateQuestion = async () => {
    setLoading(true)
    setQuestion(null)
    setSelected(null)
    setGaltiDiag(null)
    setError("")

    const res = await callAI(
      `Generate a ${difficulty} MCQ on ${selSub} for Class ${profile.standard} ${profile.board}.`,
      "", [], 3, 800, "quiz_generate"
    )
    const parsed = parseAIObject(res)
    if (parsed?.q && parsed?.o?.length === 4) {
      setQuestion(parsed)
    } else {
      setError("Could not generate question. Please try again.")
    }
    setLoading(false)
  }

  const answerQuestion = (letter) => {
    if (selected) return  // already answered
    setSelected(letter)
    setGaltiDiag(null)
    const correct = letter === question.c
    setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }))
    addXp(correct ? 5 : 1)
    _updateBhool(selSub, question.concept, correct)
    // Persist to backend (best-effort)
    apiSaveQuizResult(uid, {
      subject: selSub,
      difficulty,
      correct: correct ? 1 : 0,
      total: 1,
    }).catch(() => {})
  }

  // ── Galti Doctor: diagnose root cause of wrong answer ─────
  const diagnoseError = async () => {
    if (!question || selected === question.c) return
    setGaltiLoad(true)
    setGaltiDiag(null)
    const opts = ["A","B","C","D"]
    const correctOpt = question.o[opts.indexOf(question.c)] || ""
    const wrongOpt   = question.o[opts.indexOf(selected)]   || ""
    const res = await callAI(
      `Question: "${question.q}"\nCorrect answer: ${question.c}) ${correctOpt}\nStudent chose: ${selected}) ${wrongOpt}\nDiagnose my error.`,
      "", [], 2, 500, "quiz_diagnose"
    )
    const parsed = parseAIObject(res)
    setGaltiDiag(parsed?.type ? parsed : { type: "CONCEPT_GAP", diagnosis: res, fix: "", similar: "" })
    setGaltiLoad(false)
  }

  const getOptionClass = (letter) => {
    const base = "w-full bg-app-card border-[1.5px] border-app-border rounded-xl px-3.5 py-3 text-[13px] font-medium text-app-text text-left transition-all duration-200 active:scale-[0.99]"
    if (!selected) return `${base} cursor-pointer hover:border-app-green/30`
    if (letter === question.c) return "w-full rounded-xl px-3.5 py-3 text-[13px] font-bold text-left bg-app-green/15 border-[1.5px] border-app-green text-app-green cursor-default"
    if (letter === selected && letter !== question.c) return "w-full rounded-xl px-3.5 py-3 text-[13px] font-medium text-left bg-app-red/10 border-[1.5px] border-app-red text-app-red cursor-default"
    return "w-full rounded-xl px-3.5 py-3 text-[13px] font-medium text-left bg-app-card border-[1.5px] border-app-border text-app-text opacity-40 cursor-default"
  }

  const accuracy = score.total ? Math.round((score.correct / score.total) * 100) : 0
  const accuracyColor = accuracy >= 70 ? "#00E5A0" : accuracy >= 40 ? "#FFD166" : "#FF6B6B"

  return (
    <div className="flex flex-col min-h-[calc(100vh-130px)]">
      {/* Header */}
      <div className="bg-app-card border-b border-app-border px-4 py-3 flex items-center gap-2.5 shrink-0">
        <button onClick={onBack} className="bg-white/[0.05] border border-app-border text-app-text text-[13px] font-semibold rounded-xl px-3 py-1.5 cursor-pointer hover:bg-white/[0.08] active:scale-95 transition-all">← Back</button>
        <span className="text-[15px] font-extrabold text-app-text">⚡ Quiz Arena</span>
        <div className="ml-auto text-xs text-app-muted">{score.correct}/{score.total} · {accuracy}%</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Score bar */}
        {score.total > 0 && (
          <div className="bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 mb-3.5 flex items-center gap-3">
            <span className="text-xl">📊</span>
            <div className="flex-1">
              <div className="text-xs text-app-muted mb-1">Accuracy</div>
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${accuracy}%`, background: accuracyColor }} />
              </div>
            </div>
            <span className="text-sm font-extrabold" style={{ color: accuracyColor }}>{accuracy}%</span>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-2.5 mb-3.5">
          {/* Subject chips */}
          <div className="flex flex-wrap gap-1.5">
            {subjects.slice(0, 6).map(s => (
              <button key={s} onClick={() => setSelSub(s)}
                className={`rounded-2xl px-3 py-1.5 text-xs font-medium cursor-pointer transition-all active:scale-95 ${selSub === s ? 'bg-app-green/15 border border-app-green text-app-green font-bold' : 'bg-app-card border border-app-border text-app-muted hover:text-app-text'}`}>
                {s}
              </button>
            ))}
          </div>
          {/* Difficulty */}
          <div className="flex gap-2">
            {DIFFICULTIES.map(d => {
              const dColor = d === "Easy" ? "#00E5A0" : d === "Hard" ? "#FF6B6B" : "#FFD166"
              const isActive = difficulty === d
              return (
                <button key={d} onClick={() => setDiff(d)} className="flex-1 rounded-xl py-2 text-xs font-medium cursor-pointer transition-all active:scale-95"
                  style={{ background: isActive ? `${dColor}18` : undefined, border: `1px solid ${isActive ? dColor : 'rgba(255,255,255,0.08)'}`, color: isActive ? dColor : '#6868a0', fontWeight: isActive ? 700 : 500 }}>
                  {d}
                </button>
              )
            })}
          </div>
        </div>

        {/* Generate button */}
        <button onClick={generateQuestion} disabled={loading}
          className="w-full bg-gradient-to-r from-app-green to-[#33cc88] text-app-bg text-[13px] font-extrabold rounded-xl py-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] transition-all">
          {loading ? "Generating…" : "⚡ Generate Question"}
        </button>

        {error && <p className="text-app-red text-[13px] mt-3">{error}</p>}

        {/* Question card */}
        {question && (
          <div className="mt-4 flex flex-col gap-3">
            {/* Concept tag */}
            <div className="text-[11px] font-bold text-app-blue bg-app-blue/10 rounded-md px-2.5 py-1 w-fit">
              {question.concept}
            </div>

            {/* Question */}
            <div className="bg-app-card border border-app-border rounded-2xl p-4 text-sm text-app-text leading-relaxed font-semibold">
              {question.q}
            </div>

            {/* Options */}
            <div className="flex flex-col gap-2">
              {question.o?.map((opt, i) => {
                const letter = ["A", "B", "C", "D"][i]
                return (
                  <button key={letter} onClick={() => answerQuestion(letter)} className={getOptionClass(letter)}>
                    {opt}
                  </button>
                )
              })}
            </div>

            {/* Explanation */}
            {selected && (
              <>
                <div className={`rounded-xl p-3.5 border ${selected === question.c ? 'bg-app-green/10 border-app-green/25' : 'bg-app-red/10 border-app-red/25'}`}>
                  <div className={`text-xs font-bold mb-1.5 ${selected === question.c ? 'text-app-green' : 'text-app-red'}`}>
                    {selected === question.c ? "✅ Correct!" : `❌ Incorrect — Correct answer: ${question.c}`}
                  </div>
                  <p className="text-[13px] text-app-text leading-relaxed">{question.e}</p>
                </div>

                {/* Galti Doctor */}
                {selected !== question.c && (
                  <div className="flex flex-col gap-2">
                    {!galtiDiag && !galtiLoad && (
                      <button onClick={diagnoseError}
                        className="bg-app-orange/10 border border-app-orange/25 rounded-xl px-3.5 py-2.5 w-full text-[13px] font-bold text-app-orange cursor-pointer text-left flex items-center gap-2 hover:bg-app-orange/15 active:scale-[0.99] transition-all">
                        <span className="text-lg">🩺</span>
                        <div>
                          <div>Galti Doctor</div>
                          <div className="text-[11px] font-medium text-app-muted">Why did I get this wrong?</div>
                        </div>
                      </button>
                    )}
                    {galtiLoad && (
                      <div className="text-center text-app-muted text-xs py-3.5">🩺 Diagnosing your mistake…</div>
                    )}
                    {galtiDiag && (() => {
                      const typeInfo = ERROR_TYPE_LABELS[galtiDiag.type] || { label: galtiDiag.type, color: "#6868a0" }
                      return (
                        <div className="rounded-xl p-3.5 border" style={{ background: `${typeInfo.color}10`, borderColor: `${typeInfo.color}30` }}>
                          <div className="flex items-center gap-2 mb-2.5">
                            <span className="text-lg">🩺</span>
                            <span className="text-[13px] font-extrabold" style={{ color: typeInfo.color }}>Galti Doctor</span>
                            <span className="text-[10px] font-bold text-white rounded-md px-2 py-0.5" style={{ background: typeInfo.color }}>
                              {typeInfo.label}
                            </span>
                          </div>
                          <p className="text-[13px] text-app-text leading-relaxed mb-2">
                            <strong>What went wrong:</strong> {galtiDiag.diagnosis}
                          </p>
                          {galtiDiag.fix && (
                            <p className="text-[13px] text-app-green leading-relaxed mb-2">
                              ✅ <strong>Fix:</strong> {galtiDiag.fix}
                            </p>
                          )}
                          {galtiDiag.similar && (
                            <p className="text-xs text-app-muted leading-relaxed italic">
                              🎯 Try this: {galtiDiag.similar}
                            </p>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )}

                <button onClick={generateQuestion} disabled={loading}
                  className="w-full bg-gradient-to-r from-app-green to-[#33cc88] text-app-bg text-[13px] font-extrabold rounded-xl py-3 cursor-pointer disabled:opacity-50 active:scale-[0.99] transition-all">
                  {loading ? "Generating…" : "Next Question →"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
