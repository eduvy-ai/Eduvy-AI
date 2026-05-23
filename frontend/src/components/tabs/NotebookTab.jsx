import { useState, useRef, useEffect } from 'react'
import { COLORS, callAI, buildSystemPrompt, parseAIArray, parseAIObject, SUBS, checkStudentQuery } from '../../App.jsx'
import { li } from '../../i18n/index.js'
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
    <div className="flex flex-col h-[calc(100vh-130px)]">

      {/* ── Top sub-nav ── */}
      <div className="flex bg-app-card border-b border-app-border py-2 px-3 pb-0 gap-1 shrink-0">
        {[
          { key: "sources", icon: "📚", label: `Sources (${sources.length})` },
          { key: "chat",    icon: "💬", label: "Chat"    },
          { key: "studio",  icon: "🎨", label: "Studio"  },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={`bg-transparent border-none py-1.5 px-3.5 pb-2 text-[13px] cursor-pointer font-[Sora,sans-serif] shrink-0 border-b-2 ${
              view === t.key
                ? 'border-app-green font-bold text-app-green'
                : 'border-transparent font-medium text-app-muted'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 overflow-y-auto">

        {/* ════ SOURCES VIEW ════ */}
        {view === "sources" && (
          <div className="p-3.5">
            {sources.length === 0 ? (
              <div className="text-center py-10 px-5 text-app-muted">
                <div className="text-5xl mb-3">📓</div>
                <div className="text-[15px] font-bold text-app-text mb-1.5">
                  Add your sources
                </div>
                <div className="text-[13px] leading-relaxed">
                  Upload documents, paste text, or add URLs.<br />
                  Then chat with them or generate outputs in Studio.
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 mb-3.5">
                {sources.map((s, i) => (
                  <div key={s.id} className="bg-app-card border border-app-border rounded-[14px] py-3 px-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[10px] bg-app-blue/10 flex items-center justify-center text-xl shrink-0">
                      {s.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-app-text overflow-hidden text-ellipsis whitespace-nowrap">
                        Source {i + 1} · {s.name}
                      </div>
                      <div className="text-[11px] text-app-muted mt-0.5">
                        {s.type} · {(s.content.length / 1000).toFixed(1)}k chars
                      </div>
                    </div>
                    <button
                      onClick={() => removeSource(s.id)}
                      className="bg-transparent border-none text-app-red text-base cursor-pointer shrink-0 font-[Sora,sans-serif]"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add source button */}
            <button onClick={() => setAddOpen(p => !p)} className="primary-btn">
              {addOpen ? "✕ Cancel" : "+ Add Source"}
            </button>

            {/* Add source panel */}
            {addOpen && (
              <div className="bg-app-card border border-app-border rounded-2xl p-4 mt-3">
                {/* Tabs */}
                <div className="flex gap-1.5 mb-3.5">
                  {[["file", "📄 File"], ["text", "📝 Text"], ["url", "🌐 URL"]].map(([k, l]) => (
                    <button
                      key={k}
                      onClick={() => setAddTab(k)}
                      className={`rounded-lg py-1.5 px-3 text-xs cursor-pointer font-[Sora,sans-serif] border ${
                        addTab === k
                          ? 'bg-app-green/20 border-app-green font-bold text-app-green'
                          : 'bg-transparent border-app-border font-medium text-app-muted'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                {/* File tab */}
                {addTab === "file" && (
                  <label className="block bg-app-green/5 border-2 border-dashed border-app-green/40 rounded-xl py-6 px-4 text-center cursor-pointer">
                    <div className="text-3xl mb-1.5">📂</div>
                    <div className="text-[13px] text-app-green font-bold">Tap to upload</div>
                    <div className="text-[11px] text-app-muted mt-1">.txt .md .pdf .doc .docx .jpg .png</div>
                    <input type="file" accept=".txt,.md,.pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={handleFile} />
                  </label>
                )}

                {/* Text tab */}
                {addTab === "text" && (
                  <div className="flex flex-col gap-2.5">
                    <input className="tutor-input" placeholder="Source title (optional)" value={pasteTitle} onChange={e => setPasteTitle(e.target.value)} />
                    <textarea
                      className="tutor-input h-40 resize-y leading-relaxed"
                      placeholder="Paste your notes, textbook content, or any text here…"
                      value={pasteText}
                      onChange={e => setPasteText(e.target.value)}
                    />
                    <div className="text-[11px] text-app-muted text-right">{pasteText.length}/10000</div>
                    <button onClick={addPastedText} disabled={!pasteText.trim()} className="primary-btn">
                      Add Text Source
                    </button>
                  </div>
                )}

                {/* URL tab */}
                {addTab === "url" && (
                  <div className="flex flex-col gap-2.5">
                    <input
                      className="tutor-input"
                      type="url"
                      placeholder="https://... or YouTube URL"
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addUrl()}
                    />
                    <div className="text-[11px] text-app-muted leading-normal">
                      💡 Works for most websites. For PDFs & paywalled sites, paste the text instead.
                    </div>
                    <button onClick={addUrl} disabled={urlLoading || !urlInput.trim()} className="primary-btn">
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
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-3.5">
              {sources.length === 0 && (
                <div className="bg-app-yellow/10 border border-app-yellow/30 rounded-xl py-3 px-3.5 text-[13px] text-app-yellow mb-3.5">
                  ⚠️ Add sources first so I can answer from them.
                </div>
              )}

              {messages.length === 0 && sources.length > 0 && (
                <div className="mb-3.5">
                  <div className="text-xs text-app-muted mb-2">Suggested questions:</div>
                  <div className="flex flex-col gap-1.5">
                    {[
                      "What are the main topics covered in my sources?",
                      "Summarize the key points from all sources",
                      "What are the most important concepts I should know?",
                      "Are there any contradictions between the sources?",
                    ].map(q => (
                      <button key={q} onClick={() => { setChatInput(q); }} className="bg-app-card border border-app-border rounded-[10px] py-2.5 px-3.5 text-app-text text-[13px] cursor-pointer text-left font-[Sora,sans-serif]">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                {messages.map((m, i) => (
                  <div key={i} className={m.role === "user" ? "user-bubble" : "ai-bubble"}>{m.content}</div>
                ))}
                {chatLoading && <div className="ai-bubble">Searching sources…</div>}
                <div ref={chatEndRef} />
              </div>
            </div>

            <div className="py-2.5 px-3.5 bg-app-card border-t border-app-border flex gap-2 shrink-0">
              <input
                className="tutor-input flex-1 py-2.5 px-3.5"
                type="text"
                placeholder="Ask about your sources…"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendChat()}
              />
              <button
                onClick={sendChat}
                disabled={chatLoading || !chatInput.trim()}
                className="primary-btn w-11 h-11 !p-0 !rounded-xl text-lg shrink-0"
              >
                ↑
              </button>
            </div>
          </div>
        )}

        {/* ════ STUDIO VIEW ════ */}
        {view === "studio" && (
          <div className="p-3.5">

            {/* No sources — show empty state only, no grid */}
            {sources.length === 0 ? (
              <div className="text-center py-12 px-5">
                <div className="text-5xl mb-3">🎨</div>
                <div className="text-[15px] font-bold text-app-text mb-1.5">
                  Studio is ready
                </div>
                <div className="text-[13px] text-app-muted leading-relaxed mb-5">
                  Add at least one source to start generating<br />study guides, podcasts, quizzes and more.
                </div>
                <button onClick={() => setView("sources")} className="primary-btn">
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
                    className="ghost-btn mb-3.5"
                  >
                    ← Back to Studio
                  </button>
                )}

                {/* ── Output type grid (shown when no active type) ── */}
                {!studioType && (
                  <div className="grid grid-cols-2 gap-2.5 mb-3.5">
                    {STUDIO_ITEMS.map(item => (
                      <button
                        key={item.key}
                        onClick={() => generateStudio(item.key)}
                        className="bg-app-card border border-app-border rounded-[14px] py-3.5 px-3 cursor-pointer text-left font-[Sora,sans-serif] transition-colors"
                        style={{ borderTop: `3px solid ${item.color}` }}
                      >
                        <div 
                          className="w-9 h-9 rounded-[10px] flex items-center justify-center text-lg mb-2"
                          style={{ background: `${item.color}20`, border: `1px solid ${item.color}40` }}
                        >
                          {item.icon}
                        </div>
                        <div className="text-[13px] font-bold text-app-text mb-0.5">{item.label}</div>
                        <div className="text-[11px] text-app-muted">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Loading ── */}
                {studioLoading && (
                  <div className="text-center py-12 px-5 text-app-muted text-sm">
                    <div className="text-4xl mb-3 inline-block animate-spin">
                      {STUDIO_ITEMS.find(i => i.key === studioType)?.icon ?? "⚙️"}
                    </div>
                    <div className="font-bold text-app-text mb-1">
                      Generating {STUDIO_ITEMS.find(i => i.key === studioType)?.label}…
                    </div>
                    <div className="text-xs">This may take 10–20 seconds</div>
                  </div>
                )}

                {/* ── Text outputs (guide, brief, faq, timeline) ── */}
                {studioOutput && !studioLoading && (
                  <div>
                    <div 
                      className="bg-app-card border border-app-border rounded-[14px] p-4 mb-2.5"
                      style={{ borderTop: `3px solid ${STUDIO_ITEMS.find(i => i.key === studioType)?.color ?? COLORS.green}` }}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="text-xs font-bold" style={{ color: STUDIO_ITEMS.find(i => i.key === studioType)?.color ?? COLORS.green }}>
                          {STUDIO_ITEMS.find(i => i.key === studioType)?.icon} {STUDIO_ITEMS.find(i => i.key === studioType)?.label}
                        </div>
                        <button
                          onClick={() => navigator.clipboard?.writeText(studioOutput)}
                          className="bg-transparent border border-app-border rounded-lg py-0.5 px-2.5 text-[11px] text-app-muted cursor-pointer font-[Sora,sans-serif]"
                        >
                          📋 Copy
                        </button>
                      </div>
                      <p className="text-[13px] text-app-text leading-loose whitespace-pre-wrap m-0">{studioOutput}</p>
                    </div>
                    <button onClick={() => generateStudio(studioType)} className="ghost-btn">
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
                    <div className="flex flex-col gap-3">

                      {/* Episode header */}
                      <div className="bg-app-yellow/15 border border-app-yellow/40 rounded-[14px] py-3.5 px-4 text-center">
                        <div className="text-[11px] text-app-yellow font-bold mb-1">🎙️ AUDIO OVERVIEW</div>
                        <div className="text-[15px] font-extrabold text-app-text">{episode.title}</div>
                        <div className="text-xs text-app-muted mt-1">
                          Priya & Aryan · {lineIdx + 1} / {episode.exchanges?.length}
                        </div>
                      </div>

                      {/* Current exchange card — glows when speaking */}
                      {episode.exchanges[lineIdx] && (
                        <div 
                          className="bg-app-card rounded-2xl p-4 transition-all duration-300"
                          style={{
                            border: `1.5px solid ${podcastPlaying ? hostColor : hostColor + '40'}`,
                            boxShadow: podcastPlaying ? `0 0 18px ${hostColor}30` : 'none',
                          }}
                        >
                          <div className="flex items-center gap-2 mb-2.5">
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-base"
                              style={{ background: `${hostColor}20`, border: `1.5px solid ${hostColor}` }}
                            >
                              {host === 'Priya' ? '👩' : '👨'}
                            </div>
                            <div>
                              <div className="text-xs font-extrabold" style={{ color: hostColor }}>{host}</div>
                              {podcastPlaying && (
                                <div className="flex gap-0.5 mt-0.5">
                                  {[0,1,2].map(i => (
                                    <div 
                                      key={i} 
                                      className="w-0.5 rounded-full h-2.5"
                                      style={{
                                        background: hostColor,
                                        animation: `soundbar 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
                                      }} 
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-app-text leading-relaxed m-0">
                            {episode.exchanges[lineIdx].t}
                          </p>
                        </div>
                      )}

                      {/* Progress dots */}
                      <div className="flex gap-1 justify-center flex-wrap">
                        {episode.exchanges.map((_, i) => (
                          <div 
                            key={i} 
                            className="h-1.5 rounded-full transition-all duration-300"
                            style={{
                              width: i === lineIdx ? 16 : 6,
                              background: i < lineIdx ? `${COLORS.yellow}80` : i === lineIdx ? COLORS.yellow : COLORS.border,
                            }}
                          />
                        ))}
                      </div>

                      {/* Audio controls */}
                      {!atEnd && (
                        <div className="flex gap-2">
                          {hasSpeech && (
                            !podcastPlaying ? (
                              <button
                                onClick={() => { autoplayRef.current = true; speakPodcastLine(lineIdx, episode.exchanges) }}
                                className="primary-btn flex-[2]"
                              >
                                ▶ {lineIdx === 0 ? 'Play All' : 'Resume'}
                              </button>
                            ) : (
                              <button 
                                onClick={stopPodcast} 
                                className="flex-[2] py-3 px-[18px] rounded-[13px] border-none text-app-bg text-[13px] font-extrabold cursor-pointer font-[Sora,sans-serif]"
                                style={{ background: `linear-gradient(135deg, ${COLORS.yellow}, #e6b800)` }}
                              >
                                ⏸ Pause
                              </button>
                            )
                          )}
                          <button
                            onClick={() => { stopPodcast(); setLineIdx(i => i + 1) }}
                            className="ghost-btn flex-1"
                          >
                            Skip →
                          </button>
                        </div>
                      )}

                      {/* End of episode */}
                      {atEnd && !podcastPlaying && (
                        <>
                          {episode.pts?.length > 0 && (
                            <div className="bg-app-green/10 border border-app-green/30 rounded-[14px] p-3.5">
                              <div className="text-xs font-bold text-app-green mb-2">🎯 Key Takeaways</div>
                              {episode.pts.map((p, i) => <div key={i} className="text-[13px] text-app-text py-0.5">{i + 1}. {p}</div>)}
                            </div>
                          )}
                          {episode.tip && (
                            <div className="bg-app-yellow/10 border border-app-yellow/30 rounded-[14px] p-3.5">
                              <div className="text-xs font-bold text-app-yellow mb-1.5">📋 Exam Tip</div>
                              <p className="text-[13px] text-app-text leading-relaxed m-0">{episode.tip}</p>
                            </div>
                          )}
                          <div className="flex gap-2">
                            {hasSpeech && (
                              <button
                                onClick={() => { setLineIdx(0); setTimeout(() => { autoplayRef.current = true; speakPodcastLine(0, episode.exchanges) }, 100) }}
                                className="primary-btn flex-1"
                              >
                                ▶ Play Again
                              </button>
                            )}
                            <button onClick={() => { stopPodcast(); setLineIdx(0) }} className="ghost-btn flex-1">↺ Restart</button>
                          </div>
                        </>
                      )}

                      {/* Speaking: show last-line skip button */}
                      {atEnd && podcastPlaying && (
                        <button 
                          onClick={stopPodcast} 
                          className="w-full py-3 px-[18px] rounded-[13px] border-none text-app-bg text-[13px] font-extrabold cursor-pointer font-[Sora,sans-serif]"
                          style={{ background: `linear-gradient(135deg, ${COLORS.yellow}, #e6b800)` }}
                        >
                          ⏸ Pause
                        </button>
                      )}

                      {!hasSpeech && (
                        <div className="text-[11px] text-app-muted text-center py-1">
                          💡 Audio not supported in this browser. Read along above.
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* ── Mind Map ── */}
                {mindMap && !studioLoading && (
                  <div className="flex flex-col gap-2.5">
                    <div className="bg-app-blue/15 border-2 border-app-blue rounded-[14px] py-3 px-4 text-center font-extrabold text-[15px] text-app-text">
                      🗺️ {mindMap.center}
                    </div>
                    {mindMap.branches?.map((b, i) => (
                      <div key={i} className="rounded-[14px] p-3.5" style={{ background: `${b.color}10`, border: `1.5px solid ${b.color}40` }}>
                        <div className="font-bold text-sm mb-2" style={{ color: b.color }}>{b.emoji} {b.label}</div>
                        {b.nodes?.map((n, j) => (
                          <div key={j} className="text-[13px] text-app-text py-1 pl-3 mb-1 leading-normal" style={{ borderLeft: `2px solid ${b.color}60` }}>• {n}</div>
                        ))}
                      </div>
                    ))}
                    <button onClick={() => generateStudio("mindmap")} className="ghost-btn">↺ Regenerate</button>
                  </div>
                )}

                {/* ── Flashcards ── */}
                {cards.length > 0 && !studioLoading && (
                  <div className="flex flex-col items-center gap-3.5">
                    {/* Header row */}
                    <div className="flex items-center justify-between w-full">
                      <div className="text-xs text-app-muted">Card {cardIdx + 1} of {cards.length}</div>
                      {cards[cardIdx]?.d && (
                        <div 
                          className="text-[10px] font-extrabold rounded-lg py-0.5 px-2.5 uppercase"
                          style={{
                            color: cards[cardIdx].d === "hard" ? COLORS.red : cards[cardIdx].d === "medium" ? COLORS.yellow : COLORS.green,
                            background: cards[cardIdx].d === "hard" ? `${COLORS.red}15` : cards[cardIdx].d === "medium" ? `${COLORS.yellow}15` : `${COLORS.green}15`,
                          }}
                        >
                          {cards[cardIdx].d}
                        </div>
                      )}
                    </div>
                    {/* Card */}
                    <div
                      onClick={() => setCardFlipped(f => !f)}
                      className="w-full min-h-[180px] rounded-[18px] p-5 cursor-pointer flex flex-col justify-center items-center gap-2.5 text-center transition-all duration-300"
                      style={{
                        background: cardFlipped ? `${COLORS.green}12` : COLORS.card,
                        border: `1.5px solid ${cardFlipped ? COLORS.green : COLORS.border}`,
                      }}
                    >
                      {!cardFlipped ? (
                        <>
                          <div className="text-[11px] text-app-muted font-bold tracking-wider">TAP TO REVEAL ANSWER</div>
                          <div className="text-[15px] font-bold text-app-text leading-normal">{cards[cardIdx]?.q}</div>
                          {cards[cardIdx]?.hint && (
                            <div className="text-xs text-app-muted bg-app-card2 rounded-lg py-1 px-2.5">
                              💡 {cards[cardIdx].hint}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="text-[11px] text-app-green font-bold tracking-wider">ANSWER</div>
                          <div className="text-sm text-app-text leading-relaxed">{cards[cardIdx]?.a}</div>
                        </>
                      )}
                    </div>
                    {/* Dot nav */}
                    <div className="flex gap-1">
                      {cards.map((_, i) => (
                        <div 
                          key={i} 
                          className="h-1.5 rounded-full transition-all duration-300"
                          style={{
                            width: i === cardIdx ? 16 : 6,
                            background: i === cardIdx ? COLORS.green : i < cardIdx ? `${COLORS.green}50` : COLORS.border,
                          }}
                        />
                      ))}
                    </div>
                    {/* Nav buttons */}
                    <div className="flex gap-2.5 w-full">
                      <button
                        onClick={() => { setCardIdx(i => Math.max(0, i - 1)); setCardFlipped(false) }}
                        disabled={cardIdx === 0}
                        className="ghost-btn flex-1"
                      >← Prev</button>
                      <button
                        onClick={() => { setCardIdx(i => Math.min(cards.length - 1, i + 1)); setCardFlipped(false) }}
                        disabled={cardIdx === cards.length - 1}
                        className="primary-btn flex-1"
                      >Next →</button>
                    </div>
                    {cardIdx === cards.length - 1 && (
                      <button onClick={() => { setCardIdx(0); setCardFlipped(false) }} className="ghost-btn w-full">
                        ↺ Restart Deck
                      </button>
                    )}
                  </div>
                )}

                {/* ── Quiz ── */}
                {quizQ && !studioLoading && (
                  <div className="flex flex-col gap-3">
                    {/* Score banner */}
                    <div className="flex items-center justify-between">
                      {quizQ.concept && (
                        <div className="text-[11px] font-bold text-app-blue bg-app-blue/15 rounded-md py-0.5 px-2.5">
                          {quizQ.concept}
                        </div>
                      )}
                      <div className="text-xs font-extrabold text-app-green bg-app-green/15 rounded-lg py-0.5 px-3 ml-auto">
                        ✅ {quizScore.c} / {quizScore.t}
                      </div>
                    </div>
                    {/* Question */}
                    <div className="bg-app-card border border-app-border rounded-[14px] p-4 text-sm text-app-text leading-relaxed font-semibold">
                      {quizQ.q}
                    </div>
                    {/* Options */}
                    <div className="flex flex-col gap-2">
                      {quizQ.o?.map((opt, i) => {
                        const letter = ["A","B","C","D"][i]
                        let bg = COLORS.card, border = COLORS.border, color = COLORS.text
                        if (quizSel) {
                          if (letter === quizQ.c)     { bg = `${COLORS.green}20`; border = COLORS.green; color = COLORS.green }
                          else if (letter === quizSel) { bg = `${COLORS.red}15`;   border = COLORS.red;   color = COLORS.red   }
                          else                         { bg = COLORS.card;          color = COLORS.muted                        }
                        }
                        return (
                          <button 
                            key={letter} 
                            onClick={() => answerQuiz(letter)} 
                            className="w-full rounded-xl py-3 px-3.5 text-[13px] font-[Sora,sans-serif] text-left transition-all duration-200"
                            style={{
                              background: bg,
                              border: `1.5px solid ${border}`,
                              fontWeight: letter === quizQ.c && quizSel ? 700 : 500,
                              color,
                              cursor: quizSel ? "default" : "pointer",
                            }}
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                    {/* Feedback */}
                    {quizSel && (
                      <>
                        <div 
                          className="rounded-xl p-3.5"
                          style={{
                            background: quizSel === quizQ.c ? `${COLORS.green}10` : `${COLORS.red}10`,
                            border: `1px solid ${quizSel === quizQ.c ? COLORS.green : COLORS.red}30`,
                          }}
                        >
                          <div className="text-xs font-bold mb-1.5" style={{ color: quizSel === quizQ.c ? COLORS.green : COLORS.red }}>
                            {quizSel === quizQ.c ? "✅ Correct!" : `❌ Incorrect — Answer: ${quizQ.c}`}
                          </div>
                          <p className="text-[13px] text-app-text leading-relaxed m-0">{quizQ.e}</p>
                        </div>
                        <button onClick={() => generateStudio("quiz")} className="primary-btn">Next Question →</button>
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
