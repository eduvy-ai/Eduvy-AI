import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { COLORS, callAI, buildSystemPrompt, parseAIObject, checkStudentQuery } from '../../App.jsx'
import { getStarters, getDisplayLang } from '../../shared.js'
import { li } from '../../i18n/index.js'
import { apiGetDraft, apiSaveDraft } from '../../api.js'

const LANG_VOICE = {
  English:'en-IN', Hindi:'hi-IN', Gujarati:'gu-IN', Marathi:'mr-IN',
  Tamil:'ta-IN', Telugu:'te-IN', Kannada:'kn-IN', Bengali:'bn-IN',
  Punjabi:'pa-IN', Odia:'or-IN', Urdu:'ur-IN',
}

// -- Pick the best TTS voice for a language ------------------
// Chrome often has multiple voices per lang � prefer natural/Google voices.
// ALWAYS returns a voice if ANY voices exist (falls back to English/any).
function pickVoice(lang) {
  if (!('speechSynthesis' in window)) return null
  const code = LANG_VOICE[lang] || 'en-IN'
  const all = window.speechSynthesis.getVoices()
  if (all.length === 0) return null

  // 1. Prefer voices matching exact locale (e.g. hi-IN)
  let matches = all.filter(v => v.lang === code || v.lang.replace('_','-') === code)
  // 2. Broader match: same language family (e.g. hi-*)
  if (!matches.length) matches = all.filter(v => v.lang.startsWith(code.split('-')[0]))
  // 3. Fallback: English voices
  if (!matches.length) matches = all.filter(v => v.lang.startsWith('en'))
  // 4. Last resort: any available voice
  if (!matches.length) matches = all

  // Prefer: Google > Natural > Microsoft > any (Google voices sound best)
  const priority = ['Google', 'Natural', 'Microsoft']
  for (const p of priority) { const m = matches.find(v => v.name.includes(p)); if (m) return m }
  return matches[0]
}

// -- Board visual styles -----------------------------------------
const BS = {
  chalk:  { bg:'#0d1a0a', surface:'#132011', border:'#2a4420', text:'#e8f0e0', dim:'#6a9a58', accent:'#c8e8a0', font:"'Caveat',cursive",       label:'🖤 Chalk',  dark:true  },
  marker: { bg:'#f5f0e8', surface:'#ede7da', border:'#c8b898', text:'#181208', dim:'#7a6848', accent:'#1a3a9a', font:"'Patrick Hand',cursive",   label:'🖊 Marker', dark:false },
  color:  { bg:'#0b0b1c', surface:'#101022', border:'#ffffff10',text:'#eeeeff', dim:'#6868a0', accent:'#00E5A0', font:"'Sora',sans-serif",       label:'🎨 Color',  dark:true  },
}
const SCENE_COLS = ['#00E5A0','#7B9CFF','#FFD166','#FF6B35','#FF6B6B','#BB86FC','#03DAC6','#FF8A80','#82B1FF','#CCFF90']

// Per-scene accent palettes � every scene gets its own color, all 3 board styles
const SCENE_PALETTE = {
  chalk:  ['#a8ffb0','#7ecfff','#ffe893','#ffb46a','#ff9090','#d4a0ff','#68e8d8','#ffa8a0','#a0c8ff','#c0ff98'],
  marker: ['#0a7a15','#1a3aaa','#7a5a00','#8a2500','#7a0030','#5a1a8a','#0a6a5a','#8a1a0a','#1a4a8a','#2a6a0a'],
  color:  ['#00E5A0','#7B9CFF','#FFD166','#FF6B35','#FF6B6B','#BB86FC','#03DAC6','#FF8A80','#82B1FF','#CCFF90'],
}

const u16 = s => [...(s||'')].reduce((n,c) => n + (c.codePointAt(0) > 0xFFFF ? 2 : 1), 0)

// ----------------------------------------------------------------
// TOPIC-SMART SELF-DRAWING SVG DIAGRAMS
// 17 types � 2-4 layout variants each.
// hashSeed(elements+type) ? stable variant: same topic = same diagram,
// different topic = genuinely different layout, angles and curve shape.
// All use CSS stroke-dashoffset animation.
// ----------------------------------------------------------------

// Stable FNV-1a hash ? 0..1  (same string always gives same float)
function hashSeed(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < (str||'').length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) | 0
  }
  return (h >>> 0) / 4294967296
}

// -- Animation timing helper ---------------------------------
// Scale factor to stretch all diagram animations across the full scene duration.
// Original animations total ~3.5s. This stretches them to match the scene.
//   dur = total scene seconds (from timing.total_sec, e.g. 12)
//   The factor is capped at 5x to avoid excessively slow drawing on long scenes.
function timeScale(dur) {
  const target = Math.max(dur || 10, 6)   // at least 6 seconds
  return Math.min(target / 3.5, 5)        // scale original ~3.5s to fill scene, max 5x
}

// Distributes n elements across the scene duration so each element
// draws in sync with the corresponding sentence/narration chunk.
// Returns { delay, drawDur, fadeDur } for element at index i.
//   dur = total scene seconds (e.g. 12)
//   n   = number of animated elements (typically 3-4)
//   drawFrac = fraction of each slot spent drawing (vs fading text in)
function animSlot(dur, n, i, drawFrac = 0.55) {
  const total = dur || 10
  const slotSec = total / Math.max(n, 1)         // each element gets an equal time slot
  const delay   = i * slotSec                     // stagger start across duration
  const drawDur = Math.max(0.4, slotSec * drawFrac)  // shape drawing time
  const fadeDur = Math.max(0.25, slotSec * (1 - drawFrac) * 0.6) // text fade-in time
  const fadeDelay = delay + drawDur * 0.7         // text starts before draw finishes
  return { delay: +delay.toFixed(2), drawDur: +drawDur.toFixed(2), fadeDur: +fadeDur.toFixed(2), fadeDelay: +fadeDelay.toFixed(2), slotSec: +slotSec.toFixed(2) }
}

// -- 1. STEPS ------------------------------------------------
// V0: horizontal boxes+arrows  V1: numbered circles  V2: chevron flow
function StepsSVG({ els, stroke, tf, seed, dur }) {
  const n = Math.min(els.length || 2, 4)
  const v = Math.floor(seed * 3)

  if (v === 1) {
    // Vertical numbered circles
    const slotH = 34, cy0 = 16
    return (
      <svg viewBox="0 0 300 142" width="100%" style={{ maxHeight:142 }}>
        {els.slice(0,n).map((el, i) => {
          const cy = cy0 + i * slotH
          const a = animSlot(dur, n, i)
          return (
            <g key={i}>
              {i < n-1 && <line x1={26} y1={cy+14} x2={26} y2={cy+slotH-14}
                style={{ stroke, strokeWidth:2, strokeDasharray:slotH-28, strokeDashoffset:slotH-28, opacity:0.5,
                  animation:`wbDraw ${a.drawDur*0.4}s ${a.fadeDelay}s ease-out forwards` }}/>}
              <circle cx={26} cy={cy} r={13} fill="none"
                style={{ stroke, strokeWidth:2.5, strokeDasharray:82, strokeDashoffset:82,
                  animation:`wbDraw ${a.drawDur}s ${a.delay}s ease-out forwards` }}/>
              <text x={26} y={cy+5} textAnchor="middle" fill={stroke} fontSize={12}
                fontFamily="'Caveat',cursive" fontWeight="800"
                style={{ opacity:0, animation:`wbFade ${a.fadeDur}s ${a.fadeDelay}s forwards` }}>{i+1}</text>
              <text x={54} y={cy+5} fill={tf}
                fontSize={Math.max(8,Math.min(12,180/(el?.length||7)))} fontFamily="inherit" fontWeight="600"
                style={{ opacity:0, animation:`wbFade ${a.fadeDur}s ${a.fadeDelay+0.1}s forwards` }}>{el}</text>
            </g>
          )
        })}
      </svg>
    )
  }

  if (v === 2) {
    // Chevron/arrow flow
    const bw = n<=3 ? 76 : 58, bh = 32, chv = 11
    const startX = (300 - n*(bw+4)) / 2
    return (
      <svg viewBox="0 0 300 86" width="100%" style={{ maxHeight:86 }}>
        {els.slice(0,n).map((el, i) => {
          const x = startX + i*(bw+4)
          const a = animSlot(dur, n, i)
          const pts = i === 0
            ? `${x},${26} ${x+bw},${26} ${x+bw+chv},${26+bh/2} ${x+bw},${26+bh} ${x},${26+bh}`
            : `${x},${26} ${x+bw},${26} ${x+bw+chv},${26+bh/2} ${x+bw},${26+bh} ${x},${26+bh} ${x+chv},${26+bh/2}`
          return (
            <g key={i}>
              <polygon points={pts} fill="none"
                style={{ stroke, strokeWidth:2, strokeDasharray:300, strokeDashoffset:300,
                  animation:`wbDraw ${a.drawDur}s ${a.delay}s ease-out forwards` }}/>
              <text x={x+bw/2+(i>0?chv/2:0)} y={26+bh/2+5} textAnchor="middle" fill={tf}
                fontSize={Math.max(7,Math.min(11,52/(el?.length||5)))} fontFamily="inherit" fontWeight="700"
                style={{ opacity:0, animation:`wbFade ${a.fadeDur}s ${a.fadeDelay}s forwards` }}>{el}</text>
            </g>
          )
        })}
      </svg>
    )
  }

  // V0: horizontal boxes+arrows
  const layouts = {
    1:[[85,22,130,42]],
    2:[[10,22,118,42],[172,22,118,42]],
    3:[[4,22,87,42],[106,22,87,42],[208,22,87,42]],
    4:[[2,22,66,42],[76,22,66,42],[150,22,66,42],[226,22,66,42]],
  }
  const boxes = layouts[n] || layouts[3]
  return (
    <svg viewBox="0 0 300 88" width="100%" style={{ maxHeight:88, overflow:'visible' }}>
      {boxes.map(([bx,by,bw,bh], i) => {
        const p=2*(bw+bh)
        const a = animSlot(dur, boxes.length, i)
        return (
          <g key={i}>
            <rect x={bx} y={by} width={bw} height={bh} rx={9} fill="none"
              style={{ stroke, strokeWidth:2.5, strokeDasharray:p, strokeDashoffset:p,
                animation:`wbDraw ${a.drawDur}s ${a.delay}s ease-out forwards` }}/>
            <text x={bx+bw/2} y={by+bh/2+5} textAnchor="middle" fill={tf}
              fontSize={Math.max(8,Math.min(12,68/(els[i]?.length||6)))} fontFamily="inherit" fontWeight="600"
              style={{ opacity:0, animation:`wbFade ${a.fadeDur}s ${a.fadeDelay}s forwards` }}>{els[i]}</text>
          </g>
        )
      })}
      {boxes.slice(0,-1).map(([bx,,bw], i) => {
        const x1=bx+bw+3, y1=43, x2=boxes[i+1][0]-3, len=x2-x1
        const a = animSlot(dur, boxes.length, i)
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y1}
              style={{ stroke, strokeWidth:2, strokeDasharray:len, strokeDashoffset:len,
                animation:`wbDraw ${a.drawDur*0.4}s ${a.fadeDelay}s ease-out forwards` }}/>
            <polygon points={`${x2},${y1} ${x2-9},${y1-5} ${x2-9},${y1+5}`} fill={stroke}
              style={{ opacity:0, animation:`wbFade 0.15s ${a.fadeDelay+a.drawDur*0.3}s forwards` }}/>
          </g>
        )
      })}
    </svg>
  )
}

// -- 2. CONCEPT: radial mindmap -------------------------------
// V0: circle nodes (start angle rotated by seed)  V1: rounded-rect nodes
function ConceptSVG({ els, stroke, tf, seed, dur }) {
  const n = Math.min(els.length, 4)
  if (!n) return null
  const v = Math.floor(seed * 2)
  const cx=150, cy=88, cr=30, dist=80
  const startA = -Math.PI/2 + seed * Math.PI * 0.85
  const nodes = els.slice(0,n).map((el,i) => {
    const a = startA + 2*Math.PI*i/n
    return { x:cx+dist*Math.cos(a), y:cy+dist*Math.sin(a), el, a }
  })

  // Core circle draws in first 15% of scene, then nodes spread across remaining time
  const coreEnd = (dur||10) * 0.15

  if (v === 1) {
    const nw=44, nh=20
    return (
      <svg viewBox="0 0 300 175" width="100%" style={{ maxHeight:175 }}>
        <circle cx={cx} cy={cy} r={cr} fill="none"
          style={{ stroke, strokeWidth:2.5, strokeDasharray:2*Math.PI*cr, strokeDashoffset:2*Math.PI*cr,
            animation:`wbDraw ${coreEnd}s 0s ease-out forwards` }}/>
        <text x={cx} y={cy+5} textAnchor="middle" fill={stroke} fontSize={9}
          fontFamily="inherit" fontWeight="800"
          style={{ opacity:0, animation:`wbFade 0.3s ${coreEnd*0.85}s forwards` }}>CORE</text>
        {nodes.map(({x,y,el,a}, i) => {
          const a2 = animSlot((dur||10) - coreEnd, n, i)
          const ld = coreEnd + a2.delay, nd = ld + a2.drawDur*0.5, td = nd + a2.drawDur*0.4
          const x1=cx+(cr+4)*Math.cos(a), y1=cy+(cr+4)*Math.sin(a)
          const ll=Math.hypot(x-x1, y-y1)
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x-(nw/2+2)*Math.cos(a)} y2={y-(nh/2+2)*Math.sin(a)}
                style={{ stroke, strokeWidth:1.8, strokeDasharray:ll, strokeDashoffset:ll,
                  animation:`wbDraw ${a2.drawDur*0.4}s ${ld}s ease-out forwards` }}/>
              <rect x={x-nw/2} y={y-nh/2} width={nw} height={nh} rx={5} fill="none"
                style={{ stroke, strokeWidth:2, strokeDasharray:2*(nw+nh), strokeDashoffset:2*(nw+nh),
                  animation:`wbDraw ${a2.drawDur}s ${nd}s ease-out forwards` }}/>
              <text x={x} y={y+4} textAnchor="middle" fill={tf}
                fontSize={Math.max(7,Math.min(10,40/(el?.length||5)))} fontFamily="inherit" fontWeight="600"
                style={{ opacity:0, animation:`wbFade ${a2.fadeDur}s ${td}s forwards` }}>{el}</text>
            </g>
          )
        })}
      </svg>
    )
  }

  const nr=24
  return (
    <svg viewBox="0 0 300 175" width="100%" style={{ maxHeight:175 }}>
      <circle cx={cx} cy={cy} r={cr} fill="none"
        style={{ stroke, strokeWidth:2.5, strokeDasharray:2*Math.PI*cr, strokeDashoffset:2*Math.PI*cr,
          animation:`wbDraw ${coreEnd}s 0s ease-out forwards` }}/>
      <text x={cx} y={cy+5} textAnchor="middle" fill={stroke} fontSize={9}
        fontFamily="inherit" fontWeight="800"
        style={{ opacity:0, animation:`wbFade 0.3s ${coreEnd*0.85}s forwards` }}>CORE</text>
      {nodes.map(({x,y,el,a}, i) => {
        const a2 = animSlot((dur||10) - coreEnd, n, i)
        const ld = coreEnd + a2.delay, nd = ld + a2.drawDur*0.5, td = nd + a2.drawDur*0.5
        const x1=cx+(cr+4)*Math.cos(a), y1=cy+(cr+4)*Math.sin(a)
        const x2=x-(nr+3)*Math.cos(a), y2=y-(nr+3)*Math.sin(a)
        const ll=Math.hypot(x2-x1,y2-y1)
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              style={{ stroke, strokeWidth:1.8, strokeDasharray:ll, strokeDashoffset:ll,
                animation:`wbDraw ${a2.drawDur*0.4}s ${ld}s ease-out forwards` }}/>
            <circle cx={x} cy={y} r={nr} fill="none"
              style={{ stroke, strokeWidth:2, strokeDasharray:2*Math.PI*nr, strokeDashoffset:2*Math.PI*nr,
                animation:`wbDraw ${a2.drawDur}s ${nd}s ease-out forwards` }}/>
            <text x={x} y={y+4} textAnchor="middle" fill={tf}
              fontSize={Math.max(7,Math.min(10,58/(el?.length||6)))} fontFamily="inherit" fontWeight="600"
              style={{ opacity:0, animation:`wbFade ${a2.fadeDur}s ${td}s forwards` }}>{el}</text>
          </g>
        )
      })}
    </svg>
  )
}

// -- 3. CYCLE: circular flow ----------------------------------
// V0: circle nodes (start angle from seed)  V1: diamond nodes
function CycleSVG({ els, stroke, tf, seed, dur }) {
  const n = Math.min(Math.max(els.length,2), 5)
  const v = Math.floor(seed * 2)
  const cx=150, cy=86, dist=66
  // Seed-rotated start � no two topics look the same
  const startA = -Math.PI/2 + seed * Math.PI * 0.6
  const nodes = els.slice(0,n).map((el,i) => {
    const a = startA + 2*Math.PI*i/n
    return { x:cx+dist*Math.cos(a), y:cy+dist*Math.sin(a), el, a }
  })

  if (v === 1) {
    // Diamond nodes
    const ds = 15
    return (
      <svg viewBox="0 0 300 172" width="100%" style={{ maxHeight:172 }}>
        <circle cx={cx} cy={cy} r={dist} fill="none"
          style={{ stroke, strokeWidth:1, strokeDasharray:'4 4', opacity:0.2 }}/>
        {nodes.map(({x,y,el}, i) => {
          const d=i*0.88
          const dp=`${x},${y-ds} ${x+ds},${y} ${x},${y+ds} ${x-ds},${y}`
          return (
            <g key={i}>
              <polygon points={dp} fill="none"
                style={{ stroke, strokeWidth:2, strokeDasharray:ds*4*Math.SQRT2, strokeDashoffset:ds*4*Math.SQRT2,
                  animation:`wbDraw 0.52s ${d}s ease-out forwards` }}/>
              <text x={x} y={y+4} textAnchor="middle" fill={tf}
                fontSize={Math.max(6,Math.min(9,52/(el?.length||6)))} fontFamily="inherit" fontWeight="600"
                style={{ opacity:0, animation:`wbFade 0.3s ${d+0.48}s forwards` }}>{el}</text>
            </g>
          )
        })}
        {nodes.map(({x:fx,y:fy}, i) => {
          const {x:tx,y:ty}=nodes[(i+1)%n]
          const ang=Math.atan2(ty-fy,tx-fx), ds2=ds*1.3
          const x1=fx+ds2*Math.cos(ang), y1=fy+ds2*Math.sin(ang)
          const x2=tx-ds2*Math.cos(ang)-10*Math.cos(ang), y2=ty-ds2*Math.sin(ang)-10*Math.sin(ang)
          const len=Math.hypot(x2-x1,y2-y1), d=i*0.88+0.55
          const c=Math.cos(ang), s=Math.sin(ang)
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                style={{ stroke, strokeWidth:2, strokeDasharray:len, strokeDashoffset:len,
                  animation:`wbDraw 0.36s ${d}s ease-out forwards` }}/>
              <polygon points={`${x2},${y2} ${x2-9*c+5*s},${y2-9*s-5*c} ${x2-9*c-5*s},${y2-9*s+5*c}`}
                fill={stroke} style={{ opacity:0, animation:`wbFade 0.15s ${d+0.33}s forwards` }}/>
            </g>
          )
        })}
      </svg>
    )
  }

  // V0: circle nodes
  const nr=22
  return (
    <svg viewBox="0 0 300 172" width="100%" style={{ maxHeight:172 }}>
      <circle cx={cx} cy={cy} r={dist} fill="none"
        style={{ stroke, strokeWidth:1, strokeDasharray:'5 4', opacity:0.22 }}/>
      {nodes.map(({x,y,el}, i) => {
        const d=i*0.88
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={nr} fill="none"
              style={{ stroke, strokeWidth:2, strokeDasharray:2*Math.PI*nr, strokeDashoffset:2*Math.PI*nr,
                animation:`wbDraw 0.52s ${d}s ease-out forwards` }}/>
            <text x={x} y={y+4} textAnchor="middle" fill={tf}
              fontSize={Math.max(7,Math.min(10,58/(el?.length||6)))} fontFamily="inherit" fontWeight="600"
              style={{ opacity:0, animation:`wbFade 0.3s ${d+0.48}s forwards` }}>{el}</text>
          </g>
        )
      })}
      {nodes.map(({x:fx,y:fy}, i) => {
        const {x:tx,y:ty}=nodes[(i+1)%n]
        const ang=Math.atan2(ty-fy,tx-fx)
        const x1=fx+(nr+4)*Math.cos(ang), y1=fy+(nr+4)*Math.sin(ang)
        const x2=tx-(nr+12)*Math.cos(ang), y2=ty-(nr+12)*Math.sin(ang)
        const len=Math.hypot(x2-x1,y2-y1), d=i*0.88+0.55
        const c=Math.cos(ang), s=Math.sin(ang)
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              style={{ stroke, strokeWidth:2, strokeDasharray:len, strokeDashoffset:len,
                animation:`wbDraw 0.36s ${d}s ease-out forwards` }}/>
            <polygon points={`${x2},${y2} ${x2-9*c+5*s},${y2-9*s-5*c} ${x2-9*c-5*s},${y2-9*s+5*c}`}
              fill={stroke} style={{ opacity:0, animation:`wbFade 0.15s ${d+0.33}s forwards` }}/>
          </g>
        )
      })}
    </svg>
  )
}

// -- 4. FORMULA: double-bordered box -------------------------
function FormulaSVG({ els, stroke, tf, seed, dur }) {
  const main=els[0]||'?', sub=els[1]||''
  const bx=15,by=12,bw=270,bh=62, p=2*(bw+bh)
  return (
    <svg viewBox="0 0 300 105" width="100%" style={{ maxHeight:105 }}>
      <rect x={bx+4} y={by+4} width={bw} height={bh} rx={11} fill="none"
        style={{ stroke, strokeWidth:1, opacity:0.3, strokeDasharray:p+20, strokeDashoffset:p+20,
          animation:'wbDraw 1.1s 0.05s ease-out forwards' }}/>
      <rect x={bx} y={by} width={bw} height={bh} rx={11} fill="none"
        style={{ stroke, strokeWidth:3, strokeDasharray:p, strokeDashoffset:p,
          animation:'wbDraw 0.95s 0s ease-out forwards' }}/>
      <text x={150} y={by+bh/2+10} textAnchor="middle" fill={stroke}
        fontSize={Math.min(28,Math.max(15,200/(main.length||1)))}
        fontFamily="'Caveat',cursive" fontWeight="700"
        style={{ opacity:0, animation:'wbFade 0.4s 0.85s forwards' }}>{main}</text>
      {sub && <text x={150} y={by+bh+22} textAnchor="middle" fill={tf} fontSize={11}
        fontFamily="inherit" fontStyle="italic"
        style={{ opacity:0, animation:'wbFade 0.4s 1.2s forwards' }}>{sub}</text>}
    </svg>
  )
}

// -- 5. COMPARISON -------------------------------------------
// V0: T-chart   V1: two bordered cards with VS badge
function ComparisonSVG({ els, stroke, tf, seed, dur }) {
  const v = Math.floor(seed * 2)
  const mx=150, hh=26

  if (v === 1) {
    const lTitle=els[0]||'A', rTitle=els[1]||'B'
    const items=els.slice(2).filter(Boolean)
    const left=items.filter((_,i)=>i%2===0).slice(0,3)
    const right=items.filter((_,i)=>i%2===1).slice(0,3)
    return (
      <svg viewBox="0 0 300 140" width="100%" style={{ maxHeight:140 }}>
        <rect x={6} y={6} width={130} height={128} rx={11} fill="none"
          style={{ stroke, strokeWidth:2, strokeDasharray:520, strokeDashoffset:520,
            animation:'wbDraw 0.62s 0s ease-out forwards' }}/>
        <rect x={164} y={6} width={130} height={128} rx={11} fill="none"
          style={{ stroke, strokeWidth:2, strokeDasharray:520, strokeDashoffset:520,
            animation:'wbDraw 0.62s 0.18s ease-out forwards' }}/>
        <text x={71} y={26} textAnchor="middle" fill={stroke} fontSize={11}
          fontFamily="inherit" fontWeight="800"
          style={{ opacity:0, animation:'wbFade 0.3s 0.58s forwards' }}>{lTitle}</text>
        <text x={229} y={26} textAnchor="middle" fill={stroke} fontSize={11}
          fontFamily="inherit" fontWeight="800"
          style={{ opacity:0, animation:'wbFade 0.3s 0.58s forwards' }}>{rTitle}</text>
        <line x1={14} y1={32} x2={128} y2={32}
          style={{ stroke, strokeWidth:1, opacity:0.35, strokeDasharray:114, strokeDashoffset:114,
            animation:'wbDraw 0.28s 0.78s ease-out forwards' }}/>
        <line x1={172} y1={32} x2={286} y2={32}
          style={{ stroke, strokeWidth:1, opacity:0.35, strokeDasharray:114, strokeDashoffset:114,
            animation:'wbDraw 0.28s 0.78s ease-out forwards' }}/>
        {left.map((it,i) => <text key={i} x={71} y={50+i*22} textAnchor="middle" fill={tf}
          fontSize={10} fontFamily="inherit"
          style={{ opacity:0, animation:`wbFade 0.3s ${1.0+i*0.28}s forwards` }}>{it}</text>)}
        {right.map((it,i) => <text key={i} x={229} y={50+i*22} textAnchor="middle" fill={tf}
          fontSize={10} fontFamily="inherit"
          style={{ opacity:0, animation:`wbFade 0.3s ${1.0+i*0.28}s forwards` }}>{it}</text>)}
        <text x={150} y={76} textAnchor="middle" fill={stroke} fontSize={16}
          fontFamily="'Caveat',cursive" fontWeight="900"
          style={{ opacity:0, animation:'wbFade 0.4s 0.88s forwards' }}>VS</text>
      </svg>
    )
  }

  // V0: T-chart
  const left=els.filter((_,i)=>i%2===0).slice(0,3)
  const right=els.filter((_,i)=>i%2===1).slice(0,3)
  return (
    <svg viewBox="0 0 300 128" width="100%" style={{ maxHeight:128 }}>
      <line x1={mx} y1={0} x2={mx} y2={128}
        style={{ stroke, strokeWidth:2.5, strokeDasharray:128, strokeDashoffset:128,
          animation:'wbDraw 0.48s 0s ease-out forwards' }}/>
      <line x1={0} y1={hh} x2={300} y2={hh}
        style={{ stroke, strokeWidth:2, strokeDasharray:300, strokeDashoffset:300,
          animation:'wbDraw 0.44s 0.38s ease-out forwards' }}/>
      {left[0]&&<text x={mx/2} y={hh-9} textAnchor="middle" fill={stroke} fontSize={11}
        fontFamily="inherit" fontWeight="800"
        style={{ opacity:0, animation:'wbFade 0.3s 0.74s forwards' }}>{left[0]}</text>}
      {right[0]&&<text x={mx+mx/2} y={hh-9} textAnchor="middle" fill={stroke} fontSize={11}
        fontFamily="inherit" fontWeight="800"
        style={{ opacity:0, animation:'wbFade 0.3s 0.74s forwards' }}>{right[0]}</text>}
      {left.slice(1).map((el,i) => <text key={i} x={mx/2} y={hh+20+i*24}
        textAnchor="middle" fill={tf} fontSize={10} fontFamily="inherit"
        style={{ opacity:0, animation:`wbFade 0.3s ${1.0+i*0.32}s forwards` }}>{el}</text>)}
      {right.slice(1).map((el,i) => <text key={i} x={mx+mx/2} y={hh+20+i*24}
        textAnchor="middle" fill={tf} fontSize={10} fontFamily="inherit"
        style={{ opacity:0, animation:`wbFade 0.3s ${1.0+i*0.32}s forwards` }}>{el}</text>)}
    </svg>
  )
}

// -- 6. TIMELINE ---------------------------------------------
// V0: horizontal with alternating above/below  V1: vertical with dots
function TimelineSVG({ els, stroke, tf, seed, dur }) {
  const n=Math.min(els.length,4)
  if (!n) return null
  const v = Math.floor(seed * 2)

  if (v === 1) {
    const slotH=30, lineX=22
    return (
      <svg viewBox="0 0 300 132" width="100%" style={{ maxHeight:132 }}>
        <line x1={lineX} y1={8} x2={lineX} y2={8+n*slotH}
          style={{ stroke, strokeWidth:2.5, strokeDasharray:n*slotH, strokeDashoffset:n*slotH,
            animation:'wbDraw 0.62s 0s ease-out forwards' }}/>
        {els.slice(0,n).map((el,i) => {
          const cy=8+i*slotH+slotH/2, d=0.58+i*0.58
          return (
            <g key={i}>
              <circle cx={lineX} cy={cy} r={6} fill={stroke}
                style={{ opacity:0, animation:`wbFade 0.22s ${d}s forwards` }}/>
              <line x1={lineX+6} y1={cy} x2={42} y2={cy}
                style={{ stroke, strokeWidth:1.5, strokeDasharray:16, strokeDashoffset:16,
                  animation:`wbDraw 0.18s ${d}s ease-out forwards` }}/>
              <text x={46} y={cy+4} fill={tf}
                fontSize={Math.max(8,Math.min(11,200/(el?.length||8)))} fontFamily="inherit" fontWeight="600"
                style={{ opacity:0, animation:`wbFade 0.3s ${d+0.18}s forwards` }}>{el}</text>
            </g>
          )
        })}
      </svg>
    )
  }

  // V0: horizontal
  const y=56, xs=n<=2?[80,220]:n===3?[60,150,240]:[40,120,200,280]
  return (
    <svg viewBox="0 0 300 112" width="100%" style={{ maxHeight:112 }}>
      <line x1={20} y1={y} x2={280} y2={y}
        style={{ stroke, strokeWidth:2.5, strokeDasharray:260, strokeDashoffset:260,
          animation:'wbDraw 0.7s 0s ease-out forwards' }}/>
      <polygon points={`280,${y} 270,${y-5} 270,${y+5}`} fill={stroke}
        style={{ opacity:0, animation:'wbFade 0.2s 0.65s forwards' }}/>
      {xs.map((x,i) => {
        const d=0.65+i*0.68, above=i%2===0
        return (
          <g key={i}>
            <line x1={x} y1={y-8} x2={x} y2={y+8}
              style={{ stroke, strokeWidth:2, strokeDasharray:16, strokeDashoffset:16,
                animation:`wbDraw 0.22s ${d}s ease-out forwards` }}/>
            <circle cx={x} cy={y} r={5} fill={stroke}
              style={{ opacity:0, animation:`wbFade 0.2s ${d+0.15}s forwards` }}/>
            <text x={x} y={above?y-16:y+22} textAnchor="middle" fill={tf}
              fontSize={Math.max(7,Math.min(10,52/(els[i]?.length||5)))} fontFamily="inherit" fontWeight="600"
              style={{ opacity:0, animation:`wbFade 0.3s ${d+0.24}s forwards` }}>{els[i]}</text>
          </g>
        )
      })}
    </svg>
  )
}

// -- 7. GRAPH: axes + data curve ------------------------------
// 4 curve shapes based on seed: exponential/rise, decay/fall, S-curve, bell
// Each also has seed-controlled grid density
function GraphSVG({ els, stroke, tf, seed, dur }) {
  const xLabel=els[0]||'X', yLabel=els[1]||'Y', curveLabel=els[2]||''
  const v = Math.floor(seed * 4)
  // Different curve per variant � topic determines which shape
  const curvePaths = [
    'M 30,128 C 55,122 90,95 130,65 S 200,28 268,18',       // V0: exponential rise
    'M 30,18  C 55,20 100,52 145,75 S 220,118 268,128',      // V1: exponential decay
    'M 30,128 C 55,126 78,100 110,72 S 175,22 268,18',       // V2: S-curve
    'M 30,128 C 65,110 105,18 150,16 S 215,108 268,128',     // V3: bell / parabola
  ]
  // Label position based on curve shape (where there's space)
  const lblPos = [[252,26],[252,130],[252,26],[148,14]]
  const path = curvePaths[v]
  const [lx,ly] = lblPos[v]
  return (
    <svg viewBox="0 0 300 150" width="100%" style={{ maxHeight:150 }}>
      {/* Light grid */}
      {[40,72,104].map(gy => <line key={gy} x1={30} y1={gy} x2={268} y2={gy}
        style={{ stroke, strokeWidth:0.5, opacity:0.1, strokeDasharray:'3 4' }}/>)}
      {[90,150,210].map(gx => <line key={gx} x1={gx} y1={18} x2={gx} y2={140}
        style={{ stroke, strokeWidth:0.5, opacity:0.1, strokeDasharray:'3 4' }}/>)}
      {/* Axes */}
      <line x1={30} y1={10} x2={30} y2={140}
        style={{ stroke, strokeWidth:2.5, strokeDasharray:130, strokeDashoffset:130,
          animation:'wbDraw 0.44s 0s ease-out forwards' }}/>
      <line x1={20} y1={140} x2={280} y2={140}
        style={{ stroke, strokeWidth:2.5, strokeDasharray:260, strokeDashoffset:260,
          animation:'wbDraw 0.44s 0.4s ease-out forwards' }}/>
      <polygon points="30,10 25,22 35,22" fill={stroke}
        style={{ opacity:0, animation:'wbFade 0.2s 0.4s forwards' }}/>
      <polygon points="280,140 268,135 268,145" fill={stroke}
        style={{ opacity:0, animation:'wbFade 0.2s 0.8s forwards' }}/>
      <text x={150} y={155} textAnchor="middle" fill={tf} fontSize={10} fontFamily="inherit"
        style={{ opacity:0, animation:'wbFade 0.3s 0.84s forwards' }}>{xLabel}</text>
      <text x={14} y={80} textAnchor="middle" fill={tf} fontSize={10} fontFamily="inherit"
        transform="rotate(-90,14,80)"
        style={{ opacity:0, animation:'wbFade 0.3s 0.84s forwards' }}>{yLabel}</text>
      {/* Self-drawing curve � shape chosen by seed */}
      <path d={path} fill="none"
        style={{ stroke, strokeWidth:2.8, strokeDasharray:310, strokeDashoffset:310,
          animation:'wbDraw 1.1s 0.84s ease-in-out forwards' }}/>
      {curveLabel && <text x={lx} y={ly} textAnchor="middle" fill={stroke} fontSize={10}
        fontFamily="'Caveat',cursive" fontWeight="700"
        style={{ opacity:0, animation:'wbFade 0.3s 1.9s forwards' }}>{curveLabel}</text>}
    </svg>
  )
}

// -- 8. TREE: branching hierarchy -----------------------------
// V0: top-down  V1: left-to-right dendrogram
function TreeSVG({ els, stroke, tf, seed, dur }) {
  const root=els[0]||'Root', children=els.slice(1,4), nc=children.length||2
  const v = Math.floor(seed * 2)

  if (v === 1) {
    const rootX=30, rootY=70, rootR=20
    const slotH=nc<=2?50:36, startY=70-(nc-1)*slotH/2
    const childX=160, childR=18
    return (
      <svg viewBox="0 0 300 140" width="100%" style={{ maxHeight:140 }}>
        <circle cx={rootX} cy={rootY} r={rootR} fill="none"
          style={{ stroke, strokeWidth:2.5, strokeDasharray:2*Math.PI*rootR, strokeDashoffset:2*Math.PI*rootR,
            animation:'wbDraw 0.62s 0s ease-out forwards' }}/>
        <text x={rootX} y={rootY+4} textAnchor="middle" fill={stroke}
          fontSize={Math.max(6,Math.min(9,40/(root.length||5)))} fontFamily="inherit" fontWeight="800"
          style={{ opacity:0, animation:'wbFade 0.3s 0.58s forwards' }}>{root}</text>
        <line x1={rootX+rootR} y1={rootY} x2={90} y2={rootY}
          style={{ stroke, strokeWidth:1.8, strokeDasharray:60, strokeDashoffset:60,
            animation:'wbDraw 0.28s 0.62s ease-out forwards' }}/>
        {nc>1 && <line x1={90} y1={startY} x2={90} y2={startY+(nc-1)*slotH}
          style={{ stroke, strokeWidth:1.8, strokeDasharray:(nc-1)*slotH, strokeDashoffset:(nc-1)*slotH,
            animation:'wbDraw 0.28s 0.88s ease-out forwards' }}/>}
        {children.map((el,i) => {
          const cy=startY+i*slotH, d=0.9+i*0.72
          return (
            <g key={i}>
              <line x1={90} y1={cy} x2={childX-childR} y2={cy}
                style={{ stroke, strokeWidth:1.8, strokeDasharray:68, strokeDashoffset:68,
                  animation:`wbDraw 0.28s ${d}s ease-out forwards` }}/>
              <circle cx={childX} cy={cy} r={childR} fill="none"
                style={{ stroke, strokeWidth:2, strokeDasharray:2*Math.PI*childR, strokeDashoffset:2*Math.PI*childR,
                  animation:`wbDraw 0.46s ${d+0.24}s ease-out forwards` }}/>
              <text x={childX} y={cy+4} textAnchor="middle" fill={tf}
                fontSize={Math.max(6,Math.min(9,46/(el?.length||5)))} fontFamily="inherit" fontWeight="600"
                style={{ opacity:0, animation:`wbFade 0.3s ${d+0.68}s forwards` }}>{el}</text>
            </g>
          )
        })}
      </svg>
    )
  }

  // V0: top-down
  const rootX=150, rootY=28, rootR=28, childY=100, childR=22
  const spread=nc===2?[-75,75]:nc===3?[-90,0,90]:[-90,-30,30,90]
  const cxs=spread.slice(0,nc).map(dx=>150+dx)
  return (
    <svg viewBox="0 0 300 148" width="100%" style={{ maxHeight:148 }}>
      <circle cx={rootX} cy={rootY} r={rootR} fill="none"
        style={{ stroke, strokeWidth:2.5, strokeDasharray:2*Math.PI*rootR, strokeDashoffset:2*Math.PI*rootR,
          animation:'wbDraw 0.62s 0s ease-out forwards' }}/>
      <text x={rootX} y={rootY+4} textAnchor="middle" fill={stroke}
        fontSize={Math.max(7,Math.min(10,52/(root.length||5)))} fontFamily="inherit" fontWeight="800"
        style={{ opacity:0, animation:'wbFade 0.3s 0.58s forwards' }}>{root}</text>
      {cxs.map((cx,i) => {
        const x1=rootX, y1=rootY+rootR+2, x2=cx, y2=childY-childR-2
        const len=Math.hypot(x2-x1,y2-y1), d=0.62+i*0.78
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              style={{ stroke, strokeWidth:1.8, strokeDasharray:len, strokeDashoffset:len,
                animation:`wbDraw 0.4s ${d}s ease-out forwards` }}/>
            <circle cx={cx} cy={childY} r={childR} fill="none"
              style={{ stroke, strokeWidth:2, strokeDasharray:2*Math.PI*childR, strokeDashoffset:2*Math.PI*childR,
                animation:`wbDraw 0.48s ${d+0.34}s ease-out forwards` }}/>
            <text x={cx} y={childY+4} textAnchor="middle" fill={tf}
              fontSize={Math.max(7,Math.min(9,50/(children[i]?.length||5)))} fontFamily="inherit" fontWeight="600"
              style={{ opacity:0, animation:`wbFade 0.3s ${d+0.78}s forwards` }}>{children[i]}</text>
          </g>
        )
      })}
    </svg>
  )
}

// -- 9. VENN --------------------------------------------------
// V0: horizontal overlap  V1: vertical overlap
function VennSVG({ els, stroke, tf, seed, dur }) {
  const lLabel=els[0]||'A', rLabel=els[1]||'B', both=els[2]||'Both', extra=els[3]||''
  const v = Math.floor(seed * 2)

  if (v === 1) {
    return (
      <svg viewBox="0 0 300 160" width="100%" style={{ maxHeight:160 }}>
        <circle cx={150} cy={62} r={55} fill="none"
          style={{ stroke, strokeWidth:2.5, strokeDasharray:Math.PI*110, strokeDashoffset:Math.PI*110,
            animation:'wbDraw 0.72s 0s ease-out forwards' }}/>
        <circle cx={150} cy={100} r={55} fill="none"
          style={{ stroke, strokeWidth:2.5, strokeDasharray:Math.PI*110, strokeDashoffset:Math.PI*110,
            animation:'wbDraw 0.72s 0.28s ease-out forwards' }}/>
        <text x={150} y={40} textAnchor="middle" fill={tf} fontSize={10}
          fontFamily="inherit" fontWeight="700"
          style={{ opacity:0, animation:'wbFade 0.3s 0.96s forwards' }}>{lLabel}</text>
        <text x={150} y={128} textAnchor="middle" fill={tf} fontSize={10}
          fontFamily="inherit" fontWeight="700"
          style={{ opacity:0, animation:'wbFade 0.3s 0.96s forwards' }}>{rLabel}</text>
        <text x={150} y={84} textAnchor="middle" fill={stroke} fontSize={9}
          fontFamily="inherit" fontWeight="800"
          style={{ opacity:0, animation:'wbFade 0.3s 1.28s forwards' }}>{both}</text>
      </svg>
    )
  }

  // V0: horizontal
  return (
    <svg viewBox="0 0 300 130" width="100%" style={{ maxHeight:130 }}>
      <circle cx={115} cy={65} r={60} fill="none"
        style={{ stroke, strokeWidth:2.5, strokeDasharray:Math.PI*120, strokeDashoffset:Math.PI*120,
          animation:'wbDraw 0.72s 0s ease-out forwards' }}/>
      <circle cx={185} cy={65} r={60} fill="none"
        style={{ stroke, strokeWidth:2.5, strokeDasharray:Math.PI*120, strokeDashoffset:Math.PI*120,
          animation:'wbDraw 0.72s 0.28s ease-out forwards' }}/>
      <text x={85} y={65} textAnchor="middle" fill={tf} fontSize={10}
        fontFamily="inherit" fontWeight="700"
        style={{ opacity:0, animation:'wbFade 0.3s 0.96s forwards' }}>{lLabel}</text>
      <text x={215} y={65} textAnchor="middle" fill={tf} fontSize={10}
        fontFamily="inherit" fontWeight="700"
        style={{ opacity:0, animation:'wbFade 0.3s 0.96s forwards' }}>{rLabel}</text>
      <text x={150} y={62} textAnchor="middle" fill={stroke} fontSize={9}
        fontFamily="inherit" fontWeight="800"
        style={{ opacity:0, animation:'wbFade 0.3s 1.28s forwards' }}>{both}</text>
      {extra && <text x={150} y={76} textAnchor="middle" fill={tf} fontSize={8}
        fontFamily="inherit"
        style={{ opacity:0, animation:'wbFade 0.3s 1.48s forwards' }}>{extra}</text>}
    </svg>
  )
}

// -- 10. BUILDUP: equation reveals piece by piece -------------
// V0: horizontal (L?R)   V1: stacked reveal (each line top?down)
function BuildupSVG({ els, stroke, tf, seed, dur }) {
  const parts=els.slice(0,4).filter(Boolean)
  const v = Math.floor(seed * 2)

  if (v === 1) {
    const lineH=24
    return (
      <svg viewBox="0 0 300 105" width="100%" style={{ maxHeight:105 }}>
        <line x1={16} y1={6} x2={16} y2={6+parts.length*lineH}
          style={{ stroke, strokeWidth:2, strokeDasharray:parts.length*lineH, strokeDashoffset:parts.length*lineH,
            animation:'wbDraw 0.58s 0.08s ease-out forwards' }}/>
        {parts.map((p,i) => {
          const d=0.08+i*0.52, isResult=(i===parts.length-1&&parts.length>2)
          return <text key={i} x={28} y={6+i*lineH+lineH/2+5} fill={isResult?stroke:tf}
            fontSize={isResult?Math.min(22,Math.max(14,88/(p.length||1))):Math.min(18,Math.max(12,78/(p.length||1)))}
            fontFamily="'Caveat',cursive" fontWeight={isResult?'800':'600'}
            style={{ opacity:0, animation:`wbFade 0.34s ${d}s forwards` }}>{p}</text>
        })}
        <line x1={20} y1={6+parts.length*lineH+5} x2={280} y2={6+parts.length*lineH+5}
          style={{ stroke, strokeWidth:2.2, strokeDasharray:260, strokeDashoffset:260,
            animation:`wbDraw 0.58s ${0.08+parts.length*0.52}s ease-out forwards` }}/>
      </svg>
    )
  }

  // V0: horizontal
  const totalW=280
  return (
    <svg viewBox="0 0 300 90" width="100%" style={{ maxHeight:90 }}>
      <line x1={10} y1={72} x2={290} y2={72}
        style={{ stroke, strokeWidth:2, strokeDasharray:280, strokeDashoffset:280,
          animation:'wbDraw 1.2s 0.18s ease-in-out forwards' }}/>
      {parts.map((p,i) => {
        const x=20+i*(totalW/parts.length)+(totalW/parts.length)/2, d=0.08+i*0.52
        const isEq=p==='='||p.includes('=')
        return <text key={i} x={x} y={52} textAnchor="middle" fill={isEq?stroke:tf}
          fontSize={Math.min(26,Math.max(14,90/(p.length||1)))}
          fontFamily="'Caveat',cursive" fontWeight="700"
          style={{ opacity:0, animation:`wbFade 0.34s ${d}s forwards` }}>{p}</text>
      })}
      {els[3] && <text x={150} y={88} textAnchor="middle" fill={stroke} fontSize={9}
        fontFamily="inherit" fontStyle="italic"
        style={{ opacity:0, animation:'wbFade 0.3s 1.38s forwards' }}>{els[3]}</text>}
    </svg>
  )
}

// -- 11. FUNNEL: narrowing stages -----------------------------
function FunnelSVG({ els, stroke, tf, seed, dur }) {
  const stages=els.slice(0,4).filter(Boolean)
  return (
    <svg viewBox="0 0 300 140" width="100%" style={{ maxHeight:140 }}>
      {stages.map((s,i) => {
        const top=8+i*32, nextInset=(i+1)*22, d=i*0.68
        return (
          <g key={i}>
            <polyline points={`${i*22},${top} ${300-i*22},${top} ${300-nextInset},${top+26} ${nextInset},${top+26}`}
              fill="none"
              style={{ stroke, strokeWidth:2, strokeDasharray:600, strokeDashoffset:600,
                animation:`wbDraw 0.54s ${d}s ease-out forwards` }}/>
            <text x={150} y={top+17} textAnchor="middle" fill={tf}
              fontSize={Math.max(8,Math.min(11,60/(s.length||5)))} fontFamily="inherit" fontWeight="600"
              style={{ opacity:0, animation:`wbFade 0.3s ${d+0.44}s forwards` }}>{s}</text>
          </g>
        )
      })}
      <polygon points="150,136 143,128 157,128" fill={stroke}
        style={{ opacity:0, animation:'wbFade 0.2s 2.75s forwards' }}/>
    </svg>
  )
}

// -- 12. AVATAR: stick-figure teacher -------------------------
function AvatarSVG({ els, stroke, tf, seed, dur }) {
  const speech=els[0]||'Think about this�', note=els[1]||''
  const line1=speech.slice(0,30), line2=speech.slice(30,60)
  return (
    <svg viewBox="0 0 300 168" width="100%" style={{ maxHeight:168 }}>
      <rect x={76} y={6} width={192} height={line2?70:54} rx={14} fill="none"
        style={{ stroke, strokeWidth:2.5, strokeDasharray:600, strokeDashoffset:600,
          animation:'wbDraw 0.8s 0s ease-out forwards' }}/>
      <polygon points="94,76 80,93 112,76" fill="none"
        style={{ stroke, strokeWidth:2, strokeDasharray:80, strokeDashoffset:80,
          animation:'wbDraw 0.3s 0.74s ease-out forwards' }}/>
      <text x={171} y={30} textAnchor="middle" fill={tf}
        fontSize={Math.max(8,Math.min(12,140/(line1.length||10)))}
        fontFamily="'Patrick Hand',cursive" fontWeight="600"
        style={{ opacity:0, animation:'wbFade 0.4s 0.84s forwards' }}>{line1}</text>
      {line2 && <text x={171} y={50} textAnchor="middle" fill={tf}
        fontSize={Math.max(8,Math.min(12,140/(line2.length||10)))}
        fontFamily="'Patrick Hand',cursive"
        style={{ opacity:0, animation:'wbFade 0.4s 1.0s forwards' }}>{line2}</text>}
      {/* Head */}
      <circle cx={42} cy={106} r={15} fill="none"
        style={{ stroke, strokeWidth:2.2, strokeDasharray:94, strokeDashoffset:94,
          animation:'wbDraw 0.52s 1.1s ease-out forwards' }}/>
      {/* Blinking eyes */}
      <ellipse cx={37} cy={104} rx={2} ry={2} fill={tf}
        style={{ opacity:0, transformOrigin:'37px 104px',
          animation:'wbFade 0.2s 1.62s forwards, eyeBlink 3.2s 2.0s ease-in-out infinite' }}/>
      <ellipse cx={47} cy={104} rx={2} ry={2} fill={tf}
        style={{ opacity:0, transformOrigin:'47px 104px',
          animation:'wbFade 0.2s 1.62s forwards, eyeBlink 3.2s 2.3s ease-in-out infinite' }}/>
      {/* Smile */}
      <path d="M 37,110 Q 42,116 47,110" fill="none"
        style={{ stroke:tf, strokeWidth:1.5, strokeDasharray:20, strokeDashoffset:20,
          animation:'wbDraw 0.28s 1.68s ease-out forwards' }}/>
      {/* Body */}
      <line x1={42} y1={121} x2={42} y2={152}
        style={{ stroke, strokeWidth:2.2, strokeDasharray:31, strokeDashoffset:31,
          animation:'wbDraw 0.36s 1.72s ease-out forwards' }}/>
      {/* Pointing arm */}
      <line x1={42} y1={130} x2={76} y2={118}
        style={{ stroke, strokeWidth:2, strokeDasharray:38, strokeDashoffset:38,
          animation:'wbDraw 0.34s 1.96s ease-out forwards' }}/>
      <line x1={42} y1={130} x2={18} y2={140}
        style={{ stroke, strokeWidth:2, strokeDasharray:26, strokeDashoffset:26,
          animation:'wbDraw 0.28s 2.06s ease-out forwards' }}/>
      {/* Legs */}
      <line x1={42} y1={152} x2={30} y2={168}
        style={{ stroke, strokeWidth:2, strokeDasharray:20, strokeDashoffset:20,
          animation:'wbDraw 0.26s 2.26s ease-out forwards' }}/>
      <line x1={42} y1={152} x2={54} y2={168}
        style={{ stroke, strokeWidth:2, strokeDasharray:20, strokeDashoffset:20,
          animation:'wbDraw 0.26s 2.3s ease-out forwards' }}/>
      {note && <text x={185} y={128} textAnchor="middle" fill={stroke} fontSize={10}
        fontFamily="'Caveat',cursive" fontWeight="700"
        style={{ opacity:0, animation:'wbFade 0.4s 2.58s forwards' }}>{note}</text>}
    </svg>
  )
}

// -- 13. PULSE: radiating concept -----------------------------
// V0: radial with ripple rings (angle from seed)  V1: web/mesh
function PulseSVG({ els, stroke, tf, seed, dur }) {
  const core=els[0]||'Key Idea', labels=els.slice(1,4)
  const v = Math.floor(seed * 2)
  const startA = seed * Math.PI  // seed-varied angle so each topic looks different

  if (v === 1 && labels.length >= 2) {
    const nodeR=108
    const nodeAngles=labels.map((_,i) => startA+2*Math.PI*i/labels.length)
    const nc=nodeAngles.map(a => ({ x:150+nodeR*Math.cos(a), y:82+nodeR*Math.sin(a) }))
    return (
      <svg viewBox="0 0 300 165" width="100%" style={{ maxHeight:165, overflow:'visible' }}>
        {/* Web connections between outer nodes */}
        {nc.map((n1,i) => nc.slice(i+1).map((n2,j) => {
          const len=Math.hypot(n2.x-n1.x,n2.y-n1.y), d=0.48+i*0.28+j*0.14
          return <line key={`${i}${j}`} x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y}
            style={{ stroke, strokeWidth:1, opacity:0.32, strokeDasharray:len, strokeDashoffset:len,
              animation:`wbDraw 0.38s ${d}s ease-out forwards` }}/>
        }))}
        {/* Spokes from center */}
        {nc.map((n,i) => {
          const a=nodeAngles[i], d=0.28+i*0.48
          return <line key={i} x1={150+32*Math.cos(a)} y1={82+32*Math.sin(a)}
            x2={n.x-18*Math.cos(a)} y2={n.y-18*Math.sin(a)}
            style={{ stroke, strokeWidth:1.6, strokeDasharray:100, strokeDashoffset:100,
              animation:`wbDraw 0.36s ${d}s ease-out forwards` }}/>
        })}
        <circle cx={150} cy={82} r={32} fill="none"
          style={{ stroke, strokeWidth:2.8, strokeDasharray:200, strokeDashoffset:200,
            animation:'wbDraw 0.68s 0s ease-out forwards' }}/>
        <text x={150} y={86} textAnchor="middle" fill={stroke}
          fontSize={Math.max(8,Math.min(12,72/(core.length||6)))}
          fontFamily="'Caveat',cursive" fontWeight="700"
          style={{ opacity:0, animation:'wbFade 0.4s 0.64s forwards' }}>{core}</text>
        {nc.map((n,i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={18} fill="none"
              style={{ stroke, strokeWidth:1.8, strokeDasharray:113, strokeDashoffset:113,
                animation:`wbDraw 0.44s ${0.78+i*0.48}s ease-out forwards` }}/>
            <text x={n.x} y={n.y+4} textAnchor="middle" fill={tf}
              fontSize={Math.max(6,Math.min(9,48/(labels[i]?.length||5)))} fontFamily="inherit" fontWeight="600"
              style={{ opacity:0, animation:`wbFade 0.3s ${1.18+i*0.48}s forwards` }}>{labels[i]}</text>
          </g>
        ))}
      </svg>
    )
  }

  // V0: radial with ripple rings
  return (
    <svg viewBox="0 0 300 160" width="100%" style={{ maxHeight:160, overflow:'visible' }}>
      {[55,72,90].map((r,i) => <circle key={i} cx={150} cy={80} r={r} fill="none"
        style={{ stroke, strokeWidth:1, opacity:0,
          animation:`wbFade 0.1s ${0.58+i*0.18}s forwards, pulseGlow ${2.2+i*0.4}s ${0.58+i*0.28}s ease-in-out infinite` }}/>)}
      <circle cx={150} cy={80} r={36} fill="none"
        style={{ stroke, strokeWidth:2.8, strokeDasharray:226, strokeDashoffset:226,
          animation:'wbDraw 0.68s 0s ease-out forwards' }}/>
      <text x={150} y={84} textAnchor="middle" fill={stroke}
        fontSize={Math.max(8,Math.min(13,80/(core.length||6)))}
        fontFamily="'Caveat',cursive" fontWeight="700"
        style={{ opacity:0, animation:'wbFade 0.4s 0.64s forwards' }}>{core}</text>
      {labels.map((lbl,i) => {
        const angle=startA+i*2*Math.PI/3
        const lx=150+120*Math.cos(angle), ly=80+120*Math.sin(angle)
        const x1=150+38*Math.cos(angle), y1=80+38*Math.sin(angle)
        const x2=150+98*Math.cos(angle), y2=80+98*Math.sin(angle)
        const len=Math.hypot(x2-x1,y2-y1), d=0.68+i*0.62
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              style={{ stroke, strokeWidth:1.6, strokeDasharray:len, strokeDashoffset:len,
                animation:`wbDraw 0.36s ${d}s ease-out forwards` }}/>
            <circle cx={lx} cy={ly} r={22} fill="none"
              style={{ stroke, strokeWidth:1.8, strokeDasharray:138, strokeDashoffset:138,
                animation:`wbDraw 0.44s ${d+0.28}s ease-out forwards` }}/>
            <text x={lx} y={ly+4} textAnchor="middle" fill={tf}
              fontSize={Math.max(7,Math.min(9,52/(lbl?.length||6)))} fontFamily="inherit" fontWeight="600"
              style={{ opacity:0, animation:`wbFade 0.3s ${d+0.68}s forwards` }}>{lbl}</text>
          </g>
        )
      })}
    </svg>
  )
}

// -- 14. WAVE: self-drawing wave on axes ----------------------
// V0: sine (freq from seed)  V1: damped  V2: two-wave interference
function WaveSVG({ els, stroke, tf, seed, dur }) {
  const xLabel=els[0]||'Time', yLabel=els[1]||'Amplitude', waveLbl=els[2]||''
  const v = Math.floor(seed * 3)
  const freq = 0.55 + seed * 0.9  // 0.55..1.45 cycles � topic-specific frequency

  let pathD = 'M 32,75'
  if (v === 1) {
    // Damped wave � amplitude shrinks toward right
    for (let x=32; x<=272; x+=3) {
      const t=(x-32)/240, amp=32*Math.exp(-t*2.4)
      pathD += ` L ${x},${(75-amp*Math.sin(t*Math.PI*4)).toFixed(1)}`
    }
  } else if (v === 2) {
    // Interference � two waves superimposed
    for (let x=32; x<=272; x+=3) {
      const t=(x-32)*Math.PI/38
      pathD += ` L ${x},${(75-(22*Math.sin(t)+16*Math.sin(t*1.5+0.7))).toFixed(1)}`
    }
  } else {
    // V0: standard sine with seed-varied frequency
    for (let x=32; x<=272; x+=4) {
      pathD += ` L ${x},${(75-32*Math.sin((x-32)*Math.PI*freq/38)).toFixed(1)}`
    }
  }
  const pathLen = [660, 520, 700][v]
  const waveTypeLabel = v===1?'Damped':v===2?'Interference':''

  return (
    <svg viewBox="0 0 300 155" width="100%" style={{ maxHeight:155 }}>
      <line x1={32} y1={14} x2={32} y2={138}
        style={{ stroke, strokeWidth:2.5, strokeDasharray:124, strokeDashoffset:124,
          animation:'wbDraw 0.42s 0s ease-out forwards' }}/>
      <line x1={22} y1={75} x2={278} y2={75}
        style={{ stroke, strokeWidth:2.5, strokeDasharray:256, strokeDashoffset:256,
          animation:'wbDraw 0.42s 0.38s ease-out forwards' }}/>
      <polygon points="32,14 27,26 37,26" fill={stroke}
        style={{ opacity:0, animation:'wbFade 0.2s 0.38s forwards' }}/>
      <polygon points="278,75 266,70 266,80" fill={stroke}
        style={{ opacity:0, animation:'wbFade 0.2s 0.76s forwards' }}/>
      <path d={pathD} fill="none" strokeLinecap="round" strokeLinejoin="round"
        style={{ stroke, strokeWidth:2.8, strokeDasharray:pathLen, strokeDashoffset:pathLen,
          animation:'wbDraw 1.6s 0.76s ease-in-out forwards' }}/>
      {v===2 && (() => {
        // Second reference wave � lighter
        let p2='M 32,75'
        for (let x=32; x<=272; x+=4) p2+=` L ${x},${(75-22*Math.sin((x-32)*Math.PI/38)).toFixed(1)}`
        return <path d={p2} fill="none" strokeLinecap="round"
          style={{ stroke, strokeWidth:1.5, opacity:0.38, strokeDasharray:660, strokeDashoffset:660,
            animation:'wbDraw 1.4s 0.88s ease-in-out forwards' }}/>
      })()}
      <text x={155} y={152} textAnchor="middle" fill={tf} fontSize={10} fontFamily="inherit"
        style={{ opacity:0, animation:'wbFade 0.3s 2.28s forwards' }}>{xLabel}</text>
      <text x={12} y={75} textAnchor="middle" fill={tf} fontSize={9} fontFamily="inherit"
        transform="rotate(-90,12,75)"
        style={{ opacity:0, animation:'wbFade 0.3s 2.28s forwards' }}>{yLabel}</text>
      {waveTypeLabel && <text x={48} y={20} fill={stroke} fontSize={9} fontFamily="inherit" fontStyle="italic"
        style={{ opacity:0, animation:'wbFade 0.3s 2.38s forwards' }}>{waveTypeLabel}</text>}
      {waveLbl && <text x={268} y={30} fill={stroke} fontSize={10}
        fontFamily="'Caveat',cursive" fontWeight="700"
        style={{ opacity:0, animation:'wbFade 0.3s 2.38s forwards' }}>{waveLbl}</text>}
    </svg>
  )
}

// -- 15. BAR: data bars ---------------------------------------
// V0: vertical bars  V1: horizontal bars (better for longer labels)
function BarSVG({ els, stroke, tf, seed, dur }) {
  const bars=els.slice(0,4).map((el,i) => {
    const p=(el||'').split(':')
    return { label:p[0].trim(), val:parseInt(p[1])||(30+i*22) }
  })
  const maxVal=Math.max(...bars.map(b=>b.val),1), n=bars.length
  const v = Math.floor(seed * 2)

  if (v === 1) {
    // Horizontal bars
    const bh=n<=2?28:n===3?22:18, gap=n<=2?14:10
    const totalH=n*bh+(n-1)*gap, startY=(130-totalH)/2, chartW=178
    return (
      <svg viewBox="0 0 300 140" width="100%" style={{ maxHeight:140 }}>
        <line x1={100} y1={startY-4} x2={100} y2={startY+totalH+4}
          style={{ stroke, strokeWidth:2, strokeDasharray:totalH+8, strokeDashoffset:totalH+8,
            animation:'wbDraw 0.4s 0s ease-out forwards' }}/>
        {bars.map(({label,val},i) => {
          const cy=startY+i*(bh+gap)+bh/2, w=Math.max(8,(val/maxVal)*chartW), d=0.42+i*0.27
          return (
            <g key={i}>
              <text x={96} y={cy+4} textAnchor="end" fill={tf}
                fontSize={Math.max(7,Math.min(10,72/(label.length||6)))} fontFamily="inherit"
                style={{ opacity:0, animation:`wbFade 0.3s ${d}s forwards` }}>{label}</text>
              <line x1={100} y1={cy} x2={100+w} y2={cy}
                style={{ stroke, strokeWidth:bh, strokeLinecap:'butt', opacity:0.78,
                  strokeDasharray:w, strokeDashoffset:w,
                  animation:`wbDraw 0.54s ${d}s ease-out forwards` }}/>
              <text x={104+w} y={cy+4} fill={stroke} fontSize={10}
                fontFamily="'Caveat',cursive" fontWeight="700"
                style={{ opacity:0, animation:`wbFade 0.3s ${d+0.5}s forwards` }}>{val}</text>
            </g>
          )
        })}
      </svg>
    )
  }

  // V0: vertical bars
  const bw=n<=2?60:n===3?50:42, gap2=n<=2?30:n===3?22:16
  const totalW=n*bw+(n-1)*gap2, startX=(280-totalW)/2, chartH=88, baseY=128
  return (
    <svg viewBox="0 0 300 148" width="100%" style={{ maxHeight:148 }}>
      <line x1={12} y1={baseY} x2={288} y2={baseY}
        style={{ stroke, strokeWidth:2, strokeDasharray:276, strokeDashoffset:276,
          animation:'wbDraw 0.42s 0s ease-out forwards' }}/>
      {bars.map(({label,val},i) => {
        const cx=startX+i*(bw+gap2)+bw/2, h=Math.max(8,(val/maxVal)*chartH), d=0.42+i*0.27
        return (
          <g key={i}>
            <line x1={cx} y1={baseY} x2={cx} y2={baseY-h}
              style={{ stroke, strokeWidth:bw, strokeLinecap:'butt', opacity:0.78,
                strokeDasharray:h, strokeDashoffset:h,
                animation:`wbDraw 0.54s ${d}s ease-out forwards` }}/>
            <text x={cx} y={baseY-h-5} textAnchor="middle" fill={stroke} fontSize={10}
              fontFamily="'Caveat',cursive" fontWeight="700"
              style={{ opacity:0, animation:`wbFade 0.3s ${d+0.5}s forwards` }}>{val}</text>
            <text x={cx} y={baseY+14} textAnchor="middle" fill={tf}
              fontSize={Math.max(7,Math.min(10,50/(label.length||5)))} fontFamily="inherit"
              style={{ opacity:0, animation:`wbFade 0.3s ${d+0.5}s forwards` }}>{label}</text>
          </g>
        )
      })}
    </svg>
  )
}

// -- 16. BALL: physics body diagrams -------------------------
// V0: free body on ground  V1: inclined plane  V2: projectile
function BallSVG({ els, stroke, tf, seed, dur }) {
  const obj=els[0]||'Object', force=els[1]||'F ?', gravity=els[2]||'g ?', extra=els[3]||''
  const v = Math.floor(seed * 3)

  if (v === 1) {
    // Inclined plane (30�)
    return (
      <svg viewBox="0 0 300 130" width="100%" style={{ maxHeight:130 }}>
        <line x1={10} y1={115} x2={290} y2={115}
          style={{ stroke, strokeWidth:2, strokeDasharray:280, strokeDashoffset:280,
            animation:'wbDraw 0.4s 0s ease-out forwards' }}/>
        <line x1={30} y1={115} x2={200} y2={30}
          style={{ stroke, strokeWidth:2.5, strokeDasharray:192, strokeDashoffset:192,
            animation:'wbDraw 0.52s 0.38s ease-out forwards' }}/>
        <line x1={200} y1={30} x2={200} y2={115}
          style={{ stroke, strokeWidth:1.5, strokeDasharray:85, strokeDashoffset:85, opacity:0.45,
            animation:'wbDraw 0.28s 0.88s ease-out forwards' }}/>
        <path d="M 50,115 A 20,20 0 0,1 68,106" fill="none"
          style={{ stroke, strokeWidth:1.5, strokeDasharray:25, strokeDashoffset:25,
            animation:'wbDraw 0.2s 0.92s ease-out forwards' }}/>
        <text x={64} y={108} fill={tf} fontSize={9} fontFamily="inherit"
          style={{ opacity:0, animation:'wbFade 0.3s 1.08s forwards' }}>30�</text>
        <rect x={92} y={52} width={30} height={26} rx={3} fill="none"
          transform="rotate(-30,107,65)"
          style={{ stroke, strokeWidth:2, strokeDasharray:112, strokeDashoffset:112,
            animation:'wbDraw 0.48s 0.92s ease-out forwards' }}/>
        <text x={112} y={72} textAnchor="middle" fill={tf} fontSize={8} fontFamily="inherit"
          style={{ opacity:0, animation:'wbFade 0.3s 1.38s forwards' }}>{obj}</text>
        {/* Normal force */}
        <line x1={115} y1={62} x2={97} y2={38}
          style={{ stroke, strokeWidth:2, strokeDasharray:30, strokeDashoffset:30,
            animation:'wbDraw 0.28s 1.46s ease-out forwards' }}/>
        <polygon points="97,38 94,50 106,48" fill={stroke}
          style={{ opacity:0, animation:'wbFade 0.2s 1.72s forwards' }}/>
        <text x={86} y={36} fill={tf} fontSize={8} fontFamily="inherit"
          style={{ opacity:0, animation:'wbFade 0.3s 1.78s forwards' }}>N</text>
        {/* Weight */}
        <line x1={115} y1={70} x2={115} y2={90}
          style={{ stroke, strokeWidth:2, strokeDasharray:20, strokeDashoffset:20,
            animation:'wbDraw 0.24s 1.8s ease-out forwards' }}/>
        <polygon points="115,90 110,81 120,81" fill={stroke}
          style={{ opacity:0, animation:'wbFade 0.2s 2.02s forwards' }}/>
        <text x={128} y={88} fill={tf} fontSize={8} fontFamily="inherit"
          style={{ opacity:0, animation:'wbFade 0.3s 2.08s forwards' }}>{gravity}</text>
        {extra && <text x={232} y={80} fill={tf} fontSize={9} fontFamily="inherit"
          style={{ opacity:0, animation:'wbFade 0.3s 2.38s forwards' }}>{extra}</text>}
      </svg>
    )
  }

  if (v === 2) {
    // Projectile with parabolic arc
    return (
      <svg viewBox="0 0 300 130" width="100%" style={{ maxHeight:130 }}>
        <line x1={10} y1={112} x2={290} y2={112}
          style={{ stroke, strokeWidth:2.5, strokeDasharray:280, strokeDashoffset:280,
            animation:'wbDraw 0.42s 0s ease-out forwards' }}/>
        {[0,1,2,3,4,5,6].map(i => <line key={i} x1={18+i*38} y1={112} x2={10+i*38} y2={124}
          style={{ stroke, strokeWidth:1.5, opacity:0.42, strokeDasharray:14, strokeDashoffset:14,
            animation:`wbDraw 0.18s ${0.4+i*0.04}s ease-out forwards` }}/>)}
        <circle cx={30} cy={92} r={16} fill="none"
          style={{ stroke, strokeWidth:2.5, strokeDasharray:100, strokeDashoffset:100,
            animation:'wbDraw 0.52s 0.48s ease-out forwards' }}/>
        <text x={30} y={96} textAnchor="middle" fill={stroke} fontSize={9}
          fontFamily="inherit" fontWeight="700"
          style={{ opacity:0, animation:'wbFade 0.3s 0.98s forwards' }}>{obj}</text>
        {/* Launch vector */}
        <line x1={46} y1={82} x2={80} y2={54}
          style={{ stroke, strokeWidth:2.5, strokeDasharray:44, strokeDashoffset:44,
            animation:'wbDraw 0.36s 1.08s ease-out forwards' }}/>
        <polygon points="80,54 68,62 74,72" fill={stroke}
          style={{ opacity:0, animation:'wbFade 0.2s 1.42s forwards' }}/>
        <text x={82} y={50} fill={tf} fontSize={9} fontFamily="inherit" fontWeight="700"
          style={{ opacity:0, animation:'wbFade 0.3s 1.48s forwards' }}>{force}</text>
        {/* Parabolic path � dotted */}
        <path d="M 30,92 Q 155,14 272,92" fill="none"
          style={{ stroke, strokeWidth:1.8, opacity:0.58, strokeDasharray:'5 5' }}/>
        {/* Peak */}
        <circle cx={151} cy={24} r={4} fill={stroke}
          style={{ opacity:0, animation:'wbFade 0.3s 1.76s forwards' }}/>
        <text x={151} y={18} textAnchor="middle" fill={stroke} fontSize={8}
          fontFamily="'Caveat',cursive"
          style={{ opacity:0, animation:'wbFade 0.3s 1.86s forwards' }}>Peak</text>
        {/* Gravity */}
        <line x1={151} y1={30} x2={151} y2={46}
          style={{ stroke, strokeWidth:2, strokeDasharray:16, strokeDashoffset:16,
            animation:'wbDraw 0.24s 1.96s ease-out forwards' }}/>
        <polygon points="151,46 146,37 156,37" fill={stroke}
          style={{ opacity:0, animation:'wbFade 0.2s 2.18s forwards' }}/>
        <text x={164} y={44} fill={tf} fontSize={8} fontFamily="inherit"
          style={{ opacity:0, animation:'wbFade 0.3s 2.24s forwards' }}>{gravity}</text>
      </svg>
    )
  }

  // V0: free body on ground
  return (
    <svg viewBox="0 0 300 130" width="100%" style={{ maxHeight:130 }}>
      <line x1={10} y1={108} x2={290} y2={108}
        style={{ stroke, strokeWidth:2.5, strokeDasharray:280, strokeDashoffset:280,
          animation:'wbDraw 0.4s 0s ease-out forwards' }}/>
      {[0,1,2,3,4,5,6,7].map(i => <line key={i} x1={18+i*36} y1={108} x2={10+i*36} y2={120}
        style={{ stroke, strokeWidth:1.5, opacity:0.44, strokeDasharray:14, strokeDashoffset:14,
          animation:`wbDraw 0.18s ${0.38+i*0.04}s ease-out forwards` }}/>)}
      <circle cx={82} cy={84} r={23} fill="none"
        style={{ stroke, strokeWidth:2.5, strokeDasharray:145, strokeDashoffset:145,
          animation:'wbDraw 0.58s 0.52s ease-out forwards' }}/>
      <circle cx={75} cy={77} r={4} fill={stroke} opacity={0}
        style={{ animation:'wbFade 0.3s 1.08s forwards' }}/>
      <text x={82} y={88} textAnchor="middle" fill={stroke} fontSize={9}
        fontFamily="inherit" fontWeight="700"
        style={{ opacity:0, animation:'wbFade 0.3s 1.08s forwards' }}>{obj}</text>
      <line x1={110} y1={84} x2={162} y2={84}
        style={{ stroke, strokeWidth:2.5, strokeDasharray:52, strokeDashoffset:52,
          animation:'wbDraw 0.38s 1.12s ease-out forwards' }}/>
      <polygon points="162,84 151,79 151,89" fill={stroke}
        style={{ opacity:0, animation:'wbFade 0.2s 1.48s forwards' }}/>
      <text x={136} y={76} textAnchor="middle" fill={tf} fontSize={9}
        fontFamily="inherit" fontWeight="700"
        style={{ opacity:0, animation:'wbFade 0.3s 1.52s forwards' }}>{force}</text>
      <line x1={82} y1={52} x2={82} y2={60}
        style={{ stroke, strokeWidth:2, strokeDasharray:8, strokeDashoffset:8,
          animation:'wbDraw 0.24s 1.58s ease-out forwards' }}/>
      <polygon points="82,60 77,53 87,53" fill={stroke}
        style={{ opacity:0, animation:'wbFade 0.2s 1.8s forwards' }}/>
      <text x={97} y={57} fill={tf} fontSize={8} fontFamily="inherit"
        style={{ opacity:0, animation:'wbFade 0.3s 1.82s forwards' }}>{gravity}</text>
      <path d="M 24,106 Q 82,42 140,106" fill="none"
        style={{ stroke, strokeWidth:1.5, opacity:0.54, strokeDasharray:'4 5' }}/>
      {extra && <text x={210} y={70} fill={tf} fontSize={9} fontFamily="'Patrick Hand',cursive"
        style={{ opacity:0, animation:'wbFade 0.3s 2.38s forwards' }}>{extra}</text>}
    </svg>
  )
}

// -- 17. SPOTLIGHT: dramatic key-fact reveal ------------------
function SpotlightSVG({ els, stroke, tf, seed, dur }) {
  const headline=els[0]||'Key Fact', sub=els[1]||'', note=els[2]||''
  return (
    <svg viewBox="0 0 300 122" width="100%" style={{ maxHeight:122 }}>
      <defs>
        <clipPath id="spClip"><rect x={14} y={8} width={272} height={82} rx={16}/></clipPath>
        <linearGradient id="spGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={stroke} stopOpacity="0"/>
          <stop offset="50%" stopColor={stroke} stopOpacity="0.12"/>
          <stop offset="100%" stopColor={stroke} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <ellipse cx={150} cy={49} rx={118} ry={46} fill="none"
        style={{ stroke, strokeWidth:2, opacity:0.24, strokeDasharray:720, strokeDashoffset:720,
          animation:'wbDraw 1.0s 0s ease-out forwards' }}/>
      <rect x={14} y={8} width={272} height={82} rx={16} fill="none"
        style={{ stroke, strokeWidth:2.5, strokeDasharray:720, strokeDashoffset:720,
          animation:'wbDraw 0.9s 0.14s ease-out forwards' }}/>
      <rect x={-120} y={8} width={120} height={82} fill="url(#spGrad)" clipPath="url(#spClip)"
        style={{ animation:'shimmerMove 2.2s 0.9s ease-in-out infinite' }}/>
      <text x={150} y={44} textAnchor="middle" fill={stroke}
        fontSize={Math.min(24,Math.max(13,180/(headline.length||1)))}
        fontFamily="'Caveat',cursive" fontWeight="700"
        style={{ opacity:0, animation:'wbFade 0.5s 0.88s forwards' }}>{headline}</text>
      {sub && <text x={150} y={68} textAnchor="middle" fill={tf} fontSize={11}
        fontFamily="'Patrick Hand',cursive"
        style={{ opacity:0, animation:'wbFade 0.4s 1.28s forwards' }}>{sub}</text>}
      {note && <text x={150} y={104} textAnchor="middle" fill={stroke} fontSize={9}
        fontFamily="inherit" fontStyle="italic"
        style={{ opacity:0, animation:'wbFade 0.3s 1.62s forwards' }}>{note}</text>}
    </svg>
  )
}

// ---------------------------------------------------------------
// 4 NEW LLM-POWERED DIAGRAM TYPES
// These are genuinely dynamic � the AI returns the full visual spec
// (nodes, edges, positions, actual values) for each topic.
// No two topics produce the same diagram structure.
// ---------------------------------------------------------------

// -- A. NETWORK: any-topology node+edge graph -----------------
// spec: { nodes:[{id,label,x,y}], edges:[{from,to,label?}] }
// x,y are 0�1 normalised ? rendered in 300�162 viewBox
function NetworkSVG({ spec, els, stroke, tf, seed, dur }) {
  const W=300, H=162, NR=18
  // Build nodes from spec or fallback to els (auto-grid)
  const nodes = spec?.nodes?.length
    ? spec.nodes
    : (els.slice(0,5).map((el,i,a) => {
        const cols = a.length<=3 ? a.length : Math.ceil(Math.sqrt(a.length))
        return { id:String(i), label:el, x:0.1+(i%cols)*0.8/(cols-1||1), y:0.1+Math.floor(i/cols)*0.78/(Math.ceil(a.length/cols)-1||1) }
      }))
  const edges = spec?.edges || []
  // Position lookup
  const pos = {}
  nodes.forEach(n => { pos[n.id] = { x: Math.max(NR+2, Math.min(W-NR-2, n.x*W)), y: Math.max(NR+2, Math.min(H-NR-2, n.y*H)) } })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight:H }}>
      {/* Edges � drawn first so they appear behind nodes */}
      {edges.map((e,i) => {
        const F=pos[String(e.from)], T=pos[String(e.to)]
        if (!F||!T) return null
        const ang=Math.atan2(T.y-F.y,T.x-F.x), len=Math.hypot(T.x-F.x,T.y-F.y)
        const x1=F.x+(NR+2)*Math.cos(ang), y1=F.y+(NR+2)*Math.sin(ang)
        const x2=T.x-(NR+8)*Math.cos(ang), y2=T.y-(NR+8)*Math.sin(ang)
        const c=Math.cos(ang), s=Math.sin(ang), d=0.18+i*0.28
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              style={{ stroke, strokeWidth:1.8, strokeDasharray:len, strokeDashoffset:len,
                animation:`wbDraw 0.4s ${d}s ease-out forwards` }}/>
            <polygon points={`${x2},${y2} ${x2-8*c+4*s},${y2-8*s-4*c} ${x2-8*c-4*s},${y2-8*s+4*c}`}
              fill={stroke} style={{ opacity:0, animation:`wbFade 0.15s ${d+0.38}s forwards` }}/>
            {e.label && (
              <text x={(x1+x2)/2-4*s} y={(y1+y2)/2+4*c} textAnchor="middle"
                fill={stroke} fontSize={8} fontFamily="inherit"
                style={{ opacity:0, animation:`wbFade 0.3s ${d+0.44}s forwards` }}>{e.label}</text>
            )}
          </g>
        )
      })}
      {/* Nodes � circles with labels */}
      {nodes.map((n,i) => {
        const {x,y}=pos[String(n.id)]||{x:50,y:50}, d=0.08+i*0.38
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={NR} fill="none"
              style={{ stroke, strokeWidth:2, strokeDasharray:2*Math.PI*NR, strokeDashoffset:2*Math.PI*NR,
                animation:`wbDraw 0.5s ${d}s ease-out forwards` }}/>
            <text x={x} y={y+4} textAnchor="middle" fill={tf}
              fontSize={Math.max(6,Math.min(10,52/(n.label?.length||5)))} fontFamily="inherit" fontWeight="600"
              style={{ opacity:0, animation:`wbFade 0.3s ${d+0.46}s forwards` }}>{n.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

// -- B. FLOWCHART: decision-tree with yes/no branches ---------
// spec: { nodes:[{id,type:"start|decision|process|end",label}], edges:[{from,to,label?}] }
function FlowchartSVG({ spec, els, stroke, tf, seed, dur }) {
  const W=300, H=172
  const rawNodes = spec?.nodes?.length
    ? spec.nodes
    : els.slice(0,5).map((el,i,a) => ({ id:String(i), type:i===0?'start':i===a.length-1?'end':'process', label:el }))
  const rawEdges = spec?.edges || rawNodes.slice(0,-1).map((_,i)=>({ from:String(i), to:String(i+1) }))

  // Auto-layout: position nodes top-to-bottom, branch decisions left/right
  const assigned = {}
  const slotH = H / (rawNodes.length + 0.5)
  rawNodes.forEach((n,i) => { assigned[n.id] = { x:W/2, y:20+i*slotH } })
  rawNodes.forEach(n => {
    if (n.type==='decision') {
      const out = rawEdges.filter(e=>e.from===n.id)
      const yes = out.find(e=>/(yes|true)/i.test(e.label||''))
      const no  = out.find(e=>/(no|false)/i.test(e.label||''))
      if (yes && assigned[yes.to]) assigned[yes.to].x = W*0.25
      if (no  && assigned[no.to])  assigned[no.to].x  = W*0.75
    }
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight:H }}>
      {/* Edges */}
      {rawEdges.map((e,i) => {
        const F=assigned[e.from], T=assigned[e.to]
        if (!F||!T) return null
        const len=Math.hypot(T.x-F.x,T.y-F.y), ang=Math.atan2(T.y-F.y,T.x-F.x), d=0.14+i*0.32
        const bh=16
        const x1=F.x+(bh+2)*Math.cos(ang), y1=F.y+(bh+2)*Math.sin(ang)
        const x2=T.x-(bh+6)*Math.cos(ang), y2=T.y-(bh+6)*Math.sin(ang)
        const c=Math.cos(ang), s=Math.sin(ang)
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              style={{ stroke, strokeWidth:1.8, strokeDasharray:len, strokeDashoffset:len,
                animation:`wbDraw 0.36s ${d}s ease-out forwards` }}/>
            <polygon points={`${x2},${y2} ${x2-8*c+4*s},${y2-8*s-4*c} ${x2-8*c-4*s},${y2-8*s+4*c}`}
              fill={stroke} style={{ opacity:0, animation:`wbFade 0.15s ${d+0.34}s forwards` }}/>
            {e.label && <text x={(x1+x2)/2-5*s} y={(y1+y2)/2+5*c} textAnchor="middle"
              fill={stroke} fontSize={8} fontFamily="inherit" fontWeight="700"
              style={{ opacity:0, animation:`wbFade 0.3s ${d+0.38}s forwards` }}>{e.label}</text>}
          </g>
        )
      })}
      {/* Nodes */}
      {rawNodes.map((n,i) => {
        const {x,y}=assigned[n.id]||{x:W/2,y:30+i*36}, bw=66, bh=15, d=0.06+i*0.36
        if (n.type==='decision') {
          const ds=18
          return (
            <g key={i}>
              <polygon points={`${x},${y-ds} ${x+ds*2},${y} ${x},${y+ds} ${x-ds*2},${y}`} fill="none"
                style={{ stroke, strokeWidth:1.8, strokeDasharray:300, strokeDashoffset:300,
                  animation:`wbDraw 0.5s ${d}s ease-out forwards` }}/>
              <text x={x} y={y+4} textAnchor="middle" fill={tf}
                fontSize={Math.max(6,Math.min(9,52/(n.label?.length||5)))} fontFamily="inherit" fontWeight="600"
                style={{ opacity:0, animation:`wbFade 0.3s ${d+0.44}s forwards` }}>{n.label}</text>
            </g>
          )
        }
        const isTerminal = n.type==='start'||n.type==='end'
        return (
          <g key={i}>
            <rect x={x-bw/2} y={y-bh} width={bw} height={bh*2} rx={isTerminal?bh:5} fill="none"
              style={{ stroke, strokeWidth:isTerminal?2.2:1.8, strokeDasharray:300, strokeDashoffset:300,
                animation:`wbDraw 0.48s ${d}s ease-out forwards` }}/>
            <text x={x} y={y+4} textAnchor="middle" fill={isTerminal?stroke:tf}
              fontSize={Math.max(7,Math.min(11,58/(n.label?.length||5)))} fontFamily="inherit"
              fontWeight={isTerminal?'800':'600'}
              style={{ opacity:0, animation:`wbFade 0.3s ${d+0.44}s forwards` }}>{n.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

// -- C. MATHSTEPS: step-by-step computation reveal ------------
// spec: { steps:[{expr,label}] }  e.g. [{expr:"F = ma",label:"Formula"},{expr:"= 5�3",label:"Substitute"},{expr:"= 15 N",label:"Answer"}]
function MathStepsSVG({ spec, els, stroke, tf, seed, dur }) {
  const steps = spec?.steps?.length
    ? spec.steps
    : els.slice(0,5).map((el,i,a) => ({ expr:el, label:i===0?'Given':i===a.length-1?'Answer':`Step ${i}` }))
  const ns=steps.length, rowH=Math.min(30, 148/ns)

  return (
    <svg viewBox="0 0 300 165" width="100%" style={{ maxHeight:165 }}>
      {/* Vertical connector */}
      <line x1={74} y1={12} x2={74} y2={12+ns*rowH}
        style={{ stroke, strokeWidth:1.5, opacity:0.35, strokeDasharray:ns*rowH, strokeDashoffset:ns*rowH,
          animation:'wbDraw 0.52s 0s ease-out forwards' }}/>
      {steps.map((s,i) => {
        const cy=12+i*rowH+rowH/2, d=0.06+i*0.46, isLast=i===ns-1
        return (
          <g key={i}>
            {/* Dot on vertical line */}
            <circle cx={74} cy={cy} r={isLast?7:5} fill={isLast?stroke:'none'}
              style={{ stroke, strokeWidth:isLast?0:2, strokeDasharray:40, strokeDashoffset:40,
                opacity:0, animation:`wbFade 0.2s ${d}s forwards`+(isLast?'':`, wbDraw 0.3s ${d}s ease-out forwards`) }}/>
            {/* Step label � left side in italic */}
            <text x={68} y={cy+4} textAnchor="end" fill={stroke} fontSize={9}
              fontFamily="'Caveat',cursive" fontStyle="italic"
              style={{ opacity:0, animation:`wbFade 0.28s ${d+0.08}s forwards` }}>{s.label}</text>
            {/* Expression � right side, bold for final answer */}
            <text x={84} y={cy+4} fill={isLast?stroke:tf}
              fontSize={isLast?Math.min(22,Math.max(14,130/(s.expr?.length||1))):Math.min(18,Math.max(11,110/(s.expr?.length||1)))}
              fontFamily="'Caveat',cursive" fontWeight={isLast?'800':'600'}
              style={{ opacity:0, animation:`wbFade 0.34s ${d+0.14}s forwards` }}>{s.expr}</text>
          </g>
        )
      })}
      {/* Underline under final answer */}
      <line x1={80} y1={14+ns*rowH} x2={290} y2={14+ns*rowH}
        style={{ stroke, strokeWidth:2.2, strokeDasharray:210, strokeDashoffset:210,
          animation:`wbDraw 0.5s ${0.06+ns*0.46+0.12}s ease-out forwards` }}/>
    </svg>
  )
}

// -- D. DATAPLOT: actual [x,y] points plotted on axes ---------
// spec: { points:[[x,y],...], xLabel, yLabel, annot?:[{x,y,label}] }
function DataPlotSVG({ spec, els, stroke, tf, seed, dur }) {
  const xLabel=spec?.xLabel||els[0]||'X', yLabel=spec?.yLabel||els[1]||'Y'
  const annot=spec?.annot||[]
  const L=38, B=132, R=278, T=12, W=R-L, H=B-T

  let svgPath='', dots=[], annotSVG=[]

  if (spec?.points?.length > 1) {
    const pts=spec.points
    const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1])
    const xMin=Math.min(...xs), xMax=Math.max(...xs)||1
    const yMin=Math.min(...ys), yMax=Math.max(...ys)||1
    const xR=xMax-xMin||1, yR=yMax-yMin||1
    const toSVG=(px,py)=>({ sx:L+(px-xMin)/xR*W, sy:B-(py-yMin)/yR*H })
    const svgPts=pts.map(([px,py])=>toSVG(px,py))
    svgPath=svgPts.map(({sx,sy},i)=>`${i===0?'M':'L'} ${sx.toFixed(1)},${sy.toFixed(1)}`).join(' ')
    dots=svgPts
    annotSVG=annot.map(a=>({ ...toSVG(a.x,a.y), label:a.label }))
  } else {
    // Seed-varied fallback curve
    const v=Math.floor(seed*4)
    const curves=['M 38,132 C 88,122 148,70 198,48 S 258,28 278,20',
                  'M 38,20  C 88,24 148,78 198,108 S 258,128 278,132',
                  'M 38,132 C 78,128 118,65 158,44 S 228,24 278,20',
                  'M 38,132 C 68,108 118,20 158,18 S 228,105 278,132']
    svgPath=curves[v]
  }

  return (
    <svg viewBox="0 0 300 148" width="100%" style={{ maxHeight:148 }}>
      {[0.25,0.5,0.75].map(t=>(
        <line key={t} x1={L} y1={B-t*H} x2={R} y2={B-t*H}
          style={{ stroke, strokeWidth:0.4, opacity:0.12, strokeDasharray:'3 4' }}/>
      ))}
      <line x1={L} y1={T} x2={L} y2={B}
        style={{ stroke, strokeWidth:2.5, strokeDasharray:H+5, strokeDashoffset:H+5,
          animation:'wbDraw 0.44s 0s ease-out forwards' }}/>
      <line x1={L-5} y1={B} x2={R} y2={B}
        style={{ stroke, strokeWidth:2.5, strokeDasharray:W+10, strokeDashoffset:W+10,
          animation:'wbDraw 0.44s 0.4s ease-out forwards' }}/>
      <polygon points={`${L},${T} ${L-4},${T+10} ${L+4},${T+10}`} fill={stroke}
        style={{ opacity:0, animation:'wbFade 0.2s 0.4s forwards' }}/>
      <polygon points={`${R},${B} ${R-10},${B-4} ${R-10},${B+4}`} fill={stroke}
        style={{ opacity:0, animation:'wbFade 0.2s 0.8s forwards' }}/>
      <text x={(L+R)/2} y={148} textAnchor="middle" fill={tf} fontSize={10} fontFamily="inherit"
        style={{ opacity:0, animation:'wbFade 0.3s 0.85s forwards' }}>{xLabel}</text>
      <text x={11} y={(T+B)/2} textAnchor="middle" fill={tf} fontSize={9} fontFamily="inherit"
        transform={`rotate(-90,11,${(T+B)/2})`}
        style={{ opacity:0, animation:'wbFade 0.3s 0.85s forwards' }}>{yLabel}</text>
      <path d={svgPath} fill="none" strokeLinecap="round" strokeLinejoin="round"
        style={{ stroke, strokeWidth:2.6, strokeDasharray:340, strokeDashoffset:340,
          animation:'wbDraw 1.2s 0.85s ease-in-out forwards' }}/>
      {dots.map(({sx,sy},i)=>(
        <circle key={i} cx={sx} cy={sy} r={3.5} fill={stroke}
          style={{ opacity:0, animation:`wbFade 0.2s ${0.85+1.2*(i/Math.max(dots.length-1,1))}s forwards` }}/>
      ))}
      {annotSVG.map((a,i)=>(
        <g key={i}>
          <circle cx={a.sx} cy={a.sy} r={5} fill="none"
            style={{ stroke, strokeWidth:1.5, opacity:0, animation:`wbFade 0.2s ${2.1+i*0.28}s forwards` }}/>
          <line x1={a.sx} y1={a.sy-6} x2={a.sx} y2={a.sy-18}
            style={{ stroke, strokeWidth:1.2, strokeDasharray:12, strokeDashoffset:12,
              animation:`wbDraw 0.2s ${2.2+i*0.28}s ease-out forwards` }}/>
          <text x={a.sx} y={a.sy-22} textAnchor="middle" fill={stroke} fontSize={9}
            fontFamily="'Caveat',cursive" fontWeight="700"
            style={{ opacity:0, animation:`wbFade 0.3s ${2.28+i*0.28}s forwards` }}>{a.label}</text>
        </g>
      ))}
    </svg>
  )
}

// -- FREEFORM: AI draws the exact topic-specific diagram ------
// spec: { shapes: [ {type, ...coords, label?, stroke?, fill?, sw?, fs?, dotted?, bold?, anchor?} ] }
// types: circle  ellipse  rect  line  arrow  path  text  polygon
// ViewBox 300�162 � X: 0=left 300=right, Y: 0=top 162=bottom, centre � (150,81)
// stroke/fill: any hex OR "accent" (= the scene accent color) OR omit for defaults
function FreeformSVG({ spec, els, stroke, tf, seed, dur }) {
  if (!spec?.shapes?.length) return <ConceptSVG els={els} stroke={stroke} tf={tf} seed={seed} />
  const shapes = spec.shapes
  const rc = (c) => (!c || c === 'accent') ? stroke : (c === 'text') ? tf : c
  const ri = (i) => (typeof shapes[i]?.delay === 'number') ? shapes[i].delay : i * 0.35
  const anim  = (len, i) => ({ strokeDasharray:len, strokeDashoffset:len, animation:`wbDraw ${0.7+i*0.06}s ease-out ${ri(i)}s forwards` })
  const fade  = (i, extra=0) => ({ opacity:0, animation:`wbFade 0.5s ease-out ${ri(i)+0.5+extra}s forwards` })
  return (
    <svg viewBox="0 0 300 162" width="100%" style={{ display:'block', overflow:'visible' }}>
      <defs>
        {shapes.map((s,i) => (s.type==='arrow') ? (
          <marker key={`m${i}`} id={`arr${i}`} markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <polygon points="0,0 7,3.5 0,7" fill={rc(s.stroke)} />
          </marker>
        ) : null)}
      </defs>
      {shapes.map((s, i) => {
        const col  = rc(s.stroke)
        const fill = s.fill === 'none' ? 'none' : s.fill ? rc(s.fill) : col + '1a'
        const sw   = s.sw || 2

        if (s.type === 'circle') {
          const r = s.r || 20
          return <g key={i}>
            <circle cx={s.x??150} cy={s.y??81} r={r} fill={fill} stroke={col} strokeWidth={sw} style={anim(2*Math.PI*r, i)} />
            {s.label && <text x={s.x??150} y={(s.y??81)+3} textAnchor="middle" fill={tf} fontSize={s.fs||9} fontFamily="Sora,sans-serif" style={fade(i)}>{s.label}</text>}
          </g>
        }
        if (s.type === 'ellipse') {
          const rx=s.rx||30, ry=s.ry||18
          return <g key={i}>
            <ellipse cx={s.x??150} cy={s.y??81} rx={rx} ry={ry} fill={fill} stroke={col} strokeWidth={sw} style={anim(2*Math.PI*Math.sqrt((rx*rx+ry*ry)/2), i)} />
            {s.label && <text x={s.x??150} y={(s.y??81)+3} textAnchor="middle" fill={tf} fontSize={s.fs||9} fontFamily="Sora,sans-serif" style={fade(i)}>{s.label}</text>}
          </g>
        }
        if (s.type === 'rect') {
          const w=s.w||60, h=s.h||30
          return <g key={i}>
            <rect x={s.x??120} y={s.y??66} width={w} height={h} rx={s.cr||4} fill={fill} stroke={col} strokeWidth={sw} style={anim(2*(w+h), i)} />
            {s.label && <text x={(s.x??120)+w/2} y={(s.y??66)+h/2+4} textAnchor="middle" fill={tf} fontSize={s.fs||9} fontFamily="Sora,sans-serif" style={fade(i)}>{s.label}</text>}
          </g>
        }
        if (s.type === 'line') {
          const [x1,y1,x2,y2]=[s.x1??50,s.y1??81,s.x2??250,s.y2??81]
          const len=Math.hypot(x2-x1,y2-y1), mx=(x1+x2)/2, my=(y1+y2)/2
          return <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={sw}
              strokeDasharray={s.dotted?'5 3':len} strokeDashoffset={s.dotted?0:len}
              style={s.dotted?{opacity:0,...fade(i,-.3)}:anim(len,i)} />
            {s.label && <text x={mx} y={my-5} textAnchor="middle" fill={col} fontSize={s.fs||8} fontFamily="Sora,sans-serif" style={fade(i)}>{s.label}</text>}
          </g>
        }
        if (s.type === 'arrow') {
          const [x1,y1,x2,y2]=[s.x1??50,s.y1??81,s.x2??250,s.y2??81]
          const len=Math.hypot(x2-x1,y2-y1), mx=(x1+x2)/2, my=(y1+y2)/2-5
          return <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={sw}
              markerEnd={`url(#arr${i})`} style={anim(len,i)} strokeDasharray={len} strokeDashoffset={len} />
            {s.label && <text x={mx} y={my} textAnchor="middle" fill={col} fontSize={s.fs||8} fontFamily="Sora,sans-serif" style={fade(i)}>{s.label}</text>}
          </g>
        }
        if (s.type === 'path') {
          return <g key={i}>
            <path d={s.d} fill={s.fill?fill:'none'} stroke={col} strokeWidth={sw} style={{opacity:0,...fade(i,-.3)}} />
            {s.label && <text x={s.lx??150} y={s.ly??81} textAnchor="middle" fill={tf} fontSize={s.fs||9} fontFamily="Sora,sans-serif" style={fade(i)}>{s.label}</text>}
          </g>
        }
        if (s.type === 'text') {
          return <text key={i} x={s.x??150} y={s.y??81} textAnchor={s.anchor||'middle'}
            fill={rc(s.color)||tf} fontSize={s.fs||11} fontWeight={s.bold?700:400}
            fontFamily="Sora,sans-serif" style={{opacity:0,...fade(i,-.3)}}>{s.text||''}</text>
        }
        if (s.type === 'polygon') {
          return <g key={i}>
            <polygon points={s.points} fill={fill} stroke={col} strokeWidth={sw} style={{opacity:0,...fade(i,-.3)}} />
            {s.label && <text x={s.lx??150} y={s.ly??81} textAnchor="middle" fill={tf} fontSize={s.fs||9} fontFamily="Sora,sans-serif" style={fade(i)}>{s.label}</text>}
          </g>
        }
        return null
      })}
    </svg>
  )
}

// -- Floating ambient particles --------------------------------
function Particles({ color }) {
  const pts = Array.from({ length:16 }, (_, i) => ({
    cx: `${5 + (i * 393 % 92)}%`,
    cy: `${8 + (i * 271 % 85)}%`,
    r: 1.1 + (i % 4) * 0.5,
    delay: `${(i * 0.37).toFixed(2)}s`,
    dur:   `${(2.6 + (i % 5) * 0.55).toFixed(1)}s`,
  }))
  return (
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:0 }} aria-hidden="true">
      {pts.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={color} opacity={0.5}
          style={{ animation:`floatPt ${p.dur} ${p.delay} ease-in-out infinite alternate` }}/>
      ))}
    </svg>
  )
}

// -- DiagramBoard: routes type ? component + passes stable seed -
function DiagramBoard({ type, elements, spec, accent, dark, dur }) {
  const containerRef = useRef(null)
  // Sanitize: strip any raw shape-command strings the AI may have put in draw_elements
  const els = (elements||[]).filter(e => e && typeof e === 'string' && !/^(circle|rect|arrow|line|ellipse|text|polygon|path)\s*\{/i.test(e))
  const tf  = dark ? '#f0f0f0' : '#111111'
  const t   = type || 'concept'
  // Stable seed: same content ? same layout variant; different topic ? different layout
  const seed = hashSeed(els.join('|') + t + JSON.stringify(spec||''))
  const props = { els: els.slice(0,4), spec: spec||null, stroke: accent, tf, seed, dur }

  // Scale all CSS animation timings to fill the scene duration.
  // Steps & Concept handle dur internally via animSlot ? skip them.
  useLayoutEffect(() => {
    if (!containerRef.current || !dur || t === 'steps' || t === 'concept') return
    const S = timeScale(dur)
    if (S <= 1.05) return
    containerRef.current.querySelectorAll('*').forEach(el => {
      const anim = el.style.animation
      if (!anim) return
      el.style.animation = anim.split(',').map(part => {
        if (/infinite/i.test(part)) {
          // For infinite (looping) animations, scale only the delay (2nd time value), not duration
          let count = 0
          return part.replace(/(\d+\.?\d*)s/g, (m, num) => { count++; return count === 1 ? m : (parseFloat(num) * S).toFixed(2) + 's' })
        }
        return part.replace(/(\d+\.?\d*)s/g, (m, num) => (parseFloat(num) * S).toFixed(2) + 's')
      }).join(',')
    })
  }, [dur, t])

  const penDur = dur ? Math.min(dur * 0.85, 18) : 4
  return (
    <div ref={containerRef} style={{ position:'relative', width:'100%', paddingTop:6 }}>
      <span style={{
        position:'absolute', left:6, top:4, fontSize:15, pointerEvents:'none', zIndex:10,
        animation:`penTrace ${penDur}s ease-in-out forwards`,
      }}>{'\u270F\uFE0F'}</span>
      {/* FreeformSVG � AI-drawn topic-specific visuals */}
      {t==='freeform'   && <FreeformSVG   {...props} />}
      {/* 4 LLM-powered spec types */}
      {t==='network'    && <NetworkSVG    {...props} />}
      {t==='flowchart'  && <FlowchartSVG  {...props} />}
      {t==='mathsteps'  && <MathStepsSVG  {...props} />}
      {t==='dataplot'   && <DataPlotSVG   {...props} />}
      {/* 17 template types */}
      {t==='steps'      && <StepsSVG      {...props} />}
      {t==='cycle'      && <CycleSVG      {...props} />}
      {t==='formula'    && <FormulaSVG    {...props} />}
      {t==='comparison' && <ComparisonSVG {...props} />}
      {t==='timeline'   && <TimelineSVG   {...props} />}
      {t==='graph'      && <GraphSVG      {...props} />}
      {t==='tree'       && <TreeSVG       {...props} />}
      {t==='venn'       && <VennSVG       {...props} />}
      {t==='buildup'    && <BuildupSVG    {...props} />}
      {t==='funnel'     && <FunnelSVG     {...props} />}
      {t==='avatar'     && <AvatarSVG     {...props} />}
      {t==='pulse'      && <PulseSVG      {...props} />}
      {t==='wave'       && <WaveSVG       {...props} />}
      {t==='bar'        && <BarSVG        {...props} />}
      {t==='ball'       && <BallSVG       {...props} />}
      {t==='spotlight'  && <SpotlightSVG  {...props} />}
      {!['freeform','network','flowchart','mathsteps','dataplot',
         'steps','cycle','formula','comparison','timeline','graph','tree','venn','buildup',
         'funnel','avatar','pulse','wave','bar','ball','spotlight'].includes(t) &&
        <ConceptSVG {...props} />}
    </div>
  )
}
// ----------------------------------------------------------------
// MAIN COMPONENT

// ----------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------
export default function VideosTab({ profile, userId, addXp }) {

  const [question,      setQuestion]      = useState('')
  const [lesson,        setLesson]        = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [sceneIdx,      setSceneIdx]      = useState(0)
  const [sceneKey,      setSceneKey]      = useState(0)
  const [quizSel,       setQuizSel]       = useState(null)
  const [showSummary,   setShowSummary]   = useState(false)
  const [error,         setError]         = useState('')
  const [boardStyle,    setBoardStyle]    = useState('chalk')
  const [level,         setLevel]         = useState('standard')
  const [playing,       setPlaying]       = useState(false)
  const [progress,      setProgress]      = useState(0)
  const [wordBoundary,  setWordBoundary]  = useState({ idx:-1 })
  const [voiceOk]                        = useState(() => 'speechSynthesis' in window)
  const [voiceStatus,   setVoiceStatus]   = useState('loading') // loading|ready|none|error
  const [typeText,      setTypeText]      = useState('')
  const [sceneAnswers,  setSceneAnswers]  = useState({})
  const [altExps,       setAltExps]       = useState({})
  const [showAlt,       setShowAlt]       = useState(false)
  const [reExplaining,  setReExplaining]  = useState(false)
  const [pipelineStage, setPipelineStage] = useState(0) // 0=idle 1=understanding 2=storyboard 3=scripting 4=done

  const progressRef   = useRef(null)
  const autoAdvRef    = useRef(false)
  const lessonRef     = useRef(null)
  const typeRef       = useRef(null)
  const sceneTimerRef = useRef(null)
  const keepAliveRef  = useRef(null)
  const voiceRef      = useRef(null)
  const speakDelayRef = useRef(null)
  const utterRef      = useRef(null)   // hold utterance to prevent GC

  useEffect(() => { lessonRef.current = lesson }, [lesson])

  // Pre-load best voice for this language (Chrome loads voices async)
  useEffect(() => {
    if (!('speechSynthesis' in window)) { setVoiceStatus('none'); return }
    const load = () => {
      const allVoices = window.speechSynthesis.getVoices()
      const v = pickVoice(profile.language)
      voiceRef.current = v
      const langCode = LANG_VOICE[profile.language] || 'en-IN'
      const isNative = v && (v.lang === langCode || v.lang.replace('_','-') === langCode || v.lang.startsWith(langCode.split('-')[0]))
      console.log('[Eduvy-AI TTS] Voices:', allVoices.length, 'Picked:', v?.name || 'NONE', '(' + (v?.lang||'') + ')', isNative ? '? native' : '? fallback')
      if (v && isNative) setVoiceStatus('ready')
      else if (v) setVoiceStatus('ready')  // fallback voice found � still usable
      else if (allVoices.length === 0) setVoiceStatus('loading')
      else setVoiceStatus('none')
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
    const retry = setTimeout(load, 1000)
    const retry2 = setTimeout(load, 3000)
    return () => {
      window.speechSynthesis.onvoiceschanged = null
      clearTimeout(retry); clearTimeout(retry2)
    }
  }, [profile.language])

  // Load saved lesson on mount
  useEffect(() => {
    if (!userId) return
    apiGetDraft(userId, 'video_lesson')
      .then(d => { if (d?.content) try { setLesson(JSON.parse(d.content)) } catch {} })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => () => {
    stopSpeech(); clearInterval(typeRef.current)
    clearTimeout(sceneTimerRef.current); clearInterval(keepAliveRef.current)
    clearTimeout(speakDelayRef.current)
  }, [])

  // Typewriter: writes text onto the whiteboard character by character
  // Restarts when scene changes OR when playback starts (to sync pace)
  useEffect(() => {
    const sc = lesson?.scenes?.[sceneIdx]
    if (!sc) return
    const full = sc.content || ''
    let i = 0
    clearInterval(typeRef.current)
    setTypeText('')
    const wc = full.split(/\s+/).length
    const sceneSec = Math.max(10, sc.timing?.total_sec || 12, wc / 2.2)
    // Play mode: sync to ~85% of scene duration. Manual: comfortable reading pace.
    const ms = playing ? Math.max(25, (sceneSec * 850) / Math.max(1, full.length)) : 30
    typeRef.current = setInterval(() => {
      i++
      setTypeText(full.slice(0, i))
      if (i >= full.length) clearInterval(typeRef.current)
    }, ms)
    return () => clearInterval(typeRef.current)
  }, [sceneIdx, lesson, playing]) // eslint-disable-line react-hooks/exhaustive-deps

  // -- Speech & Playback -------------------------------------
  const stopSpeech = useCallback(() => {
    window.speechSynthesis?.cancel()
    clearInterval(progressRef.current)
    clearTimeout(sceneTimerRef.current)
    clearInterval(keepAliveRef.current)
    clearTimeout(speakDelayRef.current)
    utterRef.current = null
    setPlaying(false); setProgress(0); setWordBoundary({ idx:-1 })
    autoAdvRef.current = false
  }, [])

  const speakScene = useCallback((scene, onEnd) => {
    // -- STEP 1: Stop everything from previous scene --
    window.speechSynthesis?.cancel()
    clearInterval(progressRef.current)
    clearTimeout(sceneTimerRef.current)
    clearInterval(keepAliveRef.current)
    clearTimeout(speakDelayRef.current)
    setWordBoundary({ idx:-1 })

    // -- STEP 2: Clean text for speech (strip emoji only) --
    const text = (scene.content || '')
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\ufe0f]/gu, '')
      .replace(/\s{2,}/g, ' ').trim()

    // -- STEP 3: Calculate scene timing --
    const wordCount = text.split(/\s+/).length
    const readSec   = wordCount / 2.2
    const aiSec     = scene.timing?.total_sec || 12
    const sceneSec  = Math.max(readSec, aiSec, 10)
    const sceneMs   = sceneSec * 1000
    const t0        = Date.now()

    let ttsEnded  = false
    let timerDone = false
    let finished  = false

    const finish = () => {
      if (finished) return
      finished = true
      clearInterval(progressRef.current)
      clearTimeout(sceneTimerRef.current)
      clearInterval(keepAliveRef.current)
      clearTimeout(speakDelayRef.current)
      utterRef.current = null
      setProgress(100); setWordBoundary({ idx:-1 })
      setTimeout(() => { setProgress(0); onEnd?.() }, 500)
    }
    const tryFinish = () => { if (ttsEnded && timerDone) finish() }

    // -- STEP 4: Start progress bar --
    setProgress(0)
    progressRef.current = setInterval(() => {
      setProgress(Math.min(95, ((Date.now() - t0) / sceneMs) * 100))
    }, 200)

    // -- STEP 5: Scene minimum timer --
    sceneTimerRef.current = setTimeout(() => {
      timerDone = true; tryFinish()
    }, sceneMs)

    // -- STEP 6: Speak --
    if (voiceOk && text.length > 0) {
      speakDelayRef.current = setTimeout(() => {
        const utter = new SpeechSynthesisUtterance(text)
        utterRef.current = utter

        // Use pre-loaded voice (pickVoice now always returns a fallback)
        let voice = voiceRef.current
        if (!voice) { voice = pickVoice(profile.language); voiceRef.current = voice }
        if (voice) {
          utter.voice = voice
          utter.lang = voice.lang.replace('_', '-')
        }
        utter.volume = 1; utter.rate = 1; utter.pitch = 1

        utter.onstart = () => console.log('[Eduvy-AI TTS] ? onstart �', text.slice(0,40))
        utter.onboundary = e => { if (e.name === 'word') setWordBoundary({ idx: e.charIndex }) }
        utter.onend = () => {
          console.log('[Eduvy-AI TTS] ? onend')
          ttsEnded = true; tryFinish()
        }
        utter.onerror = (ev) => {
          console.error('[Eduvy-AI TTS] ? onerror:', ev?.error || ev)
          ttsEnded = true; tryFinish()
        }

        console.log('[Eduvy-AI TTS] speak()', { voice: voice?.name, lang: utter.lang, len: text.length })
        window.speechSynthesis.speak(utter)

        // Chrome 15s bug workaround
        keepAliveRef.current = setInterval(() => {
          if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause()
            window.speechSynthesis.resume()
          }
        }, 10000)
      }, 50)
    } else {
      console.warn('[Eduvy-AI TTS] Skip:', { voiceOk, textLen: text.length })
      ttsEnded = true
    }
  }, [profile.language, voiceOk])

  const playFromScene = useCallback((idx, ls) => {
    const L = ls || lessonRef.current
    if (!L?.scenes || idx >= L.scenes.length) { setPlaying(false); setShowSummary(true); return }
    setSceneIdx(idx); setSceneKey(k => k+1); setPlaying(true)
    autoAdvRef.current = true
    speakScene(L.scenes[idx], () => { if (autoAdvRef.current) playFromScene(idx+1, L) })
  }, [speakScene])

  const togglePlay = () => playing ? stopSpeech() : playFromScene(sceneIdx, null)

  const goToScene = useCallback(idx => {
    stopSpeech(); setSceneIdx(idx); setSceneKey(k => k+1)
    setShowSummary(false); setShowAlt(false)
  }, [stopSpeech])

  const advanceScene = useCallback(() => {
    stopSpeech(); setShowAlt(false)
    const ls = lessonRef.current; if (!ls) return
    if (sceneIdx < ls.scenes.length-1) { setSceneIdx(i => i+1); setSceneKey(k => k+1) }
    else setShowSummary(true)
  }, [sceneIdx, stopSpeech])

  // ? AI re-explain with a completely different analogy
  const reExplain = useCallback(async (idx, scene) => {
    if (altExps[idx]) { setShowAlt(true); return }
    setReExplaining(true); stopSpeech()
    const sys = buildSystemPrompt(profile,
      `The student did not understand: "${scene.content}"
Write a COMPLETELY DIFFERENT explanation in ${profile.language} using a brand new analogy.
3-4 sentences max. Return ONLY the explanation text � no JSON, no labels, no intro.`)
    const alt = await callAI(`Re-explain: ${scene.title}`, sys, [], 2, 500)
    setAltExps(p => ({ ...p, [idx]: alt }))
    setShowAlt(true); setReExplaining(false)
  }, [altExps, profile, stopSpeech])

  const generate = async q => {
    const topic = (q || question).trim()
    if (!topic || loading) return
    // Safety guard
    const safety = checkStudentQuery(topic, profile)
    if (safety.blocked) { setError(safety.message); return }
    stopSpeech(); clearInterval(typeRef.current)
    setLoading(true); setPipelineStage(1)
    setLesson(null); setSceneIdx(0); setSceneKey(0); setTypeText('')
    setQuizSel(null); setShowSummary(false); setError('')
    setSceneAnswers({}); setAltExps({}); setShowAlt(false)

    // Level-specific instructions (from Golpo differentiated-lessons research)
    const levelCfg = {
      foundation: {
        label: 'Foundation',
        depth: `FOUNDATION LEVEL � student is hearing this for the very first time. Use the simplest possible words. Every abstract word must be explained with a physical object they can see or touch. Short sentences only. Build one idea at a time. Do not use jargon at all.`,
        exampleDepth: `Use a very simple everyday Indian example � something a child sees at home, in the kitchen, or on the street. No numbers, no calculations � just a clear picture in words.`,
        workedExample: `Give a concrete simple example with ONE easy number or one familiar real-world scenario � no multi-step calculation.`,
        takeaway: `End with ONE sentence the student can repeat to a friend to explain the concept.`,
      },
      standard: {
        label: 'Standard',
        depth: `STANDARD LEVEL � student knows the basics of the subject and is now learning this specific concept for their ${profile.board} exam. Use proper terminology but define each term as you introduce it. Balance intuition with some detail. Include one complete worked example with actual numbers or real steps.`,
        exampleDepth: `Use an Indian daily-life analogy first, then show exactly how it maps to the real concept. Make the link explicit � do not leave it implied.`,
        workedExample: `Walk through ONE complete worked example step by step with actual numbers or steps � like a teacher solving it on the board. Show the working, not just the answer.`,
        takeaway: `End with the single most important line a student should remember for the ${profile.board} exam.`,
      },
      advanced: {
        label: 'Advanced / Competitive',
        depth: `ADVANCED LEVEL � student already knows the standard concept and is preparing for competitive exams (JEE, NEET, Olympiad) or needs deeper understanding. Go into the why behind the formula, edge cases, and common traps. Use precise language. Challenge assumptions.`,
        exampleDepth: `Use a non-obvious Indian example that reveals something surprising or counter-intuitive about the concept. Avoid the most obvious textbook example � pick one that makes the student think.`,
        workedExample: `Walk through a challenging worked example with full calculations. Show at least 2 steps with real values. Point out the common mistake students make and why.`,
        takeaway: `End with one deep insight or connection to another concept that exam-toppers know but most students miss.`,
      },
    }
    const lc = levelCfg[level]

    // -------------------------------------------------------
    // GOLPO-STYLE 3-STAGE PIPELINE
    // Stage 1: Content Intelligence  � what is this topic? what visual plan?
    // Stage 2: Storyboard             � decide visuals BEFORE writing content
    // Stage 3: Full Lesson            � write content TO the storyboard plan
    // This is why Golpo explains better: visuals are decided first, not after.
    // -------------------------------------------------------

    try {
      // -- STAGE 1: Content Intelligence ------------------
      setPipelineStage(1)
      const intellSys = buildSystemPrompt(profile,
        `You are an expert curriculum designer. Analyse this topic for a ${profile.standard} ${profile.board} student at ${lc.label} level.
Topic: "${topic}"

Visual types to choose from:
- avatar (teacher character � use for scene 1 only)
- concept (mind-map circles), steps (numbered steps), cycle (circular process), comparison (side-by-side T-chart)
- timeline, graph, tree (hierarchy), venn (overlapping sets), buildup (equation build), funnel, formula (formula display)
- bar (bar chart), pulse (rhythm/wave), wave, ball (physics motion), spotlight (key idea)
- flowchart (decision/process flow � only if topic has branching decisions)
- mathsteps (step-by-step calculation � only for math/physics formulas)
- dataplot (data scatter � only if topic involves plotted data)
- freeform (AI draws custom shapes � use sparingly, max 2 scenes)

Pick the BEST visual type per scene. Use VARIETY � no more than 2 scenes with same type. Prefer template types (concept/steps/cycle/comparison/tree/graph) over freeform.

Plan a 10-scene lesson. Return ONLY raw JSON:
{"subject":"...","hook":"surprising question","key_concept":"1 sentence","prerequisite":"...","misconception":"...","sub_concepts":["concept A","concept B","concept C"],"visual_plan":[{"scene":1,"best_visual":"avatar"},{"scene":2,"best_visual":"concept"},{"scene":3,"best_visual":"cycle"},{"scene":4,"best_visual":"steps"},{"scene":5,"best_visual":"comparison"},{"scene":6,"best_visual":"graph"},{"scene":7,"best_visual":"tree"},{"scene":8,"best_visual":"mathsteps"},{"scene":9,"best_visual":"flowchart"},{"scene":10,"best_visual":"steps"}],"key_formula":"...","indian_example":"real Indian scenario","second_example":"different Indian scenario for deeper practice"}`)
      const intellRaw = await callAI(`Analyse topic: ${topic}`, intellSys, [], 2, 1000)
      if (intellRaw?.startsWith('⚠️')) { setError(intellRaw); setPipelineStage(0); setLoading(false); return }
      const intel = parseAIObject(intellRaw) || {}

      // -- STAGE 2: Storyboard Plan ------------------------
      setPipelineStage(2)
      // Extract the AI's visual decisions from Stage 1
      const visualPlan = intel.visual_plan || []
      const validTypes = ['avatar','concept','steps','cycle','comparison','timeline','graph','tree','venn',
        'buildup','funnel','formula','bar','pulse','wave','ball','spotlight',
        'freeform','flowchart','mathsteps','dataplot']
      const defaultVisuals = ['avatar','concept','cycle','steps','comparison','graph','tree','mathsteps','flowchart','steps']
      const sceneVisuals = Array.from({length:10}, (_,i) => {
        const vp = visualPlan.find(v => v.scene === i+1)
        let chosen = vp?.best_visual || defaultVisuals[i]
        // Handle "freeform or cycle" ? take the second option (template) when possible
        if (chosen.includes(' or ')) {
          const parts = chosen.split(' or ').map(s => s.trim())
          chosen = parts.find(p => p !== 'freeform' && validTypes.includes(p)) || parts[0]
        }
        if (!validTypes.includes(chosen)) chosen = defaultVisuals[i]
        return chosen
      })

      // Build the draw_elements guide for each scene based on Stage 1 intel
      const subs = intel.sub_concepts || []
      const drawGuide = sceneVisuals.map((v,i) => {
        if (v==='avatar') return `Scene ${i+1}: avatar � teacher introduces the hook`
        if (v==='steps') return `Scene ${i+1}: steps � 3-4 clear action items`
        if (v==='concept') return `Scene ${i+1}: concept � central idea with 3 connected sub-ideas`
        if (v==='cycle') return `Scene ${i+1}: cycle � process stages in a loop`
        if (v==='comparison') return `Scene ${i+1}: comparison � two sides contrasted`
        if (v==='graph') return `Scene ${i+1}: graph � trend line with labeled axes`
        if (v==='tree') return `Scene ${i+1}: tree � hierarchy from general to specific`
        if (v==='freeform') {
          const hints = [
            '', intel.key_concept||topic, subs[0]||topic, intel.indian_example||'example',
            '', subs[1]||topic, subs[2]||'application', intel.second_example||intel.indian_example||'example',
            intel.key_formula||'structure', ''
          ]
          return `Scene ${i+1}: freeform � draw ${hints[i]||topic}`
        }
        return `Scene ${i+1}: ${v} � illustrate with labeled elements`
      }).join('\\n')

      // -- STAGE 3: Full Lesson from Storyboard -----------
      setPipelineStage(3)
      const sys = buildSystemPrompt(profile, `You are creating a 10-scene whiteboard explainer lesson. ${lc.depth}

STUDENT: Class ${profile.standard}, ${profile.board} board, language ${profile.language}
TOPIC: ${topic}
DIFFICULTY: ${lc.label}

=== PRE-DECIDED STORYBOARD (DO NOT CHANGE visual types) ===
${sceneVisuals.map((v,i) => `Scene ${i+1}: ${v}`).join('\\n')}

=== DRAW GUIDE ===
${drawGuide}

=== INTEL ===
Hook: ${intel.hook||''} | Concept: ${intel.key_concept||''} | Misconception: ${intel.misconception||''}
Indian example 1: ${intel.indian_example||''} | Example 2: ${intel.second_example||''} | Formula: ${intel.key_formula||''}
Sub-concepts: ${(intel.sub_concepts||[]).join(', ')}

=== 10-SCENE SCRIPT STRUCTURE (write like a teacher speaking on camera) ===
1-HOOK: Ask a surprising question or state a mind-blowing fact. Make the student NEED to know the answer. Do NOT define the topic yet. 3 punchy sentences.
2-FOUNDATION: Connect to what student already knows. "You already know X... but what if Y?" Bridge the gap between known and unknown. 3-4 sentences.
3-CORE CONCEPT: NOW explain the key idea clearly. Define the term. ${lc.depth} Directly address the misconception: "${intel.misconception||'common wrong idea'}". 4 sentences.
4-HOW IT WORKS: Walk through the mechanism step-by-step using "${intel.indian_example||'a real scenario'}". Make the student SEE it happening. 4 sentences.
5-CONTRAST: "What is the difference between X and Y?" or "What happens if we change Z?". Show boundaries of the concept. 3-4 sentences.
6-REAL-WORLD: ${lc.exampleDepth} Use Indian context � ISRO, Mumbai locals, cricket, Tata, monsoon, etc. Connect concept to real life. 4 sentences.
7-DEEPER: Explore "${(intel.sub_concepts||[])[1]||'a deeper sub-concept'}". Add a layer of understanding. 3-4 sentences.
8-WORKED EXAMPLE: ${lc.workedExample} Show EVERY step with actual numbers. Write like you are solving on the board. 4 sentences.
9-COMMON MISTAKES: "Most students get this wrong..." Show the wrong answer, explain WHY it is wrong, then show the right way. 3-4 sentences.
10-EXAM TIPS: ${lc.takeaway} Which question type appears in board exams? What to write first? What NOT to write? 3 sentences.

=== QUALITY ===
- Write like a TEACHER speaking to a student, not a textbook
- Every sentence adds new info. No "Let us understand", "In this lesson", "Remember that"
- Use specific numbers: "5 kg", "3 m/s", "Rs 500" � NOT "some", "many", "various"
- Each scene content = 3-4 sentences of real teaching, not summaries

=== DIAGRAM RULES ===
draw_elements: REQUIRED for ALL diagram types. Must be an array of 3-4 SHORT text labels (max 8 chars each).
These labels appear INSIDE the SVG shapes. Use topic-specific words, NOT shape commands.
CORRECT: ["⚡","🔬🧪💡","🌊🌀","F=ma"]
WRONG: ["arrow{400,100,500,100,'⚡'}"] � NEVER put shape commands in draw_elements!

FREEFORM type ONLY: Also add diagram_spec.shapes as array of JSON objects. Canvas 300x162.
Each shape is a JSON object with "type" key. Examples:
{"type":"circle","x":80,"y":60,"r":25,"label":"Label"}
{"type":"rect","x":50,"y":40,"w":80,"h":35,"label":"Label"}
{"type":"arrow","x1":100,"y1":80,"x2":200,"y2":80,"label":"Label"}
{"type":"text","x":150,"y":20,"text":"F=ma","fs":12,"bold":true}
{"type":"line","x1":50,"y1":140,"x2":250,"y2":140}
{"type":"ellipse","x":150,"y":81,"rx":40,"ry":20,"label":"Label"}
stroke/fill: "accent" or hex. Use 6-9 shapes. Draw the ACTUAL topic diagram.

MATHSTEPS: Also add diagram_spec={"steps":[{"expr":"...","label":"..."}]}
DATAPLOT: Also add diagram_spec={"points":[[x,y]],"xLabel":"...","yLabel":"...","annot":[]}
FLOWCHART: Also add diagram_spec={"nodes":[{"id":"n1","type":"rect","label":"..."}],"edges":[{"from":"n1","to":"n2","label":"..."}]}
Template types (concept/steps/cycle/comparison/tree/graph/etc): draw_elements only, NO diagram_spec needed.

=== JSON RULES ===
1. ONLY raw JSON with double-quoted keys and values 2. All content in ${profile.language} 3. Escape any double-quote inside string values as \\"
4. visual_type = storyboard above 5. diagram_spec ONLY for freeform/mathsteps/dataplot/flowchart
6. narration_chunks: 3 short sentences 7. timing: {"diagram_start":0.5,"text_start":2.5,"total_sec":12}

CRITICAL — EVERY scene MUST have COMPLETELY DIFFERENT content. No sentence should repeat across scenes.
Each scene below has a MANDATORY content focus — follow it strictly:

Scene 1 MUST be: A surprising hook question or mind-blowing fact about "${topic}". Do NOT define the topic yet. Make student NEED to know.
Scene 2 MUST be: Connect to something student already knows. Bridge the gap to "${intel.key_concept||topic}".
Scene 3 MUST be: Define and clearly explain the core concept. Address misconception: "${intel.misconception||'common wrong idea'}".
Scene 4 MUST be: Walk through HOW it works step-by-step using "${intel.indian_example||'a real Indian scenario'}".
Scene 5 MUST be: Contrast — what is the difference or what happens when you change something? Show the concept boundaries.
Scene 6 MUST be: Real-world connection — ISRO, cricket, monsoon, Mumbai locals, Tata, Indian farmers etc. 
Scene 7 MUST be: Deeper dive into "${(intel.sub_concepts||[])[1]||'a deeper sub-concept'}".
Scene 8 MUST be: Fully worked numerical/practical example with specific numbers. Show EVERY calculation step.
Scene 9 MUST be: Common student mistakes — show wrong answer, explain WHY wrong, then show correct.
Scene 10 MUST be: ${lc.takeaway} Board exam tips — what question types appear, what to write first.

Return 10 scenes:
{"title":"TITLE","subject":"${intel.subject||''}","level":"${lc.label}","hook":"${intel.hook||''}","key_formula":"${intel.key_formula||''}","scenes":[${sceneVisuals.map((v,i) => {
  const contentFocus = [
    'HOOK: surprising fact/question — do NOT define topic yet',
    `BRIDGE: connect to known → unknown for ${intel.key_concept||topic}`,
    `DEFINE: explain core concept, fix misconception: ${intel.misconception||'common error'}`,
    `MECHANISM: step-by-step how it works — use ${intel.indian_example||'Indian example'}`,
    'CONTRAST: difference or boundary of the concept',
    'REAL-WORLD: Indian context connection (ISRO/cricket/monsoon/etc)',
    `DEEPER: explore sub-concept ${(intel.sub_concepts||[])[1]||'deeper layer'}`,
    'WORKED EXAMPLE: specific numbers, every calculation step shown',
    'MISTAKES: wrong answer → why wrong → correct approach',
    `EXAM TIPS: ${lc.takeaway}`
  ][i]
  const hasFreeform = ['freeform','mathsteps','dataplot','flowchart'].includes(v)
  return `{"title":"scene ${i+1} title","visual":"emojis","visual_type":"${v}","draw_elements":["e1","e2","e3"]${hasFreeform?',"diagram_spec":{}':''},"content":"[${contentFocus}] Write 3-4 sentences HERE","narration_chunks":["s1","s2","s3"],"timing":{"diagram_start":0.5,"text_start":2.5,"total_sec":12}}`
}).join(',')}],"keyPoints":["p1","p2","p3","p4","p5"],"formula":"${intel.key_formula||''}","oneLineTakeaway":"...","practiceQ":{"q":"MCQ","options":["A)","B)","C)","D)"],"answer":"A","explanation":"why"}}`)

      const res    = await callAI(`Create 10-scene whiteboard lesson: ${topic}`, sys, [], 3, 8192)
      const parsed = parseAIObject(res)
      if (parsed?.scenes?.length) {
        // Inject intel fields if AI missed them
        if (!parsed.hook && intel.hook)           parsed.hook = intel.hook
        if (!parsed.key_formula && intel.key_formula) parsed.key_formula = intel.key_formula
        // Accept partial lessons (truncated responses may have 6-9 scenes instead of 10)
        setLesson(parsed); lessonRef.current = parsed
        apiSaveDraft(userId, 'video_lesson', JSON.stringify(parsed)).catch(() => {})
        addXp(8)
      } else {
        const preview = (res||'').slice(0,200)
        console.warn('[Eduvy-AI] Stage 3 parse failed. Raw AI response:', res?.slice(0, 500))
        setError(res?.startsWith('⚠️') ? res : `⚠️ Could not parse lesson. ${preview ? 'The AI response did not return valid JSON. Try again or switch AI provider in Settings.' : 'Check Settings ? AI Provider.'}`)
      }
    } catch (e) {
      setError('Generation pipeline failed. Please try again.')
    }

    setPipelineStage(0)
    setLoading(false)
  }

  const answerQuiz = letter => {
    if (quizSel) return
    setQuizSel(letter)
    addXp(letter === lesson.practiceQ?.answer ? 5 : 1)
  }

  const resetLesson = () => {
    stopSpeech(); clearInterval(typeRef.current)
    clearTimeout(sceneTimerRef.current); clearInterval(keepAliveRef.current)
    clearTimeout(speakDelayRef.current)
    setLesson(null); setQuestion(''); setSceneIdx(0); setSceneKey(0); setTypeText('')
    setShowSummary(false); setQuizSel(null); setError('')
    setSceneAnswers({}); setAltExps({}); setShowAlt(false)
  }

  const cs   = lesson?.scenes?.[sceneIdx]
  const bs   = BS[boardStyle]
  const sacc = (SCENE_PALETTE[boardStyle] || SCENE_PALETTE.color)[sceneIdx % 10]

  // ? Karaoke word-highlight renderer � offset=0 since TTS speaks content only
  const renderHL = (text) => {
    let cp = 0
    return text.split(/(\s+)/).map((tok, i) => {
      const abs = cp, tU = u16(tok)
      const on = playing && wordBoundary.idx >= abs && wordBoundary.idx < abs + tU && tok.trim().length > 0
      cp += tU
      return <span key={i} style={{ background:on?sacc+'50':'transparent', color:on?'#fff':'inherit', fontWeight:on?800:'inherit', borderRadius:3, padding:on?'1px 3px':'0', transition:'background 0.08s' }}>{tok}</span>
    })
  }

  // ? Clarity score (Feature 5)
  const confusedIdxs = lesson ? Object.entries(sceneAnswers).filter(([,v])=>v==='confused').map(([k])=>+k) : []
  const clarityPct   = lesson ? Math.round(((lesson.scenes.length-confusedIdxs.length)/lesson.scenes.length)*100) : 100
  const clarityCol   = clarityPct>=80 ? COLORS.green : clarityPct>=50 ? COLORS.yellow : COLORS.red

  // ----------------------------------------------------------
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 130px)' }}>

      {/* CSS: Google Fonts + all keyframes */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Patrick+Hand&display=swap');
        @keyframes wbDraw      { to { stroke-dashoffset: 0 } }
        @keyframes wbFade      { to { opacity: 1 } }
        @keyframes penTrace    { 0%{opacity:1;transform:translate(6px,28px)} 10%{opacity:1;transform:translate(40px,15px)} 22%{transform:translate(105px,10px)} 36%{transform:translate(195px,48px)} 50%{transform:translate(58px,72px)} 64%{transform:translate(180px,28px)} 78%{transform:translate(228px,60px)} 88%{transform:translate(148px,18px)} 95%{opacity:0.8;transform:translate(268px,42px)} 100%{opacity:0;transform:translate(280px,52px)} }
        @keyframes sceneFade   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sceneSlideL { from{opacity:0;transform:translateX(-30px)} to{opacity:1;transform:translateX(0)} }
        @keyframes sceneSlideR { from{opacity:0;transform:translateX(30px)} to{opacity:1;transform:translateX(0)} }
        @keyframes sceneZoom   { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
        @keyframes boardIn     { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        @keyframes vidSpin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes waveBar     { 0%,100%{transform:scaleY(.3)} 50%{transform:scaleY(1)} }
        @keyframes clarPop     { from{transform:scale(.6);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes blink       { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes floatPt     { from{transform:translateY(0px)} to{transform:translateY(-9px)} }
        @keyframes pulseGlow   { 0%,100%{opacity:0.18} 50%{opacity:0.42} }
        @keyframes rippleRing  { 0%{r:32;opacity:0.5} 100%{r:90;opacity:0} }
        @keyframes growUp      { from{stroke-dashoffset:9999} to{stroke-dashoffset:0} }
        @keyframes shimmerMove { 0%{x:-120px} 100%{x:360px} }
        @keyframes popIn       { 0%{transform:scale(0) rotate(-15deg);opacity:0} 70%{transform:scale(1.15) rotate(4deg)} 100%{transform:scale(1) rotate(0deg);opacity:1} }
        @keyframes eyeBlink    { 0%,88%,100%{transform:scaleY(1)} 93%{transform:scaleY(0.08)} }
        @keyframes floatScene  { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
        @keyframes underline   { from{stroke-dashoffset:300} to{stroke-dashoffset:0} }
        @keyframes confettiBurst{ 0%{transform:scale(0);opacity:1} 60%{transform:scale(1.6);opacity:0.8} 100%{transform:scale(2);opacity:0} }
        @keyframes sceneNumPop { from{opacity:0;transform:scale(0.5)} to{opacity:0.07;transform:scale(1)} }
      `}</style>

      {/* -- Top bar: board style + level + search -- */}
      <div style={{ padding:'10px 14px', flexShrink:0, background:COLORS.card, borderBottom:`1px solid ${COLORS.border}` }}>
        {/* Row 1: board style */}
        <div style={{ display:'flex', gap:6, marginBottom:7 }}>
          {Object.entries(BS).map(([k,v]) => (
            <button key={k} onClick={() => setBoardStyle(k)} style={{
              background: boardStyle===k ? v.accent+(k==='marker'?'22':'15') : 'transparent',
              border: `1px solid ${boardStyle===k ? v.accent : COLORS.border}`,
              borderRadius:8, padding:'5px 12px', fontSize:11,
              fontWeight: boardStyle===k ? 700 : 500,
              color: boardStyle===k ? (k==='marker'?v.accent:'#fff') : COLORS.muted,
              cursor:'pointer', fontFamily:'Sora,sans-serif', transition:'all 0.2s',
            }}>{v.label}</button>
          ))}
        </div>
        {/* Row 2: difficulty level */}
        <div style={{ display:'flex', gap:6, marginBottom:8 }}>
          {[
            { k:'foundation', icon:'🌱', label:'Foundation' },
            { k:'standard',   icon:'📘', label:'Standard'   },
            { k:'advanced',   icon:'🚀', label:'Advanced'   },
          ].map(({ k, icon, label }) => (
            <button key={k} onClick={() => setLevel(k)} style={{
              background: level===k ? (k==='foundation'?'#00E5A015':k==='standard'?'#7B9CFF15':'#FF6B3515') : 'transparent',
              border: `1px solid ${level===k ? (k==='foundation'?COLORS.green:k==='standard'?COLORS.blue:COLORS.orange) : COLORS.border}`,
              borderRadius:8, padding:'4px 11px', fontSize:11,
              fontWeight: level===k ? 700 : 500,
              color: level===k ? (k==='foundation'?COLORS.green:k==='standard'?COLORS.blue:COLORS.orange) : COLORS.muted,
              cursor:'pointer', fontFamily:'Sora,sans-serif', transition:'all 0.2s',
            }}>{icon} {label}</button>
          ))}
          <div style={{ flex:1 }}/>
          <div style={{ fontSize:10, color:COLORS.muted, alignSelf:'center', textAlign:'right', lineHeight:1.3 }}>
            {level==='foundation' ? 'First time learning' : level==='standard' ? 'Exam ready' : 'JEE / NEET level'}
          </div>
        </div>
        {/* Row 3: search */}
        <div style={{ display:'flex', gap:8 }}>
          <input style={{ ...iStyle, flex:1 }}
            placeholder="Ask anything� e.g. How does photosynthesis work?"
            value={question} onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key==='Enter' && generate()} />
          <button onClick={() => generate()} disabled={loading || !question.trim()}
            style={{ ...pBtn, width:44, height:44, padding:0, borderRadius:12, fontSize:20, flexShrink:0 }}>
            {loading ? '⏳' : '▶'}
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto' }}>

        {/* Loading � Golpo-style pipeline progress */}
        {loading && (() => {
          const STAGES = [
            { icon:'🧠', label:'Understanding', desc:'Reading your topic deeply�' },
            { icon:'🗺️', label:'Storyboard',    desc:'Planning which visuals fit each scene�' },
            { icon:'✍️', label:'Scripting',     desc:'Writing the teaching script scene by scene�' },
            { icon:'✅', label:'Ready',          desc:'Finalising your whiteboard lesson�' },
          ]
          const stageIdx = Math.max(0, pipelineStage - 1) // 1-4 ? 0-3 index
          return (
            <div style={{ textAlign:'center', padding:'50px 20px', color:COLORS.muted }}>
              <div style={{ fontSize:52, display:'inline-block', animation:'vidSpin 1.2s linear infinite', marginBottom:20 }}>🎬</div>
              {/* Stage pills */}
              <div style={{ display:'flex', gap:6, justifyContent:'center', marginBottom:22, flexWrap:'wrap' }}>
                {STAGES.map(({ icon, label }, i) => {
                  const done    = i < stageIdx
                  const active  = i === stageIdx
                  return (
                    <div key={i} style={{
                      display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                      minWidth:64, transition:'all 0.5s',
                      opacity: done || active ? 1 : 0.28,
                    }}>
                      <div style={{
                        fontSize: active ? 30 : 22,
                        transform: active ? 'scale(1.15)' : 'scale(1)',
                        transition: 'all 0.4s',
                        filter: active ? `drop-shadow(0 0 8px ${COLORS.green})` : 'none',
                      }}>{done ? '✅' : icon}</div>
                      <div style={{
                        fontSize:10, fontWeight: active ? 800 : 500,
                        color: done ? COLORS.green : active ? COLORS.yellow : COLORS.muted,
                        letterSpacing: 0.5,
                      }}>{label}</div>
                      {i < STAGES.length-1 && (
                        <div style={{ position:'absolute', display:'none' }} />
                      )}
                    </div>
                  )
                })}
              </div>
              {/* Connecting bar */}
              <div style={{ width:220, height:3, background:COLORS.border, borderRadius:4, margin:'0 auto 18px', position:'relative', overflow:'hidden' }}>
                <div style={{
                  position:'absolute', left:0, top:0, height:'100%',
                  width: `${(stageIdx / (STAGES.length-1)) * 100}%`,
                  background: `linear-gradient(90deg, ${COLORS.green}, ${COLORS.blue})`,
                  transition:'width 0.7s ease',
                  borderRadius:4,
                }} />
              </div>
              <div style={{ fontSize:13, color:COLORS.text, fontWeight:600, marginBottom:4 }}>
                {STAGES[stageIdx]?.desc}
              </div>
              <div style={{ fontSize:11, color:COLORS.muted }}>
                {level==='foundation' ? 'Simple � step-by-step � easy examples' :
                 level==='standard'   ? 'Worked example � Indian analogy � exam tip' :
                                        'Deep dive � full calculation � JEE/NEET level'}
              </div>
            </div>
          )
        })()}

        {/* Error */}
        {error && !loading && (
          <div style={{ margin:'14px', background:'#FF6B6B12', border:'1px solid #FF6B6B40', borderRadius:14, padding:'14px 16px' }}>
            <div style={{ fontSize:13, color:COLORS.red, fontWeight:700, marginBottom:4 }}>
              {error?.startsWith('⚠️ Rate limit') ? '⏱ Rate limit reached' : error?.startsWith('⚠️ No API key') ? '🔑 API key missing' : '⚠️ Generation failed'}
            </div>
            <div style={{ fontSize:12, color:COLORS.text, lineHeight:1.5 }}>{error?.startsWith('⚠️') ? error.replace(/^⚠️ /,'') : error}</div>
            <button onClick={() => setError('')} style={{ ...sBtn, marginTop:10, padding:'7px 14px', fontSize:12, width:'auto' }}>Dismiss</button>
          </div>
        )}

        {/* Suggested topics */}
        {!lesson && !loading && !error && (
          <div style={{ padding:'14px' }}>
            <div style={{ fontSize:11, color:COLORS.muted, fontWeight:700, letterSpacing:1, marginBottom:10 }}>POPULAR LESSONS</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {getStarters(getDisplayLang(profile), 'videos').map(s => (
                <button key={s.q} onClick={() => { setQuestion(s.q); generate(s.q) }} style={{
                  background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:12,
                  padding:'12px 14px', color:COLORS.text, fontSize:13, cursor:'pointer',
                  textAlign:'left', fontFamily:'Sora,sans-serif', display:'flex', alignItems:'center', gap:12,
                }}>
                  <span style={{ width:36,height:36,borderRadius:10,background:'#00E5A012',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>{s.icon}</span>
                  {s.q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* -------------------- WHITEBOARD PLAYER -------------------- */}
        {lesson && !loading && !showSummary && cs && (
          <div key={`sc-${sceneKey}`} style={{ animation:`${['sceneFade','sceneSlideL','sceneSlideR','sceneZoom'][sceneIdx%4]} 0.55s ease-out`, display:'flex', flexDirection:'column', paddingBottom:16 }}>

            {/* -- Whiteboard / Chalkboard frame -- */}
            <div style={{
              margin:'12px 14px 0',
              background: bs.surface,
              border: `2px solid ${boardStyle==='color' ? sacc+'55' : bs.border}`,
              borderRadius:18, overflow:'hidden',
              animation:'boardIn 0.4s ease-out',
              boxShadow: boardStyle==='chalk'
                ? '0 6px 32px #00000077, inset 0 1px 0 #ffffff06, inset 0 -1px 0 #00000033'
                : boardStyle==='marker'
                ? `0 3px 16px #00000018, 0 0 0 1px ${bs.border}`
                : '0 4px 20px #00000044',
            }}>

              {/* Mac-style title bar */}
              <div style={{
                background: boardStyle==='chalk' ? '#09130a' : boardStyle==='marker' ? '#e5dfd4' : COLORS.card,
                borderBottom: `1px solid ${bs.border}`,
                padding:'8px 14px', display:'flex', alignItems:'center', gap:10,
              }}>
                <div style={{ display:'flex', gap:5 }}>
                  {['#FF6B6B','#FFD166','#00E5A0'].map(c => <div key={c} style={{ width:10,height:10,borderRadius:'50%',background:c,opacity:0.75 }}/>)}
                </div>
                <div style={{ flex:1,textAlign:'center',fontSize:12,fontWeight:700,color:bs.dim,fontFamily:bs.font,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                  {lesson.title}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  {lesson.level && (
                    <span style={{ fontSize:9, fontWeight:700, color:bs.dim, fontFamily:bs.font,
                      background: lesson.level.includes('Foundation')?'#00E5A015':lesson.level.includes('Advanced')?'#FF6B3515':'#7B9CFF15',
                      border: `1px solid ${lesson.level.includes('Foundation')?'#00E5A040':lesson.level.includes('Advanced')?'#FF6B3540':'#7B9CFF40'}`,
                      borderRadius:5, padding:'2px 6px',
                    }}>{lesson.level}</span>
                  )}
                  <div style={{ fontSize:11, color:bs.dim, fontFamily:bs.font }}>{sceneIdx+1}/{lesson.scenes.length}</div>
                </div>
              </div>

              {/* Hook banner � shows the curiosity question from Stage 1 intel */}
              {lesson.hook && sceneIdx === 0 && (
                <div style={{
                  background: `linear-gradient(90deg, ${sacc}18, transparent)`,
                  borderLeft: `3px solid ${sacc}`,
                  padding:'7px 14px', fontSize:12, color:bs.text,
                  fontFamily:bs.font, fontStyle:'italic', lineHeight:1.5,
                  animation:'sceneFade 0.6s ease-out',
                }}>
                  💡 {lesson.hook}
                </div>
              )}

              {/* Board surface: lined + particles + self-drawing diagram */}
              <div style={{
                padding:'14px 14px 12px',
                position:'relative',
                backgroundImage: boardStyle!=='color'
                  ? `repeating-linear-gradient(0deg,transparent,transparent 27px,${boardStyle==='chalk'?'rgba(255,255,255,0.035)':'rgba(0,0,0,0.05)'} 27px,${boardStyle==='chalk'?'rgba(255,255,255,0.035)':'rgba(0,0,0,0.05)'} 28px)`
                  : 'none',
                display:'flex', flexDirection:'column', alignItems:'center', gap:8,
              }}>
                {/* -- Ambient floating particles (always visible) -- */}
                <Particles color={sacc} />

                {/* -- Scene number watermark -- */}
                <div style={{
                  position:'absolute', right:10, bottom:6,
                  fontSize:90, fontWeight:900, fontFamily:"'Caveat',cursive",
                  color:sacc, lineHeight:1, pointerEvents:'none', userSelect:'none',
                  animation:'sceneNumPop 0.6s ease-out forwards', opacity:0,
                }}>
                  {sceneIdx + 1}
                </div>

                {/* Scene visual emojis � subtle accent */}
                <div style={{ fontSize:18, letterSpacing:4, position:'relative', zIndex:1,
                  opacity:0, animation:'wbFade 0.6s ease-out 0.3s forwards' }}>{cs.visual}</div>

                {/* Scene title */}
                <div style={{
                  fontSize: boardStyle==='chalk'?20:17, fontWeight:700,
                  color:sacc, fontFamily:bs.font, textAlign:'center', position:'relative', zIndex:1,
                  textShadow: bs.dark ? `0 0 18px ${sacc}66` : 'none',
                  animation:'floatScene 0.55s ease-out',
                }}>{cs.title}</div>

                {/* Glow halo behind diagram */}
                <div style={{
                  position:'absolute', left:'50%', top:'50%',
                  transform:'translate(-50%,-50%)',
                  width:180, height:180, borderRadius:'50%',
                  background:`radial-gradient(circle, ${sacc}18 0%, transparent 70%)`,
                  pointerEvents:'none', zIndex:0,
                  animation:'pulseGlow 2.8s ease-in-out infinite',
                }}/>

                {/* ? THE SELF-DRAWING DIAGRAM */}
                <div style={{ width:'100%', maxWidth:310, position:'relative', zIndex:1 }} key={`diag-${sceneKey}`}>
                  <DiagramBoard type={cs.visual_type} elements={cs.draw_elements} spec={cs.diagram_spec} accent={sacc} dark={bs.dark} dur={cs?.timing?.total_sec || 12} />
                </div>

                {/* Visual type chip */}
                {cs.visual_type && (
                  <div style={{ fontSize:9, color:sacc, fontFamily:bs.font, opacity:0.8, letterSpacing:1.2,
                    textTransform:'uppercase', fontWeight:700, position:'relative', zIndex:1,
                    background:`${sacc}18`, borderRadius:8, padding:'2px 8px',
                  }}>
                    {{ avatar:'👨‍🏫 Teacher', concept:'🧠 Mindmap', steps:'📋 Steps', cycle:'🔄 Cycle',
                       timeline:'📅 Timeline', graph:'📊 Graph', tree:'🌳 Tree', venn:'⭕ Venn',
                       buildup:'➕ Equation', funnel:'🔽 Funnel', formula:'📐 Formula', comparison:'⚖️ T-Chart',
                       pulse:'? Pulse', wave:'? Wave', bar:'? Bar Chart', ball:'? Physics', spotlight:'? Spotlight',
                       network:'🕸️ Network', flowchart:'🔀 Flowchart', mathsteps:'🔢 Math Steps', dataplot:'📈 Data Plot',
                       freeform:'🎨 AI Drawing',
                     }[cs.visual_type] || cs.visual_type}
                  </div>
                )}

                {/* Got-it confetti burst */}
                {sceneAnswers[sceneIdx] === 'got' && (
                  <div style={{
                    position:'absolute', top:'30%', left:'50%', transform:'translateX(-50%)',
                    fontSize:48, pointerEvents:'none', zIndex:20,
                    animation:'confettiBurst 0.7s ease-out forwards',
                  }}>🎉</div>
                )}

                {/* Narration sound wave */}
                {playing && (
                  <div style={{ display:'flex', gap:3, alignItems:'flex-end', height:18, position:'relative', zIndex:1 }}>
                    {[10,18,12,22,8,16,11,19,14].map((h,i) => (
                      <div key={i} style={{ width:3,borderRadius:2,background:sacc,height:h,transformOrigin:'bottom',animation:`waveBar 0.62s ease-in-out infinite`,animationDelay:`${i*0.07}s` }}/>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* -- Seek bar + playback controls -- */}
            <div style={{ padding:'10px 14px 0' }}>
              <div style={{ position:'relative', height:4, background:'#ffffff10', borderRadius:2, marginBottom:10 }}>
                <div style={{
                  position:'absolute', left:0, top:0, height:'100%', borderRadius:2, background:sacc,
                  width:`${((sceneIdx/lesson.scenes.length)+(progress/100/lesson.scenes.length))*100}%`,
                  transition:'width 0.1s linear',
                }}/>
                {/* ? Comprehension dots on seek bar (Feature 4 indicator) */}
                {lesson.scenes.map((_,i) => {
                  const ans = sceneAnswers[i]
                  return (
                    <div key={i} onClick={() => goToScene(i)} style={{
                      position:'absolute', top:-5, width:14, height:14, borderRadius:'50%',
                      left:`calc(${(i/lesson.scenes.length)*100}% - 7px)`,
                      background: ans==='got'?COLORS.green : ans==='confused'?COLORS.red : i<sceneIdx?sacc : i===sceneIdx?'#fff':'#ffffff25',
                      border: i===sceneIdx ? `2px solid ${sacc}` : 'none',
                      cursor:'pointer', zIndex:1, boxSizing:'border-box', transition:'background 0.3s',
                    }}/>
                  )
                })}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <button onClick={() => goToScene(Math.max(0,sceneIdx-1))} disabled={sceneIdx===0} style={{ ...iconBtn, opacity:sceneIdx===0?0.3:1 }}>⏮</button>
                <button onClick={togglePlay} style={{ ...iconBtn, fontSize:22, color:sacc }}>{playing?'⏸':'▶'}</button>
                <button onClick={() => sceneIdx<lesson.scenes.length-1 ? goToScene(sceneIdx+1) : (stopSpeech(),setShowSummary(true))} style={iconBtn}>⏭</button>
                {/* Voice test button � speaks scene content with available voice */}
                <button onClick={() => {
                  try {
                    window.speechSynthesis?.cancel()
                    const v = voiceRef.current || pickVoice(profile.language)
                    const sceneText = (cs?.content || 'Testing audio output').slice(0, 120)
                    console.log('[Eduvy-AI TTS TEST] Voice:', v?.name, '('+v?.lang+')', 'Text:', sceneText.slice(0,40))
                    const u = new SpeechSynthesisUtterance(sceneText)
                    if (v) { u.voice = v; u.lang = v.lang.replace('_','-') }
                    u.volume = 1; u.rate = 1
                    u.onstart = () => console.log('[Eduvy-AI TTS TEST] \u25b6 started')
                    u.onend = () => console.log('[Eduvy-AI TTS TEST] \u23f9 ended')
                    u.onerror = (e) => console.error('[Eduvy-AI TTS TEST] \u274c', e?.error || e)
                    window.speechSynthesis.speak(u)
                  } catch(e) { console.error('[Eduvy-AI TTS TEST]', e) }
                }} style={{ ...iconBtn, fontSize:10, padding:'2px 6px', borderRadius:6,
                  background: voiceStatus==='ready' ? COLORS.green+'20' : voiceStatus==='error' ? COLORS.red+'20' : voiceStatus==='none' ? COLORS.yellow+'20' : COLORS.muted+'20',
                  color: voiceStatus==='ready' ? COLORS.green : voiceStatus==='error' ? COLORS.red : voiceStatus==='none' ? COLORS.yellow : COLORS.muted,
                }}>
                  {voiceStatus==='ready' ? '🔊' : voiceStatus==='error' ? '❌' : voiceStatus==='none' ? '🔇' : '⏳'}
                  <span style={{ fontSize:8, marginLeft:3 }}>{voiceStatus==='ready' ? (voiceRef.current?.name?.split(' ')[0] || 'OK') : voiceStatus}</span>
                </button>
                <div style={{ flex:1 }}/>
                <button onClick={resetLesson} style={{ ...iconBtn, fontSize:14, color:COLORS.muted }}>✕</button>
              </div>
            </div>

            {/* -- Explanation: typewriter ? karaoke highlight -- */}
            <div style={{ padding:'14px 14px 0' }}>
              {/* Timing badge � show lesson duration if available */}
              {cs.timing?.total_sec && (
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                  <div style={{ fontSize:10, color:COLORS.muted, fontWeight:600,
                    background:`${COLORS.muted}12`, borderRadius:6, padding:'2px 8px',
                    display:'inline-flex', alignItems:'center', gap:4 }}>
                    ? {cs.timing.total_sec}s scene
                  </div>
                  {cs.narration_chunks?.length > 0 && (
                    <div style={{ fontSize:10, fontWeight:600,
                      background:`${sacc}12`, borderRadius:6, padding:'2px 8px',
                      display:'inline-flex', alignItems:'center', gap:4, color:sacc }}>
                      {cs.narration_chunks.length} beats
                    </div>
                  )}
                </div>
              )}

              {/* Narration beats � each sentence on its own line with a dot indicator */}
              {/* Beat view: narration chunks with typewriter reveal */}
              {cs.narration_chunks?.length > 0 && !playing && (
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {cs.narration_chunks.map((chunk, ci) => {
                    const beatStart = cs.narration_chunks.slice(0,ci).join(' ').length
                    const visible = typeText.length > beatStart || typeText.length >= (cs.content||'').length
                    return (
                      <div key={ci} style={{
                        display:'flex', alignItems:'flex-start', gap:8,
                        opacity: visible ? 1 : 0.15, transition:'opacity 0.5s ease',
                      }}>
                        <div style={{
                          width:7, height:7, borderRadius:'50%',
                          background: visible ? sacc : COLORS.muted,
                          marginTop:6, flexShrink:0,
                          boxShadow: visible ? `0 0 6px ${sacc}60` : 'none',
                          transition:'all 0.4s',
                        }}/>
                        <p style={{ fontSize:14, color:COLORS.text, lineHeight:1.8, margin:0 }}>
                          {chunk}
                          {ci === cs.narration_chunks.length-1
                            && typeText.length < (cs.content||'').length
                            && visible
                            && <span style={{ borderRight:`2px solid ${sacc}`, marginLeft:1, animation:'blink 0.8s step-end infinite' }}/>
                          }
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
              {/* Typewriter (manual browse, no chunks) */}
              {!playing && !(cs.narration_chunks?.length > 0) && (
                <p style={{ fontSize:14, color:COLORS.text, lineHeight:1.9, margin:0 }}>
                  {typeText}
                  {typeText.length < (cs.content||'').length &&
                    <span style={{ borderRight:`2px solid ${sacc}`, marginLeft:1, animation:'blink 0.8s step-end infinite' }}/>
                  }
                </p>
              )}
              {/* Karaoke highlight during playback */}
              {playing && (
                <p style={{ fontSize:14, color:COLORS.text, lineHeight:1.9, margin:0 }}>
                  {renderHL(typeText)}
                  {typeText.length < (cs.content||'').length &&
                    <span style={{ borderRight:`2px solid ${sacc}`, marginLeft:1, animation:'blink 0.8s step-end infinite' }}/>
                  }
                </p>
              )}

              {/* ? Alt explanation (Feature 3) */}
              {sceneAnswers[sceneIdx]==='confused' && showAlt && altExps[sceneIdx] && (
                <div style={{ background:`${COLORS.yellow}10`, border:`1px solid ${COLORS.yellow}30`, borderRadius:14, padding:14, marginTop:14, animation:'sceneFade 0.3s ease-out' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:COLORS.yellow, marginBottom:8 }}>💡 Let me try a completely different approach�</div>
                  <p style={{ fontSize:13, color:COLORS.text, lineHeight:1.85, margin:0 }}>{altExps[sceneIdx]}</p>
                </div>
              )}

              {/* ? Comprehension gate (Feature 4) � appears after typewriter finishes */}
              {!playing && !sceneAnswers[sceneIdx] && typeText.length>=(cs.content||'').length && (
                <div style={{ display:'flex', gap:10, marginTop:16 }}>
                  <button
                    onClick={() => { setSceneAnswers(p=>({...p,[sceneIdx]:'confused'})); reExplain(sceneIdx,cs) }}
                    disabled={reExplaining}
                    style={{ flex:1, background:'#FF6B6B12', border:'1px solid #FF6B6B40', borderRadius:12, padding:'11px 12px', fontSize:13, fontWeight:700, color:COLORS.red, cursor:'pointer', fontFamily:'Sora,sans-serif' }}
                  >{reExplaining ? '? Thinking�' : '🤔 Confused'}</button>
                  <button
                    onClick={() => { setSceneAnswers(p=>({...p,[sceneIdx]:'got'})); advanceScene() }}
                    style={{ flex:1, background:'#00E5A012', border:'1px solid #00E5A040', borderRadius:12, padding:'11px 12px', fontSize:13, fontWeight:800, color:COLORS.green, cursor:'pointer', fontFamily:'Sora,sans-serif' }}
                  >? Got it!</button>
                </div>
              )}

              {!playing && sceneAnswers[sceneIdx]==='confused' && !reExplaining && (
                <button onClick={advanceScene} style={{ ...pBtn, marginTop:12 }}>
                  {sceneIdx<lesson.scenes.length-1 ? 'Continue ?' : 'See Summary ?'}
                </button>
              )}

              {!playing && !sceneAnswers[sceneIdx] && (
                <div style={{ fontSize:11, color:COLORS.muted, textAlign:'center', marginTop:10 }}>
                  ? Press play � auto-narrated lesson in {profile.language}
                </div>
              )}
            </div>

            {/* ? Storyboard filmstrip � Golpo-style scene scrubber */}
            <div style={{ padding:'16px 14px 0' }}>
              <div style={{ fontSize:10, color:COLORS.muted, fontWeight:700, letterSpacing:1, marginBottom:8 }}>STORYBOARD</div>
              <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
                {lesson.scenes.map((sc,i) => {
                  const acc = (SCENE_PALETTE[boardStyle] || SCENE_PALETTE.color)[i % 10]
                  const ans = sceneAnswers[i]
                  return (
                    <button key={i} onClick={() => goToScene(i)} style={{
                      background: i===sceneIdx ? acc+'22' : COLORS.card,
                      border: `1.5px solid ${ans==='confused'?COLORS.red:ans==='got'?COLORS.green:i===sceneIdx?acc:COLORS.border}`,
                      borderRadius:10, padding:'8px 6px',
                      display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                      cursor:'pointer', flexShrink:0, width:64, fontFamily:'Sora,sans-serif',
                    }}>
                      <div style={{ fontSize:18 }}>{sc.visual?.split(' ')[0]||'🎬'}</div>
                      <div style={{ fontSize:8, fontWeight:700, color:acc }}>SCENE {i+1}</div>
                      <div style={{ fontSize:7, color:COLORS.muted, textAlign:'center', width:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {sc.title?.length>9 ? sc.title.slice(0,8)+'�' : sc.title}
                      </div>
                      {ans && <div style={{ fontSize:9 }}>{ans==='got'?'✅':'🔴'}</div>}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* -------------------- SUMMARY + QUIZ -------------------- */}
        {lesson && !loading && showSummary && (
          <div style={{ padding:'14px', display:'flex', flexDirection:'column', gap:12, animation:'sceneFade 0.35s ease-out' }}>

            <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:14, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:22 }}>🎬</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:800, color:COLORS.text }}>{lesson.title}</div>
                <div style={{ fontSize:11, color:COLORS.muted }}>{lesson.subject} � {lesson.scenes.length} scenes complete</div>
              </div>
              <button onClick={resetLesson} style={{ ...iconBtn, color:COLORS.muted }}>✕</button>
            </div>

            {/* Per-scene colour bar */}
            <div style={{ display:'flex', gap:4 }}>
              {lesson.scenes.map((_,i) => (
                <div key={i} onClick={() => goToScene(i)} style={{ flex:1, height:6, borderRadius:3, cursor:'pointer', background:sceneAnswers[i]==='confused'?COLORS.red:sceneAnswers[i]==='got'?COLORS.green:'#ffffff20', transition:'background 0.3s' }}/>
              ))}
            </div>
            <div style={{ display:'flex', gap:16, fontSize:11, color:COLORS.muted }}>
              <span>✅ Got it</span><span>🤔 Confused</span><span>⬜ Auto-played</span>
            </div>

            {/* ? Clarity score (Feature 5) */}
            <div style={{ background:`${clarityCol}10`, border:`1px solid ${clarityCol}30`, borderRadius:16, padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ animation:'clarPop 0.5s ease-out' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:clarityCol, letterSpacing:1 }}>🧠 CLARITY SCORE</div>
                  <div style={{ fontSize:42, fontWeight:900, color:clarityCol, lineHeight:1 }}>{clarityPct}%</div>
                </div>
                <div style={{ flex:1, fontSize:13, color:COLORS.text, lineHeight:1.6 }}>
                  {clarityPct>=80 ? 'Excellent! You understood this lesson well.' :
                   clarityPct>=50 ? 'Good progress. A few scenes need review.' :
                   'This topic needs more practice � re-watch confused scenes.'}
                </div>
              </div>
              {confusedIdxs.length>0 && (
                <div style={{ marginTop:10 }}>
                  <div style={{ fontSize:11, color:COLORS.muted, marginBottom:6 }}>RE-WATCH THESE:</div>
                  {confusedIdxs.map(i => (
                    <button key={i} onClick={() => goToScene(i)} style={{ display:'block', width:'100%', marginBottom:6, background:'#FF6B6B10', border:'1px solid #FF6B6B30', borderRadius:10, padding:'8px 12px', fontSize:12, color:COLORS.text, cursor:'pointer', textAlign:'left', fontFamily:'Sora,sans-serif', fontWeight:600 }}>
                      ? Scene {i+1}: {lesson.scenes[i]?.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {lesson.keyPoints?.length>0 && (
              <div style={{ background:'#00E5A010', border:'1px solid #00E5A030', borderRadius:16, padding:'14px 16px' }}>
                <div style={{ fontSize:12, fontWeight:700, color:COLORS.green, marginBottom:10 }}>🎯 KEY TAKEAWAYS</div>
                {lesson.keyPoints.map((p,i) => (
                  <div key={i} style={{ fontSize:13, color:COLORS.text, padding:'5px 0 5px 12px', borderLeft:'2px solid #00E5A040', marginBottom:5, lineHeight:1.5 }}>{p}</div>
                ))}
              </div>
            )}

            {/* ? One-line takeaway (from Golpo pipeline) */}
            {lesson.oneLineTakeaway && (
              <div style={{ background:`linear-gradient(135deg, ${COLORS.green}14, ${COLORS.blue}10)`, border:`1px solid ${COLORS.green}30`, borderRadius:14, padding:'14px 16px', textAlign:'center' }}>
                <div style={{ fontSize:11, fontWeight:700, color:COLORS.green, marginBottom:6, letterSpacing:1 }}>💬 TELL A FRIEND</div>
                <div style={{ fontSize:14, color:COLORS.text, lineHeight:1.6, fontStyle:'italic', fontWeight:600 }}>"{lesson.oneLineTakeaway}"</div>
              </div>
            )}

            {lesson.formula && (
              <div style={{ background:'#7B9CFF10', border:'1px solid #7B9CFF30', borderRadius:14, padding:'12px 16px', textAlign:'center' }}>
                <div style={{ fontSize:11, fontWeight:700, color:COLORS.blue, marginBottom:6 }}>📐 KEY FORMULA</div>
                <div style={{ fontSize:22, fontWeight:900, color:COLORS.text, letterSpacing:2, fontFamily:'monospace' }}>{lesson.formula}</div>
              </div>
            )}

            {lesson.practiceQ?.q && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ fontSize:12, fontWeight:700, color:COLORS.yellow }}>📝 PRACTICE QUESTION</div>
                <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:14, padding:'14px 16px', fontSize:14, fontWeight:600, color:COLORS.text, lineHeight:1.6 }}>
                  {lesson.practiceQ.q}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {lesson.practiceQ.options?.map((opt,i) => {
                    const L=['A','B','C','D'][i]
                    let bg=COLORS.card, bdr=COLORS.border, col=COLORS.text
                    if (quizSel) {
                      if (L===lesson.practiceQ.answer)    { bg='#00E5A020';bdr=COLORS.green;col=COLORS.green }
                      else if (L===quizSel)               { bg='#FF6B6B15';bdr=COLORS.red;  col=COLORS.red   }
                      else col=COLORS.muted
                    }
                    return (
                      <button key={L} onClick={() => answerQuiz(L)} style={{ background:bg, border:`1.5px solid ${bdr}`, borderRadius:12, padding:'11px 14px', fontSize:13, fontWeight:L===lesson.practiceQ.answer&&quizSel?700:500, color:col, cursor:quizSel?'default':'pointer', fontFamily:'Sora,sans-serif', textAlign:'left', transition:'all 0.2s' }}>{opt}</button>
                    )
                  })}
                </div>
                {quizSel && (
                  <div style={{ background:quizSel===lesson.practiceQ.answer?'#00E5A010':'#FF6B6B10', border:`1px solid ${quizSel===lesson.practiceQ.answer?'#00E5A030':'#FF6B6B30'}`, borderRadius:12, padding:14 }}>
                    <div style={{ fontSize:12, fontWeight:700, marginBottom:6, color:quizSel===lesson.practiceQ.answer?COLORS.green:COLORS.red }}>
                      {quizSel===lesson.practiceQ.answer ? '? Correct!' : `? Incorrect � Answer: ${lesson.practiceQ.answer}`}
                    </div>
                    <p style={{ fontSize:13, color:COLORS.text, lineHeight:1.6, margin:0 }}>{lesson.practiceQ.explanation}</p>
                  </div>
                )}
              </div>
            )}

            {/* Rewatch filmstrip */}
            <div>
              <div style={{ fontSize:11, color:COLORS.muted, fontWeight:700, marginBottom:8 }}>REWATCH A SCENE</div>
              <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
                {lesson.scenes.map((sc,i) => {
                  const acc = (SCENE_PALETTE[boardStyle] || SCENE_PALETTE.color)[i % 10]
                  const ans = sceneAnswers[i]
                  return (
                    <button key={i} onClick={() => goToScene(i)} style={{ background:acc+'10', border:`1.5px solid ${ans==='confused'?COLORS.red:ans==='got'?COLORS.green:acc+'40'}`, borderRadius:12, padding:'10px 10px', display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer', flexShrink:0, width:70, fontFamily:'Sora,sans-serif' }}>
                      <div style={{ fontSize:22 }}>{sc.visual?.split(' ')[0]||'🎬'}</div>
                      <div style={{ fontSize:8, fontWeight:700, color:acc }}>SCENE {i+1}</div>
                      {ans && <div style={{ fontSize:9 }}>{ans==='got'?'✅':'🔴'}</div>}
                    </button>
                  )
                })}
              </div>
            </div>

            <button onClick={resetLesson} style={{ ...pBtn, marginTop:4 }}>🎬 Learn Something New</button>
          </div>
        )}
      </div>
    </div>
  )
}

const iStyle  = { background:'#101022', border:'1px solid #ffffff15', borderRadius:12, padding:'10px 14px', color:'#eeeeff', fontSize:13, fontFamily:'Sora,sans-serif', width:'100%' }
const pBtn    = { background:'linear-gradient(135deg,#00E5A0,#33cc88)', color:'#04040e', border:'none', borderRadius:12, padding:'12px 16px', fontSize:13, fontWeight:800, cursor:'pointer', width:'100%', fontFamily:'Sora,sans-serif' }
const sBtn    = { background:'transparent', border:'1px solid #ffffff15', borderRadius:12, padding:'12px 16px', fontSize:13, fontWeight:600, color:'#eeeeff', cursor:'pointer', fontFamily:'Sora,sans-serif' }
const iconBtn = { background:'transparent', border:'none', color:'#eeeeff', fontSize:18, cursor:'pointer', padding:'4px 6px', fontFamily:'Sora,sans-serif', flexShrink:0 }
