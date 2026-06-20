import { useState, useEffect, useRef, useCallback } from 'react'
import { callAI, LANG_RULES } from '../../shared.js'
import { li } from '../../i18n/index.js'
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
    <div className="relative flex-shrink-0">
      <div className="rounded-full flex items-center justify-center font-black text-white"
        style={{
          width: size, height: size, fontSize: isAI ? size * 0.55 : size * 0.45,
          background: bg, border: `2px solid #101022`,
        }}>{initials}</div>
      {online && (
        <div className="absolute bottom-0.5 right-0.5 w-[9px] h-[9px] rounded-full border-2"
          style={{ background: '#00E5A0', borderColor: '#04040e' }} />
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
    <div className="text-center my-2">
      <span className="text-[11.5px] text-app-muted font-semibold bg-app-card2 rounded-[20px] px-3 py-1">{msg.content}</span>
    </div>
  )

  if (isChallenge) return (
    <div className="bg-app-yellow/[0.07] border border-app-yellow/25 rounded-[14px] px-3.5 py-2.5 my-2 text-[13px] text-app-yellow font-semibold">🏆 {msg.content}</div>
  )

  return (
    <div className="flex gap-2 my-1"
      style={{ flexDirection: isMine ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
      {!isMine && <Avatar name={isAIPeer ? 'AI' : (memberName || msg.display_name)} size={28} isAI={isAIPeer} />}
      <div className="max-w-[72%] flex flex-col gap-0.5"
        style={{ alignItems: isMine ? 'flex-end' : 'flex-start' }}>
        {!isMine && (
          <span className="text-[10.5px] text-app-muted font-semibold ml-1">
            {isAIPeer ? '🦉 Gyaani (AI Peer)' : (memberName || msg.display_name)}
          </span>
        )}
        <div className="px-3.5 py-2.5 text-[13.5px] leading-[1.55]"
          style={{
            background: isMine
              ? `linear-gradient(135deg,#00E5A0,#33cc88)`
              : isAIPeer ? '#7B9CFF18' : '#0b0b1c',
            border: isMine ? 'none' : `1px solid ${isAIPeer ? '#7B9CFF40' : 'rgba(255,255,255,0.03)'}`,
            borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            color: isMine ? '#04040e' : '#eeeeff',
          }}>
          {msg.content}
        </div>
        <span className="text-[10px] text-app-muted"
          style={{ marginRight: isMine ? 4 : 0, marginLeft: isMine ? 0 : 4 }}>
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
    <div className="bg-app-green/[0.08] border border-app-green/25 rounded-[14px] px-4 py-3 mb-2.5 text-[13px] text-app-green font-bold text-center">
      🎓 Challenge complete! +50 Teaching XP earned!
    </div>
  )

  return (
    <div className="bg-app-yellow/[0.05] border-[1.5px] border-app-yellow/30 rounded-2xl px-4 py-3.5 mb-2.5">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-[11px] font-extrabold text-app-yellow tracking-[0.06em] mb-0.5">
            📚 YOUR CHALLENGE — 50 Teaching XP
          </div>
          <div className="text-[14px] font-bold text-app-text">
            Explain: <span className="text-app-yellow">{challenge.concept}</span>
          </div>
          <div className="text-[11px] text-app-muted mt-0.5">{challenge.subject}</div>
        </div>
        <button onClick={onDismiss} className="bg-transparent border-none cursor-pointer text-app-muted text-[18px] px-1">×</button>
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Explain this concept to your squad in simple words…"
        rows={3}
        className="w-full bg-app-card2 border border-app-border rounded-[10px] px-2.5 py-2 text-app-text text-[13px] resize-y outline-none box-border"
      />
      <button
        onClick={submit}
        disabled={submitting || !text.trim()}
        className="mt-2 w-full border-none rounded-[10px] py-2.5 text-[13px] font-extrabold"
        style={{
          background: text.trim() ? `linear-gradient(135deg,#FFD166,#ffaa00)` : '#0b0b1c',
          color: text.trim() ? '#04040e' : '#6868a0',
          cursor: text.trim() ? 'pointer' : 'default',
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
    <div className="flex gap-3 px-3.5 py-2.5 overflow-x-auto border-b border-app-border bg-app-card">
      {members.map(m => (
        <div key={m.user_id} className="flex flex-col items-center gap-1 min-w-[44px]">
          <Avatar name={m.name} size={36} online={m.online} />
          <span className="text-[10px] max-w-[50px] overflow-hidden text-ellipsis whitespace-nowrap"
            style={{ color: m.user_id === currentUserId ? '#00E5A0' : '#6868a0', fontWeight: m.user_id === currentUserId ? 800 : 500 }}
          >{m.user_id === currentUserId ? 'You' : m.name.split(' ')[0]}</span>
          <span className="text-[9px] font-bold"
            style={{ color: m.role === 'teacher' ? '#FFD166' : '#6868a0' }}
          >{m.role === 'teacher' ? '⭐ teacher' : '📖 learner'}</span>
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
    <div className="flex flex-col items-center px-4 py-8 gap-7">
      {/* Hero */}
      <div className="text-center">
        <div className="text-[56px] mb-3">🤝</div>
        <h2 className="text-[22px] font-black m-0 mb-2 tracking-tight">
          Sathi <span className="text-app-green">Study Squads</span>
        </h2>
        <p className="text-[14px] text-app-muted m-0 leading-[1.6] max-w-[320px]">
          AI matches you with students who have <strong className="text-app-text">complementary strengths</strong> — you teach what you know, learn what you don't.
        </p>
      </div>

      {/* How it works */}
      <div className="flex flex-col gap-3 w-full max-w-[380px]">
        {steps.map((s, i) => (
          <div key={i} className="bg-app-card border border-app-border rounded-[14px] px-4 py-3.5 flex gap-3.5 items-start">
            <span className="text-[26px] flex-shrink-0">{s.icon}</span>
            <div>
              <div className="text-[13px] font-extrabold text-app-text mb-0.5">{s.title}</div>
              <div className="text-[12px] text-app-muted leading-[1.5]">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Teaching XP callout */}
      <div className="bg-app-yellow/[0.06] border border-app-yellow/20 rounded-[14px] px-4 py-3 w-full max-w-[380px] flex gap-3 items-center">
        <span className="text-[28px]">🏆</span>
        <div>
          <div className="text-[13px] font-extrabold text-app-yellow">Teaching XP</div>
          <div className="text-[12px] text-app-muted leading-[1.5]">
            Earn <strong className="text-app-yellow">50 XP</strong> every time you successfully explain a concept to your squad — more than answering quizzes!
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onMatch}
        disabled={matching}
        className="border-none rounded-2xl px-10 py-4 text-[15px] font-black cursor-pointer flex items-center gap-2.5"
        style={{
          background: matching ? '#0b0b1c' : `linear-gradient(135deg,#00E5A0,#33cc88)`,
          boxShadow: matching ? 'none' : `0 0 28px #00E5A044`,
          color: matching ? '#6868a0' : '#04040e',
        }}
      >
        {matching
          ? <><span className="w-[18px] h-[18px] border-[3px] border-app-green border-t-transparent rounded-full animate-spin inline-block" /> Finding your squad…</>
          : '🤝 Find My Study Squad'}
      </button>
      <p className="text-[11px] text-app-muted -mt-4 text-center">
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
    <div className="flex border-b border-app-border bg-app-card flex-shrink-0">
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className="flex-1 bg-transparent border-none px-1 pt-2.5 pb-2 text-[12px] cursor-pointer flex flex-col items-center gap-0.5"
          style={{
            borderBottom: active === t.key ? `2px solid #00E5A0` : `2px solid transparent`,
            color: active === t.key ? '#00E5A0' : '#6868a0',
            fontWeight: active === t.key ? 700 : 500,
          }}>
          <span className="text-[16px]">{t.icon}</span>
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
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-app-border bg-app-card flex-shrink-0 flex items-center gap-2.5">
        <button onClick={() => setView('list')} className="bg-transparent border-none text-app-muted text-[20px] cursor-pointer leading-none">←</button>
        <span className="text-[15px] font-extrabold text-app-text flex-1">❓ Post a Doubt</span>
        {quota && (
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-[20px]"
            style={{ background: atLimit ? '#FF6B6B20' : '#00E5A020', color: atLimit ? '#FF6B6B' : '#00E5A0' }}>
            {atLimit ? 'Limit reached' : `${quota.remaining} left today`}
          </span>
        )}
      </div>

      {atLimit ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
          <div className="text-[48px] mb-3">🚫</div>
          <div className="text-[16px] font-extrabold text-app-text mb-2">Daily limit reached</div>
          <div className="text-[13px] text-app-muted leading-[1.7]">
            You've used all <strong className="text-app-text">{quota.limit}</strong> doubts for today on the <strong className="text-app-blue">{quota.plan}</strong> plan.<br />
            Come back tomorrow — or upgrade for more!
          </div>
          {quota.plan !== 'premium' && (
            <div className="mt-5 text-[11px] text-app-muted">
              Free: 2/day · Basic: 5/day · Pro: 15/day · Premium: unlimited
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="text-[12px] font-bold text-app-muted mb-2 tracking-[0.04em]">YOUR DOUBT</div>
            <textarea
              value={newQ}
              onChange={e => setNewQ(e.target.value)}
              placeholder="What are you stuck on? Write your doubt clearly so your squad can help…"
              rows={5}
              autoFocus
              className="w-full bg-app-card rounded-[14px] px-3.5 py-3 text-app-text text-[14px] resize-none leading-[1.6] outline-none box-border"
              style={{ border: `1.5px solid ${newQ.trim() ? '#7B9CFF' : 'rgba(255,255,255,0.03)'}` }}
            />
            <div className="text-[11px] text-app-muted mt-1.5">
              {newQ.trim().length} / 500 characters
            </div>
            <div className="bg-app-card2 rounded-[12px] px-3.5 py-3 mt-4 text-[12px] text-app-muted leading-[1.7]">
              💡 <strong className="text-app-text">Tips for a good doubt:</strong><br />
              • Be specific — "I don't understand step 3 of…"<br />
              • Mention what you already tried<br />
              • Add the topic or chapter name
            </div>
          </div>
          <div className="px-4 pt-3 pb-4 border-t border-app-border bg-app-bg flex-shrink-0">
            <button
              onClick={handlePost}
              disabled={!newQ.trim() || posting || newQ.trim().length > 500}
              className="w-full py-3.5 border-none rounded-[14px] font-extrabold text-[15px]"
              style={{
                background: newQ.trim() ? `linear-gradient(135deg,#7B9CFF,#5577ee)` : '#0b0b1c',
                color: newQ.trim() ? '#fff' : '#6868a0',
                cursor: newQ.trim() ? 'pointer' : 'default',
              }}
            >{posting ? 'Posting…' : '📤 Post to Squad'}</button>
          </div>
        </>
      )}
    </div>
  )

  // ── VIEW: Answers for a specific doubt ────────────────────
  if (view === 'answers') return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-app-border bg-app-card flex-shrink-0 flex items-start gap-2.5">
        <button onClick={() => { setView('list'); setOpenDoubt(null) }} className="bg-transparent border-none text-app-muted text-[20px] cursor-pointer leading-none flex-shrink-0 mt-0.5">←</button>
        <div className="flex-1">
          <div className="text-[13.5px] font-bold text-app-text leading-[1.4]">{openDoubt?.question}</div>
          <div className="text-[11px] text-app-muted mt-0.5">
            Asked by <strong className="text-app-blue">{openDoubt?.display_name}</strong> · {openDoubt?.subject}
          </div>
        </div>
      </div>

      {/* Answers list */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 flex flex-col gap-2.5">
        {answers.length === 0 ? (
          <div className="text-center px-5 py-10">
            <div className="text-[40px] mb-2.5">🙋</div>
            <div className="text-[14px] font-bold text-app-text mb-1.5">No answers yet</div>
            <div className="text-[12px] text-app-muted">Be the first squadmate to help out!</div>
          </div>
        ) : answers.map((a, idx) => (
          <div key={a.id}
            className="bg-app-card rounded-[14px] px-3.5 py-3"
            style={{ border: `1px solid ${idx === 0 && a.upvotes > 0 ? '#00E5A040' : 'rgba(255,255,255,0.03)'}` }}>
            {idx === 0 && a.upvotes > 0 && (
              <div className="text-[10px] font-extrabold text-app-green tracking-[0.05em] mb-1.5">⭐ TOP ANSWER</div>
            )}
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[12px] font-bold" style={{ color: a.user_id === userId ? '#00E5A0' : '#7B9CFF' }}>
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
            <div className="text-[13.5px] text-app-text leading-[1.6]">{a.answer}</div>
            {a.ai_note && (
              <div className="text-[11.5px] text-app-muted mt-1.5 px-2.5 py-1.5 bg-app-card2 rounded-lg leading-[1.55]">
                🤖 {a.ai_note}
              </div>
            )}
            <div className="flex justify-end mt-2.5">
              <button
                onClick={() => handleUpvote(a)}
                disabled={a.user_id === userId || !!a.i_upvoted || !!upvoting}
                className="flex items-center gap-1.5 rounded-[20px] px-3.5 py-1.5 text-[12px] font-bold"
                style={{
                  background: a.i_upvoted ? '#00E5A018' : '#101022',
                  border: `1px solid ${a.i_upvoted ? '#00E5A060' : 'rgba(255,255,255,0.03)'}`,
                  color: a.i_upvoted ? '#00E5A0' : (a.user_id === userId ? '#6868a0' : '#eeeeff'),
                  cursor: a.user_id === userId || a.i_upvoted ? 'default' : 'pointer',
                  opacity: a.user_id === userId ? 0.45 : 1,
                }}
              >
                👍 {a.upvotes}
                {!a.i_upvoted && a.user_id !== userId && (
                  <span className="text-[10px] text-app-green font-extrabold">+15 XP</span>
                )}
                {a.i_upvoted && <span className="text-[10px]">Voted</span>}
                {a.user_id === userId && <span className="text-[10px]">Your answer</span>}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Write answer bar */}
      <div className="px-3 pt-2.5 pb-3.5 border-t border-app-border bg-app-bg flex-shrink-0">
        <div className="text-[11px] font-bold text-app-muted mb-1.5">WRITE YOUR ANSWER</div>
        <div className="flex gap-2">
          <input
            value={newAns}
            onChange={e => setNewAns(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAnswer()}
            placeholder="Help your squadmate…"
            className="flex-1 bg-app-card rounded-[12px] px-3.5 py-3 text-app-text text-[13.5px] outline-none"
            style={{ border: `1.5px solid ${newAns.trim() ? '#7B9CFF' : 'rgba(255,255,255,0.03)'}` }}
          />
          <button
            onClick={handleAnswer}
            disabled={!newAns.trim() || ansPosting}
            className="border-none rounded-[12px] px-4 font-extrabold text-[13px] flex-shrink-0"
            style={{ background: newAns.trim() ? `linear-gradient(135deg,#7B9CFF,#5577ee)` : '#0b0b1c', color: newAns.trim() ? '#fff' : '#6868a0', cursor: newAns.trim() ? 'pointer' : 'default' }}
          >{ansPosting ? '…' : 'Send'}</button>
        </div>
      </div>
    </div>
  )

  // ── VIEW: Doubts list ─────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header with Ask button */}
      <div className="px-3.5 py-3 border-b border-app-border bg-app-card flex-shrink-0 flex justify-between items-center">
        <div>
          <div className="text-[14px] font-extrabold text-app-text">❓ Doubts Board</div>
          <div className="text-[11px] text-app-muted mt-0.5">
            {doubts.length} doubt{doubts.length !== 1 ? 's' : ''}
            {quota && (
              <span className="ml-2 font-bold" style={{ color: atLimit ? '#FF6B6B' : '#00E5A0' }}>
                · {atLimit ? '0 left' : `${quota.remaining}/${quota.limit} left today`}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setView('post')}
          className="border-none rounded-[12px] px-4 py-2.5 font-extrabold text-[13px] cursor-pointer flex items-center gap-1.5"
          style={{
            background: atLimit ? '#101022' : `linear-gradient(135deg,#7B9CFF,#5577ee)`,
            border: atLimit ? `1px solid rgba(255,255,255,0.03)` : 'none',
            color: atLimit ? '#6868a0' : '#fff',
          }}
        >{atLimit ? '🚫 Limit' : '+ Ask'}</button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5">
        {loading ? (
          <div className="text-center mt-[60px]">
            <div className="w-8 h-8 border-[3px] border-app-blue border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : doubts.length === 0 ? (
          <div className="text-center px-6 py-12">
            <div className="text-[48px] mb-3">🤔</div>
            <div className="text-[16px] font-extrabold text-app-text mb-2">No doubts yet!</div>
            <div className="text-[13px] text-app-muted mb-6 leading-[1.6]">
              Stuck on something? Post your doubt and your squadmates will help.
            </div>
            <button onClick={() => setView('post')} className="bg-gradient-to-br from-app-blue to-['#5577ee'] border-none rounded-[14px] px-8 py-3.5 text-white font-extrabold text-[14px] cursor-pointer">❓ Post First Doubt</button>
          </div>
        ) : doubts.map(d => (
          <button
            key={d.id}
            onClick={() => openAnswerView(d)}
            className="w-full bg-app-card rounded-[14px] px-3.5 py-3 mb-2 cursor-pointer text-left"
            style={{
              border: `1px solid ${d.status === 'answered' ? '#00E5A030' : 'rgba(255,255,255,0.03)'}`,
              borderLeft: `3px solid ${d.status === 'answered' ? '#00E5A0' : '#7B9CFF'}`,
            }}
          >
            <div className="flex justify-between items-start gap-2">
              <div className="text-[13.5px] font-semibold text-app-text flex-1 leading-[1.45]">{d.question}</div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-[20px] flex-shrink-0"
                style={{
                  background: d.status === 'answered' ? '#00E5A020' : '#FFD16620',
                  color: d.status === 'answered' ? '#00E5A0' : '#FFD166',
                }}>{d.status === 'answered' ? '✓ Answered' : 'Open'}</span>
            </div>
            <div className="text-[11px] text-app-muted mt-1.5 flex gap-2">
              <span>{d.display_name}</span>
              <span>·</span>
              <span className="text-app-blue">{d.subject}</span>
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
  correct:   { bg: `#00E5A015`,  border: `#00E5A040`,  text: '#00E5A0',  icon: '✅', label: 'Great understanding!',   xp: 30 },
  partial:   { bg: `#FFD16615`, border: `#FFD16640`, text: '#FFD166', icon: '⚠️', label: 'Partially correct.',      xp: 15 },
  incorrect: { bg: `#FF6B6B15`,    border: `#FF6B6B40`,    text: '#FF6B6B',    icon: '✗',  label: 'Needs more accuracy.',    xp:  5 },
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
    <div className="flex items-center justify-center flex-1">
      <div className="w-7 h-7 border-[3px] border-app-yellow border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
  const v = verdict ? DAILY_VERDICT[verdict.verdict] : null

  return (
    <div className="flex-1 overflow-y-auto min-h-0 px-4 pt-4 pb-6">
      {/* Header */}
      <div className="bg-app-yellow/[0.06] border border-app-yellow/20 rounded-2xl px-4 py-3.5 mb-4">
        <div className="text-[11px] font-extrabold text-app-yellow tracking-[0.06em] mb-1.5">📅 DAILY CONCEPT · {today.toUpperCase()}</div>
        <div className="text-[18px] font-black text-app-text">{data?.concept}</div>
        <div className="text-[12px] text-app-muted mt-1">{data?.subject} · Explain in your own words · AI grades your answer</div>
      </div>

      {/* AI Reviewing spinner */}
      {reviewing && (
        <div className="bg-app-card border border-app-border rounded-[14px] p-4 mb-4 flex items-center gap-3">
          <div className="w-[22px] h-[22px] border-[3px] border-app-blue border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div>
            <div className="text-[13px] font-bold text-app-text">AI is reviewing your explanation…</div>
            <div className="text-[11px] text-app-muted mt-0.5">XP will be based on accuracy</div>
          </div>
        </div>
      )}

      {/* AI Verdict card (shown after submit) */}
      {done && v && (
        <div style={{ background: v.bg, border: `1px solid ${v.border}`, borderRadius: 14, padding: '13px 15px', marginBottom: 16 }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[18px]">{v.icon}</span>
            <span className="text-[13px] font-extrabold" style={{ color: v.text }}>{v.label}</span>
            <span className="ml-auto text-[13px] font-extrabold text-app-yellow">+{verdict.xp ?? v.xp} XP</span>
          </div>
          {verdict.note && (
            <div className="text-[12.5px] text-app-text leading-[1.6] pl-[26px]">🤖 {verdict.note}</div>
          )}
        </div>
      )}

      {/* Already submitted — show their explanation */}
      {done && data?.my_explanation && (
        <div className="border border-app-green/20 rounded-[14px] px-3.5 py-3 mb-4" style={{ background: '#00E5A008' }}>
          <div className="text-[11px] font-extrabold text-app-green mb-1.5">✅ YOUR EXPLANATION</div>
          <div className="text-[13.5px] text-app-text leading-[1.6]">{data.my_explanation.explanation}</div>
        </div>
      )}

      {/* Input form */}
      {!done && !reviewing && (
        <div className="mb-4">
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder={`Explain "${data?.concept}" in simple words…`}
            rows={4}
            className="w-full bg-app-card rounded-[14px] px-3.5 py-3 text-app-text text-[13.5px] resize-none leading-[1.55] box-border outline-none"
            style={{ border: `1.5px solid ${wordCount >= 10 ? '#FFD166' : 'rgba(255,255,255,0.03)'}` }} />
          <div className="flex justify-between items-center mt-1.5">
            <span className="text-[11px]" style={{ color: wordCount >= 10 ? '#00E5A0' : '#6868a0' }}>{wordCount}/10 words minimum</span>
            <span className="text-[11px] text-app-muted">AI grades: ✅30 / ⚠️15 / ✗5 XP</span>
          </div>
          <button onClick={handleSubmit} disabled={submitting || wordCount < 10}
            className="mt-2.5 w-full border-none rounded-[12px] py-3 font-extrabold text-[14px]"
            style={{
              background: wordCount >= 10 ? `linear-gradient(135deg,#FFD166,#ffb700)` : '#0b0b1c',
              color: wordCount >= 10 ? '#04040e' : '#6868a0',
              cursor: wordCount >= 10 ? 'pointer' : 'default',
            }}>
            {submitting && !reviewing ? 'Submitting…' : '📤 Submit for AI Review'}
          </button>
        </div>
      )}

      {/* Squad explanations */}
      <div className="text-[12px] font-extrabold text-app-muted tracking-[0.05em] mb-2.5">
        SQUAD'S EXPLANATIONS ({data?.explanations?.length || 0})
      </div>
      {(!data?.explanations || data.explanations.length === 0) ? (
        <div className="text-center text-app-muted text-[13px] py-5">No one has explained yet today. Be the first! 🌟</div>
      ) : data.explanations.map(ex => {
        const ev = ex.ai_verdict ? DAILY_VERDICT[ex.ai_verdict] : null
        return (
          <div key={ex.id} className="bg-app-card border border-app-border rounded-[14px] px-3.5 py-3 mb-2.5">
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-bold" style={{ color: ex.user_id === userId ? '#00E5A0' : '#7B9CFF' }}>
                  {ex.user_id === userId ? '✨ You' : ex.display_name}
                </span>
                {ev && <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-[20px]" style={{ background: ev.bg, color: ev.text }}>{ev.icon}</span>}
              </div>
              <span className="text-[11px] text-app-yellow font-bold">+{ex.xp_awarded} XP</span>
            </div>
            <div className="text-[13.5px] text-app-text leading-[1.6]">{ex.explanation}</div>
            {ex.ai_note && (
              <div className="text-[11.5px] text-app-muted mt-1.5 px-2.5 py-1.5 bg-app-card2 rounded-lg">🤖 {ex.ai_note}</div>
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
    <div className="tab-content flex items-center justify-center min-h-[300px]">
      <div className="w-9 h-9 border-[3px] border-app-green border-t-transparent rounded-full animate-spin" />
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
    <div className="tab-content flex flex-col h-full p-0">

      {/* ── Header ── */}
      <div className="px-4 py-2.5 border-b border-app-border bg-app-card flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-[14px] font-black text-app-text">
            🤝 {squad.name}
          </div>
          <div className="text-[11px] text-app-muted mt-0.5 flex gap-2 items-center">
            <span><span className="text-app-blue font-bold">{squad.focus_subject}</span></span>
            <span>·</span>
            <span>{members.filter(m => m.online).length}/{members.length} online</span>
            {squadStreak > 0 && <><span>·</span><span className="text-app-orange font-bold">🔥 {squadStreak}d streak</span></>}
          </div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={handleCreateChallenge} title="Get a teach-this challenge"
            className="bg-app-yellow/[0.08] border border-app-yellow/25 rounded-[10px] px-2.5 py-1.5 text-[13px] cursor-pointer text-app-yellow font-bold">📚</button>
          <button onClick={handleLeave} disabled={leaving}
            className="bg-app-red/[0.08] border border-app-red/25 rounded-[10px] px-2.5 py-1.5 text-[11px] cursor-pointer text-app-red font-bold">Leave</button>
        </div>
      </div>

      {/* ── Members strip ── */}
      <MembersStrip members={members} currentUserId={userId} />

      {/* ── Sub-tab nav ── */}
      <SubNav active={activePanel} onChange={setActivePanel} />

      {/* ── Challenge banner (chat tab only) ── */}
      {activePanel === 'chat' && showChallenge && challenge && (
        <div className="px-3.5 pt-2.5 flex-shrink-0">
          <ChallengeBanner
            challenge={challenge}
            onSubmit={handleSubmitChallenge}
            onDismiss={() => { setShowChallenge(false); setChallenge(null) }}
          />
        </div>
      )}

      {/* ── Panel content ── */}
      <div className="flex-1 flex flex-col min-h-0">

        {/* CHAT */}
        {activePanel === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto px-3.5 py-3 flex flex-col">
              {messages.length === 0 && (
        <div className="text-center text-app-muted text-[13px] mt-10">
                  <div className="text-[40px] mb-2.5">👋</div>
                  Say hi to your squad!
                </div>
              )}
              {messages.map(m => (
                <Bubble key={m.id} msg={m} isMine={m.user_id === userId && m.msg_type !== 'ai_peer'} memberName={memberMap[m.user_id]?.name} />
              ))}
              <div ref={messagesEnd} />
            </div>
            {showAIPeerBtn && (
              <div className="px-3.5 pt-1.5 flex-shrink-0 text-center">
                <button onClick={invokeAIPeer} disabled={aiPeerLoading}
                  className="bg-app-blue/[0.08] border border-app-blue/25 rounded-[20px] px-4 py-1.5 text-[12px] font-bold cursor-pointer text-app-blue inline-flex items-center gap-1.5">
                  {aiPeerLoading
                    ? <><span className="w-3 h-3 border-2 border-app-blue border-t-transparent rounded-full animate-spin inline-block" /> Gyaani is thinking…</>
                    : '🦉 Ask Gyaani (AI Study Peer)'}
                </button>
                <div className="text-[10.5px] text-app-muted mt-1">Squad's been quiet — Gyaani can spark discussion</div>
              </div>
            )}
            <form onSubmit={sendMessage} className="px-3 pb-3 pt-2.5 border-t border-app-border flex gap-2 flex-shrink-0 bg-app-bg">
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} placeholder="Message your squad…"
                className="flex-1 bg-app-card border border-app-border rounded-[14px] px-3.5 py-2.5 text-app-text text-[14px] outline-none" />
              <button type="submit" disabled={!input.trim() || sending}
                className="border-none rounded-[14px] px-4 text-[18px] font-black flex-shrink-0"
                style={{ background: input.trim() ? `linear-gradient(135deg,#00E5A0,#33cc88)` : '#0b0b1c', color: input.trim() ? '#04040e' : '#6868a0', cursor: input.trim() ? 'pointer' : 'default' }}>➤</button>
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
