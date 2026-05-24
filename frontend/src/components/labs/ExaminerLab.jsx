import { useState } from 'react'
import { COLORS, callAI, buildSystemPrompt, parseAIObject } from '../../shared.js'
import { li } from '../../i18n/index.js'

// ── Mark options ──────────────────────────────────────────────
const MARK_OPTIONS = [
  { marks: 1, label: "1 Mark",  desc: "One-liner / definition"   },
  { marks: 2, label: "2 Marks", desc: "Short answer"             },
  { marks: 3, label: "3 Marks", desc: "Paragraph answer"         },
  { marks: 5, label: "5 Marks", desc: "Detailed / diagram based" },
]

function MarksBadge({ awarded, total }) {
  const pct = Math.round((awarded / total) * 100)
  const color = pct >= 80 ? COLORS.green : pct >= 55 ? COLORS.yellow : COLORS.red
  return (
    <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
      <div style={{
        display: "inline-flex", flexDirection: "column", alignItems: "center",
        background: `${color}12`, border: `2px solid ${color}50`,
        borderRadius: 24, padding: "18px 32px",
      }}>
        <div style={{ fontSize: 42, fontWeight: 900, color, lineHeight: 1 }}>{awarded}/{total}</div>
        <div style={{ fontSize: 13, color, fontWeight: 700, marginTop: 4 }}>
          {pct >= 80 ? "🎉 Excellent!" : pct >= 55 ? "👍 Good" : "📚 Needs Work"}
        </div>
        {/* progress bar */}
        <div style={{ width: 140, height: 6, background: `${color}20`, borderRadius: 3, marginTop: 10, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
        </div>
        <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 5 }}>{pct}%</div>
      </div>
    </div>
  )
}

export default function ExaminerLab({ profile, addXp, onBack }) {
  const [phase, setPhase]           = useState("setup")   // setup | question | result
  const [selMarks, setSelMarks]     = useState(3)
  const [topicInput, setTopicInput] = useState("")
  const [qData, setQData]           = useState(null)       // generated question JSON
  const [answer, setAnswer]         = useState("")
  const [result, setResult]         = useState(null)       // grading JSON
  const [loading, setLoading]       = useState(false)
  const [showHint, setShowHint]     = useState(false)
  const [showModel, setShowModel]   = useState(false)
  const [err, setErr]               = useState("")

  // ── Generate board question ──────────────────────────────────
  const generateQuestion = async () => {
    setErr("")
    setLoading(true)
    const sys = buildSystemPrompt(profile, `You are a ${profile.board} board paper-setter for Class ${profile.standard}.
Generate ONE ${selMarks}-mark question EXACTLY as it would appear in a real ${profile.board} board exam paper.
${topicInput ? `Topic: ${topicInput}` : "Pick any topic from their syllabus."}

Respond ONLY with this JSON (no markdown, no explanation):
{
  "question": "the full question text",
  "subject": "subject name",
  "chapter": "chapter or topic name",
  "marks": ${selMarks},
  "keywords": ["keyword1", "keyword2"],
  "hint": "one line hint if student is stuck",
  "modelAnswer": "the ideal complete board answer"
}

Keywords must be the exact terms the board examiner checks for when awarding marks (3-8 keywords).`)
    const res = await callAI(
      `Generate a ${selMarks}-mark board exam question${topicInput ? ` on ${topicInput}` : ""} for Class ${profile.standard} ${profile.board}.`,
      sys, [], 2, 700
    )
    const parsed = parseAIObject(res)
    if (parsed?.question) {
      setQData(parsed)
      setPhase("question")
    } else {
      setErr("Could not generate question. Please try again.")
    }
    setLoading(false)
  }

  // ── Grade student's answer ────────────────────────────────────
  const gradeAnswer = async () => {
    if (answer.trim().split(/\s+/).length < 4) {
      setErr("Please write at least a few words before submitting.")
      return
    }
    setErr("")
    setLoading(true)
    const sys = buildSystemPrompt(profile, `You are a strict but fair ${profile.board} board examiner grading a Class ${profile.standard} student's answer.

Question: ${qData.question}
Total Marks: ${qData.marks}
Expected Keywords: ${(qData.keywords || []).join(", ")}
Student's Answer: ${answer}

Grade EXACTLY like a real board examiner. Be strict on keywords and completeness.
Respond ONLY with this JSON (no markdown):
{
  "awarded": <number>,
  "total": ${qData.marks},
  "breakdown": [
    {"keyword": "term", "found": true/false, "note": "one-line examiner comment"}
  ],
  "missingKeywords": ["keyword1"],
  "strengthNote": "what the student wrote well (1-2 sentences)",
  "presentationNote": "comment on answer structure and length",
  "modelAnswer": "${(qData.modelAnswer || "").replace(/"/g, "'")}"
}`)
    const res = await callAI(`Grade my board exam answer as a strict examiner.`, sys, [], 2, 700)
    const parsed = parseAIObject(res)
    if (parsed?.awarded !== undefined) {
      setResult(parsed)
      setPhase("result")
      const xp = Math.round(((parsed.awarded || 0) / (parsed.total || 1)) * 15) + 3
      addXp(xp)
    } else {
      setErr("Grading failed. Please try again.")
    }
    setLoading(false)
  }

  const reset = () => {
    setPhase("setup"); setQData(null); setAnswer(""); setResult(null)
    setShowHint(false); setShowModel(false); setTopicInput(""); setErr("")
  }

  // ── Styles ────────────────────────────────────────────────────
  const card = {
    background: COLORS.card, border: `1px solid ${COLORS.border}`,
    borderRadius: 16, padding: 16, marginBottom: 14,
  }
  const primaryBtn = {
    background: `linear-gradient(135deg, ${COLORS.green}, #00c48a)`,
    border: "none", borderRadius: 14, padding: "14px 20px",
    fontSize: 15, fontWeight: 700, color: "#04040e",
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
      {/* Header */}
      <div style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ ...ghostBtn, padding: "6px 12px" }}>← Back</button>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: COLORS.text }}>🎯 Marks Hunter</div>
          <div style={{ fontSize: 11, color: COLORS.muted }}>Board Examiner Practice</div>
        </div>
      </div>

      <div style={{ padding: 16, flex: 1 }}>
        {/* Explainer */}
        <div style={{ ...card, background: `${COLORS.green}08`, border: `1px solid ${COLORS.green}25`, marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: COLORS.green, marginBottom: 6 }}>How it works</div>
            AI generates a real <strong style={{ color: COLORS.text }}>{profile.board} board exam question</strong>.
            You write your answer. AI grades it <em>exactly</em> like a real board examiner — showing
            which keywords you hit, which you missed, and what the model answer looks like.
          </div>
        </div>

        {/* Marks selector */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Select Question Type
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {MARK_OPTIONS.map(opt => (
              <button
                key={opt.marks}
                onClick={() => setSelMarks(opt.marks)}
                style={{
                  background: selMarks === opt.marks ? `${COLORS.green}15` : COLORS.card2,
                  border: `1.5px solid ${selMarks === opt.marks ? COLORS.green + "60" : COLORS.border}`,
                  borderRadius: 14, padding: "12px 14px", cursor: "pointer",
                  fontFamily: "Sora, sans-serif", textAlign: "left",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 800, color: selMarks === opt.marks ? COLORS.green : COLORS.text }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Optional topic */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Topic (optional)
          </div>
          <input
            value={topicInput}
            onChange={e => setTopicInput(e.target.value)}
            placeholder="e.g. Photosynthesis, French Revolution, Quadratic Equations…"
            style={{
              width: "100%", background: COLORS.card2, border: `1px solid ${COLORS.border}`,
              borderRadius: 12, padding: "12px 14px", fontSize: 14, color: COLORS.text,
              fontFamily: "Sora, sans-serif", outline: "none", boxSizing: "border-box",
            }}
          />
          <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 5 }}>Leave blank for a random topic from your syllabus</div>
        </div>

        {err && <div style={{ color: COLORS.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}

        <button onClick={generateQuestion} disabled={loading} style={primaryBtn}>
          {loading ? "⏳ Generating question…" : "📝 Generate Board Question"}
        </button>
      </div>
    </div>
  )

  // ── Phase: QUESTION ──────────────────────────────────────────
  if (phase === "question") return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 130px)" }}>
      <div style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={reset} style={{ ...ghostBtn, padding: "6px 12px" }}>← Back</button>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: COLORS.text }}>🎯 Marks Hunter</div>
          <div style={{ fontSize: 11, color: COLORS.muted }}>{qData?.subject} · {qData?.marks} Mark{qData?.marks > 1 ? "s" : ""}</div>
        </div>
      </div>

      <div style={{ padding: 16, flex: 1, overflowY: "auto" }}>
        {/* Question card */}
        <div style={{ ...card, border: `1.5px solid ${COLORS.blue}40`, background: `${COLORS.blue}08` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.blue, background: `${COLORS.blue}20`, borderRadius: 6, padding: "2px 8px" }}>
              {qData?.subject}
            </span>
            <span style={{ fontSize: 11, color: COLORS.muted }}>{qData?.chapter}</span>
            <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 800, color: COLORS.yellow }}>
              [{qData?.marks} mark{qData?.marks > 1 ? "s" : ""}]
            </span>
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, lineHeight: 1.7, margin: 0 }}>
            {qData?.question}
          </p>
        </div>

        {/* Hint */}
        {!showHint ? (
          <button onClick={() => setShowHint(true)} style={{ ...ghostBtn, marginBottom: 14, fontSize: 12 }}>
            💡 Show Hint
          </button>
        ) : (
          <div style={{ ...card, background: `${COLORS.yellow}08`, border: `1px solid ${COLORS.yellow}25`, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: COLORS.yellow, fontWeight: 700, marginBottom: 4 }}>💡 Hint</div>
            <div style={{ fontSize: 13, color: COLORS.text }}>{qData?.hint}</div>
          </div>
        )}

        {/* Answer textarea */}
        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Your Answer
        </div>
        <textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder={`Write your ${qData?.marks}-mark board answer here…`}
          rows={selMarks <= 2 ? 5 : selMarks === 3 ? 8 : 12}
          style={{
            width: "100%", background: COLORS.card2, border: `1px solid ${COLORS.border}`,
            borderRadius: 14, padding: "14px", fontSize: 14, color: COLORS.text,
            fontFamily: "Sora, sans-serif", outline: "none", resize: "vertical",
            lineHeight: 1.7, boxSizing: "border-box",
          }}
        />
        <div style={{ fontSize: 11, color: COLORS.muted, textAlign: "right", marginBottom: 14 }}>
          {answer.trim().split(/\s+/).filter(Boolean).length} words
        </div>

        {err && <div style={{ color: COLORS.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}

        <button onClick={gradeAnswer} disabled={loading} style={primaryBtn}>
          {loading ? "⏳ Grading your answer…" : "🎯 Submit for Grading"}
        </button>
      </div>
    </div>
  )

  // ── Phase: RESULT ────────────────────────────────────────────
  if (phase === "result") {
    const awarded = result?.awarded ?? 0
    const total   = result?.total   ?? qData?.marks ?? 1
    const pct     = Math.round((awarded / total) * 100)
    const mainColor = pct >= 80 ? COLORS.green : pct >= 55 ? COLORS.yellow : COLORS.red

    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 130px)" }}>
        <div style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={reset} style={{ ...ghostBtn, padding: "6px 12px" }}>← Try Again</button>
          <div style={{ fontWeight: 800, fontSize: 16, color: COLORS.text }}>📋 Examiner's Report</div>
        </div>

        <div style={{ padding: 16, flex: 1, overflowY: "auto" }}>
          {/* Big marks badge */}
          <MarksBadge awarded={awarded} total={total} />

          {/* Question recap */}
          <div style={{ ...card, background: `${COLORS.blue}06`, border: `1px solid ${COLORS.blue}20`, marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: COLORS.blue, fontWeight: 700, marginBottom: 4 }}>QUESTION</div>
            <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>{qData?.question}</div>
          </div>

          {/* Keyword Analysis */}
          <div style={{ ...card }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.text, marginBottom: 12 }}>
              🔑 Keyword Analysis
            </div>
            {(result?.breakdown || []).map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                background: item.found ? `${COLORS.green}08` : `${COLORS.red}08`,
                border: `1px solid ${item.found ? COLORS.green + "25" : COLORS.red + "25"}`,
                borderRadius: 10, padding: "8px 12px", marginBottom: 7,
              }}>
                <span style={{ fontSize: 16, marginTop: 1 }}>{item.found ? "✅" : "❌"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: item.found ? COLORS.green : COLORS.red }}>
                    {item.keyword}
                  </div>
                  {item.note && <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{item.note}</div>}
                </div>
              </div>
            ))}
            {(result?.missingKeywords || []).length > 0 && (
              <div style={{ marginTop: 8, padding: "8px 12px", background: `${COLORS.red}08`, border: `1px solid ${COLORS.red}20`, borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.red, marginBottom: 4 }}>Missing Keywords</div>
                <div style={{ fontSize: 13, color: COLORS.text }}>
                  {result.missingKeywords.join(" · ")}
                </div>
              </div>
            )}
          </div>

          {/* Examiner's comments */}
          {result?.strengthNote && (
            <div style={{ ...card, background: `${COLORS.green}08`, border: `1px solid ${COLORS.green}25` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.green, marginBottom: 4 }}>✅ What you did well</div>
              <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>{result.strengthNote}</div>
            </div>
          )}
          {result?.presentationNote && (
            <div style={{ ...card, background: `${COLORS.yellow}08`, border: `1px solid ${COLORS.yellow}25` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.yellow, marginBottom: 4 }}>📋 Presentation</div>
              <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>{result.presentationNote}</div>
            </div>
          )}

          {/* Model Answer toggle */}
          <button
            onClick={() => setShowModel(v => !v)}
            style={{
              ...ghostBtn, width: "100%", marginBottom: 8,
              color: COLORS.blue, borderColor: `${COLORS.blue}40`,
              background: showModel ? `${COLORS.blue}10` : "transparent",
            }}
          >
            {showModel ? "▲ Hide Model Answer" : "📖 Show Model Answer"}
          </button>
          {showModel && (
            <div style={{ ...card, background: `${COLORS.blue}08`, border: `1px solid ${COLORS.blue}25`, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.blue, marginBottom: 6 }}>
                📖 Board Model Answer ({qData?.marks} marks)
              </div>
              <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                {result?.modelAnswer || qData?.modelAnswer}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button onClick={reset} style={{ ...primaryBtn, flex: 1 }}>
              ↺ Try Another Question
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: COLORS.muted }}>
            +{Math.round((awarded / total) * 15) + 3} XP earned
          </div>
        </div>
      </div>
    )
  }

  return null
}
