import { useState, useEffect, useRef } from 'react'
import { COLORS, callAI, buildSystemPrompt, parseAIObject, checkStudentQuery } from '../../App.jsx'
import { li } from '../../i18n/index.js'
import { getDeviceId, apiGetDraft, apiSaveDraft } from '../../api.js'

const LANG_VOICE = {
  English:'en-IN', Hindi:'hi-IN', Gujarati:'gu-IN', Marathi:'mr-IN',
  Tamil:'ta-IN', Telugu:'te-IN', Kannada:'kn-IN', Bengali:'bn-IN',
  Punjabi:'pa-IN', Odia:'or-IN', Urdu:'ur-IN',
}

function pickVoice(lang) {
  if (!('speechSynthesis' in window)) return null
  const code = LANG_VOICE[lang] || 'en-IN'
  const all = window.speechSynthesis.getVoices()
  if (all.length === 0) return null
  let matches = all.filter(v => v.lang === code || v.lang.replace('_','-') === code)
  if (!matches.length) matches = all.filter(v => v.lang.startsWith(code.split('-')[0]))
  if (!matches.length) matches = all.filter(v => v.lang.startsWith('en'))
  if (!matches.length) matches = all
  for (const p of ['Google','Natural','Microsoft']) {
    const m = matches.find(v => v.name.includes(p))
    if (m) return m
  }
  return matches[0]
}

const SUGGESTED_TOPICS = [
  "Photosynthesis", "Newton's Laws", "French Revolution",
  "Pythagoras Theorem", "Water Cycle", "Indian Freedom Movement",
]

export default function PodcastLab({ profile, addXp, docCtx, docName, onBack }) {
  const deviceId = getDeviceId()
  const [topicInput, setTopicInput] = useState("")
  const [episode, setEpisode]       = useState(null)
  const [lineIdx, setLineIdx]       = useState(0)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState("")
  const [autoPlaying, setAutoPlaying] = useState(false)
  const [isSpeaking, setIsSpeaking]   = useState(false)
  const ttsOK = typeof window !== 'undefined' && 'speechSynthesis' in window

  // Stop speech on unmount
  useEffect(() => () => { if (ttsOK) window.speechSynthesis.cancel() }, [])

  // Auto-play: speak current exchange, then advance
  useEffect(() => {
    if (!autoPlaying || !episode || !ttsOK) return
    const ex = episode.exchanges[lineIdx]
    if (!ex) { setAutoPlaying(false); return }
    const doSpeak = () => {
      window.speechSynthesis.cancel()
      const utter = new SpeechSynthesisUtterance(ex.t)
      const voice = pickVoice(profile.language)
      if (voice) utter.voice = voice
      utter.lang = LANG_VOICE[profile.language] || 'en-IN'
      utter.rate = 0.9
      utter.pitch = ex.h === 'Priya' ? 1.1 : 0.85
      utter.onstart = () => setIsSpeaking(true)
      utter.onend = () => {
        setIsSpeaking(false)
        if (lineIdx < episode.exchanges.length - 1) {
          setLineIdx(i => i + 1)
        } else {
          setAutoPlaying(false)
        }
      }
      utter.onerror = () => { setIsSpeaking(false); setAutoPlaying(false) }
      window.speechSynthesis.speak(utter)
    }
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = doSpeak
    } else {
      doSpeak()
    }
    return () => { window.speechSynthesis.cancel() }
  }, [lineIdx, autoPlaying, episode])

  // Load last episode on mount
  useEffect(() => {
    apiGetDraft(deviceId, "podcast_episode")
      .then(d => {
        if (d?.content) {
          try { setEpisode(JSON.parse(d.content)) } catch { /* ignore */ }
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const generate = async (topicOverride) => {
    const topic = topicOverride || topicInput.trim()
    if (!topic) return
    // Safety guard
    const safety = checkStudentQuery(topic, profile)
    if (safety.blocked) { setError(safety.message); return }
    setLoading(true)
    setEpisode(null)
    setLineIdx(0)
    setError("")

    const docPart = docCtx ? `\nDocument context: ${docCtx.slice(0, 2000)}` : ""
    const sys = buildSystemPrompt(profile, `You are writing an educational podcast script in ${profile.language}.
Hosts: Priya (enthusiastic, uses Indian examples, storytelling) and Aryan (analytical, asks deep questions).
ALL dialogue MUST be in ${profile.language} only — zero English unless language IS English.${docPart}
Return ONLY valid JSON (no markdown): {"title":"...","exchanges":[{"h":"Priya","t":"dialogue"},{"h":"Aryan","t":"dialogue"},{"h":"Priya","t":"..."},{"h":"Aryan","t":"..."},{"h":"Priya","t":"..."},{"h":"Aryan","t":"..."}],"pts":["key point 1","key point 2","key point 3"],"tip":"exam tip in ${profile.language}"}`)

    const res = await callAI(`Create an educational podcast episode on: "${topic}" for ${profile.standard} ${profile.board}.`, sys)
    const parsed = parseAIObject(res)
    if (parsed?.exchanges?.length) {
      setEpisode(parsed)
      setAutoPlaying(false)
      setIsSpeaking(false)
      apiSaveDraft(deviceId, "podcast_episode", JSON.stringify(parsed)).catch(() => {})
    } else {
      setError("Could not generate podcast. Please try again.")
    }
    addXp(10)
    setLoading(false)
  }

  const fromDocument = () => {
    if (!docCtx) { setError("No document uploaded. Go to Notebook tab and upload a document first."); return }
    generate(docName || "the uploaded document")
  }

  const hostColor = h => h === "Priya" ? COLORS.orange : COLORS.blue

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
        <span style={{ fontSize: 15, fontWeight: 800, color: COLORS.text }}>🎙️ AI Podcast Studio</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {!episode && (
          <>
            {/* Input */}
            <div style={{ marginBottom: 14 }}>
              <input
                style={inputStyle}
                type="text"
                placeholder="Enter a topic (e.g. Photosynthesis)"
                value={topicInput}
                onChange={e => setTopicInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && generate()}
              />
            </div>

            {/* Suggested chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {SUGGESTED_TOPICS.map(t => (
                <button
                  key={t}
                  onClick={() => { setTopicInput(t); generate(t) }}
                  style={chipBtn}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => generate()} disabled={loading || !topicInput.trim()} style={primaryBtn}>
                {loading ? "Generating podcast…" : "🎙️ Generate Podcast"}
              </button>
              <button onClick={fromDocument} disabled={loading} style={secondaryBtn}>
                📄 Podcast from My Document
              </button>
            </div>

            {error && <p style={{ color: COLORS.red, fontSize: 13, marginTop: 12 }}>{error}</p>}
          </>
        )}

        {episode && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Episode title */}
            <div style={{
              background: `${COLORS.yellow}15`,
              border: `1px solid ${COLORS.yellow}40`,
              borderRadius: 14,
              padding: "14px 16px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 11, color: COLORS.yellow, fontWeight: 700, marginBottom: 4 }}>
                🎙️ NOW PLAYING
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.text, lineHeight: 1.4 }}>
                {episode.title}
              </div>
              <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                Priya & Aryan · {episode.exchanges?.length} exchanges
                {ttsOK && (
                  <button
                    onClick={() => {
                      if (autoPlaying) {
                        window.speechSynthesis.cancel()
                        setAutoPlaying(false)
                        setIsSpeaking(false)
                      } else {
                        setAutoPlaying(true)
                      }
                    }}
                    style={{ background: autoPlaying ? `${COLORS.yellow}22` : `${COLORS.green}22`, border: `1px solid ${autoPlaying ? COLORS.yellow : COLORS.green}44`, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: autoPlaying ? COLORS.yellow : COLORS.green, cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}
                  >{autoPlaying ? (isSpeaking ? '⏸ Pause' : '⏳') : '▶️ Play'}</button>
                )}
              </div>
            </div>

            {/* Current exchange */}
            {episode.exchanges[lineIdx] && (
              <div style={{
                background: COLORS.card,
                border: `1.5px solid ${hostColor(episode.exchanges[lineIdx].h)}40`,
                borderRadius: 16,
                padding: 16,
              }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: hostColor(episode.exchanges[lineIdx].h),
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  <span>{episode.exchanges[lineIdx].h === "Priya" ? "👩" : "👨"}</span>
                  {episode.exchanges[lineIdx].h}
                </div>
                <p style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.7 }}>
                  {episode.exchanges[lineIdx].t}
                </p>
              </div>
            )}

            {/* Progress dots */}
            <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap" }}>
              {episode.exchanges.map((_, i) => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: i <= lineIdx ? COLORS.yellow : COLORS.border,
                  transition: "background 0.3s",
                }} />
              ))}
            </div>

            {/* Navigation */}
            {lineIdx < episode.exchanges.length - 1 ? (
              <button onClick={() => {
                window.speechSynthesis.cancel()
                setIsSpeaking(false)
                setLineIdx(i => i + 1)
              }} style={primaryBtn}>
                {autoPlaying ? '⏭ Skip' : 'Continue →'}
              </button>
            ) : (
              <>
                {/* Key Takeaways */}
                <div style={{
                  background: `${COLORS.green}10`,
                  border: `1px solid ${COLORS.green}30`,
                  borderRadius: 14,
                  padding: 14,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.green, marginBottom: 8 }}>
                    🎯 Key Takeaways
                  </div>
                  {episode.pts?.map((p, i) => (
                    <div key={i} style={{ fontSize: 13, color: COLORS.text, padding: "3px 0", lineHeight: 1.5 }}>
                      {i + 1}. {p}
                    </div>
                  ))}
                </div>

                {/* Exam tip */}
                {episode.tip && (
                  <div style={{
                    background: `${COLORS.yellow}10`,
                    border: `1px solid ${COLORS.yellow}30`,
                    borderRadius: 14,
                    padding: 14,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.yellow, marginBottom: 6 }}>
                      📋 Exam Tip
                    </div>
                    <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>{episode.tip}</p>
                  </div>
                )}

                <button
                  onClick={() => {
                    window.speechSynthesis?.cancel()
                    setAutoPlaying(false)
                    setIsSpeaking(false)
                    setEpisode(null)
                    setTopicInput("")
                    setLineIdx(0)
                  }}
                  style={secondaryBtn}
                >
                  🎙️ New Episode
                </button>
              </>
            )}
          </div>
        )}
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

const chipBtn = {
  background: "#101022",
  border: "1px solid #ffffff15",
  borderRadius: 20,
  padding: "6px 14px",
  fontSize: 12,
  color: "#eeeeff",
  cursor: "pointer",
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
