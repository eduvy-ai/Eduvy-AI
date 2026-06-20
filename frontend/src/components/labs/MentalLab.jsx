import { useState, useRef, useEffect } from 'react'
import { callAI, checkStudentQuery } from '../../shared.js'
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
    <div className="flex flex-col h-[calc(100vh-130px)]">
      {/* Header */}
      <div className="bg-app-card border-b border-app-border px-4 py-3 flex items-center gap-2.5 shrink-0">
        <button onClick={onBack} className="bg-transparent border-none text-app-muted text-[13px] cursor-pointer p-0">← Back</button>
        <div>
          <div className="text-[15px] font-extrabold text-app-text">🧘 Mental Wellness Coach</div>
          <div className="text-[11px] text-app-muted">Safe space · Non-judgmental · Confidential</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3.5">
        {messages.length === 1 && (
          <div className="mb-3.5">
            <div className="text-xs text-app-muted mb-2">Or share what's on your mind:</div>
            <div className="flex flex-col gap-1.5">
              {getStarters(getDisplayLang(profile), 'mental').map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="bg-app-card border border-app-border rounded-[10px] py-2.5 px-3.5 text-app-text text-[13px] cursor-pointer text-left leading-relaxed hover:bg-app-card2 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "user-bubble" : "ai-bubble"}>
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="ai-bubble text-app-muted">💭 Thinking…</div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Disclaimer */}
      <div className="px-3.5 py-1.5 bg-app-orange/[0.05] border-t border-app-orange/20 text-[10px] text-app-orange text-center shrink-0">
        🔒 This is an AI wellness tool, not a substitute for professional mental health care
      </div>

      {/* Input */}
      <div className="px-3.5 py-2.5 bg-app-card border-t border-app-border flex gap-2 shrink-0">
        <input
          className="flex-1 bg-app-card2 border border-white/[0.08] rounded-xl py-2.5 px-3.5 text-app-text text-[13px] outline-none"
          type="text"
          placeholder="Share what's on your mind…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="w-11 h-11 shrink-0 rounded-xl border-none bg-gradient-to-br from-app-green to-emerald-400 text-app-bg text-lg font-extrabold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ↑
        </button>
      </div>
    </div>
  )
}

