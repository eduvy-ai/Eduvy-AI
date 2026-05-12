import { useState, useRef, useEffect } from 'react'
import { COLORS, callAI, buildSystemPrompt, checkStudentQuery } from '../../App.jsx'
import { getDeviceId, apiGetSession, apiSaveToSession } from '../../api.js'

const MODES = [
  { key: "adaptive",  icon: "🧠", label: "Adaptive" },
  { key: "socratic",  icon: "🤔", label: "Socratic" },
  { key: "explain",   icon: "💡", label: "Explain"  },
  { key: "homework",  icon: "📝", label: "Homework" },
  { key: "voice",     icon: "🎤", label: "Voice"    },
  { key: "draw",      icon: "✏️", label: "Draw"     },
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
  voice:    `VOICE MODE — the student is talking to you out loud:
- Respond like a real face-to-face chat with a friend who happens to be a teacher
- Short, natural sentences — no long paragraphs
- Warm and spontaneous: "Right, so...", "Okay so basically...", "The thing is..."
- Check in often: "does that make sense?", "shall I explain it a different way?"`,
  draw:     `DRAW MODE — the student has drawn something and described it to you:
- Warmly acknowledge what they drew: "Nice! This looks like..."
- Identify what the diagram represents
- Walk through each part they drew and explain its role in simple terms
- Point out one thing they drew really well, then gently note anything that might be missing — without making them feel bad
- Give 2 exam-style questions about this diagram that their board might ask`,
}

const STARTERS = {
  adaptive:  ["What is photosynthesis?", "Explain Newton's laws", "How does democracy work?"],
  socratic:  ["Help me understand electricity", "Why does rain fall?", "What is gravity?"],
  explain:   ["Explain osmosis", "What is the water cycle?", "Define photosynthesis"],
  homework:  ["Solve: 2x + 5 = 15", "Find the area of a triangle with base 6cm, height 4cm", "If train travels 60km/h for 2.5h, find distance"],
  voice:     ["I'm confused about fractions", "Can you explain percentages?", "Help me with algebra"],
  draw:      ["I drew a plant cell", "I drew a water cycle diagram", "I drew a circuit diagram"],
}

export default function TutorTab({ profile, addXp, docCtx }) {
  const deviceId = getDeviceId()
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── Load chat history from backend when mode changes ────────
  useEffect(() => {
    apiGetSession(deviceId, `tutor_${mode}`)
      .then(msgs => { if (msgs.length) setMessages(msgs) })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // ── Change mode → clear chat ──────────────────────────────
  const switchMode = m => {
    setMode(m)
    setMessages([])
    setInput("")
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
    if (!text || loading) return    // Safety guard
    const safety = checkStudentQuery(text, profile)
    if (safety.blocked) {
      setMessages(m => [...m, { role: "user", content: text }, { role: "assistant", content: safety.message }])
      setInput("")
      return
    }    const userMsg = { role: "user", content: text }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
    setInput("")
    setLoading(true)
    apiSaveToSession(deviceId, `tutor_${mode}`, "user", text).catch(() => {})
    const res = await callAI(text, getModeSystem(), newMsgs)
    setMessages(m => [...m, { role: "assistant", content: res }])
    apiSaveToSession(deviceId, `tutor_${mode}`, "assistant", res).catch(() => {})
    addXp(2)
    setLoading(false)
  }

  // ── Voice mode: sample input ──────────────────────────────
  const voiceSamples = [
    "I don't understand this topic at all, please help me",
    "Can you explain in a simple way?",
    "I have my exam tomorrow, what should I focus on?",
  ]
  const [voiceInput, setVoiceInput] = useState("")

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
    apiSaveToSession(deviceId, `tutor_draw`, "user", `[Drew diagram: ${drawDesc}]`).catch(() => {})
    apiSaveToSession(deviceId, `tutor_draw`, "assistant", res).catch(() => {})
    addXp(5)
    setDrawLoading(false)
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
        {MODES.map(m => (
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
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Chat / draw area */}
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>

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

        {/* Voice mode: sample picker */}
        {mode === "voice" && messages.length === 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 10 }}>
              🎤 Tap a sample or type what you'd say:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {voiceSamples.map(s => (
                <button
                  key={s}
                  onClick={() => setVoiceInput(s)}
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
                  🎙 {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Starter questions (empty chat) */}
        {messages.length === 0 && mode !== "draw" && mode !== "voice" && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>Try asking:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(STARTERS[mode] || []).map(s => (
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
          placeholder={mode === "voice" ? "🎤 Type what you'd say…" : "Ask your doubt…"}
          value={mode === "voice" ? voiceInput : input}
          onChange={e => mode === "voice" ? setVoiceInput(e.target.value) : setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              if (mode === "voice") { sendMessage(voiceInput); setVoiceInput("") }
              else sendMessage()
            }
          }}
        />
        <button
          onClick={() => {
            if (mode === "voice") { sendMessage(voiceInput); setVoiceInput("") }
            else sendMessage()
          }}
          disabled={loading || !(mode === "voice" ? voiceInput.trim() : input.trim())}
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
  display: "flex",
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
