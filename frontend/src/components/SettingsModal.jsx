import { useState, useEffect } from 'react'
import { BOARDS, LANGS, PLANS, getDisplayLang } from '../shared.js'
import { apiGetParentPin, apiCreateParentPin, apiRevokeParentPin, apiGetMyReferralCode } from '../api.js'
import { li } from '../i18n/index.js'
import UpgradePlanModal from './UpgradePlanModal.jsx'

const CLASSES = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)

// Reusable Tailwind classes
const inputClass = "w-full bg-app-card2 border border-white/10 rounded-xl py-2.5 px-3.5 text-app-text text-sm cursor-pointer font-[Sora,sans-serif]"
const labelClass = "block text-[11px] font-bold text-app-muted mb-1.5 tracking-wider"

// Maps plan → model label shown to student (read-only info)
const PLAN_MODEL_LABEL = {
  free:    'Llama 3 8B (Groq)',
  basic:   'Llama 3.3 70B (Groq)',
  pro:     'Your chosen model',
  premium: 'Your chosen model',
}

export default function SettingsModal({ config, savedKeys = {}, onSave, onClose, profile, onProfileSave }) {
  const [activeTab, setActiveTab] = useState('ai')
  const [showUpgrade, setShowUpgrade] = useState(false)

  // i18n — use display language preference
  const ui = li(getDisplayLang(profile))

  // ── Referral state ───────────────────────────────────────
  const [referral, setReferral] = useState(null)
  const [refCopied, setRefCopied] = useState(false)

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

  // ── Parent PIN state ─────────────────────────────────────────
  const [parentPin,     setParentPin]     = useState(null)
  const [parentExpires, setParentExpires] = useState(null)
  const [pinLoading,    setPinLoading]    = useState(false)
  const [pinCopied,     setPinCopied]     = useState(false)

  const saveProfile = () => {
    if (!pName.trim()) return
    onProfileSave?.({ name: pName.trim(), standard: pStd, board: pBoard, language: pLang, displayLanguage: pDisplayLang, school: pSchool.trim() })
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }

  // Fetch usage when AI tab is active
  useEffect(() => {
    if (activeTab === 'profile') {
      apiGetParentPin()
        .then(r => { setParentPin(r.pin); setParentExpires(r.expires_at) })
        .catch(() => {})
      apiGetMyReferralCode()
        .then(setReferral)
        .catch(() => {})
    }
  }, [activeTab])

  // Fetch usage when AI tab is active
  useEffect(() => {
    if (activeTab !== 'ai') return
    setUsageLoading(true)
    const token = localStorage.getItem('eduvyai_token')
    fetch('/api/ai/usage', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(5000),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { setUsage(data); setUsageLoading(false) })
      .catch(() => setUsageLoading(false))
  }, [activeTab])

  return (
    <>
    <div className="fixed inset-0 bg-black/75 z-[999] flex items-end justify-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[480px] bg-[#0e0e20] rounded-t-[20px] border border-app-border max-h-[92vh] overflow-y-auto pb-6">
        {/* Handle */}
        <div className="flex justify-center py-3 pb-1">
          <div className="w-9 h-1 rounded-sm bg-white/10" />
        </div>

        <div className="px-[18px] pt-2">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h2 className="text-[17px] font-extrabold text-app-text">⚙️ {ui.settings}</h2>
            </div>
            <button onClick={onClose} className="bg-transparent border-none text-app-muted text-xl cursor-pointer font-[Sora,sans-serif]">✕</button>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-app-card rounded-xl p-1 mb-[18px] border border-app-border gap-1">
            {[["ai", ui.aiTab], ["profile", ui.profileTab], ["plan", ui.planTab]].map(([key, label]) => (
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
              <div>
                <label className={labelClass}>{ui.yourName}</label>
                <input className={inputClass} type="text" value={pName} onChange={e => setPName(e.target.value)} placeholder={ui.namePlaceholder} />
              </div>
              <div>
                <label className={labelClass}>{ui.classLabel}</label>
                <select className={inputClass} value={pStd} onChange={e => setPStd(e.target.value)}>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>{ui.boardLabel}</label>
                <select className={inputClass} value={pBoard} onChange={e => setPBoard(e.target.value)}>
                  {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>{ui.languageLabel}</label>
                <select className={inputClass} value={pLang} onChange={e => setPLang(e.target.value)}>
                  {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>{ui.displayLanguageLabel}</label>
                <select className={inputClass} value={pDisplayLang} onChange={e => setPDisplayLang(e.target.value)}>
                  <option value="english">{ui.displayLangEnglish}</option>
                  <option value="medium">{ui.displayLangMedium} ({pLang})</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>{ui.schoolName}</label>
                <input className={inputClass} type="text" value={pSchool} onChange={e => setPSchool(e.target.value)} placeholder={ui.schoolPlaceholder} maxLength={100} />
              </div>
              <button onClick={saveProfile} className="w-full bg-gradient-to-br from-app-green to-emerald-500 text-app-bg border-none rounded-xl py-3 px-4 text-sm font-extrabold cursor-pointer font-[Sora,sans-serif]">
                {profileSaved ? `✅ ${ui.saved}` : ui.saveProfile}
              </button>

              {/* ── Refer Friends ── */}
              <div className="mt-2 bg-app-blue/5 border border-app-blue/20 rounded-[14px] p-4">
                <div className="font-bold text-app-blue text-sm mb-1.5">
                  {ui.referFriends}
                </div>
                <p className="text-app-muted text-xs m-0 mb-3">
                  {ui.referDescription}
                </p>
                {referral ? (
                  <div className="flex items-center gap-2.5 bg-app-card2 rounded-[10px] py-2.5 px-3.5">
                    <div className="flex-1">
                      <div className="text-app-muted text-[10px] mb-0.5">{ui.yourReferralCode}</div>
                      <div className="font-mono text-xl font-black text-app-blue tracking-[4px]">
                        {referral.code}
                      </div>
                      {referral.referred_count > 0 && (
                        <div className="text-app-green text-[11px] mt-0.5">
                          ✓ {referral.referred_count} {ui.friendsJoined}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const shareText = `Join VidyAI — AI tutor in your language! Use my code ${referral.code} to get +200 XP bonus. ${window.location.origin}`
                        if (navigator.share) {
                          navigator.share({ title: 'Join VidyAI', text: shareText }).catch(() => {})
                        } else {
                          navigator.clipboard?.writeText(shareText)
                          setRefCopied(true)
                          setTimeout(() => setRefCopied(false), 2000)
                        }
                      }}
                      className={`rounded-[10px] py-1.5 px-3 text-xs cursor-pointer font-bold ${refCopied ? 'bg-app-green/15 border border-app-green/30 text-app-green' : 'bg-app-blue/15 border border-app-blue/30 text-app-blue'}`}
                    >{refCopied ? `✅ ${ui.copied}` : `📲 ${ui.share}`}</button>
                  </div>
                ) : (
                  <div className="text-app-muted text-xs">{ui.loading}...</div>
                )}
              </div>

              {/* ── Share with Parent ── */}
              <div className="mt-2 bg-app-green/5 border border-app-green/20 rounded-[14px] p-4">
                <div className="font-bold text-app-green text-sm mb-1.5">
                  👨‍👩‍👦 {ui.shareWithParent}
                </div>
                <p className="text-app-muted text-xs m-0 mb-3">
                  {ui.parentPinDescription}
                </p>
                {parentPin ? (
                  <>
                    <div className="bg-app-card2 rounded-[10px] py-2.5 px-3.5 flex items-center justify-between mb-2">
                      <div>
                        <div className="text-app-muted text-[10px] mb-0.5">{ui.parentLink}</div>
                        <div className="font-mono text-base font-black text-app-yellow tracking-[3px]">{parentPin}</div>
                        <div className="text-app-muted text-[10px] mt-0.5">
                          {window.location.origin}/parent/{parentPin}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(`${window.location.origin}/parent/${parentPin}`)
                          setPinCopied(true)
                          setTimeout(() => setPinCopied(false), 2000)
                        }}
                        className={`rounded-[10px] py-1.5 px-3 text-xs cursor-pointer ${pinCopied ? 'bg-app-green/15 border border-app-green text-app-green' : 'bg-app-card border border-app-border text-app-text'}`}
                      >{pinCopied ? `✅ ${ui.copied}` : `📋 ${ui.copy}`}</button>
                    </div>
                    {parentExpires && (
                      <div className="text-app-muted text-[11px] mb-2">
                        ⏰ {ui.validUntil} {new Date(parentExpires).toLocaleDateString()}
                      </div>
                    )}
                    <button
                      disabled={pinLoading}
                      onClick={async () => {
                        setPinLoading(true)
                        try {
                          const r = await apiRevokeParentPin()
                          if (r.revoked) { setParentPin(null); setParentExpires(null) }
                        } finally { setPinLoading(false) }
                      }}
                      className="w-full bg-app-red/10 border border-app-red/20 text-app-red rounded-[10px] py-1.5 px-3.5 text-xs cursor-pointer"
                    >{pinLoading ? `${ui.revoking}...` : `🗑 ${ui.revokeAccess}`}</button>
                  </>
                ) : (
                  <button
                    disabled={pinLoading}
                    onClick={async () => {
                      setPinLoading(true)
                      try {
                        const r = await apiCreateParentPin()
                        setParentPin(r.pin); setParentExpires(r.expires_at)
                      } finally { setPinLoading(false) }
                    }}
                    className="w-full bg-app-green/15 border border-app-green/30 text-app-green rounded-[10px] py-2.5 text-sm font-bold cursor-pointer"
                  >{pinLoading ? `${ui.generating}...` : `🔗 ${ui.generateParentLink}`}</button>
                )}
              </div>
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
                      <div className="text-[11px] text-app-yellow mt-1">
                        ⏰ Expires: {profile.plan_expires_at}
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
                          Tabs: {info.tabs.join(" · ")}
                        </div>
                        {info.labs.length > 0 && (
                          <div className="text-[11px] text-app-muted mt-0.5">
                            Labs: {info.labs.join(" · ")}
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
                    ⬆️ {ui.upgradePlan}
                  </button>
                )}
              </div>
            )
          })()}

          {/* ── AI tab ── */}
          {activeTab === "ai" && (() => {
            const userPlan = profile?.plan || 'free'
            const planInfo = PLANS[userPlan] || PLANS.free
            const used  = usage?.today?.calls || 0
            const limit = usage?.daily_quota  || planInfo.aiCallsPerDay || 10
            const remaining = usage?.today?.remaining ?? Math.max(0, limit - used)
            const pct = Math.min(100, limit > 0 ? Math.round((used / limit) * 100) : 0)
            const barColor = pct >= 90 ? '#FF6B6B' : pct >= 70 ? '#FFD166' : '#00E5A0'
            return (
              <div className="flex flex-col gap-4">

                {/* Managed AI notice */}
                <div className="bg-app-green/5 border border-app-green/20 rounded-[14px] py-3.5 px-4 flex items-center gap-3">
                  <span className="text-[28px] shrink-0">🔐</span>
                  <div>
                    <div className="text-[13px] font-extrabold text-app-green">AI Managed by Eduvy-AI</div>
                    <div className="text-[11px] text-app-muted mt-0.5 leading-relaxed">
                      Everything is handled on our servers. No API keys needed.
                    </div>
                  </div>
                </div>

                {/* Today's usage meter */}
                <div className="bg-app-card border border-app-border rounded-[14px] py-4 px-[18px]">
                  <div className="text-[11px] font-bold text-app-muted mb-3 tracking-wider">TODAY'S AI CALLS</div>
                  {usageLoading ? (
                    <div className="text-xs text-app-muted">Loading…</div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1.5 mb-2.5">
                        <span className="text-[32px] font-black" style={{ color: barColor }}>{used}</span>
                        <span className="text-sm text-app-muted">/ {limit === Infinity ? '∞' : limit} calls</span>
                      </div>
                      <div className="h-2 rounded bg-app-card2 overflow-hidden mb-2">
                        <div 
                          className="h-full rounded transition-[width] duration-400"
                          style={{ width: `${pct}%`, background: barColor }}
                        />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[11px] text-app-muted">
                          {remaining} remaining today
                        </span>
                        {usage?.today?.tokens > 0 && (
                          <span className="text-[11px] text-app-muted">
                            ~{((usage.today.tokens) / 1000).toFixed(1)}K tokens used
                          </span>
                        )}
                      </div>
                      {pct >= 90 && (
                        <div className="mt-2.5 text-xs text-app-red bg-app-red/10 rounded-lg py-2 px-2.5 leading-relaxed">
                          ⚠️ Almost at your daily limit. Resets at midnight.
                          {userPlan !== 'premium' && " Upgrade your plan for more calls."}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Active model info */}
                <div className="bg-app-card border border-app-border rounded-[14px] py-3.5 px-4 flex items-center gap-3">
                  <span className="text-[22px] shrink-0">🤖</span>
                  <div>
                    <div className="text-[11px] font-bold text-app-muted mb-0.5">YOUR AI MODEL</div>
                    <div className="text-[13px] font-bold text-app-text">
                      {PLAN_MODEL_LABEL[userPlan] || 'Auto-selected'}
                    </div>
                    <div className="text-[11px] text-app-muted mt-0.5">
                      Assigned by your {planInfo.icon} {planInfo.label} plan
                    </div>
                  </div>
                </div>

                {/* Monthly usage */}
                {usage?.this_month && (
                  <div className="bg-app-card border border-app-border rounded-[14px] py-3.5 px-4">
                    <div className="text-[11px] font-bold text-app-muted mb-2.5 tracking-wider">THIS MONTH</div>
                    <div className="flex gap-5">
                      <div>
                        <div className="text-lg font-black text-app-blue">{usage.this_month.calls}</div>
                        <div className="text-[10px] text-app-muted">total calls</div>
                      </div>
                      <div>
                        <div className="text-lg font-black text-app-blue">
                          {((usage.this_month.tokens || 0) / 1000).toFixed(1)}K
                        </div>
                        <div className="text-[10px] text-app-muted">tokens</div>
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
