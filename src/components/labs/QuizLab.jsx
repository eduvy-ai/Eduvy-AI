import { useState, useEffect } from 'react'
import { COLORS, callAI, buildSystemPrompt, parseAIObject, SUBS } from '../../App.jsx'
import { getDeviceId, apiSaveQuizResult, apiGetQuizStats } from '../../api.js'

const DIFFICULTIES = ["Easy", "Medium", "Hard"]

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
    setError("")

    const isEnglishSubject = selSub === 'English' && profile.language !== 'English'
    const langNote = isEnglishSubject
      ? `Write the question and options IN ENGLISH (it is an English language subject). Write the explanation in ${profile.language}.`
      : `Write question, options, and explanation fully in ${profile.language} only.`
    const sys = buildSystemPrompt(profile, `Generate ONE ${difficulty} MCQ for ${profile.standard} ${profile.board} on ${selSub}. ${langNote} Return ONLY valid JSON (no markdown, no extra text): {"q":"...","o":["A) ...","B) ...","C) ...","D) ..."],"c":"A","e":"...","concept":"..."}`)
    const res = await callAI(`Generate a ${difficulty} MCQ on ${selSub} for ${profile.standard} ${profile.board}.`, sys)
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
    const correct = letter === question.c
    setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }))
    addXp(correct ? 5 : 1)
    // Persist to backend (best-effort)
    apiSaveQuizResult(uid, {
      subject: selSub,
      difficulty,
      correct: correct ? 1 : 0,
      total: 1,
    }).catch(() => {})
  }

  const optionStyle = (letter) => {
    const base = {
      width: "100%",
      background: COLORS.card,
      border: `1.5px solid ${COLORS.border}`,
      borderRadius: 12,
      padding: "12px 14px",
      fontSize: 13,
      fontWeight: 500,
      color: COLORS.text,
      cursor: selected ? "default" : "pointer",
      fontFamily: "Sora, sans-serif",
      textAlign: "left",
      transition: "all 0.2s",
    }
    if (!selected) return base
    if (letter === question.c) return { ...base, background: `${COLORS.green}20`, border: `1.5px solid ${COLORS.green}`, color: COLORS.green, fontWeight: 700 }
    if (letter === selected && letter !== question.c) return { ...base, background: `${COLORS.red}15`, border: `1.5px solid ${COLORS.red}`, color: COLORS.red }
    return { ...base, opacity: 0.4 }
  }

  const accuracy = score.total ? Math.round((score.correct / score.total) * 100) : 0

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 130px)" }}>
      {/* Header */}
      <div style={{
        background: COLORS.card,
        borderBottom: `1px solid ${COLORS.border}`,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
      }}>
        <button onClick={onBack} style={backBtn}>← Back</button>
        <span style={{ fontSize: 15, fontWeight: 800, color: COLORS.text }}>🎯 Quiz Arena</span>
        <div style={{ marginLeft: "auto", fontSize: 12, color: COLORS.muted }}>
          {score.correct}/{score.total} · {accuracy}%
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {/* Score bar */}
        {score.total > 0 && (
          <div style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: "10px 14px",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>📊</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 4 }}>Accuracy</div>
              <div style={{ height: 6, background: "#ffffff10", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${accuracy}%`,
                  background: accuracy >= 70 ? COLORS.green : accuracy >= 40 ? COLORS.yellow : COLORS.red,
                  borderRadius: 3,
                  transition: "width 0.3s",
                }} />
              </div>
            </div>
            <span style={{
              fontSize: 14, fontWeight: 800,
              color: accuracy >= 70 ? COLORS.green : accuracy >= 40 ? COLORS.yellow : COLORS.red,
            }}>
              {accuracy}%
            </span>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {/* Subject chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {subjects.slice(0, 6).map(s => (
              <button
                key={s}
                onClick={() => setSelSub(s)}
                style={{
                  background: selSub === s ? `${COLORS.green}20` : COLORS.card,
                  border: `1px solid ${selSub === s ? COLORS.green : COLORS.border}`,
                  borderRadius: 20,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: selSub === s ? 700 : 500,
                  color: selSub === s ? COLORS.green : COLORS.muted,
                  cursor: "pointer",
                  fontFamily: "Sora, sans-serif",
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Difficulty */}
          <div style={{ display: "flex", gap: 8 }}>
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                onClick={() => setDiff(d)}
                style={{
                  flex: 1,
                  background: difficulty === d ? (d === "Easy" ? `${COLORS.green}20` : d === "Hard" ? `${COLORS.red}20` : `${COLORS.yellow}20`) : COLORS.card,
                  border: `1px solid ${difficulty === d ? (d === "Easy" ? COLORS.green : d === "Hard" ? COLORS.red : COLORS.yellow) : COLORS.border}`,
                  borderRadius: 10,
                  padding: "8px 0",
                  fontSize: 12,
                  fontWeight: difficulty === d ? 700 : 500,
                  color: difficulty === d ? (d === "Easy" ? COLORS.green : d === "Hard" ? COLORS.red : COLORS.yellow) : COLORS.muted,
                  cursor: "pointer",
                  fontFamily: "Sora, sans-serif",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button onClick={generateQuestion} disabled={loading} style={primaryBtn}>
          {loading ? "Generating…" : "⚡ Generate Question"}
        </button>

        {error && <p style={{ color: COLORS.red, fontSize: 13, marginTop: 12 }}>{error}</p>}

        {/* Question card */}
        {question && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Concept tag */}
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: COLORS.blue,
              background: `${COLORS.blue}15`,
              borderRadius: 6,
              padding: "3px 10px",
              width: "fit-content",
            }}>
              {question.concept}
            </div>

            {/* Question */}
            <div style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14,
              padding: 16,
              fontSize: 14,
              color: COLORS.text,
              lineHeight: 1.6,
              fontWeight: 600,
            }}>
              {question.q}
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {question.o?.map((opt, i) => {
                const letter = ["A", "B", "C", "D"][i]
                return (
                  <button key={letter} onClick={() => answerQuestion(letter)} style={optionStyle(letter)}>
                    {opt}
                  </button>
                )
              })}
            </div>

            {/* Explanation */}
            {selected && (
              <>
                <div style={{
                  background: selected === question.c ? `${COLORS.green}10` : `${COLORS.red}10`,
                  border: `1px solid ${selected === question.c ? COLORS.green : COLORS.red}30`,
                  borderRadius: 12,
                  padding: 14,
                }}>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: selected === question.c ? COLORS.green : COLORS.red,
                    marginBottom: 6,
                  }}>
                    {selected === question.c ? "✅ Correct!" : `❌ Incorrect — Correct answer: ${question.c}`}
                  </div>
                  <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>{question.e}</p>
                </div>

                <button onClick={generateQuestion} disabled={loading} style={primaryBtn}>
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

const primaryBtn = {
  background: "linear-gradient(135deg, #00E5A0, #33cc88)",
  color: "#04040e",
  border: "none",
  borderRadius: 12,
  padding: "12px 16px",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  width: "100%",
  fontFamily: "Sora, sans-serif",
}

const backBtn = {
  background: "transparent",
  border: "none",
  color: "#6868a0",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "Sora, sans-serif",
  padding: 0,
}
