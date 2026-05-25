import { useState, useRef, useEffect } from 'react'
import { COLORS, callAI, checkStudentQuery } from '../../shared.js'
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
  // Mode instructions are built server-side — see backend/app/modules/ai/prompts.py.
  // The backend reads the user's stored profile so nothing sensitive leaks over the network.
  const getModeSystem = () => {
    // Pass docCtx (notebook context) via system_prompt when available; mode handles the rest
    return docCtx ? `Document context available: ${docCtx.slice(0, 2000)}` : ""
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
      const res = await callAI(text, getModeSystem(), newMsgs, 3, 1200, mode)
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
    const res = await callAI(`I drew a diagram: ${drawDesc}. Identify it, label each part, explain how it works, and give 2 exam questions about it.`, sys, [], 3, 1200, mode)
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
      sys, messages, 3, 1200, mode
    )
    setMessages(m => [...m, { role: "user", content: "🏆 Requesting debate verdict…" }, { role: "assistant", content: res }])
    addXp(10)
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-130px)]">
      {/* Mode tabs */}
      <div className="flex overflow-x-auto gap-1.5 py-2.5 px-3.5 bg-app-card border-b border-app-border shrink-0">
        {MODE_KEYS.map(m => {
          const ui = li(getDisplayLang(profile))
          const label = ui[m.labelKey] || m.key
          return (
            <button
              key={m.key}
              onClick={() => switchMode(m.key)}
              className={`rounded-[10px] py-1.5 px-3 flex items-center gap-1.5 whitespace-nowrap cursor-pointer font-[Sora,sans-serif] text-xs shrink-0 border ${
                mode === m.key 
                  ? 'bg-app-green/20 border-app-green font-bold text-app-green' 
                  : 'bg-app-card2 border-app-border font-medium text-app-text'
              }`}
            >
              {m.icon} {label}
            </button>
          )
        })}
      </div>

      {/* Chat / draw area */}
      <div className="flex-1 overflow-y-auto p-3.5">

        {/* ── Bahas (Debate) mode: round tracker + verdict button ── */}
        {mode === "bahas" && messages.length > 0 && (
          <div className="bg-app-red/10 border border-app-red/20 rounded-xl py-2.5 px-3.5 mb-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-app-red">
                ⚔️ Debate Round {Math.floor(messages.length / 2)}
              </span>
              {Math.floor(messages.length / 2) >= 5 && !debateVerdict && (
                <span className="text-[11px] text-app-muted ml-2">Ready for verdict!</span>
              )}
            </div>
            {Math.floor(messages.length / 2) >= 3 && !debateVerdict && (
              <button 
                onClick={requestVerdict} 
                disabled={loading} 
                className="bg-app-yellow/20 border border-app-yellow/40 rounded-lg py-1.5 px-3 text-[11px] font-bold text-app-yellow cursor-pointer font-[Sora,sans-serif]"
              >
                🏆 Get Verdict
              </button>
            )}
          </div>
        )}

        {/* Draw mode canvas */}
        {mode === "draw" && (
          <div className="mb-4">
            <div className="bg-app-card border border-app-border rounded-[14px] p-3 mb-2.5">
              <div className="text-xs text-app-muted mb-2">✏️ Draw below — use finger or mouse</div>
              <canvas
                ref={canvasRef}
                width={320}
                height={175}
                className="w-full bg-[#080818] rounded-[10px] block cursor-crosshair"
                style={{ touchAction: "none" }}
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
                className="ghost-btn mt-2 py-1.5 px-3.5 !w-auto text-xs"
              >
                🗑 Clear
              </button>
            </div>
            <input
              className="tutor-input"
              type="text"
              placeholder="Describe what you drew (e.g. plant cell)"
              value={drawDesc}
              onChange={e => setDrawDesc(e.target.value)}
            />
            <button
              onClick={explainDiagram}
              disabled={drawLoading}
              className="primary-btn mt-2.5"
            >
              {drawLoading ? "Analyzing…" : "🔍 Explain My Diagram"}
            </button>
          </div>
        )}

        {/* Starter questions (empty chat) */}
        {messages.length === 0 && mode !== "draw" && (
          <div className="mb-4">
            <div className="text-xs text-app-muted mb-2">Try asking:</div>
            <div className="flex flex-col gap-2">
              {getStarters(getDisplayLang(profile), mode === 'socratic' ? 'socratic' : mode === 'explain' ? 'explain' : mode === 'homework' ? 'homework' : mode === 'bahas' ? 'bahas' : mode === 'kahani' ? 'kahani' : mode === 'kyun' ? 'kyun' : 'tutor').map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="bg-app-card border border-app-border rounded-[10px] py-2.5 px-3.5 text-app-text text-[13px] cursor-pointer text-left font-[Sora,sans-serif]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex flex-col gap-2.5">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "user-bubble" : "ai-bubble"}>
              {m.content}
            </div>
          ))}
          {loading && <div className="ai-bubble">Thinking…</div>}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="py-2.5 px-3.5 bg-app-card border-t border-app-border flex gap-2 shrink-0">
        <input
          className="tutor-input flex-1 py-2.5 px-3.5"
          type="text"
          placeholder="Ask your doubt…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") sendMessage() }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="primary-btn w-11 h-11 !p-0 !rounded-xl text-lg shrink-0"
        >
          ↑
        </button>
      </div>
    </div>
  )
}

