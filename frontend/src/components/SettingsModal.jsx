import { useState, useEffect } from 'react'
import { BOARDS, LANGS, PLANS, getDisplayLang } from '../shared.js'
import { apiGetAiUsage } from '../api.js'
import { li } from '../i18n/index.js'
import UpgradePlanModal from './UpgradePlanModal.jsx'
import { GearSix, X, CheckCircle, XCircle, Clock, ArrowUp, Lock, Warning, Robot } from '@phosphor-icons/react'

const CLASSES = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)

// Reusable Tailwind classes
const inputClass = "w-full bg-app-card2 border border-white/10 rounded-xl py-2.5 px-3.5 text-app-text text-sm cursor-pointer font-[Sora,sans-serif]"
const labelClass = "block text-[11px] font-bold text-app-muted mb-1.5 tracking-wider"

// Maps plan → model label shown to student (read-only info)
const PLAN_MODEL_LABEL = {
  free:    'Llama 3 8B (Groq)',
  basic:   'Llama 3.3 70B (Groq / NVIDIA NIM)',
  pro:     'Your chosen model',
  premium: 'Your chosen model',
}

export default function SettingsModal({ onClose, onLogout, profile, onProfileSave }) {
  const [activeTab, setActiveTab] = useState('profile')
  const [showUpgrade, setShowUpgrade] = useState(false)
  
  // School students cannot edit their profile (only school admin can)
  const isSchoolStudent = !!profile?.school_id

  // i18n — use display language preference
  const ui = li(getDisplayLang(profile))

  // ── Usage state ──────────────────────────────────────────────
  const [usage, setUsage] = useState(null)
  const [usageLoading, setUsageLoading] = useState(false)

  // ── Profile edit state ───────────────────────────────────────
  const [pName, setPName]     = useState(profile?.name || "")
  const [pStd, setPStd]       = useState(profile?.standard || "Class 10")
  const [pBoard, setPBoard]   = useState(profile?.board || "CBSE")
  const [pLang, setPLang]     = useState(profile?.language || "English")
  const [pDisplayLang, setPDisplayLang] = useState(profile?.displayLanguage || "medium")  // "english" or "medium"
  const [pSchool, setPSchool] = useState(profile?.school || "")
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError]   = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  // Dynamic medium list based on board+standard
  const [mediumList, setMediumList] = useState(LANGS)

  useEffect(() => {
    const boardSlug = pBoard.toLowerCase().replace(/\s+/g, '-')
    const stdSlug   = pStd.toLowerCase().replace(/\s+/g, '-')
    fetch(`/api/curriculum/mediums?board=${encodeURIComponent(boardSlug)}&standard=${encodeURIComponent(stdSlug)}`, { signal: AbortSignal.timeout(5000) })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const meds = data.map(m => m.name)
          setMediumList(meds)
          if (!meds.includes(pLang)) setPLang(meds[0] || 'English')
        } else {
          setMediumList(LANGS)
        }
      })
      .catch(() => setMediumList(LANGS))
  }, [pBoard, pStd])

  const saveProfile = async () => {
    if (!isSchoolStudent && !pName.trim()) return
    setProfileError('')
    setProfileSaving(true)
    try {
      const updates = isSchoolStudent
        ? { displayLanguage: pDisplayLang }
        : { name: pName.trim(), standard: pStd, board: pBoard, language: pLang, displayLanguage: pDisplayLang, school: pSchool.trim() }
      await onProfileSave?.(updates)
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2000)
    } catch (e) {
      console.error('Save profile error:', e)
      setProfileError(e?.message || 'unknown')
      setTimeout(() => setProfileError(''), 5000)
    } finally {
      setProfileSaving(false)
    }
  }

  // Fetch usage when AI tab is active
  useEffect(() => {
    if (activeTab !== 'ai') return
    setUsageLoading(true)
    apiGetAiUsage()
      .then(data => { setUsage(data); setUsageLoading(false) })
      .catch(() => setUsageLoading(false))
  }, [activeTab])

  // ── Handle hardware/browser back button ──────────────────────
  useEffect(() => {
    // Push a state so back button can pop it
    window.history.pushState({ modal: 'settings' }, '')
    const handlePop = () => onClose()
    window.addEventListener('popstate', handlePop)
    return () => {
      window.removeEventListener('popstate', handlePop)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Close via X button: also go back in history to remove pushed state
  const handleClose = () => {
    window.history.back()
  }

  return (
    <>
    <div className="fixed inset-0 bg-black/75 z-[999] flex items-end justify-center" onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="w-full max-w-[480px] bg-[#0e0e20] rounded-t-[20px] border border-app-border max-h-[92dvh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Handle */}
        <div className="flex justify-center py-3 pb-1">
          <div className="w-9 h-1 rounded-sm bg-white/10" />
        </div>

        <div className="px-[18px] pt-2">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h2 className="text-[17px] font-extrabold text-app-text flex items-center gap-2"><GearSix size={18} weight="duotone" /> {ui.settings}</h2>
            </div>
            <button onClick={handleClose} className="bg-transparent border-none text-app-muted cursor-pointer font-[Sora,sans-serif]"><X size={20} /></button>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-app-card rounded-xl p-1 mb-[18px] border border-app-border gap-1">
            {[["profile", ui.profileTab || 'Profile'], ["ai", ui.aiUsageTab || 'AI Usage'], ["plan", ui.planTab || 'Plan']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 border-none rounded-[9px] py-2 px-2 text-xs cursor-pointer font-[Sora,sans-serif] ${
                  activeTab === key 
                    ? 'bg-gradient-to-br from-app-green to-emerald-500 font-extrabold text-app-bg' 
                    : 'bg-transparent font-medium text-app-muted'
                }`}
              >{label}</button>
            ))}
          </div>

          {/* ── Profile Edit tab ── */}
          {activeTab === "profile" && (
            <div className="flex flex-col gap-3.5">
              {isSchoolStudent && (
                <div className="bg-app-blue/10 border border-app-blue/30 rounded-xl p-3 text-[12px] text-app-muted">
                  🏫 Your profile is managed by <span className="font-bold text-app-text">{profile.school || 'your school'}</span>. Contact your school admin to update details.
                </div>
              )}
              <div>
                <label className={labelClass}>{ui.yourName}</label>
                <input className={inputClass} type="text" value={pName} onChange={e => setPName(e.target.value)} placeholder={ui.namePlaceholder} disabled={isSchoolStudent} style={isSchoolStudent ? { opacity: 0.6 } : {}} />
              </div>
              <div>
                <label className={labelClass}>{ui.classLabel}</label>
                <select className={inputClass} value={pStd} onChange={e => setPStd(e.target.value)} disabled={isSchoolStudent} style={isSchoolStudent ? { opacity: 0.6 } : {}}>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>{ui.boardLabel}</label>
                <select className={inputClass} value={pBoard} onChange={e => setPBoard(e.target.value)} disabled={isSchoolStudent} style={isSchoolStudent ? { opacity: 0.6 } : {}}>
                  {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>{ui.languageLabel}</label>
                <select className={inputClass} value={pLang} onChange={e => setPLang(e.target.value)} disabled={isSchoolStudent} style={isSchoolStudent ? { opacity: 0.6 } : {}}>
                  {mediumList.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>{ui.displayLanguageLabel}</label>
                <select className={inputClass} value={pDisplayLang} onChange={e => setPDisplayLang(e.target.value)}>
                  <option value="english">{ui.displayLangEnglish}</option>
                  <option value="medium">{ui.displayLangMedium} ({pLang})</option>
                </select>
              </div>
              {!isSchoolStudent && (
                <div>
                  <label className={labelClass}>{ui.schoolName}</label>
                  <input className={inputClass} type="text" value={pSchool} onChange={e => setPSchool(e.target.value)} placeholder={ui.schoolPlaceholder} maxLength={100} />
                </div>
              )}
              <button onClick={saveProfile} disabled={profileSaving || (isSchoolStudent && pDisplayLang === (profile?.displayLanguage || 'medium'))} className="w-full bg-gradient-to-br from-app-green to-emerald-500 text-app-bg border-none rounded-xl py-3 px-4 text-sm font-extrabold cursor-pointer font-[Sora,sans-serif] disabled:opacity-60">
                {profileSaving ? 'Saving...' : profileSaved ? <><CheckCircle size={14} weight="fill" className="inline" /> {ui.saved}</> : profileError ? <><XCircle size={14} weight="fill" className="inline" /> {ui.saveFailed}</> : ui.saveProfile}
              </button>
              {profileError && <p className="text-app-red text-[11px] mt-1 mb-0">{profileError}</p>}
            </div>
          )}

          {/* ── Plan tab ── */}
          {activeTab === "plan" && (() => {
            const userPlan = profile?.plan || 'free'
            const planOrder = ['free', 'basic', 'pro', 'premium']
            const currentPlanInfo = PLANS[userPlan] || PLANS.free
            return (
              <div className="flex flex-col gap-4">
                {/* Current plan card */}
                <div 
                  className="rounded-2xl p-5 flex items-center gap-3.5"
                  style={{ background: `${currentPlanInfo.color}15`, border: `2px solid ${currentPlanInfo.color}50` }}
                >
                  <span className="text-4xl">{currentPlanInfo.icon}</span>
                  <div>
                    <div className="text-lg font-black" style={{ color: currentPlanInfo.color }}>{currentPlanInfo.label}</div>
                    <div className="text-xs text-app-muted mt-0.5">{ui.yourCurrentPlan}</div>
                    {profile?.plan_expires_at && (
                      <div className="text-[11px] text-app-yellow mt-1 flex items-center gap-1">
                        <Clock size={11} weight="fill" /> {ui.expires}: {new Date(profile.plan_expires_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Feature comparison */}
                <div className="flex flex-col gap-2">
                  {planOrder.map(p => {
                    const info = PLANS[p]
                    const isActive = p === userPlan
                    const isLocked = planOrder.indexOf(p) > planOrder.indexOf(userPlan)
                    return (
                      <div 
                        key={p} 
                        className="rounded-[14px] py-3.5 px-4"
                        style={{
                          background: isActive ? `${info.color}10` : '#0b0b1c',
                          border: `1.5px solid ${isActive ? info.color + '50' : '#ffffff08'}`,
                          opacity: isLocked ? 0.55 : 1,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-lg">{info.icon}</span>
                          <span className="text-sm font-extrabold" style={{ color: isActive ? info.color : '#eeeeff' }}>{info.label}</span>
                          {isActive && <span className="ml-auto text-[10px] font-bold rounded-md py-0.5 px-2" style={{ color: info.color, background: `${info.color}20` }}>{ui.active}</span>}
                        </div>
                        <div className="text-[11px] text-app-muted leading-relaxed">
                          {ui.tabsLabel}: {info.tabs.join(" · ")}
                        </div>
                        {info.labs.length > 0 && (
                          <div className="text-[11px] text-app-muted mt-0.5">
                            {ui.labsLabel}: {info.labs.join(" · ")}
                          </div>
                        )}
                        <div className="text-[11px] text-app-muted mt-0.5">
                          {ui.aiCallsPerDay}: {info.aiCallsPerDay === Infinity ? ui.unlimited : info.aiCallsPerDay}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[11px] text-app-muted text-center m-0">
                  {ui.contactToUpgrade}
                </p>
                {profile?.plan !== 'premium' && (
                  <button
                    onClick={() => setShowUpgrade(true)}
                    className="w-full py-3 rounded-[14px] mt-1 bg-gradient-to-br from-app-green to-app-blue border-none text-app-bg text-sm font-black cursor-pointer font-[Sora,sans-serif]"
                  >
                    <ArrowUp size={14} weight="bold" className="inline" /> {ui.upgradePlan}
                  </button>
                )}
              </div>
            )
          })()}

          {/* ── AI tab ── */}
          {activeTab === "ai" && (() => {
            const userPlan = profile?.plan || 'free'
            const planInfo = PLANS[userPlan] || PLANS.free
            const used  = usage?.today_calls || 0
            const limit = usage?.daily_limit  || planInfo.aiCallsPerDay || 10
            const remaining = Math.max(0, limit - used)
            const pct = Math.min(100, limit > 0 ? Math.round((used / limit) * 100) : 0)
            const barColor = pct >= 90 ? '#FF6B6B' : pct >= 70 ? '#FFD166' : '#00E5A0'
            return (
              <div className="flex flex-col gap-4">

                {/* Managed AI notice */}
                <div className="bg-app-green/5 border border-app-green/20 rounded-[14px] py-3.5 px-4 flex items-center gap-3">
                  <Lock size={28} weight="duotone" className="text-app-green shrink-0" />
                  <div>
                    <div className="text-[13px] font-extrabold text-app-green">{ui.aiManagedTitle}</div>
                    <div className="text-[11px] text-app-muted mt-0.5 leading-relaxed">
                      {ui.aiManagedDesc}
                    </div>
                  </div>
                </div>

                {/* Today's usage meter */}
                <div className="bg-app-card border border-app-border rounded-[14px] py-4 px-[18px]">
                  <div className="text-[11px] font-bold text-app-muted mb-3 tracking-wider">{ui.todaysAiCalls}</div>
                  {usageLoading ? (
                    <div className="text-xs text-app-muted">{ui.loading}</div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1.5 mb-2.5">
                        <span className="text-2xl sm:text-[32px] font-black" style={{ color: barColor }}>{used}</span>
                        <span className="text-sm text-app-muted">/ {limit === Infinity ? '∞' : limit} {ui.calls}</span>
                      </div>
                      <div className="h-2 rounded bg-app-card2 overflow-hidden mb-2">
                        <div 
                          className="h-full rounded transition-[width] duration-400"
                          style={{ width: `${pct}%`, background: barColor }}
                        />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[11px] text-app-muted">
                          {remaining} {ui.remainingToday}
                        </span>
                        {usage?.today_tokens > 0 && (
                          <span className="text-[11px] text-app-muted">
                            ~{((usage.today_tokens) / 1000).toFixed(1)}K {ui.tokensUsed}
                          </span>
                        )}
                      </div>
                      {pct >= 90 && (
                        <div className="mt-2.5 text-xs text-app-red bg-app-red/10 rounded-lg py-2 px-2.5 leading-relaxed">
                          <Warning size={12} weight="fill" className="inline" /> {ui.dailyLimitWarning}
                          {userPlan !== 'premium' && ` ${ui.upgradeForMore}`}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Active model info */}
                <div className="bg-app-card border border-app-border rounded-[14px] py-3.5 px-4 flex items-center gap-3">
                  <Robot size={22} weight="duotone" className="text-app-blue shrink-0" />
                  <div>
                    <div className="text-[11px] font-bold text-app-muted mb-0.5">{ui.yourAiModel}</div>
                    <div className="text-[13px] font-bold text-app-text">
                      {PLAN_MODEL_LABEL[userPlan] || ui.autoSelected}
                    </div>
                    <div className="text-[11px] text-app-muted mt-0.5">
                      {ui.assignedByPlan} {planInfo.icon} {planInfo.label} {ui.plan}
                    </div>
                  </div>
                </div>

                {/* Monthly usage */}
                {usage?.month_calls > 0 && (
                  <div className="bg-app-card border border-app-border rounded-[14px] py-3.5 px-4">
                    <div className="text-[11px] font-bold text-app-muted mb-2.5 tracking-wider">{ui.thisMonth}</div>
                    <div className="flex gap-5">
                      <div>
                        <div className="text-lg font-black text-app-blue">{usage.month_calls}</div>
                        <div className="text-[10px] text-app-muted">{ui.totalCalls}</div>
                      </div>
                      <div>
                        <div className="text-lg font-black text-app-blue">
                          {((usage.month_tokens || 0) / 1000).toFixed(1)}K
                        </div>
                        <div className="text-[10px] text-app-muted">{ui.tokens}</div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )
          })()}
        </div>


      </div>
    </div>

    {showUpgrade && (
      <UpgradePlanModal
        profile={profile}
        onClose={() => setShowUpgrade(false)}
        onUpgraded={(plan) => {
          // Refresh the page to reflect new plan — simplest approach
          setTimeout(() => window.location.reload(), 1500)
        }}
      />
    )}
    </>
  )
}

