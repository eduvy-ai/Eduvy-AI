import { useState, useEffect, useCallback } from 'react'
import { callAI, LANG_RULES } from '../../shared.js'
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
function Pill({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-2xl text-[13px] cursor-pointer transition-all active:scale-95 border ${active ? 'border-app-yellow bg-app-yellow/15 text-app-yellow font-semibold' : 'border-app-border bg-app-card2 text-app-text hover:border-app-yellow/30'}`}
    >{children}</button>
  )
}

function BhoolCoins({ count }) {
  return (
    <span className="bg-app-orange/15 border border-app-orange/30 text-app-orange text-xs rounded-xl px-2 py-0.5 font-bold">
      🪙 {count}
    </span>
  )
}

// ── Mistake Card (read-only) ──────────────────────────────────
function MistakeCard({ card, isMine = false, onCollect, onReact, onPublish, onDelete }) {
  const [showAnswer, setShowAnswer] = useState(false)
  const [reacting, setReacting] = useState(false)
  const [collecting, setCollecting] = useState(false)

  return (
    <div className="bg-app-card border border-app-border rounded-2xl p-4 mb-3">
      {/* Subject + standard row */}
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        <span className="bg-app-blue/15 border border-app-blue/30 text-app-blue text-[11px] rounded-xl px-2 py-0.5">{card.subject}</span>
        <span className="bg-app-muted/15 text-app-muted text-[11px] rounded-xl px-2 py-0.5">{card.standard || card.author_standard}</span>
        {!isMine && <span className="text-app-muted text-[11px] ml-auto">by {card.author_name}</span>}
        {isMine && (
          <span className={`ml-auto text-[11px] ${card.is_published ? 'text-app-green' : 'text-app-muted'}`}>
            {card.is_published ? '✅ Published' : '🔒 Draft'}
          </span>
        )}
      </div>

      <p className="text-app-text text-sm mb-2 font-semibold">❓ {card.question}</p>

      <div className="bg-app-red/10 border border-app-red/30 rounded-xl px-3 py-2 mb-2">
        <span className="text-app-red text-xs font-bold">❌ I answered: </span>
        <span className="text-app-text text-[13px]">{card.wrong_answer}</span>
      </div>

      {!showAnswer ? (
        <button onClick={() => setShowAnswer(true)}
          className="bg-app-green/15 border border-app-green/30 text-app-green rounded-xl px-3.5 py-1.5 text-[13px] cursor-pointer mb-2 hover:bg-app-green/20 active:scale-95 transition-all">
          👁 Reveal Correct Answer
        </button>
      ) : (
        <div className="bg-app-green/10 border border-app-green/30 rounded-xl px-3 py-2 mb-2">
          <span className="text-app-green text-xs font-bold">✅ Correct: </span>
          <span className="text-app-text text-[13px]">{card.correct_answer}</span>
          {card.why_wrong && <p className="text-app-muted text-xs mt-1.5">💡 {card.why_wrong}</p>}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap mt-2">
        <BhoolCoins count={card.bhool_coins || 0} />
        {!isMine && typeof card.collect_count !== 'undefined' && (
          <span className="text-app-muted text-xs">🔖 {card.collect_count}</span>
        )}

        {!isMine && (
          <div className="flex gap-1 flex-wrap">
            {EMOJI_REACTIONS.map(r => (
              <button key={r.key} disabled={reacting}
                onClick={async () => { setReacting(true); try { await onReact(card.id, r.key) } finally { setReacting(false) } }}
                className={`rounded-2xl px-2.5 py-0.5 text-xs cursor-pointer border transition-all ${card.my_reaction === r.key ? 'bg-app-yellow/20 border-app-yellow text-app-yellow' : 'bg-app-card2 border-app-border text-app-text hover:border-app-yellow/30'}`}>
                {r.label}
              </button>
            ))}
          </div>
        )}

        {!isMine && (
          <button disabled={collecting || card.is_collected}
            onClick={async () => { setCollecting(true); try { await onCollect(card.id) } finally { setCollecting(false) } }}
            className={`ml-auto rounded-2xl px-3 py-1 text-xs cursor-pointer border transition-all ${card.is_collected ? 'bg-app-green/15 border-app-green/30 text-app-green' : 'bg-app-blue/15 border-app-blue/30 text-app-blue hover:bg-app-blue/20'} disabled:opacity-60`}>
            {card.is_collected ? '✅ Saved' : '🔖 Collect +10 XP'}
          </button>
        )}

        {isMine && !card.is_published && (
          <button onClick={() => onPublish(card.id)}
            className="ml-auto bg-app-orange/15 border border-app-orange/30 text-app-orange rounded-2xl px-3 py-1 text-xs cursor-pointer hover:bg-app-orange/20 active:scale-95 transition-all">
            🌐 Publish
          </button>
        )}
        {isMine && (
          <button onClick={() => onDelete(card.id)}
            className={`${!card.is_published ? 'ml-2' : 'ml-auto'} bg-transparent border border-app-red/30 text-app-red rounded-2xl px-3 py-1 text-xs cursor-pointer hover:bg-app-red/10 active:scale-95 transition-all`}>
            🗑
          </button>
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

  const inputCls = "w-full box-border bg-app-card2 border border-app-border text-app-text rounded-xl px-3 py-2.5 text-sm resize-y outline-none focus:border-app-green/40 transition-colors placeholder:text-app-muted"

  return (
    <div className="fixed inset-0 bg-black/55 z-[200] flex items-end justify-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-app-card w-full max-w-[600px] rounded-t-[20px] px-5 pt-6 pb-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-app-text m-0 text-lg font-extrabold">📝 Save a Bhool</h2>
          <button onClick={onClose} className="bg-transparent border-none text-app-muted text-2xl cursor-pointer hover:text-app-text">×</button>
        </div>

        <div className="mb-3">
          <label className="text-app-muted text-xs block mb-1">Subject</label>
          <select value={subject} onChange={e => setSubject(e.target.value)} className={`${inputCls} cursor-pointer`}>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="mb-3">
          <label className="text-app-muted text-xs block mb-1">Question / Topic</label>
          <textarea className={inputCls} value={question} onChange={e => setQuestion(e.target.value)} placeholder="What was the question?" rows={2} />
        </div>

        <div className="mb-3">
          <label className="text-app-muted text-xs block mb-1">My Wrong Answer ❌</label>
          <textarea className={inputCls} value={wrongAns} onChange={e => setWrongAns(e.target.value)} placeholder="What answer did you give (incorrectly)?" rows={2} />
        </div>

        <div className="mb-3">
          <label className="text-app-muted text-xs block mb-1">Correct Answer ✅</label>
          <textarea className={inputCls} value={correctAns} onChange={e => setCorrectAns(e.target.value)} placeholder="What is the right answer?" rows={2} />
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-app-muted text-xs">Why did I get it wrong? 💡</label>
            <button onClick={handleAIExplain} disabled={aiLoading || !question || !wrongAns || !correctAns}
              className="bg-app-blue/15 border border-app-blue/30 text-app-blue rounded-xl px-2.5 py-1 text-xs cursor-pointer disabled:opacity-50 hover:bg-app-blue/20 active:scale-95 transition-all">
              {aiLoading ? '✨ Thinking…' : '✨ AI Explain'}
            </button>
          </div>
          <textarea className={inputCls} value={whyWrong} onChange={e => setWhyWrong(e.target.value)} placeholder="Optional: explain your misconception…" rows={2} />
        </div>

        <button onClick={() => setPublish(p => !p)}
          className={`w-full mb-4 rounded-xl py-2.5 text-sm cursor-pointer border transition-all ${publish ? 'bg-app-green/15 border-app-green text-app-green' : 'bg-app-card2 border-app-border text-app-muted hover:bg-white/[0.03]'}`}>
          {publish ? '🌐 Will be published to Bazaar' : '🔒 Keep private (can publish later)'}
        </button>

        {err && <p className="text-app-red text-[13px] mb-3">{err}</p>}

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-app-orange text-white border-none rounded-2xl py-3.5 text-base font-extrabold cursor-pointer disabled:opacity-60 active:scale-[0.99] transition-all">
          {saving ? 'Saving…' : '💾 Save Bhool'}
        </button>
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
    <div className="fixed inset-0 bg-black/55 z-[200] flex items-center justify-center p-5" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-app-card rounded-[20px] px-6 py-7 max-w-[420px] w-full text-center">
        <div className="text-[48px] mb-3">🌐</div>
        <h2 className="text-app-text mb-2 text-lg font-extrabold">Share Your Bhool?</h2>
        <p className="text-app-muted text-sm mb-5">
          Publishing lets other students learn from your mistake — and earns you <strong className="text-app-orange">🪙 5 Bhool Coins!</strong>
        </p>
        <button onClick={handlePublish} disabled={publishing}
          className="w-full bg-app-orange text-white border-none rounded-2xl py-3 text-base font-extrabold cursor-pointer mb-2.5 disabled:opacity-60 active:scale-[0.99] transition-all">
          {publishing ? 'Publishing…' : '🌐 Yes, Publish!'}
        </button>
        <button onClick={onClose}
          className="w-full bg-transparent border border-app-border text-app-muted rounded-2xl py-2.5 text-sm cursor-pointer hover:bg-white/[0.03] active:scale-[0.99] transition-all">
          Keep Private
        </button>
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
    <div className="h-full overflow-y-auto px-4 md:px-6 lg:px-8 pt-4 pb-20">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-app-text m-0 text-[22px] font-extrabold">📛 Bhool Bazaar</h1>
            <p className="text-app-muted text-[13px] mt-1 mb-0">Turn mistakes into learning assets</p>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-br from-app-orange to-[#ff4e00] text-white border-none rounded-2xl px-4 py-2.5 text-sm font-extrabold cursor-pointer shadow-[0_4px_20px_rgba(255,107,53,0.27)] active:scale-95 transition-all">
            + New Bhool
          </button>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-2 flex-wrap mb-4 overflow-x-auto">
        {TABS.map(t => (
          <Pill key={t.key} active={activeTab === t.key} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </Pill>
        ))}
      </div>

      {/* Feed filters */}
      {activeTab === 'feed' && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
            className="bg-app-card2 border border-app-border text-app-text rounded-xl px-3 py-1.5 text-[13px] cursor-pointer outline-none">
            <option value="">All Subjects</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterSort} onChange={e => setFilterSort(e.target.value)}
            className="bg-app-card2 border border-app-border text-app-text rounded-xl px-3 py-1.5 text-[13px] cursor-pointer outline-none">
            <option value="recent">🕐 Recent</option>
            <option value="coins">🪙 Most Coins</option>
            <option value="collected">🔖 Most Saved</option>
          </select>
        </div>
      )}

      {/* Error */}
      {err && (
        <div className="bg-app-red/10 border border-app-red/25 rounded-xl px-3.5 py-2.5 mb-3 text-app-red text-[13px]">{err}</div>
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
        <button onClick={() => loadFeed(false)}
          className="w-full mt-2 bg-app-card2 border border-app-border text-app-text rounded-2xl py-3 text-sm cursor-pointer hover:bg-white/[0.04] active:scale-[0.99] transition-all">
          Load More
        </button>
      )}

      {loading && (
        <div className="text-center text-app-muted py-6 text-sm">Loading…</div>
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
    <div className="text-center py-12 px-6">
      <div className="text-[56px] mb-3">{icon}</div>
      <h3 className="text-app-text m-0 mb-2">{title}</h3>
      <p className="text-app-muted text-sm m-0">{subtitle}</p>
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
        <div key={subject} className="mb-6">
          <h3 className="text-app-yellow text-[15px] mb-2.5">📚 {subject}</h3>
          {subCards.map((c, i) => (
            <div key={c.id}
              className={`bg-app-card border rounded-2xl px-4 py-3 mb-2.5 flex items-start gap-3 ${i === 0 ? 'border-app-yellow/25' : 'border-app-border'}`}>
              <span className={`text-xl min-w-[28px] text-center ${i === 0 ? 'text-app-yellow' : i === 1 ? 'text-[#aaa]' : 'text-[#cd7f32]'}`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-app-text text-[13px] m-0 mb-1 font-semibold">{c.question}</p>
                <p className="text-app-muted text-[12px] m-0">by {c.author_name} · 🔖 {c.collect_count} saved · <BhoolCoins count={c.bhool_coins || 0} /></p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
