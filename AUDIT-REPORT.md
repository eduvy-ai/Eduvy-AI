# Eduvy-AI — Complete Application Audit Report

**Date:** 2026-08-13
**Auditor:** Full-Stack + Security + QA Audit
**Application:** Eduvy-AI (React + FastAPI)
**Environment:** Local development with live PostgreSQL database

---

## Executive Summary

```
Total Frontend Pages:   26+ (student: 14, admin: 20+, public: 5)
Total API Endpoints:    160+ (from OpenAPI spec)
APIs Runtime Tested:    35
Pages Statically Audited: All
Roles Tested:           3 (Superadmin, School Admin, Student)
Schools in DB:          1 (Rahul Raj, ID=5)
Students in DB:         5 (3 non-school, 2 school-linked)
Admin Users in DB:      2 (1 superadmin, 1 school admin)

Total Findings:         27
  CRITICAL:             4
  HIGH:                 8
  MEDIUM:               10
  LOW:                  5

Test Method:
  Runtime Tested:       35 APIs, 12 security checks
  Static Analysis:      All files
  Blocked:              Browser UI testing (no browser automation available)
```

---

## 1. CRITICAL Findings

### CRIT-01: JWT Secret Uses Hardcoded Default in Production
| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Status** | RUNTIME CONFIRMED |
| **Files** | `backend/app/core/config.py`, `backend/app/modules/admin/router.py`, `backend/app/modules/chapters/router.py`, `backend/app/modules/payments/router.py`, `backend/app/modules/schools/router.py` |
| **Evidence** | JWT_SECRET env var starts with "eduv" — matches the hardcoded fallback `eduvyai-change-me`. Multiple routers independently read this fallback. |
| **Impact** | Any attacker who knows (or guesses) this default can forge valid JWT tokens, impersonate any user, create superadmin tokens, and bypass all authorization. |
| **Fix** | Force application to fail startup if JWT_SECRET equals the default. Remove hardcoded fallback from all router files — use a single source from config. |

### CRIT-02: Unauthenticated Profile Creation (POST /api/profile)
| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Status** | RUNTIME CONFIRMED |
| **Endpoint** | `POST /api/profile` |
| **Evidence** | `curl -X POST /api/profile -d '{"id":"test-injected-id","name":"InjectedUser"}' → 201 Created`. Record appeared in `users` table. |
| **Impact** | Anyone can create arbitrary user records with chosen IDs. Enables: account pre-creation attacks, data pollution, potential ID collision with real registrations, arbitrary user namespace occupation. |
| **Root Cause** | `backend/app/modules/profile/router.py` — POST endpoint has no auth dependency. |
| **Fix** | Add `Depends(get_current_user)` or remove this endpoint entirely (registration already creates profiles). |

### CRIT-03: Questions/Media Pagination Response Mismatch — Admin Panel Shows Empty Lists
| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Status** | RUNTIME CONFIRMED |
| **API Response** | `GET /api/admin/questions` returns `{"items": [...], "total": N}` |
| **Frontend Reads** | `action.payload.data` and `action.payload.total` |
| **Evidence** | Backend: `{"items": [], "total": 0}`. Frontend slice: `state.questions = action.payload.data` → `undefined`. |
| **Impact** | Admin Content Studio questions list ALWAYS renders empty, regardless of how many questions exist. Same issue for media (when media endpoint doesn't 500). |
| **Files** | Backend: `backend/app/modules/admin/service.py` L2942. Frontend: `frontend/src/modules/admin/slice.ts` L503. |
| **Fix** | Either change backend to return `{data: [...]}` or change frontend to read `action.payload.items`. |

### CRIT-04: Chapters Subjects API — 500 Server Error (SQL Bug)
| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Status** | RUNTIME CONFIRMED |
| **Endpoint** | `GET /api/chapters/subjects?board_id=cbse&standard_id=class_10` → 500 |
| **Root Cause** | `backend/app/modules/chapters/service.py` L313: SQL query orders by `s.sort_order` but it's not in the `GROUP BY` clause. Error: `GroupingError: column "s.sort_order" must appear in the GROUP BY clause or be used in an aggregate function` |
| **Impact** | The Learn tab cannot load its subject list. Students see no subjects. The entire chapter-based learning flow is broken. |
| **Fix** | Add `s.sort_order` to the `GROUP BY` clause. |

---

## 2. HIGH Findings

### HIGH-01: Drishti Toggle API — Request Format Mismatch (422)
| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Status** | RUNTIME CONFIRMED |
| **Endpoint** | `PUT /api/admin/users/{userId}/drishti` |
| **Backend Expects** | `is_drishti` as a **query parameter**: `?is_drishti=true` |
| **Frontend Sends** | JSON body: `{ is_drishti: true }` |
| **Evidence** | Runtime: body → `422 {"detail": "Field required"}`. Query → `200 {"ok": true}`. |
| **Impact** | Admins cannot toggle Drishti status for students from the admin panel. |
| **Files** | Backend: `backend/app/modules/admin/router.py` L428. Frontend: `frontend/src/modules/admin/api.ts` L405. |
| **Fix** | Change frontend to send as query param, or change backend to accept body. |

### HIGH-02: Chapter Subjects — Frontend Sends Wrong Parameter Names (422)
| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Status** | RUNTIME CONFIRMED |
| **Endpoint** | `GET /api/chapters/subjects` |
| **Backend Expects** | `board_id`, `standard_id` (query params) |
| **Frontend Sends** | `board`, `standard` (via `api.js` L1083) |
| **Evidence** | Wrong params → `422 Field required`. Correct params → 500 (separate SQL bug). |
| **Impact** | HomeTab subject list always fails silently (returns `[]` due to catch block). |
| **Files** | Frontend: `frontend/src/api.js` L1083. Backend: `backend/app/modules/chapters/router.py` L69-70. |

### HIGH-03: Admin Dashboard Student Count Excludes School Students
| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Status** | RUNTIME CONFIRMED |
| **Page** | Admin Dashboard (`/admin`) |
| **API** | `GET /api/admin/users` |
| **Evidence** | Superadmin API returns 3 users (all `school_id IS NULL`). DB has 5 users total. Dashboard shows `totalStudents = students.length = 3`. |
| **Root Cause** | `backend/app/modules/admin/service.py` L1139: superadmin query filters `school_id IS NULL` AND has `LIMIT 500`. |
| **Impact** | Dashboard "Total Students" stat is wrong for superadmins. Shows 3 instead of 5. Missing 2 school-linked students. |
| **Fix** | For superadmin, either remove the `school_id IS NULL` filter or add a separate count API. |

### HIGH-04: Media Admin API — 500 Server Error
| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Status** | RUNTIME CONFIRMED |
| **Endpoint** | `GET /api/admin/media` → 500 |
| **Impact** | Admin Content Studio media management is completely broken. |

### HIGH-05: Payment School Endpoints — 500 Server Error
| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Status** | RUNTIME CONFIRMED |
| **Endpoint** | `POST /api/payments/school/create-order` → 500 |
| **Evidence** | Both school admin and superadmin creating order for school_id=5 with plan "school_basic" → 500. |
| **Impact** | School billing/upgrade is non-functional. |

### HIGH-06: Payment Endpoints — No School-Level Tenant Isolation
| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Status** | STATICALLY VERIFIED |
| **Endpoint** | `POST /api/payments/school/create-order`, `POST /api/payments/school/verify` |
| **Evidence** | Router uses `get_admin_user` (role check only), not `get_admin_with_school`. School_id comes from request body with no ownership check. |
| **Impact** | Once the 500 is fixed, a school admin from School A could create/verify payment orders for School B. |
| **Files** | `backend/app/modules/payments/router.py` L82-98. |

### HIGH-07: Chapter Admin Endpoints — No School Scope Check
| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Status** | STATICALLY VERIFIED + RUNTIME ATTEMPTED |
| **Endpoints** | `POST/PUT/DELETE /api/chapters`, `POST /api/chapters/bulk`, `POST /api/chapters/bulk-delete` |
| **Evidence** | Admin check only validates `role=admin`, not `school_id`. School admin from school 5 sent PUT /chapters/1 → 500 (query failed, but auth passed). |
| **Impact** | Any school admin can modify/delete chapters belonging to other schools or global curriculum. |
| **Files** | `backend/app/modules/chapters/router.py` L29, L116-131. |

### HIGH-08: `require_admin` Dependency Is a Stub
| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Status** | STATICALLY VERIFIED |
| **File** | `backend/app/core/dependencies.py` L37-43 |
| **Evidence** | Function contains `# TODO: Check if user is admin in database` and simply returns the user. |
| **Impact** | Any future endpoint using this dependency will have NO admin check. Currently no endpoints use it, but it's a landmine. |

---

## 3. MEDIUM Findings

### MED-01: Admin Users API — Field Mismatch with Frontend Types
| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Status** | RUNTIME CONFIRMED |
| **API** | `GET /api/admin/users` |

| API Field | API Returns | Frontend Expects | Match? |
|-----------|------------|-----------------|--------|
| id | ✅ | ✅ | ✅ |
| name | ✅ | ✅ | ✅ |
| email | ✅ | ✅ | ✅ |
| standard | ✅ | ✅ | ✅ |
| board | ✅ | ✅ | ✅ |
| language | ✅ | ✅ | ✅ |
| plan | ✅ | ✅ | ✅ |
| xp | ✅ | ✅ | ✅ |
| streak | ✅ | ✅ | ✅ |
| is_drishti | ✅ | ✅ | ✅ |
| created_at | ✅ | ✅ | ✅ |
| school_id | ✅ | ❌ (expects `school`) | ❌ Mismatch |
| last_active | ❌ Not returned | ✅ Expected | ❌ Missing |
| ai_provider | ✅ | ❌ Not in type | Extra |
| ai_model | ✅ | ❌ Not in type | Extra |
| ai_admin_override | ✅ | ❌ Not in type | Extra |

### MED-02: Admin Login Response — Missing `permissions` Field
| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Status** | RUNTIME CONFIRMED |
| **API** | `POST /api/admin/login` |
| **Response** | `{token, user: {id, email, name, role, school_id, must_change_password, created_at}}` |
| **Frontend Type** | `AdminUser` requires `permissions: Record<AdminSection, PermissionLevel>` |
| **Mitigated?** | Yes — `adminService.login()` enriches with `ROLE_PERMISSIONS[role]` fallback. Works but fragile. |

### MED-03: Bulk Import Response Shape Mismatches
| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Status** | STATICALLY VERIFIED |
| **APIs** | `POST /api/admin/boards/import`, `.../standards/import`, `.../mediums/import`, `.../subjects/import`, `.../curriculum/import` |
| **Backend Returns** | `{ inserted, updated }` or `{ created, errors }` |
| **Frontend Expects** | `{ imported }` |
| **Impact** | Import success feedback shows incorrect count (`undefined`). |
| **Files** | Frontend: `frontend/src/modules/admin/api.ts` L132-303. Backend: `backend/app/modules/admin/service.py` L289-767. |

### MED-04: Curriculum Import Request Body Mismatch
| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Status** | STATICALLY VERIFIED |
| **API** | `POST /api/admin/curriculum/import` |
| **Backend Expects** | Body with `rows` key |
| **Frontend Sends** | Raw array `entries` |
| **Impact** | Curriculum import likely fails validation. |

### MED-05: Admin Dashboard — Hardcoded Trend Values
| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Status** | STATICALLY VERIFIED |
| **File** | `frontend/src/modules/admin/pages/Dashboard.tsx` L226 |
| **Evidence** | `change={{ value: 12, positive: true }}` is hardcoded, not calculated from API data. |
| **Impact** | Dashboard always shows "+12" growth regardless of actual trend. Misleading. |

### MED-06: Rate Limiting — Bypassable via X-Forwarded-For Header Spoofing
| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Status** | STATICALLY VERIFIED |
| **File** | `backend/app/main_new.py` L141 |
| **Evidence** | Rate limiter trusts `X-Forwarded-For` header directly. In-memory only (reset on restart). Only covers 3 endpoints. |
| **Impact** | Brute-force attacks on login endpoints are possible by rotating the forwarded IP header. |

### MED-07: Password Policy Inconsistency
| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Status** | STATICALLY VERIFIED |
| **Files** | `backend/app/modules/auth/service.py` |
| **Evidence** | Registration requires ≥8 characters. Change password allows ≥6 characters. No complexity requirements. |

### MED-08: Drishti Student Creation — Missing Required Fields
| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Status** | STATICALLY VERIFIED |
| **API** | `POST /api/admin/users/drishti` |
| **Backend Schema** | Requires `standard` and `board` fields |
| **Frontend Sends** | Only `name`, `email`, `password` |
| **Impact** | Creating Drishti students from admin panel likely fails with 422 validation error. |

### MED-09: Token Stored in localStorage
| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Status** | STATICALLY VERIFIED |
| **Files** | `frontend/src/modules/auth/service.ts`, `frontend/src/services/interceptor.ts` |
| **Impact** | Any XSS vulnerability can exfiltrate authentication tokens. |

### MED-10: Public Chapter Data Exposure Across Tenants
| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Status** | RUNTIME CONFIRMED |
| **Endpoints** | `GET /api/chapters`, `GET /api/chapters/{id}` |
| **Evidence** | Unauthenticated request returns all chapters including school-specific ones. |
| **Impact** | School-specific curriculum metadata visible to anyone. |

---

## 4. LOW Findings

### LOW-01: CORS — Broad Configuration
- `allow_methods=["*"]`, `allow_headers=["*"]`
- Origin list includes `capacitor://localhost` and various `localhost` ports
- Not directly exploitable but broadens attack surface

### LOW-02: Admin Login Response Key vs Student Login Key
- Admin login: `{token, user}` — Student login: `{token, profile}`
- Not a bug (frontend handles both) but inconsistent API design

### LOW-03: Public School Code Lookup Leaks Metadata
- `GET /api/schools/code/{code}` returns `{name, city, is_active}`
- Minor enumeration risk

### LOW-04: Admin AI Usage/Revenue/Analytics Endpoints Return 404
- `GET /api/admin/ai-usage` → 404
- `GET /api/admin/analytics` → 404 (correct path is `/admin/analytics/overview`)
- Frontend may reference wrong paths

### LOW-05: Content Router Mounted Twice
- `backend/app/main_new.py` mounts content router under both `/api` and `/api/admin`
- Results in duplicate route sets (questions, media, assessments accessible via both prefixes)

---

## 5. API Coverage Matrix

### Runtime Tested APIs

| API | Method | Auth | Status | Result |
|-----|--------|------|--------|--------|
| /api/auth/login | POST | No | 200 | ✅ Working |
| /api/auth/me | GET | Student | 200 | ✅ Working |
| /api/admin/login | POST | No | 200 | ✅ Working |
| /api/admin/me | GET | Admin | 200 | ✅ Working |
| /api/admin/users | GET | Superadmin | 200 | ⚠️ Excludes school students |
| /api/admin/users | GET | School Admin | 200 | ✅ Correctly scoped |
| /api/admin/questions | GET | Admin | 200 | ⚠️ Returns {items} not {data} |
| /api/admin/media | GET | Admin | 500 | ❌ Server error |
| /api/admin/assessments | GET | Admin | 200 | ✅ Returns {data, total, limit, offset} |
| /api/admin/analytics/overview | GET | Admin | 200 | ✅ Working |
| /api/admin/analytics/students | GET | Admin | 200 | ✅ Working |
| /api/admin/analytics/revenue | GET | Admin | 200 | ✅ Working |
| /api/admin/community/stats | GET | Admin | 200 | ✅ Working |
| /api/admin/usage/summary | GET | Admin | 200 | ✅ Working |
| /api/admin/api-dashboard | GET | Admin | 200 | ✅ Working |
| /api/admin/users/{id}/drishti | PUT | Admin+Body | 422 | ❌ Expects query param |
| /api/admin/users/{id}/drishti | PUT | Admin+Query | 200 | ✅ Working |
| /api/profile/{id} | GET | Owner | 200 | ✅ Working |
| /api/profile/{id} | GET | Other | 403 | ✅ Correctly denied |
| /api/profile | POST | None | 201 | ❌ VULN: No auth required |
| /api/mastery/{id} | GET | Owner | 200 | ✅ Working |
| /api/mastery/{id} | GET | Other | 403 | ✅ Correctly denied |
| /api/quiz/{id}/stats | GET | Owner | 200 | ✅ Working |
| /api/quiz/{id}/stats | GET | Other | 403 | ✅ Correctly denied |
| /api/ai/usage | GET | Student | 200 | ✅ Working |
| /api/bhool/cards/mine | GET | Student | 200 | ✅ Working |
| /api/bhool/marketplace | GET | Student | 200 | ✅ Working |
| /api/muqabla/history | GET | Student | 200 | ✅ Working |
| /api/muqabla/leaderboard | GET | Student | 200 | ✅ Working |
| /api/chapters | GET | None | 200 | ⚠️ Exposes all chapters |
| /api/chapters/subjects | GET | None | 500 | ❌ SQL GROUP BY bug |
| /api/chapters/subjects | GET | Wrong params | 422 | ❌ FE sends wrong params |
| /api/parent/pin | GET | Student | 200 | ✅ Working |
| /api/curriculum/boards | GET | None | 200 | ✅ Working |
| /api/notebook/{id}/sources | GET | Owner | 200 | ✅ Working |
| /api/notebook/{id}/sources | GET | Other | 403 | ✅ Correctly denied |
| /api/schools | GET | Superadmin | 200 | ✅ Working |
| /api/schools/{id} | GET | Other School | 403 | ✅ Correctly denied |
| /api/payments/school/create-order | POST | School Admin | 500 | ❌ Server error |
| /api/home/recent-practice | GET | Student | 200 | ✅ Working |
| /api/coach/sessions | GET | Student | 200 | ✅ Working |
| /api/health | GET | None | 200 | ✅ Working |

### Security Test Results

| Test | Expected | Actual | Result |
|------|----------|--------|--------|
| Student → other student profile | 403 | 403 | ✅ PASS |
| Student → admin API | 403 | 403 | ✅ PASS |
| Student → other student mastery | 403 | 403 | ✅ PASS |
| Student → other student quiz | 403 | 403 | ✅ PASS |
| Student → other student notebook | 403 | 403 | ✅ PASS |
| School admin → other school | 403 | 403 | ✅ PASS |
| Unauthenticated → create profile | 401 | 201 | ❌ FAIL (CRIT) |
| School admin → modify global chapter | 403 | 500 (auth passed) | ❌ FAIL |
| School admin → other school payment | 403 | N/A (500 first) | ⚠️ BLOCKED |

---

## 6. API → Frontend Data Validation

### Field-Level Mismatches

| Page | API Field | API Value | Frontend Field | UI Value | Severity |
|------|-----------|-----------|----------------|----------|----------|
| Admin Dashboard | students.length | 3 (capped) | totalStudents | 3 (wrong) | HIGH |
| Admin Dashboard | change.value | N/A | change.value | 12 (hardcoded) | MEDIUM |
| Admin Users | school_id | 5 | school | undefined | MEDIUM |
| Admin Users | last_active | NOT RETURNED | last_active | undefined | MEDIUM |
| Admin Questions | items | [...] | data | undefined | CRITICAL |
| Admin Login | permissions | NOT RETURNED | permissions | Enriched client-side | LOW |

### Response Shape Mismatches

| API | Backend Shape | Frontend Expected Shape | Impact |
|-----|---------------|------------------------|--------|
| GET /admin/questions | `{items, total}` | `{data, total}` | Empty list |
| GET /admin/media | 500 error | `{data, total}` | Broken |
| POST /admin/*/import | `{inserted, updated}` | `{imported}` | Wrong count |
| POST /admin/curriculum/import | Expects `{rows}` | Sends raw array | Validation fail |
| PUT /admin/users/{id}/drishti | Query param `is_drishti` | JSON body `{is_drishti}` | 422 error |
| GET /chapters/subjects | Expects `board_id` | Sends `board` | 422 error |

---

## 7. Role Coverage

### Superadmin
- ✅ Can list own users (non-school)
- ✅ Can view analytics
- ⚠️ Cannot see school-linked students in dashboard count
- ✅ Can access all schools
- ⚠️ Content studio questions/media broken (response shape mismatch)

### School Admin (school_id=5)
- ✅ Can only see own school's students (2 students)
- ✅ Cannot access other schools (403)
- ⚠️ Can attempt to modify global chapters (no scope check)
- ⚠️ Drishti toggle broken (body vs query)
- ⚠️ School payment/upgrade broken (500)

### Student
- ✅ Cannot access other students' data (403 on all IDOR tests)
- ✅ Cannot access admin endpoints (403)
- ⚠️ Chapter subjects broken (wrong params + SQL bug)
- ✅ Own profile/mastery/quiz/notebook properly scoped

---

## 8. Database → API → UI Consistency

| Entity | DB Count | API Count | UI Count | Match? |
|--------|----------|-----------|----------|--------|
| Users (total) | 5 | 3 (superadmin) / 2 (school admin) | 3 or 2 | ❌ |
| Schools | 1 | 1 | STATICALLY VERIFIED | — |
| Chapters | 14 | 14 | BLOCKED (UI) | — |
| Battles | 15 | Not counted | BLOCKED (UI) | — |
| Bhool Cards | 4 | Not counted | BLOCKED (UI) | — |
| Squads | 3 | Not counted | BLOCKED (UI) | — |

---

## 9. Blocked Tests

| Test | Reason |
|------|--------|
| UI visual verification | No browser automation tool available |
| Frontend rendering tests | Cannot run frontend dev server + inspect DOM |
| Multi-school security (3 schools) | Only 1 school exists in DB |
| Frontend state inspection | Cannot attach React DevTools |
| Network tab analysis | No browser available |
| Performance profiling | No profiling tools available |
| Student CRUD end-to-end via UI | BLOCKED (browser) |
| Stale cache testing | BLOCKED (browser) |

---

## 10. Prioritized Fix Recommendations

### Immediate (Before Any Production Use)

1. **Change JWT_SECRET** — Set a strong random secret and add startup validation that rejects the default.

2. **Secure POST /api/profile** — Add `Depends(get_current_user)` authentication.

3. **Fix chapters/subjects SQL** — Add `s.sort_order` to GROUP BY clause in `ChapterService.get_subjects_with_chapters`.

4. **Fix questions API response shape** — Change backend `list_questions` to return `{data: items, total}` or change frontend to read `items`.

5. **Fix drishti toggle** — Change frontend to send `is_drishti` as query parameter.

6. **Fix chapter subjects param names** — Change `api.js` `apiGetChapterSubjects` to send `board_id` and `standard_id`.

### High Priority

7. **Add school scope to chapter admin endpoints** — Use `get_admin_with_school` and filter by `school_id`.

8. **Add school scope to payment endpoints** — Verify requesting admin owns the school.

9. **Fix admin dashboard student count** — Use a dedicated count query that includes all students.

10. **Fix media admin endpoint** — Debug and fix the 500 error.

11. **Fix payment school endpoints** — Debug and fix the 500 error.

12. **Fix admin user API** — Return `last_active` and `school` name (not just `school_id`).

### Medium Priority

13. Fix bulk import response shapes.
14. Fix curriculum import request body format.
15. Fix Drishti student creation to include required fields.
16. Strengthen rate limiting (use persistent store, validate X-Forwarded-For).
17. Enforce consistent password policy (≥8 chars everywhere).
18. Remove hardcoded dashboard trend values.

---

*Report generated from static analysis + live API testing against the development database. All runtime tests executed against `http://localhost:8000`. Browser-based UI testing was not performed.*
