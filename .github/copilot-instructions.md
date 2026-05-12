# Eduvy-AI — Project Guidelines

## Project Identity
AI-powered education app for Indian students (Class 1–12). Every AI response must be in the student's chosen medium language. This is the #1 non-negotiable rule. Runs on both **web (desktop)** and **mobile** from the same codebase.

## Tech Stack
- **Framework**: React 18 + Vite
- **Language**: JavaScript (JSX) — no TypeScript
- **Styling**: Inline styles with theme tokens + CSS classes for responsive layout — no Tailwind, no CSS modules, no styled-components
- **Font**: Sora (Google Fonts)
- **AI**: Multi-provider — Google Gemini, Groq, Anthropic Claude, OpenAI GPT — all via direct browser fetch
- **State**: React `useState` / `useRef` only — no Redux, no Zustand, no Context API
- **Storage**: `localStorage` for profile + AI config persistence
- **Backend**: None — all API calls go directly to the AI provider from the browser

## Architecture

### Shared Constants & AI (in `src/shared.js`)
All constants, AI utilities, and the `callAI` function live in `src/shared.js`:
```
COLORS, BOARDS, LANGS, SUBS, LANG_RULES, UI_STRINGS, li()
AI_PROVIDERS, getAIConfig(), setAIConfig(), callAI()
buildSystemPrompt(), parseAIObject(), parseAIArray()
```
`App.jsx` re-exports all of these so tab components can import from either path.
**SettingsModal MUST import from `shared.js` directly (not App.jsx) to avoid circular deps.**

### Global State (in App.jsx)
```js
profile = { name, standard, board, language, subjects[] }
xp, streak, docCtx, docName, aiConfig
```

### Responsive Navigation
- **Mobile (< 768px)**: 5-tab bottom nav bar (`.bottom-nav` CSS class)
- **Desktop (≥ 768px)**: Left sidebar nav (`.side-nav` CSS class), max-width 1200px layout

### Screen Flow
Splash → Onboard (3 steps) → Main App Shell → 5 tabs

## Build Order
1. Project setup → 2. `src/shared.js` (all constants + callAI) → 3. `index.css` (responsive) → 4. `App.jsx` (shell + re-exports) → 5. `SettingsModal.jsx` → 6. Splash → 7. Onboard → 8. HomeTab → 9. NotebookTab → 10. TutorTab → 11. VideosTab → 12. LabsTab → 13. Labs → 14–16. Testing

## Color Tokens
```js
const COLORS = {
  bg: "#04040e", card: "#0b0b1c", card2: "#101022", border: "#ffffff08",
  green: "#00E5A0", yellow: "#FFD166", red: "#FF6B6B",
  blue: "#7B9CFF", orange: "#FF6B35", text: "#eeeeff", muted: "#6868a0",
};
```

## Critical Rules — Never Break

### 1. Language First
Every single AI response must be in the student's `profile.language`. Use `LANG_RULES[profile.language]` in every system prompt. See `.github/instructions/language-enforcement.instructions.md`.

### 2. Import from `shared.js` — Avoid Circular Deps
```js
// Tab components: import from shared.js or App.jsx (both work)
import { COLORS, callAI, buildSystemPrompt } from '../../shared.js'

// SettingsModal: MUST use shared.js only
import { COLORS, AI_PROVIDERS, callAI } from '../shared.js'

// WRONG — causes circular dep crash:
// import { COLORS } from '../App.jsx'   // in SettingsModal
```

### 3. Reserved Name Conflicts
```js
// WRONG
async function ai() {}               // 'ai' is ambiguous
const [li, setLi] = useState(0);     // 'li' conflicts with li(lang) helper

// CORRECT
async function callAI() {}
const [lineIdx, setLineIdx] = useState(0);
```

### 4. Nav Buttons Never Disabled
Navigation buttons must NEVER have `disabled` prop — user must always be able to switch tabs. Only disable action/submit buttons.

### 5. All Buttons Need fontFamily
Set globally in CSS: `button { font-family: 'Sora', sans-serif; }`

### 6. SVG Touch Targets
Every clickable SVG element needs a transparent `r="18"` hit circle behind the visible `r="5"` circle.

### 7. JSON from AI — Always Parse Safely
Never call `JSON.parse(response)` directly. Always use `parseAIObject()` / `parseAIArray()` from `shared.js`. See `.github/instructions/json-parsing.instructions.md`.

### 8. Rate Limits — Silent Retry
Never show raw API errors to students. Auto-retry 3× with backoff. See `.github/instructions/ai-calls.instructions.md`.

### 9. Responsive CSS Classes (do not override with inline styles)
- `.bottom-nav` — mobile bottom nav (CSS hides on desktop)
- `.side-nav` — desktop sidebar nav (CSS hides on mobile)
- `.tab-content` — main content area with correct padding per breakpoint
- `.app-shell` — outer wrapper that switches column→row at 768px

## File Structure
```
src/
  shared.js        # ALL constants + callAI + parsers (no React, no JSX)
  App.jsx          # Shell + re-exports from shared.js
  main.jsx
  index.css        # Global styles, Sora font, responsive breakpoints
  components/
    SettingsModal.jsx   # imports from ../shared.js
    Splash.jsx
    Onboard.jsx
    tabs/
      HomeTab.jsx
      NotebookTab.jsx   # Full NotebookLM clone (Sources / Chat / Studio)
      TutorTab.jsx
      VideosTab.jsx
      LabsTab.jsx
    labs/
      PodcastLab.jsx
      QuizLab.jsx
      EssayLab.jsx
      MentalLab.jsx
public/
  manifest.json   # PWA manifest
```
