# Eduvy-AI — Project Guidelines

## Project Identity
Modular full-stack application built with React + Redux + TypeScript + Tailwind CSS frontend and FastAPI + PostgreSQL backend.

---

## Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **Language**: TypeScript (TSX)
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios with interceptors
- **Routing**: React Router v6
- **Font**: Sora (Google Fonts)

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with SQLAlchemy (async)
- **Auth**: JWT (access + refresh tokens)
- **Password Hashing**: bcrypt via passlib
- **ORM**: SQLAlchemy 2.0 async

---

## Frontend Architecture

### Directory Structure
```
frontend/src/
├── routes/              # React Router configuration
│   ├── index.tsx        # Main router setup
│   ├── PrivateRoute.tsx # Auth-protected routes
│   └── PublicRoute.tsx  # Guest-only routes
├── modules/             # Feature modules (domain-driven)
│   ├── auth/            # Authentication module
│   │   ├── api.ts       # API calls (axios)
│   │   ├── slice.ts     # Redux slice + async thunks
│   │   ├── service.ts   # Business logic layer
│   │   ├── hooks.ts     # Custom React hooks
│   │   ├── types.ts     # TypeScript interfaces
│   │   ├── pages/       # Page components
│   │   ├── components/  # Module-specific components
│   │   └── utils/       # Module utilities
│   ├── users/           # (same pattern)
│   ├── products/        # (same pattern)
│   └── orders/          # (same pattern)
├── redux/               # Store configuration
│   ├── store.ts         # Redux store setup
│   └── rootReducer.ts   # Combined reducers
├── services/            # Global services
│   ├── axios.ts         # Axios instance config
│   └── interceptor.ts   # Request/response interceptors
├── layouts/             # Page layouts
│   ├── DashboardLayout.tsx
│   └── AuthLayout.tsx
├── shared/              # Shared resources
│   ├── components/      # Reusable UI components
│   ├── hooks/           # Global custom hooks
│   ├── utils/           # Helper functions
│   └── constants/       # App constants
├── styles/              # Global styles
│   ├── global.css       # Tailwind + custom CSS
│   └── variables.css    # CSS variables
└── assets/              # Static assets
    ├── images/
    └── icons/
```

### Data Flow Pattern
```
Page → Component → useHook() → dispatch(asyncThunk) → service → api → Backend
                                      ↓
                              Redux Store (slice)
                                      ↓
                              useSelector() → Component re-render
```

### Module Pattern
Each feature module follows this structure:
```typescript
// types.ts — TypeScript interfaces
export interface User { id: string; email: string; name: string; }

// api.ts — Raw API calls
export const authApi = {
  login: (data) => axiosInstance.post('/auth/login', data),
};

// service.ts — Business logic (token storage, data transforms)
export const authService = {
  login: async (credentials) => {
    const response = await authApi.login(credentials);
    setToken(response.token);
    return response;
  },
};

// slice.ts — Redux state + async thunks
export const login = createAsyncThunk('auth/login', authService.login);
const authSlice = createSlice({ ... });

// hooks.ts — React hooks for components
export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, isLoading } = useSelector(state => state.auth);
  const handleLogin = (credentials) => dispatch(login(credentials));
  return { user, isLoading, login: handleLogin };
};

// pages/Login.tsx — Page component
const Login = () => {
  const { login, isLoading } = useAuth();
  // ... render form
};
```

### Import Rules
```typescript
// Module imports — use relative paths within module
import { authApi } from './api';
import { UserResponse } from './types';

// Cross-module imports — use absolute paths
import { useDebounce } from '@/shared/hooks';
import { Button } from '@/shared/components';

// Redux store types
import { RootState, AppDispatch } from '@/redux/store';
```

---

## Backend Architecture

### Directory Structure
```
backend/app/
├── main.py              # FastAPI app factory
├── __init__.py
├── core/                # Core configuration
│   ├── config.py        # Settings (pydantic-settings)
│   ├── security.py      # JWT, password hashing
│   ├── dependency.py    # FastAPI dependencies
│   └── constants.py     # App constants
├── db/                  # Database layer
│   ├── database.py      # Async engine setup
│   ├── session.py       # Session dependency
│   ├── base.py          # Base model class
│   └── seed.py          # Database seeding
├── modules/             # Feature modules
│   ├── auth/
│   │   ├── router.py    # API routes
│   │   ├── service.py   # Business logic
│   │   ├── query.py     # Database queries
│   │   ├── schema.py    # Pydantic models
│   │   ├── exceptions.py# Module exceptions
│   │   └── __init__.py
│   ├── users/           # (same pattern)
│   ├── products/        # (same pattern)
│   └── orders/          # (same pattern)
├── utils/               # Utilities
│   ├── helpers.py       # Helper functions
│   ├── response.py      # Response formatters
│   ├── logger.py        # Logging setup
│   └── email.py         # Email utilities
├── exceptions/          # Global exceptions
│   ├── custom_exception.py
│   └── handlers.py      # Exception handlers
├── background_tasks/    # Async tasks
│   ├── email_tasks.py
│   └── cleanup_tasks.py
└── websocket/           # WebSocket support
    ├── manager.py       # Connection manager
    └── websocket_routes.py
```

### Module Pattern
```python
# schema.py — Pydantic models (request/response)
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    class Config:
        from_attributes = True

# query.py — Database operations (SQLAlchemy)
async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()

# service.py — Business logic
async def get_user(db: AsyncSession, user_id: str) -> UserResponse:
    user = await query_get_user_by_id(db, user_id)
    if not user:
        raise UserNotFoundException(user_id)
    return UserResponse.model_validate(user)

# router.py — API endpoints
@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(user_id: str, db: AsyncSession = Depends(get_db)):
    return await service.get_user(db, user_id)
```

### Dependency Injection
```python
# Always use FastAPI dependencies
from app.db.session import get_db
from app.core.dependency import get_current_user, get_current_admin_user

@router.get("/me")
async def get_me(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return current_user
```

---

## Critical Rules

### 1. TypeScript Strict Mode
- All files must pass `tsc --noEmit`
- No `any` types unless absolutely necessary
- Define interfaces for all API responses

### 2. Redux Best Practices
- Use `createAsyncThunk` for API calls
- Keep reducers pure (no side effects)
- Use `useSelector` with typed selectors

### 3. API Error Handling
```typescript
// Frontend: Always handle errors in async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      return await authService.login(credentials);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);
```

```python
# Backend: Use custom exceptions
class UserNotFoundException(HTTPException):
    def __init__(self, user_id: str = None):
        super().__init__(status_code=404, detail=f"User not found: {user_id}")
```

### 4. Authentication Flow
```
1. User submits credentials
2. Backend validates → returns { token, refreshToken, user }
3. Frontend stores token in localStorage
4. Axios interceptor adds `Authorization: Bearer <token>` to all requests
5. 401 response → clear token → redirect to login
```

### 5. File Organization
- One component per file
- Export named exports (not default) for utilities
- Use index.ts for module re-exports

### 6. Tailwind Usage
```tsx
// Use Tailwind utility classes
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
  Submit
</button>

// Use @apply for repeated patterns in global.css
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700;
  }
}
```

### 7. Database Migrations
- Use Alembic for schema migrations (not yet configured)
- Tables auto-create via `Base.metadata.create_all` on startup

---

## Environment Variables

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:8000/api
```

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/dbname
SECRET_KEY=your-secret-key
```

---

## Commands

### Frontend
```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Start dev server (port 5173)
npm run build        # Build for production
npm run type-check   # TypeScript validation
npm run lint         # ESLint
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
python -m scripts.seed_db        # Seed database
python -m scripts.create_admin   # Create admin user
```
import { apiGetParentPin, apiCreateParentPin } from '../api.js'

// ParentDashboard: public page — define its own COLORS const locally, do not import from App.jsx
const C = { bg: "#04040e", ... }

// WRONG — causes circular dep crash:
// import { COLORS } from '../App.jsx'   // in SettingsModal
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

### 15. Self-Review After Every Code Change — Mandatory
After completing any code task, always review the changed file(s) before finishing:
- **Syntax**: No unclosed brackets `{}`, parentheses `()`, JSX tags, or template literals
- **Data types**: Function return types match what callers expect; no implicit `undefined` passed where a value is required
- **Imports**: Every used symbol is imported; no unused imports left behind
- **Logic**: Removed code did not leave behind orphaned `}` or `else` branches
- **JSX structure**: Every opened tag is closed; `return` has exactly one root element or `<>` fragment
- **Python**: Indentation is consistent; all `try` blocks have matching `except`; no variable used before assignment
- Re-read the modified region (at minimum 20 lines above and below each change) to catch errors before they reach the user.

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
    AdminPanel.jsx       # Superadmin CRUD panel
    ParentDashboard.jsx  # Public parent view at /parent/:pin (no auth)
    SettingsModal.jsx    # imports from ../shared.js and ../api.js
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
    admin.py             # Admin auth + full CRUD + bulk import
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

