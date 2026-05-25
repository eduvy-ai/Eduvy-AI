import { useState, useRef, useEffect } from 'react'
import { COLORS, callAI, checkStudentQuery } from '../../shared.js'
import { li } from '../../i18n/index.js'
import { getStarters, getDisplayLang } from '../../shared.js'
import { getDeviceId, apiGetSession, apiSaveToSession } from '../../api.js'


const _MENTAL_GREET = {
  English:  n => `Hi ${n || 'there'} 🌟 I'm here for you. How are you feeling about your studies today? You can share anything — this is a safe space.`,
  Hindi:    n => `${n || ''} 🌟 मैं यहाँ हूँ। आज कैसा महसूस कर रहे हो? कुछ भी share कर सकते हो।`,
  Marathi:  n => `${n || ''} 🌟 मी इथे आहे. आज तुम्हाला कसं वाटतंय? काहीही सांगा — हे सुरक्षित ठिकाण आहे.`,
  Gujarati: n => `${n || ''} 🌟 હું અહીં છું. આજે તમે કેવું અનુભવો છો? કંઈ પણ share કરી શકો છો.`,
  Tamil:    n => `${n || ''} 🌟 நான் இங்கே இருக்கிறேன். இன்று நீங்கள் எப்படி உணர்கிறீர்கள்? எதுவும் பகிர்ந்துகொள்ளலாம்.`,
  Telugu:   n => `${n || ''} 🌟 నేను ఇక్కడే ఉన్నాను. ఈరోజు మీకు ఎలా అనిపిస్తోంది? ఏదైనా చెప్పవచ్చు.`,
  Kannada:  n => `${n || ''} 🌟 ನಾನು ಇಲ್ಲಿದ್ದೇನೆ. ಇಂದು ನೀವು ಹೇಗೆ ಅನಿಸುತ್ತಿದ್ದೀರಿ? ಏನಾದರೂ ಹೇಳಬಹುದು.`,
  Bengali:  n => `${n || ''} 🌟 আমি এখানে আছি। আজ তুমি কেমন অনুভব করছ? যেকোনো কিছু বলতে পারো।`,
  Punjabi:  n => `${n || ''} 🌟 ਮੈਂ ਇੱਥੇ ਹਾਂ। ਅੱਜ ਤੁਸੀਂ ਕਿਵੇਂ ਮਹਿਸੂਸ ਕਰ ਰਹੇ ਹੋ? ਕੁਝ ਵੀ share ਕਰ ਸਕਦੇ ਹੋ।`,
  Odia:     n => `${n || ''} 🌟 ମୁଁ ଇଠାରେ ଅଛି। ଆଜି ତୁମେ କିପରି ଅନୁଭବ କରୁଛ? ଯାହା ହୋଇ share କରିପାରିବ।`,
  Urdu:     n => `${n || ''} 🌟 میں یہاں ہوں۔ آج آپ کیسا محسوس کر رہے ہیں؟ کچھ بھی share کر سکتے ہیں۔`,
}

export default function MentalLab({ profile, addXp, onBack }) {
  const deviceId = getDeviceId()
  const greetFn = _MENTAL_GREET[profile?.language] || _MENTAL_GREET.English
  const defaultGreeting = { role: "assistant", content: greetFn(profile?.name) }
  const [messages, setMessages] = useState([defaultGreeting])
  const [input, setInput]   = useState("")
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    apiGetSession(deviceId, "mental")
      .then(msgs => { if (msgs.length) setMessages(msgs) })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async (overrideInput) => {
    const text = (overrideInput || input).trim()
    if (!text || loading) return
    // Safety guard (MentalLab allows wellness topics but blocks explicit harmful content)
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
    apiSaveToSession(deviceId, "mental", "user", text).catch(() => {})
    try {
      const res = await callAI(text, "", newMsgs, 3, 1200, "mental_wellness")
      setMessages(m => [...m, { role: "assistant", content: res }])
      apiSaveToSession(deviceId, "mental", "assistant", res).catch(() => {})
      addXp(2)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 130px)" }}>
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
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.text }}>🧘 Mental Wellness Coach</div>
          <div style={{ fontSize: 11, color: COLORS.muted }}>Safe space · Non-judgmental · Confidential</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {/* Starter chips — only when only the welcome message exists */}
        {messages.length === 1 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>
              Or share what's on your mind:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {getStarters(getDisplayLang(profile), 'mental').map(s => (
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
                    lineHeight: 1.4,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.map((m, i) => (
            <div key={i} style={m.role === "user" ? userBubble : aiBubble}>
              {m.content}
            </div>
          ))}
          {loading && (
            <div style={{ ...aiBubble, color: COLORS.muted }}>
              💭 Thinking…
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{
        padding: "6px 14px",
        background: `${COLORS.orange}08`,
        borderTop: `1px solid ${COLORS.orange}20`,
        fontSize: 10,
        color: COLORS.orange,
        textAlign: "center",
        flexShrink: 0,
      }}>
        🔒 This is an AI wellness tool, not a substitute for professional mental health care
      </div>

      {/* Input */}
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
          placeholder="Share what's on your mind…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
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

const backBtn = {
  background: "transparent",
  border: "none",
  color: "#6868a0",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "Sora, sans-serif",
  padding: 0,
}
