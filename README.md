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
- **🛡 Superadmin Panel** — Manage boards, standards, mediums, curriculum with bulk import; manage Students and assign Drishti Helpers

### 👁️ Drishti — Accessible Learning
Full accessibility layer for visually impaired students (Class 1–12):
- **Text-to-Speech** — Every AI response spoken aloud in the student's language (11 Indian languages, adjustable speed)
- **Voice Input** — Speak questions instead of typing (Web Speech API, no third-party service)
- **Audio Quiz Mode** — Questions auto-read aloud; answer with keyboard keys `1`/`2`/`3`/`4`
- **Audio Flashcards** — 🔊 read-aloud button on every Bhool Bazaar card
- **Read Aloud in Notebook** — 🔊 per-message button on all AI responses
- **High Contrast Mode** — Pure black/white UI override
- **Font Scaling** — Normal / Large / X-Large body font size
- **Helper Portal** — Assigned teacher or volunteer visits `/helper/:token`; sees student's XP, streak, recent topics; sends encouragement notes that appear as a banner on the student's home screen
- **Admin-managed accounts** — SuperAdmin creates Drishti learner accounts and assigns helpers; `is_drishti` flag auto-enables accessibility settings on login

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
    ├── SettingsModal.jsx      # AI info (read-only) + profile + plan + Drishti accessibility
    ├── AdminPanel.jsx         # Full superadmin CRUD panel + Students + Drishti Helpers tabs
    ├── ParentDashboard.jsx    # Public parent view at /parent/:pin
    ├── LandingPage.jsx        # Public landing page with pricing
    ├── HelperPortal.jsx       # Drishti helper portal at /helper/:token (no auth)
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
├── database.py               # DB connection + all table creation (incl. Drishti tables)
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
    ├── admin.py              # Admin auth + full CRUD + student & Drishti helper management
    ├── drishti.py            # Helper portal API (X-Helper-Token auth)
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
| `/helper/:token` | **Public** Drishti helper portal (no login needed) |
| `/admin/login` | Superadmin login |
| `/admin/curriculum` | Manage curriculum |
| `/admin/students` | Manage student accounts + Drishti flag |
| `/admin/drishti-helpers` | Manage helpers + generate portal tokens |

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
| GET/POST | `/api/admin/students` | List / create student accounts |
| PUT/DELETE | `/api/admin/students/{id}` | Update / deactivate student |
| GET/POST | `/api/admin/drishti-helpers` | List / create Drishti helpers |
| PUT/DELETE | `/api/admin/drishti-helpers/{id}` | Update / deactivate helper |
| GET | `/api/admin/drishti-helpers/{id}/students` | List assigned students |
| POST/DELETE | `/api/admin/drishti-helpers/{id}/assign/{sid}` | Assign / unassign student |

### Drishti Helper Portal
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/helper/me` | Verify helper token → returns helper info |
| GET | `/api/helper/students` | All assigned students (XP, streak, topics) |
| POST | `/api/helper/notes` | Send an encouragement note to a student |
| GET | `/api/helper/notes/{student_id}` | Notes sent to a specific student |
| GET | `/api/profile/{id}/helper-notes` | Student reads their own unread notes |
| POST | `/api/profile/{id}/helper-notes/read` | Mark notes as read |

---

## Security

- All student data endpoints require `Authorization: Bearer <JWT>`
- Helper portal endpoints require `X-Helper-Token` header; helpers can only access their own assigned students
- IDOR guard on every route — users can only access their own data
- AI keys stored server-side only — never sent to browser
- Rate limits: login (10/60s), register (5/60s)
- Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- Strict email regex + minimum 8-char password on registration
- Generic login error (no user enumeration)
- `/docs` and `/redoc` disabled in production (`ENV=production`)
- Helper tokens are one-time viewable — only returned at creation; subsequent GET returns a preview only

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
| Helper portal shows "Invalid token" | Token was not copied correctly, or helper is deactivated. Re-generate from Admin → Drishti Helpers. |
| TTS not working | Browser must support Web Speech API (Chrome/Edge). Check `speechSynthesis` in DevTools console. |
| Voice input not working | Microphone permission must be granted; HTTPS required in production. |

## Supported Boards

CBSE, ICSE, GSEB, MSBSHSE, RBSE, UP Board, BSEB, TN Board, KAR Board, PSEB

---

## License

Private — All rights reserved.


