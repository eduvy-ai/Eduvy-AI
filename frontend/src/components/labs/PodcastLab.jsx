import { useState, useEffect, useRef } from 'react'
import { callAI, parseAIObject, checkStudentQuery } from '../../shared.js'
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
    const res = await callAI(
      `Create an educational podcast episode on: "${topic}" for ${profile.standard} ${profile.board}.${docPart}`,
      "", [], 3, 1200, "podcast_gen"
    )
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

  const hostColor = h => h === "Priya" ? "#FF6B35" : "#7B9CFF"

  return (
    <div className="flex flex-col min-h-[calc(100vh-130px)]">
      {/* Header */}
      <div className="bg-app-card border-b border-app-border px-4 py-3 flex items-center gap-2.5 shrink-0">
        <button onClick={onBack} className="bg-white/[0.05] border border-app-border text-app-text text-[13px] font-semibold rounded-xl px-3 py-1.5 cursor-pointer hover:bg-white/[0.08] active:scale-95 transition-all">? Back</button>
        <span className="text-[15px] font-extrabold text-app-text">??? AI Podcast Studio</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!episode && (
          <>
            <div className="mb-3.5">
              <input
                className="w-full bg-app-card2 border border-app-border rounded-xl px-3.5 py-2.5 text-app-text text-[13px] font-[Sora,sans-serif] outline-none focus:border-app-green/40 transition-colors placeholder:text-app-muted"
                type="text"
                placeholder="Enter a topic (e.g. Photosynthesis)"
                value={topicInput}
                onChange={e => setTopicInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && generate()}
              />
            </div>
            <div className="flex flex-wrap gap-2 mb-3.5">
              {SUGGESTED_TOPICS.map(t => (
                <button key={t} onClick={() => { setTopicInput(t); generate(t) }}
                  className="bg-app-card2 border border-app-border rounded-2xl px-3.5 py-1.5 text-xs text-app-text cursor-pointer hover:border-app-green/30 active:scale-95 transition-all"
                >{t}</button>
              ))}
            </div>
            <div className="flex flex-col gap-2.5">
              <button onClick={() => generate()} disabled={loading || !topicInput.trim()}
                className="w-full bg-gradient-to-r from-app-green to-[#33cc88] text-app-bg text-[13px] font-extrabold rounded-xl py-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] transition-all">
                {loading ? "Generating podcast�" : "??? Generate Podcast"}
              </button>
              <button onClick={fromDocument} disabled={loading}
                className="w-full bg-transparent border border-app-border text-app-text text-[13px] font-semibold rounded-xl py-3 cursor-pointer disabled:opacity-50 hover:bg-white/[0.03] active:scale-[0.99] transition-all">
                ?? Podcast from My Document
              </button>
            </div>
            {error && <p className="text-app-red text-[13px] mt-3">{error}</p>}
          </>
        )}

        {episode && (
          <div className="flex flex-col gap-3.5">
            <div className="bg-app-yellow/10 border border-app-yellow/30 rounded-2xl px-4 py-3.5 text-center">
              <div className="text-[11px] text-app-yellow font-bold mb-1">??? NOW PLAYING</div>
              <div className="text-[15px] font-extrabold text-app-text leading-snug">{episode.title}</div>
              <div className="text-xs text-app-muted mt-1 flex items-center justify-center gap-2.5">
                Priya & Aryan � {episode.exchanges?.length} exchanges
                {ttsOK && (
                  <button
                    onClick={() => { if (autoPlaying) { window.speechSynthesis.cancel(); setAutoPlaying(false); setIsSpeaking(false) } else { setAutoPlaying(true) } }}
                    style={{ background: autoPlaying ? 'rgba(255,209,102,0.13)' : 'rgba(0,229,160,0.13)', border: `1px solid ${autoPlaying ? 'rgba(255,209,102,0.27)' : 'rgba(0,229,160,0.27)'}`, color: autoPlaying ? '#FFD166' : '#00E5A0' }}
                    className="rounded-2xl px-2.5 py-1 text-[11px] font-bold cursor-pointer font-[Sora,sans-serif]"
                  >{autoPlaying ? (isSpeaking ? '? Pause' : '?') : '?? Play'}</button>
                )}
              </div>
            </div>

            {episode.exchanges[lineIdx] && (
              <div className="bg-app-card rounded-2xl p-4" style={{ border: `1.5px solid ${hostColor(episode.exchanges[lineIdx].h)}40` }}>
                <div className="text-xs font-extrabold mb-2 flex items-center gap-1.5" style={{ color: hostColor(episode.exchanges[lineIdx].h) }}>
                  <span>{episode.exchanges[lineIdx].h === "Priya" ? "??" : "??"}</span>
                  {episode.exchanges[lineIdx].h}
                </div>
                <p className="text-sm text-app-text leading-[1.7]">{episode.exchanges[lineIdx].t}</p>
              </div>
            )}

            <div className="flex gap-1.5 justify-center flex-wrap">
              {episode.exchanges.map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full transition-colors duration-300"
                  style={{ background: i <= lineIdx ? '#FFD166' : 'rgba(255,255,255,0.08)' }} />
              ))}
            </div>

            {lineIdx < episode.exchanges.length - 1 ? (
              <button onClick={() => { window.speechSynthesis.cancel(); setIsSpeaking(false); setLineIdx(i => i + 1) }}
                className="w-full bg-gradient-to-r from-app-green to-[#33cc88] text-app-bg text-[13px] font-extrabold rounded-xl py-3 cursor-pointer active:scale-[0.99] transition-all">
                {autoPlaying ? '? Skip' : 'Continue ?'}
              </button>
            ) : (
              <>
                <div className="bg-app-green/10 border border-app-green/25 rounded-2xl p-3.5">
                  <div className="text-xs font-bold text-app-green mb-2">?? Key Takeaways</div>
                  {episode.pts?.map((p, i) => (
                    <div key={i} className="text-[13px] text-app-text py-0.5 leading-relaxed">{i + 1}. {p}</div>
                  ))}
                </div>
                {episode.tip && (
                  <div className="bg-app-yellow/10 border border-app-yellow/25 rounded-2xl p-3.5">
                    <div className="text-xs font-bold text-app-yellow mb-1.5">?? Exam Tip</div>
                    <p className="text-[13px] text-app-text leading-relaxed">{episode.tip}</p>
                  </div>
                )}
                <button onClick={() => { window.speechSynthesis?.cancel(); setAutoPlaying(false); setIsSpeaking(false); setEpisode(null); setTopicInput(""); setLineIdx(0) }}
                  className="w-full bg-transparent border border-app-border text-app-text text-[13px] font-semibold rounded-xl py-3 cursor-pointer hover:bg-white/[0.03] active:scale-[0.99] transition-all">
                  ??? New Episode
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
