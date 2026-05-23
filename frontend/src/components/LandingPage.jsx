import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuthToken, apiGetMe } from '../api.js'

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
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="w-9 h-9 border-[3px] border-app-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className={`w-full bg-app-bg font-sans text-app-text transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>

      {/* ── Sticky Nav ── */}
      <nav className="lp-nav">
        <div className="lp-container flex items-center justify-between py-3.5 px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-app-green to-emerald-400 flex items-center justify-center text-lg shadow-[0_0_14px_rgba(0,229,160,0.27)]">
              🎓
            </div>
            <span className="text-lg font-black tracking-tight">
              Eduvy<span className="text-app-green">-AI</span>
            </span>
          </div>
          <div className="flex gap-2 items-center">
            <a href="#pricing" className="nav-pricing-link text-sm font-semibold text-app-muted no-underline py-2 px-3.5 hidden">
              Pricing
            </a>
            <button 
              onClick={() => navigate('/auth')} 
              className="bg-transparent border border-app-border rounded-xl py-2 px-4 text-app-text text-sm font-semibold cursor-pointer"
            >
              Sign In
            </button>
            <button 
              onClick={() => navigate('/auth')} 
              className="bg-gradient-to-br from-app-green to-emerald-400 border-none rounded-xl py-2 px-4 text-app-bg text-sm font-extrabold cursor-pointer"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-container flex flex-col items-center gap-6 text-center">
          {/* Board pills */}
          <div className="flex gap-2 flex-wrap justify-center">
            {BOARDS.map(b => (
              <span key={b} className="bg-app-blue/15 border border-app-blue/30 rounded-full py-0.5 px-3 text-xs font-semibold text-app-blue">
                {b}
              </span>
            ))}
          </div>

          {/* Headline */}
          <div>
            <h1 className="text-[clamp(34px,5.5vw,64px)] font-black leading-[1.08] tracking-tight m-0">
              India's Smartest<br />
              <span className="text-app-green">AI Tutor</span>
            </h1>
            <p className="text-[clamp(15px,2vw,19px)] text-app-muted mt-4 font-medium leading-relaxed mx-auto max-w-[540px]">
              For every Indian student — Class 1 to 12<br />
              Powered by AI, delivered in your language
            </p>
          </div>

          {/* Animated language */}
          <div className="bg-app-card border border-app-border rounded-xl py-3 px-7 inline-flex items-center gap-2.5">
            <span className="text-sm text-app-muted font-medium">Responding in</span>
            <span className="text-lg font-extrabold text-app-green min-w-[110px] inline-block transition-opacity duration-300">
              {LANGS[langIdx]}
            </span>
          </div>

          {/* CTA buttons */}
          <div className="flex gap-3 flex-wrap justify-center">
            <button 
              onClick={() => navigate('/auth')} 
              className="bg-gradient-to-br from-app-green to-emerald-400 border-none rounded-xl py-4 px-10 text-app-bg text-base font-black cursor-pointer shadow-[0_0_32px_rgba(0,229,160,0.27)]"
            >
              Start Learning Free 🚀
            </button>
            <button 
              onClick={() => navigate('/auth')} 
              className="bg-transparent border border-app-border rounded-xl py-4 px-7 text-app-text text-[15px] font-bold cursor-pointer"
            >
              Sign In →
            </button>
          </div>

          <p className="text-xs text-app-muted font-medium">
            Free to use · No credit card · Works in 11 Indian languages
          </p>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="pb-[72px] bg-app-card2">
        <div className="lp-container pt-14 pb-2">
          <h2 className="text-center text-[clamp(18px,2.5vw,24px)] font-extrabold mb-7 tracking-tight">
            Everything a student needs, in one app
          </h2>
          <div className="lp-grid-features">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-app-card border border-app-border rounded-2xl p-5">
                <div className="text-[28px] mb-2.5">{f.icon}</div>
                <div className="text-[15px] font-extrabold mb-1 text-app-text">{f.title}</div>
                <div className="text-sm text-app-muted leading-normal">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="pb-[72px]">
        <div className="lp-container pt-[60px]">
          <div className="text-center mb-9">
            <h2 className="text-[clamp(20px,3vw,30px)] font-black mb-2.5 tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="text-sm text-app-muted m-0">
              Start free. Upgrade when you're ready. Cancel anytime.
            </p>
          </div>

          <div className="lp-grid-pricing">
            {PLANS_PRICING.map(plan => (
              <div 
                key={plan.key} 
                className={`rounded-2xl p-6 relative flex flex-col ${
                  plan.popular 
                    ? 'border-[1.5px]' 
                    : 'bg-app-card border border-app-border'
                }`}
                style={{ 
                  background: plan.popular ? `${plan.color}0d` : undefined,
                  borderColor: plan.popular ? plan.color : undefined 
                }}
              >
                {plan.popular && (
                  <div 
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-white text-[11px] font-extrabold py-1 px-4 rounded-full whitespace-nowrap tracking-wide"
                    style={{ background: `linear-gradient(90deg, ${plan.color}, #4466ee)` }}
                  >
                    ⭐ MOST POPULAR
                  </div>
                )}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[22px]">{plan.icon}</span>
                    <span className="text-[17px] font-black" style={{ color: plan.color }}>{plan.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-[32px] font-black text-app-text">{plan.price}</span>
                    <span className="text-xs text-app-muted font-medium">/{plan.period}</span>
                  </div>
                  <p className="text-xs text-app-muted m-0 leading-snug">{plan.tagline}</p>
                </div>
                <ul className="list-none m-0 mb-5 p-0 flex flex-col gap-2 flex-1">
                  {plan.features.map((f, i) => (
                    <li 
                      key={i} 
                      className={`flex items-start gap-2 text-[12.5px] ${f.ok ? 'font-semibold text-app-text' : 'font-normal text-app-muted opacity-55'}`}
                    >
                      <span 
                        className="shrink-0 text-sm mt-0.5" 
                        style={{ color: f.ok ? plan.color : undefined }}
                      >
                        {f.ok ? '✓' : '✗'}
                      </span>
                      {f.text}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => navigate('/auth')} 
                  className={`mt-auto rounded-xl py-2.5 px-4 text-sm font-extrabold cursor-pointer w-full tracking-tight ${
                    plan.popular || plan.key === 'free' 
                      ? 'border-none' 
                      : 'border-[1.5px]'
                  }`}
                  style={{
                    background: plan.popular
                      ? `linear-gradient(135deg, ${plan.color}, #4466ee)`
                      : plan.key === 'free'
                        ? 'linear-gradient(135deg, #00E5A0, #33cc88)'
                        : `${plan.color}18`,
                    borderColor: plan.popular || plan.key === 'free' ? undefined : `${plan.color}50`,
                    color: plan.popular || plan.key === 'free' ? (plan.popular ? '#fff' : '#04040e') : plan.color,
                  }}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-app-muted mt-5">
            All plans include access on web &amp; mobile · Plans managed by admin · No hidden charges
          </p>
        </div>
      </section>

      {/* ── Language strip ── */}
      <section className="bg-app-card2 py-12">
        <div className="lp-container">
          <div className="bg-app-card border border-app-border rounded-2xl p-8 text-center">
            <h3 className="text-[clamp(16px,2vw,20px)] font-extrabold mb-2">
              Speaks your language — literally
            </h3>
            <p className="text-sm text-app-muted mb-5">
              Every explanation, quiz, note, and podcast — in your medium
            </p>
            <div className="flex flex-wrap gap-2.5 justify-center">
              {LANGS.map(l => (
                <span key={l} className="bg-app-green/10 border border-app-green/30 rounded-xl py-1.5 px-3.5 text-sm font-bold text-app-green">
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="pt-[72px] pb-20">
        <div className="lp-container flex flex-col items-center gap-5 text-center">
          <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-app-green to-emerald-400 flex items-center justify-center text-4xl shadow-[0_0_32px_rgba(0,229,160,0.27)]">
            🎓
          </div>
          <h2 className="text-[clamp(22px,3vw,30px)] font-black tracking-tight m-0">
            Ready to start learning?
          </h2>
          <p className="text-sm text-app-muted m-0">
            Join thousands of Indian students learning smarter with AI
          </p>
          <button 
            onClick={() => navigate('/auth')} 
            className="bg-gradient-to-br from-app-green to-emerald-400 border-none rounded-xl py-4 px-[52px] text-app-bg text-base font-black cursor-pointer shadow-[0_0_30px_rgba(0,229,160,0.27)]"
          >
            Create Free Account 🚀
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-app-border">
        <div className="lp-container py-5 px-4 pb-8 flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-bold text-app-muted">
            Eduvy<span className="text-app-green">-AI</span> · विद्या + AI = आपका भविष्य
          </span>
          <span className="text-xs text-app-muted">
            CBSE · ICSE · GSEB · MSBSHSE · RBSE · UP Board · TN Board · KAR Board · PSEB · BSEB
          </span>
        </div>
      </footer>
    </div>
  )
}
