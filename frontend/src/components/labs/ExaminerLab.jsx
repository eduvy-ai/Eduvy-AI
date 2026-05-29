import { useState } from 'react'
import { callAI, parseAIObject } from '../../shared.js'

// ── Mark options ──────────────────────────────────────────────
const MARK_OPTIONS = [
  { marks: 1, label: "1 Mark",  desc: "One-liner / definition"   },
  { marks: 2, label: "2 Marks", desc: "Short answer"             },
  { marks: 3, label: "3 Marks", desc: "Paragraph answer"         },
  { marks: 5, label: "5 Marks", desc: "Detailed / diagram based" },
]

function MarksBadge({ awarded, total }) {
  const pct = Math.round((awarded / total) * 100)
  const color = pct >= 80 ? "#00E5A0" : pct >= 55 ? "#FFD166" : "#FF6B6B"
  return (
    <div className="text-center py-6">
      <div className="inline-flex flex-col items-center rounded-3xl px-8 py-4.5 border-2"
        style={{ background: `${color}12`, borderColor: `${color}50` }}>
        <div className="text-[42px] font-black leading-none" style={{ color }}>{awarded}/{total}</div>
        <div className="text-[13px] font-bold mt-1" style={{ color }}>
          {pct >= 80 ? "🎉 Excellent!" : pct >= 55 ? "👍 Good" : "📚 Needs Work"}
        </div>
        <div className="w-[140px] h-1.5 rounded-full mt-2.5 overflow-hidden" style={{ background: `${color}20` }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        </div>
        <div className="text-[11px] text-app-muted mt-1.5">{pct}%</div>
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
    const res = await callAI(
      `Generate a ${selMarks}-mark board exam question${topicInput ? ` on ${topicInput}` : ""} for Class ${profile.standard} ${profile.board}.`,
      "", [], 2, 700, "examiner_set"
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
    const res = await callAI(
      `Grade this board exam answer:\n\nQuestion: ${qData.question}\nTotal Marks: ${qData.marks}\nExpected Keywords: ${(qData.keywords || []).join(", ")}\nStudent's Answer: ${answer}`,
      "", [], 2, 700, "examiner_grade"
    )
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

  if (phase === "setup") return (
    <div className="flex flex-col min-h-[calc(100vh-130px)]">
      <div className="bg-app-card border-b border-app-border px-4 py-3.5 flex items-center gap-3">
        <button onClick={onBack} className="bg-white/[0.05] border border-app-border text-app-text text-[13px] font-semibold rounded-xl px-3 py-1.5 cursor-pointer hover:bg-white/[0.08] active:scale-95 transition-all">← Back</button>
        <div>
          <div className="font-extrabold text-base text-app-text">🎯 Marks Hunter</div>
          <div className="text-[11px] text-app-muted">Board Examiner Practice</div>
        </div>
      </div>
      <div className="p-4 flex-1">
        <div className="bg-app-green/[0.05] border border-app-green/20 rounded-2xl p-4 mb-5">
          <div className="text-[15px] font-extrabold text-app-green mb-1.5">How it works</div>
          <div className="text-[13px] text-app-text leading-[1.7]">
            AI generates a real <strong>{profile.board} board exam question</strong>.
            You write your answer. AI grades it <em>exactly</em> like a real board examiner — showing
            which keywords you hit, which you missed, and what the model answer looks like.
          </div>
        </div>
        <div className="mb-5">
          <div className="text-[13px] font-bold text-app-muted mb-2.5 uppercase tracking-wide">Select Question Type</div>
          <div className="grid grid-cols-2 gap-2.5">
            {MARK_OPTIONS.map(opt => (
              <button key={opt.marks} onClick={() => setSelMarks(opt.marks)}
                className={`rounded-2xl p-3 cursor-pointer text-left transition-all active:scale-[0.98] border-[1.5px] ${selMarks === opt.marks ? 'bg-app-green/10 border-app-green/40' : 'bg-app-card2 border-app-border'}`}>
                <div className={`text-[15px] font-extrabold ${selMarks === opt.marks ? 'text-app-green' : 'text-app-text'}`}>{opt.label}</div>
                <div className="text-[11px] text-app-muted mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="mb-5">
          <div className="text-[13px] font-bold text-app-muted mb-2 uppercase tracking-wide">Topic (optional)</div>
          <input
            value={topicInput}
            onChange={e => setTopicInput(e.target.value)}
            placeholder="e.g. Photosynthesis, French Revolution, Quadratic Equations…"
            className="w-full bg-app-card2 border border-app-border rounded-xl px-3.5 py-3 text-sm text-app-text outline-none focus:border-app-green/40 transition-colors placeholder:text-app-muted box-border"
          />
          <div className="text-[11px] text-app-muted mt-1.5">Leave blank for a random topic from your syllabus</div>
        </div>
        {err && <div className="text-app-red text-[13px] mb-2.5">{err}</div>}
        <button onClick={generateQuestion} disabled={loading}
          className="w-full bg-gradient-to-r from-app-green to-[#00c48a] text-app-bg text-[15px] font-bold rounded-2xl py-3.5 cursor-pointer disabled:opacity-50 active:scale-[0.99] transition-all">
          {loading ? "⏳ Generating question…" : "📝 Generate Board Question"}
        </button>
      </div>
    </div>
  )

  if (phase === "question") return (
    <div className="flex flex-col min-h-[calc(100vh-130px)]">
      <div className="bg-app-card border-b border-app-border px-4 py-3.5 flex items-center gap-3">
        <button onClick={reset} className="bg-white/[0.05] border border-app-border text-app-text text-[13px] font-semibold rounded-xl px-3 py-1.5 cursor-pointer hover:bg-white/[0.08] active:scale-95 transition-all">← Back</button>
        <div>
          <div className="font-extrabold text-base text-app-text">🎯 Marks Hunter</div>
          <div className="text-[11px] text-app-muted">{qData?.subject} · {qData?.marks} Mark{qData?.marks > 1 ? "s" : ""}</div>
        </div>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="bg-app-blue/[0.05] border-[1.5px] border-app-blue/30 rounded-2xl p-4 mb-3.5">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-[11px] font-bold text-app-blue bg-app-blue/15 rounded-md px-2 py-0.5">{qData?.subject}</span>
            <span className="text-[11px] text-app-muted">{qData?.chapter}</span>
            <span className="ml-auto text-xs font-extrabold text-app-yellow">[{qData?.marks} mark{qData?.marks > 1 ? "s" : ""}]</span>
          </div>
          <p className="text-[15px] font-semibold text-app-text leading-[1.7] m-0">{qData?.question}</p>
        </div>
        {!showHint ? (
          <button onClick={() => setShowHint(true)}
            className="bg-transparent border border-app-border text-app-muted text-xs rounded-xl px-3.5 py-2 cursor-pointer mb-3.5 hover:bg-white/[0.03] active:scale-95 transition-all">
            💡 Show Hint
          </button>
        ) : (
          <div className="bg-app-yellow/[0.05] border border-app-yellow/20 rounded-2xl p-4 mb-3.5">
            <div className="text-xs font-bold text-app-yellow mb-1">💡 Hint</div>
            <div className="text-[13px] text-app-text">{qData?.hint}</div>
          </div>
        )}
        <div className="text-[13px] font-bold text-app-muted mb-2 uppercase tracking-wide">Your Answer</div>
        <textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder={`Write your ${qData?.marks}-mark board answer here…`}
          rows={selMarks <= 2 ? 5 : selMarks === 3 ? 8 : 12}
          className="w-full bg-app-card2 border border-app-border rounded-2xl p-3.5 text-sm text-app-text outline-none resize-y leading-[1.7] box-border focus:border-app-green/40 transition-colors placeholder:text-app-muted"
        />
        <div className="text-[11px] text-app-muted text-right mb-3.5">
          {answer.trim().split(/\s+/).filter(Boolean).length} words
        </div>
        {err && <div className="text-app-red text-[13px] mb-2.5">{err}</div>}
        <button onClick={gradeAnswer} disabled={loading}
          className="w-full bg-gradient-to-r from-app-green to-[#00c48a] text-app-bg text-[15px] font-bold rounded-2xl py-3.5 cursor-pointer disabled:opacity-50 active:scale-[0.99] transition-all">
          {loading ? "⏳ Grading your answer…" : "🎯 Submit for Grading"}
        </button>
      </div>
    </div>
  )

  if (phase === "result") {
    const awarded = result?.awarded ?? 0
    const total   = result?.total   ?? qData?.marks ?? 1
    const pct     = Math.round((awarded / total) * 100)
    const mainColor = pct >= 80 ? "#00E5A0" : pct >= 55 ? "#FFD166" : "#FF6B6B"
    return (
      <div className="flex flex-col min-h-[calc(100vh-130px)]">
        <div className="bg-app-card border-b border-app-border px-4 py-3.5 flex items-center gap-3">
          <button onClick={reset} className="bg-white/[0.05] border border-app-border text-app-text text-[13px] font-semibold rounded-xl px-3 py-1.5 cursor-pointer hover:bg-white/[0.08] active:scale-95 transition-all">← Try Again</button>
          <div className="font-extrabold text-base text-app-text">📋 Examiner's Report</div>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <MarksBadge awarded={awarded} total={total} />
          <div className="bg-app-blue/[0.04] border border-app-blue/15 rounded-2xl p-4 mb-3.5">
            <div className="text-[11px] font-bold text-app-blue mb-1">QUESTION</div>
            <div className="text-[13px] text-app-text leading-relaxed">{qData?.question}</div>
          </div>
          <div className="bg-app-card border border-app-border rounded-2xl p-4 mb-3.5">
            <div className="text-[13px] font-extrabold text-app-text mb-3">🔑 Keyword Analysis</div>
            {(result?.breakdown || []).map((item, i) => (
              <div key={i} className={`flex items-start gap-2.5 rounded-xl px-3 py-2 mb-1.5 border ${item.found ? 'bg-app-green/[0.05] border-app-green/20' : 'bg-app-red/[0.05] border-app-red/20'}`}>
                <span className="text-base mt-0.5">{item.found ? "✅" : "❌"}</span>
                <div className="flex-1">
                  <div className={`text-[13px] font-bold ${item.found ? 'text-app-green' : 'text-app-red'}`}>{item.keyword}</div>
                  {item.note && <div className="text-[11px] text-app-muted mt-0.5">{item.note}</div>}
                </div>
              </div>
            ))}
            {(result?.missingKeywords || []).length > 0 && (
              <div className="mt-2 px-3 py-2 bg-app-red/[0.05] border border-app-red/15 rounded-xl">
                <div className="text-[11px] font-bold text-app-red mb-1">Missing Keywords</div>
                <div className="text-[13px] text-app-text">{result.missingKeywords.join(" · ")}</div>
              </div>
            )}
          </div>
          {result?.strengthNote && (
            <div className="bg-app-green/[0.05] border border-app-green/20 rounded-2xl p-4 mb-3.5">
              <div className="text-xs font-bold text-app-green mb-1">✅ What you did well</div>
              <div className="text-[13px] text-app-text leading-relaxed">{result.strengthNote}</div>
            </div>
          )}
          {result?.presentationNote && (
            <div className="bg-app-yellow/[0.05] border border-app-yellow/20 rounded-2xl p-4 mb-3.5">
              <div className="text-xs font-bold text-app-yellow mb-1">📋 Presentation</div>
              <div className="text-[13px] text-app-text leading-relaxed">{result.presentationNote}</div>
            </div>
          )}
          <button onClick={() => setShowModel(v => !v)}
            className={`w-full border rounded-xl py-2.5 text-[13px] font-semibold cursor-pointer mb-2 transition-all active:scale-[0.99] ${showModel ? 'bg-app-blue/10 border-app-blue/40 text-app-blue' : 'bg-transparent border-app-border text-app-muted hover:bg-white/[0.03]'}`}>
            {showModel ? "▲ Hide Model Answer" : "📖 Show Model Answer"}
          </button>
          {showModel && result?.modelAnswer && (
            <div className="bg-app-card border border-app-border rounded-2xl p-4 mb-3.5">
              <div className="text-xs font-bold text-app-muted mb-2">📖 Model Answer</div>
              <div className="text-[13px] text-app-text leading-relaxed whitespace-pre-wrap">{result.modelAnswer}</div>
            </div>
          )}
          <button onClick={reset}
            className="w-full bg-gradient-to-r from-app-green to-[#00c48a] text-app-bg text-[15px] font-bold rounded-2xl py-3.5 cursor-pointer active:scale-[0.99] transition-all mt-2">
            🔄 Try Another Question
          </button>
        </div>
      </div>
    )
  }

  return null
}

