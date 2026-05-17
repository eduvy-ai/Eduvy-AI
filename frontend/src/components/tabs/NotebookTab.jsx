import { useState, useRef, useEffect } from 'react'
import { COLORS, callAI, buildSystemPrompt, parseAIArray, parseAIObject, SUBS, checkStudentQuery } from '../../App.jsx'
import {
  apiGetSources, apiSaveSource, apiDeleteSource,
  apiGetNotebookChat, apiSaveChatMessage, apiClearNotebookChat,
  apiSaveStudioOutput,
} from '../../api.js'

// ─── Studio output types ──────────────────────────────────────
const STUDIO_ITEMS = [
  { key: "podcast",  icon: "🎙️", label: "Audio Overview",  desc: "AI hosts discuss your sources",        color: "#FFD166" },
  { key: "guide",    icon: "📚", label: "Study Guide",      desc: "Structured notes from all sources",   color: "#00E5A0" },
  { key: "brief",    icon: "📋", label: "Briefing Doc",     desc: "Concise executive summary",           color: "#7B9CFF" },
  { key: "faq",      icon: "❓", label: "FAQ",              desc: "Key questions & answers",             color: "#FF6B35" },
  { key: "timeline", icon: "📅", label: "Timeline",         desc: "Chronological events extracted",      color: "#FF6B6B" },
  { key: "mindmap",  icon: "🗺️", label: "Mind Map",         desc: "Visual concept branches",             color: "#7B9CFF" },
  { key: "quiz",     icon: "🎯", label: "Practice Quiz",    desc: "MCQs from your sources",              color: "#00E5A0" },
  { key: "flashcards",icon: "🃏",label: "Flashcards",       desc: "Flip cards for revision",             color: "#FFD166" },
]

let _sourceIdCounter = 1
const newId = () => String(_sourceIdCounter++)

// ─── Fetch URL via backend (falls back to allorigins if backend is down) ──
async function fetchUrlContent(url) {
  // Try backend first
  try {
    const res = await fetch("/api/fetch-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(20000),
    })
    if (res.ok) {
      const data = await res.json()
      return { content: data.content, isYouTube: data.isYouTube }
    }
  } catch { /* fall through */ }

  // Fallback: public CORS proxy
  try {
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`)
    const data = await res.json()
    const text = (data.contents || "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 10000)
    return text ? { content: text, isYouTube: false } : null
  } catch { return null }
}

export default function NotebookTab({ profile, userId, addXp, docCtx, setDocCtx, docName, setDocName }) {

  // ── View state ──────────────────────────────────────────────
  const [view, setView]       = useState("sources") // sources | chat | studio

  // ── Sources ─────────────────────────────────────────────────
  // { id, name, type: "file"|"text"|"url", content, icon, addedAt }
  const [sources, setSources] = useState([])
  const [sourcesLoaded, setSourcesLoaded] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addTab, setAddTab]   = useState("file")   // file | text | url
  const [pasteText, setPasteText] = useState("")
  const [pasteTitle, setPasteTitle] = useState("")
  const [urlInput, setUrlInput]   = useState("")
  const [urlLoading, setUrlLoading] = useState(false)

  // ── Chat ────────────────────────────────────────────────────
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)

  // ── Studio ──────────────────────────────────────────────────
  const [studioType, setStudioType]     = useState(null)
  const [studioOutput, setStudioOutput] = useState("")
  const [studioLoading, setStudioLoading] = useState(false)
  // Podcast
  const [episode, setEpisode]       = useState(null)
  const [lineIdx, setLineIdx]       = useState(0)
  const [podcastPlaying, setPodcastPlaying] = useState(false)
  const autoplayRef                 = useRef(false)
  // { priya: SpeechSynthesisVoice|null, aryan: SpeechSynthesisVoice|null, lang: string }
  const voiceCacheRef               = useRef(null)
  // Cards
  const [cards, setCards]       = useState([])
  const [cardIdx, setCardIdx]   = useState(0)
  const [cardFlipped, setCardFlipped] = useState(false)
  // Quiz
  const [quizQ, setQuizQ]       = useState(null)
  const [quizSel, setQuizSel]   = useState(null)
  const [quizScore, setQuizScore] = useState({ c: 0, t: 0 })
  // Mind map
  const [mindMap, setMindMap]   = useState(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  // ── Build voice cache once when voices are available ────────
  useEffect(() => {
    if (!window.speechSynthesis) return
    const buildCache = () => {
      const voices = window.speechSynthesis.getVoices()
      if (!voices.length) return

      // Full cross-platform female / male name fragments
      // Windows: Heera(f) Kalpana(f) Ravi(m) Hemant(m)
      // Edge Neural: Neerja(f) Prabhat(m) Swara(f)
      // macOS/iOS: Veena(f) Rishi(m)
      // Android/Chrome: Google hi-IN (often only one, but Priya/Aditi labelled on some)
      // Western fallback names included so no Indian voice → still gendered
      const F = ['heera','kalpana','neerja','lekha','sapna','divya','swara','aditi','priya',
                  'veena','zira','hazel','susan','victoria','samantha','karen','moira','fiona',
                  'tessa','aria','jenny','michelle','eva','natasha','female','woman']
      const M = ['ravi','hemant','prabhat','rishi','prakash',
                  'alex','daniel','fred','tom','david','mark','guy','james','ryan','george',
                  'lee','wayne','reed','male','man']

      const isF = v => F.some(n => v.name.toLowerCase().includes(n))
      const isM = v => M.some(n => v.name.toLowerCase().includes(n))

      const LANG_LOCALE = {
        Hindi:'hi-IN', Gujarati:'gu-IN', Marathi:'mr-IN', Tamil:'ta-IN',
        Telugu:'te-IN', Kannada:'kn-IN', Bengali:'bn-IN', Punjabi:'pa-IN',
        Urdu:'ur-IN', Odia:'or-IN', English:'en-IN',
      }
      const locale = LANG_LOCALE[profile.language] || 'en-IN'
      const pfx    = locale.split('-')[0]

      // Priority buckets
      const inLang = voices.filter(v => v.lang === locale)
      const inPfx  = voices.filter(v => v.lang.startsWith(pfx) && v.lang !== locale)
      const inIN   = voices.filter(v => v.lang.endsWith('-IN') && !v.lang.startsWith(pfx))
      const enAll  = voices.filter(v => v.lang.startsWith('en'))
      const pool   = [...inLang, ...inPfx, ...inIN, ...enAll, ...voices]

      // Pick best female voice (for Priya)
      const priyaVoice =
        pool.find(v => isF(v) && v.lang === locale) ||
        pool.find(v => isF(v) && v.lang.startsWith(pfx)) ||
        pool.find(v => isF(v) && v.lang.endsWith('-IN')) ||
        pool.find(v => isF(v)) ||
        null

      // Pick best male voice (for Aryan) — must be different from Priya's
      const priyaUri = priyaVoice?.voiceURI
      const aryanVoice =
        pool.find(v => v.voiceURI !== priyaUri && isM(v) && v.lang === locale) ||
        pool.find(v => v.voiceURI !== priyaUri && isM(v) && v.lang.startsWith(pfx)) ||
        pool.find(v => v.voiceURI !== priyaUri && isM(v) && v.lang.endsWith('-IN')) ||
        pool.find(v => v.voiceURI !== priyaUri && isM(v)) ||
        pool.find(v => v.voiceURI !== priyaUri) ||
        null

      voiceCacheRef.current = { priya: priyaVoice, aryan: aryanVoice, lang: locale }
    }

    const voices = window.speechSynthesis.getVoices()
    if (voices.length) {
      buildCache()
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null
        buildCache()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.language])

  // Auto-advance podcast to next line when lineIdx changes during autoplay
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (autoplayRef.current && episode?.exchanges) {
      speakPodcastLine(lineIdx, episode.exchanges)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineIdx])

  // Stop speech when navigating away from studio tab
  useEffect(() => {
    if (view !== 'studio') stopPodcast()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  // ── Load sources + chat from backend on mount ────────────────
  useEffect(() => {
    if (!userId) return
    apiGetSources(userId)
      .then(rows => {
        const loaded = rows.map(r => ({
          id: r.id, name: r.name, type: r.type,
          content: r.content, icon: r.icon, addedAt: r.added_at,
        }))
        setSources(loaded)
      })
      .catch(() => {})
      .finally(() => setSourcesLoaded(true))

    apiGetNotebookChat(userId)
      .then(rows => setMessages(rows))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // ── Combined source context ──────────────────────────────────
  const getContext = () => {
    if (!sources.length) return ""
    return sources.map((s, i) => `[Source ${i + 1}: ${s.name}]\n${s.content}`).join("\n\n---\n\n")
  }

  // Sync global docCtx whenever sources change
  useEffect(() => {
    const ctx = getContext()
    setDocCtx(ctx)
    if (sources.length) setDocName(`${sources.length} source${sources.length > 1 ? "s" : ""}`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources])

  // ── Add source: file upload ──────────────────────────────────
  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    let content = ""
    if (file.name.match(/\.(txt|md)$/i)) {
      content = (await file.text()).slice(0, 10000)
    } else {
      content = `[Binary file — using filename as context: ${file.name}]`
    }
    const src = { id: newId(), name: file.name, type: "file", content, icon: "📄", addedAt: Date.now() }
    setSources(p => [...p, src])
    apiSaveSource(userId, src).catch(() => {})
    setAddOpen(false)
    e.target.value = ""
  }

  // ── Add source: paste text ────────────────────────────────────
  const addPastedText = () => {
    if (!pasteText.trim()) return
    const name = pasteTitle.trim() || `Note ${sources.length + 1}`
    const src = { id: newId(), name, type: "text", content: pasteText.trim().slice(0, 10000), icon: "📝", addedAt: Date.now() }
    setSources(p => [...p, src])
    apiSaveSource(userId, src).catch(() => {})
    setPasteText(""); setPasteTitle(""); setAddOpen(false)
  }

  // ── Add source: URL ───────────────────────────────────────────
  const addUrl = async () => {
    if (!urlInput.trim()) return
    setUrlLoading(true)
    const url = urlInput.trim()
    const result = await fetchUrlContent(url)
    const isYT = result?.isYouTube ?? /youtube\.com|youtu\.be/i.test(url)
    const content = result?.content
      ?? `[URL: ${url}]\n(Could not fetch content due to site restrictions. AI will reference this URL.)`
    const name = url.replace(/https?:\/\/(www\.)?/, "").slice(0, 40)
    const src = { id: newId(), name, type: "url", content, icon: isYT ? "▶️" : "🌐", addedAt: Date.now() }
    setSources(p => [...p, src])
    apiSaveSource(userId, src).catch(() => {})
    setUrlInput(""); setUrlLoading(false); setAddOpen(false)
  }

  const removeSource = (id) => {
    setSources(p => p.filter(s => s.id !== id))
    apiDeleteSource(userId, id).catch(() => {})
  }

  // ── Chat ─────────────────────────────────────────────────────
  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return
    if (!sources.length) { setMessages(m => [...m, { role: "assistant", content: "⚠️ Add at least one source first." }]); return }    // Safety guard
    const safety = checkStudentQuery(chatInput.trim(), profile)
    if (safety.blocked) {
      setMessages(m => [...m, { role: "user", content: chatInput.trim() }, { role: "assistant", content: safety.message }])
      setChatInput("")
      return
    }    const userMsg = { role: "user", content: chatInput.trim() }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs); setChatInput(""); setChatLoading(true)
    apiSaveChatMessage(userId, "user", userMsg.content).catch(() => {})
    const ctx = getContext()
    const sys = buildSystemPrompt(profile, `You are a research assistant helping the student understand their uploaded sources.

SOURCES:
${ctx.slice(0, 6000)}

INSTRUCTIONS:
- Answer ONLY from the sources above
- Cite sources by saying [Source 1], [Source 2] etc. when referencing specific content
- If the answer is not in the sources, say so clearly
- Write in ${profile.language}`)
    const res = await callAI(chatInput.trim(), sys, newMsgs, 3, 1500)
    setMessages(m => [...m, { role: "assistant", content: res }])
    apiSaveChatMessage(userId, "assistant", res).catch(() => {})
    addXp(2); setChatLoading(false)
  }

  // ── Studio generation ─────────────────────────────────────────
  const generateStudio = async (type) => {
    if (!sources.length) { alert("Add at least one source first."); return }
    stopPodcast()
    setStudioType(type); setStudioOutput(""); setStudioLoading(true)
    setEpisode(null); setMindMap(null); setCards([]); setQuizQ(null)
    setLineIdx(0); setCardIdx(0); setCardFlipped(false); setQuizSel(null)
    const ctx = getContext().slice(0, 6000)

    // local captures for persistence (state won't update synchronously)
    let _savedJson = null

    if (type === "podcast") {
      const sys = buildSystemPrompt(profile, `Create an educational podcast episode in ${profile.language} from the given sources.
Hosts: Priya (enthusiastic, uses Indian examples) & Aryan (analytical, deep questions).
ALL dialogue in ${profile.language} only.
Return ONLY valid JSON: {"title":"...","exchanges":[{"h":"Priya","t":"..."},{"h":"Aryan","t":"..."},{"h":"Priya","t":"..."},{"h":"Aryan","t":"..."},{"h":"Priya","t":"..."},{"h":"Aryan","t":"..."},{"h":"Priya","t":"..."},{"h":"Aryan","t":"..."}],"pts":["...","...","..."],"tip":"..."}`)
      const res = await callAI(`Create a podcast episode about the content in these sources:\n${ctx}`, sys, [], 3, 2000)
      const parsed = parseAIObject(res)
      if (parsed?.exchanges?.length) { setEpisode(parsed); _savedJson = JSON.stringify(parsed) } else { setStudioOutput(res); _savedJson = res }

    } else if (type === "mindmap") {
      const sys = buildSystemPrompt(profile, `Create a mind map in ${profile.language} only from the sources. Return ONLY valid JSON: {"center":"main topic","branches":[{"label":"Branch","emoji":"🔬","color":"#00E5A0","nodes":["point 1","point 2","point 3"]},{"label":"Branch","emoji":"📊","color":"#FFD166","nodes":["point 1","point 2"]},{"label":"Branch","emoji":"⚡","color":"#7B9CFF","nodes":["point 1","point 2","point 3"]},{"label":"Branch","emoji":"🎯","color":"#FF6B6B","nodes":["point 1","point 2"]}]}`)
      const res = await callAI(`Create a mind map from:\n${ctx}`, sys, [], 3, 1500)
      const parsed = parseAIObject(res)
      setMindMap(parsed); _savedJson = JSON.stringify(parsed)

    } else if (type === "flashcards") {
      const sys = buildSystemPrompt(profile, `Create 8 flashcards from the sources. Write ALL in ${profile.language}. Return ONLY valid JSON array: [{"q":"question","a":"answer","hint":"memory trick","d":"easy|medium|hard"}]`)
      const res = await callAI(`Create 8 flashcards from:\n${ctx}`, sys, [], 3, 1500)
      const parsed = parseAIArray(res)
      if (parsed?.length) { setCards(parsed); _savedJson = JSON.stringify(parsed) } else { setStudioOutput(res); _savedJson = res }

    } else if (type === "quiz") {
      const sys = buildSystemPrompt(profile, `Create ONE MCQ from the sources. Write in ${profile.language}. Return ONLY valid JSON: {"q":"...","o":["A) ...","B) ...","C) ...","D) ..."],"c":"A","e":"...","concept":"..."}`)
      const res = await callAI(`Create an MCQ from:\n${ctx}`, sys, [], 3, 800)
      const parsed = parseAIObject(res)
      if (parsed?.q) { setQuizQ(parsed); setQuizSel(null); _savedJson = JSON.stringify(parsed) } else { setStudioOutput(res); _savedJson = res }

    } else {
      const prompts = {
        guide:    `Create a comprehensive Study Guide in ${profile.language} with: 📌 Overview, 🔑 Key Concepts (numbered), 💡 Definitions, 🔢 Formulas/Data, 🌍 Examples, ⚠️ Common Mistakes, 🎯 3 Practice Questions, ⚡ Revision Checklist`,
        brief:    `Create a concise Briefing Document in ${profile.language} covering the main ideas, key facts, and most important takeaways from all sources. Use clear sections.`,
        faq:      `Extract 8 frequently asked questions from the sources and provide clear answers. Write entirely in ${profile.language}. Format: Q: ... \nA: ...`,
        timeline: `Extract all dates, events, and chronological information from the sources. Present as a numbered timeline in ${profile.language}. If no dates found, create a logical sequence of the key concepts.`,
      }
      const sys = buildSystemPrompt(profile, prompts[type] || "Summarize the sources.")
      const res = await callAI(`Sources:\n${ctx}`, sys, [], 3, 2000)
      setStudioOutput(res); _savedJson = res
    }
    addXp(10); setStudioLoading(false)
    if (_savedJson) apiSaveStudioOutput(userId, type, _savedJson).catch(() => {})
  }

  // ── Podcast speech — uses pre-built voice cache ───────────────
  const speakPodcastLine = (idx, exchanges) => {
    if (!window.speechSynthesis || !exchanges?.[idx]) return
    window.speechSynthesis.cancel()

    const exchange = exchanges[idx]
    const isPriya  = exchange.h === 'Priya'
    const cache    = voiceCacheRef.current
    const voice    = isPriya ? cache?.priya : cache?.aryan
    const lang     = cache?.lang || 'en-IN'

    // If both hosts share the same voice (browser has only 1 voice),
    // use a strong pitch difference so gender is still clearly audible.
    const sameVoice = cache?.priya?.voiceURI === cache?.aryan?.voiceURI
    const pitch     = isPriya
      ? (sameVoice ? 1.3  : 1.04)
      : (sameVoice ? 0.65 : 0.97)

    const chunks = exchange.t
      .split(/(?<=[.!?।…])\s+/)
      .map(s => s.trim())
      .filter(Boolean)

    if (!chunks.length) { setPodcastPlaying(false); return }

    let i = 0
    const speakNext = () => {
      if (i >= chunks.length) {
        setPodcastPlaying(false)
        if (autoplayRef.current && idx < exchanges.length - 1) {
          setTimeout(() => setLineIdx(idx + 1), 750)
        }
        return
      }
      const u    = new SpeechSynthesisUtterance(chunks[i])
      u.lang     = lang                           // drives Indian pronunciation
      if (voice) u.voice = voice
      u.pitch    = pitch
      u.rate     = 0.95 + (Math.random() * 0.06)
      u.volume   = 1
      u.onend    = () => { i++; setTimeout(speakNext, 150) }
      u.onerror  = () => setPodcastPlaying(false)
      window.speechSynthesis.speak(u)
    }

    setPodcastPlaying(true)
    speakNext()
  }

  const stopPodcast = () => {
    autoplayRef.current = false
    window.speechSynthesis?.cancel()
    setPodcastPlaying(false)
  }

  const answerQuiz = (letter) => {
    if (quizSel) return
    setQuizSel(letter)
    setQuizScore(s => ({ c: s.c + (letter === quizQ.c ? 1 : 0), t: s.t + 1 }))
    addXp(letter === quizQ?.c ? 5 : 1)
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 130px)" }}>

      {/* ── Top sub-nav ── */}
      <div style={{
        display: "flex",
        background: COLORS.card,
        borderBottom: `1px solid ${COLORS.border}`,
        padding: "8px 12px 0",
        gap: 4,
        flexShrink: 0,
      }}>
        {[
          { key: "sources", icon: "📚", label: `Sources (${sources.length})` },
          { key: "chat",    icon: "💬", label: "Chat"    },
          { key: "studio",  icon: "🎨", label: "Studio"  },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            style={{
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${view === t.key ? COLORS.green : "transparent"}`,
              padding: "6px 14px 8px",
              fontSize: 13,
              fontWeight: view === t.key ? 700 : 500,
              color: view === t.key ? COLORS.green : COLORS.muted,
              cursor: "pointer",
              fontFamily: "Sora, sans-serif",
              flexShrink: 0,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Content area ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* ════ SOURCES VIEW ════ */}
        {view === "sources" && (
          <div style={{ padding: 14 }}>
            {sources.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "40px 20px",
                color: COLORS.muted,
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📓</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>
                  Add your sources
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                  Upload documents, paste text, or add URLs.<br />
                  Then chat with them or generate outputs in Studio.
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                {sources.map((s, i) => (
                  <div key={s.id} style={{
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 14,
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}>
                    <div style={{
                      width: 40, height: 40,
                      borderRadius: 10,
                      background: `${COLORS.blue}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20, flexShrink: 0,
                    }}>
                      {s.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        Source {i + 1} · {s.name}
                      </div>
                      <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>
                        {s.type} · {(s.content.length / 1000).toFixed(1)}k chars
                      </div>
                    </div>
                    <button
                      onClick={() => removeSource(s.id)}
                      style={{ background: "transparent", border: "none", color: COLORS.red, fontSize: 16, cursor: "pointer", flexShrink: 0, fontFamily: "Sora, sans-serif" }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add source button */}
            <button onClick={() => setAddOpen(p => !p)} style={primaryBtn}>
              {addOpen ? "✕ Cancel" : "+ Add Source"}
            </button>

            {/* Add source panel */}
            {addOpen && (
              <div style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 16,
                padding: 16,
                marginTop: 12,
              }}>
                {/* Tabs */}
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  {[["file", "📄 File"], ["text", "📝 Text"], ["url", "🌐 URL"]].map(([k, l]) => (
                    <button
                      key={k}
                      onClick={() => setAddTab(k)}
                      style={{
                        background: addTab === k ? `${COLORS.green}20` : "transparent",
                        border: `1px solid ${addTab === k ? COLORS.green : COLORS.border}`,
                        borderRadius: 8, padding: "6px 12px",
                        fontSize: 12, fontWeight: addTab === k ? 700 : 500,
                        color: addTab === k ? COLORS.green : COLORS.muted,
                        cursor: "pointer", fontFamily: "Sora, sans-serif",
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                {/* File tab */}
                {addTab === "file" && (
                  <label style={{
                    display: "block",
                    background: `${COLORS.green}08`,
                    border: `2px dashed ${COLORS.green}40`,
                    borderRadius: 12, padding: "24px 16px",
                    textAlign: "center", cursor: "pointer",
                  }}>
                    <div style={{ fontSize: 32, marginBottom: 6 }}>📂</div>
                    <div style={{ fontSize: 13, color: COLORS.green, fontWeight: 700 }}>Tap to upload</div>
                    <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>.txt .md .pdf .doc .docx .jpg .png</div>
                    <input type="file" accept=".txt,.md,.pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={handleFile} />
                  </label>
                )}

                {/* Text tab */}
                {addTab === "text" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <input style={inputStyle} placeholder="Source title (optional)" value={pasteTitle} onChange={e => setPasteTitle(e.target.value)} />
                    <textarea
                      style={{ ...inputStyle, height: 160, resize: "vertical", lineHeight: 1.6 }}
                      placeholder="Paste your notes, textbook content, or any text here…"
                      value={pasteText}
                      onChange={e => setPasteText(e.target.value)}
                    />
                    <div style={{ fontSize: 11, color: COLORS.muted, textAlign: "right" }}>{pasteText.length}/10000</div>
                    <button onClick={addPastedText} disabled={!pasteText.trim()} style={primaryBtn}>
                      Add Text Source
                    </button>
                  </div>
                )}

                {/* URL tab */}
                {addTab === "url" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <input
                      style={inputStyle}
                      type="url"
                      placeholder="https://... or YouTube URL"
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addUrl()}
                    />
                    <div style={{ fontSize: 11, color: COLORS.muted, lineHeight: 1.5 }}>
                      💡 Works for most websites. For PDFs & paywalled sites, paste the text instead.
                    </div>
                    <button onClick={addUrl} disabled={urlLoading || !urlInput.trim()} style={primaryBtn}>
                      {urlLoading ? "Fetching…" : "Fetch & Add"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════ CHAT VIEW ════ */}
        {view === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
              {sources.length === 0 && (
                <div style={{
                  background: `${COLORS.yellow}12`,
                  border: `1px solid ${COLORS.yellow}30`,
                  borderRadius: 12, padding: "12px 14px",
                  fontSize: 13, color: COLORS.yellow, marginBottom: 14,
                }}>
                  ⚠️ Add sources first so I can answer from them.
                </div>
              )}

              {messages.length === 0 && sources.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>Suggested questions:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      "What are the main topics covered in my sources?",
                      "Summarize the key points from all sources",
                      "What are the most important concepts I should know?",
                      "Are there any contradictions between the sources?",
                    ].map(q => (
                      <button key={q} onClick={() => { setChatInput(q); }} style={{
                        background: COLORS.card, border: `1px solid ${COLORS.border}`,
                        borderRadius: 10, padding: "10px 14px", color: COLORS.text,
                        fontSize: 13, cursor: "pointer", textAlign: "left",
                        fontFamily: "Sora, sans-serif",
                      }}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {messages.map((m, i) => (
                  <div key={i} style={m.role === "user" ? userBubble : aiBubble}>{m.content}</div>
                ))}
                {chatLoading && <div style={aiBubble}>Searching sources…</div>}
                <div ref={chatEndRef} />
              </div>
            </div>

            <div style={{ padding: "10px 14px", background: COLORS.card, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 8, flexShrink: 0 }}>
              <input
                style={{ ...inputStyle, flex: 1, padding: "10px 14px" }}
                type="text"
                placeholder="Ask about your sources…"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendChat()}
              />
              <button
                onClick={sendChat}
                disabled={chatLoading || !chatInput.trim()}
                style={{ ...primaryBtn, width: 44, height: 44, padding: 0, borderRadius: 12, fontSize: 18, flexShrink: 0 }}
              >
                ↑
              </button>
            </div>
          </div>
        )}

        {/* ════ STUDIO VIEW ════ */}
        {view === "studio" && (
          <div style={{ padding: 14 }}>

            {/* No sources — show empty state only, no grid */}
            {sources.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "48px 20px",
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎨</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>
                  Studio is ready
                </div>
                <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.7, marginBottom: 20 }}>
                  Add at least one source to start generating<br />study guides, podcasts, quizzes and more.
                </div>
                <button onClick={() => setView("sources")} style={primaryBtn}>
                  + Go to Sources
                </button>
              </div>
            ) : (
              <>
                {/* ── Back button — always visible when a type is selected ── */}
                {studioType && (
                  <button
                    onClick={() => {
                      stopPodcast()
                      setStudioType(null); setStudioOutput(""); setEpisode(null)
                      setMindMap(null); setCards([]); setQuizQ(null)
                      setLineIdx(0); setCardIdx(0); setCardFlipped(false); setQuizSel(null)
                    }}
                    style={{ ...secondaryBtn, marginBottom: 14 }}
                  >
                    ← Back to Studio
                  </button>
                )}

                {/* ── Output type grid (shown when no active type) ── */}
                {!studioType && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                    {STUDIO_ITEMS.map(item => (
                      <button
                        key={item.key}
                        onClick={() => generateStudio(item.key)}
                        style={{
                          background: COLORS.card,
                          border: `1px solid ${COLORS.border}`,
                          borderTop: `3px solid ${item.color}`,
                          borderRadius: 14,
                          padding: "14px 12px",
                          cursor: "pointer",
                          textAlign: "left",
                          fontFamily: "Sora, sans-serif",
                          transition: "border-color 0.15s",
                        }}
                      >
                        <div style={{
                          width: 36, height: 36,
                          borderRadius: 10,
                          background: `${item.color}20`,
                          border: `1px solid ${item.color}40`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 18, marginBottom: 8,
                        }}>
                          {item.icon}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 2 }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: COLORS.muted }}>{item.desc}</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Loading ── */}
                {studioLoading && (
                  <div style={{
                    textAlign: "center", padding: "48px 20px",
                    color: COLORS.muted, fontSize: 14,
                  }}>
                    <div style={{ fontSize: 36, marginBottom: 12, display: "inline-block", animation: "spin 1.5s linear infinite" }}>
                      {STUDIO_ITEMS.find(i => i.key === studioType)?.icon ?? "⚙️"}
                    </div>
                    <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>
                      Generating {STUDIO_ITEMS.find(i => i.key === studioType)?.label}…
                    </div>
                    <div style={{ fontSize: 12 }}>This may take 10–20 seconds</div>
                  </div>
                )}

                {/* ── Text outputs (guide, brief, faq, timeline) ── */}
                {studioOutput && !studioLoading && (
                  <div>
                    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderTop: `3px solid ${STUDIO_ITEMS.find(i => i.key === studioType)?.color ?? COLORS.green}`, borderRadius: 14, padding: 16, marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div style={{ fontSize: 12, color: STUDIO_ITEMS.find(i => i.key === studioType)?.color ?? COLORS.green, fontWeight: 700 }}>
                          {STUDIO_ITEMS.find(i => i.key === studioType)?.icon} {STUDIO_ITEMS.find(i => i.key === studioType)?.label}
                        </div>
                        <button
                          onClick={() => navigator.clipboard?.writeText(studioOutput)}
                          style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "3px 10px", fontSize: 11, color: COLORS.muted, cursor: "pointer", fontFamily: "Sora, sans-serif" }}
                        >
                          📋 Copy
                        </button>
                      </div>
                      <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.9, whiteSpace: "pre-wrap", margin: 0 }}>{studioOutput}</p>
                    </div>
                    <button onClick={() => generateStudio(studioType)} style={secondaryBtn}>
                      ↺ Regenerate
                    </button>
                  </div>
                )}

                {/* ── Podcast ── */}
                {episode && !studioLoading && (() => {
                  const hasSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window
                  const atEnd = lineIdx >= episode.exchanges.length - 1
                  const host = episode.exchanges[lineIdx]?.h
                  const hostColor = host === 'Priya' ? COLORS.orange : COLORS.blue
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                      {/* Episode header */}
                      <div style={{
                        background: `${COLORS.yellow}15`, border: `1px solid ${COLORS.yellow}40`,
                        borderRadius: 14, padding: "14px 16px", textAlign: "center",
                      }}>
                        <div style={{ fontSize: 11, color: COLORS.yellow, fontWeight: 700, marginBottom: 4 }}>🎙️ AUDIO OVERVIEW</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.text }}>{episode.title}</div>
                        <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>
                          Priya & Aryan · {lineIdx + 1} / {episode.exchanges?.length}
                        </div>
                      </div>

                      {/* Current exchange card — glows when speaking */}
                      {episode.exchanges[lineIdx] && (
                        <div style={{
                          background: COLORS.card,
                          border: `1.5px solid ${podcastPlaying ? hostColor : hostColor + '40'}`,
                          borderRadius: 16, padding: 16,
                          boxShadow: podcastPlaying ? `0 0 18px ${hostColor}30` : 'none',
                          transition: 'border-color 0.3s, box-shadow 0.3s',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: `${hostColor}20`, border: `1.5px solid ${hostColor}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 16,
                            }}>
                              {host === 'Priya' ? '👩' : '👨'}
                            </div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 800, color: hostColor }}>{host}</div>
                              {podcastPlaying && (
                                <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                                  {[0,1,2].map(i => (
                                    <div key={i} style={{
                                      width: 3, borderRadius: 999,
                                      background: hostColor,
                                      animation: `soundbar 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
                                      height: 10,
                                    }} />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <p style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.75, margin: 0 }}>
                            {episode.exchanges[lineIdx].t}
                          </p>
                        </div>
                      )}

                      {/* Progress dots */}
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {episode.exchanges.map((_, i) => (
                          <div key={i} style={{
                            width: i === lineIdx ? 16 : 6, height: 6, borderRadius: 99,
                            background: i < lineIdx ? `${COLORS.yellow}80` : i === lineIdx ? COLORS.yellow : COLORS.border,
                            transition: 'all 0.3s',
                          }} />
                        ))}
                      </div>

                      {/* Audio controls */}
                      {!atEnd && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          {hasSpeech && (
                            !podcastPlaying ? (
                              <button
                                onClick={() => { autoplayRef.current = true; speakPodcastLine(lineIdx, episode.exchanges) }}
                                style={{ ...primaryBtn, flex: 2 }}
                              >
                                ▶ {lineIdx === 0 ? 'Play All' : 'Resume'}
                              </button>
                            ) : (
                              <button onClick={stopPodcast} style={{
                                ...primaryBtn, flex: 2,
                                background: `linear-gradient(135deg, ${COLORS.yellow}, #e6b800)`,
                              }}>
                                ⏸ Pause
                              </button>
                            )
                          )}
                          <button
                            onClick={() => { stopPodcast(); setLineIdx(i => i + 1) }}
                            style={{ ...secondaryBtn, flex: 1 }}
                          >
                            Skip →
                          </button>
                        </div>
                      )}

                      {/* End of episode */}
                      {atEnd && !podcastPlaying && (
                        <>
                          {episode.pts?.length > 0 && (
                            <div style={{ background: `${COLORS.green}10`, border: `1px solid ${COLORS.green}30`, borderRadius: 14, padding: 14 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.green, marginBottom: 8 }}>🎯 Key Takeaways</div>
                              {episode.pts.map((p, i) => <div key={i} style={{ fontSize: 13, color: COLORS.text, padding: '3px 0' }}>{i + 1}. {p}</div>)}
                            </div>
                          )}
                          {episode.tip && (
                            <div style={{ background: `${COLORS.yellow}10`, border: `1px solid ${COLORS.yellow}30`, borderRadius: 14, padding: 14 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.yellow, marginBottom: 6 }}>📋 Exam Tip</div>
                              <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6, margin: 0 }}>{episode.tip}</p>
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 8 }}>
                            {hasSpeech && (
                              <button
                                onClick={() => { setLineIdx(0); setTimeout(() => { autoplayRef.current = true; speakPodcastLine(0, episode.exchanges) }, 100) }}
                                style={{ ...primaryBtn, flex: 1 }}
                              >
                                ▶ Play Again
                              </button>
                            )}
                            <button onClick={() => { stopPodcast(); setLineIdx(0) }} style={{ ...secondaryBtn, flex: 1 }}>↺ Restart</button>
                          </div>
                        </>
                      )}

                      {/* Speaking: show last-line skip button */}
                      {atEnd && podcastPlaying && (
                        <button onClick={stopPodcast} style={{ ...primaryBtn, background: `linear-gradient(135deg, ${COLORS.yellow}, #e6b800)` }}>
                          ⏸ Pause
                        </button>
                      )}

                      {!hasSpeech && (
                        <div style={{ fontSize: 11, color: COLORS.muted, textAlign: 'center', padding: '4px 0' }}>
                          💡 Audio not supported in this browser. Read along above.
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* ── Mind Map ── */}
                {mindMap && !studioLoading && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{
                      background: `${COLORS.blue}15`, border: `2px solid ${COLORS.blue}`,
                      borderRadius: 14, padding: "12px 16px", textAlign: "center",
                      fontWeight: 800, fontSize: 15, color: COLORS.text,
                    }}>
                      🗺️ {mindMap.center}
                    </div>
                    {mindMap.branches?.map((b, i) => (
                      <div key={i} style={{ background: `${b.color}10`, border: `1.5px solid ${b.color}40`, borderRadius: 14, padding: 14 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: b.color, marginBottom: 8 }}>{b.emoji} {b.label}</div>
                        {b.nodes?.map((n, j) => (
                          <div key={j} style={{ fontSize: 13, color: COLORS.text, padding: "4px 0 4px 12px", borderLeft: `2px solid ${b.color}60`, marginBottom: 4, lineHeight: 1.5 }}>• {n}</div>
                        ))}
                      </div>
                    ))}
                    <button onClick={() => generateStudio("mindmap")} style={secondaryBtn}>↺ Regenerate</button>
                  </div>
                )}

                {/* ── Flashcards ── */}
                {cards.length > 0 && !studioLoading && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                    {/* Header row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                      <div style={{ fontSize: 12, color: COLORS.muted }}>Card {cardIdx + 1} of {cards.length}</div>
                      {cards[cardIdx]?.d && (
                        <div style={{
                          fontSize: 10, fontWeight: 800, borderRadius: 8, padding: "2px 10px",
                          color: cards[cardIdx].d === "hard" ? COLORS.red : cards[cardIdx].d === "medium" ? COLORS.yellow : COLORS.green,
                          background: cards[cardIdx].d === "hard" ? `${COLORS.red}15` : cards[cardIdx].d === "medium" ? `${COLORS.yellow}15` : `${COLORS.green}15`,
                          textTransform: "uppercase",
                        }}>
                          {cards[cardIdx].d}
                        </div>
                      )}
                    </div>
                    {/* Card */}
                    <div
                      onClick={() => setCardFlipped(f => !f)}
                      style={{
                        width: "100%", minHeight: 180,
                        background: cardFlipped ? `${COLORS.green}12` : COLORS.card,
                        border: `1.5px solid ${cardFlipped ? COLORS.green : COLORS.border}`,
                        borderRadius: 18, padding: 20, cursor: "pointer",
                        display: "flex", flexDirection: "column",
                        justifyContent: "center", alignItems: "center",
                        gap: 10, textAlign: "center", transition: "all 0.3s",
                      }}
                    >
                      {!cardFlipped ? (
                        <>
                          <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, letterSpacing: 1 }}>TAP TO REVEAL ANSWER</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, lineHeight: 1.5 }}>{cards[cardIdx]?.q}</div>
                          {cards[cardIdx]?.hint && (
                            <div style={{ fontSize: 12, color: COLORS.muted, background: COLORS.card2, borderRadius: 8, padding: "4px 10px" }}>
                              💡 {cards[cardIdx].hint}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: 11, color: COLORS.green, fontWeight: 700, letterSpacing: 1 }}>ANSWER</div>
                          <div style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.6 }}>{cards[cardIdx]?.a}</div>
                        </>
                      )}
                    </div>
                    {/* Dot nav */}
                    <div style={{ display: "flex", gap: 5 }}>
                      {cards.map((_, i) => (
                        <div key={i} style={{
                          width: i === cardIdx ? 16 : 6, height: 6,
                          borderRadius: 99, transition: "all 0.3s",
                          background: i === cardIdx ? COLORS.green : i < cardIdx ? `${COLORS.green}50` : COLORS.border,
                        }} />
                      ))}
                    </div>
                    {/* Nav buttons */}
                    <div style={{ display: "flex", gap: 10, width: "100%" }}>
                      <button
                        onClick={() => { setCardIdx(i => Math.max(0, i - 1)); setCardFlipped(false) }}
                        disabled={cardIdx === 0}
                        style={{ ...secondaryBtn, flex: 1 }}
                      >← Prev</button>
                      <button
                        onClick={() => { setCardIdx(i => Math.min(cards.length - 1, i + 1)); setCardFlipped(false) }}
                        disabled={cardIdx === cards.length - 1}
                        style={{ ...primaryBtn, flex: 1 }}
                      >Next →</button>
                    </div>
                    {cardIdx === cards.length - 1 && (
                      <button onClick={() => { setCardIdx(0); setCardFlipped(false) }} style={{ ...secondaryBtn, width: "100%" }}>
                        ↺ Restart Deck
                      </button>
                    )}
                  </div>
                )}

                {/* ── Quiz ── */}
                {quizQ && !studioLoading && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* Score banner */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {quizQ.concept && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.blue, background: `${COLORS.blue}15`, borderRadius: 6, padding: "3px 10px" }}>
                          {quizQ.concept}
                        </div>
                      )}
                      <div style={{
                        fontSize: 12, fontWeight: 800, color: COLORS.green,
                        background: `${COLORS.green}15`, borderRadius: 8, padding: "3px 12px", marginLeft: "auto",
                      }}>
                        ✅ {quizScore.c} / {quizScore.t}
                      </div>
                    </div>
                    {/* Question */}
                    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 16, fontSize: 14, color: COLORS.text, lineHeight: 1.6, fontWeight: 600 }}>
                      {quizQ.q}
                    </div>
                    {/* Options */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {quizQ.o?.map((opt, i) => {
                        const letter = ["A","B","C","D"][i]
                        let bg = COLORS.card, border = COLORS.border, color = COLORS.text
                        if (quizSel) {
                          if (letter === quizQ.c)     { bg = `${COLORS.green}20`; border = COLORS.green; color = COLORS.green }
                          else if (letter === quizSel) { bg = `${COLORS.red}15`;   border = COLORS.red;   color = COLORS.red   }
                          else                         { bg = COLORS.card;          color = COLORS.muted                        }
                        }
                        return (
                          <button key={letter} onClick={() => answerQuiz(letter)} style={{
                            width: "100%", background: bg,
                            border: `1.5px solid ${border}`,
                            borderRadius: 12, padding: "12px 14px",
                            fontSize: 13, fontWeight: letter === quizQ.c && quizSel ? 700 : 500,
                            color, cursor: quizSel ? "default" : "pointer",
                            fontFamily: "Sora, sans-serif", textAlign: "left", transition: "all 0.2s",
                          }}>
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                    {/* Feedback */}
                    {quizSel && (
                      <>
                        <div style={{
                          background: quizSel === quizQ.c ? `${COLORS.green}10` : `${COLORS.red}10`,
                          border: `1px solid ${quizSel === quizQ.c ? COLORS.green : COLORS.red}30`,
                          borderRadius: 12, padding: 14,
                        }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: quizSel === quizQ.c ? COLORS.green : COLORS.red, marginBottom: 6 }}>
                            {quizSel === quizQ.c ? "✅ Correct!" : `❌ Incorrect — Answer: ${quizQ.c}`}
                          </div>
                          <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6, margin: 0 }}>{quizQ.e}</p>
                        </div>
                        <button onClick={() => generateStudio("quiz")} style={primaryBtn}>Next Question →</button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────
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
  color: "#04040e", fontWeight: 600,
  borderRadius: 14, borderBottomRightRadius: 3,
  padding: "10px 12px", maxWidth: "88%",
  fontSize: 13, lineHeight: 1.5, display: "flex",
}

const aiBubble = {
  alignSelf: "flex-start",
  background: "#101022",
  border: "1px solid #ffffff08",
  color: "#eeeeff",
  borderRadius: 14, borderBottomLeftRadius: 3,
  padding: "10px 12px", maxWidth: "88%",
  fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap",
}

