# Eduvy-AI — Project Guidelines

## Project Identity
AI-powered education app for Indian students (Class 1–12). Every AI response must be in the student's chosen medium language. This is the #1 non-negotiable rule. Runs on both **web (desktop)** and **mobile** from the same codebase.

## Tech Stack
- **Framework**: React 18 + Vite
- **Language**: JavaScript (JSX) — no TypeScript
- **Styling**: Inline styles with theme tokens + CSS classes for responsive layout — no Tailwind, no CSS modules, no styled-components
- **Font**: Sora (Google Fonts)
- **AI**: Multi-provider — Google Gemini, Groq, Anthropic Claude, OpenAI GPT — **all via backend server-side proxy at `/api/ai/chat`** — never direct from browser
- **State**: React `useState` / `useRef` only — no Redux, no Zustand, no Context API
- **Storage**: `localStorage` for auth token (`eduvyai_token`) + profile cache
- **Backend**: FastAPI (Python) + PostgreSQL — all AI calls, auth, and data go through the backend

## Architecture

### Backend API (`src/api.js`)
All data and AI calls go through `src/api.js` helpers which call the FastAPI backend. Never call AI providers directly from components.
```js
// Pattern for every API call:
import { apiFoo } from '../../api.js'
const result = await apiFoo(params)
```
Auth token is read from `localStorage.getItem('eduvyai_token')` and sent as `Authorization: Bearer <token>`.

### Shared Constants & AI (in `src/shared.js`)
All constants and the `callAI` function live in `src/shared.js`:
```
COLORS, BOARDS, LANGS, SUBS, LANG_RULES, UI_STRINGS, li()
AI_PROVIDERS, callAI()
buildSystemPrompt(), parseAIObject(), parseAIArray()
```
`App.jsx` re-exports all of these so tab components can import from either path.
**SettingsModal MUST import from `shared.js` directly (not App.jsx) to avoid circular deps.**
**SettingsModal and ParentDashboard can import from `../api.js`.**

### Global State (in App.jsx)
```js
profile = { name, standard, board, language, subjects[], school, is_drishti }
xp, streak, docCtx, docName
a11y  // { screenReaderMode, ttsEnabled, ttsSpeed, highContrast, voiceInput, fontScale }
```
Profile is fetched from backend on login and cached to `localStorage`.
`a11y` is persisted to `localStorage` under `eduvyai_a11y`. If `profile.is_drishti` is true, `screenReaderMode` and `ttsEnabled` are force-enabled on login.

### Drishti Accessibility Layer (`src/shared.js`)
```js
DEFAULT_A11Y          // default values for all a11y settings
LANG_TO_SPEECH_CODE   // maps profile.language → BCP-47 speech code (e.g. Hindi → 'hi-IN')
speakText(text, langCode, speed)   // speaks via window.speechSynthesis; cancels current first
stopSpeaking()                     // speechSynthesis.cancel()
isSpeaking()                       // speechSynthesis?.speaking ?? false
startVoiceInput(langCode)          // returns Promise<string> via SpeechRecognition
```
All TTS/STT functions check for browser support before calling — never throw if Web Speech API is absent.

### Helper Portal (`/helper/:token`)
- Public route — no student JWT required
- Uses `X-Helper-Token: <token>` header for all API calls
- `HelperPortal.jsx` defines its own `COLORS` const locally (same pattern as `ParentDashboard.jsx`) — do NOT import from `App.jsx`
- Helpers can only view/message their own assigned students (enforced server-side)

### Plans
```js
free:    { tabs: ['home','tutor','bhool','muqabla'], labs: [], aiCallsPerDay: 10 }
basic:   { tabs: ['home','tutor','videos','notebook','bhool','muqabla'], labs: [], aiCallsPerDay: 50 }
pro:     { tabs: ['home','tutor','videos','notebook','learntv','labs','sathi','bhool','muqabla'], labs: ['quiz','examiner','samjhao'], aiCallsPerDay: 200 }
premium: { tabs: ['home','tutor','videos','notebook','learntv','labs','discover','sathi','bhool','muqabla'], labs: ['quiz','examiner','samjhao','podcast','essay','mental'], aiCallsPerDay: Infinity }
```

### Responsive Navigation
- **Mobile (< 768px)**: Bottom nav bar (`.bottom-nav` CSS class)
- **Desktop (≥ 768px)**: Left sidebar nav (`.side-nav` CSS class), max-width 1200px layout

### Screen Flow
Splash → Auth (login/register) → Onboard (3 steps, first time) → Main App Shell → tabs

## Build Order
1. Project setup → 2. `src/shared.js` (constants) → 3. `src/api.js` (all API helpers) → 4. `index.css` (responsive) → 5. `App.jsx` (shell + re-exports) → 6. `SettingsModal.jsx` → 7. Splash → 8. Auth → 9. Onboard → 10. HomeTab → 11. NotebookTab → 12. TutorTab → 13. VideosTab → 14. LabsTab → 15. Labs → 16. SathiTab → 17. BhoolBazaarTab → 18. MuqablaTab → 19. ParentDashboard → 20. Testing

## Color Tokens
```js
const COLORS = {
  bg: "#04040e", card: "#0b0b1c", card2: "#101022", border: "#ffffff08",
  green: "#00E5A0", yellow: "#FFD166", red: "#FF6B6B",
  blue: "#7B9CFF", orange: "#FF6B35", text: "#eeeeff", muted: "#6868a0",
};
```

## Database Tables (PostgreSQL)
Core: `users`, `study_sessions`, `quiz_stats`, `mastery_scores`, `notebook_sources`, `notebook_messages`
  - `users` extra cols: `is_drishti BOOLEAN DEFAULT FALSE`, `accessibility_settings TEXT DEFAULT '{}'`
Curriculum: `boards`, `standards`, `mediums`, `curriculum`, `admin_users`
Squads: `squads`, `squad_members`, `squad_messages`, `squad_challenges`
  - `squads` extra cols: `standard`, `medium`, `streak`, `last_active_date`
  - `squad_challenges` extra cols: `ai_verdict`, `ai_note` (from Daily Concept AI grading)
  - `squad_doubts` — doubt posts per squad (status: open | answered)
  - `squad_doubt_answers` — answers with `upvotes`, `ai_verdict`, `ai_note`
  - `squad_doubt_upvotes` — (answer_id, user_id) composite PK prevents double-votes
Bhool Bazaar: `bhool_cards`, `bhool_collections`, `bhool_reactions`
Muqabla: `muqabla_battles`
Parent: `parent_pins`
Drishti: `drishti_helpers`, `helper_student_map`, `helper_notes`
  - `drishti_helpers`: id, name, email, helper_type, helper_token (UUID), is_active
  - `helper_student_map`: helper_id, student_id (many-to-many)
  - `helper_notes`: id, helper_id, student_id, message, is_read, created_at
All tables created idempotently in `backend/database.py`.

## Critical Rules — Never Break

### 1. Language First
Every single AI response must be in the student's `profile.language`. Use `LANG_RULES[profile.language]` in every system prompt. See `.github/instructions/language-enforcement.instructions.md`.

### 2. AI via Backend Only
Never call Gemini/Groq/Claude/OpenAI directly from browser components. Always use `callAI()` from `shared.js` which calls `/api/ai/chat`. API keys live in `backend/.env` only.

### 3. Import Rules — Avoid Circular Deps
```js
// Tab components: import from shared.js or App.jsx (both work)
import { COLORS, callAI, buildSystemPrompt } from '../../shared.js'

// SettingsModal: MUST use shared.js only (NOT App.jsx)
import { COLORS, AI_PROVIDERS, DEFAULT_A11Y } from '../shared.js'
import { apiGetParentPin, apiCreateParentPin } from '../api.js'

// ParentDashboard: public page — define its own COLORS const locally, do not import from App.jsx
const C = { bg: "#04040e", ... }

// HelperPortal: public page — same rule as ParentDashboard, define COLORS locally
const COLORS = { bg: "#04040e", ... }

// WRONG — causes circular dep crash:
// import { COLORS } from '../App.jsx'   // in SettingsModal or HelperPortal
```

### 4. Reserved Name Conflicts
```js
// WRONG
async function ai() {}               // 'ai' is ambiguous
const [li, setLi] = useState(0);     // 'li' conflicts with li(lang) helper

// CORRECT
async function runAI() {}
const [lineIdx, setLineIdx] = useState(0);
```

### 5. Nav Buttons Never Disabled
Navigation buttons must NEVER have `disabled` prop — user must always be able to switch tabs. Only disable action/submit buttons.

### 6. All Buttons Need fontFamily
Set globally in CSS: `button { font-family: 'Sora', sans-serif; }`

### 7. SVG Touch Targets
Every clickable SVG element needs a transparent `r="18"` hit circle behind the visible `r="5"` circle.

### 8. JSON from AI — Always Parse Safely
Never call `JSON.parse(response)` directly. Always use `parseAIObject()` / `parseAIArray()` from `shared.js`. See `.github/instructions/json-parsing.instructions.md`.

### 9. Rate Limits — Silent Retry
Never show raw API errors to students. Auto-retry 3× with backoff. See `.github/instructions/ai-calls.instructions.md`.

### 10. Responsive CSS Classes (do not override with inline styles)
- `.bottom-nav` — mobile bottom nav (CSS hides on desktop)
- `.side-nav` — desktop sidebar nav (CSS hides on mobile)
- `.tab-content` — main content area with correct padding per breakpoint
- `.app-shell` — outer wrapper that switches column→row at 768px

### 11. school Column
`users` table has a `school TEXT DEFAULT ''` column added via DO $$ migration. Always include `school` in profile updates via `PUT /api/profile`.

### 12. AI Grading — Award Dynamic XP
When AI grades a student answer (Daily Concept, Doubts Board), use three tiers:
```
correct   → 30 XP  (full understanding)
partial   → 15 XP  (some gaps)
incorrect →  5 XP  (participation credit — never 0, never punish trying)
```
AI call is best-effort — always wrap in try/catch and fall back to a default XP if AI is unavailable. Never block submission on AI failure.

### 13. Per-Day Limits (Doubts Board)
Doubts posting is rate-limited by plan on the backend (`DOUBT_DAILY_LIMITS` in `squads.py`):
```
free: 2/day · basic: 5/day · pro: 15/day · premium: unlimited
```
Frontend reads `/squads/{id}/doubts/quota` and shows remaining count. Backend returns HTTP 429 when limit exceeded.

### 14. Brand Names — Do Not Translate Nav Labels
`Sathi`, `Bhool`, `Muqabla` are product brand names (like "Reels" or "Shorts"). Do NOT translate them into tab labels for different languages. Translate all content *inside* each tab via `LANG_RULES`, not the tab names themselves.

### 15. Drishti — TTS/STT Must Never Block Render
All `speakText()` and `startVoiceInput()` calls must be fire-and-forget or wrapped in try/catch. Never `await` TTS inside render or event handlers in a way that could throw. If `window.speechSynthesis` is absent (SSR, older browser), the function silently returns — never shows an error to the student.

### 16. Drishti — a11y Prop Passing
Every tab and lab component that uses TTS/voice must accept an `a11y` prop. The `App.jsx` shell passes `a11y` and `setA11y` via `sharedProps`. Never read `localStorage` directly for a11y inside a tab — always use the prop.
```js
// CORRECT — tab receives a11y from sharedProps
function TutorTab({ profile, xp, a11y, ... }) { ... }

// WRONG — reading storage directly inside a tab
const a11y = JSON.parse(localStorage.getItem('eduvyai_a11y'))
```

### 17. Helper Token — One-Time Visibility
`helper_token` (UUID) is returned **only once** at creation time (`POST /api/admin/drishti-helpers`). Subsequent GET requests return `token_preview` (first 8 chars + `...`) only. Never re-expose the full token after creation. The admin UI must copy the full portal URL at creation time.

### 18. Drishti CSS Classes — Do Not Override with Inline Styles
- `.tts-btn` — read-aloud button (🔊)
- `.mic-btn` / `.mic-btn.recording` — voice input button with pulse animation
- `.drishti-note-banner` — helper note banner with fadeInDown animation
- `.sr-only` — visually hidden text for screen readers
These follow the same rule as `.bottom-nav` / `.side-nav` — do not override with inline styles.

## File Structure
```
src/
  shared.js              # ALL constants + callAI + parsers (no React, no JSX)
  api.js                 # All backend fetch helpers (auth, AI, bhool, muqabla, parent, etc.)
  App.jsx                # Shell + re-exports from shared.js + all routes
  main.jsx
  index.css              # Global styles, Sora font, responsive breakpoints
  components/
    AuthScreen.jsx       # Student login / register
    LandingPage.jsx      # Public landing page with pricing
    AdminPanel.jsx       # Superadmin CRUD panel + Students tab + Drishti Helpers tab
    ParentDashboard.jsx  # Public parent view at /parent/:pin (no auth)
    HelperPortal.jsx     # Public Drishti helper portal at /helper/:token (no auth) — defines COLORS locally
    SettingsModal.jsx    # imports from ../shared.js and ../api.js — has Drishti accessibility tab
    Splash.jsx
    Onboard.jsx
    tabs/
      HomeTab.jsx
      NotebookTab.jsx    # Full NotebookLM clone (Sources / Chat / Studio)
      TutorTab.jsx
      VideosTab.jsx
      LearnTVTab.jsx
      LabsTab.jsx
      DiscoverTab.jsx
      SathiTab.jsx       # Sathi Study Squads — 3 sub-tabs: Chat | Doubts Board | Daily Concept
      BhoolBazaarTab.jsx # Mistake Marketplace (4 sub-tabs)
      MuqablaTab.jsx     # Battle Arena (Arena / Rankings / History)
    labs/
      PodcastLab.jsx
      QuizLab.jsx
      EssayLab.jsx
      MentalLab.jsx
      ExaminerLab.jsx
      SamjhaoLab.jsx

backend/
  main.py                # FastAPI app + router registration + security middleware
  database.py            # PostgreSQL — all table creation (idempotent)
  requirements.txt
  .env                   # API keys — NEVER commit
  seed_curriculum.py     # One-time seed for boards/standards/mediums/curriculum
  create_admin.py        # One-time create first superadmin
  services/
    ai_service.py        # All AI provider calls (server-side only)
  routers/
    auth.py              # Register / login / me
    profile.py           # Student profile CRUD (includes school field)
    ai.py                # AI proxy + quota enforcement per plan
    curriculum.py        # Public curriculum endpoints (onboarding dropdowns)
    admin.py             # Admin auth + full CRUD + bulk import + student CRUD + Drishti helper CRUD
    drishti.py           # Helper portal API — auth via X-Helper-Token header (NOT Bearer JWT)
    notebook.py          # Notebook sources + chat
    quiz_stats.py        # Quiz results + history
    mastery.py           # Subject mastery scores
    sessions.py          # Study sessions
    squads.py            # Sathi Study Squads (match by standard+medium, chat, challenges, doubts, daily concept, streak)
    bhool.py             # Bhool Bazaar (cards, marketplace, collect, react)
    muqabla.py           # Muqabla Battles (challenge, join, answer, leaderboard)
    parent.py            # Parent Dashboard PIN (generate, view, revoke)

public/
  manifest.json          # PWA manifest
```

