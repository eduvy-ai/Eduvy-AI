# Eduvy-AI

> विद्या + AI = आपका भविष्य *(Knowledge + AI = Your Future)*

AI-powered education platform for Indian students (Class 1–12). Every AI response is delivered in the student's chosen language across **11 Indian languages**.

---

## Features

### Core Learning
- **Personal AI Tutor** — 24/7 Socratic tutor that guides to answers, never spoon-feeds
- **Smart Notebook** — NotebookLM-style: upload any textbook, AI masters it and answers questions
- **Whiteboard Video Lessons** — Curated YouTube videos with AI-generated summaries
- **Learn TV** — Immersive whiteboard-style lesson player

### Labs
- **Quiz Arena** — Adaptive MCQ practice aligned to board, class, and mastery
- **AI Examiner** — Mock exam with subjective answer evaluation
- **Samjhao Lab** — "Explain like I'm 5" simplifier for any concept
- **AI Podcast** — Two AI hosts debate and discuss syllabus topics
- **Essay Lab** — AI-assisted essay writing with feedback
- **Mental Wellness Coach** — Handles exam stress, anxiety, and motivation

### Social & Competitive
- **🤝 Sathi Study Squads** — 3-tab squad experience:
  - **Chat** — Group chat with AI peer "Gyaani", teach-back challenges (+50 XP), squad streak
  - **Doubts Board** — Post doubts, squad answers, AI auto-verifies each answer (✅ Correct / ⚠️ Partial / ✗ Incorrect), upvote best answers (+15 XP); per-day posting limits by plan (Free: 2, Basic: 5, Pro: 15, Premium: ∞)
  - **Daily Concept** — One concept/day from squad's focus subject; students write explanations in their own words; AI grades and awards XP dynamically (correct→+30, partial→+15, incorrect→+5); one submission per student per day
  - Squad matching by class + medium; squad streak tracks daily activity
- **📛 Bhool Bazaar** — Mistake Marketplace: turn wrong answers into published learning cards with Bhool Coins economy
- **⚔️ Muqabla Battles** — Student vs Student + School vs School battles; AI generates 5 MCQ questions per battle; weekly leaderboard

### Parent & Admin
- **👨‍👩‍👦 Parent Dashboard** — PIN-based shareable link (no parent account needed); shows mastery, quizzes, AI usage, streaks, battle stats
- **🛡 Superadmin Panel** — Manage boards, standards, mediums, curriculum with bulk import

All features work in **Hindi, English, Gujarati, Tamil, Telugu, Kannada, Marathi, Bengali, Punjabi, Odia, and Urdu**.

---

## Plans

| Plan | Price | Key Features |
|---|---|---|
| 🆓 **Free** | ₹0 | AI Tutor (10/day), Bhool Bazaar, Muqabla |
| ⭐ **Basic** | ₹99/mo | + Notebook, Videos, 50 AI calls/day |
| 🚀 **Pro** | ₹249/mo | + Labs, Sathi Squads, 200 AI calls/day |
| 👑 **Premium** | ₹499/mo | + All Labs, Podcast, Essay, Discover, Unlimited AI |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, JavaScript (JSX), react-router-dom |
| Styling | Inline styles + CSS classes — no Tailwind, no CSS modules |
| Font | Sora (Google Fonts) |
| AI | Groq, Google Gemini, Anthropic Claude, OpenAI GPT — **server-side only** |
| Backend | FastAPI (Python 3.11+) |
| Database | PostgreSQL (Supabase recommended) |
| Auth | JWT (student) + separate JWT (admin) |

---

## Project Structure

```
src/
├── main.jsx                  # Entry point — BrowserRouter
├── App.jsx                   # Root routes + AppShell + re-exports
├── shared.js                 # Constants + callAI + parsers (no React)
├── api.js                    # All backend fetch helpers
├── index.css                 # Global styles + responsive breakpoints
└── components/
    ├── AuthScreen.jsx         # Student login / register
    ├── Splash.jsx             # 2.8s splash screen
    ├── Onboard.jsx            # 3-step onboarding
    ├── SettingsModal.jsx      # AI info (read-only) + profile + plan
    ├── AdminPanel.jsx         # Full superadmin CRUD panel
    ├── ParentDashboard.jsx    # Public parent view at /parent/:pin
    ├── LandingPage.jsx        # Public landing page with pricing
    └── tabs/
        ├── HomeTab.jsx
        ├── NotebookTab.jsx
        ├── TutorTab.jsx
        ├── VideosTab.jsx
        ├── LearnTVTab.jsx
        ├── LabsTab.jsx
        ├── DiscoverTab.jsx
        ├── SathiTab.jsx       # Study Squads — Chat / Doubts Board / Daily Concept (3 sub-tabs)
        ├── BhoolBazaarTab.jsx # Mistake Marketplace
        └── MuqablaTab.jsx     # Battle Arena
        └── labs/
            ├── QuizLab.jsx
            ├── ExaminerLab.jsx
            ├── SamjhaoLab.jsx
            ├── PodcastLab.jsx
            ├── EssayLab.jsx
            └── MentalLab.jsx

backend/
├── main.py                   # FastAPI app + security middleware
├── database.py               # DB connection + all table creation
├── requirements.txt
├── .env                      # API keys (never commit)
├── seed_curriculum.py        # One-time seed
├── create_admin.py           # Create first superadmin
├── services/
│   └── ai_service.py         # All AI provider calls (server-side only)
└── routers/
    ├── auth.py               # Register / login / me
    ├── profile.py            # Student profile CRUD
    ├── ai.py                 # AI proxy + quota enforcement
    ├── curriculum.py         # Public curriculum endpoints
    ├── admin.py              # Admin auth + full CRUD
    ├── notebook.py           # Notebook sources + chat
    ├── quiz_stats.py         # Quiz results
    ├── mastery.py            # Subject mastery scores
    ├── sessions.py           # Study sessions
    ├── squads.py             # Sathi Study Squads
    ├── bhool.py              # Bhool Bazaar
    ├── muqabla.py            # Muqabla Battles
    └── parent.py             # Parent Dashboard PIN
```

---

## Developer Setup

### Prerequisites
- **Node.js** 18+ and **npm**
- **Python** 3.11+
- A **PostgreSQL** database — [Supabase](https://supabase.com) free tier works
- At least one AI key — [Groq](https://console.groq.com/keys) is free and recommended

### Step 1 — Install Dependencies

```bash
# Frontend (from project root)
npm install

# Backend
cd backend
pip install -r requirements.txt
```

### Step 2 — Configure Environment

Create `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Generate with: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET=your-long-random-secret-here
JWT_ALGORITHM=HS256
JWT_EXPIRE_DAYS=30

ENV=development   # set to "production" to disable /docs

GROQ_API_KEY=your_groq_key_here
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

CORS_ORIGINS=http://localhost:5173,http://localhost:4173
```

### Step 3 — Init Database

Tables are created automatically on first backend start. To create manually:

```bash
cd backend
python -c "from database import init_db; init_db(); print('Done')"
```

### Step 4 — Seed Curriculum

Populates all Indian boards, 12 standards, 11 language mediums, ~240 curriculum combinations. **Run once only.**

```bash
cd backend
python seed_curriculum.py
```

### Step 5 — Create First Superadmin

```bash
cd backend
python create_admin.py
```

### Step 6 — Start Both Servers

```bash
# Terminal 1 — Backend
cd backend
uvicorn main:app --port 8000 --host 0.0.0.0 --reload

# Terminal 2 — Frontend
npm run dev
```

App at **http://localhost:5173**

---

## App Routes

| URL | Description |
|---|---|
| `/` | Public landing page |
| `/auth` | Student login / register |
| `/onboard` | Student profile setup wizard |
| `/app/home` | Home dashboard |
| `/app/notebook` | Smart Notebook |
| `/app/tutor` | AI Tutor |
| `/app/videos` | Video search |
| `/app/learntv` | Learn TV |
| `/app/labs` | Labs hub |
| `/app/sathi` | Sathi Study Squads |
| `/app/bhool` | Bhool Bazaar |
| `/app/muqabla` | Muqabla Battle Arena |
| `/app/discover` | Discover Feed (Premium) |
| `/parent/:pin` | **Public** parent dashboard (no login needed) |
| `/admin/login` | Superadmin login |
| `/admin/curriculum` | Manage curriculum |

---

## Key Backend Endpoints

### Student Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register — returns `{ token, profile }` |
| POST | `/api/auth/login` | Login — returns `{ token, profile }` |
| GET | `/api/auth/me` | Get current profile (Bearer required) |

### AI Proxy
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ai/chat` | Proxy to AI provider with quota enforcement |
| GET | `/api/ai/usage` | Today's + monthly usage stats |

### Sathi Squads
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/squads/mine` | My squad |
| POST | `/api/squads/match` | AI-match by subject |
| GET | `/api/squads/{id}/messages` | Poll messages |
| POST | `/api/squads/{id}/messages` | Send message |
| POST | `/api/squads/{id}/challenge/create` | Create teach-back challenge |
| POST | `/api/squads/{id}/challenge/{cid}/submit` | Submit explanation (+50 XP) |

### Bhool Bazaar
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/bhool/cards` | Save mistake card |
| GET | `/api/bhool/cards/mine` | My cards |
| PUT | `/api/bhool/cards/{id}` | Update / publish (+5 Bhool Coins) |
| DELETE | `/api/bhool/cards/{id}` | Delete |
| GET | `/api/bhool/marketplace` | Published cards feed |
| GET | `/api/bhool/marketplace/top` | Weekly top by subject |
| POST | `/api/bhool/cards/{id}/collect` | Collect (+10 XP) |
| POST | `/api/bhool/cards/{id}/react` | React with emoji |
| GET | `/api/bhool/collections` | My saved cards |

### Muqabla Battles
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/muqabla/challenge` | Create battle (AI generates 5 MCQs) |
| POST | `/api/muqabla/battles/{id}/join` | Join as opponent |
| POST | `/api/muqabla/battles/{id}/answer` | Submit answers |
| GET | `/api/muqabla/open` | Open challenges (same standard) |
| GET | `/api/muqabla/pending` | Battles waiting for my answer |
| GET | `/api/muqabla/history` | Completed battles |
| GET | `/api/muqabla/leaderboard` | Weekly student rankings |
| GET | `/api/muqabla/school-leaderboard` | Weekly school rankings |

### Parent Dashboard
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/parent/pin` | Generate PIN (student auth) |
| GET | `/api/parent/pin` | Get current PIN |
| DELETE | `/api/parent/pin` | Revoke PIN |
| GET | `/api/parent/view/{pin}` | **Public** — full dashboard data |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/admin/login` | Admin login |
| GET/POST | `/api/admin/boards` | List / create boards |
| GET/POST | `/api/admin/curriculum` | List / create curriculum |
| POST | `/api/admin/curriculum/import` | Bulk import |

---

## Security

- All student data endpoints require `Authorization: Bearer <JWT>`
- IDOR guard on every route — users can only access their own data
- AI keys stored server-side only — never sent to browser
- Rate limits: login (10/60s), register (5/60s)
- Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- Strict email regex + minimum 8-char password on registration
- Generic login error (no user enumeration)
- `/docs` and `/redoc` disabled in production (`ENV=production`)

---

## Production Build

```bash
# Build frontend
npm run build

# Backend
uvicorn main:app --port 8000 --host 0.0.0.0 --workers 2
```

Set `ENV=production` in `.env` before deploying.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Black screen on load | Check browser console. Ensure backend is running on port 8000. |
| `DATABASE_URL` connection error | Verify `backend/.env` exists with valid Postgres connection string. |
| AI features not working | Add `GROQ_API_KEY` to `backend/.env` — Groq is free. |
| CORS error | Add frontend URL to `CORS_ORIGINS` in `.env` and restart backend. |
| Curriculum dropdowns empty | Run `python seed_curriculum.py` from `backend/` folder. |
| Register fails | Ensure backend returns `{ token, profile }` with non-empty `profile.name`. |
| Parent link not found | PIN is case-insensitive but must be 8 chars. Check it hasn't expired (90-day TTL). |
| Muqabla questions not generating | Ensure `GROQ_API_KEY` is set — battles use Groq Llama to generate questions. |


## Supported Boards

CBSE, ICSE, GSEB, MSBSHSE, RBSE, UP Board, BSEB, TN Board, KAR Board, PSEB

---

## License

Private — All rights reserved.

---

### Project Structure

```
ai/
├── index.html
├── vite.config.js
├── package.json
├── src/
│   ├── main.jsx              # Entry point — wraps app in BrowserRouter
│   ├── App.jsx               # Root routes + AppShell
│   ├── shared.js             # All constants + callAI + parsers
│   ├── api.js                # All backend fetch helpers
│   ├── index.css             # Global styles + responsive breakpoints
│   └── components/
│       ├── AuthScreen.jsx    # Student login / register
│       ├── Splash.jsx        # 2.8s splash screen
│       ├── Onboard.jsx       # 3-step student onboarding
│       ├── SettingsModal.jsx # AI provider + profile settings
│       ├── AdminPanel.jsx    # Full superadmin CRUD panel
│       └── tabs/             # HomeTab, NotebookTab, TutorTab, etc.
│           └── labs/         # QuizLab, PodcastLab, EssayLab, MentalLab
└── backend/
    ├── main.py               # FastAPI app + router registration
    ├── database.py           # DB connection + table creation
    ├── requirements.txt
    ├── .env                  # API keys (never commit this)
    ├── seed_curriculum.py    # One-time seed: all Indian boards/standards/mediums
    ├── create_admin.py       # One-time script: create first superadmin
    └── routers/
        ├── auth.py           # Student register / login / me
        ├── profile.py        # Student profile CRUD
        ├── curriculum.py     # Public read-only curriculum endpoints (onboarding)
        ├── admin.py          # Admin auth + full CRUD + bulk import
        ├── ai.py             # Server-side AI proxy
        ├── notebook.py       # Notebook sources + chat
        ├── quiz_stats.py     # Quiz results
        ├── mastery.py        # Subject mastery scores
        └── sessions.py       # Study sessions
```

---

### Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.11+
- A **PostgreSQL** database — [Supabase](https://supabase.com) free tier works perfectly
- At least one AI provider key — [Groq](https://console.groq.com/keys) is free and recommended

---

### Step 1 — Install Dependencies

```bash
# Frontend (from project root)
npm install

# Backend
cd backend
pip install -r requirements.txt
```

---

### Step 2 — Configure Environment Variables

Create `backend/.env`:

```env
# PostgreSQL connection string (Supabase or any Postgres)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT secret — change this to a long random string in production
JWT_SECRET=eduvyai-change-me-in-production

# AI Provider Keys (at least one required)
GEMINI_API_KEY=
GROQ_API_KEY=your_groq_key_here
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Allowed CORS origins
CORS_ORIGINS=http://localhost:5173,http://localhost:4173
```

> Get a free Groq key at https://console.groq.com/keys

---

### Step 3 — Initialize Database Tables

Tables are created automatically on first backend start. To create them manually:

```bash
cd backend
python -c "from database import init_db; init_db(); print('Done')"
```

---

### Step 4 — Seed Curriculum Data

Populates all Indian boards (CBSE, ICSE, GSEB, etc.), 12 standards, 11 language mediums, and ~240 curriculum combinations. **Run once only.**

```bash
cd backend
python seed_curriculum.py
```

---

### Step 5 — Create First Superadmin

```bash
cd backend
python create_admin.py
```

Default credentials created:
- **Email:** `pradip.pawar@gmail.com`
- **Password:** `Pradip@123`

To use different credentials, edit `create_admin.py` before running. You can also use `POST /api/admin/setup` if no admin exists yet.

---

### Step 6 — Start Both Servers

**Terminal 1 — Backend**
```bash
cd backend
uvicorn main:app --port 8000 --host 0.0.0.0 --reload
```

**Terminal 2 — Frontend**
```bash
npm run dev
```

App available at **http://localhost:5173**

---

## App Routes

| URL | Description |
|---|---|
| `/` | Splash screen (auto-advances after 2.8s) |
| `/auth` | Student login / register |
| `/onboard` | Student profile setup wizard |
| `/app/home` | Student home dashboard |
| `/app/notebook` | NotebookLM-style source + chat tab |
| `/app/tutor` | AI tutor chat |
| `/app/videos` | Video search |
| `/app/learntv` | Learn TV |
| `/app/labs` | Labs (Quiz, Podcast, Essay, Mental Health) |
| `/admin` | Redirects to admin login |
| `/admin/login` | Superadmin login |
| `/admin/curriculum` | Manage curriculum |
| `/admin/boards` | Manage boards |
| `/admin/standards` | Manage standards |
| `/admin/mediums` | Manage mediums |

---

## Student Flow

1. Open `http://localhost:5173/` — splash plays for 2.8s
2. **Register** at `/auth`:
   - **Step 1:** Name, email, password, mobile (optional)
   - **Step 2:** Class, board, language medium, subjects
3. After successful registration → lands on `/app/home`
4. **Login** on future visits → goes straight to `/app/home`
5. On refresh → stays on the same tab (URL-based routing)
6. **Settings (⚙️)** — change AI provider/key or update profile

---

## Admin Flow

1. Open `http://localhost:5173/admin` → redirects to `/admin/login`
2. Login with admin credentials
3. After login → lands on `/admin/curriculum`
4. Use the sidebar (desktop) or top tab bar (tablet/mobile) to switch sections

### Admin Panel Tabs

| Tab | What you can do |
|---|---|
| **Curriculum** | Add/edit/delete board + standard + medium rows with subject lists. Bulk JSON import. Filter by board/standard/medium. |
| **Boards** | Add/edit/delete boards. Bulk import. Search filter. |
| **Standards** | Add/edit/delete class standards. Bulk import. Search filter. |
| **Mediums** | Add/edit/delete language mediums. Bulk import. Search filter. |

---

## Bulk Import JSON Formats

**Boards:**
```json
[
  {"id": "cbse", "name": "CBSE", "sort_order": 1},
  {"id": "icse", "name": "ICSE", "sort_order": 2}
]
```

**Standards:**
```json
[
  {"id": "class-1",  "name": "Class 1",  "grade_num": 1,  "sort_order": 1},
  {"id": "class-10", "name": "Class 10", "grade_num": 10, "sort_order": 10}
]
```

**Mediums:**
```json
[
  {"id": "english", "name": "English", "sort_order": 1},
  {"id": "hindi",   "name": "Hindi",   "sort_order": 2}
]
```

**Curriculum:**
```json
[
  {
    "board": "CBSE",
    "standard": "Class 10",
    "medium": "English",
    "subjects": ["Mathematics", "Science", "English", "Social Science", "Hindi"]
  }
]
```

> Curriculum import auto-creates missing boards/standards/mediums by name.

---

## Key Backend Endpoints

### Student Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Register — returns `{ token, profile }` |
| POST | `/api/auth/login` | None | Login — returns `{ token, profile }` |
| GET | `/api/auth/me` | Bearer | Get current profile |

### Curriculum (Public)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/curriculum/boards` | All active boards |
| GET | `/api/curriculum/standards?board=cbse` | Standards for a board |
| GET | `/api/curriculum/mediums?board=cbse&standard=class-10` | Mediums |
| GET | `/api/curriculum/subjects?board=cbse&standard=class-10&medium=english` | Subjects |

### Admin (Admin Bearer token required)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/admin/login` | Admin login |
| GET/POST | `/api/admin/boards` | List / create boards |
| POST | `/api/admin/boards/import` | Bulk import boards |
| GET/POST | `/api/admin/standards` | List / create standards |
| POST | `/api/admin/standards/import` | Bulk import standards |
| GET/POST | `/api/admin/mediums` | List / create mediums |
| POST | `/api/admin/mediums/import` | Bulk import mediums |
| GET/POST | `/api/admin/curriculum` | List / create curriculum |
| POST | `/api/admin/curriculum/import` | Bulk import curriculum |

---

## Production Build

```bash
# Build frontend static files (output in dist/)
npm run build

# Serve backend without hot-reload
uvicorn main:app --port 8000 --host 0.0.0.0 --workers 2
```

Update `CORS_ORIGINS` in `.env` to include your production domain before deploying.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Black screen on load | Check browser console. Ensure backend is running on port 8000. |
| `DATABASE_URL` connection error | Verify `backend/.env` exists with a valid Postgres connection string. |
| Admin panel login loop | Clear browser `localStorage` and try again. |
| AI features not working | Add `GROQ_API_KEY` to `backend/.env` — Groq is free. |
| CORS error | Add frontend URL to `CORS_ORIGINS` in `.env` and restart backend. |
| Curriculum dropdowns empty in onboarding | Run `python seed_curriculum.py` from the `backend/` folder. |
| Register redirects back to login | Ensure backend is returning `{ token, profile }` and `profile.name` is non-empty. |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Language | JavaScript (JSX) |
| Styling | Inline styles with theme tokens |
| Font | Sora (Google Fonts) |
| AI | Multi-provider — Gemini, Groq, Claude, GPT (direct browser fetch) |
| State | React `useState` / `useRef` |
| Storage | `localStorage` for profile & AI config |
| Backend | Python FastAPI + SQLite |
| TTS | Web Speech API |

## Project Structure

```
src/
  shared.js              # Constants, AI utilities, callAI, parsers
  App.jsx                # App shell, routing, global state
  index.css              # Global styles, responsive breakpoints
  components/
    Splash.jsx           # Animated splash screen
    Onboard.jsx          # 3-step profile setup
    SettingsModal.jsx     # AI provider config
    tabs/
      HomeTab.jsx        # Dashboard with brain map & daily goals
      NotebookTab.jsx    # Document upload, chat, studio
      TutorTab.jsx       # Socratic AI tutor
      VideosTab.jsx      # Video search & summaries
      LabsTab.jsx        # Lab launcher
    labs/
      PodcastLab.jsx     # AI podcast generator
      QuizLab.jsx        # Adaptive quizzes
      EssayLab.jsx       # Essay writing assistant
      MentalLab.jsx      # Wellness & motivation coach
## Supported Boards

CBSE, ICSE, GSEB, MSBSHSE, RBSE, UP Board, BSEB, TN Board, KAR Board, PSEB

---

## License

Private — All rights reserved.
