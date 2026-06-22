import { useState, useEffect, useCallback } from 'react'
import { API, C, ghostBtnClass, LoadingOverlay } from '../shared'

// ── Provider metadata ─────────────────────────────────────────
const PROVIDER_COLORS = {
  groq:      '#FFD166',
  gemini:    '#7B9CFF',
  anthropic: '#FF6B35',
  openai:    '#00E5A0',
  nvidia:    '#76B900',
}

const PLAN_COLORS = {
  free:    '#6868a0',
  basic:   '#FFD166',
  pro:     '#7B9CFF',
  premium: '#00E5A0',
}

const PLAN_ICONS = { free: '🆓', basic: '⭐', pro: '🚀', premium: '👑' }

function fmtK(n) {
  if (!n) return '0'
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
       : n >= 1_000     ? `${(n / 1_000).toFixed(1)}K`
       : String(n)
}

// ── Usage progress bar ────────────────────────────────────────
function UsageBar({ pct, color }) {
  const safeP = Math.min(Math.max(pct || 0, 0), 100)
  const barColor = safeP >= 90 ? C.red : safeP >= 70 ? C.orange : color
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#ffffff12' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${safeP}%`, background: barColor }}
      />
    </div>
  )
}

// ── Provider card ─────────────────────────────────────────────
function ProviderCard({ p }) {
  const color   = PROVIDER_COLORS[p.id] || C.muted
  const hasKey  = p.has_key
  const isPaid  = p.per_key_limit === 0
  const totalLimit = p.total_limit || 0
  const remaining = isPaid ? '∞'
    : totalLimit ? fmtK(Math.max(totalLimit - p.calls_today, 0))
    : '—'

  return (
    <div
      className="rounded-2xl p-5 border flex flex-col gap-3"
      style={{ background: '#0b0b1c', borderColor: hasKey ? color + '30' : '#ffffff10' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl" style={{ color }}>{p.icon}</span>
          <span className="font-bold text-sm text-app-text">{p.label}</span>
        </div>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: hasKey ? color + '20' : '#ffffff0a',
            color: hasKey ? color : C.muted,
          }}
        >
          {hasKey ? `${p.pool_size} key${p.pool_size > 1 ? 's' : ''}` : 'No key'}
        </span>
      </div>

      {/* Active model */}
      <div className="text-[11px] font-mono rounded-lg px-2.5 py-1.5"
        style={{ background: '#ffffff08', color: hasKey ? C.text : C.muted }}>
        {hasKey ? p.active_model : 'not configured'}
      </div>

      {/* Usage bar (only if has key + free limit) */}
      {hasKey && !isPaid && totalLimit > 0 && (
        <div className="flex flex-col gap-1">
          <UsageBar pct={p.used_pct} color={color} />
          <div className="flex justify-between text-[10px] text-app-muted">
            <span>{fmtK(p.calls_today)} req used today</span>
            <span>{remaining} req left of {fmtK(totalLimit)}</span>
          </div>
          {p.pool_size > 1 && (
            <div className="text-[10px] text-app-muted">
              {p.pool_size} keys × {fmtK(p.per_key_limit)} req/day each
            </div>
          )}
        </div>
      )}

      {/* Paid tier note */}
      {hasKey && isPaid && (
        <div className="text-[11px] text-app-muted">
          Paid tier — no hard daily cap
        </div>
      )}

      {/* No key note */}
      {!hasKey && (
        <div className="text-[11px] text-app-muted">
          Add a key in AI Models tab to enable
        </div>
      )}

      {/* Stat row */}
      <div className="flex gap-4 pt-1 border-t border-white/[0.04]">
        <div>
          <div className="text-[18px] font-black" style={{ color: hasKey ? color : C.muted }}>
            {fmtK(p.calls_today)}
          </div>
          <div className="text-[10px] text-app-muted">calls today</div>
        </div>
        <div>
          <div className="text-[18px] font-black" style={{ color: hasKey ? color : C.muted }}>
            {fmtK(p.tokens_today)}
          </div>
          <div className="text-[10px] text-app-muted">tokens today</div>
        </div>
        {!isPaid && p.free_limit > 0 && (
          <div className="ml-auto text-right">
            <div className="text-[18px] font-black text-app-muted">
              {p.used_pct}%
            </div>
            <div className="text-[10px] text-app-muted">quota used</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Tab ──────────────────────────────────────────────────
export default function APIMonitorTab({ toast }) {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(false)
  const todayStr = new Date().toISOString().slice(0, 10)
  const [fromDate, setFromDate] = useState(todayStr)
  const [toDate, setToDate]     = useState(todayStr)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await API(`/admin/api-dashboard?from_date=${fromDate}&to_date=${toDate}`)
      if (res.ok) setData(await res.json())
      else toast?.('Failed to load dashboard', 'error')
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate])

  useEffect(() => { load() }, [load])

  const activeProviders = data?.providers?.filter(p => p.has_key).length ?? 0
  const totalProviders  = data?.providers?.length ?? 5

  if (!data && loading) return <LoadingOverlay show />

  return (
    <div className="flex flex-col gap-6">

      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold m-0 text-app-text">API &amp; Model Monitor</h2>
          {data?.as_of && (
            <p className="text-[11px] m-0 text-app-muted">
              {data.as_of} &nbsp;·&nbsp; estimates based on plan routing
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-app-muted font-semibold">From</label>
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={e => setFromDate(e.target.value)}
              className="bg-app-card2 border border-app-border rounded-xl py-2 px-3 text-app-text text-[13px] font-[Sora,sans-serif] outline-none focus:ring-1 focus:ring-app-green/40"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-app-muted font-semibold">To</label>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              max={todayStr}
              onChange={e => setToDate(e.target.value)}
              className="bg-app-card2 border border-app-border rounded-xl py-2 px-3 text-app-text text-[13px] font-[Sora,sans-serif] outline-none focus:ring-1 focus:ring-app-green/40"
            />
          </div>
          <button className={`${ghostBtnClass} py-2 px-3.5 text-xs`} onClick={load}>
            {loading ? '…' : '↺ Refresh'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
        {[
          { label: 'Total calls',  value: fmtK(data?.total_calls_today),  color: C.blue },
          { label: 'Total tokens', value: fmtK(data?.total_tokens_today), color: C.green },
          { label: 'Active providers',   value: `${activeProviders} / ${totalProviders}`, color: C.yellow },
          { label: 'Plans configured',   value: String(data?.plans?.length ?? '—'), color: C.orange },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 border bg-app-card border-white/[0.06]">
            <div className="text-[22px] font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[11px] mt-1 text-app-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Provider cards */}
      <div>
        <h3 className="text-sm font-semibold mb-3 m-0 text-app-text">Provider Status</h3>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {(data?.providers ?? []).map(p => (
            <ProviderCard key={p.id} p={p} />
          ))}
          {!data && loading && (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-2xl border h-[180px] animate-pulse bg-app-card border-white/[0.03]" />
            ))
          )}
        </div>
      </div>

      {/* Plan → Model routing table */}
      <div>
        <h3 className="text-sm font-semibold mb-3 m-0 text-app-text">
          Plan → Model Routing (active)
        </h3>
        <div className="rounded-2xl border overflow-hidden border-white/[0.06]">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-white/[0.025] text-app-muted">
                {['Plan', 'Provider', 'Model', 'Users', 'Calls today', 'Tokens today'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-[11px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.plans ?? []).map((row, i) => {
                const pColor = PLAN_COLORS[row.plan] || C.muted
                const vColor = PROVIDER_COLORS[row.provider] || C.muted
                return (
                  <tr
                    key={row.plan}
                    style={{
                      borderTop: i > 0 ? '1px solid #ffffff08' : 'none',
                      background: i % 2 === 0 ? '#0b0b1c' : '#101022',
                    }}
                  >
                    <td className="px-4 py-3">
                      <span className="font-bold" style={{ color: pColor }}>
                        {PLAN_ICONS[row.plan]} {row.plan.charAt(0).toUpperCase() + row.plan.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold" style={{ color: vColor }}>
                        {row.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-app-text">
                      {row.model}
                    </td>
                    <td className="px-4 py-3 text-app-muted">
                      {row.user_count}
                    </td>
                    <td className="px-4 py-3 font-semibold text-app-text">
                      {fmtK(row.calls_today)}
                    </td>
                    <td className="px-4 py-3 text-app-muted">
                      {fmtK(row.tokens_today)}
                    </td>
                  </tr>
                )
              })}
              {!data && loading && (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} style={{ borderTop: i > 0 ? '1px solid #ffffff08' : 'none' }}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 rounded animate-pulse bg-white/[0.06] w-[60%]" />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quota reference */}
      <div className="rounded-2xl p-5 border bg-app-card border-white/[0.06]">
        <h3 className="text-sm font-semibold mb-3 m-0 text-app-text">Free-Tier Quota Reference</h3>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2 text-[12px]">
          {[
            { provider: 'Groq (70b models)',  limit: '1,000 req/day per key',   note: 'llama-3.3-70b-versatile RPD limit', color: PROVIDER_COLORS.groq },
            { provider: 'Groq (8b model)',    limit: '14,400 req/day per key',  note: 'llama-3.1-8b-instant RPD limit',    color: PROVIDER_COLORS.groq },
            { provider: 'Google Gemini',      limit: '1,500 req/day per key',   note: 'gemini-2.0-flash free tier',        color: PROVIDER_COLORS.gemini },
            { provider: 'NVIDIA NIM',         limit: '40 req/day per key',      note: 'playground tier',                   color: PROVIDER_COLORS.nvidia },
            { provider: 'Anthropic / OpenAI', limit: 'Paid only',               note: 'no free tier',                      color: C.muted },
          ].map(r => (
            <div key={r.provider} className="flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.02]">
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: r.color }} />
              <div>
                <div className="font-semibold text-app-text">{r.provider}</div>
                <div style={{ color: r.color }}>{r.limit}</div>
                <div className="text-[10px] text-app-muted">{r.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
