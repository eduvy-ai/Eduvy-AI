import { useState, useRef, useEffect } from 'react'
import { COLORS, callAI, buildSystemPrompt, checkStudentQuery } from '../../App.jsx'
import { getStarters, getDisplayLang } from '../../shared.js'
import { apiGetSession, apiSaveToSession } from '../../api.js'
import { li } from '../../i18n/index.js'

// Mode keys and icons - labels come from i18n
const MODE_KEYS = [
  { key: "adaptive",  icon: "🧠", labelKey: "modeAdaptive" },
  { key: "socratic",  icon: "🤔", labelKey: "modeSocratic" },
  { key: "explain",   icon: "💡", labelKey: "modeExplain"  },
  { key: "homework",  icon: "📝", labelKey: "modeHomework" },
  { key: "bahas",     icon: "⚔️",  labelKey: "modeBahas"   },
  { key: "kahani",    icon: "📖", labelKey: "modeKahani"  },
  { key: "kyun",      icon: "💭", labelKey: "modeKyun"    },
  { key: "draw",      icon: "✏️", labelKey: "modeDraw"    },
]

const MODE_INSTRUCTIONS = {
  adaptive: `ADAPTIVE MODE — read the student carefully before responding:
- If the question sounds basic or confused → start with warm reassurance, use a story or relatable analogy, keep sentences short
- If the question shows good understanding → go deeper, use technical terms but explain them as you go, treat the student as an equal
- If you can feel the student is frustrated or stuck → say something like "I can see this part is tricky — let's take it one small step at a time"
- NEVER assume — always match the energy and complexity to what the student actually needs right now`,
  socratic: `SOCRATIC MODE — you are a patient guide, not an answer machine:
- NEVER give the direct answer. Ever.
- Ask 1-2 gentle, guiding questions that nudge the student toward figuring it out themselves
- Sound curious and collaborative: "Hmm, what do you think happens when...?", "What if we looked at it this way..."
- When the student gets close → encourage warmly: "Yes! You're so close — what comes next?"
- Only confirm the answer once the student has actually worked it out themselves
- If they're really stuck after 3 tries → give one small hint, not the full answer`,
  explain:  `EXPLAIN MODE — structure every explanation like natural conversation, not a recited list:
1. One-sentence definition in plain, simple language
2. Warm opener like "Think of it this way..." then an Indian daily life analogy
3. Step-by-step breakdown — one step, one sentence
4. A real India example the student would actually see in daily life
5. A quick ${"{board}"} board exam tip
Make it flow naturally — not mechanical or robotic.`,
  homework: `HOMEWORK MODE — work through it step by step like a teacher sitting right next to the student:
- First, explain what the problem is actually asking in simple words
- List what information we have
- Pick the right formula or method and explain WHY we chose it
- Solve step by step, talking through every step as you go ("now we divide both sides because...")
- Check the answer
- Give ONE similar practice problem at the end
Tone: patient and collaborative — we're doing this together, not just showing the solution`,
  draw:     `DRAW MODE — the student has drawn something and described it to you:
- Warmly acknowledge what they drew: "Nice! This looks like..."
- Identify what the diagram represents
- Walk through each part they drew and explain its role in simple terms
- Point out one thing they drew really well, then gently note anything that might be missing — without making them feel bad
- Give 2 exam-style questions about this diagram that their board might ask`,

  bahas: `BAHAS (DEBATE) MODE — you are a respectful but relentless intellectual challenger:
- The student states a position. YOU must immediately take the OPPOSITE position — always.
- Challenge every argument with evidence: "But this ignores...", "History shows the opposite...", "That assumes..."
- Acknowledge strong points briefly: "Fair point — but what about...?" before your counter
- Never be condescending. Be a tough-but-fair debate coach who genuinely wants them to get sharper
- After 5+ exchanges: step OUT of debate character. Give a balanced 3-line summary of both sides. Then grade their argument: Evidence Used / Logical Consistency / Counter-argument Response — each out of 10
- Works for: History controversies, Science debates, Civics, Ethics, Literature analysis
- Open with: "Interesting position. I respectfully but completely disagree — and here's why..."
- ALWAYS debate in the student's chosen language`,

  kahani: `KAHANI (STORY) MODE — you are a master storyteller who teaches through immersive narrative:
- Convert ANY educational topic into a vivid, cinematic, immersive story
- History: "The year is 1526. I am Babur, and I am terrified. My cavalry of 12,000 faces Lodi's 100,000 soldiers at Panipat..."
- Science: "You have just been shrunk to the size of a glucose molecule. The liver cell wall looms before you like a fortress gate..."
- Chemistry: "Antoine Lavoisier holds his breath and lights the candle for the 200th time. Today he will finally prove what fire really is..."
- Physics: "Imagine you are standing on the surface of a neutron star. Your weight is now 100 billion times what it is on Earth..."
- ALL curriculum-relevant facts MUST be woven naturally into the story — never listed, never bullet-pointed
- End every story with 3 story-quiz questions that test the content from the narrative
- Keep stories to 400–500 words — engaging but completable
- WRITE THE ENTIRE STORY in the student's chosen language`,

  kyun: `KYUN (WHY?) MODE — you reveal the hidden mathematical and scientific truth behind formulas and rules:
- The student asks WHY something works. Your job: reveal the beautiful intuition that school textbooks always skip.
- NEVER just explain WHAT — always reveal WHY it MUST be true
- Use the "origin story": how did ancient scientists or mathematicians first discover or derive this?
- Use visual thought experiments: "Imagine cutting a circle into infinite pizza slices, then rearranging them into a rectangle..."
- Show the mathematical intuition BEFORE the formula — let the formula fall out naturally from the reasoning
- Connect to Indian mathematical heritage where genuinely relevant: Aryabhata (trigonometry, zero, value of pi), Brahmagupta (quadratic equations), Madhava of Sangamagrama (infinite series for pi — 200 years before Europe!), Ramanujan
- Flow naturally through:
  1. Hook: "Most students memorize this formula for years and never know the beautiful reason WHY it works..."
  2. Thought experiment: a visual, physical, or historical reasoning that builds intuition step by step
  3. The Aha! moment: the formula/rule emerges naturally from the reasoning — never from thin air
  4. Challenge: "Now — can you figure out WHY [a closely related formula] works the same way?"
- Write in the student's chosen language`,
}



export default function TutorTab({ profile, userId, addXp, docCtx }) {
  const [mode, setMode]         = useState("adaptive")
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState("")
  const [loading, setLoading]   = useState(false)
  // Draw mode
  const [drawDesc, setDrawDesc] = useState("")
  const [drawLoading, setDrawLoading] = useState(false)
  const canvasRef = useRef(null)
  const drawing   = useRef(false)
  const lastPos   = useRef({ x: 0, y: 0 })
  const chatEndRef = useRef(null)
  // Debate mode (Bahas)
  const [debateVerdict, setDebateVerdict] = useState(false)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── Load chat history from backend when mode changes ────────
  useEffect(() => {
    if (!userId) return
    apiGetSession(userId, `tutor_${mode}`)
      .then(msgs => { if (msgs.length) setMessages(msgs) })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, userId])

  // ── Change mode → clear chat ──────────────────────────────
  const switchMode = m => {
    setMode(m)
    setMessages([])
    setInput("")
    setDebateVerdict(false)
  }

  // ── Get mode-specific system prompt ───────────────────────
  const getModeSystem = () => {
    const instr = (MODE_INSTRUCTIONS[mode] || "").replace("{board}", profile.board)
    const extra = docCtx ? `\nDocument context available: ${docCtx.slice(0, 2000)}` : ""
    return buildSystemPrompt(profile, instr + extra)
  }

  // ── Send message ──────────────────────────────────────────
  const sendMessage = async (overrideInput) => {
    const text = (overrideInput || input).trim()
    if (!text || loading) return
    const safety = checkStudentQuery(text, profile)
    if (safety.blocked) {
      setMessages(m => [...m, { role: "user", content: text }, { role: "assistant", content: safety.message }])
      setInput("")
      return
    }
    const userMsg = { role: "user", content: text }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
    setInput("")
    setLoading(true)
    apiSaveToSession(userId, `tutor_${mode}`, "user", text).catch(() => {})
    try {
      const res = await callAI(text, getModeSystem(), newMsgs)
      setMessages(m => [...m, { role: "assistant", content: res }])
      apiSaveToSession(userId, `tutor_${mode}`, "assistant", res).catch(() => {})
      addXp(2)
    } finally {
      setLoading(false)
    }
  }

  // ── Canvas drawing ────────────────────────────────────────
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDraw = (e) => {
    e.preventDefault()
    drawing.current = true
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    lastPos.current = pos
  }

  const draw = (e) => {
    e.preventDefault()
    if (!drawing.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    const pos = getPos(e, canvas)
    ctx.strokeStyle = COLORS.green
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    lastPos.current = pos
  }

  const stopDraw = (e) => {
    e?.preventDefault()
    drawing.current = false
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const explainDiagram = async () => {
    if (!drawDesc.trim()) { alert("Please describe what you drew"); return }
    setDrawLoading(true)
    const sys = getModeSystem()
    const res = await callAI(`I drew a diagram: ${drawDesc}. Identify it, label each part, explain how it works, and give 2 exam questions about it.`, sys)
    setMessages(m => [...m, { role: "user", content: `[Drew diagram: ${drawDesc}]` }, { role: "assistant", content: res }])
    apiSaveToSession(userId, `tutor_draw`, "user", `[Drew diagram: ${drawDesc}]`).catch(() => {})
    apiSaveToSession(userId, `tutor_draw`, "assistant", res).catch(() => {})
    addXp(5)
    setDrawLoading(false)
  }

  // ── Debate verdict ────────────────────────────────────────
  const requestVerdict = async () => {
    if (loading) return
    setLoading(true)
    setDebateVerdict(true)
    const sys = getModeSystem()
    const res = await callAI(
      "Step out of debate mode now. Give a balanced 3-line summary showing what's true on both sides. Then fairly grade my argumentation out of 10 for: Evidence Used, Logical Consistency, Counter-argument Response. Be specific about what I did well and where I can improve.",
      sys, messages
    )
    setMessages(m => [...m, { role: "user", content: "🏆 Requesting debate verdict…" }, { role: "assistant", content: res }])
    addXp(10)
    setLoading(false)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 130px)" }}>
      {/* Mode tabs */}
      <div style={{
        display: "flex",
        overflowX: "auto",
        gap: 6,
        padding: "10px 14px",
        background: COLORS.card,
        borderBottom: `1px solid ${COLORS.border}`,
        flexShrink: 0,
      }}>
        {MODE_KEYS.map(m => {
          const ui = li(getDisplayLang(profile))
          const label = ui[m.labelKey] || m.key
          return (
            <button
              key={m.key}
              onClick={() => switchMode(m.key)}
              style={{
                background: mode === m.key ? `${COLORS.green}20` : COLORS.card2,
                border: `1px solid ${mode === m.key ? COLORS.green : COLORS.border}`,
                borderRadius: 10,
                padding: "7px 12px",
                display: "flex",
                alignItems: "center",
                gap: 5,
                whiteSpace: "nowrap",
                cursor: "pointer",
                fontFamily: "Sora, sans-serif",
                fontSize: 12,
                fontWeight: mode === m.key ? 700 : 500,
                color: mode === m.key ? COLORS.green : COLORS.text,
                flexShrink: 0,
              }}
            >
              {m.icon} {label}
            </button>
          )
        })}
      </div>

      {/* Chat / draw area */}
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>

        {/* ── Bahas (Debate) mode: round tracker + verdict button ── */}
        {mode === "bahas" && messages.length > 0 && (
          <div style={{
            background: `${COLORS.red}10`, border: `1px solid ${COLORS.red}25`,
            borderRadius: 12, padding: "10px 14px", marginBottom: 12,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.red }}>
                ⚔️ Debate Round {Math.floor(messages.length / 2)}
              </span>
              {Math.floor(messages.length / 2) >= 5 && !debateVerdict && (
                <span style={{ fontSize: 11, color: COLORS.muted, marginLeft: 8 }}>Ready for verdict!</span>
              )}
            </div>
            {Math.floor(messages.length / 2) >= 3 && !debateVerdict && (
              <button onClick={requestVerdict} disabled={loading} style={{
                background: `${COLORS.yellow}20`, border: `1px solid ${COLORS.yellow}40`,
                borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 700,
                color: COLORS.yellow, cursor: "pointer", fontFamily: "Sora, sans-serif",
              }}>
                🏆 Get Verdict
              </button>
            )}
          </div>
        )}

        {/* Draw mode canvas */}
        {mode === "draw" && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14,
              padding: 12,
              marginBottom: 10,
            }}>
              <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>✏️ Draw below — use finger or mouse</div>
              <canvas
                ref={canvasRef}
                width={320}
                height={175}
                style={{
                  width: "100%",
                  background: "#080818",
                  borderRadius: 10,
                  touchAction: "none",
                  display: "block",
                  cursor: "crosshair",
                }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
              <button
                onClick={clearCanvas}
                style={{
                  ...secondaryBtn,
                  marginTop: 8,
                  padding: "6px 14px",
                  width: "auto",
                  fontSize: 12,
                }}
              >
                🗑 Clear
              </button>
            </div>
            <input
              style={inputStyle}
              type="text"
              placeholder="Describe what you drew (e.g. plant cell)"
              value={drawDesc}
              onChange={e => setDrawDesc(e.target.value)}
            />
            <button
              onClick={explainDiagram}
              disabled={drawLoading}
              style={{ ...primaryBtn, marginTop: 10 }}
            >
              {drawLoading ? "Analyzing…" : "🔍 Explain My Diagram"}
            </button>
          </div>
        )}

        {/* Starter questions (empty chat) */}
        {messages.length === 0 && mode !== "draw" && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>Try asking:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {getStarters(getDisplayLang(profile), mode === 'socratic' ? 'socratic' : mode === 'explain' ? 'explain' : mode === 'homework' ? 'homework' : mode === 'bahas' ? 'bahas' : mode === 'kahani' ? 'kahani' : mode === 'kyun' ? 'kyun' : 'tutor').map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  style={{
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 10,
                    padding: "10px 14px",
                    color: COLORS.text,
                    fontSize: 13,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "Sora, sans-serif",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.map((m, i) => (
            <div key={i} style={m.role === "user" ? userBubble : aiBubble}>
              {m.content}
            </div>
          ))}
          {loading && <div style={aiBubble}>Thinking…</div>}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div style={{
        padding: "10px 14px",
        background: COLORS.card,
        borderTop: `1px solid ${COLORS.border}`,
        display: "flex",
        gap: 8,
        flexShrink: 0,
      }}>
        <input
          style={{ ...inputStyle, flex: 1, padding: "10px 14px" }}
          type="text"
          placeholder="Ask your doubt…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") sendMessage() }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{
            ...primaryBtn,
            width: 44,
            height: 44,
            padding: 0,
            borderRadius: 12,
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  )
}

const inputStyle = {
  width: "100%",
  background: "#101022",
  border: "1px solid #ffffff15",
  borderRadius: 12,
  padding: "11px 14px",
  color: "#eeeeff",
  fontSize: 13,
  fontFamily: "Sora, sans-serif",
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

const secondaryBtn = {
  background: "transparent",
  border: "1px solid #ffffff15",
  borderRadius: 12,
  padding: "12px 16px",
  fontSize: 13,
  fontWeight: 600,
  color: "#eeeeff",
  cursor: "pointer",
  width: "100%",
  fontFamily: "Sora, sans-serif",
}

const userBubble = {
  alignSelf: "flex-end",
  background: "linear-gradient(135deg, #00E5A0, #33cc88)",
  color: "#04040e",
  fontWeight: 600,
  borderRadius: 14,
  borderBottomRightRadius: 3,
  padding: "10px 12px",
  maxWidth: "88%",
  fontSize: 13,
  lineHeight: 1.5,
  wordBreak: "break-word",
}

const aiBubble = {
  alignSelf: "flex-start",
  background: "#101022",
  border: "1px solid #ffffff08",
  color: "#eeeeff",
  borderRadius: 14,
  borderBottomLeftRadius: 3,
  padding: "10px 12px",
  maxWidth: "88%",
  fontSize: 13,
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
}
