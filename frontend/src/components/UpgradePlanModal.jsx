import { useState, useEffect } from 'react'
import { PLANS } from '../shared.js'
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
          theme: { color: '#00E5A0' },
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
      className="fixed inset-0 bg-black/80 z-[1000] flex items-end justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[480px] bg-[#0e0e20] rounded-t-[20px] border border-app-border max-h-[92vh] overflow-y-auto pb-7">
        <div className="flex justify-center py-3 pb-1">
          <div className="w-9 h-1 rounded-sm bg-white/10" />
        </div>

        <div className="px-[18px] pt-2">
          <div className="flex items-center justify-between mb-[18px]">
            <div>
              <h2 className="text-[17px] font-extrabold text-app-text m-0">👑 Upgrade Plan</h2>
              <div className="text-xs text-app-muted mt-0.5">Unlock more features — cancel anytime</div>
            </div>
            <button onClick={onClose} className="bg-transparent border-none text-app-muted text-xl cursor-pointer font-[Sora,sans-serif]">✕</button>
          </div>

          {success && (
            <div className="bg-app-green/10 border border-app-green/30 rounded-xl py-3 px-4 mb-3.5 text-sm font-bold text-app-green text-center">
              {success}
            </div>
          )}

          {error && (
            <div className="bg-app-red/10 border border-app-red/25 rounded-xl py-2.5 px-3.5 mb-3.5 text-[13px] text-app-red">
              ⚠️ {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {PLAN_ORDER.map((plan, idx) => {
              const info    = PLANS[plan]
              const price   = prices?.[plan]
              const isActive = plan === currentPlan
              const isLower  = idx < currentIdx - 1

              return (
                <div 
                  key={plan} 
                  className="rounded-2xl p-4"
                  style={{
                    background: isActive ? `${info.color}12` : '#0b0b1c',
                    border: `1.5px solid ${isActive ? info.color + '50' : '#ffffff08'}`,
                    opacity: isLower ? 0.5 : 1,
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-[22px]">{info.icon}</span>
                    <div className="flex-1">
                      <div className="text-[15px] font-extrabold" style={{ color: isActive ? info.color : '#eeeeff' }}>
                        {info.label}
                        {isActive && <span className="ml-2 text-[10px] rounded-md py-0.5 px-2 font-bold" style={{ background: `${info.color}25`, color: info.color }}>ACTIVE</span>}
                      </div>
                      <div className="text-xs text-app-muted mt-px">
                        {info.aiCallsPerDay === Infinity ? 'Unlimited' : info.aiCallsPerDay} AI calls/day
                      </div>
                    </div>
                    <div className="text-right">
                      {price ? (
                        <>
                          <div className="text-lg font-black" style={{ color: info.color }}>₹{price.amount_rupees}</div>
                          <div className="text-[10px] text-app-muted">/month</div>
                        </>
                      ) : (
                        <div className="text-[13px] text-app-muted">Loading…</div>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-app-muted mb-2.5 leading-relaxed">
                    Tabs: {info.tabs.join(' · ')}
                    {info.labs.length > 0 && ` · Labs: ${info.labs.join(' · ')}`}
                  </div>

                  {!isActive && !isLower && (
                    <button
                      disabled={loading || !price}
                      onClick={() => handleUpgrade(plan)}
                      className="w-full py-2.5 rounded-xl border-none text-app-bg text-[13px] font-extrabold cursor-pointer font-[Sora,sans-serif] disabled:cursor-not-allowed"
                      style={{
                        background: loading ? `${info.color}40` : `linear-gradient(135deg, ${info.color}, ${info.color}cc)`,
                      }}
                    >
                      {loading ? '⏳ Processing…' : `Upgrade to ${info.label} — ₹${price?.amount_rupees || '…'}/mo`}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-[11px] text-app-muted text-center mt-4">
            Secure payment via Razorpay · 30-day plan · Auto-expires (no surprise charges)
          </p>
        </div>
      </div>
    </div>
  )
}
