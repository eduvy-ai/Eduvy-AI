import { useState, useEffect, useRef, useCallback } from 'react'
import { COLORS } from '../../App.jsx'
import { li } from '../../i18n/index.js'
import {
  apiCreateMuqablaChallenge, apiJoinMuqabalaBattle,
  apiSubmitMuqablaAnswers, apiGetMuqabalaBattle,
  apiGetOpenMuqabalaBattles, apiGetPendingMuqabalaBattles,
  apiGetActiveMuqabalaBattles, apiGetMuqabalaHistory,
  apiGetMuqabalaLeaderboard, apiGetMuqabalaSchoolLeaderboard,
} from '../../api.js'

const SUBJECTS = [
  'Mathematics', 'Science', 'English', 'Social Science', 'Hindi',
  'Physics', 'Chemistry', 'Biology', 'History', 'Geography',
  'Economics', 'Computer', 'Sanskrit',
]

const VIEWS = [
  { key: 'arena',   label: '⚔️ Arena',     title: 'Battle Arena' },
  { key: 'board',   label: '🏆 Rankings',  title: 'Leaderboard'  },
  { key: 'history', label: '📜 History',   title: 'Past Battles' },
]

const DIFF_COLORS = { Easy: COLORS.green, Medium: COLORS.yellow, Hard: COLORS.red }

// ── Helpers ────────────────────────────────────────────────────
function Badge({ text, color }) {
  return (
    <span style={{
      background: `${color}22`, border: `1px solid ${color}44`,
      color, fontSize: 11, borderRadius: 10, padding: '2px 8px', fontWeight: 700,
    }}>{text}</span>
  )
}

function StatusBadge({ status, isChallenger }) {
  const map = {
    open:             { label: '⏳ Open',           color: COLORS.yellow },
    active:           { label: '⚡ Active',          color: COLORS.blue   },
    challenger_done:  { label: isChallenger ? '✅ Waiting for opponent' : '⚡ Your Turn!', color: isChallenger ? COLORS.green : COLORS.orange },
    completed:        { label: '✅ Done',            color: COLORS.green  },
    expired:          { label: '⏰ Expired',         color: COLORS.muted  },
    declined:         { label: '❌ Declined',        color: COLORS.red    },
  }
  const { label = status, color = COLORS.muted } = map[status] || {}
  return <Badge text={label} color={color} />
}

function Avatar({ name = '?', size = 36 }) {
  const bg = `hsl(${((name.charCodeAt(0) || 65) * 37) % 360},55%,38%)`
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 900, color: '#fff',
    }}>{name.charAt(0).toUpperCase()}</div>
  )
}

// ── BattleCard — list view ─────────────────────────────────────
function BattleCard({ battle, onAction, myId }) {
  const isChallenger = battle.challenger_id === myId
  const opponent = isChallenger
    ? (battle.opponent_name || '— waiting —')
    : battle.challenger_name
  const opponentSchool = isChallenger ? battle.opponent_school : battle.challenger_school

  const canJoin     = !isChallenger && battle.status === 'open'
  const myTurn      = !isChallenger && battle.status === 'challenger_done'

  return (
    <div style={{
      background: COLORS.card,
      border: `1px solid ${myTurn ? COLORS.orange + '66' : COLORS.border}`,
      borderRadius: 16, padding: '14px 16px', marginBottom: 10,
      boxShadow: myTurn ? `0 0 16px ${COLORS.orange}22` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <Avatar name={opponent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: COLORS.text, fontSize: 15 }}>
            {isChallenger ? 'vs ' : 'from '}{opponent}
          </div>
          {opponentSchool && (
            <div style={{ color: COLORS.muted, fontSize: 12 }}>{opponentSchool}</div>
          )}
        </div>
        <StatusBadge status={battle.status} isChallenger={isChallenger} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <Badge text={battle.subject} color={COLORS.blue} />
        <Badge text={battle.difficulty} color={DIFF_COLORS[battle.difficulty] || COLORS.muted} />
        <Badge text={`${battle.question_count || 5} Qs`} color={COLORS.muted} />
      </div>

      {battle.status === 'completed' && (
        <div style={{
          background: COLORS.card2, borderRadius: 10, padding: '8px 12px',
          display: 'flex', gap: 16, marginBottom: 10, fontSize: 13,
        }}>
          <span style={{ color: COLORS.text }}>
            You: <strong style={{ color: COLORS.green }}>{isChallenger ? battle.challenger_score : battle.opponent_score}</strong>
          </span>
          <span style={{ color: COLORS.text }}>
            Opp: <strong style={{ color: COLORS.red }}>{isChallenger ? battle.opponent_score : battle.challenger_score}</strong>
          </span>
          <span style={{ color: battle.winner_id === myId ? COLORS.yellow : battle.winner_id === 'draw' ? COLORS.muted : COLORS.red }}>
            {battle.winner_id === myId ? '🏆 You Won!' : battle.winner_id === 'draw' ? '🤝 Draw' : '💀 Lost'}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {(canJoin || myTurn) && (
          <button
            onClick={() => onAction('answer', battle)}
            style={{
              background: `linear-gradient(135deg, ${COLORS.orange}, #ff4e00)`,
              color: '#fff', border: 'none', borderRadius: 12,
              padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >{canJoin ? '⚔️ Accept & Fight!' : '⚔️ Answer Now!'}</button>
        )}
        {(isChallenger && battle.status === 'open' && battle.challenger_score === null) && (
          <button
            onClick={() => onAction('answer', battle)}
            style={{
              background: `${COLORS.blue}22`, border: `1px solid ${COLORS.blue}44`,
              color: COLORS.blue, borderRadius: 12,
              padding: '8px 16px', fontSize: 13, cursor: 'pointer',
            }}
          >▶ Answer First</button>
        )}
        {battle.status === 'completed' && (
          <button
            onClick={() => onAction('results', battle)}
            style={{
              background: COLORS.card2, border: `1px solid ${COLORS.border}`,
              color: COLORS.text, borderRadius: 12,
              padding: '8px 14px', fontSize: 13, cursor: 'pointer',
            }}
          >📊 Results</button>
        )}
      </div>
    </div>
  )
}

// ── Create Challenge Modal ─────────────────────────────────────
function CreateChallengeModal({ profile, onClose, onCreated }) {
  const [subject,    setSubject]    = useState(profile.subjects?.[0] || 'Mathematics')
  const [difficulty, setDifficulty] = useState('Medium')
  const [creating,   setCreating]   = useState(false)
  const [err,        setErr]        = useState('')

  async function handleCreate() {
    setCreating(true); setErr('')
    try {
      const res = await apiCreateMuqablaChallenge({ subject, difficulty })
      onCreated(res.id)
    } catch {
      setErr('Failed to create battle. Try again.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#00000099', zIndex: 200,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: COLORS.card, width: '100%', maxWidth: 520,
        borderRadius: '20px 20px 0 0', padding: '24px 20px 36px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ color: COLORS.text, margin: 0, fontSize: 18 }}>⚔️ New Battle</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: COLORS.muted, fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        <label style={{ color: COLORS.muted, fontSize: 12, display: 'block', marginBottom: 4 }}>SUBJECT</label>
        <select
          value={subject} onChange={e => setSubject(e.target.value)}
          style={{
            width: '100%', marginBottom: 16,
            background: COLORS.card2, border: `1px solid ${COLORS.border}`,
            color: COLORS.text, borderRadius: 10, padding: '10px 12px',
            fontSize: 14, boxSizing: 'border-box',
          }}
        >
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <label style={{ color: COLORS.muted, fontSize: 12, display: 'block', marginBottom: 8 }}>DIFFICULTY</label>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {['Easy', 'Medium', 'Hard'].map(d => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              style={{
                flex: 1, padding: '10px',
                background: difficulty === d ? `${DIFF_COLORS[d]}22` : COLORS.card2,
                border: `2px solid ${difficulty === d ? DIFF_COLORS[d] : COLORS.border}`,
                color: difficulty === d ? DIFF_COLORS[d] : COLORS.muted,
                borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >{d}</button>
          ))}
        </div>

        <div style={{
          background: COLORS.card2, borderRadius: 12, padding: '10px 14px',
          marginBottom: 20, color: COLORS.muted, fontSize: 13,
        }}>
          📋 AI will generate <strong style={{ color: COLORS.text }}>5 questions</strong> for this battle.
          Answer them first, then wait for an opponent to join!
        </div>

        {err && <p style={{ color: COLORS.red, fontSize: 13, marginBottom: 12 }}>{err}</p>}

        <button
          onClick={handleCreate}
          disabled={creating}
          style={{
            width: '100%',
            background: creating ? COLORS.card2 : `linear-gradient(135deg, ${COLORS.orange}, #ff4e00)`,
            color: creating ? COLORS.muted : '#fff',
            border: 'none', borderRadius: 14, padding: '14px',
            fontSize: 16, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer',
          }}
        >{creating ? '✨ Generating Questions…' : '⚔️ Create Battle'}</button>
      </div>
    </div>
  )
}

// ── Quiz Screen (answering questions) ─────────────────────────
function QuizScreen({ battle, onDone, userId }) {
  const [answers,    setAnswers]    = useState([])
  const [current,   setCurrent]    = useState(0)
  const [selected,  setSelected]   = useState(null)
  const [startTime] = useState(Date.now())
  const [submitting, setSubmitting] = useState(false)
  const [result,    setResult]     = useState(null)
  const [err,       setErr]        = useState('')

  const questions = battle.questions || []
  const q = questions[current]

  function handleSelect(idx) {
    if (selected !== null) return
    setSelected(idx)
    const newAns = [...answers, idx]

    setTimeout(() => {
      if (current + 1 < questions.length) {
        setCurrent(c => c + 1)
        setSelected(null)
        setAnswers(newAns)
      } else {
        submitAnswers(newAns)
      }
    }, 500)
  }

  async function submitAnswers(ans) {
    setSubmitting(true); setErr('')
    const timeSec = Math.round((Date.now() - startTime) / 1000)
    try {
      const res = await apiSubmitMuqablaAnswers(battle.id, {
        answers: ans,
        time_seconds: timeSec,
      })
      setResult(res)
    } catch {
      setErr('Could not submit answers. Try again.')
      setSubmitting(false)
    }
  }

  // Results screen
  if (result) {
    const isChallenger = battle.challenger_id === userId
    const myScore  = isChallenger ? result.challenger_score : result.score
    const oppScore = isChallenger ? result.score            : result.challenger_score
    const won   = result.winner_id && result.winner_id !== 'draw' && result.winner_id === userId
    const draw  = result.winner_id === 'draw'
    const waiting = result.status === 'waiting_for_opponent'

    return (
      <div style={{
        position: 'fixed', inset: 0, background: COLORS.bg, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, flexDirection: 'column',
      }}>
        <div style={{
          background: COLORS.card, borderRadius: 24, padding: '32px 24px',
          maxWidth: 420, width: '100%', textAlign: 'center',
        }}>
          {waiting ? (
            <>
              <div style={{ fontSize: 56, marginBottom: 12 }}>⏳</div>
              <h2 style={{ color: COLORS.yellow, marginBottom: 8 }}>Waiting for Opponent!</h2>
              <p style={{ color: COLORS.muted, fontSize: 14 }}>
                Your score: <strong style={{ color: COLORS.green }}>{result.score}/{questions.length}</strong>
                <br />You'll get XP when the battle completes.
              </p>
            </>
          ) : won ? (
            <>
              <div style={{ fontSize: 56, marginBottom: 12 }}>🏆</div>
              <h2 style={{ color: COLORS.yellow, marginBottom: 8 }}>You Won!</h2>
            </>
          ) : draw ? (
            <>
              <div style={{ fontSize: 56, marginBottom: 12 }}>🤝</div>
              <h2 style={{ color: COLORS.blue, marginBottom: 8 }}>Draw!</h2>
            </>
          ) : (
            <>
              <div style={{ fontSize: 56, marginBottom: 12 }}>💪</div>
              <h2 style={{ color: COLORS.text, marginBottom: 8 }}>Good Fight!</h2>
            </>
          )}

          {!waiting && (
            <div style={{
              background: COLORS.card2, borderRadius: 14, padding: 16,
              marginBottom: 20, display: 'flex', justifyContent: 'space-around',
            }}>
              <div>
                <div style={{ color: COLORS.muted, fontSize: 12 }}>Your Score</div>
                <div style={{ color: COLORS.green, fontSize: 22, fontWeight: 800 }}>
                  {myScore ?? result.score}/{result.total || questions.length}
                </div>
              </div>
              <div>
                <div style={{ color: COLORS.muted, fontSize: 12 }}>Opponent</div>
                <div style={{ color: COLORS.red, fontSize: 22, fontWeight: 800 }}>
                  {oppScore ?? result.challenger_score}/{result.total || questions.length}
                </div>
              </div>
              <div>
                <div style={{ color: COLORS.muted, fontSize: 12 }}>XP Earned</div>
                <div style={{ color: COLORS.yellow, fontSize: 22, fontWeight: 800 }}>
                  +{result.xp_earned || 0}
                </div>
              </div>
            </div>
          )}

          {/* Show answers breakdown if available */}
          {result.questions && (
            <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 16, textAlign: 'left' }}>
              {result.questions.map((q, i) => {
                const myAns = (result.answers || [])[i]
                const correct = myAns === q.correct
                return (
                  <div key={i} style={{
                    background: correct ? `${COLORS.green}11` : `${COLORS.red}11`,
                    border: `1px solid ${correct ? COLORS.green : COLORS.red}33`,
                    borderRadius: 10, padding: '8px 10px', marginBottom: 6,
                  }}>
                    <p style={{ color: COLORS.text, fontSize: 12, margin: '0 0 4px' }}>{q.q}</p>
                    <p style={{ color: correct ? COLORS.green : COLORS.red, fontSize: 11, margin: 0 }}>
                      {correct ? '✅' : '❌'} {q.options[myAns]} → ✅ {q.options[q.correct]}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          <button
            onClick={onDone}
            style={{
              width: '100%', background: COLORS.orange, color: '#fff',
              border: 'none', borderRadius: 14, padding: '13px',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >Back to Arena</button>
        </div>
      </div>
    )
  }

  if (submitting) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: COLORS.bg, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <p style={{ color: COLORS.text, fontSize: 16 }}>Submitting your answers…</p>
        {err && <p style={{ color: COLORS.red, fontSize: 14 }}>{err}</p>}
      </div>
    )
  }

  // Question screen
  const progress = ((current) / questions.length) * 100
  return (
    <div style={{
      position: 'fixed', inset: 0, background: COLORS.bg, zIndex: 100,
      display: 'flex', flexDirection: 'column', padding: '20px 16px',
      maxWidth: 600, margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: COLORS.muted, fontSize: 13 }}>
            Question {current + 1} of {questions.length}
          </span>
          <span style={{ color: COLORS.orange, fontWeight: 700, fontSize: 13 }}>
            ⚔️ {battle.subject} — {battle.difficulty}
          </span>
        </div>
        {/* Progress bar */}
        <div style={{ background: COLORS.card2, borderRadius: 4, height: 4 }}>
          <div style={{
            background: COLORS.orange, height: 4, borderRadius: 4,
            width: `${progress}%`, transition: 'width .3s',
          }} />
        </div>
      </div>

      {/* Question */}
      <div style={{
        background: COLORS.card, borderRadius: 16, padding: '20px 18px',
        marginBottom: 20, flex: 0,
      }}>
        <p style={{ color: COLORS.text, fontSize: 16, margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
          {q?.q}
        </p>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(q?.options || []).map((opt, idx) => {
          const sel = selected === idx
          const bg  = sel ? `${COLORS.orange}33` : COLORS.card
          const brd = sel ? COLORS.orange : COLORS.border
          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              style={{
                background: bg, border: `2px solid ${brd}`,
                borderRadius: 14, padding: '14px 16px',
                color: COLORS.text, fontSize: 14, textAlign: 'left',
                cursor: 'pointer', transition: 'all .12s',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: sel ? COLORS.orange : COLORS.card2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: sel ? '#fff' : COLORS.muted,
                flexShrink: 0,
              }}>{String.fromCharCode(65 + idx)}</span>
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Leaderboard view ───────────────────────────────────────────
function LeaderboardView({ myId }) {
  const [tab,     setTab]    = useState('students')
  const [students, setStudents] = useState([])
  const [schools,  setSchools]  = useState([])
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    setLoading(true)
    if (tab === 'students') {
      apiGetMuqabalaLeaderboard()
        .then(r => setStudents(r.leaderboard || []))
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      apiGetMuqabalaSchoolLeaderboard()
        .then(r => setSchools(r.schools || []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [tab])

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['students','schools'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '7px 18px', borderRadius: 20,
              border: `1px solid ${tab === t ? COLORS.yellow : COLORS.border}`,
              background: tab === t ? `${COLORS.yellow}22` : COLORS.card2,
              color: tab === t ? COLORS.yellow : COLORS.muted,
              fontSize: 13, cursor: 'pointer', textTransform: 'capitalize',
            }}
          >{t === 'students' ? '👤 Students' : '🏫 Schools'}</button>
        ))}
      </div>

      {loading && <p style={{ color: COLORS.muted, textAlign: 'center', padding: 24 }}>Loading…</p>}

      {tab === 'students' && !loading && (
        students.length === 0
          ? <EmptyMsg icon="🏆" text="No battles this week yet. Be the first!" />
          : students.map(s => (
            <div key={s.id} style={{
              background: s.is_me ? `${COLORS.yellow}11` : COLORS.card,
              border: `1px solid ${s.is_me ? COLORS.yellow + '55' : COLORS.border}`,
              borderRadius: 14, padding: '12px 16px', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{
                fontSize: 18, minWidth: 30, textAlign: 'center',
                color: s.rank === 1 ? COLORS.yellow : s.rank === 2 ? '#aaa' : s.rank === 3 ? '#cd7f32' : COLORS.muted,
              }}>
                {s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : `#${s.rank}`}
              </span>
              <Avatar name={s.name} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: s.is_me ? COLORS.yellow : COLORS.text, fontSize: 14 }}>
                  {s.name} {s.is_me && '(You)'}
                </div>
                <div style={{ color: COLORS.muted, fontSize: 11 }}>
                  {s.standard} {s.school ? `· ${s.school}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: COLORS.green, fontWeight: 800, fontSize: 16 }}>{s.wins} wins</div>
                <div style={{ color: COLORS.muted, fontSize: 11 }}>{s.total_battles} battles</div>
              </div>
            </div>
          ))
      )}

      {tab === 'schools' && !loading && (
        schools.length === 0
          ? <EmptyMsg icon="🏫" text="Add your school name in Settings to join the school leaderboard!" />
          : schools.map(s => (
            <div key={s.school} style={{
              background: s.is_mine ? `${COLORS.blue}11` : COLORS.card,
              border: `1px solid ${s.is_mine ? COLORS.blue + '55' : COLORS.border}`,
              borderRadius: 14, padding: '12px 16px', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{
                fontSize: 20, minWidth: 30, textAlign: 'center',
                color: s.rank === 1 ? COLORS.yellow : s.rank === 2 ? '#aaa' : s.rank === 3 ? '#cd7f32' : COLORS.muted,
              }}>
                {s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : `#${s.rank}`}
              </span>
              <div style={{ fontSize: 28 }}>🏫</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: s.is_mine ? COLORS.blue : COLORS.text, fontSize: 14 }}>
                  {s.school} {s.is_mine && '(Yours)'}
                </div>
                <div style={{ color: COLORS.muted, fontSize: 11 }}>{s.member_count} students</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: COLORS.green, fontWeight: 800, fontSize: 16 }}>{s.total_wins || 0} wins</div>
                <div style={{ color: COLORS.muted, fontSize: 11 }}>XP {s.total_xp || 0}</div>
              </div>
            </div>
          ))
      )}
    </div>
  )
}

function EmptyMsg({ icon, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 10 }}>{icon}</div>
      <p style={{ color: COLORS.muted, fontSize: 14 }}>{text}</p>
    </div>
  )
}

// ── Main Tab ───────────────────────────────────────────────────
export default function MuqablaTab({ profile, userId }) {
  const [view,      setView]      = useState('arena')
  const [openBattles, setOpen]    = useState([])
  const [pending,   setPending]   = useState([])
  const [active,    setActive]    = useState([])
  const [history,   setHistory]   = useState([])
  const [loading,   setLoading]   = useState(false)
  const [err,       setErr]       = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [quizBattle, setQuizBattle] = useState(null) // battle to answer

  const myId = userId

  // ── Load arena data ──────────────────────────────────────────
  const loadArena = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const [openR, pendR, actR] = await Promise.all([
        apiGetOpenMuqabalaBattles(),
        apiGetPendingMuqabalaBattles(),
        apiGetActiveMuqabalaBattles(),
      ])
      setOpen(openR.battles || [])
      setPending(pendR.battles || [])
      setActive(actR.battles || [])
    } catch {
      setErr('Could not load battles.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const r = await apiGetMuqabalaHistory()
      setHistory(r.battles || [])
    } catch {
      setErr('Could not load history.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (view === 'arena')   loadArena()
    if (view === 'history') loadHistory()
  }, [view]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ──────────────────────────────────────────────────
  async function handleAction(type, battle) {
    if (type === 'answer') {
      // Need full battle with questions
      try {
        setLoading(true)
        let fullBattle = battle
        if (!battle.questions || battle.questions.length === 0) {
          // Open battle: join first
          if (!battle.is_challenger && battle.status === 'open') {
            const joined = await apiJoinMuqabalaBattle(battle.id)
            fullBattle = { ...battle, ...joined, id: battle.id }
          } else {
            const detail = await apiGetMuqabalaBattle(battle.id)
            fullBattle = detail
          }
        }
        setQuizBattle(fullBattle)
      } catch {
        setErr('Could not load battle questions.')
      } finally {
        setLoading(false)
      }
    }
    if (type === 'results') {
      try {
        const detail = await apiGetMuqabalaBattle(battle.id)
        setQuizBattle({ ...detail, showResultsOnly: true })
      } catch {}
    }
  }

  async function onChallengeCreated(battleId) {
    setShowCreate(false)
    // Load the new battle so user can answer it
    try {
      const detail = await apiGetMuqabalaBattle(battleId)
      setQuizBattle(detail)
    } catch {
      loadArena()
    }
  }

  function onQuizDone() {
    setQuizBattle(null)
    loadArena()
  }

  // ── Render ───────────────────────────────────────────────────
  const pendingCount = pending.length

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px 16px 80px', maxWidth: 700, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ color: COLORS.text, margin: 0, fontSize: 22, fontWeight: 800 }}>⚔️ Muqabla</h1>
          <p style={{ color: COLORS.muted, fontSize: 13, margin: '4px 0 0' }}>
            Student vs Student Battles
          </p>
        </div>
        {view === 'arena' && (
          <button
            onClick={() => setShowCreate(true)}
            style={{
              background: `linear-gradient(135deg, ${COLORS.orange}, #ff4e00)`,
              color: '#fff', border: 'none', borderRadius: 14,
              padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              boxShadow: `0 4px 20px ${COLORS.orange}44`,
            }}
          >+ Battle</button>
        )}
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {VIEWS.map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            style={{
              padding: '7px 14px', borderRadius: 20,
              border: `1px solid ${view === v.key ? COLORS.orange : COLORS.border}`,
              background: view === v.key ? `${COLORS.orange}22` : COLORS.card2,
              color: view === v.key ? COLORS.orange : COLORS.muted,
              fontSize: 13, cursor: 'pointer', position: 'relative',
            }}
          >
            {v.label}
            {v.key === 'arena' && pendingCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: COLORS.red, color: '#fff',
                borderRadius: '50%', width: 16, height: 16,
                fontSize: 10, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {err && (
        <div style={{
          background: `${COLORS.red}15`, border: `1px solid ${COLORS.red}33`,
          borderRadius: 12, padding: '10px 14px', marginBottom: 12,
          color: COLORS.red, fontSize: 13,
        }}>{err}</div>
      )}

      {loading && <p style={{ color: COLORS.muted, textAlign: 'center', padding: 24 }}>Loading…</p>}

      {/* ── Arena ── */}
      {view === 'arena' && !loading && (
        <>
          {/* Pending — urgent */}
          {pending.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ color: COLORS.orange, fontSize: 14, marginBottom: 10 }}>
                🔥 Your Turn! ({pending.length})
              </h3>
              {pending.map(b => (
                <BattleCard key={b.id} battle={b} onAction={handleAction} myId={myId} />
              ))}
            </div>
          )}

          {/* My active battles */}
          {active.filter(b => b.is_challenger && b.status === 'open' && b.challenger_score === null).length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ color: COLORS.yellow, fontSize: 14, marginBottom: 10 }}>▶ Answer First</h3>
              {active
                .filter(b => b.is_challenger && b.status === 'open' && b.challenger_score === null)
                .map(b => (
                  <BattleCard key={b.id} battle={b} onAction={handleAction} myId={myId} />
                ))
              }
            </div>
          )}

          {/* Waiting for opponent */}
          {active.filter(b => b.is_challenger && ['active','challenger_done'].includes(b.status)).length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ color: COLORS.muted, fontSize: 14, marginBottom: 10 }}>⏳ Waiting for Opponent</h3>
              {active
                .filter(b => b.is_challenger && ['active','challenger_done'].includes(b.status))
                .map(b => (
                  <BattleCard key={b.id} battle={b} onAction={handleAction} myId={myId} />
                ))
              }
            </div>
          )}

          {/* Open battles to join */}
          {openBattles.length > 0 && (
            <div>
              <h3 style={{ color: COLORS.blue, fontSize: 14, marginBottom: 10 }}>
                🌐 Open Challenges ({openBattles.length})
              </h3>
              {openBattles.map(b => (
                <BattleCard key={b.id} battle={b} onAction={handleAction} myId={myId} />
              ))}
            </div>
          )}

          {pending.length === 0 && active.length === 0 && openBattles.length === 0 && (
            <EmptyMsg icon="⚔️" text="No battles yet. Create one and challenge the arena!" />
          )}

          {!profile.school && (
            <div style={{
              background: `${COLORS.blue}11`, border: `1px solid ${COLORS.blue}33`,
              borderRadius: 14, padding: '12px 16px', marginTop: 20,
              color: COLORS.muted, fontSize: 13,
            }}>
              🏫 Add your school name in <strong style={{ color: COLORS.blue }}>Settings → Profile</strong> to join the School Leaderboard!
            </div>
          )}
        </>
      )}

      {/* ── Leaderboard ── */}
      {view === 'board' && !loading && (
        <LeaderboardView myId={myId} />
      )}

      {/* ── History ── */}
      {view === 'history' && !loading && (
        history.length === 0
          ? <EmptyMsg icon="📜" text="No completed battles yet." />
          : history.map(b => (
            <BattleCard key={b.id} battle={b} onAction={handleAction} myId={myId} />
          ))
      )}

      {/* ── Modals ── */}
      {showCreate && (
        <CreateChallengeModal
          profile={profile}
          onClose={() => setShowCreate(false)}
          onCreated={onChallengeCreated}
        />
      )}

      {quizBattle && !quizBattle.showResultsOnly && (
        <QuizScreen battle={quizBattle} onDone={onQuizDone} userId={myId} />
      )}

      {/* Results overlay for already-completed battles */}
      {quizBattle?.showResultsOnly && (
        <div style={{
          position: 'fixed', inset: 0, background: COLORS.bg, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, flexDirection: 'column',
        }}>
          <div style={{
            background: COLORS.card, borderRadius: 24, padding: '32px 24px',
            maxWidth: 420, width: '100%', textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {quizBattle.winner_id === myId ? '🏆' : quizBattle.winner_id === 'draw' ? '🤝' : '💪'}
            </div>
            <h2 style={{ color: quizBattle.winner_id === myId ? COLORS.yellow : quizBattle.winner_id === 'draw' ? COLORS.blue : COLORS.text, marginBottom: 16 }}>
              {quizBattle.winner_id === myId ? 'You Won!' : quizBattle.winner_id === 'draw' ? 'Draw!' : quizBattle.status === 'waiting_for_opponent' ? 'Waiting for Opponent' : 'Good Fight!'}
            </h2>
            <div style={{ background: COLORS.card2, borderRadius: 14, padding: 16, marginBottom: 20, display: 'flex', justifyContent: 'space-around' }}>
              <div>
                <div style={{ color: COLORS.muted, fontSize: 12 }}>Your Score</div>
                <div style={{ color: COLORS.green, fontSize: 22, fontWeight: 800 }}>
                  {quizBattle.challenger_id === myId ? quizBattle.challenger_score : quizBattle.opponent_score ?? '?'}/{quizBattle.total_questions ?? '?'}
                </div>
              </div>
              <div>
                <div style={{ color: COLORS.muted, fontSize: 12 }}>Opponent</div>
                <div style={{ color: COLORS.red, fontSize: 22, fontWeight: 800 }}>
                  {quizBattle.challenger_id === myId ? quizBattle.opponent_score ?? '?' : quizBattle.challenger_score ?? '?'}/{quizBattle.total_questions ?? '?'}
                </div>
              </div>
            </div>
            <button onClick={() => { setQuizBattle(null) }} style={{
              width: '100%', background: COLORS.orange, color: '#fff',
              border: 'none', borderRadius: 14, padding: '13px',
              fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Sora, sans-serif',
            }}>Back to Arena</button>
          </div>
        </div>
      )}
    </div>
  )
}
