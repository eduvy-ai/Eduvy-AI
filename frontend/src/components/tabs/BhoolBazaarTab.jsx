import { useState, useEffect, useCallback } from 'react'
import { COLORS, callAI, LANG_RULES } from '../../App.jsx'
import {
  apiCreateBhoolCard, apiGetMyBhoolCards, apiUpdateBhoolCard, apiDeleteBhoolCard,
  apiGetBhoolMarketplace, apiGetBhoolTop,
  apiCollectBhoolCard, apiReactBhoolCard,
  apiGetMyBhoolCollections,
} from '../../api.js'

const TABS = [
  { key: 'feed',       label: '🌐 Bazaar',    title: 'Mistake Marketplace' },
  { key: 'mine',       label: '📋 My Bhools',  title: 'My Mistake Cards' },
  { key: 'saved',      label: '🔖 Saved',       title: 'My Collection' },
  { key: 'top',        label: '🏆 Top Bhools',  title: 'Weekly Top Mistakes' },
]

const SUBJECTS = ['Mathematics', 'Science', 'English', 'Social Science', 'Hindi',
                  'Physics', 'Chemistry', 'Biology', 'History', 'Geography',
                  'Economics', 'Computer', 'Sanskrit']

const EMOJI_REACTIONS = [
  { key: 'same',    label: '😅 Same!',    title: 'Me too!' },
  { key: 'clever',  label: '🧠 Clever',   title: 'Clever mistake' },
  { key: 'tricky',  label: '🤔 Tricky',   title: 'Tricky question' },
  { key: 'lol',     label: '😂 Lol',      title: 'Hilarious mistake' },
]

// ── Small helpers ─────────────────────────────────────────────
function Pill({ children, active, onClick, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: 20,
        border: `1px solid ${active ? COLORS.yellow : COLORS.border}`,
        background: active ? `${COLORS.yellow}22` : COLORS.card2,
        color: active ? COLORS.yellow : COLORS.text,
        fontSize: 13,
        cursor: 'pointer',
        transition: 'all .15s',
        ...style,
      }}
    >{children}</button>
  )
}

function BhoolCoins({ count }) {
  return (
    <span style={{
      background: `${COLORS.orange}22`, border: `1px solid ${COLORS.orange}44`,
      color: COLORS.orange, fontSize: 12, borderRadius: 12, padding: '2px 8px',
      fontWeight: 700,
    }}>🪙 {count}</span>
  )
}

// ── Mistake Card (read-only) ──────────────────────────────────
function MistakeCard({ card, isMine = false, onCollect, onReact, onPublish, onDelete, lang }) {
  const [showAnswer, setShowAnswer] = useState(false)
  const [reacting, setReacting] = useState(false)
  const [collecting, setCollecting] = useState(false)

  return (
    <div style={{
      background: COLORS.card,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 16,
      padding: '16px',
      marginBottom: 12,
    }}>
      {/* Subject + standard row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{
          background: `${COLORS.blue}22`, border: `1px solid ${COLORS.blue}44`,
          color: COLORS.blue, fontSize: 11, borderRadius: 10, padding: '2px 8px',
        }}>{card.subject}</span>
        <span style={{
          background: `${COLORS.muted}22`, color: COLORS.muted, fontSize: 11,
          borderRadius: 10, padding: '2px 8px',
        }}>{card.standard || card.author_standard}</span>
        {!isMine && (
          <span style={{ color: COLORS.muted, fontSize: 11, marginLeft: 'auto' }}>
            by {card.author_name}
          </span>
        )}
        {isMine && (
          <span style={{
            marginLeft: 'auto', fontSize: 11,
            color: card.is_published ? COLORS.green : COLORS.muted,
          }}>
            {card.is_published ? '✅ Published' : '🔒 Draft'}
          </span>
        )}
      </div>

      {/* Question */}
      <p style={{ color: COLORS.text, fontSize: 14, marginBottom: 8, fontWeight: 600 }}>
        ❓ {card.question}
      </p>

      {/* Wrong answer */}
      <div style={{
        background: `${COLORS.red}15`, border: `1px solid ${COLORS.red}44`,
        borderRadius: 10, padding: '8px 12px', marginBottom: 8,
      }}>
        <span style={{ color: COLORS.red, fontSize: 12, fontWeight: 700 }}>❌ I answered: </span>
        <span style={{ color: COLORS.text, fontSize: 13 }}>{card.wrong_answer}</span>
      </div>

      {/* Reveal correct answer */}
      {!showAnswer ? (
        <button
          onClick={() => setShowAnswer(true)}
          style={{
            background: `${COLORS.green}22`, border: `1px solid ${COLORS.green}44`,
            color: COLORS.green, borderRadius: 10, padding: '6px 14px',
            fontSize: 13, cursor: 'pointer', marginBottom: 8,
          }}>
          👁 Reveal Correct Answer
        </button>
      ) : (
        <div style={{
          background: `${COLORS.green}12`, border: `1px solid ${COLORS.green}44`,
          borderRadius: 10, padding: '8px 12px', marginBottom: 8,
        }}>
          <span style={{ color: COLORS.green, fontSize: 12, fontWeight: 700 }}>✅ Correct: </span>
          <span style={{ color: COLORS.text, fontSize: 13 }}>{card.correct_answer}</span>
          {card.why_wrong && (
            <p style={{ color: COLORS.muted, fontSize: 12, margin: '6px 0 0' }}>
              💡 {card.why_wrong}
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <BhoolCoins count={card.bhool_coins || 0} />
        {!isMine && typeof card.collect_count !== 'undefined' && (
          <span style={{ color: COLORS.muted, fontSize: 12 }}>
            🔖 {card.collect_count}
          </span>
        )}

        {/* Reactions */}
        {!isMine && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {EMOJI_REACTIONS.map(r => (
              <button
                key={r.key}
                disabled={reacting}
                onClick={async () => {
                  setReacting(true)
                  try { await onReact(card.id, r.key) } finally { setReacting(false) }
                }}
                style={{
                  background: card.my_reaction === r.key
                    ? `${COLORS.yellow}33` : COLORS.card2,
                  border: `1px solid ${card.my_reaction === r.key ? COLORS.yellow : COLORS.border}`,
                  color: COLORS.text, borderRadius: 14, padding: '3px 9px',
                  fontSize: 12, cursor: 'pointer',
                }}
              >{r.label}</button>
            ))}
          </div>
        )}

        {/* Collect button */}
        {!isMine && (
          <button
            disabled={collecting || card.is_collected}
            onClick={async () => {
              setCollecting(true)
              try { await onCollect(card.id) } finally { setCollecting(false) }
            }}
            style={{
              marginLeft: 'auto',
              background: card.is_collected ? `${COLORS.green}22` : `${COLORS.blue}22`,
              border: `1px solid ${card.is_collected ? COLORS.green : COLORS.blue}44`,
              color: card.is_collected ? COLORS.green : COLORS.blue,
              borderRadius: 14, padding: '4px 12px', fontSize: 12, cursor: 'pointer',
            }}
          >{card.is_collected ? '✅ Saved' : '🔖 Collect +10 XP'}</button>
        )}

        {/* My card actions */}
        {isMine && !card.is_published && (
          <button
            onClick={() => onPublish(card.id)}
            style={{
              marginLeft: 'auto',
              background: `${COLORS.orange}22`, border: `1px solid ${COLORS.orange}44`,
              color: COLORS.orange, borderRadius: 14, padding: '4px 12px',
              fontSize: 12, cursor: 'pointer',
            }}
          >🌐 Publish</button>
        )}
        {isMine && (
          <button
            onClick={() => onDelete(card.id)}
            style={{
              background: 'transparent', border: `1px solid ${COLORS.red}44`,
              color: COLORS.red, borderRadius: 14, padding: '4px 12px',
              fontSize: 12, cursor: 'pointer',
              marginLeft: card.is_published ? 'auto' : 8,
            }}
          >🗑</button>
        )}
      </div>
    </div>
  )
}

// ── Add Bhool Modal ───────────────────────────────────────────
function AddBhoolModal({ profile, onClose, onSaved }) {
  const [subject, setSubject]         = useState(profile.subjects?.[0] || 'Mathematics')
  const [question, setQuestion]       = useState('')
  const [wrongAns, setWrongAns]       = useState('')
  const [correctAns, setCorrectAns]   = useState('')
  const [whyWrong, setWhyWrong]       = useState('')
  const [publish, setPublish]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [aiLoading, setAiLoading]     = useState(false)
  const [err, setErr]                 = useState('')

  async function handleAIExplain() {
    if (!question || !wrongAns || !correctAns) return
    setAiLoading(true)
    try {
      const prompt = `A student made this mistake:
Question: ${question}
Wrong answer given: ${wrongAns}
Correct answer: ${correctAns}

In 1-2 short sentences, explain WHY a student would make this mistake and what concept they misunderstood. Be encouraging, not critical. Reply in ${LANG_RULES[profile.language] || 'simple, clear English'}.`
      const explanation = await callAI([{ role: 'user', content: prompt }])
      setWhyWrong(explanation.trim())
    } catch {
      setErr('AI explanation failed. Write it yourself!')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSave() {
    if (!question.trim() || !wrongAns.trim() || !correctAns.trim()) {
      setErr('Please fill Question, Wrong Answer and Correct Answer.')
      return
    }
    setSaving(true); setErr('')
    try {
      await apiCreateBhoolCard({
        subject, standard: profile.standard,
        question: question.trim(),
        wrong_answer: wrongAns.trim(),
        correct_answer: correctAns.trim(),
        why_wrong: whyWrong.trim(),
        is_published: publish,
      })
      onSaved()
    } catch (e) {
      setErr('Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const input = (value, onChange, placeholder, rows = 1) => ({
    value, onChange: e => onChange(e.target.value), placeholder,
    style: {
      width: '100%', boxSizing: 'border-box',
      background: COLORS.card2, border: `1px solid ${COLORS.border}`,
      color: COLORS.text, borderRadius: 10, padding: '10px 12px',
      fontSize: 14, fontFamily: 'Sora, sans-serif',
      resize: 'vertical',
      minHeight: rows > 1 ? rows * 28 : undefined,
    },
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#00000088', zIndex: 200,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: COLORS.card, width: '100%', maxWidth: 600,
        borderRadius: '20px 20px 0 0', padding: '24px 20px 32px',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ color: COLORS.text, margin: 0, fontSize: 18 }}>📝 Save a Bhool</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: COLORS.muted, fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        {/* Subject */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: COLORS.muted, fontSize: 12, display: 'block', marginBottom: 4 }}>Subject</label>
          <select
            value={subject}
            onChange={e => setSubject(e.target.value)}
            style={{ ...input('', () => {}, '').style, cursor: 'pointer' }}
          >
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Question */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: COLORS.muted, fontSize: 12, display: 'block', marginBottom: 4 }}>Question / Topic</label>
          <textarea {...input(question, setQuestion, 'What was the question?', 2)} />
        </div>

        {/* Wrong answer */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: COLORS.muted, fontSize: 12, display: 'block', marginBottom: 4 }}>My Wrong Answer ❌</label>
          <textarea {...input(wrongAns, setWrongAns, 'What answer did you give (incorrectly)?', 2)} />
        </div>

        {/* Correct answer */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: COLORS.muted, fontSize: 12, display: 'block', marginBottom: 4 }}>Correct Answer ✅</label>
          <textarea {...input(correctAns, setCorrectAns, 'What is the right answer?', 2)} />
        </div>

        {/* Why wrong */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ color: COLORS.muted, fontSize: 12 }}>Why did I get it wrong? 💡</label>
            <button
              onClick={handleAIExplain}
              disabled={aiLoading || !question || !wrongAns || !correctAns}
              style={{
                background: `${COLORS.blue}22`, border: `1px solid ${COLORS.blue}44`,
                color: COLORS.blue, borderRadius: 12, padding: '3px 10px',
                fontSize: 12, cursor: 'pointer',
              }}
            >{aiLoading ? '✨ Thinking…' : '✨ AI Explain'}</button>
          </div>
          <textarea {...input(whyWrong, setWhyWrong, 'Optional: explain your misconception…', 2)} />
        </div>

        {/* Publish toggle */}
        <button
          onClick={() => setPublish(p => !p)}
          style={{
            width: '100%', marginBottom: 16,
            background: publish ? `${COLORS.green}22` : COLORS.card2,
            border: `1px solid ${publish ? COLORS.green : COLORS.border}`,
            color: publish ? COLORS.green : COLORS.muted,
            borderRadius: 12, padding: '10px', fontSize: 14, cursor: 'pointer',
          }}
        >
          {publish ? '🌐 Will be published to Bazaar' : '🔒 Keep private (can publish later)'}
        </button>

        {err && <p style={{ color: COLORS.red, fontSize: 13, marginBottom: 12 }}>{err}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', background: COLORS.orange, color: '#fff',
            border: 'none', borderRadius: 14, padding: '14px',
            fontSize: 16, fontWeight: 700, cursor: 'pointer',
          }}
        >{saving ? 'Saving…' : '💾 Save Bhool'}</button>
      </div>
    </div>
  )
}

// ── Publish confirm modal ─────────────────────────────────────
function PublishConfirmModal({ card, onClose, onPublished }) {
  const [publishing, setPublishing] = useState(false)

  async function handlePublish() {
    setPublishing(true)
    try {
      await apiUpdateBhoolCard(card.id, { is_published: true })
      onPublished(card.id)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#00000088', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: COLORS.card, borderRadius: 20, padding: '28px 24px',
        maxWidth: 420, width: '100%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌐</div>
        <h2 style={{ color: COLORS.text, marginBottom: 8 }}>Share Your Bhool?</h2>
        <p style={{ color: COLORS.muted, fontSize: 14, marginBottom: 20 }}>
          Publishing lets other students learn from your mistake — and earns you <strong style={{ color: COLORS.orange }}>🪙 5 Bhool Coins!</strong>
        </p>
        <button
          onClick={handlePublish}
          disabled={publishing}
          style={{
            width: '100%', background: COLORS.orange, color: '#fff',
            border: 'none', borderRadius: 14, padding: '13px',
            fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10,
          }}
        >{publishing ? 'Publishing…' : '🌐 Yes, Publish!'}</button>
        <button onClick={onClose} style={{
          width: '100%', background: 'transparent',
          border: `1px solid ${COLORS.border}`, color: COLORS.muted,
          borderRadius: 14, padding: '11px', fontSize: 14, cursor: 'pointer',
        }}>Keep Private</button>
      </div>
    </div>
  )
}

// ── Main Tab ──────────────────────────────────────────────────
export default function BhoolBazaarTab({ profile, addXp }) {
  const [activeTab, setActiveTab]         = useState('feed')
  const [feedCards, setFeedCards]         = useState([])
  const [myCards, setMyCards]             = useState([])
  const [savedCards, setSavedCards]       = useState([])
  const [topCards, setTopCards]           = useState([])
  const [loading, setLoading]             = useState(false)
  const [err, setErr]                     = useState('')
  const [showAddModal, setShowAddModal]   = useState(false)
  const [publishCard, setPublishCard]     = useState(null)
  const [feedOffset, setFeedOffset]       = useState(0)
  const [hasMore, setHasMore]             = useState(true)
  const [filterSubject, setFilterSubject] = useState('')
  const [filterSort, setFilterSort]       = useState('recent')

  const LIMIT = 20

  // ── Data fetching ─────────────────────────────────────────
  const loadFeed = useCallback(async (reset = false) => {
    setLoading(true); setErr('')
    try {
      const offset = reset ? 0 : feedOffset
      const res = await apiGetBhoolMarketplace({
        subject: filterSubject || undefined,
        sort: filterSort,
        offset, limit: LIMIT,
      })
      if (reset) {
        setFeedCards(res.cards)
        setFeedOffset(res.cards.length)
      } else {
        setFeedCards(prev => [...prev, ...res.cards])
        setFeedOffset(prev => prev + res.cards.length)
      }
      setHasMore(res.cards.length === LIMIT)
    } catch {
      setErr('Could not load Bazaar. Try again.')
    } finally {
      setLoading(false)
    }
  }, [feedOffset, filterSubject, filterSort])

  const loadMine = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGetMyBhoolCards()
      setMyCards(res.cards || [])
    } catch {
      setErr('Could not load your cards.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSaved = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGetMyBhoolCollections()
      setSavedCards(res.cards || [])
    } catch {
      setErr('Could not load saved cards.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTop = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGetBhoolTop()
      setTopCards(res.top || [])
    } catch {
      setErr('Could not load top cards.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'feed')  { setFeedOffset(0); setFeedCards([]); loadFeed(true) }
    if (activeTab === 'mine')  loadMine()
    if (activeTab === 'saved') loadSaved()
    if (activeTab === 'top')   loadTop()
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch feed when filters change
  useEffect(() => {
    if (activeTab === 'feed') { setFeedOffset(0); setFeedCards([]); loadFeed(true) }
  }, [filterSubject, filterSort]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────
  async function handleCollect(cardId) {
    try {
      await apiCollectBhoolCard(cardId)
      setFeedCards(prev => prev.map(c =>
        c.id === cardId
          ? { ...c, is_collected: true, collect_count: (c.collect_count || 0) + 1 }
          : c
      ))
      addXp?.(10)
    } catch { /* silent */ }
  }

  async function handleReact(cardId, emoji) {
    try {
      await apiReactBhoolCard(cardId, emoji)
      const updateCard = c =>
        c.id === cardId ? { ...c, my_reaction: emoji } : c
      setFeedCards(prev => prev.map(updateCard))
      setSavedCards(prev => prev.map(updateCard))
    } catch { /* silent */ }
  }

  async function handleDelete(cardId) {
    if (!window.confirm('Delete this bhool card?')) return
    try {
      await apiDeleteBhoolCard(cardId)
      setMyCards(prev => prev.filter(c => c.id !== cardId))
    } catch { /* silent */ }
  }

  function handlePublish(cardId) {
    const card = myCards.find(c => c.id === cardId)
    if (card) setPublishCard(card)
  }

  function onPublished(cardId) {
    setMyCards(prev => prev.map(c =>
      c.id === cardId ? { ...c, is_published: true, bhool_coins: (c.bhool_coins || 0) + 5 } : c
    ))
    setPublishCard(null)
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{
      height: '100%', overflowY: 'auto',
      padding: '16px 16px 80px',
      maxWidth: 700, margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ color: COLORS.text, margin: 0, fontSize: 22, fontWeight: 800 }}>
              📛 Bhool Bazaar
            </h1>
            <p style={{ color: COLORS.muted, fontSize: 13, margin: '4px 0 0' }}>
              Turn mistakes into learning assets
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: `linear-gradient(135deg, ${COLORS.orange}, #ff4e00)`,
              color: '#fff', border: 'none', borderRadius: 14,
              padding: '10px 18px', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', boxShadow: `0 4px 20px ${COLORS.orange}44`,
            }}
          >+ New Bhool</button>
        </div>
      </div>

      {/* Sub-nav */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap',
        marginBottom: 16, overflowX: 'auto',
      }}>
        {TABS.map(t => (
          <Pill key={t.key} active={activeTab === t.key} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </Pill>
        ))}
      </div>

      {/* Feed filters */}
      {activeTab === 'feed' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <select
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            style={{
              background: COLORS.card2, border: `1px solid ${COLORS.border}`,
              color: COLORS.text, borderRadius: 10, padding: '6px 12px',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            <option value="">All Subjects</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterSort}
            onChange={e => setFilterSort(e.target.value)}
            style={{
              background: COLORS.card2, border: `1px solid ${COLORS.border}`,
              color: COLORS.text, borderRadius: 10, padding: '6px 12px',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            <option value="recent">🕐 Recent</option>
            <option value="coins">🪙 Most Coins</option>
            <option value="collected">🔖 Most Saved</option>
          </select>
        </div>
      )}

      {/* Error */}
      {err && (
        <div style={{
          background: `${COLORS.red}15`, border: `1px solid ${COLORS.red}33`,
          borderRadius: 12, padding: '10px 14px', marginBottom: 12,
          color: COLORS.red, fontSize: 13,
        }}>{err}</div>
      )}

      {/* Empty states */}
      {!loading && activeTab === 'feed'  && feedCards.length  === 0 && (
        <EmptyState icon="🌐" title="Bazaar is empty" subtitle="Be the first to publish a mistake!" />
      )}
      {!loading && activeTab === 'mine'  && myCards.length    === 0 && (
        <EmptyState icon="📋" title="No bhool cards yet" subtitle='Tap "+ New Bhool" to save your first mistake.' />
      )}
      {!loading && activeTab === 'saved' && savedCards.length === 0 && (
        <EmptyState icon="🔖" title="Nothing saved yet" subtitle="Visit the Bazaar and collect cards from other students." />
      )}
      {!loading && activeTab === 'top'   && topCards.length   === 0 && (
        <EmptyState icon="🏆" title="No top cards this week" subtitle="More students need to publish their mistakes!" />
      )}

      {/* Cards */}
      {activeTab === 'feed' && feedCards.map(card => (
        <MistakeCard
          key={card.id} card={card}
          onCollect={handleCollect}
          onReact={handleReact}
          lang={profile.language}
        />
      ))}

      {activeTab === 'mine' && myCards.map(card => (
        <MistakeCard
          key={card.id} card={card} isMine
          onPublish={handlePublish}
          onDelete={handleDelete}
          lang={profile.language}
        />
      ))}

      {activeTab === 'saved' && savedCards.map(card => (
        <MistakeCard
          key={card.id} card={card}
          onCollect={() => {}} onReact={handleReact}
          lang={profile.language}
        />
      ))}

      {activeTab === 'top' && <TopList cards={topCards} />}

      {/* Load more */}
      {activeTab === 'feed' && hasMore && !loading && feedCards.length > 0 && (
        <button
          onClick={() => loadFeed(false)}
          style={{
            width: '100%', background: COLORS.card2,
            border: `1px solid ${COLORS.border}`, color: COLORS.text,
            borderRadius: 14, padding: '12px', fontSize: 14, cursor: 'pointer',
            marginTop: 8,
          }}
        >Load More</button>
      )}

      {loading && (
        <div style={{ textAlign: 'center', color: COLORS.muted, padding: '24px', fontSize: 14 }}>
          Loading…
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddBhoolModal
          profile={profile}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false)
            setActiveTab('mine')
            loadMine()
          }}
        />
      )}
      {publishCard && (
        <PublishConfirmModal
          card={publishCard}
          onClose={() => setPublishCard(null)}
          onPublished={onPublished}
        />
      )}
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────
function EmptyState({ icon, title, subtitle }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 56, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ color: COLORS.text, margin: '0 0 8px' }}>{title}</h3>
      <p style={{ color: COLORS.muted, fontSize: 14, margin: 0 }}>{subtitle}</p>
    </div>
  )
}

// ── Top Cards leaderboard ──────────────────────────────────────
function TopList({ cards }) {
  // Group by subject
  const bySubject = {}
  for (const c of cards) {
    if (!bySubject[c.subject]) bySubject[c.subject] = []
    bySubject[c.subject].push(c)
  }

  if (cards.length === 0) return null

  return (
    <div>
      {Object.entries(bySubject).map(([subject, subCards]) => (
        <div key={subject} style={{ marginBottom: 24 }}>
          <h3 style={{ color: COLORS.yellow, fontSize: 15, marginBottom: 10 }}>
            📚 {subject}
          </h3>
          {subCards.map((c, i) => (
            <div
              key={c.id}
              style={{
                background: COLORS.card,
                border: `1px solid ${i === 0 ? COLORS.yellow + '44' : COLORS.border}`,
                borderRadius: 14, padding: '12px 16px', marginBottom: 10,
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}
            >
              <span style={{
                fontSize: 20, minWidth: 28, textAlign: 'center',
                color: i === 0 ? COLORS.yellow : i === 1 ? '#aaa' : '#cd7f32',
              }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: COLORS.text, fontSize: 13, margin: '0 0 4px', fontWeight: 600 }}>
                  {c.question}
                </p>
                <p style={{ color: COLORS.muted, fontSize: 12, margin: 0 }}>
                  by {c.author_name} · 🔖 {c.collect_count} saved · <BhoolCoins count={c.bhool_coins || 0} />
                </p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
