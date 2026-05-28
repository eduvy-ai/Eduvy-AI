import { useState, useEffect, useCallback } from 'react'
import { API, C, inputClass, ghostBtnClass, Table, LoadingOverlay } from '../shared'

// ── AI Usage Analytics Tab ────────────────────────────────────
const PLAN_COLORS = {
  free:    '#6868a0',
  basic:   '#FFD166',
  pro:     '#7B9CFF',
  premium: '#00E5A0',
}

export default function UsageTab({ toast }) {
  const [summary, setSummary] = useState(null)
  const [topUsers, setTopUsers] = useState([])
  const [days, setDays] = useState(7)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  const loadSummary = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, uRes] = await Promise.all([
        API(`/admin/usage/summary?days=${days}`),
        API(`/admin/usage/users?date=${date}`),
      ])
      if (sRes.ok) setSummary(await sRes.json())
      if (uRes.ok) setTopUsers((await uRes.json()).rows || [])
    } finally {
      setLoading(false)
    }
  }, [days, date])

  useEffect(() => { loadSummary() }, [loadSummary])

  const fmtK = n => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n || 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="flex gap-2.5 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs text-app-muted">Period:</label>
          <select
            className={`${inputClass} w-[120px]`}
            value={days}
            onChange={e => setDays(Number(e.target.value))}
          >
            {[7, 14, 30].map(d => <option key={d} value={d}>Last {d} days</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-app-muted">Day detail:</label>
          <input
            type="date"
            className={`${inputClass} w-[160px]`}
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <button className={`${ghostBtnClass} py-2 px-3.5 text-xs`} onClick={loadSummary}>
          {loading ? "…" : "↺ Refresh"}
        </button>
      </div>

      {/* All-time totals */}
      {summary && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
          {[
            { label: "Total Calls (all time)", value: fmtK(summary.all_time?.calls), color: C.blue },
            { label: "Total Tokens (all time)", value: fmtK(summary.all_time?.tokens), color: C.green },
            { label: `Calls (${days}d)`, value: fmtK(summary.daily?.reduce((s, d) => s + (d.calls || 0), 0)), color: C.yellow },
            { label: `Tokens (${days}d)`, value: fmtK(summary.daily?.reduce((s, d) => s + (d.tokens || 0), 0)), color: C.orange },
          ].map(stat => (
            <div key={stat.label} className="bg-app-card2 rounded-xl p-4 border border-app-border">
              <div className="text-[22px] font-black" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-[11px] text-app-muted mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Per-plan breakdown */}
      {summary?.by_plan?.length > 0 && (
        <div className="bg-app-card2 rounded-[14px] p-5">
          <h3 className="text-app-text m-0 mb-3.5 text-sm">By Plan (last {days} days)</h3>
          <div className="flex flex-col gap-2">
            {summary.by_plan.map(row => (
              <div key={row.plan} className="flex items-center gap-3 text-[13px]">
                <span className="w-[70px] font-bold" style={{ color: PLAN_COLORS[row.plan] || C.muted }}>
                  {row.plan?.charAt(0).toUpperCase() + row.plan?.slice(1)}
                </span>
                <span className="text-app-text w-[80px]">{fmtK(row.calls)} calls</span>
                <span className="text-app-muted w-[90px]">{fmtK(row.tokens)} tokens</span>
                <span className="text-app-muted text-[11px]">{row.active_users} users</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily chart (simple text bars) */}
      {summary?.daily?.length > 0 && (
        <div className="bg-app-card2 rounded-[14px] p-5">
          <h3 className="text-app-text m-0 mb-3.5 text-sm">Daily Calls</h3>
          {(() => {
            const maxCalls = Math.max(...summary.daily.map(d => d.calls || 0), 1)
            return summary.daily.map(d => (
              <div key={d.date} className="flex items-center gap-2.5 mb-1.5">
                <span className="text-[11px] text-app-muted w-[80px] shrink-0">{d.date?.slice(5)}</span>
                <div className="flex-1 h-2.5 bg-app-card rounded overflow-hidden">
                  <div 
                    className="h-full bg-app-blue rounded"
                    style={{ width: `${Math.round((d.calls / maxCalls) * 100)}%` }}
                  />
                </div>
                <span className="text-[11px] text-app-text w-[50px] text-right">{d.calls}</span>
              </div>
            ))
          })()}
        </div>
      )}

      {/* Top users for selected date */}
      <div>
        <h3 className="text-app-text m-0 mb-3 text-sm">Users — {date}</h3>
        {topUsers.length === 0 ? (
          <p className="text-app-muted text-[13px]">No usage recorded for this date.</p>
        ) : (
          <Table
            cols={[
              { key: "name",          label: "Name" },
              { key: "email",         label: "Email" },
              { key: "plan",          label: "Plan", render: v => <span style={{ color: PLAN_COLORS[v] || C.muted }} className="font-bold">{v}</span> },
              { key: "call_count",   label: "Calls" },
              { key: "total_tokens", label: "Tokens" },
            ]}
            rows={topUsers}
          />
        )}
      </div>
    </div>
  )
}
