# Eduvy-AI

> विद्या + AI = आपका भविष्य *(Knowledge + AI = Your Future)*

AI-powered education app for Indian students (Class 1–12). Every AI response is delivered in the student's chosen medium language across 11 Indian languages.

---

## Features

- **Personal AI Tutor** — 24/7 Socratic tutor that guides students to answers, never spoon-feeds
- **NotebookLM-style Intelligence** — Upload any textbook, AI masters it and answers questions
- **AI Podcast** — Two AI hosts debate and discuss syllabus topics
- **Quiz & Flashcards** — Adaptive practice aligned to the student's board and class
- **Video Intelligence** — Curated YouTube videos with AI-generated summaries
- **Mental Wellness Coach** — Handles exam stress, anxiety, and motivation
- **Essay Lab** — AI-assisted essay writing with feedback
- **Superadmin Panel** — Manage boards, standards, mediums, and curriculum

All features work in **Hindi, English, Gujarati, Tamil, Telugu, Kannada, Marathi, Bengali, Punjabi, Odia, and Urdu**.

---

## Developer Setup Guide

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, JavaScript (JSX), react-router-dom |
| Styling | Inline styles + CSS classes — no Tailwind, no CSS modules |
| Font | Sora (Google Fonts) |
| AI | Groq, Google Gemini, Anthropic Claude, OpenAI GPT |
| Backend | FastAPI (Python 3.11+) |
| Database | PostgreSQL (hosted on Supabase) |
| Auth | JWT (student) + separate JWT (admin) |

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
backend/
  main.py                # FastAPI entry point
  database.py            # SQLite setup
  routers/               # API route modules
  services/              # AI service layer
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+

### Frontend

```bash
npm install
npm run dev
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

The app opens at `http://localhost:5173`. Configure your AI provider API key in Settings (⚙️) after launching.

## Supported Boards

CBSE, ICSE, GSEB, MSBSHSE, RBSE, UP Board, BSEB, TN Board, KAR Board, PSEB

## License

Private — All rights reserved.
