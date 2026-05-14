import { useState, useEffect, useRef, useCallback } from 'react'
import { COLORS, callAI, LANG_RULES } from '../../App.jsx'
import {
  apiGetMySquad, apiMatchSquad,
  apiGetSquadMessages, apiSendSquadMessage,
  apiGetSquadMembers, apiGetSquadChallenge,
  apiCreateChallenge, apiSubmitChallenge,
  apiLeaveSquad,
} from '../../api.js'

const POLL_MS      = 4000   // message poll interval
const SILENCE_MS   = 120000 // 2 min silence → show AI Peer button

// ── Avatar initials ───────────────────────────────────────────
function Avatar({ name = '?', size = 32, online = false, isAI = false }) {
  const initials = isAI ? '🦉' : name.charAt(0).toUpperCase()
  const bg = isAI
    ? 'linear-gradient(135deg,#7B9CFF,#a04dff)'
    : `hsl(${((name.charCodeAt(0) || 65) * 37) % 360},55%,38%)`
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: isAI ? bg : bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: isAI ? size * 0.55 : size * 0.45,
        fontWeight: 900, color: '#fff',
        border: `2px solid ${COLORS.card2}`,
      }}>{initials}</div>
      {online && (
        <div style={{
          position: 'absolute', bottom: 1, right: 1,
          width: 9, height: 9, borderRadius: '50%',
          background: COLORS.green, border: `2px solid ${COLORS.bg}`,
        }} />
      )}
    </div>
  )
}

// ── Single chat bubble ────────────────────────────────────────
function Bubble({ msg, isMine, memberName }) {
  const isSystem    = msg.msg_type === 'system'
  const isChallenge = msg.msg_type === 'challenge'
  const isAIPeer    = msg.msg_type === 'ai_peer'
  const time = msg.created_at
    ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  if (isSystem) return (
    <div style={{ textAlign: 'center', margin: '8px 0' }}>
      <span style={{
        fontSize: 11.5, color: COLORS.muted, fontWeight: 600,
        background: COLORS.card2, borderRadius: 20, padding: '4px 12px',
      }}>{msg.content}</span>
    </div>
  )

  if (isChallenge) return (
    <div style={{
      background: `${COLORS.yellow}12`,
      border: `1px solid ${COLORS.yellow}40`,
      borderRadius: 14, padding: '10px 14px', margin: '8px 0',
      fontSize: 13, color: COLORS.yellow, fontWeight: 600,
    }}>🏆 {msg.content}</div>
  )

  return (
    <div style={{
      display: 'flex', gap: 8,
      flexDirection: isMine ? 'row-reverse' : 'row',
      alignItems: 'flex-end', margin: '4px 0',
    }}>
      {!isMine && <Avatar name={isAIPeer ? 'AI' : (memberName || msg.display_name)} size={28} isAI={isAIPeer} />}
      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', gap: 3,
        alignItems: isMine ? 'flex-end' : 'flex-start' }}>
        {!isMine && (
          <span style={{ fontSize: 10.5, color: COLORS.muted, fontWeight: 600, marginLeft: 4 }}>
            {isAIPeer ? '🦉 Gyaani (AI Peer)' : (memberName || msg.display_name)}
          </span>
        )}
        <div style={{
          background: isMine
            ? `linear-gradient(135deg,${COLORS.green},#33cc88)`
            : isAIPeer
              ? `${COLORS.blue}18`
              : COLORS.card,
          border: isMine ? 'none' : `1px solid ${isAIPeer ? COLORS.blue + '40' : COLORS.border}`,
          borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          padding: '9px 13px',
          color: isMine ? '#04040e' : COLORS.text,
          fontSize: 13.5, lineHeight: 1.55,
        }}>
          {msg.content}
        </div>
        <span style={{ fontSize: 10, color: COLORS.muted, marginRight: isMine ? 4 : 0, marginLeft: isMine ? 0 : 4 }}>
          {time}
        </span>
      </div>
    </div>
  )
}

// ── Challenge banner ──────────────────────────────────────────
function ChallengeBanner({ challenge, onSubmit, onDismiss }) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (!text.trim()) return
    setSubmitting(true)
    try {
      const res = await onSubmit(text)
      if (res?.completed) {
        setDone(true)
        setTimeout(onDismiss, 2500)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (done) return (
    <div style={{
      background: `${COLORS.green}15`, border: `1px solid ${COLORS.green}40`,
      borderRadius: 14, padding: '12px 16px', margin: '0 0 10px',
      fontSize: 13, color: COLORS.green, fontWeight: 700, textAlign: 'center',
    }}>
      🎓 Challenge complete! +50 Teaching XP earned!
    </div>
  )

  return (
    <div style={{
      background: `${COLORS.yellow}0e`,
      border: `1.5px solid ${COLORS.yellow}50`,
      borderRadius: 16, padding: '14px 16px', margin: '0 0 10px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: COLORS.yellow, letterSpacing: '0.06em', marginBottom: 3 }}>
            📚 YOUR CHALLENGE — 50 Teaching XP
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>
            Explain: <span style={{ color: COLORS.yellow }}>{challenge.concept}</span>
          </div>
          <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{challenge.subject}</div>
        </div>
        <button onClick={onDismiss} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: COLORS.muted, fontSize: 18, padding: '0 4px',
          fontFamily: 'Sora, sans-serif',
        }}>×</button>
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Explain this concept to your squad in simple words…"
        rows={3}
        style={{
          width: '100%', background: COLORS.card2,
          border: `1px solid ${COLORS.border}`, borderRadius: 10,
          padding: '8px 10px', color: COLORS.text, fontSize: 13,
          fontFamily: 'Sora, sans-serif', resize: 'vertical',
          outline: 'none', boxSizing: 'border-box',
        }}
      />
      <button
        onClick={submit}
        disabled={submitting || !text.trim()}
        style={{
          marginTop: 8, width: '100%',
          background: text.trim() ? `linear-gradient(135deg,${COLORS.yellow},#ffaa00)` : COLORS.card,
          border: 'none', borderRadius: 10, padding: '9px',
          color: text.trim() ? '#04040e' : COLORS.muted,
          fontSize: 13, fontWeight: 800, cursor: text.trim() ? 'pointer' : 'default',
          fontFamily: 'Sora, sans-serif',
        }}
      >
        {submitting ? 'Submitting…' : 'Submit Explanation 🚀'}
      </button>
    </div>
  )
}

// ── Members strip ─────────────────────────────────────────────
function MembersStrip({ members, currentUserId }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '10px 14px', overflowX: 'auto',
      borderBottom: `1px solid ${COLORS.border}`, background: COLORS.card }}>
      {members.map(m => (
        <div key={m.user_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 44 }}>
          <Avatar name={m.name} size={36} online={m.online} />
          <span style={{
            fontSize: 10, color: m.user_id === currentUserId ? COLORS.green : COLORS.muted,
            fontWeight: m.user_id === currentUserId ? 800 : 500,
            maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{m.user_id === currentUserId ? 'You' : m.name.split(' ')[0]}</span>
          <span style={{
            fontSize: 9, color: m.role === 'teacher' ? COLORS.yellow : COLORS.muted,
            fontWeight: 700,
          }}>{m.role === 'teacher' ? '⭐ teacher' : '📖 learner'}</span>
        </div>
      ))}
    </div>
  )
}

// ── No-squad landing screen ───────────────────────────────────
function NoSquadScreen({ onMatch, matching }) {
  const steps = [
    { icon: '🧠', title: 'AI reads your mastery', desc: 'Looks at your quiz history to find your weak & strong subjects' },
    { icon: '🔗', title: 'Finds your complement', desc: 'Matches you with students whose strengths fill your gaps' },
    { icon: '🏆', title: 'Teach & learn together', desc: 'Complete challenges, earn Teaching XP, and grow together' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 18px', gap: 28 }}>
      {/* Hero */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🤝</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 8px', letterSpacing: -0.5 }}>
          Sathi <span style={{ color: COLORS.green }}>Study Squads</span>
        </h2>
        <p style={{ fontSize: 14, color: COLORS.muted, margin: 0, lineHeight: 1.6, maxWidth: 320 }}>
          AI matches you with students who have <strong style={{ color: COLORS.text }}>complementary strengths</strong> — you teach what you know, learn what you don't.
        </p>
      </div>

      {/* How it works */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 380 }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            background: COLORS.card, border: `1px solid ${COLORS.border}`,
            borderRadius: 14, padding: '14px 16px',
            display: 'flex', gap: 14, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 26, flexShrink: 0 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.text, marginBottom: 3 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Teaching XP callout */}
      <div style={{
        background: `${COLORS.yellow}10`, border: `1px solid ${COLORS.yellow}35`,
        borderRadius: 14, padding: '12px 18px', width: '100%', maxWidth: 380,
        display: 'flex', gap: 12, alignItems: 'center',
      }}>
        <span style={{ fontSize: 28 }}>🏆</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.yellow }}>Teaching XP</div>
          <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.5 }}>
            Earn <strong style={{ color: COLORS.yellow }}>50 XP</strong> every time you successfully explain a concept to your squad — more than answering quizzes!
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onMatch}
        disabled={matching}
        style={{
          background: matching ? COLORS.card : `linear-gradient(135deg,${COLORS.green},#33cc88)`,
          border: 'none', borderRadius: 16, padding: '15px 40px',
          color: matching ? COLORS.muted : '#04040e',
          fontSize: 15, fontWeight: 900, cursor: matching ? 'default' : 'pointer',
          fontFamily: 'Sora, sans-serif',
          boxShadow: matching ? 'none' : `0 0 28px ${COLORS.green}44`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}
      >
        {matching
          ? <><span style={{ width: 18, height: 18, border: `3px solid ${COLORS.green}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Finding your squad…</>
          : '🤝 Find My Study Squad'}
      </button>
      <p style={{ fontSize: 11, color: COLORS.muted, margin: '-16px 0 0', textAlign: 'center' }}>
        Squads are based on your quiz mastery scores
      </p>
    </div>
  )
}

// ── Main SathiTab ─────────────────────────────────────────────
export default function SathiTab({ profile, userId }) {
  const [loading,        setLoading]        = useState(true)
  const [squad,          setSquad]          = useState(null)      // full squad object
  const [matching,       setMatching]       = useState(false)
  const [messages,       setMessages]       = useState([])
  const [lastMsgId,      setLastMsgId]      = useState(0)
  const [members,        setMembers]        = useState([])
  const [challenge,      setChallenge]      = useState(null)
  const [showChallenge,  setShowChallenge]  = useState(false)
  const [input,          setInput]          = useState('')
  const [sending,        setSending]        = useState(false)
  const [aiPeerLoading,  setAiPeerLoading]  = useState(false)
  const [silentSince,    setSilentSince]    = useState(Date.now())
  const [leaving,        setLeaving]        = useState(false)
  const [silenceTick,    setSilenceTick]    = useState(0)  // forces re-render for silence check

  const messagesEnd   = useRef(null)
  const pollTimer     = useRef(null)
  const inputRef      = useRef(null)
  const lastMsgIdRef  = useRef(0)  // always-current value for polling closure

  // ── Scroll to bottom ───────────────────────────────────────
  const scrollBottom = useCallback(() => {
    setTimeout(() => messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }), 80)
  }, [])

  // ── Load squad on mount ────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await apiGetMySquad()
        if (cancelled) return
        if (data.squad) {
          setSquad(data.squad)
          setMembers(data.squad.members || [])
        }
      } catch { /* silent */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── Initial message load when squad arrives ────────────────
  useEffect(() => {
    if (!squad) return
    loadMessages(squad.id, 0, true)
    loadChallenge(squad.id)
  }, [squad?.id])  // eslint-disable-line

  // ── Polling ────────────────────────────────────────────────
  useEffect(() => {
    if (!squad) return
    pollTimer.current = setInterval(() => {
      pollMessages(squad.id)
    }, POLL_MS)
    return () => clearInterval(pollTimer.current)
  }, [squad?.id])  // eslint-disable-line — uses lastMsgIdRef to avoid stale closures

  // ── Silence tick — forces re-render every 15s so AI Peer button can appear ──
  useEffect(() => {
    if (!squad) return
    const t = setInterval(() => setSilenceTick(n => n + 1), 15000)
    return () => clearInterval(t)
  }, [!!squad])  // eslint-disable-line

  // ── Helpers ───────────────────────────────────────────────
  const loadMessages = async (squadId, since, initial = false) => {
    try {
      const data = await apiGetSquadMessages(squadId, since)
      if (data.messages?.length) {
        if (initial) {
          setMessages(data.messages)
        } else {
          setMessages(prev => {
            const real = prev.filter(m => !m._optimistic)
            const existingIds = new Set(real.map(m => m.id))
            const toAdd = data.messages.filter(m => !existingIds.has(m.id))
            return [...real, ...toAdd]
          })
        }
        const lastId = data.messages[data.messages.length - 1].id
        setLastMsgId(lastId)
        lastMsgIdRef.current = lastId
        scrollBottom()  // always scroll (initial or not)
      }
    } catch { /* silent */ }
  }

  const pollMessages = async (squadId) => {
    try {
      const data = await apiGetSquadMessages(squadId, lastMsgIdRef.current)
      if (data.messages?.length) {
        setMessages(prev => {
          const real = prev.filter(m => !m._optimistic)
          const existingIds = new Set(real.map(m => m.id))
          const toAdd = data.messages.filter(m => !existingIds.has(m.id))
          return [...real, ...toAdd]
        })
        const lastId = data.messages[data.messages.length - 1].id
        setLastMsgId(lastId)
        lastMsgIdRef.current = lastId
        setSilentSince(Date.now())
        scrollBottom()
      }
      // Refresh members every 4th poll
      if (Math.random() < 0.25) {
        const mData = await apiGetSquadMembers(squadId)
        if (mData.members) setMembers(mData.members)
      }
    } catch { /* silent */ }
  }

  const loadChallenge = async (squadId) => {
    try {
      const data = await apiGetSquadChallenge(squadId)
      if (data.challenge) {
        setChallenge(data.challenge)
        setShowChallenge(true)
      }
    } catch { /* silent */ }
  }

  // ── Match into a squad ─────────────────────────────────────
  const handleMatch = async () => {
    setMatching(true)
    try {
      const result = await apiMatchSquad()
      if (result.squad_id) {
        const data = await apiGetMySquad()
        if (data.squad) {
          setSquad(data.squad)
          setMembers(data.squad.members || [])
        }
      }
    } catch (e) {
      alert(e.message || 'Could not find a squad right now. Try again shortly.')
    } finally {
      setMatching(false)
    }
  }

  // ── Send message ───────────────────────────────────────────
  const sendMessage = async (e) => {
    e?.preventDefault()
    const content = input.trim()
    if (!content || !squad || sending) return
    setSending(true)
    const optimistic = {
      id: Date.now(),
      user_id: userId,
      display_name: profile?.name || 'You',
      content,
      msg_type: 'chat',
      created_at: new Date().toISOString(),
      _optimistic: true,
    }
    setMessages(prev => [...prev, optimistic])
    setInput('')
    scrollBottom()
    try {
      await apiSendSquadMessage(squad.id, content, profile?.name || 'Student')
      setSilentSince(Date.now())
    } catch { /* message might have sent — poll will sync */ }
    finally { setSending(false) }
  }

  // ── AI Peer (Gyaani) ───────────────────────────────────────
  const invokeAIPeer = async () => {
    if (!squad || aiPeerLoading) return
    setAiPeerLoading(true)
    try {
      const recent = messages
        .filter(m => m.msg_type === 'chat')
        .slice(-5)
        .map(m => `${m.display_name}: ${m.content}`)
        .join('\n')

      const lang = profile?.language || 'English'
      const langRule = LANG_RULES[lang] || LANG_RULES['English']
      const sysPrompt = `🚨 LANGUAGE RULE — MANDATORY — NEVER BREAK:
${langRule}
YOU MUST write your ENTIRE response in ${lang} ONLY.
NEVER mix languages.

You are Gyaani, a confused but curious Class ${(profile?.standard || 'Class 10').replace('Class ', '')} student studying ${squad.focus_subject}. You ask thoughtful follow-up questions, admit when you don't understand, and sometimes make small mistakes that show you're genuinely learning. You NEVER act like a teacher. Keep responses short (2-3 sentences max). Use simple, friendly language a student would use.`

      const prompt = recent
        ? `The squad was just discussing:\n${recent}\n\nAs a confused student, react to this conversation or ask a follow-up question.`
        : `You've just joined a ${squad.focus_subject} study squad. Introduce yourself and ask a question about ${squad.focus_subject}.`

      const reply = await callAI(prompt, sysPrompt, [], 2, 200)

      await apiSendSquadMessage(squad.id, reply, 'Gyaani', 'ai_peer')
      setSilentSince(Date.now())
      // poll will pick it up
    } catch { /* silent */ }
    finally { setAiPeerLoading(false) }
  }

  // ── Create challenge ───────────────────────────────────────
  const handleCreateChallenge = async () => {
    if (!squad || (showChallenge && challenge)) return
    try {
      await apiCreateChallenge(squad.id)
      await loadChallenge(squad.id)
    } catch (e) {
      alert(e.message || 'Could not create challenge. Complete some quizzes first.')
    }
  }

  // ── Submit challenge ───────────────────────────────────────
  const handleSubmitChallenge = async (explanation) => {
    if (!challenge) return null
    // Don’t clear challenge/banner here — let ChallengeBanner show the
    // “Challenge complete!” feedback for 2.5s then call onDismiss.
    const res = await apiSubmitChallenge(squad.id, challenge.id, explanation)
    return res
  }

  // ── Leave squad ────────────────────────────────────────────
  const handleLeave = async () => {
    if (!squad || !window.confirm('Leave this squad? You can find a new one anytime.')) return
    setLeaving(true)
    try {
      await apiLeaveSquad(squad.id)
      setSquad(null)
      setMessages([])
      setMembers([])
      setLastMsgId(0)
      lastMsgIdRef.current = 0
    } catch { /* silent */ }
    finally { setLeaving(false) }
  }

  // ── Silence timer for AI peer button ──────────────────────
  const silenceMs = Date.now() - silentSince
  const showAIPeerBtn = squad && messages.length > 0 && silenceMs >= SILENCE_MS

  // ─────────────────────────────────────────────────────────
  // RENDER: loading
  if (loading) return (
    <div className="tab-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${COLORS.green}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  // RENDER: no squad
  if (!squad) return (
    <div className="tab-content">
      <NoSquadScreen onMatch={handleMatch} matching={matching} />
    </div>
  )

  // RENDER: in squad → full chat
  const memberMap = Object.fromEntries(members.map(m => [m.user_id, m]))

  return (
    <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 0 }}>

      {/* ── Header ── */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.card,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: COLORS.text }}>
            🤝 {squad.name}
          </div>
          <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>
            Focus: <span style={{ color: COLORS.blue, fontWeight: 700 }}>{squad.focus_subject}</span>
            {' · '}
            {members.filter(m => m.online).length}/{members.length} online
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Challenge button */}
          <button
            onClick={handleCreateChallenge}
            title="Get a teach-this challenge"
            style={{
              background: `${COLORS.yellow}15`, border: `1px solid ${COLORS.yellow}40`,
              borderRadius: 10, padding: '6px 10px',
              fontSize: 13, cursor: 'pointer', fontFamily: 'Sora, sans-serif',
              color: COLORS.yellow, fontWeight: 700,
            }}>📚</button>
          {/* Leave */}
          <button
            onClick={handleLeave}
            disabled={leaving}
            style={{
              background: `${COLORS.red}15`, border: `1px solid ${COLORS.red}40`,
              borderRadius: 10, padding: '6px 10px',
              fontSize: 11, cursor: 'pointer', fontFamily: 'Sora, sans-serif',
              color: COLORS.red, fontWeight: 700,
            }}>Leave</button>
        </div>
      </div>

      {/* ── Members strip ── */}
      <MembersStrip members={members} currentUserId={userId} />

      {/* ── Challenge banner ── */}
      {showChallenge && challenge && (
        <div style={{ padding: '10px 14px 0', flexShrink: 0 }}>
          <ChallengeBanner
            challenge={challenge}
            onSubmit={handleSubmitChallenge}
            onDismiss={() => { setShowChallenge(false); setChallenge(null) }}
          />
        </div>
      )}

      {/* ── Messages ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 14px',
        display: 'flex', flexDirection: 'column',
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: COLORS.muted, fontSize: 13, marginTop: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>👋</div>
            Say hi to your squad!
          </div>
        )}
        {messages.map(m => (
          <Bubble
            key={m.id}
            msg={m}
            isMine={m.user_id === userId && m.msg_type !== 'ai_peer'}
            memberName={memberMap[m.user_id]?.name}
          />
        ))}
        <div ref={messagesEnd} />
      </div>

      {/* ── AI Peer button (appears after 2 min silence) ── */}
      {showAIPeerBtn && (
        <div style={{ padding: '6px 14px 0', flexShrink: 0, textAlign: 'center' }}>
          <button
            onClick={invokeAIPeer}
            disabled={aiPeerLoading}
            style={{
              background: `${COLORS.blue}15`, border: `1px solid ${COLORS.blue}40`,
              borderRadius: 20, padding: '7px 18px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'Sora, sans-serif', color: COLORS.blue,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            {aiPeerLoading
              ? <><span style={{ width: 12, height: 12, border: `2px solid ${COLORS.blue}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Gyaani is thinking…</>
              : '🦉 Ask Gyaani (AI Study Peer)'}
          </button>
          <div style={{ fontSize: 10.5, color: COLORS.muted, marginTop: 4 }}>
            Squad's been quiet — Gyaani can ask a question to get discussion going
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      <form
        onSubmit={sendMessage}
        style={{
          padding: '10px 12px 12px',
          borderTop: `1px solid ${COLORS.border}`,
          display: 'flex', gap: 8, flexShrink: 0,
          background: COLORS.bg,
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Message your squad…"
          style={{
            flex: 1, background: COLORS.card,
            border: `1px solid ${COLORS.border}`, borderRadius: 14,
            padding: '10px 14px', color: COLORS.text, fontSize: 14,
            fontFamily: 'Sora, sans-serif', outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          style={{
            background: input.trim()
              ? `linear-gradient(135deg,${COLORS.green},#33cc88)`
              : COLORS.card,
            border: 'none', borderRadius: 14, padding: '0 18px',
            cursor: input.trim() ? 'pointer' : 'default',
            color: input.trim() ? '#04040e' : COLORS.muted,
            fontSize: 18, fontWeight: 900,
            fontFamily: 'Sora, sans-serif', flexShrink: 0,
          }}
        >➤</button>
      </form>
    </div>
  )
}
