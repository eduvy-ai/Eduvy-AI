// src/components/PricingModal.jsx
import { useState, useEffect } from 'react'
import { COLORS, PLANS } from '../shared.js'
import { apiGetPlans, apiCreateOrder, apiVerifyPayment } from '../api.js'

const RZP_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID

export default function PricingModal({ profile, userId, onClose, onUpgradeSuccess }) {
  const [plans,   setPlans]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying,  setPaying]  = useState(null)  // which plan is being paid
  const [error,   setError]   = useState('')

  const userPlan    = profile?.plan || 'free'
  const planOrder   = ['free', 'basic', 'pro', 'premium']
  const currentRank = planOrder.indexOf(userPlan)

  // Fetch live prices from backend
  useEffect(() => {
    apiGetPlans()
      .then(setPlans)
      .catch(() => setError('Could not load plans. Try again.'))
      .finally(() => setLoading(false))
  }, [])

  const handleUpgrade = async (planKey) => {
    if (!plans) return
    setError('')
    setPaying(planKey)

    try {
      // 1. Create order on backend
      const order = await apiCreateOrder(userId, planKey)

      // 2. Open Razorpay checkout
      const options = {
        key:          RZP_KEY,
        amount:       order.amount,
        currency:     order.currency,
        name:         'Eduvy-AI',
        description:  `${order.label} Plan — 30 days`,
        order_id:     order.order_id,
        prefill: {
          name:  profile?.name  || '',
          email: profile?.email || '',
        },
        theme: { color: COLORS.green },

        handler: async (response) => {
          try {
            // 3. Verify on backend — this writes plan to DB
            const result = await apiVerifyPayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              user_id:             userId,
              plan:                planKey,
            })

            if (result.success) {
              // 4. Tell App to refresh the profile
              onUpgradeSuccess({ plan: result.plan, plan_expires_at: result.expires_at })
              onClose()
            }
          } catch (e) {
            setError('Payment received but verification failed. Contact support.')
          } finally {
            setPaying(null)
          }
        },

        modal: {
          ondismiss: () => setPaying(null),
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (resp) => {
        setError(`Payment failed: ${resp.error.description}`)
        setPaying(null)
      })
      rzp.open()

    } catch (e) {
      setError(e.message || 'Something went wrong. Try again.')
      setPaying(null)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      zIndex: 1000,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>

      <div style={{
        width: '100%', maxWidth: 480,
        background: '#0e0e20',
        borderRadius: '20px 20px 0 0',
        border: `1px solid ${COLORS.border}`,
        maxHeight: '92vh', overflowY: 'auto',
        paddingBottom: 32,
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#ffffff20' }} />
        </div>

        <div style={{ padding: '8px 18px 0' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: COLORS.text, margin: 0 }}>
                👑 Upgrade Plan
              </h2>
              <p style={{ fontSize: 12, color: COLORS.muted, margin: '4px 0 0' }}>
                Unlock more features for 30 days
              </p>
            </div>
            <button onClick={onClose} style={{
              background: 'transparent', border: 'none',
              color: COLORS.muted, fontSize: 20, cursor: 'pointer',
            }}>✕</button>
          </div>

          {/* Current plan badge */}
          <div style={{
            background: `${COLORS.green}10`,
            border: `1px solid ${COLORS.green}30`,
            borderRadius: 10, padding: '8px 14px',
            fontSize: 12, color: COLORS.green,
            marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>{PLANS[userPlan]?.icon}</span>
            <span>Current plan: <strong>{PLANS[userPlan]?.label}</strong></span>
          </div>

          {error && (
            <div style={{
              background: `${COLORS.red}15`, border: `1px solid ${COLORS.red}40`,
              borderRadius: 10, padding: '10px 14px',
              fontSize: 12, color: COLORS.red, marginBottom: 16,
            }}>⚠️ {error}</div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: COLORS.muted, fontSize: 14 }}>
              Loading plans…
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['basic', 'pro', 'premium'].map(planKey => {
                const info      = PLANS[planKey]
                const priceInfo = plans?.[planKey]
                const rank      = planOrder.indexOf(planKey)
                const isActive  = planKey === userPlan
                const isBelow   = rank <= currentRank
                const isBusy    = paying === planKey

                return (
                  <div key={planKey} style={{
                    background: isActive ? `${info.color}12` : COLORS.card,
                    border: `1.5px solid ${isActive ? info.color + '60' : COLORS.border}`,
                    borderRadius: 16, padding: '16px 18px',
                    opacity: isBelow && !isActive ? 0.45 : 1,
                  }}>
                    {/* Plan header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 24 }}>{info.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: info.color }}>
                          {info.label}
                        </div>
                        <div style={{ fontSize: 11, color: COLORS.muted }}>
                          {info.aiCallsPerDay === Infinity ? 'Unlimited' : info.aiCallsPerDay} AI calls/day
                          {' · '}{priceInfo?.duration || 30} days
                        </div>
                      </div>
                      {/* Price badge */}
                      <div style={{
                        background: `${info.color}20`,
                        border: `1px solid ${info.color}40`,
                        borderRadius: 10, padding: '6px 12px',
                        textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: info.color }}>
                          ₹{priceInfo?.rupees ?? '—'}
                        </div>
                        <div style={{ fontSize: 9, color: COLORS.muted }}>/ month</div>
                      </div>
                    </div>

                    {/* Feature list */}
                    <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 12, lineHeight: 1.6 }}>
                      📱 Tabs: {info.tabs.join(' · ')}
                      {info.labs.length > 0 && (
                        <div>🧪 Labs: {info.labs.join(' · ')}</div>
                      )}
                    </div>

                    {/* CTA button */}
                    {isActive ? (
                      <div style={{
                        background: `${info.color}15`,
                        border: `1px solid ${info.color}40`,
                        borderRadius: 10, padding: '10px',
                        textAlign: 'center', fontSize: 12,
                        fontWeight: 700, color: info.color,
                      }}>✅ Current Plan</div>
                    ) : isBelow ? (
                      <div style={{
                        background: COLORS.card2, borderRadius: 10,
                        padding: '10px', textAlign: 'center',
                        fontSize: 12, color: COLORS.muted,
                      }}>Lower than current plan</div>
                    ) : (
                      <button
                        disabled={!!paying}
                        onClick={() => handleUpgrade(planKey)}
                        style={{
                          width: '100%',
                          background: isBusy
                            ? `${info.color}30`
                            : `linear-gradient(135deg, ${info.color}, ${info.color}cc)`,
                          border: 'none', borderRadius: 10,
                          padding: '12px', fontSize: 13,
                          fontWeight: 800, color: '#04040e',
                          cursor: paying ? 'not-allowed' : 'pointer',
                          fontFamily: 'Sora, sans-serif',
                          transition: 'opacity 0.2s',
                        }}
                      >
                        {isBusy ? '⏳ Opening payment…' : `Upgrade to ${info.label} — ₹${priceInfo?.rupees}`}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <p style={{ fontSize: 10, color: COLORS.muted, textAlign: 'center', marginTop: 16 }}>
            🔒 Secured by Razorpay · Test mode active
          </p>
        </div>
      </div>
    </div>
  )
}