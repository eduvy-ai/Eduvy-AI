import { useState, useRef, useEffect } from 'react'
import { callAI, parseAIObject, parseAIArray, checkStudentQuery } from '../../shared.js'
import { li } from '../../i18n/index.js'

// ── Backend YouTube API (uses yt-dlp on server) ──────────────

async function searchYouTube(query) {
  try {
    const r = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}&limit=12`, {
      signal: AbortSignal.timeout(20000),
    })
    if (!r.ok) return []
    const data = await r.json()
    return (data.items || []).map(i => ({
      id: i.id || '',
      title: i.title || '',
      channel: i.channel || '',
      thumbnail: i.thumbnail || `https://i.ytimg.com/vi/${i.id}/hqdefault.jpg`,
      duration: i.duration || 0,
      views: i.views || 0,
      uploaded: i.uploaded || '',
      source: 'youtube',
    }))
  } catch {
    return []
  }
}

// Smart multi-query YouTube search — 3 targeted concept sub-queries in parallel
async function smartSearchYouTube(query, maxDuration = 180) {
  try {
    const r = await fetch(
      `/api/youtube/smart-search?q=${encodeURIComponent(query)}&limit=12&max_duration=${maxDuration}`,
      { signal: AbortSignal.timeout(38000) }
    )
    if (!r.ok) return []
    const data = await r.json()
    return (data.items || []).map(i => ({
      id: i.id || '',
      title: i.title || '',
      channel: i.channel || '',
      thumbnail: i.thumbnail || `https://i.ytimg.com/vi/${i.id}/hqdefault.jpg`,
      duration: i.duration || 0,
      views: i.views || 0,
      uploaded: i.uploaded || '',
      source: 'youtube',
    }))
  } catch {
    return []
  }
}

async function fetchEduReels(query) {
  // Fetches a unified feed of YouTube Shorts (≤90s) from top Indian educators.
  // Combines creator-targeted (PhysicsWallah, Vedantu, Unacademy, etc.)
  // and concept-targeted queries. Returns portrait-format short videos.
  try {
    const r = await fetch(`/api/youtube/edu-reels?q=${encodeURIComponent(query)}&limit=16`, {
      signal: AbortSignal.timeout(42000),
    })
    if (!r.ok) return []
    const data = await r.json()
    return (data.items || []).map(i => ({
      id: i.id || '',
      title: i.title || '',
      channel: i.channel || '',
      thumbnail: i.thumbnail || `https://i.ytimg.com/vi/${i.id}/hqdefault.jpg`,
      duration: i.duration || 0,
    }))
  } catch {
    return []
  }
}

async function getVideoInfo(videoId) {
  try {
    const r = await fetch(`/api/youtube/video/${videoId}`, {
      signal: AbortSignal.timeout(30000),
    })
    if (!r.ok) return null
    return r.json()
  } catch {
    return null
  }
}

// ── Helpers ──────────────────────────────────────────────────
function fmtDuration(sec) {
  if (!sec) return ''
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtViews(n) {
  if (!n) return ''
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K views`
  return `${n} views`
}

function extractYouTubeId(url) {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0]
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2]
      return u.searchParams.get('v') || ''
    }
  } catch { /* not a URL */ }
  return ''
}

function detectUrlType(url) {
  if (extractYouTubeId(url)) return 'youtube'
  return null
}

// ═════════════════════════════════════════════════════════════
export default function LearnTVTab({ profile }) {
  const [mode, setMode] = useState('discover')  // discover | analyze | create

  // ── Discover state ─────────────────────────────────────────
  const [searchQ, setSearchQ] = useState('')
  const [videos, setVideos] = useState([])
  const [searching, setSearching] = useState(false)
  const [playingId, setPlayingId] = useState(null)
  const [suggested, setSuggested] = useState([])
  const [videoBriefs, setVideoBriefs] = useState({}) // { videoId: { brief, keyPoints, difficulty } }
  const [briefLoading, setBriefLoading] = useState(null) // videoId currently loading
  const [expandedId, setExpandedId] = useState(null) // videoId showing full brief
  const [conceptSummary, setConceptSummary] = useState(null) // AI concept overview for searched topic
  const [conceptLoading, setConceptLoading] = useState(false)

  // ── Reels & Shorts state ────────────────────────────────────
  const [reelsQ, setReelsQ] = useState('')
  const [reelsFeed, setReelsFeed] = useState([])   // unified edu-reels feed (YouTube Shorts)
  const [reelsLoading, setReelsLoading] = useState(false)
  const [reelPlayId, setReelPlayId] = useState(null)
  const [aiReelContent, setAiReelContent] = useState(null)
  const [reelBriefs, setReelBriefs] = useState({}) // { videoId: { summary, keywords, difficulty } }

  // ── Analyze state ──────────────────────────────────────────
  const [pasteUrl, setPasteUrl] = useState('')
  const [urlType, setUrlType] = useState(null) // youtube | instagram | null
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [analyzeVideo, setAnalyzeVideo] = useState(null) // { id, title, ... }

  // ── Create state ───────────────────────────────────────────
  const [createTopic, setCreateTopic] = useState('')
  const [creating, setCreating] = useState(false)
  const [aiContent, setAiContent] = useState(null)
  const [relatedVids, setRelatedVids] = useState([])
  const [createPlayId, setCreatePlayId] = useState(null)

  const searchRef = useRef(null)

  // ── Generate suggested topics on mount ─────────────────────
  useEffect(() => {
    const subs = profile.subjects || []
    const std = profile.standard || 'Class 10'
    const topics = []
    const subList = subs.length ? subs : ['Science', 'Mathematics']
    subList.slice(0, 4).forEach(sub => {
      topics.push(`${sub} ${std} explained`)
      topics.push(`${sub} concepts for Indian students`)
    })
    setSuggested(topics.slice(0, 8))
  }, [profile.subjects, profile.standard])

  // ── Discover: Search ───────────────────────────────────────
  const doSearch = async (q) => {
    const query = (q || searchQ).trim()
    if (!query) return
    // Safety guard
    const safety = checkStudentQuery(query, profile)
    if (safety.blocked) { setVideos([]); setConceptSummary({ headline: safety.message, explanation: '', keyIdeas: [], realLife: [], examTip: '' }); return }
    setSearching(true)
    setPlayingId(null)
    setExpandedId(null)
    setConceptSummary(null)
    const std = profile.standard || ''
    const lang = profile.language || 'English'
    const fullQ = `${query} ${std} ${lang} education India`
    const results = await searchYouTube(fullQ)
    setVideos(results)
    setSearching(false)

    // Auto-generate briefs for first few videos
    if (results.length > 0) {
      generateBriefs(results.slice(0, 6))
    }

    // Generate concept overview for the topic
    generateConceptSummary(query)
  }

  // ── AI Concept Overview for searched topic ─────────────────
  const generateConceptSummary = async (topic) => {
    setConceptLoading(true)
    try {
      const std = profile.standard || 'Class 10'
      const res = await callAI(`Explain the concept "${topic}" to a Class ${std} Indian student.`, "", [], 3, 1500, "learntv_concept")
      const parsed = parseAIObject(res)
      if (parsed) setConceptSummary(parsed)
    } catch { /* best-effort */ }
    setConceptLoading(false)
  }

  // ── AI Brief for videos ────────────────────────────────────
  const generateBriefs = async (vids) => {
    const titles = vids.map((v, i) => `${i + 1}. "${v.title}" by ${v.channel} (${fmtDuration(v.duration)})`).join('\n')
    const res = await callAI(`Here are ${vids.length} educational videos:\n${titles}\n\nGenerate a student-friendly brief for each video.`, "", [], 3, 2000, "learntv_brief")
    const parsed = parseAIArray(res)
    if (parsed?.length) {
      const newBriefs = { ...videoBriefs }
      vids.forEach((v, i) => {
        if (parsed[i]) newBriefs[v.id] = parsed[i]
      })
      setVideoBriefs(newBriefs)
    }
  }

  // ── Single video brief (on-demand) ────────────────────────
  const getBrief = async (video) => {
    if (videoBriefs[video.id]) { setExpandedId(video.id); return }
    setBriefLoading(video.id)
    const res = await callAI(`Analyze this educational video:\nTitle: "${video.title}"\nChannel: ${video.channel}\nDuration: ${fmtDuration(video.duration)}`, "", [], 3, 1200, "learntv_brief")
    const parsed = parseAIObject(res)
    if (parsed) {
      setVideoBriefs(prev => ({ ...prev, [video.id]: parsed }))
    } else {
      setVideoBriefs(prev => ({ ...prev, [video.id]: { brief: res, keyPoints: [], difficulty: '', bestFor: '' } }))
    }
    setBriefLoading(null)
    setExpandedId(video.id)
  }

  // ── AI Smart Summaries for reels ─────────────────────────
  const generateReelBriefs = async (vids, topic) => {
    try {
      const titles = vids.map((v, i) =>
        `${i + 1}. "${v.title}" — ${v.channel} (${fmtDuration(v.duration)})`
      ).join('\n')
      const res = await callAI(`A student searched for "${topic}". Here are ${vids.length} short educational videos:\n${titles}`, "", [], 3, 1800, "learntv_reel_brief")
      const parsed = parseAIArray(res)
      if (parsed?.length) {
        setReelBriefs(prev => {
          const next = { ...prev }
          vids.forEach((v, i) => { if (parsed[i]) next[v.id] = parsed[i] })
          return next
        })
      }
    } catch { /* best-effort */ }
  }

  // ── Background: AI Content Tips for Reels ────────────────
  const generateAiReelContent = async (query, std) => {
    try {
      const res = await callAI(`A Class ${std || 'Class 10'} student wants to learn "${query}" through short videos.`, "", [], 3, 1200, "learntv_reel_tips")
      const parsed = parseAIObject(res)
      if (parsed) setAiReelContent(parsed)
    } catch { /* best-effort */ }
  }

  // ── Unified Reels Search ───────────────────────────────────
  const searchReels = (q) => {
    const query = (q || reelsQ).trim()
    if (!query) return
    const safety = checkStudentQuery(query, profile)
    if (safety.blocked) {
      setReelsFeed([])
      setAiReelContent({ contentTips: [{ title: '🚫 Not Allowed', detail: safety.message }], keyConceptsToFind: [], watchOrder: '' })
      return
    }
    setReelsLoading(true)
    setReelPlayId(null)
    setReelsFeed([])
    setAiReelContent(null)
    setReelBriefs({})

    const std = profile.standard || ''

    // Unified edu-reels fetch (6 parallel queries on backend)
    fetchEduReels(query)
      .catch(() => [])
      .then(results => {
        setReelsFeed(results)
        setReelsLoading(false)
        if (results.length > 0) generateReelBriefs(results.slice(0, 8), query)
      })

    // AI tips in background
    generateAiReelContent(query, std)
  }

  // ── Analyze: Process URL ───────────────────────────────────
  const doAnalyze = async () => {
    const url = pasteUrl.trim()
    if (!url) return
    const type = detectUrlType(url)
    if (!type) {
      setAnalysis({ error: 'Please paste a valid YouTube video or Shorts URL.' })
      return
    }
    setUrlType(type)
    setAnalyzing(true)
    setAnalysis(null)
    setAnalyzeVideo(null)

    if (type === 'youtube') {
      const vid = extractYouTubeId(url)
      setAnalyzeVideo({ id: vid })

      // Get video info + captions
      const info = await getVideoInfo(vid)
      const caption = info?.captions || ''
      const context = caption
        ? `Video title: "${info.title}"\nChannel: ${info.channel}\nTranscript:\n${caption}`
        : info
          ? `Video title: "${info.title}"\nChannel: ${info.channel}\nDescription: ${info.description}`
          : `YouTube video ID: ${vid}`

      if (info) setAnalyzeVideo({ id: vid, ...info })

      const res = await callAI(`Analyze this video and create educational content:\n\n${context}`, "", [], 3, 2000, "learntv_analyze")
      const parsed = parseAIObject(res)
      if (parsed) {
        setAnalysis(parsed)
      } else {
        setAnalysis({ summary: res, keyPoints: [], quiz: null, takeaway: '', difficulty: '', relatedTopics: [] })
      }
    }
    setAnalyzing(false)
  }

  // ── Create: AI Content + Videos ────────────────────────────
  const doCreate = async () => {
    const topic = createTopic.trim()
    if (!topic) return
    setCreating(true)
    setAiContent(null)
    setRelatedVids([])
    setCreatePlayId(null)

    // Run AI content generation + YouTube search in parallel
    const std = profile.standard || 'Class 10'
    const lang = profile.language || 'English'

    const [res, vids] = await Promise.all([
      callAI(`Create a comprehensive educational lesson on "${topic}" for a Class ${std} student.`, "", [], 3, 2500, "learntv_create"),
      searchYouTube(`${topic} ${std} ${lang} education India`),
    ])

    const parsed = parseAIObject(res)
    if (parsed) {
      setAiContent(parsed)
      // If AI suggested search terms, fetch more videos
      if (parsed.searchTerms?.length && vids.length < 4) {
        const more = await searchYouTube(parsed.searchTerms[0] + ' education')
        setRelatedVids([...vids, ...more].slice(0, 8))
      } else {
        setRelatedVids(vids.slice(0, 8))
      }
    } else {
      setAiContent({ title: topic, introduction: '', sections: [], summary: res, searchTerms: [] })
      setRelatedVids(vids.slice(0, 8))
    }
    setCreating(false)
  }

  // ── Quiz state for analyze ─────────────────────────────────
  const [quizSel, setQuizSel] = useState(null)

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="px-4 md:px-6 lg:px-8 py-4">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3.5">
        <span className="text-[22px]">📺</span>
        <h2 className="text-[18px] font-extrabold text-app-text m-0">Learn TV</h2>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-1.5 mb-4 bg-app-card rounded-2xl p-1 border border-app-border">
        {[
          { key: 'discover', icon: '🔍', label: 'Discover' },
          { key: 'reels',    icon: '📸', label: 'Reels' },
          { key: 'analyze',  icon: '🔬', label: 'Analyze' },
          { key: 'create',   icon: '✨', label: 'AI Content' },
        ].map(m => (
          <button key={m.key} onClick={() => setMode(m.key)}
            className={`flex-1 border-none rounded-xl py-2.5 px-1.5 text-[12px] cursor-pointer transition-all ${
              mode === m.key
                ? 'bg-gradient-to-br from-app-green to-[#33cc88] text-app-bg font-extrabold'
                : 'bg-transparent text-app-muted font-medium hover:text-app-text'
            }`}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* ─── DISCOVER MODE ──────────────────────────────────── */}
      {mode === 'discover' && (
        <div>
          {/* Search bar */}
          <div className="flex gap-2 mb-4">
            <input
              ref={searchRef}
              className={inputCls}
              placeholder="Search educational videos…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
            />
            <button
              onClick={() => doSearch()}
              disabled={searching || !searchQ.trim()}
              className={pBtnCls + ' !w-auto !min-w-[60px] !px-4 !py-2.5'}
            >{searching ? '⏳' : '🔍'}</button>
          </div>

          {/* Suggested topics */}
          {!videos.length && !searching && (
            <div>
              <div className="text-[12px] text-app-muted mb-2.5 font-semibold">📚 Suggested for you</div>
              <div className="flex flex-wrap gap-2 mb-4">
                {suggested.map((t, i) => (
                  <button key={i} onClick={() => { setSearchQ(t); doSearch(t) }} className={chipBtnCls}>{t}</button>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {searching && (
            <div className="text-center py-10 text-app-muted">
              <div className="text-[28px] mb-2.5">🔍</div>
              Searching YouTube…
            </div>
          )}

          {/* ── AI Concept Overview card ── */}
          {(conceptLoading || conceptSummary) && (
            <div className="border border-app-green/20 rounded-2xl px-4 py-3.5 mb-3.5" style={{ background: 'linear-gradient(135deg,#00E5A012,#7B9CFF10)' }}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-base">🧠</span>
                <span className="text-[13px] font-bold text-app-green">Concept Overview</span>
                {conceptLoading && <span className="text-[11px] text-app-muted ml-1">AI is thinking…</span>}
              </div>

              {conceptLoading && !conceptSummary && (
                <div className="flex gap-1.5">
                  {[1,2,3].map(i => (
                    <div key={i} className={`h-2.5 rounded-full bg-app-green/15 animate-pulse ${i === 2 ? 'flex-[2]' : 'flex-1'}`} />
                  ))}
                </div>
              )}

              {conceptSummary && (
                <div>
                  <div className="text-sm font-bold text-app-text mb-2 leading-snug">{conceptSummary.headline}</div>

                  {/* Explanation */}
                  <div className="text-[12px] text-app-text/85 leading-[1.7] mb-2.5">
                    {conceptSummary.explanation}
                  </div>

                  {/* Key Ideas */}
                  {conceptSummary.keyIdeas?.length > 0 && (
                    <div className="mb-2.5">
                      <div className="text-[11px] font-bold text-app-blue mb-1.5">💡 Key Ideas</div>
                      <div className="flex flex-col gap-1">
                        {conceptSummary.keyIdeas.map((idea, i) => (
                          <div key={i} className="text-[12px] text-app-text leading-[1.5] flex gap-2">
                            <span className="text-app-blue font-bold">•</span>
                            <span>{idea}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Real Life Examples */}
                  {conceptSummary.realLife?.length > 0 && (
                    <div className="mb-2.5">
                      <div className="text-[11px] font-bold text-app-yellow mb-1.5">🌍 Real-Life Examples</div>
                      <div className="flex gap-2 flex-wrap">
                        {conceptSummary.realLife.map((ex, i) => (
                          <span key={i} className="text-[11px] text-app-text px-2.5 py-0.5 rounded-[10px] bg-app-yellow/10 border border-app-yellow/20">{ex}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Exam Tip */}
                  {conceptSummary.examTip && (
                    <div className="bg-[#FF6B3515] border border-[#FF6B3530] rounded-lg px-3 py-2 text-[12px] text-app-text leading-[1.5]">
                      <span className="font-bold text-app-orange">📝 Exam Tip: </span>
                      {conceptSummary.examTip}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Video grid */}
          {videos.length > 0 && (
            <div className="flex flex-col gap-3">
              {videos.map(v => {
                const brief = videoBriefs[v.id]
                const isExpanded = expandedId === v.id
                return (
                  <div key={v.id} className={cardCls}>
                    <div className="flex gap-3">
                      {/* Thumbnail / Player */}
                      <div className="w-40 min-w-[160px] flex-shrink-0">
                        {playingId === v.id ? (
                          <div className="relative pt-[56.25%] rounded-lg overflow-hidden">
                            <iframe
                              src={`https://www.youtube.com/embed/${v.id}?autoplay=1`}
                              className="absolute inset-0 w-full h-full border-none"
                              allow="autoplay; encrypted-media"
                              allowFullScreen
                              title={v.title}
                            />
                          </div>
                        ) : (
                          <div
                            onClick={() => setPlayingId(v.id)}
                            className="relative cursor-pointer rounded-lg overflow-hidden"
                          >
                            <img
                              src={v.thumbnail}
                              alt={v.title}
                              className="w-full aspect-video object-cover block"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <div className="w-8 h-8 rounded-full bg-black/70 flex items-center justify-center text-[13px]">▶</div>
                            </div>
                            {v.duration > 0 && (
                              <div className="absolute bottom-1 right-1 bg-black/80 rounded px-1.5 text-[10px] text-white font-bold">{fmtDuration(v.duration)}</div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-app-text leading-[1.4] mb-1">
                          {v.title?.slice(0, 80)}
                        </div>
                        <div className="text-[11px] text-app-muted mb-1.5">
                          {v.channel} {v.views ? `· ${fmtViews(v.views)}` : ''} {v.uploaded ? `· ${v.uploaded}` : ''}
                        </div>

                        {/* AI Brief summary */}
                        {brief && (
                          <div className="text-[12px] text-app-text/85 leading-[1.5] mb-1.5">
                            {brief.brief}
                          </div>
                        )}

                        {/* Difficulty + bestFor chips */}
                        {brief && (
                          <div className="flex gap-1.5 flex-wrap mb-1">
                            {brief.difficulty && (
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                                background: brief.difficulty === 'Beginner' ? `#00E5A020` : brief.difficulty === 'Advanced' ? `#FF6B6B20` : `#FFD16620`,
                                color: brief.difficulty === 'Beginner' ? '#00E5A0' : brief.difficulty === 'Advanced' ? '#FF6B6B' : '#FFD166',
                                border: `1px solid ${brief.difficulty === 'Beginner' ? '#00E5A040' : brief.difficulty === 'Advanced' ? '#FF6B6B40' : '#FFD16640'}`,
                              }}>{brief.difficulty}</span>
                            )}
                            {brief.bestFor && (
                              <span className="text-[10px] text-app-muted px-2 py-0.5 rounded-[10px] bg-app-blue/[0.06] border border-app-blue/20">
                                {brief.bestFor}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Expand/Get brief button */}
                        {!brief && (
                          <button
                            onClick={() => getBrief(v)}
                            disabled={briefLoading === v.id}
                            className="text-[11px] text-app-green bg-transparent border-none cursor-pointer p-0 font-semibold"
                          >{briefLoading === v.id ? '⏳ Analyzing…' : '🤖 AI Brief'}</button>
                        )}
                        {brief && !isExpanded && (
                          <button
                            onClick={() => setExpandedId(v.id)}
                            className="text-[11px] text-app-blue bg-transparent border-none cursor-pointer p-0 font-semibold mt-0.5"
                          >▼ Show key points</button>
                        )}
                        {brief && isExpanded && (
                          <button
                            onClick={() => setExpandedId(null)}
                            className="text-[11px] text-app-blue bg-transparent border-none cursor-pointer p-0 font-semibold mt-0.5"
                          >▲ Hide details</button>
                        )}
                      </div>
                    </div>

                    {/* Expanded key points */}
                    {brief && isExpanded && (
                      <div className="mt-2.5 pt-2.5 border-t border-app-border">
                        {brief.keyPoints?.length > 0 && (
                          <div className="mb-2">
                            <div className="text-[11px] font-bold text-app-green mb-1.5">🎯 Key Points</div>
                            {brief.keyPoints.map((pt, i) => (
                              <div key={i} className="text-[12px] text-app-text leading-[1.6] pl-3">
                                • {pt}
                              </div>
                            ))}
                          </div>
                        )}
                        {brief.prerequisites && (
                          <div className="text-[11px] text-app-muted mt-1.5">
                            📋 Prerequisites: {brief.prerequisites}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* No results */}
          {!searching && videos.length === 0 && searchQ && (
            <div className="text-center p-7 text-app-muted">
              No videos found. Try a different search.
            </div>
          )}
        </div>
      )}

      {/* ─── REELS MODE ───────────────────────────────────── */}
      {mode === 'reels' && (
        <div>
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-[20px]">📱</span>
            <span className="text-[15px] font-bold text-app-text">Edu Reels</span>
            <span className="text-[10px] text-app-muted bg-app-green/[0.08] border border-app-green/20 rounded-md px-2 py-0.5 font-semibold">
              PhysicsWallah · Vedantu · Unacademy · more
            </span>
          </div>
          <div className="text-[11px] text-app-muted mb-3.5">
            Short videos (≤ 90s) from India's top educators — play right here, no redirects.
          </div>

          {/* ── Search Bar ── */}
          <div className="flex gap-2 mb-2.5">
            <input
              className={inputCls}
              placeholder="Search topic… e.g. Newton's Laws, Photosynthesis, Python loops"
              value={reelsQ}
              onChange={e => setReelsQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchReels()}
            />
            <button
              onClick={() => searchReels()}
              disabled={reelsLoading || !reelsQ.trim()}
              className={pBtnCls + ' !w-auto !min-w-[80px] !px-4 !py-2.5'}
            >{reelsLoading ? '⏳ Searching…' : '🔍 Search'}</button>
          </div>

          {/* Quick topic chips */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {['Physics', 'Chemistry', 'AI', 'Mathematics', 'Biology', 'English', 'History', 'Python'].map(sub => (
              <button
                key={sub}
                onClick={() => { setReelsQ(sub); searchReels(sub) }}
                className={chipBtnCls + ' !text-[11px] !px-3 !py-1'}
              >{sub}</button>
            ))}
          </div>

          {/* ── Loading Skeleton (portrait cards) ── */}
          {reelsLoading && (
            <div>
              <div className="text-[12px] font-bold text-app-green mb-2.5">
                📱 Fetching Edu Reels…
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="bg-app-card rounded-xl overflow-hidden border border-app-border">
                    <div className="aspect-[9/16] bg-app-green/[0.03] animate-pulse" />
                    <div className="px-2.5 py-2">
                      <div className="h-[9px] rounded-md bg-app-muted/[0.13] mb-1.5 animate-pulse" />
                      <div className="h-2 rounded-md bg-app-muted/[0.08] w-[60%] animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Edu Reels Feed (portrait grid) ── */}
          {reelsFeed.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[12px] font-bold text-app-green">
                  📱 {reelsFeed.length} Edu Reels found
                </span>
                <span className="text-[10px] text-app-muted">Tap any card to play</span>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3.5">
                {reelsFeed.map(v => {
                  const brief = reelBriefs[v.id]
                  const isPlaying = reelPlayId === v.id
                  return (
                    <div key={v.id} className={`bg-app-card rounded-[14px] overflow-hidden transition-shadow duration-200 ${isPlaying ? 'border border-app-green shadow-[0_0_0_2px_#00E5A040]' : 'border border-app-border'}`}>
                      {/* Portrait player / thumbnail */}
                      {isPlaying ? (
                        <div className="relative pt-[177.78%]">
                          <iframe
                            src={`https://www.youtube.com/embed/${v.id}?autoplay=1&rel=0`}
                            className="absolute inset-0 w-full h-full border-none"
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                            title={v.title}
                          />
                          {/* Close button */}
                          <button
                            onClick={() => setReelPlayId(null)}
                            className="absolute top-1.5 right-1.5 z-10 w-[26px] h-[26px] rounded-full bg-black/70 border-none text-white text-[13px] cursor-pointer flex items-center justify-center"
                          >✕</button>
                        </div>
                      ) : (
                        <div
                          onClick={() => setReelPlayId(v.id)}
                          className="relative cursor-pointer pt-[177.78%] bg-black"
                        >
                          <img
                            src={v.thumbnail}
                            alt={v.title}
                            className="absolute inset-0 w-full h-full object-cover block"
                            loading="lazy"
                          />
                          {/* Gradient + play button */}
                          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 40%, transparent 70%)' }}>
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-app-green to-['#33cc88'] flex items-center justify-center text-[17px] text-app-bg shadow-[0_2px_16px_rgba(0,0,0,0.5)]">▶</div>
                          </div>
                          {/* Duration badge */}
                          {v.duration > 0 && (
                            <div className="absolute bottom-2 right-2 bg-black/[0.72] rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white">{fmtDuration(v.duration)}</div>
                          )}
                          {/* Channel badge */}
                          <div className="absolute bottom-2 left-2 bg-app-green/[0.8] rounded-md px-1.5 py-0.5 text-[8px] font-bold text-app-bg max-w-[65%] overflow-hidden text-ellipsis whitespace-nowrap">{v.channel}</div>
                        </div>
                      )}

                      {/* Info panel */}
                      <div className="px-2.5 pt-2 pb-2.5">
                        <div className="text-[11px] font-semibold text-app-text leading-[1.35] mb-1">
                          {v.title?.slice(0, 65)}
                        </div>

                        {/* AI summary */}
                        {brief?.summary && (
                          <div className="text-[9px] text-app-muted leading-[1.5] bg-app-card2 rounded-md px-1.5 py-1 mb-1">
                            🤖 {brief.summary}
                          </div>
                        )}

                        {/* Difficulty + keywords */}
                        <div className="flex flex-wrap gap-1">
                          {brief?.difficulty && (
                            <span style={{
                              fontSize: 8, padding: '2px 6px', borderRadius: 5, fontWeight: 700,
                              background: brief.difficulty === 'Easy' ? `#00E5A018` : brief.difficulty === 'Hard' ? `#FF6B6B18` : `#FFD16618`,
                              color: brief.difficulty === 'Easy' ? '#00E5A0' : brief.difficulty === 'Hard' ? '#FF6B6B' : '#FFD166',
                            }}>{brief.difficulty}</span>
                          )}
                          {brief?.keywords?.slice(0, 3).map((kw, i) => (
                            <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-app-blue/[0.07] text-app-blue">{kw}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── AI Content Tips ── */}
          {aiReelContent && (
            <div className="mb-5">
              {aiReelContent.keyConceptsToFind?.length > 0 && (
                <div className="mb-3.5">
                  <div className="text-[12px] font-bold text-app-text mb-2">
                    🎯 Search these concepts too
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {aiReelContent.keyConceptsToFind.map((concept, i) => (
                      <button
                        key={i}
                        onClick={() => { setReelsQ(concept); searchReels(concept) }}
                        className="bg-app-green/5 border border-app-green/20 text-app-green rounded-full px-3 py-1.5 text-[11px] cursor-pointer hover:bg-app-green/10 transition-all active:scale-95"
                      >🔍 {concept}</button>
                    ))}
                  </div>
                </div>
              )}
              {aiReelContent.contentTips?.length > 0 && (
                <div className={cardCls + ' !border-app-green/20 mb-3.5'} style={{ background: '#00E5A006' }}>
                  <div className="text-[12px] font-bold text-app-green mb-1.5">💡 Study Tips</div>
                  {aiReelContent.contentTips.map((tip, i) => (
                    <div key={i} className="mb-1.5">
                      <div className="text-[11px] font-bold text-app-text">{tip.title}</div>
                      <div className="text-[11px] text-app-muted leading-[1.5]">{tip.detail}</div>
                    </div>
                  ))}
                </div>
              )}
              {aiReelContent.watchOrder && (
                <div className={cardCls + ' !border-app-blue/20 mb-3.5'} style={{ background: '#7B9CFF06' }}>
                  <div className="text-[12px] font-bold text-app-blue mb-1">📋 Suggested watch order</div>
                  <div className="text-[11px] text-app-text leading-[1.6]">{aiReelContent.watchOrder}</div>
                </div>
              )}
            </div>
          )}

          {/* ── Empty state ── */}
          {reelsFeed.length === 0 && !reelsLoading && !aiReelContent && (
            <div className="text-center px-5 py-9 text-app-muted">
              <div className="text-[40px] mb-3">📱</div>
              <div className="text-[14px] font-bold text-app-text mb-1.5">Search any topic above</div>
              <div className="text-[12px] leading-[1.7]">
                Get short videos (≤ 90s) from<br />
                <span className="text-app-green font-semibold">PhysicsWallah · Vedantu · Unacademy</span><br />
                <span className="text-app-blue font-semibold">CodeWithHarry · Apna College · and more</span>
              </div>
            </div>
          )}
        </div>
      )}



      {/* ─── ANALYZE MODE ──────────────────────────────────── */}
      {mode === 'analyze' && (
        <div>
          {/* URL input */}
          <div className="mb-4">
            <label className={labelCls}>PASTE YOUTUBE VIDEO OR SHORTS URL</label>
            <div className="flex gap-2">
              <input
                className={inputCls}
                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                value={pasteUrl}
                onChange={e => setPasteUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doAnalyze()}
              />
              <button
                onClick={doAnalyze}
                disabled={analyzing || !pasteUrl.trim()}
                className={pBtnCls + ' !w-auto !min-w-[80px] !px-4 !py-2.5'}
              >{analyzing ? '⏳ Analyzing…' : '🔬 Analyze'}</button>
            </div>
            <div className="text-[11px] text-app-muted mt-1.5">
              Supports: YouTube videos and YouTube Shorts
            </div>
          </div>

          {/* Analysis error */}
          {analysis?.error && (
            <div className={cardCls + ' !border-app-red/25'} style={{ background: '#FF6B6B10' }}>
              <div className="text-app-red text-[13px]">⚠️ {analysis.error}</div>
            </div>
          )}

          {/* Loading */}
          {analyzing && (
            <div className="text-center p-10 text-app-muted">
              <div className="text-[28px] mb-2.5">🔬</div>
              <div className="mb-1.5">Analyzing video…</div>
              <div className="text-[11px]">Fetching captions & generating insights</div>
            </div>
          )}

          {/* Video embed + analysis */}
          {analyzeVideo && !analyzing && (
            <div>
              {/* Embedded player */}
              {analyzeVideo.id && (
                <div className="relative pt-[56.25%] rounded-xl overflow-hidden mb-4 border border-app-border">
                  <iframe
                    src={`https://www.youtube.com/embed/${analyzeVideo.id}`}
                    className="absolute inset-0 w-full h-full border-none"
                    allow="encrypted-media"
                    allowFullScreen
                    title={analyzeVideo.title || 'Video'}
                  />
                </div>
              )}
              {/* No Instagram iframe embed */}

              {/* Video title */}
              {analyzeVideo.title && (
                <div className="text-[15px] font-bold text-app-text mb-1">
                  {analyzeVideo.title}
                </div>
              )}
              {analyzeVideo.channel && (
                <div className="text-[12px] text-app-muted mb-4">
                  {analyzeVideo.channel} {analyzeVideo.views ? `· ${fmtViews(analyzeVideo.views)}` : ''}
                </div>
              )}
            </div>
          )}

          {/* Analysis results */}
          {analysis && !analysis.error && !analyzing && (
            <div className="flex flex-col gap-3">
              {/* Summary */}
              {analysis.summary && (
                <div className={cardCls}>
                  <div className={sectionTitleCls}>📝 Summary</div>
                  <div className="text-[13px] text-app-text leading-[1.7] whitespace-pre-wrap">
                    {analysis.summary}
                  </div>
                </div>
              )}

              {/* Difficulty */}
              {analysis.difficulty && (
                <div className={chipCls + ' inline-block self-start'}>
                  📊 {analysis.difficulty}
                </div>
              )}

              {/* Key Points */}
              {analysis.keyPoints?.length > 0 && (
                <div className={cardCls}>
                  <div className={sectionTitleCls}>🎯 Key Points</div>
                  {analysis.keyPoints.map((p, i) => (
                    <div key={i} className={`text-[13px] text-app-text py-1.5 leading-[1.5] ${i < analysis.keyPoints.length - 1 ? 'border-b border-app-border' : ''}`}>
                      <span className="text-app-green font-bold mr-2">{i + 1}.</span>
                      {p}
                    </div>
                  ))}
                </div>
              )}

              {/* Study tips (Instagram) */}
              {analysis.studyTips?.length > 0 && (
                <div className={cardCls}>
                  <div className={sectionTitleCls}>💡 Study Tips</div>
                  {analysis.studyTips.map((t, i) => (
                    <div key={i} className="text-[13px] text-app-text py-1.5 leading-[1.5]">
                      💡 {t}
                    </div>
                  ))}
                </div>
              )}

              {/* Takeaway */}
              {analysis.takeaway && (
                <div className={cardCls + ' !border-app-green/20'} style={{ background: '#00E5A010' }}>
                  <div className="text-[13px] font-bold text-app-green">
                    💎 {analysis.takeaway}
                  </div>
                </div>
              )}

              {/* Quiz */}
              {analysis.quiz && (
                <div className={cardCls}>
                  <div className={sectionTitleCls}>🧪 Quick Quiz</div>
                  <div className="text-[13px] font-semibold text-app-text mb-2.5">
                    {analysis.quiz.question}
                  </div>
                  {analysis.quiz.options?.map((opt, i) => {
                    const isCorrect = i === analysis.quiz.answer
                    const selected = quizSel === i
                    const showResult = quizSel !== null
                    return (
                      <button
                        key={i}
                        onClick={() => quizSel === null && setQuizSel(i)}
                        disabled={quizSel !== null}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 14px',
                          marginBottom: 6,
                          borderRadius: 10,
                          border: `1.5px solid ${showResult ? (isCorrect ? '#00E5A0' : selected ? '#FF6B6B' : 'rgba(255,255,255,0.03)') : 'rgba(255,255,255,0.03)'}`,
                          background: showResult ? (isCorrect ? `#00E5A015` : selected ? `#FF6B6B15` : '#0b0b1c') : '#0b0b1c',
                          color: '#eeeeff',
                          fontSize: 13,
                          cursor: quizSel === null ? 'pointer' : 'default',
                          fontFamily: 'Sora, sans-serif',
                        }}
                      >
                        {String.fromCharCode(65 + i)}. {opt}
                        {showResult && isCorrect && ' ✅'}
                        {showResult && selected && !isCorrect && ' ❌'}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Related topics */}
              {analysis.relatedTopics?.length > 0 && (
                <div className={cardCls}>
                  <div className={sectionTitleCls}>🔗 Explore More</div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.relatedTopics.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => { setMode('discover'); setSearchQ(t); doSearch(t) }}
                        className={chipBtnCls}
                      >{t}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!analyzing && !analysis && !analyzeVideo && (
            <div className="text-center px-5 py-10 text-app-muted">
              <div className="text-[40px] mb-3">🎬</div>
              <div className="text-[14px] font-semibold mb-1.5 text-app-text">Analyze any video</div>
              <div className="text-[12px] leading-[1.6]">
                Paste a YouTube video or Shorts URL above.<br />
                AI will generate a summary, key points, and a quiz!
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── CREATE MODE ───────────────────────────────────── */}
      {mode === 'create' && (
        <div>
          {/* Topic input */}
          <div className="mb-4">
            <label className={labelCls}>ENTER A TOPIC</label>
            <div className="flex gap-2">
              <input
                className={inputCls}
                placeholder="e.g. Photosynthesis, Quadratic Equations, French Revolution…"
                value={createTopic}
                onChange={e => setCreateTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doCreate()}
              />
              <button
                onClick={doCreate}
                disabled={creating || !createTopic.trim()}
                className={pBtnCls + ' !w-auto !min-w-[80px] !px-4 !py-2.5'}
              >{creating ? '⏳' : '✨ Create'}</button>
            </div>
          </div>

          {/* Loading */}
          {creating && (
            <div className="text-center p-10 text-app-muted">
              <div className="text-[28px] mb-2.5">✨</div>
              <div className="mb-1.5">Creating AI lesson + finding videos…</div>
              <div className="text-[11px]">This may take a few seconds</div>
            </div>
          )}

          {/* AI Content */}
          {aiContent && !creating && (
            <div className="flex flex-col gap-3">
              {/* Title */}
              <div className="text-[17px] font-extrabold text-app-text">
                {aiContent.title}
              </div>
              {aiContent.introduction && (
                <div className="text-[13px] text-app-muted leading-[1.6]">
                  {aiContent.introduction}
                </div>
              )}

              {/* Sections */}
              {aiContent.sections?.map((sec, i) => (
                <div key={i} className={cardCls}>
                  <div className="text-[14px] font-bold text-app-text mb-1.5">
                    {sec.emoji || '📖'} {sec.heading}
                  </div>
                  <div className="text-[13px] text-app-text leading-[1.7] whitespace-pre-wrap">
                    {sec.content}
                  </div>
                </div>
              ))}

              {/* Key Formulas */}
              {aiContent.keyFormulas?.length > 0 && (
                <div className={cardCls + ' !border-app-blue/20'} style={{ background: '#7B9CFF10' }}>
                  <div className={sectionTitleCls}>📐 Key Formulas</div>
                  {aiContent.keyFormulas.map((f, i) => (
                    <div key={i} className="text-[13px] text-app-text py-1 font-mono">
                      {f}
                    </div>
                  ))}
                </div>
              )}

              {/* Fun Fact */}
              {aiContent.funFact && (
                <div className={cardCls + ' !border-app-yellow/20'} style={{ background: '#FFD16610' }}>
                  <div className="text-[13px] text-app-yellow font-semibold">
                    🤩 Fun Fact: {aiContent.funFact}
                  </div>
                </div>
              )}

              {/* Summary */}
              {aiContent.summary && (
                <div className={cardCls + ' !border-app-green/20'} style={{ background: '#00E5A010' }}>
                  <div className={sectionTitleCls}>📋 Summary</div>
                  <div className="text-[13px] text-app-text leading-[1.7] whitespace-pre-wrap">
                    {aiContent.summary}
                  </div>
                </div>
              )}

              {/* Related Videos */}
              {relatedVids.length > 0 && (
                <div>
                  <div className={sectionTitleCls + ' !mb-2.5'}>🎬 Related Videos</div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
                    {relatedVids.map(v => (
                      <div key={v.id} className={cardCls}>
                        {createPlayId === v.id ? (
                          <div className="relative pt-[56.25%] rounded-lg overflow-hidden mb-1.5">
                            <iframe
                              src={`https://www.youtube.com/embed/${v.id}?autoplay=1`}
                              className="absolute inset-0 w-full h-full border-none"
                              allow="autoplay; encrypted-media"
                              allowFullScreen
                              title={v.title}
                            />
                          </div>
                        ) : (
                          <div
                            onClick={() => setCreatePlayId(v.id)}
                            className="relative cursor-pointer rounded-lg overflow-hidden mb-1.5"
                          >
                            <img
                              src={v.thumbnail}
                              alt={v.title}
                              className="w-full aspect-video object-cover block"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <div className="w-9 h-9 rounded-full bg-black/70 flex items-center justify-center text-sm">▶</div>
                            </div>
                            {v.duration > 0 && (
                              <div className="absolute bottom-1 right-1 bg-black/80 rounded px-1.5 text-[10px] text-white font-bold">{fmtDuration(v.duration)}</div>
                            )}
                          </div>
                        )}
                        <div className="text-[12px] font-semibold text-app-text leading-[1.3]">
                          {v.title?.slice(0, 60)}
                        </div>
                        <div className="text-[10px] text-app-muted mt-0.5">
                          {v.channel}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!creating && !aiContent && (
            <div className="text-center px-5 py-10 text-app-muted">
              <div className="text-[40px] mb-3">✨</div>
              <div className="text-[14px] font-semibold mb-1.5 text-app-text">AI-Powered Lessons</div>
              <div className="text-[12px] leading-[1.6]">
                Enter any topic above. AI will create a<br />
                complete lesson with related YouTube videos!
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────
const inputCls = "flex-1 bg-app-card2 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-app-text text-[13px] outline-none focus:border-app-green/40 transition-colors placeholder:text-app-muted"
const pBtnCls = "w-full bg-gradient-to-br from-app-green to-[#33cc88] text-app-bg border-none rounded-xl px-4 py-3 text-[13px] font-extrabold cursor-pointer disabled:opacity-60 active:scale-[0.99] transition-all"
const cardCls = "bg-app-card border border-app-border rounded-2xl px-4 py-3.5"
const labelCls = "block text-[11px] font-bold text-app-muted mb-1.5 tracking-[0.05em]"
const sectionTitleCls = "text-[13px] font-bold text-app-green mb-2"
const chipBtnCls = "bg-app-card border border-app-border rounded-full px-3.5 py-1.5 text-[12px] text-app-text cursor-pointer hover:bg-white/[0.04] active:scale-95 transition-all"
const chipCls = "bg-app-blue/10 border border-app-blue/20 rounded-full px-3 py-1 text-[12px] font-semibold text-app-blue"
