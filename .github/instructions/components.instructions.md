---
description: "Use when building React components, UI elements, buttons, navigation, SVG brain map nodes, canvas drawing, chat bubbles, or any JSX for VidyAI. Covers design tokens, touch targets, disabled state rules, inline style patterns, and responsive web/mobile layout."
applyTo: "src/**/*.{js,jsx}"
---

# React Component Rules

## Import Tokens from `shared.js` (NOT from `App.jsx`)

To avoid circular dependency errors, all tab and lab components import shared constants from `shared.js`. `App.jsx` re-exports everything so both import paths work, but **prefer `shared.js` for new components**:

```js
import { COLORS, callAI, buildSystemPrompt, parseAIObject, parseAIArray } from '../../shared.js'
```

`SettingsModal` **must** import from `'../shared.js'` (never from `'../App.jsx'`) to avoid circular dep.

## Styling — Inline Only

Never use Tailwind, CSS modules, or styled-components. All styles are inline using `COLORS` tokens:

```js
const COLORS = {
  bg: "#04040e", card: "#0b0b1c", card2: "#101022", border: "#ffffff08",
  green: "#00E5A0", yellow: "#FFD166", red: "#FF6B6B",
  blue: "#7B9CFF", orange: "#FF6B35", text: "#eeeeff", muted: "#6868a0",
};
```

## Primary Button Style

```js
{
  background: "linear-gradient(135deg, #00E5A0, #33cc88)",
  color: "#04040e",
  border: "none",
  borderRadius: 13,
  padding: "12px 18px",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  width: "100%",
  fontFamily: "Sora, sans-serif",
}
```

## Navigation Buttons — Never Disabled

```js
// ❌ WRONG — user gets trapped when loading
<button disabled={loading} onClick={() => setTab("home")}>Home</button>

// ✅ CORRECT — nav is always active
<button onClick={() => setTab("home")}>Home</button>

// ✅ OK — action buttons can be disabled
<button disabled={loading} onClick={generateNotes}>Generate</button>
```

## Font on Every Button

Every button must have `fontFamily: "Sora, sans-serif"` — either via global CSS or inline:

```css
body, input, textarea, select, button { font-family: 'Sora', sans-serif; }
button { cursor: pointer; -webkit-tap-highlight-color: rgba(0,0,0,0); }
button:disabled { opacity: 0.5; cursor: not-allowed; }
```

## SVG Touch Targets

Every clickable SVG element needs a transparent `r="18"` hit circle behind the visible circle:

```jsx
<g onClick={() => handleNodeClick(node)} style={{ cursor: 'pointer' }}>
  <circle cx={x} cy={y} r={18} fill="transparent" />{/* hit area */}
  <circle cx={x} cy={y} r={5} fill={color} />{/* visual */}
</g>
```

## Responsive Layout — Web + Mobile

The app uses **CSS classes** (defined in `index.css`) to switch between layouts:

| Class | Mobile (<768px) | Desktop (≥768px) |
|---|---|---|
| `.app-shell` | Full-width column, max 480px | Row layout, max 1200px, centered |
| `.side-nav` | `display:none` | Sticky left sidebar, 220px wide |
| `.bottom-nav` | Fixed bottom bar | `display:none` |
| `.tab-content` | `paddingBottom:72px` | `paddingBottom:32px` |

Do NOT add inline `display` overrides to `.side-nav` or `.bottom-nav` — let CSS handle the breakpoints.

## Tab Component Height

For tall tab content that needs internal scroll:

```js
// Mobile-safe height:
{ height: 'calc(100vh - 130px)' }  // subtracts header + bottom nav
// Desktop: CSS handles it, just use flex:1 + overflow:auto
```

## Canvas Draw Setup

```jsx
<canvas
  ref={canvasRef}
  width={320} height={175}
  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw}
  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
  style={{ touchAction: 'none', borderRadius: 12, background: '#101022', width: '100%', maxWidth: 320 }}
/>
```

## Chat Bubbles

```js
const userBubble = {
  alignSelf: 'flex-end',
  background: 'linear-gradient(135deg, #00E5A0, #33cc88)',
  color: '#04040e', fontWeight: 600,
  borderRadius: 14, borderBottomRightRadius: 3,
  padding: '10px 12px', maxWidth: '88%',
  fontSize: 13, lineHeight: 1.5,
}
const aiBubble = {
  alignSelf: 'flex-start',
  background: '#101022', border: '1px solid #ffffff08',
  color: '#eeeeff',
  borderRadius: 14, borderBottomLeftRadius: 3,
  padding: '10px 12px', maxWidth: '88%',
  fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
}
```

Every clickable SVG node needs an invisible hit area:

```jsx
// ❌ WRONG — r=5 is untappable on mobile
<circle cx={x} cy={y} r="5" fill={color} onClick={handler} />

// ✅ CORRECT — invisible r=12 hit circle behind visible r=5
<g onClick={handler} style={{ cursor: "pointer" }}>
  <circle cx={x} cy={y} r="12" fill="transparent" />
  <circle cx={x} cy={y} r="5"  fill={color} />
</g>
```

Brain map SVG must have `viewBox="0 0 100 100"`.

## Chat Message Bubbles

```js
// User message (right)
const userBubble = {
  alignSelf: "flex-end",
  background: "linear-gradient(135deg, #00E5A0, #33cc88)",
  color: "#04040e", fontWeight: 600,
  borderRadius: 14, borderBottomRightRadius: 3,
  padding: "10px 12px", maxWidth: "88%", fontSize: 13,
};

// AI message (left)
const aiBubble = {
  alignSelf: "flex-start",
  background: "#101022",
  border: "1px solid #ffffff08",
  color: "#eeeeff",
  borderRadius: 14, borderBottomLeftRadius: 3,
  padding: "10px 12px", maxWidth: "88%", fontSize: 13,
};
```

## Draw Canvas (TutorTab)

```jsx
<canvas
  width={320}
  height={175}
  style={{ touchAction: "none" }}
  onMouseDown={startDraw}
  onMouseMove={draw}
  onMouseUp={stopDraw}
  onMouseLeave={stopDraw}
  onTouchStart={startDraw}
  onTouchMove={draw}
  onTouchEnd={stopDraw}
/>
```

- Stroke: color `#00E5A0`, lineWidth `2.5`, lineCap `"round"`
- Always add `e.preventDefault()` in touch handlers

## State Naming

- Podcast line index **must** be `lineIdx` / `setLineIdx` — never `li` / `setLi`
- Never name functions `ai()` or `sys()` — use `callAI()` and `buildSystemPrompt()`

## Mobile

- Max app width: `480px`, centered
- Bottom nav always visible, `position: fixed`, `bottom: 0`
- All action buttons minimum `48px` height for touch targets
- Quick action grid buttons minimum `80px` height
