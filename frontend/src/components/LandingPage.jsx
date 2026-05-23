import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuthToken, apiGetMe, setAuthToken } from '../api.js'
import { COLORS } from '../shared.js'

const FEATURES = [
  { icon: "🤖", title: "AI Tutor 24/7",       desc: "Ask anything from your syllabus — gets answered in your language, instantly" },
  { icon: "📓", title: "Smart Notebook",       desc: "Upload textbooks, get notes, flashcards, mind maps & quizzes from your own material" },
  { icon: "🎬", title: "Whiteboard Lessons",   desc: "AI draws animated lessons with narration — like a private coaching class" },
  { icon: "🎯", title: "Quiz Arena",           desc: "Board-exam style MCQs with instant explanations for your class & board" },
  { icon: "🎙️", title: "AI Podcast",          desc: "Two AI hosts debate your syllabus — learn while you listen" },
  { icon: "🧘", title: "Wellness Coach",       desc: "Handles exam stress, anxiety, and motivation — your personal counselor" },
]

const LANGS = ["हिंदी", "ગુજરાતી", "मराठी", "தமிழ்", "తెలుగు", "ಕನ್ನಡ", "বাংলা", "ਪੰਜਾਬੀ", "ଓଡ଼ିଆ", "اردو", "English"]

const BOARDS = ["CBSE", "ICSE", "GSEB", "MSBSHSE", "RBSE", "UP Board", "TN Board"]

const PLANS_PRICING = [
  {
    key: 'free',
    icon: '🆓',
    name: 'Free',
    price: '₹0',
    period: 'forever',
    color: '#6868a0',
    tagline: 'Start your AI journey',
    cta: 'Get Started Free',
    popular: false,
    features: [
      { ok: true,  text: 'AI Tutor — 10 questions/day' },
      { ok: true,  text: 'CBSE / ICSE / State boards' },
      { ok: true,  text: 'All 11 Indian languages' },
      { ok: true,  text: 'Bhool Bazaar — mistake cards' },
      { ok: true,  text: 'Muqabla Battles' },
      { ok: false, text: 'Smart Notebook' },
      { ok: false, text: 'Whiteboard Video Lessons' },
      { ok: false, text: 'Quiz Arena & Labs' },
      { ok: false, text: 'Sathi Study Squads' },
      { ok: false, text: 'AI Podcast & Essay Lab' },
    ],
  },
  {
    key: 'basic',
    icon: '⭐',
    name: 'Basic',
    price: '₹99',
    period: 'per month',
    color: '#FFD166',
    tagline: 'For regular learners',
    cta: 'Start Basic',
    popular: false,
    features: [
      { ok: true,  text: 'AI Tutor — 50 questions/day' },
      { ok: true,  text: 'CBSE / ICSE / State boards' },
      { ok: true,  text: 'All 11 Indian languages' },
      { ok: true,  text: 'Smart Notebook' },
      { ok: true,  text: 'Whiteboard Video Lessons' },
      { ok: true,  text: 'Bhool Bazaar + Muqabla Battles' },
      { ok: false, text: 'Quiz Arena & Labs' },
      { ok: false, text: 'Sathi Study Squads' },
      { ok: false, text: 'AI Podcast & Essay Lab' },
      { ok: false, text: 'Discover Feed' },
    ],
  },
  {
    key: 'pro',
    icon: '🚀',
    name: 'Pro',
    price: '₹249',
    period: 'per month',
    color: '#7B9CFF',
    tagline: 'Best for board exam prep',
    cta: 'Go Pro',
    popular: true,
    features: [
      { ok: true,  text: 'AI Tutor — 200 questions/day' },
      { ok: true,  text: 'CBSE / ICSE / State boards' },
      { ok: true,  text: 'All 11 Indian languages' },
      { ok: true,  text: 'Smart Notebook' },
      { ok: true,  text: 'Whiteboard Video Lessons' },
      { ok: true,  text: 'Quiz Arena & Examiner Labs' },
      { ok: true,  text: '🤝 Sathi Study Squads' },
      { ok: true,  text: '📛 Bhool Bazaar + ⚔️ Muqabla' },
      { ok: false, text: 'AI Podcast & Essay Lab' },
      { ok: false, text: 'Discover Feed' },
    ],
  },
  {
    key: 'premium',
    icon: '👑',
    name: 'Premium',
    price: '₹499',
    period: 'per month',
    color: '#00E5A0',
    tagline: 'Unlimited AI learning',
    cta: 'Go Premium',
    popular: false,
    features: [
      { ok: true,  text: 'AI Tutor — Unlimited' },
      { ok: true,  text: 'CBSE / ICSE / State boards' },
      { ok: true,  text: 'All 11 Indian languages' },
      { ok: true,  text: 'Smart Notebook' },
      { ok: true,  text: 'Whiteboard Video Lessons' },
      { ok: true,  text: 'All Labs — Quiz, Examiner & more' },
      { ok: true,  text: '🤝 Sathi Study Squads' },
      { ok: true,  text: '📛 Bhool Bazaar + ⚔️ Muqabla' },
      { ok: true,  text: 'AI Podcast & Essay Lab' },
      { ok: true,  text: 'Discover Feed' },
    ],
  },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [langIdx, setLangIdx]   = useState(0)
  const [visible, setVisible]   = useState(false)

  // ── Auto-redirect logged-in users ───────────────────────────
  useEffect(() => {
    async function check() {
      const token = getAuthToken()
      if (token) {
        try {
          const data = await apiGetMe()
          if (data) { navigate('/app/home', { replace: true }); return }
        } catch { /* expired */ }
      }
      setChecking(false)
      setTimeout(() => setVisible(true), 60)
    }
    check()
  }, [navigate])

  // ── Scroll to hash anchor (e.g. #pricing) after page loads ──
  useEffect(() => {
    if (!visible) return
    const hash = window.location.hash
    if (hash) {
      const el = document.querySelector(hash)
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [visible])

  // ── Cycle through language names ─────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setLangIdx(i => (i + 1) % LANGS.length), 1400)
    return () => clearInterval(t)
  }, [])

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${COLORS.green}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{
      width: '100%',
      background: COLORS.bg,
      fontFamily: 'Sora, sans-serif',
      color: COLORS.text,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s ease',
    }}>

      {/* ── Sticky Nav ── */}
      <nav className="lp-nav">
        <div className="lp-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `linear-gradient(135deg, ${COLORS.green}, #33cc88)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, boxShadow: `0 0 14px ${COLORS.green}44`,
            }}>🎓</div>
            <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.5 }}>
              Eduvy<span style={{ color: COLORS.green }}>-AI</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <a href="#pricing" className="nav-pricing-link" style={{
              fontSize: 13, fontWeight: 600, color: COLORS.muted,
              textDecoration: 'none', padding: '8px 14px', display: 'none',
            }}>Pricing</a>
            <button onClick={() => navigate('/auth')} style={{
              background: 'transparent',
              border: `1.5px solid ${COLORS.border}`,
              borderRadius: 10, padding: '8px 16px',
              color: COLORS.text, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Sora, sans-serif',
            }}>Sign In</button>
            <button onClick={() => navigate('/auth')} style={{
              background: `linear-gradient(135deg, ${COLORS.green}, #33cc88)`,
              border: 'none', borderRadius: 10, padding: '8px 18px',
              color: '#04040e', fontSize: 13, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'Sora, sans-serif',
            }}>Get Started Free</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, textAlign: 'center' }}>
          {/* Board pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {BOARDS.map(b => (
              <span key={b} style={{
                background: `${COLORS.blue}15`, border: `1px solid ${COLORS.blue}30`,
                borderRadius: 20, padding: '3px 12px',
                fontSize: 12, fontWeight: 600, color: COLORS.blue,
              }}>{b}</span>
            ))}
          </div>

          {/* Headline */}
          <div>
            <h1 style={{
              fontSize: 'clamp(34px, 5.5vw, 64px)',
              fontWeight: 900, lineHeight: 1.08,
              letterSpacing: -1.5, margin: 0,
            }}>
              India's Smartest<br />
              <span style={{ color: COLORS.green }}>AI Tutor</span>
            </h1>
            <p style={{
              fontSize: 'clamp(15px, 2vw, 19px)',
              color: COLORS.muted, marginTop: 16,
              fontWeight: 500, lineHeight: 1.55, margin: '16px auto 0',
              maxWidth: 540,
            }}>
              For every Indian student — Class 1 to 12<br />
              Powered by AI, delivered in your language
            </p>
          </div>

          {/* Animated language */}
          <div style={{
            background: COLORS.card, border: `1px solid ${COLORS.border}`,
            borderRadius: 14, padding: '12px 28px',
            display: 'inline-flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 13, color: COLORS.muted, fontWeight: 500 }}>Responding in</span>
            <span style={{
              fontSize: 18, fontWeight: 800, color: COLORS.green,
              minWidth: 110, display: 'inline-block',
              transition: 'opacity 0.3s',
            }}>{LANGS[langIdx]}</span>
          </div>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => navigate('/auth')} style={{
              background: `linear-gradient(135deg, ${COLORS.green}, #33cc88)`,
              border: 'none', borderRadius: 14,
              padding: '16px 40px',
              color: '#04040e', fontSize: 16, fontWeight: 900,
              cursor: 'pointer', fontFamily: 'Sora, sans-serif',
              boxShadow: `0 0 32px ${COLORS.green}44`,
            }}>
              Start Learning Free 🚀
            </button>
            <button onClick={() => navigate('/auth')} style={{
              background: 'transparent',
              border: `1.5px solid ${COLORS.border}`,
              borderRadius: 14, padding: '16px 28px',
              color: COLORS.text, fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Sora, sans-serif',
            }}>
              Sign In →
            </button>
          </div>

          <p style={{ fontSize: 12, color: COLORS.muted, fontWeight: 500 }}>
            Free to use · No credit card · Works in 11 Indian languages
          </p>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section style={{ paddingBottom: 72, background: COLORS.card2 }}>
        <div className="lp-container" style={{ paddingTop: 56, paddingBottom: 8 }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(18px, 2.5vw, 24px)', fontWeight: 800, marginBottom: 28, letterSpacing: -0.3 }}>
            Everything a student needs, in one app
          </h2>
          <div className="lp-grid-features">
            {FEATURES.map(f => (
              <div key={f.title} style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 16, padding: '20px 18px',
              }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 5, color: COLORS.text }}>{f.title}</div>
                <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ paddingBottom: 72 }}>
        <div className="lp-container" style={{ paddingTop: 60 }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h2 style={{ fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 900, margin: '0 0 10px', letterSpacing: -0.5 }}>
              Simple, transparent pricing
            </h2>
            <p style={{ fontSize: 14, color: COLORS.muted, margin: 0 }}>
              Start free. Upgrade when you're ready. Cancel anytime.
            </p>
          </div>

          <div className="lp-grid-pricing">
            {PLANS_PRICING.map(plan => (
              <div key={plan.key} style={{
                background: plan.popular ? `${plan.color}0d` : COLORS.card,
                border: `1.5px solid ${plan.popular ? plan.color : COLORS.border}`,
                borderRadius: 20, padding: '24px 20px',
                position: 'relative', display: 'flex', flexDirection: 'column',
              }}>
                {plan.popular && (
                  <div style={{
                    position: 'absolute', top: -13, left: '50%',
                    transform: 'translateX(-50%)',
                    background: `linear-gradient(90deg, ${plan.color}, #4466ee)`,
                    color: '#fff', fontSize: 11, fontWeight: 800,
                    padding: '4px 16px', borderRadius: 20,
                    letterSpacing: '0.06em', whiteSpace: 'nowrap',
                  }}>⭐ MOST POPULAR</div>
                )}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 22 }}>{plan.icon}</span>
                    <span style={{ fontSize: 17, fontWeight: 900, color: plan.color }}>{plan.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                    <span style={{ fontSize: 32, fontWeight: 900, color: COLORS.text }}>{plan.price}</span>
                    <span style={{ fontSize: 12, color: COLORS.muted, fontWeight: 500 }}>/{plan.period}</span>
                  </div>
                  <p style={{ fontSize: 12, color: COLORS.muted, margin: 0, lineHeight: 1.4 }}>{plan.tagline}</p>
                </div>
                <ul style={{ listStyle: 'none', margin: '0 0 22px', padding: 0, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  {plan.features.map((f, i) => (
                    <li key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      fontSize: 12.5, fontWeight: f.ok ? 600 : 400,
                      color: f.ok ? COLORS.text : COLORS.muted,
                      opacity: f.ok ? 1 : 0.55,
                    }}>
                      <span style={{ flexShrink: 0, fontSize: 13, color: f.ok ? plan.color : COLORS.muted, marginTop: 1 }}>
                        {f.ok ? '✓' : '✗'}
                      </span>
                      {f.text}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/auth')} style={{
                  marginTop: 'auto',
                  background: plan.popular
                    ? `linear-gradient(135deg, ${plan.color}, #4466ee)`
                    : plan.key === 'free'
                      ? `linear-gradient(135deg, ${COLORS.green}, #33cc88)`
                      : `${plan.color}18`,
                  border: plan.popular || plan.key === 'free' ? 'none' : `1.5px solid ${plan.color}50`,
                  borderRadius: 12, padding: '11px 16px',
                  color: plan.popular || plan.key === 'free' ? (plan.popular ? '#fff' : '#04040e') : plan.color,
                  fontSize: 13, fontWeight: 800,
                  cursor: 'pointer', fontFamily: 'Sora, sans-serif',
                  width: '100%', letterSpacing: '0.01em',
                }}>{plan.cta}</button>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: 12, color: COLORS.muted, marginTop: 22 }}>
            All plans include access on web &amp; mobile · Plans managed by admin · No hidden charges
          </p>
        </div>
      </section>

      {/* ── Language strip ── */}
      <section style={{ background: COLORS.card2, paddingTop: 48, paddingBottom: 48 }}>
        <div className="lp-container">
          <div style={{
            background: COLORS.card, border: `1px solid ${COLORS.border}`,
            borderRadius: 20, padding: '32px 28px', textAlign: 'center',
          }}>
            <h3 style={{ fontSize: 'clamp(16px, 2vw, 20px)', fontWeight: 800, marginBottom: 8 }}>
              Speaks your language — literally
            </h3>
            <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 20 }}>
              Every explanation, quiz, note, and podcast — in your medium
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {LANGS.map(l => (
                <span key={l} style={{
                  background: `${COLORS.green}12`, border: `1px solid ${COLORS.green}30`,
                  borderRadius: 10, padding: '6px 14px',
                  fontSize: 14, fontWeight: 700, color: COLORS.green,
                }}>{l}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ paddingTop: 72, paddingBottom: 80 }}>
        <div className="lp-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22,
            background: `linear-gradient(135deg, ${COLORS.green}, #33cc88)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, boxShadow: `0 0 32px ${COLORS.green}44`,
          }}>🎓</div>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 900, letterSpacing: -0.5, margin: 0 }}>
            Ready to start learning?
          </h2>
          <p style={{ fontSize: 14, color: COLORS.muted, margin: 0 }}>
            Join thousands of Indian students learning smarter with AI
          </p>
          <button onClick={() => navigate('/auth')} style={{
            background: `linear-gradient(135deg, ${COLORS.green}, #33cc88)`,
            border: 'none', borderRadius: 14, padding: '16px 52px',
            color: '#04040e', fontSize: 16, fontWeight: 900,
            cursor: 'pointer', fontFamily: 'Sora, sans-serif',
            boxShadow: `0 0 30px ${COLORS.green}44`,
          }}>
            Create Free Account 🚀
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <div className="lp-container" style={{
          padding: '20px 18px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 8,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.muted }}>
            Eduvy<span style={{ color: COLORS.green }}>-AI</span> · विद्या + AI = आपका भविष्य
          </span>
          <span style={{ fontSize: 12, color: COLORS.muted }}>
            CBSE · ICSE · GSEB · MSBSHSE · RBSE · UP Board · TN Board · KAR Board · PSEB · BSEB
          </span>
        </div>
      </footer>
    </div>
  )
}
