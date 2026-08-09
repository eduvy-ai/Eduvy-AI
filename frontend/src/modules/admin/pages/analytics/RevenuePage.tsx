// ─── Revenue Analytics Page ──────────────────────────────────
// Subscription and revenue analytics

import React, { useEffect, useState, useCallback } from 'react'
import { adminApi } from '../../api'
import type { RevenueAnalytics } from '../../types'
import { PLAN_LABELS } from '../../constants'
import Loader from '../../../../shared/components/Loader'
import {
  CurrencyDollar,
  Crown,
  Clock,
  Warning,
  TrendUp,
  ChartPie,
} from '@phosphor-icons/react'

const RevenuePage: React.FC = () => {
  const [data, setData] = useState<RevenueAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await adminApi.analytics.getRevenue()
      setData(result)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load revenue data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-app-red/10 border border-app-red/25 rounded-xl text-app-red">
        {error}
      </div>
    )
  }

  if (!data) return null

  const totalPaidSubs = Object.values(data.subscriptions_by_plan).reduce((a, b) => a + b, 0)

  // Plan pricing for display
  const planPricing = {
    basic: { price: 5, color: 'text-app-blue', bg: 'bg-app-blue' },
    pro: { price: 15, color: 'text-app-purple', bg: 'bg-app-purple' },
    premium: { price: 30, color: 'text-app-yellow', bg: 'bg-app-yellow' },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <TrendUp size={28} className="text-app-green" />
            Revenue Analytics
          </h1>
          <p className="text-sm text-app-muted mt-1">
            Subscriptions and estimated revenue
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-3 py-1.5 text-sm text-app-muted hover:text-app-text bg-app-card border border-app-border rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-app-card rounded-xl border border-app-border p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-app-green/10 rounded-lg">
              <CurrencyDollar size={24} className="text-app-green" />
            </div>
            <div>
              <p className="text-3xl font-bold text-app-green">${data.estimated_mrr}</p>
              <p className="text-xs text-app-muted">Estimated MRR</p>
            </div>
          </div>
        </div>
        
        <div className="bg-app-card rounded-xl border border-app-border p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-app-purple/10 rounded-lg">
              <Crown size={24} className="text-app-purple" />
            </div>
            <div>
              <p className="text-3xl font-bold text-app-text">{totalPaidSubs}</p>
              <p className="text-xs text-app-muted">Paid Subscribers</p>
            </div>
          </div>
        </div>
        
        <div className="bg-app-card rounded-xl border border-app-border p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-app-orange/10 rounded-lg">
              <Clock size={24} className="text-app-orange" />
            </div>
            <div>
              <p className="text-3xl font-bold text-app-orange">{data.expiring_soon}</p>
              <p className="text-xs text-app-muted">Expiring (7 days)</p>
            </div>
          </div>
        </div>
        
        <div className="bg-app-card rounded-xl border border-app-border p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-app-red/10 rounded-lg">
              <Warning size={24} className="text-app-red" />
            </div>
            <div>
              <p className="text-3xl font-bold text-app-red">{data.expired_subscriptions}</p>
              <p className="text-xs text-app-muted">Expired</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Plan */}
        <div className="bg-app-card rounded-xl border border-app-border p-6">
          <h2 className="text-lg font-bold text-app-text mb-4 flex items-center gap-2">
            <ChartPie size={20} className="text-app-purple" />
            Subscriptions by Plan
          </h2>
          <div className="space-y-4">
            {Object.entries(planPricing).map(([plan, config]) => {
              const count = data.subscriptions_by_plan[plan] || 0
              const percentage = totalPaidSubs > 0 ? Math.round((count / totalPaidSubs) * 100) : 0
              const revenue = count * config.price
              const planConfig = PLAN_LABELS[plan] || { label: plan }
              
              return (
                <div key={plan} className="p-4 bg-app-card2 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Crown size={16} className={config.color} />
                      <span className={`font-bold ${config.color}`}>
                        {planConfig.label}
                      </span>
                      <span className="text-xs text-app-muted">
                        ${config.price}/month
                      </span>
                    </div>
                    <span className="text-sm text-app-muted">
                      {count} users ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-app-card rounded-full overflow-hidden mb-2">
                    <div 
                      className={`h-full ${config.bg}/60 rounded-full`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${config.color}`}>
                      ${revenue}
                    </span>
                    <span className="text-xs text-app-muted">/month</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-app-card rounded-xl border border-app-border p-6">
          <h2 className="text-lg font-bold text-app-text mb-4 flex items-center gap-2">
            <CurrencyDollar size={20} className="text-app-green" />
            Revenue Breakdown
          </h2>
          
          {/* Visual pie-like representation */}
          <div className="flex items-center justify-center py-6">
            <div className="relative w-40 h-40">
              {/* Background circle */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="20"
                  className="text-app-card2"
                />
                {/* Revenue segments */}
                {(() => {
                  let offset = 0
                  const segments: React.ReactNode[] = []
                  const total = data.estimated_mrr || 1
                  
                  Object.entries(planPricing).forEach(([plan, config]) => {
                    const count = data.subscriptions_by_plan[plan] || 0
                    const revenue = count * config.price
                    const percentage = (revenue / total) * 100
                    const dashArray = `${percentage * 2.51} ${251 - percentage * 2.51}`
                    
                    segments.push(
                      <circle
                        key={plan}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="20"
                        strokeDasharray={dashArray}
                        strokeDashoffset={-offset * 2.51}
                        className={config.color}
                      />
                    )
                    offset += percentage
                  })
                  
                  return segments
                })()}
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-app-green">${data.estimated_mrr}</p>
                  <p className="text-xs text-app-muted">MRR</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex justify-center gap-6 mt-4">
            {Object.entries(planPricing).map(([plan, config]) => {
              const count = data.subscriptions_by_plan[plan] || 0
              const revenue = count * config.price
              const planConfig = PLAN_LABELS[plan] || { label: plan }
              
              return (
                <div key={plan} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${config.bg}/60`} />
                  <span className="text-xs text-app-muted">
                    {planConfig.label}: ${revenue}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Action Items */}
      {(data.expiring_soon > 0 || data.expired_subscriptions > 0) && (
        <div className="bg-app-card rounded-xl border border-app-border p-6">
          <h2 className="text-lg font-bold text-app-text mb-4">Action Items</h2>
          <div className="space-y-3">
            {data.expiring_soon > 0 && (
              <div className="flex items-center gap-3 p-3 bg-app-orange/10 border border-app-orange/25 rounded-lg">
                <Clock size={20} className="text-app-orange shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-app-text">
                    {data.expiring_soon} subscription{data.expiring_soon > 1 ? 's' : ''} expiring in the next 7 days
                  </p>
                  <p className="text-xs text-app-muted">
                    Consider sending renewal reminders
                  </p>
                </div>
              </div>
            )}
            {data.expired_subscriptions > 0 && (
              <div className="flex items-center gap-3 p-3 bg-app-red/10 border border-app-red/25 rounded-lg">
                <Warning size={20} className="text-app-red shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-app-text">
                    {data.expired_subscriptions} expired subscription{data.expired_subscriptions > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-app-muted">
                    Win-back campaign opportunity
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Note */}
      <div className="text-xs text-app-muted text-center">
        * Revenue estimates based on standard plan pricing. Actual revenue may vary based on promotions and regional pricing.
      </div>
    </div>
  )
}

export default RevenuePage
