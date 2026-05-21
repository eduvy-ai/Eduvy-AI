import { useState, useEffect } from 'react'
import { COLORS, PLANS } from '../shared.js'
import { apiGetPlanPrices, apiCreatePaymentOrder, apiVerifyPayment } from '../api.js'

const PLAN_ORDER = ['basic', 'pro', 'premium']

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.head.appendChild(s)
  })
}

export default function UpgradePlanModal({ profile, onClose, onUpgraded }) {
  const [prices, setPrices]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  const currentPlan = profile?.plan || 'free'
  const currentIdx  = ['free', ...PLAN_ORDER].indexOf(currentPlan)

  useEffect(() => {
    apiGetPlanPrices().then(setPrices).catch(() => {})
  }, [])

  const handleUpgrade = async (plan) => {
    setError('')
    setLoading(true)
    try {
      const loaded = await loadRazorpayScript()
      if (!loaded) {
        setError('Could not load payment gateway. Please check your internet connection.')
        setLoading(false)
        return
      }

      const order = await apiCreatePaymentOrder(plan)

      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key:         order.key_id,
          amount:      order.amount,
          currency:    order.currency,
          name:        'VidyAI',
          description: `${order.plan_label} Plan — 30 days`,
          order_id:    order.order_id,
          prefill: {
            name:  order.user_name,
            email: order.user_email,
          },
          theme: { color: COLORS.green },
          modal: { ondismiss: () => reject(new Error('cancelled')) },
          handler: async (response) => {
            try {
              const verified = await apiVerifyPayment({
                order_id:   response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
                signature:  response.razorpay_signature,
                plan,
              })
              resolve(verified)
            } catch (err) {
              reject(err)
            }
          },
        })
        rzp.open()
      })

      setSuccess(`🎉 You're now on the ${PLANS[plan]?.label} plan!`)
      onUpgraded?.(plan)
      setTimeout(onClose, 2000)
    } catch (err) {
      if (err?.message !== 'cancelled') {
        setError(err?.message || 'Payment failed. Please try again.')
      }
    }
    setLoading(false)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.80)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%', maxWidth: 480, background: '#0e0e20',
        borderRadius: '20px 20px 0 0', border: `1px solid ${COLORS.border}`,
        maxHeight: '92vh', overflowY: 'auto', paddingBottom: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#ffffff20' }} />
        </div>

        <div style={{ padding: '8px 18px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: COLORS.text, margin: 0 }}>👑 Upgrade Plan</h2>
              <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>Unlock more features — cancel anytime</div>
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: COLORS.muted, fontSize: 20, cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>✕</button>
          </div>

          {success && (
            <div style={{ background: `${COLORS.green}18`, border: `1px solid ${COLORS.green}44`, borderRadius: 12, padding: '12px 16px', marginBottom: 14, fontSize: 14, fontWeight: 700, color: COLORS.green, textAlign: 'center' }}>
              {success}
            </div>
          )}

          {error && (
            <div style={{ background: `${COLORS.red}15`, border: `1px solid ${COLORS.red}40`, borderRadius: 12, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: COLORS.red }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PLAN_ORDER.map((plan, idx) => {
              const info    = PLANS[plan]
              const price   = prices?.[plan]
              const isActive = plan === currentPlan
              const isLower  = idx < currentIdx - 1  // lower tier than current paid plan

              return (
                <div key={plan} style={{
                  background: isActive ? `${info.color}12` : COLORS.card,
                  border: `1.5px solid ${isActive ? info.color + '50' : COLORS.border}`,
                  borderRadius: 16, padding: '16px',
                  opacity: isLower ? 0.5 : 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 22 }}>{info.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: isActive ? info.color : COLORS.text }}>
                        {info.label}
                        {isActive && <span style={{ marginLeft: 8, fontSize: 10, background: `${info.color}25`, color: info.color, borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>ACTIVE</span>}
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 1 }}>
                        {info.aiCallsPerDay === Infinity ? 'Unlimited' : info.aiCallsPerDay} AI calls/day
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {price ? (
                        <>
                          <div style={{ fontSize: 18, fontWeight: 900, color: info.color }}>₹{price.amount_rupees}</div>
                          <div style={{ fontSize: 10, color: COLORS.muted }}>/month</div>
                        </>
                      ) : (
                        <div style={{ fontSize: 13, color: COLORS.muted }}>Loading…</div>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 10, lineHeight: 1.5 }}>
                    Tabs: {info.tabs.join(' · ')}
                    {info.labs.length > 0 && ` · Labs: ${info.labs.join(' · ')}`}
                  </div>

                  {!isActive && !isLower && (
                    <button
                      disabled={loading || !price}
                      onClick={() => handleUpgrade(plan)}
                      style={{
                        width: '100%', padding: '11px', borderRadius: 12,
                        background: loading ? `${info.color}40` : `linear-gradient(135deg, ${info.color}, ${info.color}cc)`,
                        border: 'none', color: plan === 'premium' ? '#04040e' : '#04040e',
                        fontSize: 13, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                        fontFamily: 'Sora, sans-serif',
                      }}
                    >
                      {loading ? '⏳ Processing…' : `Upgrade to ${info.label} — ₹${price?.amount_rupees || '…'}/mo`}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <p style={{ fontSize: 11, color: COLORS.muted, textAlign: 'center', marginTop: 16 }}>
            Secure payment via Razorpay · 30-day plan · Auto-expires (no surprise charges)
          </p>
        </div>
      </div>
    </div>
  )
}
