import { useState, useEffect, useRef, useCallback } from 'react'
import { li } from '../../i18n/index.js'
import { getDisplayLang } from '../../shared.js'
import { Sword, Trophy, Scroll, Hourglass, Handshake, Barbell, CheckCircle, XCircle, Lightning, Buildings, Medal } from '@phosphor-icons/react'
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

const VIEW_ICONS = { arena: Sword, board: Trophy, history: Scroll }
const getViews = (ui) => [
  { key: 'arena',   label: ui.arenaSubTab || 'Arena',     title: ui.battleArena },
  { key: 'board',   label: ui.rankingsSubTab || 'Rankings',  title: ui.leaderboard  },
  { key: 'history', label: ui.historySubTab || 'History',   title: ui.couldNotLoadHistory },
]

const DIFF_COLORS = { Easy: '#00E5A0', Medium: '#FFD166', Hard: '#FF6B6B' }

// ── Helpers ────────────────────────────────────────────────────
function Badge({ text, color }) {
  return (
    <span style={{
      background: `${color}22`, border: `1px solid ${color}44`,
      color, fontSize: 11, borderRadius: 10, padding: '2px 8px', fontWeight: 700,
    }}>{text}</span>
  )
}

function StatusBadge({ status, isChallenger, ui }) {
  const map = {
    open:             { label: ui.statusOpen,       color: '#FFD166' },
    active:           { label: ui.statusActive,     color: '#7B9CFF'   },
    challenger_done:  { label: isChallenger ? ui.statusWaitingOpponent : ui.statusYourTurn, color: isChallenger ? '#00E5A0' : '#FF6B35' },
    completed:        { label: ui.statusDone,        color: '#00E5A0'  },
    expired:          { label: ui.statusExpired,     color: '#6868a0'  },
    declined:         { label: ui.statusDeclined,    color: '#FF6B6B'    },
  }
  const { label = status, color = '#6868a0' } = map[status] || {}
  return <Badge text={label} color={color} />
}

function Avatar({ name = '?', size = 36 }) {
  const safeName = name || '?'
  const bg = `hsl(${((safeName.charCodeAt(0) || 65) * 37) % 360},55%,38%)`
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 900, color: '#fff',
    }}>{safeName.charAt(0).toUpperCase()}</div>
  )
}

// ── BattleCard — list view ─────────────────────────────────────
function BattleCard({ battle, onAction, myId, ui }) {
  const isChallenger = battle.challenger_id === myId
  const opponent = isChallenger
    ? (battle.opponent_name || '— waiting —')
    : (battle.challenger_name || '?')
  const opponentSchool = isChallenger ? battle.opponent_school : battle.challenger_school

  const canJoin     = !isChallenger && battle.status === 'open'
  const myTurn      = !isChallenger && battle.status === 'challenger_done'

  return (
    <div className={`bg-app-card border rounded-2xl px-4 py-3.5 mb-2.5 ${myTurn ? 'border-app-orange/40 shadow-[0_0_16px_rgba(255,107,53,0.13)]' : 'border-app-border'}`}>
      <div className="flex items-center gap-3 mb-2.5">
        <Avatar name={opponent} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-app-text text-[15px]">{isChallenger ? ui.vs : ui.from}{opponent}</div>
          {opponentSchool && <div className="text-app-muted text-[12px]">{opponentSchool}</div>}
        </div>
        <StatusBadge status={battle.status} isChallenger={isChallenger} ui={ui} />
      </div>

      <div className="flex gap-2 flex-wrap mb-2.5">
        <Badge text={battle.subject} color="#7B9CFF" />
        <Badge text={battle.difficulty} color={DIFF_COLORS[battle.difficulty] || '#6868a0'} />
        <Badge text={`${battle.question_count || 5} Qs`} color="#6868a0" />
      </div>

      {battle.status === 'completed' && (
        <div className="bg-app-card2 rounded-xl px-3 py-2 flex gap-4 mb-2.5 text-[13px]">
          <span className="text-app-text">{ui.youLabel}<strong className="text-app-green">{isChallenger ? battle.challenger_score : battle.opponent_score}</strong></span>
          <span className="text-app-text">{ui.oppLabel}<strong className="text-app-red">{isChallenger ? battle.opponent_score : battle.challenger_score}</strong></span>
          <span style={{ color: battle.winner_id === myId ? '#FFD166' : battle.winner_id === 'draw' ? '#6868a0' : '#FF6B6B' }}>
            {battle.winner_id === myId ? ui.youWonShort : battle.winner_id === 'draw' ? ui.drawResult : ui.lost}
          </span>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        {(canJoin || myTurn) && (
          <button onClick={() => onAction('answer', battle)}
            className="bg-gradient-to-br from-app-orange to-[#ff4e00] text-white border-none rounded-xl px-4 py-2 text-[13px] font-extrabold cursor-pointer active:scale-95 transition-all">
            {canJoin ? ui.acceptFight : ui.answerNow}
          </button>
        )}
        {(isChallenger && battle.status === 'open' && battle.challenger_score === null) && (
          <button onClick={() => onAction('answer', battle)}
            className="bg-app-blue/15 border border-app-blue/30 text-app-blue rounded-xl px-4 py-2 text-[13px] cursor-pointer active:scale-95 transition-all">
            {ui.answerFirst}
          </button>
        )}
        {battle.status === 'completed' && (
          <button onClick={() => onAction('results', battle)}
            className="bg-app-card2 border border-app-border text-app-text rounded-xl px-3.5 py-2 text-[13px] cursor-pointer active:scale-95 transition-all">
            {ui.resultsBtn}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Create Challenge Modal ─────────────────────────────────────
function CreateChallengeModal({ profile, onClose, onCreated, ui }) {
  const [subject,    setSubject]    = useState(profile?.subjects?.[0] || 'Mathematics')
  const [difficulty, setDifficulty] = useState('Medium')
  const [creating,   setCreating]   = useState(false)
  const [err,        setErr]        = useState('')

  async function handleCreate() {
    setCreating(true); setErr('')
    try {
      const res = await apiCreateMuqablaChallenge({ subject, difficulty })
      onCreated(res.id)
    } catch {
      setErr(ui.failedCreateBattle)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-end justify-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-app-card w-full max-w-[520px] rounded-t-[20px] px-5 pt-6 pb-9">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-app-text m-0 text-lg font-extrabold">{ui.newBattleTitle}</h2>
          <button onClick={onClose} className="bg-transparent border-none text-app-muted text-2xl cursor-pointer hover:text-app-text">×</button>
        </div>

        <label className="text-app-muted text-[12px] block mb-1">{ui.subjectLabel}</label>
        <select value={subject} onChange={e => setSubject(e.target.value)}
          className="w-full mb-4 bg-app-card2 border border-app-border text-app-text rounded-xl px-3 py-2.5 text-sm box-border outline-none cursor-pointer">
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <label className="text-app-muted text-[12px] block mb-2">{ui.difficultyLabel}</label>
        <div className="flex gap-2.5 mb-5">
          {['Easy', 'Medium', 'Hard'].map(d => (
            <button key={d} onClick={() => setDifficulty(d)}
              style={{
                flex: 1, padding: '10px',
                background: difficulty === d ? `${DIFF_COLORS[d]}22` : '#101022',
                border: `2px solid ${difficulty === d ? DIFF_COLORS[d] : 'rgba(255,255,255,0.03)'}`,
                color: difficulty === d ? DIFF_COLORS[d] : '#6868a0',
                borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >{d}</button>
          ))}
        </div>

        <div className="bg-app-card2 rounded-xl px-3.5 py-2.5 mb-5 text-app-muted text-[13px]" dangerouslySetInnerHTML={{ __html: ui.aiBattleInfo }} />

        {err && <p className="text-app-red text-[13px] mb-3">{err}</p>}

        <button onClick={handleCreate} disabled={creating}
          className={`w-full border-none rounded-2xl py-3.5 text-base font-extrabold cursor-pointer disabled:opacity-60 active:scale-[0.99] transition-all ${creating ? 'bg-app-card2 text-app-muted cursor-not-allowed' : 'bg-gradient-to-br from-app-orange to-[#ff4e00] text-white'}`}>
          {creating ? ui.generatingQuestions : ui.createBattle}
        </button>
      </div>
    </div>
  )
}

// ── Quiz Screen (answering questions) ─────────────────────────
function QuizScreen({ battle, onDone, userId, ui }) {
  const [answers,    setAnswers]    = useState([])
  const [current,   setCurrent]    = useState(0)
  const [selected,  setSelected]   = useState(null)
  const [startTime] = useState(Date.now())
  const [submitting, setSubmitting] = useState(false)
  const [result,    setResult]     = useState(null)
  const [err,       setErr]        = useState('')
  const timerRef = useRef(null)

  const questions = battle.questions || []
  const q = questions[current]

  // Cleanup timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  // Guard: no questions available — show fallback instead of blank screen
  if (questions.length === 0 && !result && !submitting) {
    return (
      <div className="fixed inset-0 bg-app-bg z-[200] flex items-center justify-center flex-col p-5">
        <Sword size={48} weight="duotone" className="text-app-muted mb-4" />
        <p className="text-app-text text-base mb-2">{ui.couldNotLoadQuestions || 'Could not load questions'}</p>
        <p className="text-app-muted text-sm mb-5">{ui.tryAgainLater || 'Please try again later.'}</p>
        <button onClick={onDone}
          className="bg-app-orange text-white border-none rounded-2xl px-6 py-3 text-[15px] font-extrabold cursor-pointer active:scale-[0.99] transition-all">
          {ui.backToArena}
        </button>
      </div>
    )
  }

  function handleSelect(idx) {
    if (selected !== null) return
    setSelected(idx)
    const newAns = [...answers, idx]

    timerRef.current = setTimeout(() => {
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
      if (!res) {
        setErr(ui.couldNotSubmit || 'Could not submit answers')
        return
      }
      setResult(res)
    } catch {
      setErr(ui.couldNotSubmit)
    } finally {
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

    // Helper to render question review
    const renderQuestionReview = () => (
      result.questions && result.questions.length > 0 && (
        <div className="max-h-[280px] overflow-y-auto mb-4 text-left">
          <h4 className="text-app-muted text-[12px] mb-2 text-center">{ui.reviewAnswers || 'Review Your Answers'}</h4>
          {result.questions.map((q, i) => {
            const myAns = (result.answers || [])[i]
            const correct = myAns === q.correct
            return (
              <div key={i} className={`border rounded-xl px-3 py-2.5 mb-2 ${correct ? 'bg-app-green/5 border-app-green/25' : 'bg-app-red/5 border-app-red/25'}`}>
                <p className="text-app-text text-[13px] m-0 mb-1.5 font-medium">{q.q}</p>
                <div className={`text-[12px] mb-1.5 flex items-center gap-1.5 flex-wrap ${correct ? 'text-app-green' : 'text-app-red'}`}>
                  {correct ? <CheckCircle size={14} weight="fill" /> : <XCircle size={14} weight="fill" />}
                  <span>{ui.yourAnswerLabel || 'You:'} <strong>{q.options[myAns]}</strong></span>
                  {!correct && (
                    <span className="text-app-green flex items-center gap-1">
                      → <CheckCircle size={12} weight="fill" /> <strong>{q.options[q.correct]}</strong>
                    </span>
                  )}
                </div>
                {q.explanation && (
                  <p className="text-app-muted text-[11px] m-0 leading-relaxed bg-app-card2 rounded-lg px-2.5 py-1.5">
                    💡 {q.explanation}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )
    )

    return (
      <div className="fixed inset-0 bg-app-bg z-[200] flex items-center justify-center p-5 flex-col overflow-y-auto">
        <div className="bg-app-card rounded-3xl px-6 py-8 max-w-[420px] w-full text-center">
          {waiting ? (
            <>
              <div className="mb-3 flex justify-center"><Hourglass size={56} weight="duotone" className="text-app-yellow" /></div>
              <h2 className="text-app-yellow mb-2">{ui.waitingOpponentResult}</h2>
              <p className="text-app-muted text-sm mb-4">
                {ui.yourScore}: <strong className="text-app-green">{result.score}/{result.total || questions.length}</strong>
                <br />{ui.waitingXpNote}
              </p>
              {renderQuestionReview()}
            </>
          ) : won ? (
            <>
              <div className="mb-3 flex justify-center"><Trophy size={56} weight="duotone" className="text-app-yellow" /></div>
              <h2 className="text-app-yellow mb-2">{ui.youWonShort}</h2>
            </>
          ) : draw ? (
            <>
              <div className="mb-3 flex justify-center"><Handshake size={56} weight="duotone" className="text-app-blue" /></div>
              <h2 className="text-app-blue mb-2">{ui.drawResult}!</h2>
            </>
          ) : (
            <>
              <div className="mb-3 flex justify-center"><Barbell size={56} weight="duotone" className="text-app-text" /></div>
              <h2 className="text-app-text mb-2">{ui.goodFight}</h2>
            </>
          )}

          {!waiting && (
            <div className="bg-app-card2 rounded-2xl p-4 mb-5 flex justify-around">
              <div>
                <div className="text-app-muted text-[12px]">Your Score</div>
                <div className="text-app-green text-[22px] font-extrabold">{myScore ?? result.score}/{result.total || questions.length}</div>
              </div>
              <div>
                <div className="text-app-muted text-[12px]">Opponent</div>
                <div className="text-app-red text-[22px] font-extrabold">{oppScore ?? result.challenger_score}/{result.total || questions.length}</div>
              </div>
              <div>
                <div className="text-app-muted text-[12px]">{ui.xpEarned}</div>
                <div className="text-app-yellow text-[22px] font-extrabold">+{result.xp_earned || 0}</div>
              </div>
            </div>
          )}

          {result.questions && (
            renderQuestionReview()
          )}

          <button onClick={onDone}
            className="w-full bg-app-orange text-white border-none rounded-2xl py-3 text-[15px] font-extrabold cursor-pointer active:scale-[0.99] transition-all">
            {ui.backToArena}
          </button>
        </div>
      </div>
    )
  }

  if (submitting) {
    return (
      <div className="fixed inset-0 bg-app-bg z-[200] flex items-center justify-center flex-col">
        <div className="mb-4 flex justify-center"><Lightning size={48} weight="duotone" className="text-app-orange" /></div>
        <p className="text-app-text text-base">{ui.submittingAnswers}</p>
        {err && <p className="text-app-red text-sm">{err}</p>}
      </div>
    )
  }

  // Question screen
  const progress = ((current) / questions.length) * 100
  return (
    <div className="fixed inset-0 bg-app-bg z-[200] flex flex-col px-4 py-5 max-w-[600px] mx-auto overflow-y-auto">
      {/* Header */}
      <div className="mb-5">
        <div className="flex justify-between mb-2">
          <span className="text-app-muted text-[13px]">{ui.questionOf.replace('{current}', current + 1).replace('{total}', questions.length)}</span>
          <span className="text-app-orange font-bold text-[13px] flex items-center gap-1"><Sword size={13} weight="fill" /> {battle.subject} — {battle.difficulty}</span>
        </div>
        <div className="bg-app-card2 rounded h-1">
          <div className="bg-app-orange h-1 rounded transition-[width_.3s]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="bg-app-card rounded-2xl px-4 py-5 mb-5 flex-none">
        <p className="text-app-text text-base m-0 leading-relaxed font-semibold">{q?.q}</p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2.5">
        {(q?.options || []).map((opt, idx) => {
          const sel = selected === idx
          return (
            <button key={idx} onClick={() => handleSelect(idx)}
              className={`border-2 rounded-2xl px-4 py-3.5 text-app-text text-sm text-left cursor-pointer flex items-center gap-2.5 transition-all ${sel ? 'bg-app-orange/20 border-app-orange' : 'bg-app-card border-app-border hover:bg-white/[0.03]'}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 ${sel ? 'bg-app-orange text-white' : 'bg-app-card2 text-app-muted'}`}>
                {String.fromCharCode(65 + idx)}
              </span>
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Leaderboard view ───────────────────────────────────────────
function LeaderboardView({ myId, ui }) {
  const [tab,     setTab]    = useState('students')
  const [students, setStudents] = useState([])
  const [schools,  setSchools]  = useState([])
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    if (tab === 'students') {
      apiGetMuqabalaLeaderboard()
        .then(r => { if (!cancelled) setStudents(r?.leaderboard || []) })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false) })
    } else {
      apiGetMuqabalaSchoolLeaderboard()
        .then(r => { if (!cancelled) setSchools(r?.schools || []) })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false) })
    }
    return () => { cancelled = true }
  }, [tab])

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['students','schools'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full border text-[13px] cursor-pointer capitalize transition-all ${tab === t ? 'bg-app-yellow/15 border-app-yellow text-app-yellow' : 'bg-app-card2 border-app-border text-app-muted hover:bg-white/[0.03]'}`}>
            {t === 'students' ? ui.studentsTab : ui.schoolsTab}
          </button>
        ))}
      </div>

      {loading && <p className="text-app-muted text-center py-6">{ui.loading}</p>}

      {tab === 'students' && !loading && (
        students.length === 0
          ? <EmptyMsg icon={Trophy} text={ui.noBattlesWeek} />
          : students.map(s => (
            <div key={s.id} className={`border rounded-2xl px-4 py-3 mb-2 flex items-center gap-3 ${s.is_me ? 'bg-app-yellow/5 border-app-yellow/35' : 'bg-app-card border-app-border'}`}>
              <span className="text-lg min-w-[30px] text-center" style={{ color: s.rank === 1 ? '#FFD166' : s.rank === 2 ? '#aaa' : s.rank === 3 ? '#cd7f32' : '#6868a0' }}>
                {s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : `#${s.rank}`}
              </span>
              <Avatar name={s.name} size={36} />
              <div className="flex-1">
                <div className={`font-bold text-sm ${s.is_me ? 'text-app-yellow' : 'text-app-text'}`}>{s.name} {s.is_me && ui.youBracket}</div>
                <div className="text-app-muted text-[11px]">{s.standard} {s.school ? `· ${s.school}` : ''}</div>
              </div>
              <div className="text-right">
                <div className="text-app-green font-extrabold text-base">{s.wins} {ui.wins}</div>
                <div className="text-app-muted text-[11px]">{s.total_battles} {ui.battles}</div>
              </div>
            </div>
          ))
      )}

      {tab === 'schools' && !loading && (
        schools.length === 0
          ? <EmptyMsg icon={Buildings} text={ui.addSchoolLeaderboard} />
          : schools.map(s => (
            <div key={s.school} className={`border rounded-2xl px-4 py-3 mb-2 flex items-center gap-3 ${s.is_mine ? 'bg-app-blue/5 border-app-blue/35' : 'bg-app-card border-app-border'}`}>
              <span className="text-xl min-w-[30px] text-center" style={{ color: s.rank === 1 ? '#FFD166' : s.rank === 2 ? '#aaa' : s.rank === 3 ? '#cd7f32' : '#6868a0' }}>
                {s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : `#${s.rank}`}
              </span>
              <div className="flex justify-center"><Buildings size={28} weight="duotone" className="text-app-blue" /></div>
              <div className="flex-1">
                <div className={`font-bold text-sm ${s.is_mine ? 'text-app-blue' : 'text-app-text'}`}>{s.school} {s.is_mine && ui.yoursBracket}</div>
                <div className="text-app-muted text-[11px]">{s.member_count} {ui.studentsCount}</div>
              </div>
              <div className="text-right">
                <div className="text-app-green font-extrabold text-base">{s.total_wins || 0} {ui.wins}</div>
                <div className="text-app-muted text-[11px]">XP {s.total_xp || 0}</div>
              </div>
            </div>
          ))
      )}
    </div>
  )
}

function EmptyMsg({ icon, text }) {
  // Phosphor icons are forwardRef objects (typeof === 'object'), not plain functions
  const Icon = (typeof icon === 'function' || (icon && icon.$$typeof)) ? icon : null
  return (
    <div className="text-center py-10 px-5">
      <div className="mb-2.5 flex justify-center">{Icon ? <Icon size={48} weight="duotone" className="text-app-muted" /> : <span className="text-[48px]">{icon}</span>}</div>
      <p className="text-app-muted text-sm">{text}</p>
    </div>
  )
}

// ── Main Tab ───────────────────────────────────────────────────
export default function MuqablaTab({ profile, userId }) {
  const ui = li(getDisplayLang(profile))
  const VIEWS = getViews(ui)
  const [view,      setView]      = useState('arena')
  const [openBattles, setOpen]    = useState([])
  const [pending,   setPending]   = useState([])
  const [active,    setActive]    = useState([])
  const [history,   setHistory]   = useState([])
  const [loading,   setLoading]   = useState(true)
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
      setOpen(openR?.battles || [])
      setPending((pendR?.battles || []).map(b => ({ ...b, is_challenger: b.challenger_id === userId, question_count: b.question_count || 5 })))
      setActive((actR?.battles || []).map(b => ({ ...b, is_challenger: b.challenger_id === userId, question_count: b.question_count || 5 })))
    } catch (e) {
      console.error('loadArena error:', e)
      setErr('Could not load battles. Pull down to retry.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const r = await apiGetMuqabalaHistory()
      setHistory(r?.battles || [])
    } catch (e) {
      console.error('loadHistory error:', e)
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
            if (!detail) {
              setErr(ui.couldNotLoadQuestions || 'Could not load questions for this battle')
              return
            }
            fullBattle = detail
          }
        }
        // Only open quiz if we actually got questions
        if (!fullBattle.questions || fullBattle.questions.length === 0) {
          setErr(ui.couldNotLoadQuestions || 'Could not load questions for this battle')
        } else {
          setQuizBattle(fullBattle)
        }
      } catch {
        setErr(ui.couldNotLoadQuestions)
      } finally {
        setLoading(false)
      }
    }
    if (type === 'results') {
      try {
        const detail = await apiGetMuqabalaBattle(battle.id)
        if (!detail) {
          setErr(ui.couldNotLoadQuestions || 'Could not load battle details')
          return
        }
        setQuizBattle({ ...detail, showResultsOnly: true })
      } catch {
        setErr(ui.couldNotLoadQuestions || 'Could not load battle details')
      }
    }
  }

  async function onChallengeCreated(battleId) {
    setShowCreate(false)
    if (!battleId) { loadArena(); return }
    // Load the new battle so user can answer it
    try {
      const detail = await apiGetMuqabalaBattle(battleId)
      if (!detail || !detail.questions || detail.questions.length === 0) {
        loadArena()
        return
      }
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
    <div className="h-full overflow-y-auto px-4 md:px-6 lg:px-8 pt-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-app-text m-0 text-[22px] font-extrabold">{ui.battleArena}</h1>
          <p className="text-app-muted text-[13px] mt-1 mb-0">{ui.studentVsStudent}</p>
        </div>
        {view === 'arena' && (
          <button onClick={() => setShowCreate(true)}
            className="bg-gradient-to-br from-app-orange to-[#ff4e00] text-white border-none rounded-2xl px-4 py-2.5 text-sm font-extrabold cursor-pointer shadow-[0_4px_20px_rgba(255,107,53,0.27)] active:scale-95 transition-all">
            {ui.newBattle}
          </button>
        )}
      </div>

      {/* Nav */}
      <div className="flex gap-2 mb-5">
        {VIEWS.map(v => {
          const Icon = VIEW_ICONS[v.key]
          return (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`relative px-3.5 py-1.5 rounded-full border text-[13px] cursor-pointer transition-all flex items-center gap-1.5 ${view === v.key ? 'bg-app-orange/15 border-app-orange text-app-orange' : 'bg-app-card2 border-app-border text-app-muted hover:bg-white/[0.03]'}`}>
              {Icon && <Icon size={14} weight={view === v.key ? 'fill' : 'regular'} />}
              {v.label}
              {v.key === 'arena' && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-app-red text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-black">{pendingCount}</span>
              )}
            </button>
          )
        })}
      </div>

      {err && (
        <div className="bg-app-red/10 border border-app-red/25 rounded-xl px-3.5 py-2.5 mb-3 text-app-red text-[13px] flex items-center justify-between">
          <span>{err}</span>
          <button onClick={() => { setErr(''); view === 'arena' ? loadArena() : loadHistory() }}
            className="bg-app-red/15 border border-app-red/30 text-app-red rounded-lg px-3 py-1 text-[12px] font-bold cursor-pointer ml-2 shrink-0">
            Retry
          </button>
        </div>
      )}

      {loading && <p className="text-app-muted text-center py-6">Loading…</p>}

      {/* ── Arena ── */}
      {view === 'arena' && !loading && (
        <>
          {pending.length > 0 && (
            <div className="mb-5">
              <h3 className="text-app-orange text-sm mb-2.5">{ui.yourTurn} ({pending.length})</h3>
              {pending.map(b => <BattleCard key={b.id} battle={b} onAction={handleAction} myId={myId} ui={ui} />)}
            </div>
          )}

          {/* Battles where I'm opponent and need to answer (challenger_done) */}
          {active.filter(b => !b.is_challenger && b.status === 'challenger_done').length > 0 && (
            <div className="mb-5">
              <h3 className="text-app-orange text-sm mb-2.5">{ui.yourTurn || 'Your Turn'} ({active.filter(b => !b.is_challenger && b.status === 'challenger_done').length})</h3>
              {active.filter(b => !b.is_challenger && b.status === 'challenger_done').map(b => (
                <BattleCard key={b.id} battle={b} onAction={handleAction} myId={myId} ui={ui} />
              ))}
            </div>
          )}

          {active.filter(b => b.is_challenger && b.status === 'open' && b.challenger_score === null).length > 0 && (
            <div className="mb-5">
              <h3 className="text-app-yellow text-sm mb-2.5">{ui.answerFirst}</h3>
              {active.filter(b => b.is_challenger && b.status === 'open' && b.challenger_score === null).map(b => (
                <BattleCard key={b.id} battle={b} onAction={handleAction} myId={myId} ui={ui} />
              ))}
            </div>
          )}

          {active.filter(b => b.is_challenger && ['active','challenger_done'].includes(b.status)).length > 0 && (
            <div className="mb-5">
              <h3 className="text-app-muted text-sm mb-2.5">{ui.waitingForOpponent}</h3>
              {active.filter(b => b.is_challenger && ['active','challenger_done'].includes(b.status)).map(b => (
                <BattleCard key={b.id} battle={b} onAction={handleAction} myId={myId} ui={ui} />
              ))}
            </div>
          )}

          {openBattles.length > 0 && (
            <div>
              <h3 className="text-app-blue text-sm mb-2.5">{ui.openChallenges} ({openBattles.length})</h3>
              {openBattles.map(b => <BattleCard key={b.id} battle={b} onAction={handleAction} myId={myId} ui={ui} />)}
            </div>
          )}

          {pending.length === 0 && active.length === 0 && openBattles.length === 0 && (
            <EmptyMsg icon={Sword} text={ui.noBattlesArena} />
          )}

          {!profile?.school && (
            <div className="bg-app-blue/5 border border-app-blue/20 rounded-2xl px-4 py-3 mt-5 text-app-muted text-[13px]">
              {ui.addSchoolTip}
            </div>
          )}
        </>
      )}

      {/* ── Leaderboard ── */}
      {view === 'board' && !loading && <LeaderboardView myId={myId} ui={ui} />}

      {/* ── History ── */}
      {view === 'history' && !loading && (
        history.length === 0
          ? <EmptyMsg icon={Scroll} text={ui.noCompletedBattles} />
          : history.map(b => <BattleCard key={b.id} battle={b} onAction={handleAction} myId={myId} ui={ui} />)
      )}

      {/* ── Modals ── */}
      {showCreate && (
        <CreateChallengeModal profile={profile} onClose={() => setShowCreate(false)} onCreated={onChallengeCreated} ui={ui} />
      )}

      {quizBattle && !quizBattle.showResultsOnly && (
        <QuizScreen battle={quizBattle} onDone={onQuizDone} userId={myId} ui={ui} key={quizBattle.id} />
      )}

      {quizBattle?.showResultsOnly && (
        <div className="fixed inset-0 bg-app-bg z-[200] flex items-center justify-center p-5 flex-col overflow-y-auto">
          <div className="bg-app-card rounded-3xl px-6 py-8 max-w-[420px] w-full text-center">
            <div className="text-[48px] mb-3 flex justify-center">
              {quizBattle.winner_id === myId ? <Trophy size={48} weight="duotone" className="text-app-yellow" /> : quizBattle.winner_id === 'draw' ? <Handshake size={48} weight="duotone" className="text-app-blue" /> : <Barbell size={48} weight="duotone" className="text-app-text" />}
            </div>
            <h2 className="mb-4" style={{ color: quizBattle.winner_id === myId ? '#FFD166' : quizBattle.winner_id === 'draw' ? '#7B9CFF' : '#eeeeff' }}>
              {quizBattle.winner_id === myId ? ui.youWonShort : quizBattle.winner_id === 'draw' ? ui.drawResult : quizBattle.status === 'waiting_for_opponent' ? ui.waitingForOpponent : ui.goodFight}
            </h2>
            <div className="bg-app-card2 rounded-2xl p-4 mb-5 flex justify-around">
              <div>
                <div className="text-app-muted text-[12px]">{ui.yourScore}</div>
                <div className="text-app-green text-[22px] font-extrabold">
                  {quizBattle.challenger_id === myId ? quizBattle.challenger_score : quizBattle.opponent_score ?? '?'}/{quizBattle.question_count ?? quizBattle.total_questions ?? '?'}
                </div>
              </div>
              <div>
                <div className="text-app-muted text-[12px]">{ui.opponentScore}</div>
                <div className="text-app-red text-[22px] font-extrabold">
                  {quizBattle.challenger_id === myId ? quizBattle.opponent_score ?? '?' : quizBattle.challenger_score ?? '?'}/{quizBattle.question_count ?? quizBattle.total_questions ?? '?'}
                </div>
              </div>
            </div>
            <button onClick={() => setQuizBattle(null)}
              className="w-full bg-app-orange text-white border-none rounded-2xl py-3 text-[15px] font-extrabold cursor-pointer active:scale-[0.99] transition-all">
              {ui.backToArena}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
