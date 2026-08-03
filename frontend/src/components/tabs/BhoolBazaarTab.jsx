import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { callAI, LANG_RULES, SUBS, getDisplayLang } from '../../shared.js'
import { li } from '../../i18n/index.js'
import { Globe, ClipboardText, BookmarkSimple, Trophy, CoinVertical, Question, Lightbulb, Trash, Books, Lock, CaretLeft } from '@phosphor-icons/react'
import {
  apiCreateBhoolCard, apiGetMyBhoolCards, apiUpdateBhoolCard, apiDeleteBhoolCard,
  apiGetBhoolMarketplace, apiGetBhoolTop,
  apiCollectBhoolCard, apiReactBhoolCard,
  apiGetMyBhoolCollections,
} from '../../api.js'

const TAB_ICONS = { feed: Globe, mine: ClipboardText, saved: BookmarkSimple, top: Trophy }
const getTabs = (ui) => [
  { key: 'feed',       label: ui.bazaar,    title: ui.bazaar },
  { key: 'mine',       label: ui.myBhools,  title: ui.myBhools },
  { key: 'saved',      label: ui.collected,  title: ui.collected },
  { key: 'top',        label: ui.insights,   title: ui.insights },
]

const getEmojiReactions = (ui) => [
  { key: 'same',    label: ui.emojiSame,    title: ui.meeToo },
  { key: 'clever',  label: ui.emojiClever,  title: ui.emojiClever },
  { key: 'tricky',  label: ui.emojiTricky,  title: ui.emojiTricky },
  { key: 'lol',     label: ui.emojiLol,     title: ui.emojiLol },
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
    <span className="bg-app-orange/15 border border-app-orange/30 text-app-orange text-xs rounded-xl px-2 py-0.5 font-bold flex items-center gap-1">
      <CoinVertical size={12} weight="fill" /> {count}
    </span>
  )
}

// ── Mistake Card (read-only) ──────────────────────────────────
function MistakeCard({ card, isMine = false, onCollect, onReact, onPublish, onDelete, ui }) {
  const [showAnswer, setShowAnswer] = useState(false)
  const [reacting, setReacting] = useState(false)
  const [collecting, setCollecting] = useState(false)
  const EMOJI_REACTIONS = getEmojiReactions(ui)

  return (
    <div className="bg-app-card border border-app-border rounded-2xl p-4 mb-3">
      {/* Subject + standard row */}
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        <span className="bg-app-blue/15 border border-app-blue/30 text-app-blue text-[11px] rounded-xl px-2 py-0.5">{card.subject}</span>
        <span className="bg-app-muted/15 text-app-muted text-[11px] rounded-xl px-2 py-0.5">{card.standard || card.author_standard}</span>
        {!isMine && <span className="text-app-muted text-[11px] ml-auto">{ui.byAuthor} {card.author_name}</span>}
        {isMine && (
          <span className={`ml-auto text-[11px] ${card.is_published ? 'text-app-green' : 'text-app-muted'}`}>
            {card.is_published ? ui.published : ui.draft}
          </span>
        )}
      </div>

      <p className="text-app-text text-sm mb-2 font-semibold flex items-center gap-1.5"><Question size={16} weight="bold" className="text-app-blue shrink-0" /> {card.question}</p>

      <div className="bg-app-red/10 border border-app-red/30 rounded-xl px-3 py-2 mb-2">
        <span className="text-app-red text-xs font-bold">{ui.iAnswered}</span>
        <span className="text-app-text text-[13px]">{card.wrong_answer}</span>
      </div>

      {!showAnswer ? (
        <button onClick={() => setShowAnswer(true)}
          className="bg-app-green/15 border border-app-green/30 text-app-green rounded-xl px-3.5 py-1.5 text-[13px] cursor-pointer mb-2 hover:bg-app-green/20 active:scale-95 transition-all">
          {ui.revealCorrectAnswer}
        </button>
      ) : (
        <div className="bg-app-green/10 border border-app-green/30 rounded-xl px-3 py-2 mb-2">
          <span className="text-app-green text-xs font-bold">{ui.correctLabel}</span>
          <span className="text-app-text text-[13px]">{card.correct_answer}</span>
          {card.why_wrong && <p className="text-app-muted text-xs mt-1.5 flex items-center gap-1"><Lightbulb size={12} weight="fill" className="text-app-yellow shrink-0" /> {card.why_wrong}</p>}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap mt-2">
        <BhoolCoins count={card.bhool_coins || 0} />
        {!isMine && typeof card.collect_count !== 'undefined' && (
          <span className="text-app-muted text-xs flex items-center gap-0.5"><BookmarkSimple size={12} weight="fill" /> {card.collect_count}</span>
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
            {card.is_collected ? ui.savedLabel : ui.collectXp}
          </button>
        )}

        {isMine && !card.is_published && (
          <button onClick={() => onPublish(card.id)}
            className="ml-auto bg-app-orange/15 border border-app-orange/30 text-app-orange rounded-2xl px-3 py-1 text-xs cursor-pointer hover:bg-app-orange/20 active:scale-95 transition-all">
            {ui.publishBtn}
          </button>
        )}
        {isMine && (
          <button onClick={() => onDelete(card.id)}
            className={`${!card.is_published ? 'ml-2' : 'ml-auto'} bg-transparent border border-app-red/30 text-app-red rounded-2xl px-3 py-1 text-xs cursor-pointer hover:bg-app-red/10 active:scale-95 transition-all`}>
            <Trash size={14} weight="fill" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Add Bhool Modal ───────────────────────────────────────────
function AddBhoolModal({ profile, onClose, onSaved, ui }) {
  const standardSubjects = SUBS[profile?.standard] || SUBS['Class 10'] || []
  const subjects = standardSubjects.length > 0 ? standardSubjects 
    : (profile?.subjects?.length ? profile.subjects : ['Mathematics', 'Science'])
  const [subject, setSubject]         = useState(subjects[0] || 'Mathematics')
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
      setErr(ui.aiExplainFailed)
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSave() {
    if (!question.trim() || !wrongAns.trim() || !correctAns.trim()) {
      setErr(ui.fillRequired)
      return
    }
    setSaving(true); setErr('')
    try {
      await apiCreateBhoolCard({
        subject, standard: profile.standard || 'Class 10',
        question: question.trim(),
        wrong_answer: wrongAns.trim(),
        correct_answer: correctAns.trim(),
        why_wrong: whyWrong.trim(),
        is_published: publish,
      })
      onSaved()
    } catch (e) {
      setErr(ui.couldNotSave)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full box-border bg-app-card2 border border-app-border text-app-text rounded-xl px-3 py-2.5 text-sm resize-y outline-none focus:border-app-green/40 transition-colors placeholder:text-app-muted"

  return (
    <div className="fixed inset-0 bg-black/55 z-[200] flex items-end justify-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-app-card w-full max-w-[600px] rounded-t-[20px] px-5 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-app-text m-0 text-lg font-extrabold">{ui.saveBhoolTitle}</h2>
          <button onClick={onClose} className="bg-transparent border-none text-app-muted text-2xl cursor-pointer hover:text-app-text">×</button>
        </div>

        <div className="mb-3">
          <label className="text-app-muted text-xs block mb-1">{ui.subjectLabel}</label>
          <select value={subject} onChange={e => setSubject(e.target.value)} className={`${inputCls} cursor-pointer`}>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="mb-3">
          <label className="text-app-muted text-xs block mb-1">{ui.questionTopic}</label>
          <textarea className={inputCls} value={question} onChange={e => setQuestion(e.target.value)} placeholder={ui.questionPlaceholder} rows={2} />
        </div>

        <div className="mb-3">
          <label className="text-app-muted text-xs block mb-1">{ui.myWrongAnswer}</label>
          <textarea className={inputCls} value={wrongAns} onChange={e => setWrongAns(e.target.value)} placeholder={ui.wrongAnswerPlaceholder} rows={2} />
        </div>

        <div className="mb-3">
          <label className="text-app-muted text-xs block mb-1">{ui.correctAnswerLabel}</label>
          <textarea className={inputCls} value={correctAns} onChange={e => setCorrectAns(e.target.value)} placeholder={ui.correctAnswerPlaceholder} rows={2} />
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-app-muted text-xs">{ui.whyWrongLabel}</label>
            <button onClick={handleAIExplain} disabled={aiLoading || !question || !wrongAns || !correctAns}
              className="bg-app-blue/15 border border-app-blue/30 text-app-blue rounded-xl px-2.5 py-1 text-xs cursor-pointer disabled:opacity-50 hover:bg-app-blue/20 active:scale-95 transition-all">
              {aiLoading ? ui.aiThinking : ui.aiExplain}
            </button>
          </div>
          <textarea className={inputCls} value={whyWrong} onChange={e => setWhyWrong(e.target.value)} placeholder={ui.whyWrongPlaceholder} rows={2} />
        </div>

        <button onClick={() => setPublish(p => !p)}
          className={`w-full mb-4 rounded-xl py-2.5 text-sm cursor-pointer border transition-all ${publish ? 'bg-app-green/15 border-app-green text-app-green' : 'bg-app-card2 border-app-border text-app-muted hover:bg-white/[0.03]'}`}>
          {publish ? ui.publishToBazaar : ui.keepPrivate}
        </button>

        {err && <p className="text-app-red text-[13px] mb-3">{err}</p>}

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-app-orange text-white border-none rounded-2xl py-3.5 text-base font-extrabold cursor-pointer disabled:opacity-60 active:scale-[0.99] transition-all">
          {saving ? ui.savingBtn : ui.saveBhoolBtn}
        </button>
      </div>
    </div>
  )
}

// ── Publish confirm modal ─────────────────────────────────────
function PublishConfirmModal({ card, onClose, onPublished, ui }) {
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
        <div className="mb-3 flex justify-center"><Globe size={48} weight="duotone" className="text-app-muted" /></div>
        <h2 className="text-app-text mb-2 text-lg font-extrabold">{ui.shareYourBhool}</h2>
        <p className="text-app-muted text-sm mb-5">
          {ui.publishHelpsOthers} <strong className="text-app-orange">{ui.bhoolCoins}</strong>
        </p>
        <button onClick={handlePublish} disabled={publishing}
          className="w-full bg-app-orange text-white border-none rounded-2xl py-3 text-base font-extrabold cursor-pointer mb-2.5 disabled:opacity-60 active:scale-[0.99] transition-all">
          {publishing ? ui.publishingBtn : ui.yesPublish}
        </button>
        <button onClick={onClose}
          className="w-full bg-transparent border border-app-border text-app-muted rounded-2xl py-2.5 text-sm cursor-pointer hover:bg-white/[0.03] active:scale-[0.99] transition-all">
          {ui.keepPrivate}
        </button>
      </div>
    </div>
  )
}

// ── Main Tab ──────────────────────────────────────────────────
export default function BhoolBazaarTab({ profile, addXp }) {
  const navigate = useNavigate()
  const ui = li(getDisplayLang(profile))
  const TABS = getTabs(ui)
  const standardSubjects = SUBS[profile?.standard] || SUBS['Class 10'] || []
  const userSubjects = standardSubjects.length > 0 ? standardSubjects 
    : (profile?.subjects?.length ? profile.subjects : ['Mathematics', 'Science'])
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
      setErr(ui.couldNotLoadBazaar)
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
      setErr(ui.couldNotLoadCards)
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
      setErr(ui.couldNotLoadSaved)
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
      setErr(ui.couldNotLoadTop)
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
    if (!window.confirm(ui.deleteConfirm)) return
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
    <div className="h-full overflow-y-auto px-4 md:px-6 lg:px-8 pt-4 pb-6">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/app/practice')}
            className="w-9 h-9 rounded-xl bg-app-card border border-app-border flex items-center justify-center cursor-pointer hover:border-app-green/30 active:scale-95 transition-all">
            <CaretLeft size={18} weight="bold" className="text-app-text" />
          </button>
          <div className="flex-1">
            <h1 className="text-app-text m-0 text-[20px] font-extrabold">{ui.mistakeCards}</h1>
            <p className="text-app-muted text-[12px] mt-0.5 mb-0">{ui.turnMistakesIntoAssets}</p>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-br from-app-orange to-[#ff4e00] text-white border-none rounded-xl px-3.5 py-2 text-[13px] font-extrabold cursor-pointer shadow-[0_4px_20px_rgba(255,107,53,0.27)] active:scale-95 transition-all">
            {ui.newBhool}
          </button>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-2 flex-wrap mb-4 overflow-x-auto">
        {TABS.map(t => {
          const Icon = TAB_ICONS[t.key]
          return (
            <Pill key={t.key} active={activeTab === t.key} onClick={() => setActiveTab(t.key)}>
              <span className="flex items-center gap-1.5">{Icon && <Icon size={14} weight={activeTab === t.key ? 'fill' : 'regular'} />} {t.label}</span>
            </Pill>
          )
        })}
      </div>

      {/* Feed filters */}
      {activeTab === 'feed' && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
            className="bg-app-card2 border border-app-border text-app-text rounded-xl px-3 py-1.5 text-[13px] cursor-pointer outline-none">
            <option value="">{ui.allSubjects}</option>
            {userSubjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterSort} onChange={e => setFilterSort(e.target.value)}
            className="bg-app-card2 border border-app-border text-app-text rounded-xl px-3 py-1.5 text-[13px] cursor-pointer outline-none">
            <option value="recent">{ui.sortRecent}</option>
            <option value="coins">{ui.sortCoins}</option>
            <option value="collected">{ui.sortSaved}</option>
          </select>
        </div>
      )}

      {/* Error */}
      {err && (
        <div className="bg-app-red/10 border border-app-red/25 rounded-xl px-3.5 py-2.5 mb-3 text-app-red text-[13px]">{err}</div>
      )}

      {/* Empty states */}
      {!loading && activeTab === 'feed'  && feedCards.length  === 0 && (
        <EmptyState icon={Globe} title={ui.bazaarEmpty} subtitle={ui.bazaarEmpty} />
      )}
      {!loading && activeTab === 'mine'  && myCards.length    === 0 && (
        <EmptyState icon={ClipboardText} title={ui.noBhoolCards} subtitle={ui.tapNewBhool} />
      )}
      {!loading && activeTab === 'saved' && savedCards.length === 0 && (
        <EmptyState icon={BookmarkSimple} title={ui.nothingSaved} subtitle={ui.visitBazaarCollect} />
      )}
      {!loading && activeTab === 'top'   && topCards.length   === 0 && (
        <EmptyState icon={Trophy} title={ui.noTopCardsWeek} subtitle={ui.moreStudentsNeeded} />
      )}

      {/* Cards */}
      {activeTab === 'feed' && feedCards.map(card => (
        <MistakeCard
          key={card.id} card={card}
          onCollect={handleCollect}
          onReact={handleReact}
          ui={ui}
          lang={profile.language}
        />
      ))}

      {activeTab === 'mine' && myCards.map(card => (
        <MistakeCard
          key={card.id} card={card} isMine
          onPublish={handlePublish}
          onDelete={handleDelete}
          ui={ui}
          lang={profile.language}
        />
      ))}

      {activeTab === 'saved' && savedCards.map(card => (
        <MistakeCard
          key={card.id} card={card}
          onCollect={() => {}} onReact={handleReact}
          ui={ui}
          lang={profile.language}
        />
      ))}

      {activeTab === 'top' && <TopList cards={topCards} ui={ui} />}

      {/* Load more */}
      {activeTab === 'feed' && hasMore && !loading && feedCards.length > 0 && (
        <button onClick={() => loadFeed(false)}
          className="w-full mt-2 bg-app-card2 border border-app-border text-app-text rounded-2xl py-3 text-sm cursor-pointer hover:bg-white/[0.04] active:scale-[0.99] transition-all">
          {ui.loadMore}
        </button>
      )}

      {loading && (
        <div className="text-center text-app-muted py-6 text-sm">{ui.loading}</div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddBhoolModal
          profile={profile}
          ui={ui}
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
          ui={ui}
          onClose={() => setPublishCard(null)}
          onPublished={onPublished}
        />
      )}
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────
function EmptyState({ icon, title, subtitle }) {
  const EMPTY_ICONS = { feed: Globe, mine: ClipboardText, saved: BookmarkSimple, top: Trophy }
  const Icon = typeof icon === 'string' ? null : icon
  return (
    <div className="text-center py-12 px-6">
      <div className="mb-3 flex justify-center">{Icon ? <Icon size={56} weight="duotone" className="text-app-muted" /> : <span className="text-[56px]">{icon}</span>}</div>
      <h3 className="text-app-text m-0 mb-2">{title}</h3>
      <p className="text-app-muted text-sm m-0">{subtitle}</p>
    </div>
  )
}

// ── Top Cards leaderboard ──────────────────────────────────────
function TopList({ cards, ui }) {
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
          <h3 className="text-app-yellow text-[15px] mb-2.5 flex items-center gap-1.5"><Books size={16} weight="duotone" className="text-app-yellow" /> {subject}</h3>
          {subCards.map((c, i) => (
            <div key={c.id}
              className={`bg-app-card border rounded-2xl px-4 py-3 mb-2.5 flex items-start gap-3 ${i === 0 ? 'border-app-yellow/25' : 'border-app-border'}`}>
              <span className={`text-xl min-w-[28px] text-center ${i === 0 ? 'text-app-yellow' : i === 1 ? 'text-[#aaa]' : 'text-[#cd7f32]'}`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-app-text text-[13px] m-0 mb-1 font-semibold">{c.question}</p>
                <p className="text-app-muted text-[12px] m-0">{ui.byAuthor} {c.author_name} · <BookmarkSimple size={10} weight="fill" className="inline" /> {c.collect_count} {ui.savedCount} · <BhoolCoins count={c.bhool_coins || 0} /></p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
