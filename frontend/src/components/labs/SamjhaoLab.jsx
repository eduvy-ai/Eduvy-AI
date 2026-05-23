import { useState } from 'react'
import { COLORS, callAI, buildSystemPrompt, parseAIObject, updateBhool } from '../../App.jsx'
import { li } from '../../i18n/index.js'

// ── Feynman Score ring ────────────────────────────────────────
function ScoreRing({ label, value, color }) {
  const r = 28, circ = 2 * Math.PI * r
  const dash = circ * (value / 100)
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={72} height={72} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={36} cy={36} r={r} fill="none" stroke={`${color}20`} strokeWidth={5} />
        <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        <text x={36} y={42} textAnchor="middle" fill={color}
          style={{ fontSize: 15, fontWeight: 900, fontFamily: "Sora,sans-serif", transform: "rotate(90deg)", transformOrigin: "36px 36px" }}>
          {value}%
        </text>
      </svg>
      <div style={{ fontSize: 11, color: COLORS.muted, textAlign: "center", maxWidth: 70 }}>{label}</div>
    </div>
  )
}

export default function SamjhaoLab({ profile, addXp, onBack }) {
  const [phase, setPhase]       = useState("setup")    // setup | explain | result
  const [concept, setConcept]   = useState("")
  const [subject, setSubject]   = useState("")
  const [explanation, setExpl]  = useState("")
  const [score, setScore]       = useState(null)       // scored JSON
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState("")

  // ── Score the student's explanation ──────────────────────────
  const scoreExplanation = async () => {
    if (explanation.trim().split(/\s+/).length < 10) {
      setErr("Please write at least 10 words — explain it as if teaching someone!")
      return
    }
    setErr("")
    setLoading(true)
    const sys = buildSystemPrompt(profile, `You are a learning scientist applying the Feynman Technique.
A Class ${profile.standard} student tried to explain "${concept}" in their own words.
Their explanation: "${explanation}"

Score their understanding across 3 dimensions (0-100 each):
- Accuracy: Are the facts they stated correct?
- Completeness: Did they cover the key points of this concept?
- Simplicity: Did they explain it simply, without unnecessary jargon?

Also identify:
- What they got RIGHT (up to 3 specific points)
- What is MISSING from their explanation (up to 3 key points)
- What they got WRONG or confused (up to 2 points)
- A short gap-lesson: explain ONLY the missing/wrong parts in 3-4 simple sentences

Respond ONLY with this JSON (no markdown):
{
  "accuracy": <0-100>,
  "completeness": <0-100>,
  "simplicity": <0-100>,
  "overall": <0-100>,
  "correct": ["point 1", "point 2"],
  "missing": ["point 1", "point 2"],
  "wrong": ["point 1"],
  "gapLesson": "targeted 3-4 sentence mini-lesson covering only the gaps. Write in ${profile.language}.",
  "concept": "${concept}"
}
ALL feedback text MUST be in ${profile.language} only.`)

    const res = await callAI(
      `Evaluate my explanation of "${concept}" using the Feynman Technique.`,
      sys, [], 2, 600
    )
    const parsed = parseAIObject(res)
    if (parsed?.accuracy !== undefined) {
      setScore(parsed)
      setPhase("result")
      // Update bhool curve: high accuracy = correct understanding
      const correct = (parsed.overall || 0) >= 70
      if (subject) updateBhool(subject, concept, correct)
      addXp(Math.round((parsed.overall || 0) / 10) + 2)
    } else {
      setErr("Could not score your explanation. Please try again.")
    }
    setLoading(false)
  }

  const reset = () => {
    setPhase("setup"); setConcept(""); setSubject("")
    setExpl(""); setScore(null); setErr("")
  }

  const goExplain = () => {
    if (!concept.trim()) { setErr("Please enter a concept to explain."); return }
    setErr("")
    setPhase("explain")
  }

  // ── Styles ────────────────────────────────────────────────────
  const card = {
    background: COLORS.card, border: `1px solid ${COLORS.border}`,
    borderRadius: 16, padding: 16, marginBottom: 14,
  }
  const primaryBtn = {
    background: `linear-gradient(135deg, ${COLORS.blue}, #5a82ff)`,
    border: "none", borderRadius: 14, padding: "14px 20px",
    fontSize: 15, fontWeight: 700, color: "#fff",
    cursor: "pointer", fontFamily: "Sora, sans-serif", width: "100%",
  }
  const ghostBtn = {
    background: "transparent", border: `1px solid ${COLORS.border}`,
    borderRadius: 12, padding: "10px 16px", fontSize: 13,
    color: COLORS.muted, cursor: "pointer", fontFamily: "Sora, sans-serif",
  }

  // ── Phase: SETUP ─────────────────────────────────────────────
  if (phase === "setup") return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 130px)" }}>
      <div style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ ...ghostBtn, padding: "6px 12px" }}>← Back</button>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: COLORS.text }}>🧪 Samjhao Mode</div>
          <div style={{ fontSize: 11, color: COLORS.muted }}>Feynman Technique Score</div>
        </div>
      </div>

      <div style={{ padding: 16, flex: 1 }}>
        {/* Science card */}
        <div style={{ ...card, background: `${COLORS.blue}08`, border: `1px solid ${COLORS.blue}25`, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: COLORS.blue, marginBottom: 8 }}>
            The Feynman Technique
          </div>
          <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7 }}>
            Nobel Prize physicist Richard Feynman's learning rule:{" "}
            <strong style={{ color: COLORS.text }}>
              "If you can't explain it simply, you don't understand it."
            </strong>
            <br /><br />
            Pick any concept. Explain it in your own words as if teaching a friend.
            AI will score your understanding and tell you exactly what's missing.
          </div>
        </div>

        {/* Concept input */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            What concept will you explain?
          </div>
          <input
            value={concept}
            onChange={e => setConcept(e.target.value)}
            placeholder="e.g. Photosynthesis, Newton's 2nd Law, Democracy, Osmosis…"
            style={{
              width: "100%", background: COLORS.card2, border: `1px solid ${COLORS.border}`,
              borderRadius: 12, padding: "12px 14px", fontSize: 14, color: COLORS.text,
              fontFamily: "Sora, sans-serif", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Subject input (optional) */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Subject (optional — for memory tracking)
          </div>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. Science, History, Maths…"
            style={{
              width: "100%", background: COLORS.card2, border: `1px solid ${COLORS.border}`,
              borderRadius: 12, padding: "12px 14px", fontSize: 14, color: COLORS.text,
              fontFamily: "Sora, sans-serif", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Example concepts */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>Try one of these:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["Photosynthesis", "Newton's Laws", "Democracy", "Osmosis", "Compound Interest", "French Revolution"].map(c => (
              <button key={c} onClick={() => setConcept(c)} style={{
                background: COLORS.card2, border: `1px solid ${COLORS.border}`, borderRadius: 20,
                padding: "5px 12px", fontSize: 12, color: COLORS.text,
                cursor: "pointer", fontFamily: "Sora, sans-serif",
              }}>{c}</button>
            ))}
          </div>
        </div>

        {err && <div style={{ color: COLORS.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}
        <button onClick={goExplain} style={primaryBtn}>
          🎤 Start Explaining
        </button>
      </div>
    </div>
  )

  // ── Phase: EXPLAIN ────────────────────────────────────────────
  if (phase === "explain") return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 130px)" }}>
      <div style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={reset} style={{ ...ghostBtn, padding: "6px 12px" }}>← Back</button>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: COLORS.text }}>🧪 Samjhao Mode</div>
          <div style={{ fontSize: 11, color: COLORS.muted }}>{concept}</div>
        </div>
      </div>

      <div style={{ padding: 16, flex: 1 }}>
        {/* Prompt card */}
        <div style={{ ...card, background: `${COLORS.blue}08`, border: `1px solid ${COLORS.blue}30`, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.blue, marginBottom: 6 }}>
            📢 Explain: <span style={{ color: COLORS.text }}>{concept}</span>
          </div>
          <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.6 }}>
            Imagine explaining this to a friend who has never heard of it. Use your own words.
            Don't look it up — just write what you know right now.
          </div>
        </div>

        {/* Explanation textarea */}
        <textarea
          value={explanation}
          onChange={e => setExpl(e.target.value)}
          placeholder={`Explain ${concept} in your own words…`}
          rows={10}
          autoFocus
          style={{
            width: "100%", background: COLORS.card2, border: `1px solid ${COLORS.border}`,
            borderRadius: 14, padding: 14, fontSize: 14, color: COLORS.text,
            fontFamily: "Sora, sans-serif", outline: "none", resize: "vertical",
            lineHeight: 1.7, boxSizing: "border-box",
          }}
        />
        <div style={{ fontSize: 11, color: COLORS.muted, textAlign: "right", marginBottom: 14 }}>
          {explanation.trim().split(/\s+/).filter(Boolean).length} words
        </div>

        {err && <div style={{ color: COLORS.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}

        <button onClick={scoreExplanation} disabled={loading} style={primaryBtn}>
          {loading ? "⏳ Scoring your understanding…" : "🔬 Get My Feynman Score"}
        </button>
      </div>
    </div>
  )

  // ── Phase: RESULT ─────────────────────────────────────────────
  if (phase === "result") {
    const overall = score?.overall ?? 0
    const overallColor = overall >= 75 ? COLORS.green : overall >= 50 ? COLORS.yellow : COLORS.red

    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 130px)" }}>
        <div style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={reset} style={{ ...ghostBtn, padding: "6px 12px" }}>← Try Again</button>
          <div style={{ fontWeight: 800, fontSize: 16, color: COLORS.text }}>🔬 Feynman Score</div>
        </div>

        <div style={{ padding: 16, flex: 1, overflowY: "auto" }}>
          {/* Overall score */}
          <div style={{ textAlign: "center", padding: "20px 0 16px" }}>
            <div style={{
              display: "inline-flex", flexDirection: "column", alignItems: "center",
              background: `${overallColor}12`, border: `2px solid ${overallColor}50`,
              borderRadius: 24, padding: "16px 28px",
            }}>
              <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Understanding Score
              </div>
              <div style={{ fontSize: 44, fontWeight: 900, color: overallColor, lineHeight: 1 }}>{overall}%</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: overallColor, marginTop: 4 }}>
                {overall >= 75 ? "✅ You've got it!" : overall >= 50 ? "⚠️ Almost there" : "📚 Keep studying"}
              </div>
            </div>
          </div>

          {/* 3 dimension rings */}
          <div style={{ ...card }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.text, marginBottom: 14 }}>Dimension Scores</div>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <ScoreRing label="Accuracy" value={score?.accuracy ?? 0} color={COLORS.green} />
              <ScoreRing label="Completeness" value={score?.completeness ?? 0} color={COLORS.blue} />
              <ScoreRing label="Simplicity" value={score?.simplicity ?? 0} color={COLORS.yellow} />
            </div>
          </div>

          {/* What you got right */}
          {(score?.correct || []).length > 0 && (
            <div style={{ ...card, background: `${COLORS.green}08`, border: `1px solid ${COLORS.green}25` }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.green, marginBottom: 8 }}>✅ What you got right</div>
              {score.correct.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                  <span style={{ color: COLORS.green, fontSize: 13, marginTop: 1 }}>•</span>
                  <span style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>{p}</span>
                </div>
              ))}
            </div>
          )}

          {/* What's missing */}
          {(score?.missing || []).length > 0 && (
            <div style={{ ...card, background: `${COLORS.yellow}08`, border: `1px solid ${COLORS.yellow}25` }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.yellow, marginBottom: 8 }}>⚠️ What you missed</div>
              {score.missing.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                  <span style={{ color: COLORS.yellow, fontSize: 13, marginTop: 1 }}>•</span>
                  <span style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>{p}</span>
                </div>
              ))}
            </div>
          )}

          {/* What you got wrong */}
          {(score?.wrong || []).length > 0 && (
            <div style={{ ...card, background: `${COLORS.red}08`, border: `1px solid ${COLORS.red}25` }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.red, marginBottom: 8 }}>❌ Incorrect points</div>
              {score.wrong.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                  <span style={{ color: COLORS.red, fontSize: 13, marginTop: 1 }}>•</span>
                  <span style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>{p}</span>
                </div>
              ))}
            </div>
          )}

          {/* Gap Lesson — only the missing bits */}
          {score?.gapLesson && (
            <div style={{ ...card, background: `${COLORS.blue}08`, border: `1px solid ${COLORS.blue}30` }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.blue, marginBottom: 8 }}>
                🎯 Gap Lesson — just what you missed
              </div>
              <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                {score.gapLesson}
              </div>
            </div>
          )}

          {/* Try again / explain again */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            <button onClick={() => { setExpl(""); setScore(null); setPhase("explain") }} style={primaryBtn}>
              🔄 Explain Again (Improve Score)
            </button>
            <button onClick={reset} style={ghostBtn}>
              ↺ Try a Different Concept
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: COLORS.muted }}>
            +{Math.round((overall) / 10) + 2} XP earned · Bhool curve updated
          </div>
        </div>
      </div>
    )
  }

  return null
}
