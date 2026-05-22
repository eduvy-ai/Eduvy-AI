# VidyAI Security & Trust — For Students, Parents & Schools

> This document explains what security measures VidyAI has in place, what data is collected, and how to communicate trust to parents and school administrators.

---

## 1. Student Data Security

### What Data VidyAI Collects
| Data | Why | Where Stored |
|------|-----|--------------|
| Name | Personalizing the experience | PostgreSQL (backend) — encrypted at rest |
| Class, Board, Language | Curriculum alignment | Backend DB |
| School name | School vs school leaderboards | Backend DB |
| Study session timestamps | Streak tracking | Backend DB |
| Quiz answers and scores | Mastery calculation | Backend DB |
| Chat messages with AI tutor | Improving responses | Backend DB (tutor history) |

### What VidyAI Does NOT Collect
- No phone number required (email/username only)
- No real-time location
- No photos or camera access
- No microphone access by default (only if TTS enabled, handled by browser)
- No social media integration
- No advertising tracking pixels on student-facing pages
- No selling of student data to third parties — ever

---

## 2. Authentication Security

### How Logins Work
- Passwords are hashed using **bcrypt** (industry standard — never stored in plain text)
- Auth tokens use **JWT (JSON Web Tokens)** with expiry — stored in `localStorage`
- All API calls require `Authorization: Bearer <token>` — unauthenticated requests are rejected
- Backend runs on FastAPI with HTTPS (enforce TLS in production)

### What to Tell Parents
> "Your child's account is protected by the same password hashing technology banks use. We never store passwords — only a mathematical fingerprint that cannot be reversed."

---

## 3. AI Content Safety

### Education-Only Guardrails
- Every AI system prompt explicitly restricts the AI to **academic topics only**
- The AI is instructed to refuse requests that are:
  - Off-topic (entertainment, social chat, harmful content)
  - Violent or inappropriate
  - Unrelated to the student's declared subjects

### Language Safety
- All AI responses are generated in the student's declared language
- The AI cannot be prompted to switch language mid-conversation by a student trying to bypass restrictions

### No Hallucination Risk Mitigation
- AI is prompted to say "I'm not sure — please verify with your textbook" rather than making up wrong facts
- Quiz answers include confidence signals
- Students are always encouraged to cross-verify with their textbook

### What to Tell Parents
> "VidyAI's AI cannot discuss violence, relationships, or anything outside the student's subjects. We use the same AI safety techniques used by major education platforms globally."

---

## 4. Parent Dashboard & Supervision

### How It Works
- Parent generates a **unique 6-digit PIN** from Settings
- They get a shareable URL: `vidyai.app/parent/<pin>`
- The dashboard shows:
  - Subject mastery scores
  - Quiz history (topics, scores, dates)
  - AI call usage per day
  - Study session timestamps (when did child study and for how long)
  - Battle results (Muqabla)
  - XP and streak

### What Parents Can See
- Everything the student has done academically
- Which subjects are weak (mastery score below threshold)
- Study habit patterns (study time, frequency)

### What Parents Cannot See
- Individual AI conversation messages (privacy for the student)
- Squad chat messages (peer privacy)

### What to Tell Parents
> "You don't need to create an account. Just get your child's 6-digit PIN and bookmark the link. Every night you can check in 30 seconds — what did my child study today, how did they perform in quizzes, are they consistent?"

---

## 5. Data Privacy & Legal Compliance

### GDPR / DPDP Act (India's Digital Personal Data Protection Act 2023)
- VidyAI collects minimum necessary data
- Students can request data deletion from Settings
- No data is shared with third parties for advertising
- AI providers (Groq, Gemini, Anthropic) receive only the conversation content — no student PII is sent in AI requests

### For Students Under 13
- VidyAI requires parental consent for users under 13 (during registration)
- Parents can revoke the parent PIN at any time, which locks access for review
- School administrators can request full data export or deletion for their students

### Data Retention
- Study sessions: retained for 1 year (for long-term progress tracking)
- Deleted accounts: all data purged within 30 days of deletion request
- AI conversation history: retained for 90 days for quality improvement, then anonymized

---

## 6. Infrastructure Security

### Backend Security (FastAPI + PostgreSQL)
- All database queries use **parameterized queries** — SQL injection is impossible
- API endpoints validate input types and lengths — no unvalidated input accepted
- Rate limiting on all endpoints — prevents DDoS and abuse
- CORS policy restricts API access to known frontend origins only
- Secret keys and API keys stored in `.env` (never in code, never in version control)

### AI API Security
- AI provider API keys (Gemini, Groq, Anthropic, OpenAI) live **only on the backend server**
- Frontend never receives or stores API keys
- Students cannot directly call AI providers — all requests go through the authenticated backend
- Each user has a daily AI call quota enforced server-side (not just frontend)

### Deployment Security
- HTTPS enforced (TLS 1.2+)
- HTTP → HTTPS redirect on all routes
- Security headers: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`
- Docker containerization — app runs in isolated environment

---

## 7. OWASP Top 10 — How VidyAI Addresses Each

| OWASP Risk | VidyAI Mitigation |
|-----------|-------------------|
| A01 - Broken Access Control | JWT auth on every endpoint; parent can only see their own child's data |
| A02 - Cryptographic Failures | bcrypt for passwords; HTTPS enforced; secrets in env vars |
| A03 - Injection | Parameterized SQL queries throughout; no raw SQL concatenation |
| A04 - Insecure Design | Principle of least privilege; parents get read-only access |
| A05 - Security Misconfiguration | CORS restricted; security headers set; default credentials disabled |
| A06 - Vulnerable Components | Regular `pip` / `npm` dependency audits |
| A07 - Auth Failures | JWT expiry; no password in logs; bcrypt hashing |
| A08 - Software/Data Integrity | AI keys server-side only; signed tokens |
| A09 - Logging Failures | Server-side logging of auth events; no PII in logs |
| A10 - SSRF | AI calls go through controlled service layer; no user-controlled URLs |

---

## 8. Trust Signals for School Presentations

When presenting to a school principal or IT committee, highlight:

1. **"No phone number required"** — reduces spam/phishing risk for students
2. **"Parent PIN supervision"** — school can require all parents to monitor via PIN
3. **"Education-only AI"** — cannot be misused for off-topic chatting
4. **"No third-party ads"** — students won't see ads or be tracked
5. **"Runs in browser"** — no app installation required, works on school computers
6. **"School vs School Muqabla"** — inter-school academic competition feature (positive engagement)
7. **"Data deletion on request"** — school can request complete data deletion for any student

---

## 9. Incident Response

If a security concern is ever raised:
- Contact: **security@vidyai.app** (create this address)
- Response time commitment: 24 hours for acknowledgement, 72 hours for investigation
- Serious breaches: notify affected users within 72 hours per DPDP Act requirements
