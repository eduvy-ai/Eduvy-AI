# Drishti — Vision-Accessible Learning Plan (Eduvy-AI)

**Project:** Eduvy-AI  
**Feature:** Drishti Mode — Accessible Learning for Visually Impaired Students (Class 1–12, India)  
**Date:** May 18, 2026  
**Status:** Planning → Ready to Implement

---

## Table of Contents

1. [Goal](#1-goal)
2. [Architecture Overview](#2-architecture-overview)
3. [Phase 1 — Database Schema](#3-phase-1--database-schema)
4. [Phase 2 — Backend API](#4-phase-2--backend-api)
5. [Phase 3 — Admin Panel (Frontend)](#5-phase-3--admin-panel-frontend)
6. [Phase 4 — Accessibility Core Layer](#6-phase-4--accessibility-core-layer)
7. [Phase 5 — Per-Tab Audio Features](#7-phase-5--per-tab-audio-features)
8. [Phase 6 — Helper Portal](#8-phase-6--helper-portal)
9. [File Change Summary](#9-file-change-summary)
10. [Build Order](#10-build-order)
11. [Rules & Constraints](#11-rules--constraints)

---

## 1. Goal

Build two things together as one integrated system:

| # | What | Who Benefits |
|---|---|---|
| 1 | **Accessibility Layer** | Drishti learners use the full app via audio + voice + keyboard — no eyes needed |
| 2 | **Admin-Managed Drishti Accounts** | SuperAdmin creates Drishti learner accounts and assigns a Helper (teacher / volunteer) to monitor each one |

### What "Drishti Mode" means in this app
- Every AI response is spoken aloud in the student's language (Hindi, Tamil, Gujarati, etc.)
- Student speaks questions instead of typing
- Full keyboard navigation — no mouse required
- Audio quiz, audio flashcards, audio tutor
- Helper Portal — an assigned teacher/volunteer sees the student's progress and can send encouragement notes

---

## 2. Architecture Overview

```
SuperAdmin (AdminPanel at /admin)
  ├── CREATE Drishti learner account
  │     └── Sets: is_drishti=true, accessibility_settings, temp password
  ├── CREATE Helper (teacher / volunteer / parent)
  │     └── System generates helper_token (UUID) → portal link /helper/{token}
  └── ASSIGN Helper → Drishti Learner (many helpers : many students)

Helper Portal (at /helper/:token)
  ├── No login needed — token in URL is the key
  ├── Read-only view of assigned students
  │     └── Name, XP, Streak, Last Active, Topics Today
  └── Send Encouragement Note → appears on student's HomeTab

Drishti Learner (App at /app/:tab)
  ├── On login: profile.is_drishti === true → auto-enable accessibility mode
  ├── TTS speaks every AI response in profile.language
  ├── Mic button available on all input areas
  ├── Full keyboard navigation (Tab / Enter / Arrow keys)
  └── Helper note banner on HomeTab (spoken aloud if TTS on)
```

---

## 3. Phase 1 — Database Schema

**File to modify:** `backend/database.py`

### 3A. Add columns to existing `users` table

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_drishti BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accessibility_settings TEXT DEFAULT '{}';
-- accessibility_settings JSON keys:
--   screenReaderMode: bool
--   ttsEnabled:       bool
--   ttsSpeed:         float  (0.5=slow, 1.0=normal, 1.5=fast)
--   highContrast:     bool
--   voiceInput:       bool
--   fontScale:        float  (1.0=normal, 1.25=large, 1.5=xlarge)
```

### 3B. New `drishti_helpers` table

```sql
CREATE TABLE IF NOT EXISTS drishti_helpers (
    id              SERIAL PRIMARY KEY,
    helper_name     TEXT NOT NULL,
    helper_email    TEXT UNIQUE NOT NULL,
    helper_type     TEXT DEFAULT 'teacher',      -- teacher | volunteer | parent
    helper_token    TEXT UNIQUE NOT NULL,         -- UUID, used as portal login key
    assigned_by     INT  REFERENCES admin_users(id) ON DELETE SET NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    notes           TEXT DEFAULT '',              -- admin notes about this helper
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3C. New `helper_student_map` table

```sql
CREATE TABLE IF NOT EXISTS helper_student_map (
    helper_id      INT  NOT NULL REFERENCES drishti_helpers(id) ON DELETE CASCADE,
    student_id     TEXT NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
    assigned_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (helper_id, student_id)
);
```

### 3D. New `helper_notes` table

```sql
CREATE TABLE IF NOT EXISTS helper_notes (
    id          SERIAL PRIMARY KEY,
    helper_id   INT  NOT NULL REFERENCES drishti_helpers(id)  ON DELETE CASCADE,
    student_id  TEXT NOT NULL REFERENCES users(id)          ON DELETE CASCADE,
    message     TEXT NOT NULL,
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3E. Migration Strategy (idempotent — safe to run multiple times)

All column additions use `DO $$ IF NOT EXISTS` blocks.  
All table creations use `CREATE TABLE IF NOT EXISTS`.  
No data is dropped or truncated.

---

## 4. Phase 2 — Backend API

### 4A. Extend `backend/routers/admin.py`

Add the following endpoints, all protected by `get_admin_user` dependency:

#### Student Management

| Method | Path | Body / Params | Response |
|--------|------|---------------|----------|
| `GET` | `/api/admin/students` | `?search=` `?is_drishti=` | Array of student objects |
| `POST` | `/api/admin/students` | `StudentCreate` model | Created student |
| `PUT` | `/api/admin/students/{id}` | `StudentUpdate` model | Updated student |
| `DELETE` | `/api/admin/students/{id}` | — | `{ ok: true }` |

**`StudentCreate` Pydantic model:**
```python
class StudentCreate(BaseModel):
    name: str
    email: str
    password: str           # hashed before storage
    standard: str = "Class 10"
    board: str = "CBSE"
    language: str = "English"
    subjects: list[str] = []
    mobile: str = ""
    parent_mobile: str = ""
    plan: str = "free"
    is_drishti: bool = False
    accessibility_settings: dict = {}
```

**`StudentUpdate` Pydantic model:**
```python
class StudentUpdate(BaseModel):
    name: Optional[str] = None
    standard: Optional[str] = None
    board: Optional[str] = None
    language: Optional[str] = None
    plan: Optional[str] = None
    is_drishti: Optional[bool] = None
    accessibility_settings: Optional[dict] = None
    is_active: Optional[bool] = None
```

#### Helper Management

| Method | Path | Body | Response |
|--------|------|------|----------|
| `GET` | `/api/admin/helpers` | — | Array of helpers with assigned student counts |
| `POST` | `/api/admin/helpers` | `HelperCreate` model | Created helper + portal URL |
| `PUT` | `/api/admin/helpers/{id}` | `HelperUpdate` model | Updated helper |
| `DELETE` | `/api/admin/helpers/{id}` | — | `{ ok: true }` |
| `GET` | `/api/admin/helpers/{id}/students` | — | Students assigned to this helper |
| `POST` | `/api/admin/helpers/{id}/assign/{student_id}` | — | `{ ok: true }` |
| `DELETE` | `/api/admin/helpers/{id}/assign/{student_id}` | — | `{ ok: true }` |

**`HelperCreate` Pydantic model:**
```python
class HelperCreate(BaseModel):
    helper_name: str
    helper_email: str
    helper_type: str = "teacher"   # teacher | volunteer | parent
    notes: str = ""
```
> `helper_token` is auto-generated as `str(uuid4())` — never supplied by the request.

### 4B. New `backend/routers/drishti.py`

Helper portal API — authenticated via `X-Helper-Token` header (UUID).

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/helper/me` | Verify token, return helper info |
| `GET` | `/api/helper/students` | My assigned students with XP, streak, last_active, topics today |
| `POST` | `/api/helper/notes` | Send encouragement note to a student |
| `GET` | `/api/helper/notes/{student_id}` | Note history for a student |

**Authentication pattern:**
```python
def get_helper(token: str = Header(alias="X-Helper-Token")):
    # Look up drishti_helpers WHERE helper_token = token AND is_active = true
    # Raise HTTP 401 if not found
```

### 4C. Extend `backend/routers/profile.py`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/profile/{id}/helper-notes` | Student reads their unread notes (auth required) |
| `POST` | `/api/profile/{id}/helper-notes/read` | Mark all notes as read |

### 4D. Register new router in `backend/main.py`

```python
from routers import drishti
app.include_router(drishti.router, prefix="/api")
```

---

## 5. Phase 3 — Admin Panel (Frontend)

**File to modify:** `frontend/src/components/AdminPanel.jsx`

### 5A. Add "Students" tab to the existing tab bar

The AdminPanel already has tabs: Boards | Standards | Mediums | Curriculum.  
Add two more: **Students** | **Helpers**

### 5B. Students Tab UI

```
┌─────────────────────────────────────────────────────────┐
│  Students                              [+ Create Student] │
│  Search: [__________________________]  Filter: [All ▾]   │
├─────┬────────────┬──────────┬──────┬──────┬────────────┤
│ Name│ Standard   │ Plan     │Drishti│Helper│ Actions   │
├─────┼────────────┼──────────┼──────┼──────┼────────────┤
│ Ravi│ Class 8    │ Pro      │  ●   │Sunita│ Edit | ✕  │
│ Asha│ Class 10   │ Free     │      │  —   │ Edit | ✕  │
└─────┴────────────┴──────────┴──────┴──────┴────────────┘
```

**Create / Edit Student Modal fields:**
- Name (required)
- Email (required, unique)
- Temporary Password (required on create, optional on edit)
- Standard (dropdown: Class 1–12)
- Board (dropdown: CBSE, ICSE, etc.)
- Language (dropdown: all 11 languages)
- Plan (dropdown: free / basic / pro / premium)
- **"Enable Drishti Mode"** toggle (checkbox)
  - When ON → shows Accessibility Settings section:
    - TTS Speed: Slow (0.5) / Normal (1.0) / Fast (1.5) — radio buttons
    - High Contrast: toggle
    - Voice Input: toggle (default ON for Drishti learners)
    - Font Size: Normal / Large / Extra Large — radio buttons
- Assign Helper: dropdown (shows all active helpers) — only visible for Drishti learners

### 5C. Helpers Tab UI

```
┌───────────────────────────────────────────────────────┐
│  Helpers                               [+ Create Helper]│
├──────────┬────────┬───────────┬──────────┬────────────┤
│ Name     │ Type   │ Students  │ Portal   │ Actions    │
├──────────┼────────┼───────────┼──────────┼────────────┤
│ Sunita P │Teacher │     3     │ Copy URL │ Edit | ✕  │
│ Ramesh V │Volunter│     1     │ Copy URL │ Edit | ✕  │
└──────────┴────────┴───────────┴──────────┴────────────┘
```

**Create Helper Modal fields:**
- Name (required)
- Email (required)
- Type: Teacher / Volunteer / Parent (radio buttons)
- Notes (optional — admin notes about this helper)

> On create: system generates `helper_token` (UUID).  
> Portal URL shown after creation: `https://your-domain/helper/{token}`  
> Copy-to-clipboard button provided.

**Assign Students sub-panel** (shown when editing a helper):
- Shows all Drishti learners
- Checkboxes to assign/unassign
- Saves on "Update Helper" button click

---

## 6. Phase 4 — Accessibility Core Layer

### 6A. `frontend/src/shared.js` — New exports

```js
// ─── Accessibility defaults ────────────────────────────────
export const DEFAULT_A11Y = {
  screenReaderMode: false,
  ttsEnabled:       false,
  ttsSpeed:         1.0,
  highContrast:     false,
  voiceInput:       false,
  fontScale:        1.0,
}

// Maps profile.language → BCP-47 code for Web Speech API
export const LANG_TO_SPEECH_CODE = {
  English:  'en-IN',
  Hindi:    'hi-IN',
  Gujarati: 'gu-IN',
  Tamil:    'ta-IN',
  Telugu:   'te-IN',
  Kannada:  'kn-IN',
  Marathi:  'mr-IN',
  Bengali:  'bn-IN',
  Punjabi:  'pa-IN',
  Odia:     'or-IN',
  Urdu:     'ur-PK',
}

// Speaks text using browser SpeechSynthesis
export function speakText(text, langCode = 'en-IN', speed = 1.0) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang  = langCode
  utt.rate  = speed
  window.speechSynthesis.speak(utt)
}

// Stops any ongoing speech
export function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel()
}

// Returns true if currently speaking
export function isSpeaking() {
  return window.speechSynthesis?.speaking ?? false
}

// Voice input — returns Promise<string> with transcript
// Rejects if browser doesn't support or user denies mic
export function startVoiceInput(langCode = 'en-IN') {
  return new Promise((resolve, reject) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { reject(new Error('Voice input not supported in this browser')); return }
    const rec = new SR()
    rec.lang        = langCode
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = e => resolve(e.results[0][0].transcript)
    rec.onerror  = e => reject(new Error(e.error))
    rec.start()
  })
}
```

### 6B. `frontend/src/App.jsx` — Global accessibility state

```js
// New state in main App
const [a11y, setA11y] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem('eduvyai_a11y') || 'null') || DEFAULT_A11Y
  } catch { return DEFAULT_A11Y }
})

// On profile load: if is_drishti, merge accessibility_settings into a11y
useEffect(() => {
  if (profile?.is_drishti && profile?.accessibility_settings) {
    try {
      const saved = JSON.parse(profile.accessibility_settings)
      setA11y(prev => ({ ...prev, ...saved }))
    } catch {}
  }
}, [profile?.id])

// Persist a11y to localStorage on change
useEffect(() => {
  localStorage.setItem('eduvyai_a11y', JSON.stringify(a11y))
  // Apply body classes
  document.body.classList.toggle('high-contrast', a11y.highContrast)
  document.body.classList.toggle('font-large', a11y.fontScale === 1.25)
  document.body.classList.toggle('font-xlarge', a11y.fontScale === 1.5)
}, [a11y])

// Pass a11y and setA11y in sharedProps to every tab
const sharedProps = { ..., a11y, setA11y }
```

### 6C. `frontend/src/components/SettingsModal.jsx` — Accessibility Tab

Add a new tab **"Accessibility"** to the existing tab bar (AI | Profile | Accessibility).

Tab contents:
- **Master Toggle:** "Enable Drishti Mode (visually impaired learner)" — sets all accessibility options at once
- Text-to-Speech toggle + speed radio (Slow / Normal / Fast)
- Voice Input toggle (microphone button on all input fields)
- High Contrast Mode toggle
- Font Size: Normal / Large / Extra Large
- Save button — calls `apiUpdateProfile` with new `accessibility_settings` JSON

### 6D. `frontend/src/index.css` — Accessibility CSS

```css
/* ── Keyboard focus ring (visible for all keyboard users) ── */
*:focus-visible {
  outline: 3px solid #00E5A0;
  outline-offset: 3px;
  border-radius: 4px;
}

/* ── High contrast mode ──────────────────────────────────── */
body.high-contrast {
  --bg: #000000;
  --card: #111111;
  --card2: #1a1a1a;
  --text: #ffffff;
  --border: rgba(255,255,255,0.3);
  background: #000 !important;
}
body.high-contrast .tab-content,
body.high-contrast .app-shell {
  background: #000 !important;
}

/* ── Font scaling ────────────────────────────────────────── */
body.font-large  { font-size: 16px; }
body.font-xlarge { font-size: 20px; }

/* ── Screen reader only (visually hidden but accessible) ─── */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ── TTS speak button ────────────────────────────────────── */
.tts-btn {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 8px;
  padding: 5px 10px;
  color: #6868a0;
  font-size: 12px;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
}
.tts-btn:hover { border-color: #00E5A0; color: #00E5A0; }

/* ── Mic button ──────────────────────────────────────────── */
.mic-btn {
  background: transparent;
  border: 2px solid #7B9CFF;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #7B9CFF;
  font-size: 18px;
  transition: background 0.2s;
}
.mic-btn.recording {
  background: rgba(255, 107, 107, 0.2);
  border-color: #FF6B6B;
  color: #FF6B6B;
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,107,107,0.4); }
  50%       { box-shadow: 0 0 0 8px rgba(255,107,107,0);  }
}
```

### 6E. `frontend/src/api.js` — New helper note API calls

```js
// Get unread helper notes for the logged-in student
export async function apiGetHelperNotes(userId) {
  const res = await fetch(`/api/profile/${userId}/helper-notes`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) return []
  return res.json()
}

// Mark all helper notes as read
export async function apiMarkHelperNotesRead(userId) {
  const res = await fetch(`/api/profile/${userId}/helper-notes/read`, {
    method: 'POST',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
```

---

## 7. Phase 5 — Per-Tab Audio Features

### 7A. TutorTab — Full Voice Mode

**File:** `frontend/src/components/tabs/TutorTab.jsx`

Changes:
- Add **"Voice Mode"** toggle button (🎧 icon) in the chat header area
- When `a11y.ttsEnabled` or voice mode ON:
  - After each AI response: `speakText(response, LANG_TO_SPEECH_CODE[profile.language], a11y.ttsSpeed)`
  - A "Stop Speaking" button appears while TTS is active
- Microphone button appears next to the text input when `a11y.voiceInput` is ON
  - On click: `startVoiceInput(langCode)` → fills input → auto-submits
  - Shows recording animation (red pulsing circle)
- AI system prompt addition (appended to every TutorTab prompt):
  ```
  ACCESSIBILITY NOTE: Write all math as spoken words.
  Never use symbols like x², ≤, ∞, √ alone.
  Always write: "x squared", "less than or equal to", "infinity", "square root of".
  Keep explanations in short sentences. Each sentence on its own line.
  ```

### 7B. QuizLab — Audio Quiz Mode

**File:** `frontend/src/components/labs/QuizLab.jsx`

Changes:
- When `a11y.screenReaderMode` is true:
  - Auto-read question text when it appears: `speakText(questionText, langCode)`
  - Options labelled 1/2/3/4 visually AND as aria-labels
  - Keyboard shortcut: pressing `1`/`2`/`3`/`4` selects the answer
  - After answer: speak `"Correct! 10 XP earned"` or `"Incorrect. The answer was [option]"`
  - After quiz: speak final score
- All question options have `aria-label="Option A: [text]"` attributes

### 7C. BhoolBazaarTab — Audio Flashcards

**File:** `frontend/src/components/tabs/BhoolBazaarTab.jsx`

Changes:
- In the card review flow, when `a11y.ttsEnabled`:
  - Auto-speak card front when card appears
  - After 2 seconds: auto-speak card back
  - Keyboard navigation: `Space` = next card, `←`/`→` = previous/next, `R` = repeat
- Add visible keyboard shortcut hints below the card (hidden in non-screen-reader mode via `.sr-only`)

### 7D. HomeTab — Helper Note Banner

**File:** `frontend/src/components/tabs/HomeTab.jsx`

Changes:
- On mount: call `apiGetHelperNotes(userId)` if `profile.is_drishti`
- If unread notes exist: show a banner at top of HomeTab
  ```
  ┌────────────────────────────────────────────────┐
  │  💬 Message from your Helper — Sunita P        │
  │  "Great work this week Ravi! Keep it up!"     │
  │  [Mark as Read]                                │
  └────────────────────────────────────────────────┘
  ```
- If `a11y.ttsEnabled`: auto-speak note text on appearance
- On "Mark as Read": call `apiMarkHelperNotesRead(userId)`, dismiss banner

### 7E. NotebookTab — Read Aloud

**File:** `frontend/src/components/tabs/NotebookTab.jsx`

Changes:
- Add a 🔊 "Read Aloud" button after every AI chat response
- On click: `speakText(lastAIResponse, langCode, a11y.ttsSpeed)`
- Button label changes to "⏹ Stop" while speaking

---

## 8. Phase 6 — Helper Portal

**New file:** `frontend/src/components/HelperPortal.jsx`  
**New route in App.jsx:** `/helper/:token`

### 8A. Authentication
- No username/password — the helper visits `/helper/{their_unique_token}`
- On mount: `GET /api/helper/me` with `X-Helper-Token: {token}` header
- If invalid: show "Invalid or expired link" error screen
- If valid: render their dashboard

### 8B. Helper Portal UI

```
┌─────────────────────────────────────────────────────────┐
│  Eduvy-AI Helper Portal           Sunita Patel (Teacher) │
├─────────────────────────────────────────────────────────┤
│  Your Students (3)                                       │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Ravi Sharma  •  Class 8  •  CBSE  •  Hindi        │  │
│  │ XP This Week: ████████░░  820 / 1000              │  │
│  │ Streak: 🔥 7 days   Last Active: Today            │  │
│  │ Topics Today: Algebra, Quadratic Equations        │  │
│  │                        [Send Encouragement Note ✉] │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Priya Menon  •  Class 5  •  Tamil Board  •  Tamil │  │
│  │ XP This Week: ████░░░░░░  310 / 1000              │  │
│  │ Streak: 🔥 2 days   Last Active: Yesterday        │  │
│  │ Topics Today: (none yet)                          │  │
│  │                        [Send Encouragement Note ✉] │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 8C. Send Encouragement Note Flow
- Click "Send Encouragement Note" → expands inline text area
- Type message → "Send" button
- `POST /api/helper/notes` with `{ student_id, message }`
- Confirmation: "Note sent! It will appear on Ravi's home screen."
- Student sees the note as a banner on HomeTab (Phase 7D)

### 8D. Portal Design
- Same dark theme as the app (`#04040e` background, Sora font)
- Fully mobile-responsive (helpers may use phone to check)
- No navigation bar — single-page portal only
- Footer: "Read-only view — you cannot change student settings"

---

## 9. File Change Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `backend/routers/drishti.py` | Helper portal API (`/api/helper/*`) |
| `frontend/src/components/HelperPortal.jsx` | Helper portal UI at `/helper/:token` |

### Existing Files to Modify

| File | What Changes |
|------|-------------|
| `backend/database.py` | Add `is_drishti` + `accessibility_settings` cols; add `drishti_helpers`, `helper_student_map`, `helper_notes` tables |
| `backend/routers/admin.py` | Add student CRUD endpoints + helper CRUD endpoints + assignment endpoints |
| `backend/main.py` | Register `drishti.py` router |
| `frontend/src/shared.js` | Add `DEFAULT_A11Y`, `LANG_TO_SPEECH_CODE`, `speakText`, `stopSpeaking`, `isSpeaking`, `startVoiceInput` |
| `frontend/src/App.jsx` | Add `a11y` state; auto-detect `is_drishti` on login; pass `a11y`/`setA11y` via `sharedProps`; add `/helper/:token` route |
| `frontend/src/api.js` | Add `apiGetHelperNotes`, `apiMarkHelperNotesRead` |
| `frontend/src/index.css` | Add focus ring, high contrast, font scale, `.sr-only`, `.tts-btn`, `.mic-btn`, pulse animation |
| `frontend/src/components/AdminPanel.jsx` | Add "Students" tab + "Helpers" tab |
| `frontend/src/components/SettingsModal.jsx` | Add "Accessibility" settings tab |
| `frontend/src/components/tabs/TutorTab.jsx` | Voice mode (TTS output + mic input + accessible AI prompts) |
| `frontend/src/components/tabs/HomeTab.jsx` | Helper note banner |
| `frontend/src/components/tabs/BhoolBazaarTab.jsx` | Audio flashcard mode |
| `frontend/src/components/labs/QuizLab.jsx` | Audio quiz mode |
| `frontend/src/components/tabs/NotebookTab.jsx` | Read Aloud button on AI responses |

---

## 10. Build Order

Execute phases in this exact order to avoid dependency errors:

```
Step 1  ── backend/database.py
            Add is_drishti, accessibility_settings to users
            Create drishti_helpers, helper_student_map, helper_notes tables

Step 2  ── backend/routers/admin.py
            Add student management endpoints (POST/GET/PUT/DELETE /admin/students)
            Add helper management endpoints (POST/GET/PUT/DELETE /admin/helpers)
            Add assignment endpoints (POST/DELETE /admin/helpers/{id}/assign/{student_id})

Step 3  ── backend/routers/drishti.py  (NEW FILE)
            Helper portal endpoints (/helper/me, /helper/students, /helper/notes)

Step 4  ── backend/main.py
            Import and register drishti.router

Step 5  ── frontend/src/shared.js
            Add DEFAULT_A11Y, LANG_TO_SPEECH_CODE
            Add speakText, stopSpeaking, isSpeaking, startVoiceInput functions

Step 6  ── frontend/src/api.js
            Add apiGetHelperNotes, apiMarkHelperNotesRead

Step 7  ── frontend/src/index.css
            Add focus ring, high contrast, font scale, sr-only, tts-btn, mic-btn, pulse

Step 8  ── frontend/src/App.jsx
            Add a11y state + auto-detect is_drishti on login
            Pass a11y/setA11y in sharedProps
            Add /helper/:token route pointing to HelperPortal

Step 9  ── frontend/src/components/SettingsModal.jsx
            Add "Accessibility" tab with all toggles and settings

Step 10 ── frontend/src/components/AdminPanel.jsx
            Add "Students" tab (list, create, edit, deactivate, assign helper)
            Add "Helpers" tab (list, create, edit, assign students, portal URL)

Step 11 ── frontend/src/components/tabs/HomeTab.jsx
            Add helper note banner (fetch on mount, speak if TTS, mark as read)

Step 12 ── frontend/src/components/tabs/TutorTab.jsx
            Add voice mode button, TTS after AI response, mic input button

Step 13 ── frontend/src/components/labs/QuizLab.jsx
            Add audio quiz mode (auto-read questions, keyboard 1/2/3/4, speak results)

Step 14 ── frontend/src/components/tabs/BhoolBazaarTab.jsx
            Add audio flashcard mode (auto-speak front/back, keyboard nav)

Step 15 ── frontend/src/components/tabs/NotebookTab.jsx
            Add Read Aloud button on AI responses

Step 16 ── frontend/src/components/HelperPortal.jsx  (NEW FILE)
            Full portal UI: student list, XP, streak, send note

Step 17 ── Test end-to-end
            Admin creates Drishti learner → assigns helper → student logs in (is_drishti auto-sets a11y)
            → TTS speaks responses → Helper visits portal → sends note → student sees banner
```

---

## 11. Rules & Constraints

These must never be violated during implementation:

### Project Rules (from copilot-instructions.md)
1. **Language First** — All AI responses stay in `profile.language`. `LANG_RULES` must be in every system prompt.
2. **AI via Backend Only** — `callAI()` from `shared.js` → `/api/ai/chat`. Never direct from browser.
3. **Import Rules** — SettingsModal imports from `../shared.js` only (not `../App.jsx`). No circular deps.
4. **No Reserved Name Conflicts** — Don't name functions `ai()` or state `li`.
5. **Nav Buttons Never Disabled** — Navigation tabs always clickable.
6. **All Buttons Need fontFamily: 'Sora, sans-serif'**
7. **JSON from AI** — Always use `parseAIObject()` / `parseAIArray()`. Never raw `JSON.parse`.

### Accessibility-Specific Rules
8. **TTS is additive** — Never remove existing visual UI. TTS is an addition, not a replacement.
9. **Voice input graceful fallback** — If browser doesn't support `SpeechRecognition`, hide mic button silently. Never crash.
10. **`speechSynthesis` cancel before speak** — Always call `window.speechSynthesis.cancel()` before starting new utterance to avoid overlap.
11. **Helper portal is read-only** — Helpers can NEVER change student settings, plan, or profile. Only view + send notes.
12. **`helper_token` never exposed in admin list response** — Only show it once at creation time. Subsequent GET requests return `token_preview: "****...{last4}"` only.
13. **Drishti mode auto-detection** — If `profile.is_drishti === true`, accessibility settings are auto-applied on login without the student needing to go to settings.
14. **All new backend endpoints are protected** — Admin endpoints require `get_admin_user`. Helper endpoints require valid `helper_token`. Profile note endpoints require `getAuthToken`.
15. **Passwords hashed with bcrypt** — Student accounts created by admin use `bcrypt.hashpw`. Never store plain text.

---

## Estimated Scope

| Phase | Files | Complexity |
|-------|-------|-----------|
| Phase 1 — Database | 1 file | Low |
| Phase 2 — Backend API | 2 files | Medium |
| Phase 3 — Admin Panel | 1 file | Medium |
| Phase 4 — Accessibility Core | 4 files | Medium |
| Phase 5 — Per-Tab Audio | 5 files | Medium |
| Phase 6 — Helper Portal | 1 new file + 1 route | Low |
| **Total** | **~14 files** | **Medium** |

---

*This plan is complete and self-contained. All steps build on each other in the order listed. No step has a dependency on a later step.*
