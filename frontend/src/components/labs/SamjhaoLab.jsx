import { useState } from 'react'
import { callAI, parseAIObject, updateBhool } from '../../shared.js'

// ── Feynman Score ring
function ScoreRing({ label, value, color }) {
  const r = 28, circ = 2 * Math.PI * r
  const dash = circ * (value / 100)
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={72} height={72} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={36} cy={36} r={r} fill="none" stroke={`${color}20`} strokeWidth={5} />
        <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        <text x={36} y={42} textAnchor="middle" fill={color}
          style={{ fontSize: 15, fontWeight: 900, fontFamily: "Sora,sans-serif", transform: "rotate(90deg)", transformOrigin: "36px 36px" }}>
          {value}%
        </text>
      </svg>
      <div className="text-[11px] text-app-muted text-center max-w-[70px]">{label}</div>
    </div>
  )
}

export default function SamjhaoLab({ profile, addXp, onBack }) {
  const [phase, setPhase]       = useState("setup")
  const [concept, setConcept]   = useState("")
  const [subject, setSubject]   = useState("")
  const [explanation, setExpl]  = useState("")
  const [score, setScore]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState("")

  const scoreExplanation = async () => {
    if (explanation.trim().split(/\s+/).length < 10) {
      setErr("Please write at least 10 words — explain it as if teaching someone!")
      return
    }
    setErr("")
    setLoading(true)
    const res = await callAI(
      `Evaluate my explanation of "${concept}" for Class ${profile.standard} ${profile.board}.\n\nMy explanation: "${explanation}"`,
      "", [], 2, 600, "samjhao"
    )
    const parsed = parseAIObject(res)
    if (parsed?.accuracy !== undefined) {
      setScore(parsed)
      setPhase("result")
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

  if (phase === "setup") return (
    <div className="flex flex-col min-h-[calc(100vh-130px)]">
      <div className="bg-app-card border-b border-app-border px-4 py-3.5 flex items-center gap-3">
        <button onClick={onBack} className="bg-white/[0.05] border border-app-border text-app-text text-[13px] font-semibold rounded-xl px-3 py-1.5 cursor-pointer hover:bg-white/[0.08] active:scale-95 transition-all">← Back</button>
        <div>
          <div className="font-extrabold text-base text-app-text">🧪 Samjhao Mode</div>
          <div className="text-[11px] text-app-muted">Feynman Technique Score</div>
        </div>
      </div>
      <div className="p-4 flex-1">
        <div className="bg-app-blue/[0.05] border border-app-blue/20 rounded-2xl p-4 mb-5">
          <div className="text-sm font-extrabold text-app-blue mb-2">The Feynman Technique</div>
          <div className="text-[13px] text-app-text leading-[1.7]">
            Nobel Prize physicist Richard Feynman's learning rule:{" "}
            <strong>"If you can't explain it simply, you don't understand it."</strong>
            <br /><br />
            Pick any concept. Explain it in your own words as if teaching a friend.
            AI will score your understanding and tell you exactly what's missing.
          </div>
        </div>
        <div className="mb-4">
          <div className="text-[13px] font-bold text-app-muted mb-2 uppercase tracking-wide">What concept will you explain?</div>
          <input
            value={concept}
            onChange={e => setConcept(e.target.value)}
            placeholder="e.g. Photosynthesis, Newton's 2nd Law, Democracy, Osmosis…"
            className="w-full bg-app-card2 border border-app-border rounded-xl px-3.5 py-3 text-sm text-app-text outline-none focus:border-app-blue/40 transition-colors placeholder:text-app-muted box-border"
          />
        </div>
        <div className="mb-5">
          <div className="text-[13px] font-bold text-app-muted mb-2 uppercase tracking-wide">Subject (optional — for memory tracking)</div>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. Science, History, Maths…"
            className="w-full bg-app-card2 border border-app-border rounded-xl px-3.5 py-3 text-sm text-app-text outline-none focus:border-app-blue/40 transition-colors placeholder:text-app-muted box-border"
          />
        </div>
        <div className="mb-5">
          <div className="text-xs text-app-muted mb-2">Try one of these:</div>
          <div className="flex flex-wrap gap-1.5">
            {["Photosynthesis", "Newton's Laws", "Democracy", "Osmosis", "Compound Interest", "French Revolution"].map(c => (
              <button key={c} onClick={() => setConcept(c)}
                className="bg-app-card2 border border-app-border rounded-2xl px-3 py-1.5 text-xs text-app-text cursor-pointer hover:border-app-blue/30 active:scale-95 transition-all">
                {c}
              </button>
            ))}
          </div>
        </div>
        {err && <div className="text-app-red text-[13px] mb-2.5">{err}</div>}
        <button onClick={goExplain}
          className="w-full bg-gradient-to-r from-app-blue to-[#5a82ff] text-white text-[15px] font-bold rounded-2xl py-3.5 cursor-pointer active:scale-[0.99] transition-all">
          🎤 Start Explaining
        </button>
      </div>
    </div>
  )

  if (phase === "explain") return (
    <div className="flex flex-col min-h-[calc(100vh-130px)]">
      <div className="bg-app-card border-b border-app-border px-4 py-3.5 flex items-center gap-3">
        <button onClick={reset} className="bg-white/[0.05] border border-app-border text-app-text text-[13px] font-semibold rounded-xl px-3 py-1.5 cursor-pointer hover:bg-white/[0.08] active:scale-95 transition-all">← Back</button>
        <div>
          <div className="font-extrabold text-base text-app-text">🧪 Samjhao Mode</div>
          <div className="text-[11px] text-app-muted">{concept}</div>
        </div>
      </div>
      <div className="p-4 flex-1">
        <div className="bg-app-blue/[0.05] border border-app-blue/25 rounded-2xl p-4 mb-4">
          <div className="text-sm font-bold text-app-blue mb-1.5">
            📢 Explain: <span className="text-app-text">{concept}</span>
          </div>
          <div className="text-[13px] text-app-muted leading-relaxed">
            Imagine explaining this to a friend who has never heard of it. Use your own words.
            Don't look it up — just write what you know right now.
          </div>
        </div>
        <textarea
          value={explanation}
          onChange={e => setExpl(e.target.value)}
          placeholder={`Explain ${concept} in your own words…`}
          rows={10}
          autoFocus
          className="w-full bg-app-card2 border border-app-border rounded-2xl p-3.5 text-sm text-app-text outline-none resize-y leading-[1.7] box-border focus:border-app-blue/40 transition-colors placeholder:text-app-muted"
        />
        <div className="text-[11px] text-app-muted text-right mb-3.5">
          {explanation.trim().split(/\s+/).filter(Boolean).length} words
        </div>
        {err && <div className="text-app-red text-[13px] mb-2.5">{err}</div>}
        <button onClick={scoreExplanation} disabled={loading}
          className="w-full bg-gradient-to-r from-app-blue to-[#5a82ff] text-white text-[15px] font-bold rounded-2xl py-3.5 cursor-pointer disabled:opacity-50 active:scale-[0.99] transition-all">
          {loading ? "⏳ Scoring your understanding…" : "🔬 Get My Feynman Score"}
        </button>
      </div>
    </div>
  )

  if (phase === "result") {
    const overall = score?.overall ?? 0
    const overallColor = overall >= 75 ? "#00E5A0" : overall >= 50 ? "#FFD166" : "#FF6B6B"
    return (
      <div className="flex flex-col min-h-[calc(100vh-130px)]">
        <div className="bg-app-card border-b border-app-border px-4 py-3.5 flex items-center gap-3">
          <button onClick={reset} className="bg-white/[0.05] border border-app-border text-app-text text-[13px] font-semibold rounded-xl px-3 py-1.5 cursor-pointer hover:bg-white/[0.08] active:scale-95 transition-all">← Try Again</button>
          <div className="font-extrabold text-base text-app-text">🔬 Feynman Score</div>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="text-center py-5">
            <div className="inline-flex flex-col items-center rounded-3xl px-7 py-4 border-2"
              style={{ background: `${overallColor}12`, borderColor: `${overallColor}50` }}>
              <div className="text-[11px] text-app-muted mb-1 uppercase tracking-wide">Understanding Score</div>
              <div className="text-[44px] font-black leading-none" style={{ color: overallColor }}>{overall}%</div>
              <div className="text-[13px] font-bold mt-1" style={{ color: overallColor }}>
                {overall >= 75 ? "✅ You've got it!" : overall >= 50 ? "⚠️ Almost there" : "📚 Keep studying"}
              </div>
            </div>
          </div>
          <div className="bg-app-card border border-app-border rounded-2xl p-4 mb-3.5">
            <div className="text-[13px] font-extrabold text-app-text mb-3.5">Dimension Scores</div>
            <div className="flex justify-around">
              <ScoreRing label="Accuracy"     value={score?.accuracy     ?? 0} color="'#00E5A0'" />
              <ScoreRing label="Completeness" value={score?.completeness ?? 0} color="'#7B9CFF'" />
              <ScoreRing label="Simplicity"   value={score?.simplicity   ?? 0} color="'#FFD166'" />
            </div>
          </div>
          {(score?.correct || []).length > 0 && (
            <div className="bg-app-green/[0.05] border border-app-green/20 rounded-2xl p-4 mb-3.5">
              <div className="text-[13px] font-extrabold text-app-green mb-2">✅ What you got right</div>
              {score.correct.map((p, i) => (
                <div key={i} className="flex gap-2 mb-1.5 items-start">
                  <span className="text-app-green text-[13px] mt-0.5">•</span>
                  <span className="text-[13px] text-app-text leading-relaxed">{p}</span>
                </div>
              ))}
            </div>
          )}
          {(score?.missing || []).length > 0 && (
            <div className="bg-app-yellow/[0.05] border border-app-yellow/20 rounded-2xl p-4 mb-3.5">
              <div className="text-[13px] font-extrabold text-app-yellow mb-2">⚠️ What you missed</div>
              {score.missing.map((p, i) => (
                <div key={i} className="flex gap-2 mb-1.5 items-start">
                  <span className="text-app-yellow text-[13px] mt-0.5">•</span>
                  <span className="text-[13px] text-app-text leading-relaxed">{p}</span>
                </div>
              ))}
            </div>
          )}
          {(score?.wrong || []).length > 0 && (
            <div className="bg-app-red/[0.05] border border-app-red/20 rounded-2xl p-4 mb-3.5">
              <div className="text-[13px] font-extrabold text-app-red mb-2">❌ Incorrect points</div>
              {score.wrong.map((p, i) => (
                <div key={i} className="flex gap-2 mb-1.5 items-start">
                  <span className="text-app-red text-[13px] mt-0.5">•</span>
                  <span className="text-[13px] text-app-text leading-relaxed">{p}</span>
                </div>
              ))}
            </div>
          )}
          {score?.gapLesson && (
            <div className="bg-app-blue/[0.05] border border-app-blue/25 rounded-2xl p-4 mb-3.5">
              <div className="text-[13px] font-extrabold text-app-blue mb-2">🎯 Gap Lesson — just what you missed</div>
              <div className="text-[13px] text-app-text leading-relaxed">{score.gapLesson}</div>
            </div>
          )}
          <div className="flex gap-3 mt-2">
            <button onClick={reset}
              className="flex-1 bg-transparent border border-app-border text-app-text text-[13px] font-semibold rounded-xl py-3 cursor-pointer hover:bg-white/[0.03] active:scale-[0.99] transition-all">
              🔄 Try Again
            </button>
            <button onClick={() => setPhase("explain")}
              className="flex-1 bg-gradient-to-r from-app-blue to-['#5a82ff'] text-white text-[13px] font-bold rounded-xl py-3 cursor-pointer active:scale-[0.99] transition-all">
              ✏️ Improve Answer
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

