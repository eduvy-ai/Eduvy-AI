import { useState, useEffect, useRef, useCallback } from 'react'
import { COLORS, callAI, LANG_RULES } from '../../App.jsx'
import {
  apiGetMySquad, apiMatchSquad,
  apiGetSquadMessages, apiSendSquadMessage,
  apiGetSquadMembers, apiGetSquadChallenge,
  apiCreateChallenge, apiSubmitChallenge,
  apiLeaveSquad,
  apiGetSquadDoubts, apiPostDoubt, apiGetDoubtAnswers, apiPostAnswer, apiUpvoteAnswer,
  apiGetDoubtQuota,
  apiGetSquadStreak, apiGetDailyConcept, apiSubmitDailyExplain,
  apiPatchVerdict,
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

// ── Sub-tab nav bar ───────────────────────────────────────────
function SubNav({ active, onChange }) {
  const tabs = [
    { key: 'chat',   icon: '💬', label: 'Chat'   },
    { key: 'doubts', icon: '❓', label: 'Doubts'  },
    { key: 'daily',  icon: '📅', label: 'Daily'   },
  ]
  return (
    <div style={{
      display: 'flex', borderBottom: `1px solid ${COLORS.border}`,
      background: COLORS.card, flexShrink: 0,
    }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          flex: 1, background: 'transparent',
          border: 'none',
          borderBottom: active === t.key ? `2px solid ${COLORS.green}` : `2px solid transparent`,
          padding: '9px 4px 8px',
          color: active === t.key ? COLORS.green : COLORS.muted,
          fontWeight: active === t.key ? 700 : 500,
          fontSize: 12, cursor: 'pointer', fontFamily: 'Sora, sans-serif',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        }}>
          <span style={{ fontSize: 16 }}>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ── Doubts Board ─────────────────────────────────────────────
const VERDICT_COLORS = {
  correct:   { bg: '#00E5A020', border: '#00E5A060', text: '#00E5A0', label: '✓ Correct' },
  partial:   { bg: '#FFD16620', border: '#FFD16660', text: '#FFD166', label: '⚠ Partial' },
  incorrect: { bg: '#FF6B6B20', border: '#FF6B6B60', text: '#FF6B6B', label: '✗ Incorrect' },
}

function DoubtsPanel({ squadId, userId, profileName, profile }) {
  const [doubts,      setDoubts]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [view,        setView]        = useState('list')   // list | post | answers
  const [openDoubt,   setOpenDoubt]   = useState(null)
  const [answers,     setAnswers]     = useState([])
  const [newQ,        setNewQ]        = useState('')
  const [posting,     setPosting]     = useState(false)
  const [newAns,      setNewAns]      = useState('')
  const [ansPosting,  setAnsPosting]  = useState(false)
  const [upvoting,    setUpvoting]    = useState(null)
  const [quota,       setQuota]       = useState(null)   // {used, limit, remaining, plan}

  const load = useCallback(async () => {
    try {
      const [d, q] = await Promise.all([
        apiGetSquadDoubts(squadId),
        apiGetDoubtQuota(squadId),
      ])
      setDoubts(d.doubts || [])
      setQuota(q)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [squadId])

  useEffect(() => { load() }, [load])

  const openAnswerView = async (doubt) => {
    try {
      const d = await apiGetDoubtAnswers(squadId, doubt.id)
      setAnswers(d.answers || [])
      setOpenDoubt(doubt)
      setView('answers')
    } catch { /* silent */ }
  }

  const handlePost = async () => {
    if (!newQ.trim()) return
    if (quota && quota.remaining <= 0) return
    setPosting(true)
    try {
      await apiPostDoubt(squadId, { question: newQ.trim(), display_name: profileName || 'Student' })
      setNewQ('')
      await load()
      setView('list')
    } catch (err) { alert(err.message) }
    finally { setPosting(false) }
  }

  const handleAnswer = async () => {
    if (!newAns.trim() || !openDoubt) return
    setAnsPosting(true)
    try {
      const result = await apiPostAnswer(squadId, openDoubt.id, { answer: newAns.trim(), display_name: profileName || 'Student' })
      setNewAns('')
      const d = await apiGetDoubtAnswers(squadId, openDoubt.id)
      setAnswers(d.answers || [])
      load() // refresh list so answer_count updates

      // ── AI Verification (plan-gated + word-count guard) ────
      const wordCount = newAns.trim().split(/\s+/).length
      const canVerify = profile?.plan && profile.plan !== 'free' && wordCount >= 15
      if (canVerify && result?.id) {
        // fire-and-forget — don't block the UI
        runAIVerdict(result.id, openDoubt.question, openDoubt.subject, newAns.trim())
      }
    } catch (err) { alert(err.message) }
    finally { setAnsPosting(false) }
  }

  const runAIVerdict = async (answerId, question, subject, answerText) => {
    try {
      const lang = profile?.language || 'English'
      const sysPrompt = `You are a strict education evaluator. Reply ONLY with valid JSON, no explanation outside it. ${LANG_RULES[lang] || ''}`
      const userMsg = `Subject: ${subject}\nDoubt: ${question}\nStudent answer: ${answerText}\n\nEvaluate accuracy. Reply ONLY: {"verdict":"correct"|"partial"|"incorrect","note":"one sentence feedback"}`
      const raw = await callAI(userMsg, sysPrompt, [], 2, 400)
      // Safe parse
      const match = raw.match(/\{[^}]+\}/s)
      if (!match) return
      const obj = JSON.parse(match[0])
      if (!obj.verdict || !['correct','partial','incorrect'].includes(obj.verdict)) return
      await apiPatchVerdict(squadId, openDoubt.id, answerId, obj.verdict, obj.note || '')
      // Refresh answers to show the badge
      const d = await apiGetDoubtAnswers(squadId, openDoubt.id)
      setAnswers(d.answers || [])
    } catch { /* best-effort — never break UI */ }
  }

  const handleUpvote = async (answer) => {
    if (answer.user_id === userId || answer.i_upvoted || upvoting) return
    setUpvoting(answer.id)
    try {
      await apiUpvoteAnswer(squadId, openDoubt.id, answer.id)
      const d = await apiGetDoubtAnswers(squadId, openDoubt.id)
      setAnswers(d.answers || [])
    } catch { /* silent */ }
    finally { setUpvoting(null) }
  }

  // ── VIEW: Post a new doubt ────────────────────────────────
  const atLimit = quota && quota.remaining <= 0
  if (view === 'post') return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${COLORS.border}`, background: COLORS.card, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => setView('list')} style={{ background: 'transparent', border: 'none', color: COLORS.muted, fontSize: 20, cursor: 'pointer', fontFamily: 'Sora, sans-serif', lineHeight: 1 }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 800, color: COLORS.text, flex: 1 }}>❓ Post a Doubt</span>
        {quota && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: atLimit ? `${COLORS.red}20` : `${COLORS.green}20`, color: atLimit ? COLORS.red : COLORS.green }}>
            {atLimit ? 'Limit reached' : `${quota.remaining} left today`}
          </span>
        )}
      </div>

      {atLimit ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚫</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.text, marginBottom: 8 }}>Daily limit reached</div>
          <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.7 }}>
            You've used all <strong style={{ color: COLORS.text }}>{quota.limit}</strong> doubts for today on the <strong style={{ color: COLORS.blue }}>{quota.plan}</strong> plan.<br />
            Come back tomorrow — or upgrade for more!
          </div>
          {quota.plan !== 'premium' && (
            <div style={{ marginTop: 20, fontSize: 11, color: COLORS.muted }}>
              Free: 2/day · Basic: 5/day · Pro: 15/day · Premium: unlimited
            </div>
          )}
        </div>
      ) : (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 8, letterSpacing: '0.04em' }}>YOUR DOUBT</div>
            <textarea
              value={newQ}
              onChange={e => setNewQ(e.target.value)}
              placeholder="What are you stuck on? Write your doubt clearly so your squad can help…"
              rows={5}
              autoFocus
              style={{
                width: '100%', background: COLORS.card,
                border: `1.5px solid ${newQ.trim() ? COLORS.blue : COLORS.border}`,
                borderRadius: 14, padding: '13px 14px',
                color: COLORS.text, fontSize: 14, fontFamily: 'Sora, sans-serif',
                resize: 'none', lineHeight: 1.6, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 6 }}>
              {newQ.trim().length} / 500 characters
            </div>
            <div style={{ background: COLORS.card2, borderRadius: 12, padding: '12px 14px', marginTop: 16, fontSize: 12, color: COLORS.muted, lineHeight: 1.7 }}>
              💡 <strong style={{ color: COLORS.text }}>Tips for a good doubt:</strong><br />
              • Be specific — "I don't understand step 3 of…"<br />
              • Mention what you already tried<br />
              • Add the topic or chapter name
            </div>
          </div>
          <div style={{ padding: '12px 16px 16px', borderTop: `1px solid ${COLORS.border}`, background: COLORS.bg, flexShrink: 0 }}>
            <button
              onClick={handlePost}
              disabled={!newQ.trim() || posting || newQ.trim().length > 500}
              style={{
                width: '100%', padding: '14px',
                background: newQ.trim() ? `linear-gradient(135deg,${COLORS.blue},#5577ee)` : COLORS.card,
                border: 'none', borderRadius: 14,
                color: newQ.trim() ? '#fff' : COLORS.muted,
                fontWeight: 800, fontSize: 15, cursor: newQ.trim() ? 'pointer' : 'default',
                fontFamily: 'Sora, sans-serif',
              }}
            >{posting ? 'Posting…' : '📤 Post to Squad'}</button>
          </div>
        </>
      )}
    </div>
  )

  // ── VIEW: Answers for a specific doubt ────────────────────
  if (view === 'answers') return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${COLORS.border}`, background: COLORS.card, flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <button onClick={() => { setView('list'); setOpenDoubt(null) }} style={{ background: 'transparent', border: 'none', color: COLORS.muted, fontSize: 20, cursor: 'pointer', fontFamily: 'Sora, sans-serif', lineHeight: 1, flexShrink: 0, marginTop: 2 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.text, lineHeight: 1.4 }}>{openDoubt?.question}</div>
          <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 3 }}>
            Asked by <strong style={{ color: COLORS.blue }}>{openDoubt?.display_name}</strong> · {openDoubt?.subject}
          </div>
        </div>
      </div>

      {/* Answers list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {answers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🙋</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>No answers yet</div>
            <div style={{ fontSize: 12, color: COLORS.muted }}>Be the first squadmate to help out!</div>
          </div>
        ) : answers.map((a, idx) => (
          <div key={a.id} style={{
            background: COLORS.card, border: `1px solid ${idx === 0 && a.upvotes > 0 ? COLORS.green + '40' : COLORS.border}`,
            borderRadius: 14, padding: '12px 14px',
          }}>
            {idx === 0 && a.upvotes > 0 && (
              <div style={{ fontSize: 10, fontWeight: 800, color: COLORS.green, letterSpacing: '0.05em', marginBottom: 6 }}>⭐ TOP ANSWER</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: a.user_id === userId ? COLORS.green : COLORS.blue }}>
                {a.user_id === userId ? '✨ You' : a.display_name}
              </span>
              {a.ai_verdict && (() => {
                const v = VERDICT_COLORS[a.ai_verdict]
                return v ? (
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20, background: v.bg, border: `1px solid ${v.border}`, color: v.text }}>
                    {v.label}
                  </span>
                ) : null
              })()}
            </div>
            <div style={{ fontSize: 13.5, color: COLORS.text, lineHeight: 1.6 }}>{a.answer}</div>
            {a.ai_note && (
              <div style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 7, padding: '7px 10px', background: COLORS.card2, borderRadius: 8, lineHeight: 1.55 }}>
                🤖 {a.ai_note}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                onClick={() => handleUpvote(a)}
                disabled={a.user_id === userId || !!a.i_upvoted || !!upvoting}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: a.i_upvoted ? `${COLORS.green}18` : `${COLORS.card2}`,
                  border: `1px solid ${a.i_upvoted ? COLORS.green + '60' : COLORS.border}`,
                  borderRadius: 20, padding: '5px 14px',
                  color: a.i_upvoted ? COLORS.green : (a.user_id === userId ? COLORS.muted : COLORS.text),
                  fontSize: 12, fontWeight: 700,
                  cursor: a.user_id === userId || a.i_upvoted ? 'default' : 'pointer',
                  fontFamily: 'Sora, sans-serif',
                  opacity: a.user_id === userId ? 0.45 : 1,
                }}
              >
                👍 {a.upvotes}
                {!a.i_upvoted && a.user_id !== userId && (
                  <span style={{ fontSize: 10, color: COLORS.green, fontWeight: 800 }}>+15 XP</span>
                )}
                {a.i_upvoted && <span style={{ fontSize: 10 }}>Voted</span>}
                {a.user_id === userId && <span style={{ fontSize: 10 }}>Your answer</span>}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Write answer bar */}
      <div style={{ padding: '10px 12px 14px', borderTop: `1px solid ${COLORS.border}`, background: COLORS.bg, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, marginBottom: 6 }}>WRITE YOUR ANSWER</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newAns}
            onChange={e => setNewAns(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAnswer()}
            placeholder="Help your squadmate…"
            style={{ flex: 1, background: COLORS.card, border: `1.5px solid ${newAns.trim() ? COLORS.blue : COLORS.border}`, borderRadius: 12, padding: '11px 14px', color: COLORS.text, fontSize: 13.5, fontFamily: 'Sora, sans-serif', outline: 'none' }}
          />
          <button
            onClick={handleAnswer}
            disabled={!newAns.trim() || ansPosting}
            style={{ background: newAns.trim() ? `linear-gradient(135deg,${COLORS.blue},#5577ee)` : COLORS.card, border: 'none', borderRadius: 12, padding: '0 18px', color: newAns.trim() ? '#fff' : COLORS.muted, fontWeight: 800, fontSize: 13, cursor: newAns.trim() ? 'pointer' : 'default', fontFamily: 'Sora, sans-serif', flexShrink: 0 }}
          >{ansPosting ? '…' : 'Send'}</button>
        </div>
      </div>
    </div>
  )

  // ── VIEW: Doubts list ─────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Header with Ask button */}
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${COLORS.border}`, background: COLORS.card, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: COLORS.text }}>❓ Doubts Board</div>
          <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 1 }}>
            {doubts.length} doubt{doubts.length !== 1 ? 's' : ''}
            {quota && (
              <span style={{ marginLeft: 8, fontWeight: 700, color: atLimit ? COLORS.red : COLORS.green }}>
                · {atLimit ? '0 left' : `${quota.remaining}/${quota.limit} left today`}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setView('post')}
          style={{
            background: atLimit ? COLORS.card2 : `linear-gradient(135deg,${COLORS.blue},#5577ee)`,
            border: atLimit ? `1px solid ${COLORS.border}` : 'none',
            borderRadius: 12, padding: '9px 16px',
            color: atLimit ? COLORS.muted : '#fff', fontWeight: 800, fontSize: 13,
            cursor: 'pointer', fontFamily: 'Sora, sans-serif',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >{atLimit ? '🚫 Limit' : '+ Ask'}</button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <div style={{ width: 32, height: 32, border: `3px solid ${COLORS.blue}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        ) : doubts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🤔</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.text, marginBottom: 8 }}>No doubts yet!</div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 24, lineHeight: 1.6 }}>
              Stuck on something? Post your doubt and your squadmates will help.
            </div>
            <button onClick={() => setView('post')} style={{
              background: `linear-gradient(135deg,${COLORS.blue},#5577ee)`,
              border: 'none', borderRadius: 14, padding: '13px 32px',
              color: '#fff', fontWeight: 800, fontSize: 14,
              cursor: 'pointer', fontFamily: 'Sora, sans-serif',
            }}>❓ Post First Doubt</button>
          </div>
        ) : doubts.map(d => (
          <button
            key={d.id}
            onClick={() => openAnswerView(d)}
            style={{
              width: '100%', background: COLORS.card,
              border: `1px solid ${d.status === 'answered' ? COLORS.green + '30' : COLORS.border}`,
              borderLeft: `3px solid ${d.status === 'answered' ? COLORS.green : COLORS.blue}`,
              borderRadius: 14, padding: '13px 14px', marginBottom: 8,
              cursor: 'pointer', fontFamily: 'Sora, sans-serif', textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text, flex: 1, lineHeight: 1.45 }}>{d.question}</div>
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20, flexShrink: 0,
                background: d.status === 'answered' ? `${COLORS.green}20` : `${COLORS.yellow}20`,
                color: d.status === 'answered' ? COLORS.green : COLORS.yellow,
              }}>{d.status === 'answered' ? '✓ Answered' : 'Open'}</span>
            </div>
            <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 6, display: 'flex', gap: 8 }}>
              <span>{d.display_name}</span>
              <span>·</span>
              <span style={{ color: COLORS.blue }}>{d.subject}</span>
              <span>·</span>
              <span>{d.answer_count} answer{d.answer_count !== 1 ? 's' : ''}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Daily Concept Panel ───────────────────────────────────────
const DAILY_VERDICT = {
  correct:   { bg: `${COLORS.green}15`,  border: `${COLORS.green}40`,  text: COLORS.green,  icon: '✅', label: 'Great understanding!',   xp: 30 },
  partial:   { bg: `${COLORS.yellow}15`, border: `${COLORS.yellow}40`, text: COLORS.yellow, icon: '⚠️', label: 'Partially correct.',      xp: 15 },
  incorrect: { bg: `${COLORS.red}15`,    border: `${COLORS.red}40`,    text: COLORS.red,    icon: '✗',  label: 'Needs more accuracy.',    xp:  5 },
}

function DailyPanel({ squadId, userId, profileName, addXp, profile }) {
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [text,       setText]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reviewing,  setReviewing]  = useState(false)   // AI thinking
  const [done,       setDone]       = useState(false)
  const [verdict,    setVerdict]    = useState(null)     // {verdict,note,xp} from AI
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length

  useEffect(() => {
    apiGetDailyConcept(squadId)
      .then(d => {
        setData(d)
        if (d.my_explanation) {
          setDone(true)
          // Restore persisted AI verdict
          if (d.my_explanation.ai_verdict) {
            setVerdict({ verdict: d.my_explanation.ai_verdict, note: d.my_explanation.ai_note })
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [squadId])

  const handleSubmit = async () => {
    if (!text.trim() || wordCount < 10) return
    setSubmitting(true)
    setReviewing(true)

    // ── AI Review (best-effort) ────────────────────────────
    let aiVerdict = null, aiNote = null, xpOverride = null
    try {
      const lang = profile?.language || 'English'
      const sysPrompt = `You are a strict education evaluator. ${LANG_RULES[lang] || ''} Reply ONLY with valid JSON, nothing else.`
      const userMsg = `Concept: ${data?.concept} (Subject: ${data?.subject})\nStudent explanation: ${text.trim()}\n\nEvaluate accuracy. Reply ONLY: {"verdict":"correct"|"partial"|"incorrect","note":"one sentence feedback","xp":30|15|5}\nRules: correct=full understanding→30, partial=some gaps→15, incorrect=misunderstood→5`
      const raw = await callAI(userMsg, sysPrompt, [], 2, 400)
      const match = raw.match(/\{[\s\S]*?\}/)
      if (match) {
        const obj = JSON.parse(match[0])
        if (['correct', 'partial', 'incorrect'].includes(obj.verdict)) {
          aiVerdict  = obj.verdict
          aiNote     = obj.note || ''
          xpOverride = [5, 15, 30].includes(obj.xp) ? obj.xp : null
        }
      }
    } catch { /* AI unavailable → backend uses fallback 20 XP */ }
    setReviewing(false)

    // ── Submit to backend ──────────────────────────────────
    try {
      const res = await apiSubmitDailyExplain(squadId, text.trim(), xpOverride, aiVerdict, aiNote)
      if (res.submitted) {
        setDone(true)
        if (aiVerdict) setVerdict({ verdict: aiVerdict, note: aiNote, xp: res.xp_awarded })
        if (addXp) addXp(res.xp_awarded)
        const fresh = await apiGetDailyConcept(squadId)
        setData(fresh)
      }
    } catch (err) { alert(err.message) }
    finally { setSubmitting(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${COLORS.yellow}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
  const v = verdict ? DAILY_VERDICT[verdict.verdict] : null

  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '16px 16px 24px' }}>
      {/* Header */}
      <div style={{ background: `${COLORS.yellow}10`, border: `1px solid ${COLORS.yellow}30`, borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: COLORS.yellow, letterSpacing: '0.06em', marginBottom: 6 }}>📅 DAILY CONCEPT · {today.toUpperCase()}</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: COLORS.text }}>{data?.concept}</div>
        <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>{data?.subject} · Explain in your own words · AI grades your answer</div>
      </div>

      {/* AI Reviewing spinner */}
      {reviewing && (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: '16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 22, height: 22, border: `3px solid ${COLORS.blue}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>AI is reviewing your explanation…</div>
            <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>XP will be based on accuracy</div>
          </div>
        </div>
      )}

      {/* AI Verdict card (shown after submit) */}
      {done && v && (
        <div style={{ background: v.bg, border: `1px solid ${v.border}`, borderRadius: 14, padding: '13px 15px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>{v.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: v.text }}>{v.label}</span>
            <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 800, color: COLORS.yellow }}>+{verdict.xp ?? v.xp} XP</span>
          </div>
          {verdict.note && (
            <div style={{ fontSize: 12.5, color: COLORS.text, lineHeight: 1.6, paddingLeft: 26 }}>🤖 {verdict.note}</div>
          )}
        </div>
      )}

      {/* Already submitted — show their explanation */}
      {done && data?.my_explanation && (
        <div style={{ background: `${COLORS.green}08`, border: `1px solid ${COLORS.green}20`, borderRadius: 14, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: COLORS.green, marginBottom: 6 }}>✅ YOUR EXPLANATION</div>
          <div style={{ fontSize: 13.5, color: COLORS.text, lineHeight: 1.6 }}>{data.my_explanation.explanation}</div>
        </div>
      )}

      {/* Input form */}
      {!done && !reviewing && (
        <div style={{ marginBottom: 16 }}>
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder={`Explain "${data?.concept}" in simple words…`}
            rows={4}
            style={{ width: '100%', background: COLORS.card, border: `1.5px solid ${wordCount >= 10 ? COLORS.yellow : COLORS.border}`, borderRadius: 14, padding: '12px 14px', color: COLORS.text, fontSize: 13.5, fontFamily: 'Sora, sans-serif', resize: 'none', lineHeight: 1.55, boxSizing: 'border-box', outline: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <span style={{ fontSize: 11, color: wordCount >= 10 ? COLORS.green : COLORS.muted }}>{wordCount}/10 words minimum</span>
            <span style={{ fontSize: 11, color: COLORS.muted }}>AI grades: ✅30 / ⚠️15 / ✗5 XP</span>
          </div>
          <button onClick={handleSubmit} disabled={submitting || wordCount < 10}
            style={{
              marginTop: 10, width: '100%',
              background: wordCount >= 10 ? `linear-gradient(135deg,${COLORS.yellow},#ffb700)` : COLORS.card,
              border: 'none', borderRadius: 12, padding: '12px',
              color: wordCount >= 10 ? '#04040e' : COLORS.muted,
              fontWeight: 800, fontSize: 14, cursor: wordCount >= 10 ? 'pointer' : 'default',
              fontFamily: 'Sora, sans-serif',
            }}>
            {submitting && !reviewing ? 'Submitting…' : '📤 Submit for AI Review'}
          </button>
        </div>
      )}

      {/* Squad explanations */}
      <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.muted, letterSpacing: '0.05em', marginBottom: 10 }}>
        SQUAD'S EXPLANATIONS ({data?.explanations?.length || 0})
      </div>
      {(!data?.explanations || data.explanations.length === 0) ? (
        <div style={{ textAlign: 'center', color: COLORS.muted, fontSize: 13, padding: '20px 0' }}>No one has explained yet today. Be the first! 🌟</div>
      ) : data.explanations.map(ex => {
        const ev = ex.ai_verdict ? DAILY_VERDICT[ex.ai_verdict] : null
        return (
          <div key={ex.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: ex.user_id === userId ? COLORS.green : COLORS.blue }}>
                  {ex.user_id === userId ? '✨ You' : ex.display_name}
                </span>
                {ev && <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 20, background: ev.bg, color: ev.text }}>{ev.icon}</span>}
              </div>
              <span style={{ fontSize: 11, color: COLORS.yellow, fontWeight: 700 }}>+{ex.xp_awarded} XP</span>
            </div>
            <div style={{ fontSize: 13.5, color: COLORS.text, lineHeight: 1.6 }}>{ex.explanation}</div>
            {ex.ai_note && (
              <div style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 7, padding: '6px 10px', background: COLORS.card2, borderRadius: 8 }}>🤖 {ex.ai_note}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main SathiTab ─────────────────────────────────────────────
export default function SathiTab({ profile, userId, addXp }) {
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
  const [, setSilenceTick] = useState(0)  // forces re-render for silence check
  const [activePanel,    setActivePanel]    = useState('chat')   // chat|doubts|daily
  const [squadStreak,    setSquadStreak]    = useState(0)

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
    apiGetSquadStreak(squad.id).then(d => setSquadStreak(d.streak || 0)).catch(() => {})
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
    if (res?.completed && res?.xp_awarded && addXp) {
      addXp(res.xp_awarded)
    }
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
        padding: '10px 16px',
        borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.card,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: COLORS.text }}>
            🤝 {squad.name}
          </div>
          <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span><span style={{ color: COLORS.blue, fontWeight: 700 }}>{squad.focus_subject}</span></span>
            <span>·</span>
            <span>{members.filter(m => m.online).length}/{members.length} online</span>
            {squadStreak > 0 && <><span>·</span><span style={{ color: COLORS.orange, fontWeight: 700 }}>🔥 {squadStreak}d streak</span></>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleCreateChallenge} title="Get a teach-this challenge"
            style={{ background: `${COLORS.yellow}15`, border: `1px solid ${COLORS.yellow}40`, borderRadius: 10, padding: '6px 10px', fontSize: 13, cursor: 'pointer', fontFamily: 'Sora, sans-serif', color: COLORS.yellow, fontWeight: 700 }}>📚</button>
          <button onClick={handleLeave} disabled={leaving}
            style={{ background: `${COLORS.red}15`, border: `1px solid ${COLORS.red}40`, borderRadius: 10, padding: '6px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'Sora, sans-serif', color: COLORS.red, fontWeight: 700 }}>Leave</button>
        </div>
      </div>

      {/* ── Members strip ── */}
      <MembersStrip members={members} currentUserId={userId} />

      {/* ── Sub-tab nav ── */}
      <SubNav active={activePanel} onChange={setActivePanel} />

      {/* ── Challenge banner (chat tab only) ── */}
      {activePanel === 'chat' && showChallenge && challenge && (
        <div style={{ padding: '10px 14px 0', flexShrink: 0 }}>
          <ChallengeBanner
            challenge={challenge}
            onSubmit={handleSubmitChallenge}
            onDismiss={() => { setShowChallenge(false); setChallenge(null) }}
          />
        </div>
      )}

      {/* ── Panel content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* CHAT */}
        {activePanel === 'chat' && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: COLORS.muted, fontSize: 13, marginTop: 40 }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>👋</div>
                  Say hi to your squad!
                </div>
              )}
              {messages.map(m => (
                <Bubble key={m.id} msg={m} isMine={m.user_id === userId && m.msg_type !== 'ai_peer'} memberName={memberMap[m.user_id]?.name} />
              ))}
              <div ref={messagesEnd} />
            </div>
            {showAIPeerBtn && (
              <div style={{ padding: '6px 14px 0', flexShrink: 0, textAlign: 'center' }}>
                <button onClick={invokeAIPeer} disabled={aiPeerLoading}
                  style={{ background: `${COLORS.blue}15`, border: `1px solid ${COLORS.blue}40`, borderRadius: 20, padding: '7px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Sora, sans-serif', color: COLORS.blue, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {aiPeerLoading
                    ? <><span style={{ width: 12, height: 12, border: `2px solid ${COLORS.blue}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Gyaani is thinking…</>
                    : '🦉 Ask Gyaani (AI Study Peer)'}
                </button>
                <div style={{ fontSize: 10.5, color: COLORS.muted, marginTop: 4 }}>Squad's been quiet — Gyaani can spark discussion</div>
              </div>
            )}
            <form onSubmit={sendMessage} style={{ padding: '10px 12px 12px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', gap: 8, flexShrink: 0, background: COLORS.bg }}>
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} placeholder="Message your squad…"
                style={{ flex: 1, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: '10px 14px', color: COLORS.text, fontSize: 14, fontFamily: 'Sora, sans-serif', outline: 'none' }} />
              <button type="submit" disabled={!input.trim() || sending}
                style={{ background: input.trim() ? `linear-gradient(135deg,${COLORS.green},#33cc88)` : COLORS.card, border: 'none', borderRadius: 14, padding: '0 18px', cursor: input.trim() ? 'pointer' : 'default', color: input.trim() ? '#04040e' : COLORS.muted, fontSize: 18, fontWeight: 900, fontFamily: 'Sora, sans-serif', flexShrink: 0 }}>➤</button>
            </form>
          </>
        )}

        {/* DOUBTS */}
        {activePanel === 'doubts' && (
          <DoubtsPanel squadId={squad.id} userId={userId} profileName={profile?.name} profile={profile} />
        )}

        {/* DAILY */}
        {activePanel === 'daily' && (
          <DailyPanel squadId={squad.id} userId={userId} profileName={profile?.name} addXp={addXp} profile={profile} />
        )}

      </div>
    </div>
  )
}
