import { useState, useEffect } from 'react'
import { BOARDS, LANGS, SUBS } from '../shared.js'
import { getDeviceId, apiCreateProfile, apiApplyReferralCode } from '../api.js'
import { li } from '../i18n/index.js'

const CLASSES = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)

// ── Curriculum API helpers ────────────────────────────────────
async function fetchBoards() {
  try {
    const res = await fetch('/api/curriculum/boards', { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) return data.map(b => b.name)
    }
  } catch {}
  return BOARDS // fallback
}

async function fetchMediums(board, standard) {
  // Convert display names to slugs for API
  const boardSlug = board.toLowerCase().replace(/\s+/g, '-')
  const stdSlug   = standard.toLowerCase().replace(/\s+/g, '-')
  try {
    const res = await fetch(
      `/api/curriculum/mediums?board=${encodeURIComponent(boardSlug)}&standard=${encodeURIComponent(stdSlug)}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) return data.map(m => m.name)
    }
  } catch {}
  return LANGS // fallback
}

async function fetchSubjects(board, standard, medium) {
  const boardSlug  = board.toLowerCase().replace(/\s+/g, '-')
  const stdSlug    = standard.toLowerCase().replace(/\s+/g, '-')
  const mediumSlug = medium.toLowerCase().replace(/\s+/g, '-')
  try {
    const res = await fetch(
      `/api/curriculum/subjects?board=${encodeURIComponent(boardSlug)}&standard=${encodeURIComponent(stdSlug)}&medium=${encodeURIComponent(mediumSlug)}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.subjects) && data.subjects.length > 0) return data.subjects
    }
  } catch {}
  return SUBS[standard] || [] // fallback
}

// Tailwind class constants for reuse
const inputClass = "w-full bg-app-card2 border border-white/10 rounded-xl py-3 px-3.5 text-app-text text-sm outline-none focus:ring-1 focus:ring-app-green/50"
const selectClass = "w-full bg-app-card2 border border-white/10 rounded-xl py-3 px-3.5 text-app-text text-sm outline-none cursor-pointer focus:ring-1 focus:ring-app-green/50"

export default function Onboard({ onComplete }) {
  const [step, setStep]           = useState(1)
  const [name, setName]           = useState("")
  const [mobile, setMobile]       = useState("")
  const [parent, setParent]       = useState("")
  const [standard, setStd]        = useState("Class 10")
  const [board, setBoard]         = useState("CBSE")
  const [language, setLang]       = useState("English")
  const [subjects, setSubs]       = useState([])
  const [saving, setSaving]       = useState(false)
  const [refCode, setRefCode]     = useState('')
  const [refMsg, setRefMsg]       = useState('')

  // Dynamic lists from API (with static fallbacks)
  const [boardList,   setBoardList]   = useState(BOARDS)
  const [mediumList,  setMediumList]  = useState(LANGS)
  const [subjectList, setSubjectList] = useState([])
  const [loadingSubs, setLoadingSubs] = useState(false)

  // Load boards once on mount
  useEffect(() => {
    fetchBoards().then(setBoardList)
  }, [])

  // When board or standard changes → refresh mediums + subjects
  useEffect(() => {
    fetchMediums(board, standard).then(meds => {
      setMediumList(meds)
      // If current language is not in new list, pick first available
      if (!meds.includes(language)) setLang(meds[0] || "English")
    })
  }, [board, standard])

  // When board, standard, or language (medium) changes → refresh subjects
  useEffect(() => {
    setLoadingSubs(true)
    fetchSubjects(board, standard, language).then(subs => {
      setSubjectList(subs)
      setSubs([...subs]) // auto-select all
      setLoadingSubs(false)
    })
  }, [board, standard, language])

  const toggleSub = s => setSubs(prev =>
    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
  )

  const selectAll = () => setSubs([...subjectList])

  const goStep2 = () => {
    if (!name.trim()) { alert("Please enter your name"); return }
    setStep(2)
  }

  const goStep3 = () => {
    if (!subjects.length) setSubs([...subjectList])
    setStep(3)
  }

  const finish = async () => {
    const finalSubs = subjects.length ? subjects : subjectList
    const profileData = { name: name.trim(), standard, board, language, subjects: finalSubs }
    setSaving(true)
    try {
      const deviceId = getDeviceId()
      await apiCreateProfile({
        id: deviceId,
        name: name.trim(),
        mobile: mobile.trim(),
        parent_mobile: parent.trim(),
        standard,
        board,
        language,
        subjects: finalSubs,
      })
    } catch {
      // Backend save failed — app continues, user can retry from Settings
    }
    // Apply referral code if provided
    if (refCode.trim()) {
      try {
        const r = await apiApplyReferralCode(refCode.trim().toUpperCase())
        setRefMsg(r.message || '✅ Referral applied!')
      } catch (err) {
        setRefMsg(err?.message || 'Invalid referral code')
      }
      // Short pause so user can see the message
      await new Promise(r => setTimeout(r, 800))
    }
    setSaving(false)
    onComplete(profileData)
  }

  const ui = li(language)

  return (
    <div className="w-full max-w-[480px] min-h-screen bg-app-bg flex flex-col">
      {/* Progress bar */}
      <div className="h-[3px] bg-white/10 w-full">
        <div 
          className="h-full bg-gradient-to-r from-app-green to-emerald-400 transition-[width] duration-400"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-10 pt-7">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1,2,3].map(s => (
            <div 
              key={s} 
              className={`h-2 rounded transition-all duration-300 ${
                s <= step ? 'bg-app-green' : 'bg-white/10'
              } ${s === step ? 'w-7' : 'w-2'}`}
            />
          ))}
          <span className="ml-1 text-xs text-app-muted">
            Step {step} of 3
          </span>
        </div>

        {/* ── Step 1: Personal Details ── */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-[22px] font-extrabold text-app-text mb-1">
                {ui.welcome} 👋
              </h2>
              <p className="text-sm text-app-muted">{ui.setupProfile}</p>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-app-muted font-semibold mb-1.5 block">{ui.yourName} *</label>
                <input
                  className={inputClass}
                  type="text"
                  placeholder={ui.namePlaceholder}
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-app-muted font-semibold mb-1.5 block">{ui.yourMobile}</label>
                <input
                  className={inputClass}
                  type="tel"
                  placeholder={ui.mobilePlaceholder}
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  maxLength={10}
                />
              </div>

              <div>
                <label className="text-xs text-app-muted font-semibold mb-1.5 block">{ui.parentMobile}</label>
                <input
                  className={inputClass}
                  type="tel"
                  placeholder={ui.parentMobilePlaceholder}
                  value={parent}
                  onChange={e => setParent(e.target.value)}
                  maxLength={10}
                />
              </div>

              <div>
                <label className="text-xs text-app-muted font-semibold mb-1.5 block">{ui.classLabel}</label>
                <select className={selectClass} value={standard} onChange={e => setStd(e.target.value)}>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-app-muted font-semibold mb-1.5 block">{ui.boardLabel}</label>
                <select className={selectClass} value={board} onChange={e => setBoard(e.target.value)}>
                  {boardList.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-app-muted font-semibold mb-1.5 block">{ui.languageLabel}</label>
                <select className={selectClass} value={language} onChange={e => setLang(e.target.value)}>
                  {mediumList.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <div className="mt-2 py-2 px-3 bg-app-green/15 border border-app-green/30 rounded-lg text-xs text-app-green">
                  ✓ {ui.aiInLanguage.replace('{language}', language)}
                </div>
              </div>
            </div>

            <button onClick={goStep2} className="w-full py-3 rounded-xl border-none bg-gradient-to-br from-app-green to-emerald-400 text-app-bg font-extrabold text-sm cursor-pointer">
              {ui.next}
            </button>
          </div>
        )}

        {/* ── Step 2: Subject Selection ── */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-[22px] font-extrabold text-app-text mb-1">
                {ui.pickSubjects} 📚
              </h2>
              <p className="text-sm text-app-muted">
                {standard} • {board} • {language}
              </p>
            </div>

            <button
              onClick={selectAll}
              className="bg-transparent border border-app-green rounded-xl py-2 px-3.5 text-app-green text-sm font-bold cursor-pointer w-fit"
            >
              ✓ {ui.selectAll}
            </button>

            {loadingSubs ? (
              <p className="text-sm text-app-muted">{ui.loadingSubjects}</p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {subjectList.map(s => {
                  const selected = subjects.includes(s)
                  return (
                    <button
                      key={s}
                      onClick={() => toggleSub(s)}
                      className={`rounded-xl py-2 px-3.5 text-sm cursor-pointer transition-all ${
                        selected 
                          ? 'bg-app-green/20 border-[1.5px] border-app-green text-app-green font-bold'
                          : 'bg-app-card border-[1.5px] border-app-border text-app-text font-medium'
                      }`}
                    >
                      {selected ? "✓ " : ""}{s}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="flex gap-2.5">
              <button onClick={() => setStep(1)} className="bg-transparent border border-white/10 rounded-xl py-3 px-4 text-sm font-semibold text-app-text cursor-pointer">
                ← {ui.back}
              </button>
              <button onClick={goStep3} className="flex-1 py-3 rounded-xl border-none bg-gradient-to-br from-app-green to-emerald-400 text-app-bg font-extrabold text-sm cursor-pointer">
                {ui.next}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirmation ── */}
        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-[22px] font-extrabold text-app-text mb-1">
                {ui.allSet.replace('{name}', name)} 🎉
              </h2>
              <p className="text-sm text-app-muted">{ui.tutorReady}</p>
            </div>

            {/* Profile Summary */}
            <div className="bg-app-card border border-app-border rounded-xl p-4 flex flex-col gap-2.5">
              {[
                ["🎓", ui.classLabel, standard],
                ["📋", ui.boardLabel, board],
                ["🌐", ui.languageLabel, language],
                ["📚", ui.subjectsLabel, (subjects.length ? subjects : subjectList).join(", ")],
              ].map(([icon, label, value]) => (
                <div key={label} className="flex gap-2.5 items-start">
                  <span>{icon}</span>
                  <div>
                    <div className="text-[11px] text-app-muted font-semibold">{label}</div>
                    <div className="text-sm text-app-text font-medium">{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Features list */}
            <div className="flex flex-col gap-2">
              <p className="text-xs text-app-muted font-semibold">{ui.whatsAvailable}</p>
              {[
                `🏠 ${ui.featureDailyBrief}`,
                `📖 ${ui.featureAiNotes}`,
                `🤖 ${ui.featureTutor}`,
                `🎬 ${ui.featureVideos}`,
                `🎤 ${ui.featurePodcast}`,
                `🎯 ${ui.featureQuiz}`,
                `✍️ ${ui.featureEssay}`,
                `🧘 ${ui.featureWellness}`,
              ].map(f => (
                <div key={f} className="text-sm text-app-text flex items-center gap-1.5">{f}</div>
              ))}
            </div>

            {/* Referral code */}
            <div className="bg-app-card border border-app-border rounded-xl p-4">
              <div className="text-xs text-app-muted font-bold mb-2">{ui.gotReferralCode}</div>
              <input
                className={inputClass}
                type="text"
                placeholder={ui.referralPlaceholder}
                value={refCode}
                onChange={e => setRefCode(e.target.value.toUpperCase())}
                maxLength={10}
              />
              {refMsg && (
                <div className={`text-xs mt-1.5 ${refMsg.startsWith('✅') ? 'text-app-green' : 'text-app-red'}`}>
                  {refMsg}
                </div>
              )}
              <div className="text-[11px] text-app-muted mt-1.5">{ui.referralBonus}</div>
            </div>

            <div className="flex gap-2.5">
              <button onClick={() => setStep(2)} className="bg-transparent border border-white/10 rounded-xl py-3 px-4 text-sm font-semibold text-app-text cursor-pointer">
                ← {ui.back}
              </button>
              <button
                onClick={finish}
                disabled={saving}
                className={`flex-1 py-3 rounded-xl border-none bg-gradient-to-br from-app-green to-emerald-400 text-app-bg font-extrabold text-sm cursor-pointer ${saving ? 'opacity-60' : ''}`}
              >
                {saving ? `${ui.saving}...` : ui.start}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
