import { useState, useRef, useEffect } from 'react'
import { COLORS, callAI, parseAIObject, parseAIArray, checkStudentQuery } from '../../shared.js'
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
      const res = await callAI(prompt, "", [], 3, 1800, "learntv_reel_brief")
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
      const res = await callAI(prompt, "", [], 3, 1200, "learntv_reel_tips")
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

      const res = await callAI(prompt, "", [], 3, 2000, "learntv_analyze")
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
    <div style={{ padding: '0 2px', maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 22 }}>📺</span>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: COLORS.text, margin: 0 }}>Learn TV</h2>
      </div>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, background: COLORS.card, borderRadius: 14, padding: 4, border: `1px solid ${COLORS.border}` }}>
        {[
          { key: 'discover', icon: '🔍', label: 'Discover' },
          { key: 'reels',    icon: '📸', label: 'Reels' },
          { key: 'analyze',  icon: '🔬', label: 'Analyze' },
          { key: 'create',   icon: '✨', label: 'AI Content' },
        ].map(m => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            style={{
              flex: 1,
              background: mode === m.key ? `linear-gradient(135deg, ${COLORS.green}, #33cc88)` : 'transparent',
              border: 'none',
              borderRadius: 10,
              padding: '10px 6px',
              fontSize: 12,
              fontWeight: mode === m.key ? 800 : 500,
              color: mode === m.key ? '#04040e' : COLORS.muted,
              cursor: 'pointer',
              fontFamily: 'Sora, sans-serif',
            }}
          >{m.icon} {m.label}</button>
        ))}
      </div>

      {/* ─── DISCOVER MODE ──────────────────────────────────── */}
      {mode === 'discover' && (
        <div>
          {/* Search bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              ref={searchRef}
              style={inputStyle}
              placeholder="Search educational videos…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
            />
            <button
              onClick={() => doSearch()}
              disabled={searching || !searchQ.trim()}
              style={{ ...pBtn, padding: '10px 18px', width: 'auto', minWidth: 60 }}
            >{searching ? '⏳' : '🔍'}</button>
          </div>

          {/* Suggested topics */}
          {!videos.length && !searching && (
            <div>
              <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 10, fontWeight: 600 }}>
                📚 Suggested for you
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                {suggested.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => { setSearchQ(t); doSearch(t) }}
                    style={chipBtn}
                  >{t}</button>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {searching && (
            <div style={{ textAlign: 'center', padding: 40, color: COLORS.muted }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
              Searching YouTube…
            </div>
          )}

          {/* ── AI Concept Overview card ── */}
          {(conceptLoading || conceptSummary) && (
            <div style={{
              background: `linear-gradient(135deg, ${COLORS.green}12, ${COLORS.blue}10)`,
              border: `1px solid ${COLORS.green}30`,
              borderRadius: 14,
              padding: '14px 16px',
              marginBottom: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>🧠</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.green }}>Concept Overview</span>
                {conceptLoading && <span style={{ fontSize: 11, color: COLORS.muted, marginLeft: 4 }}>AI is thinking…</span>}
              </div>

              {conceptLoading && !conceptSummary && (
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ height: 10, borderRadius: 6, background: `${COLORS.green}20`, flex: i === 2 ? 2 : 1, animation: 'pulse 1.5s ease-in-out infinite' }} />
                  ))}
                </div>
              )}

              {conceptSummary && (
                <div>
                  {/* Headline */}
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 8, lineHeight: 1.4 }}>
                    {conceptSummary.headline}
                  </div>

                  {/* Explanation */}
                  <div style={{ fontSize: 12, color: COLORS.text, opacity: 0.85, lineHeight: 1.7, marginBottom: 10 }}>
                    {conceptSummary.explanation}
                  </div>

                  {/* Key Ideas */}
                  {conceptSummary.keyIdeas?.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.blue, marginBottom: 6 }}>💡 Key Ideas</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {conceptSummary.keyIdeas.map((idea, i) => (
                          <div key={i} style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.5, display: 'flex', gap: 8 }}>
                            <span style={{ color: COLORS.blue, fontWeight: 700 }}>•</span>
                            <span>{idea}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Real Life Examples */}
                  {conceptSummary.realLife?.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.yellow, marginBottom: 6 }}>🌍 Real-Life Examples</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {conceptSummary.realLife.map((ex, i) => (
                          <span key={i} style={{
                            fontSize: 11, color: COLORS.text, padding: '3px 10px', borderRadius: 10,
                            background: `${COLORS.yellow}15`, border: `1px solid ${COLORS.yellow}30`,
                          }}>{ex}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Exam Tip */}
                  {conceptSummary.examTip && (
                    <div style={{
                      background: `${COLORS.orange}15`, border: `1px solid ${COLORS.orange}30`,
                      borderRadius: 8, padding: '8px 12px', fontSize: 12,
                      color: COLORS.text, lineHeight: 1.5,
                    }}>
                      <span style={{ fontWeight: 700, color: COLORS.orange }}>📝 Exam Tip: </span>
                      {conceptSummary.examTip}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Video grid */}
          {videos.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {videos.map(v => {
                const brief = videoBriefs[v.id]
                const isExpanded = expandedId === v.id
                return (
                  <div key={v.id} style={cardStyle}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {/* Thumbnail / Player */}
                      <div style={{ width: 160, minWidth: 160, flexShrink: 0 }}>
                        {playingId === v.id ? (
                          <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 8, overflow: 'hidden' }}>
                            <iframe
                              src={`https://www.youtube.com/embed/${v.id}?autoplay=1`}
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                              allow="autoplay; encrypted-media"
                              allowFullScreen
                              title={v.title}
                            />
                          </div>
                        ) : (
                          <div
                            onClick={() => setPlayingId(v.id)}
                            style={{ position: 'relative', cursor: 'pointer', borderRadius: 8, overflow: 'hidden' }}
                          >
                            <img
                              src={v.thumbnail}
                              alt={v.title}
                              style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
                              loading="lazy"
                            />
                            <div style={{
                              position: 'absolute', inset: 0, display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              background: 'rgba(0,0,0,0.3)',
                            }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: 'rgba(0,0,0,0.7)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                fontSize: 13,
                              }}>▶</div>
                            </div>
                            {v.duration > 0 && (
                              <div style={{
                                position: 'absolute', bottom: 4, right: 4,
                                background: 'rgba(0,0,0,0.8)', borderRadius: 4,
                                padding: '1px 5px', fontSize: 10, color: '#fff', fontWeight: 600,
                              }}>{fmtDuration(v.duration)}</div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, lineHeight: 1.4, marginBottom: 4 }}>
                          {v.title?.slice(0, 80)}
                        </div>
                        <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 6 }}>
                          {v.channel} {v.views ? `· ${fmtViews(v.views)}` : ''} {v.uploaded ? `· ${v.uploaded}` : ''}
                        </div>

                        {/* AI Brief summary */}
                        {brief && (
                          <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.5, marginBottom: 6, opacity: 0.85 }}>
                            {brief.brief}
                          </div>
                        )}

                        {/* Difficulty + bestFor chips */}
                        {brief && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                            {brief.difficulty && (
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                                background: brief.difficulty === 'Beginner' ? `${COLORS.green}20` : brief.difficulty === 'Advanced' ? `${COLORS.red}20` : `${COLORS.yellow}20`,
                                color: brief.difficulty === 'Beginner' ? COLORS.green : brief.difficulty === 'Advanced' ? COLORS.red : COLORS.yellow,
                                border: `1px solid ${brief.difficulty === 'Beginner' ? COLORS.green : brief.difficulty === 'Advanced' ? COLORS.red : COLORS.yellow}40`,
                              }}>{brief.difficulty}</span>
                            )}
                            {brief.bestFor && (
                              <span style={{ fontSize: 10, color: COLORS.muted, padding: '2px 8px', borderRadius: 10, background: `${COLORS.blue}10`, border: `1px solid ${COLORS.blue}20` }}>
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
                            style={{ fontSize: 11, color: COLORS.green, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Sora, sans-serif', padding: 0, fontWeight: 600 }}
                          >{briefLoading === v.id ? '⏳ Analyzing…' : '🤖 AI Brief'}</button>
                        )}
                        {brief && !isExpanded && (
                          <button
                            onClick={() => setExpandedId(v.id)}
                            style={{ fontSize: 11, color: COLORS.blue, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Sora, sans-serif', padding: 0, fontWeight: 600, marginTop: 2 }}
                          >▼ Show key points</button>
                        )}
                        {brief && isExpanded && (
                          <button
                            onClick={() => setExpandedId(null)}
                            style={{ fontSize: 11, color: COLORS.blue, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Sora, sans-serif', padding: 0, fontWeight: 600, marginTop: 2 }}
                          >▲ Hide details</button>
                        )}
                      </div>
                    </div>

                    {/* Expanded key points */}
                    {brief && isExpanded && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${COLORS.border}` }}>
                        {brief.keyPoints?.length > 0 && (
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.green, marginBottom: 6 }}>🎯 Key Points</div>
                            {brief.keyPoints.map((pt, i) => (
                              <div key={i} style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.6, paddingLeft: 12 }}>
                                • {pt}
                              </div>
                            ))}
                          </div>
                        )}
                        {brief.prerequisites && (
                          <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 6 }}>
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
            <div style={{ textAlign: 'center', padding: 30, color: COLORS.muted }}>
              No videos found. Try a different search.
            </div>
          )}
        </div>
      )}

      {/* ─── REELS MODE ───────────────────────────────────── */}
      {mode === 'reels' && (
        <div>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>📱</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>Edu Reels</span>
            <span style={{ fontSize: 10, color: COLORS.muted, background: `${COLORS.green}15`, border: `1px solid ${COLORS.green}30`, borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>
              PhysicsWallah · Vedantu · Unacademy · more
            </span>
          </div>
          <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 14 }}>
            Short videos (≤ 90s) from India's top educators — play right here, no redirects.
          </div>

          {/* ── Search Bar ── */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              style={inputStyle}
              placeholder="Search topic… e.g. Newton's Laws, Photosynthesis, Python loops"
              value={reelsQ}
              onChange={e => setReelsQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchReels()}
            />
            <button
              onClick={() => searchReels()}
              disabled={reelsLoading || !reelsQ.trim()}
              style={{ ...pBtn, padding: '10px 16px', width: 'auto', minWidth: 80 }}
            >{reelsLoading ? '⏳ Searching…' : '🔍 Search'}</button>
          </div>

          {/* Quick topic chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
            {['Physics', 'Chemistry', 'AI', 'Mathematics', 'Biology', 'English', 'History', 'Python'].map(sub => (
              <button
                key={sub}
                onClick={() => { setReelsQ(sub); searchReels(sub) }}
                style={{ ...chipBtn, fontSize: 11, padding: '5px 11px' }}
              >{sub}</button>
            ))}
          </div>

          {/* ── Loading Skeleton (portrait cards) ── */}
          {reelsLoading && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.green, marginBottom: 10 }}>
                📱 Fetching Edu Reels…
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} style={{ background: COLORS.card, borderRadius: 12, overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
                    <div style={{ aspectRatio: '9/16', background: `${COLORS.green}08`, animation: 'pulse 1.5s ease-in-out infinite' }} />
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ height: 9, borderRadius: 6, background: `${COLORS.muted}20`, marginBottom: 5, animation: 'pulse 1.5s ease-in-out infinite' }} />
                      <div style={{ height: 8, borderRadius: 6, background: `${COLORS.muted}14`, width: '60%', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Edu Reels Feed (portrait grid) ── */}
          {reelsFeed.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.green }}>
                  📱 {reelsFeed.length} Edu Reels found
                </span>
                <span style={{ fontSize: 10, color: COLORS.muted }}>Tap any card to play</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
                {reelsFeed.map(v => {
                  const brief = reelBriefs[v.id]
                  const isPlaying = reelPlayId === v.id
                  return (
                    <div key={v.id} style={{
                      background: COLORS.card, borderRadius: 14, overflow: 'hidden',
                      border: `1px solid ${isPlaying ? COLORS.green : COLORS.border}`,
                      boxShadow: isPlaying ? `0 0 0 2px ${COLORS.green}40` : 'none',
                      transition: 'box-shadow 0.2s',
                    }}>
                      {/* Portrait player / thumbnail */}
                      {isPlaying ? (
                        <div style={{ position: 'relative', paddingTop: '177.78%' }}>
                          <iframe
                            src={`https://www.youtube.com/embed/${v.id}?autoplay=1&rel=0`}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                            title={v.title}
                          />
                          {/* Close button */}
                          <button
                            onClick={() => setReelPlayId(null)}
                            style={{
                              position: 'absolute', top: 6, right: 6, zIndex: 10,
                              width: 26, height: 26, borderRadius: '50%',
                              background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff',
                              fontSize: 13, cursor: 'pointer', display: 'flex',
                              alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif',
                            }}
                          >✕</button>
                        </div>
                      ) : (
                        <div
                          onClick={() => setReelPlayId(v.id)}
                          style={{ position: 'relative', cursor: 'pointer', paddingTop: '177.78%', background: '#000' }}
                        >
                          <img
                            src={v.thumbnail}
                            alt={v.title}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            loading="lazy"
                          />
                          {/* Gradient + play button */}
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.72) 40%, transparent 70%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <div style={{
                              width: 44, height: 44, borderRadius: '50%',
                              background: `linear-gradient(135deg, ${COLORS.green}, #33cc88)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 17, color: '#04040e', boxShadow: '0 2px 16px rgba(0,0,0,0.5)',
                            }}>▶</div>
                          </div>
                          {/* Duration badge */}
                          {v.duration > 0 && (
                            <div style={{
                              position: 'absolute', bottom: 8, right: 8,
                              background: 'rgba(0,0,0,0.72)', borderRadius: 6,
                              padding: '2px 7px', fontSize: 9, fontWeight: 700, color: '#fff',
                            }}>{fmtDuration(v.duration)}</div>
                          )}
                          {/* Channel badge */}
                          <div style={{
                            position: 'absolute', bottom: 8, left: 8,
                            background: `${COLORS.green}cc`, borderRadius: 6,
                            padding: '2px 7px', fontSize: 8, fontWeight: 700, color: '#04040e',
                            maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{v.channel}</div>
                        </div>
                      )}

                      {/* Info panel */}
                      <div style={{ padding: '8px 10px 10px' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text, lineHeight: 1.35, marginBottom: 4 }}>
                          {v.title?.slice(0, 65)}
                        </div>

                        {/* AI summary */}
                        {brief?.summary && (
                          <div style={{
                            fontSize: 9, color: COLORS.muted, lineHeight: 1.5,
                            background: COLORS.card2, borderRadius: 6, padding: '5px 7px', marginBottom: 5,
                          }}>
                            🤖 {brief.summary}
                          </div>
                        )}

                        {/* Difficulty + keywords */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {brief?.difficulty && (
                            <span style={{
                              fontSize: 8, padding: '2px 6px', borderRadius: 5, fontWeight: 700,
                              background: brief.difficulty === 'Easy' ? `${COLORS.green}18` : brief.difficulty === 'Hard' ? `${COLORS.red}18` : `${COLORS.yellow}18`,
                              color: brief.difficulty === 'Easy' ? COLORS.green : brief.difficulty === 'Hard' ? COLORS.red : COLORS.yellow,
                            }}>{brief.difficulty}</span>
                          )}
                          {brief?.keywords?.slice(0, 3).map((kw, i) => (
                            <span key={i} style={{
                              fontSize: 8, padding: '2px 5px', borderRadius: 5,
                              background: `${COLORS.blue}12`, color: COLORS.blue,
                            }}>{kw}</span>
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
            <div style={{ marginBottom: 20 }}>
              {aiReelContent.keyConceptsToFind?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>
                    🎯 Search these concepts too
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {aiReelContent.keyConceptsToFind.map((concept, i) => (
                      <button
                        key={i}
                        onClick={() => { setReelsQ(concept); searchReels(concept) }}
                        style={{ ...chipBtn, fontSize: 11, padding: '6px 12px', background: `${COLORS.green}12`, border: `1px solid ${COLORS.green}30`, color: COLORS.green }}
                      >🔍 {concept}</button>
                    ))}
                  </div>
                </div>
              )}
              {aiReelContent.contentTips?.length > 0 && (
                <div style={{ ...cardStyle, background: `${COLORS.green}06`, borderColor: `${COLORS.green}20`, marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.green, marginBottom: 6 }}>💡 Study Tips</div>
                  {aiReelContent.contentTips.map((tip, i) => (
                    <div key={i} style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.text }}>{tip.title}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted, lineHeight: 1.5 }}>{tip.detail}</div>
                    </div>
                  ))}
                </div>
              )}
              {aiReelContent.watchOrder && (
                <div style={{ ...cardStyle, background: `${COLORS.blue}06`, borderColor: `${COLORS.blue}20`, marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.blue, marginBottom: 4 }}>📋 Suggested watch order</div>
                  <div style={{ fontSize: 11, color: COLORS.text, lineHeight: 1.6 }}>{aiReelContent.watchOrder}</div>
                </div>
              )}
            </div>
          )}

          {/* ── Empty state ── */}
          {reelsFeed.length === 0 && !reelsLoading && !aiReelContent && (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: COLORS.muted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📱</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>Search any topic above</div>
              <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                Get short videos (≤ 90s) from<br />
                <span style={{ color: COLORS.green, fontWeight: 600 }}>PhysicsWallah · Vedantu · Unacademy</span><br />
                <span style={{ color: COLORS.blue, fontWeight: 600 }}>CodeWithHarry · Apna College · and more</span>
              </div>
            </div>
          )}
        </div>
      )}



      {/* ─── ANALYZE MODE ──────────────────────────────────── */}
      {mode === 'analyze' && (
        <div>
          {/* URL input */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>PASTE YOUTUBE VIDEO OR SHORTS URL</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={inputStyle}
                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                value={pasteUrl}
                onChange={e => setPasteUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doAnalyze()}
              />
              <button
                onClick={doAnalyze}
                disabled={analyzing || !pasteUrl.trim()}
                style={{ ...pBtn, padding: '10px 18px', width: 'auto', minWidth: 80 }}
              >{analyzing ? '⏳ Analyzing…' : '🔬 Analyze'}</button>
            </div>
            <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 6 }}>
              Supports: YouTube videos and YouTube Shorts
            </div>
          </div>

          {/* Analysis error */}
          {analysis?.error && (
            <div style={{ ...cardStyle, borderColor: `${COLORS.red}40`, background: `${COLORS.red}10` }}>
              <div style={{ color: COLORS.red, fontSize: 13 }}>⚠️ {analysis.error}</div>
            </div>
          )}

          {/* Loading */}
          {analyzing && (
            <div style={{ textAlign: 'center', padding: 40, color: COLORS.muted }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🔬</div>
              <div style={{ marginBottom: 6 }}>Analyzing video…</div>
              <div style={{ fontSize: 11 }}>Fetching captions & generating insights</div>
            </div>
          )}

          {/* Video embed + analysis */}
          {analyzeVideo && !analyzing && (
            <div>
              {/* Embedded player */}
              {analyzeVideo.id && (
                <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 12, overflow: 'hidden', marginBottom: 16, border: `1px solid ${COLORS.border}` }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${analyzeVideo.id}`}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                    allow="encrypted-media"
                    allowFullScreen
                    title={analyzeVideo.title || 'Video'}
                  />
                </div>
              )}
              {/* No Instagram iframe embed */}

              {/* Video title */}
              {analyzeVideo.title && (
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>
                  {analyzeVideo.title}
                </div>
              )}
              {analyzeVideo.channel && (
                <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 16 }}>
                  {analyzeVideo.channel} {analyzeVideo.views ? `· ${fmtViews(analyzeVideo.views)}` : ''}
                </div>
              )}
            </div>
          )}

          {/* Analysis results */}
          {analysis && !analysis.error && !analyzing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Summary */}
              {analysis.summary && (
                <div style={cardStyle}>
                  <div style={sectionTitle}>📝 Summary</div>
                  <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {analysis.summary}
                  </div>
                </div>
              )}

              {/* Difficulty */}
              {analysis.difficulty && (
                <div style={{ display: 'inline-block', ...chipStyle, alignSelf: 'flex-start' }}>
                  📊 {analysis.difficulty}
                </div>
              )}

              {/* Key Points */}
              {analysis.keyPoints?.length > 0 && (
                <div style={cardStyle}>
                  <div style={sectionTitle}>🎯 Key Points</div>
                  {analysis.keyPoints.map((p, i) => (
                    <div key={i} style={{ fontSize: 13, color: COLORS.text, padding: '6px 0', borderBottom: i < analysis.keyPoints.length - 1 ? `1px solid ${COLORS.border}` : 'none', lineHeight: 1.5 }}>
                      <span style={{ color: COLORS.green, fontWeight: 700, marginRight: 8 }}>{i + 1}.</span>
                      {p}
                    </div>
                  ))}
                </div>
              )}

              {/* Study tips (Instagram) */}
              {analysis.studyTips?.length > 0 && (
                <div style={cardStyle}>
                  <div style={sectionTitle}>💡 Study Tips</div>
                  {analysis.studyTips.map((t, i) => (
                    <div key={i} style={{ fontSize: 13, color: COLORS.text, padding: '6px 0', lineHeight: 1.5 }}>
                      💡 {t}
                    </div>
                  ))}
                </div>
              )}

              {/* Takeaway */}
              {analysis.takeaway && (
                <div style={{ ...cardStyle, background: `${COLORS.green}10`, borderColor: `${COLORS.green}30` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.green }}>
                    💎 {analysis.takeaway}
                  </div>
                </div>
              )}

              {/* Quiz */}
              {analysis.quiz && (
                <div style={cardStyle}>
                  <div style={sectionTitle}>🧪 Quick Quiz</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>
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
                          border: `1.5px solid ${showResult ? (isCorrect ? COLORS.green : selected ? COLORS.red : COLORS.border) : COLORS.border}`,
                          background: showResult ? (isCorrect ? `${COLORS.green}15` : selected ? `${COLORS.red}15` : COLORS.card) : COLORS.card,
                          color: COLORS.text,
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
                <div style={cardStyle}>
                  <div style={sectionTitle}>🔗 Explore More</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {analysis.relatedTopics.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => { setMode('discover'); setSearchQ(t); doSearch(t) }}
                        style={chipBtn}
                      >{t}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!analyzing && !analysis && !analyzeVideo && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: COLORS.muted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: COLORS.text }}>Analyze any video</div>
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
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
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>ENTER A TOPIC</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={inputStyle}
                placeholder="e.g. Photosynthesis, Quadratic Equations, French Revolution…"
                value={createTopic}
                onChange={e => setCreateTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doCreate()}
              />
              <button
                onClick={doCreate}
                disabled={creating || !createTopic.trim()}
                style={{ ...pBtn, padding: '10px 18px', width: 'auto', minWidth: 80 }}
              >{creating ? '⏳' : '✨ Create'}</button>
            </div>
          </div>

          {/* Loading */}
          {creating && (
            <div style={{ textAlign: 'center', padding: 40, color: COLORS.muted }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>✨</div>
              <div style={{ marginBottom: 6 }}>Creating AI lesson + finding videos…</div>
              <div style={{ fontSize: 11 }}>This may take a few seconds</div>
            </div>
          )}

          {/* AI Content */}
          {aiContent && !creating && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Title */}
              <div style={{ fontSize: 17, fontWeight: 800, color: COLORS.text }}>
                {aiContent.title}
              </div>
              {aiContent.introduction && (
                <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.6 }}>
                  {aiContent.introduction}
                </div>
              )}

              {/* Sections */}
              {aiContent.sections?.map((sec, i) => (
                <div key={i} style={cardStyle}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>
                    {sec.emoji || '📖'} {sec.heading}
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {sec.content}
                  </div>
                </div>
              ))}

              {/* Key Formulas */}
              {aiContent.keyFormulas?.length > 0 && (
                <div style={{ ...cardStyle, background: `${COLORS.blue}10`, borderColor: `${COLORS.blue}30` }}>
                  <div style={sectionTitle}>📐 Key Formulas</div>
                  {aiContent.keyFormulas.map((f, i) => (
                    <div key={i} style={{ fontSize: 13, color: COLORS.text, padding: '4px 0', fontFamily: 'monospace' }}>
                      {f}
                    </div>
                  ))}
                </div>
              )}

              {/* Fun Fact */}
              {aiContent.funFact && (
                <div style={{ ...cardStyle, background: `${COLORS.yellow}10`, borderColor: `${COLORS.yellow}30` }}>
                  <div style={{ fontSize: 13, color: COLORS.yellow, fontWeight: 600 }}>
                    🤩 Fun Fact: {aiContent.funFact}
                  </div>
                </div>
              )}

              {/* Summary */}
              {aiContent.summary && (
                <div style={{ ...cardStyle, background: `${COLORS.green}10`, borderColor: `${COLORS.green}30` }}>
                  <div style={sectionTitle}>📋 Summary</div>
                  <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {aiContent.summary}
                  </div>
                </div>
              )}

              {/* Related Videos */}
              {relatedVids.length > 0 && (
                <div>
                  <div style={{ ...sectionTitle, marginBottom: 10 }}>🎬 Related Videos</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                    {relatedVids.map(v => (
                      <div key={v.id} style={cardStyle}>
                        {createPlayId === v.id ? (
                          <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
                            <iframe
                              src={`https://www.youtube.com/embed/${v.id}?autoplay=1`}
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                              allow="autoplay; encrypted-media"
                              allowFullScreen
                              title={v.title}
                            />
                          </div>
                        ) : (
                          <div
                            onClick={() => setCreatePlayId(v.id)}
                            style={{ position: 'relative', cursor: 'pointer', borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}
                          >
                            <img
                              src={v.thumbnail}
                              alt={v.title}
                              style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
                              loading="lazy"
                            />
                            <div style={{
                              position: 'absolute', inset: 0, display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              background: 'rgba(0,0,0,0.3)',
                            }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: '50%',
                                background: 'rgba(0,0,0,0.7)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                fontSize: 14,
                              }}>▶</div>
                            </div>
                            {v.duration > 0 && (
                              <div style={{
                                position: 'absolute', bottom: 4, right: 4,
                                background: 'rgba(0,0,0,0.8)', borderRadius: 4,
                                padding: '1px 5px', fontSize: 10, color: '#fff',
                                fontWeight: 600,
                              }}>{fmtDuration(v.duration)}</div>
                            )}
                          </div>
                        )}
                        <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, lineHeight: 1.3 }}>
                          {v.title?.slice(0, 60)}
                        </div>
                        <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>
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
            <div style={{ textAlign: 'center', padding: '40px 20px', color: COLORS.muted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: COLORS.text }}>AI-Powered Lessons</div>
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
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
const inputStyle = {
  flex: 1,
  background: '#101022',
  border: '1px solid #ffffff15',
  borderRadius: 12,
  padding: '11px 14px',
  color: '#eeeeff',
  fontSize: 13,
  fontFamily: 'Sora, sans-serif',
}

const pBtn = {
  background: 'linear-gradient(135deg, #00E5A0, #33cc88)',
  color: '#04040e',
  border: 'none',
  borderRadius: 12,
  padding: '12px 18px',
  fontSize: 13,
  fontWeight: 800,
  cursor: 'pointer',
  width: '100%',
  fontFamily: 'Sora, sans-serif',
}

const cardStyle = {
  background: COLORS.card,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 14,
  padding: '14px 16px',
}

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: COLORS.muted,
  marginBottom: 6,
  letterSpacing: '0.05em',
}

const sectionTitle = {
  fontSize: 13,
  fontWeight: 700,
  color: COLORS.green,
  marginBottom: 8,
}

const chipBtn = {
  background: COLORS.card,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 20,
  padding: '7px 14px',
  fontSize: 12,
  color: COLORS.text,
  cursor: 'pointer',
  fontFamily: 'Sora, sans-serif',
}

const chipStyle = {
  background: `${COLORS.blue}15`,
  border: `1px solid ${COLORS.blue}30`,
  borderRadius: 20,
  padding: '5px 12px',
  fontSize: 12,
  fontWeight: 600,
  color: COLORS.blue,
}
