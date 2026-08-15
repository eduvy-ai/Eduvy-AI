// ─── Frontend API layer ──────────────────────────────────────
// All backend calls in one place.
// Auth token stored in localStorage under 'eduvyai_token'.
// Device ID kept as fallback for anonymous users.
import { API_BASE_URL } from './config'

// Safe JSON parsing - handles empty responses
async function safeJson(res) {
  const text = await res.text()
  if (!text || text.trim() === '') return null
  try {
    return JSON.parse(text)
  } catch {
    console.warn('Failed to parse JSON:', text.slice(0, 100))
    return null
  }
}

export function getDeviceId() {
  let id = localStorage.getItem('eduvyai_device_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('eduvyai_device_id', id)
  }
  return id
}

// ── Auth token helpers ────────────────────────────────────────
export function getAuthToken() {
  return localStorage.getItem('eduvyai_token') || null
}
export function setAuthToken(token) {
  if (token) localStorage.setItem('eduvyai_token', token)
  else localStorage.removeItem('eduvyai_token')
}
export function clearAuth() {
  localStorage.removeItem('eduvyai_token')
  localStorage.removeItem('eduvyai_profile')
}

function _authHeaders() {
  const token = getAuthToken()
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

// ── Auth API ─────────────────────────────────────────────────

export async function apiRegister({ email, password, name, standard, board, language, subjects, mobile, parent_mobile }) {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, standard, board, language, subjects, mobile: mobile || '', parent_mobile: parent_mobile || '' }),
    signal: AbortSignal.timeout(60000),
  })
  const data = await safeJson(res)
  if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
  return data // { token, profile }
}

export async function apiLogin({ email, password }) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(60000),
  })
  const data = await safeJson(res)
  if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)
  return data // { token, profile }
}

export async function apiGetMe() {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(30000),
  })
  if (res.status === 401 || res.status === 404) {
    clearAuth() // Clear stale token to prevent repeated 401/404
    return null
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}


// ── Profile ───────────────────────────────────────────────────
// NOTE: apiGetProfile (device-ID) removed — use apiGetMe() for auth flow.

export async function apiCreateProfile(data) {
  const res = await fetch(`${API_BASE_URL}/api/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiUpdateProfile(userId, data) {
  // Retry once on timeout (Render cold start can take 15-30s)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ..._authHeaders() },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(attempt === 0 ? 15000 : 25000),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.error('Profile update failed:', res.status, body)
        throw new Error(`HTTP ${res.status}`)
      }
      return safeJson(res)
    } catch (e) {
      if (attempt === 0 && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
        console.warn('Profile update timed out, retrying...')
        continue
      }
      throw e
    }
  }
}

// ── XP ────────────────────────────────────────────────────────

export async function apiGetAiUsage() {
  const res = await fetch(`${API_BASE_URL}/api/ai/usage`, {
    headers: { ..._authHeaders() },
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) return null
  return safeJson(res)
}

export async function apiAddXp(userId, points) {
  const res = await fetch(`${API_BASE_URL}/api/profile/${userId}/xp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ points }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)   // { xp: number }
}

// ── Streak ────────────────────────────────────────────────────

export async function apiUpdateStreak(deviceId, streak) {
  const res = await fetch(`${API_BASE_URL}/api/profile/${deviceId}/streak`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ streak }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)   // { streak: number }
}

// NOTE: apiSaveAIConfig and apiGetAIKeys removed.
// AI provider/model/keys are managed server-side only — never exposed to clients.

// ── Streak helper ─────────────────────────────────────────────
// Computes the correct streak value based on last_active date from backend.
// Returns { streak, changed } so caller knows if an API update is needed.
export function computeStreak(lastActive, currentStreak) {
  const today = new Date().toISOString().split('T')[0]
  if (lastActive === today) return { streak: currentStreak, changed: false }
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]
  const newStreak = lastActive === yesterday ? currentStreak + 1 : 1
  return { streak: newStreak, changed: true }
}

// ── Sathi Study Squads ────────────────────────────────────────

export async function apiGetMySquad() {
  const res = await fetch(`${API_BASE_URL}/api/squads/mine`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(6000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)   // { squad: { id, name, focus_subject, members, message_count } | null }
}

export async function apiMatchSquad() {
  const res = await fetch(`${API_BASE_URL}/api/squads/match`, {
    method: 'POST',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)   // { squad_id, status: 'joined'|'created'|'already_matched' }
}

export async function apiGetSquadMessages(squadId, sinceId = 0) {
  const res = await fetch(`${API_BASE_URL}/api/squads/${squadId}/messages?since_id=${sinceId}`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)   // { messages: [{ id, user_id, display_name, content, msg_type, created_at }] }
}

export async function apiSendSquadMessage(squadId, content, displayName, msgType = 'chat') {
  const res = await fetch(`${API_BASE_URL}/api/squads/${squadId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ content, display_name: displayName, msg_type: msgType }),
    signal: AbortSignal.timeout(6000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiGetSquadMembers(squadId) {
  const res = await fetch(`${API_BASE_URL}/api/squads/${squadId}/members`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)   // { members: [{ user_id, name, role, online, last_seen_at, standard }] }
}

export async function apiGetSquadChallenge(squadId) {
  const res = await fetch(`${API_BASE_URL}/api/squads/${squadId}/challenge`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)   // { challenge: { id, subject, concept, status } | null }
}

export async function apiCreateChallenge(squadId) {
  const res = await fetch(`${API_BASE_URL}/api/squads/${squadId}/challenge/create`, {
    method: 'POST',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)   // { challenge_id, subject, concept }
}

export async function apiSubmitChallenge(squadId, challengeId, explanation) {
  const res = await fetch(`${API_BASE_URL}/api/squads/${squadId}/challenge/${challengeId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ explanation }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)   // { completed, xp_awarded }
}

export async function apiLeaveSquad(squadId) {
  const res = await fetch(`${API_BASE_URL}/api/squads/${squadId}/leave`, {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

// ── Sathi — Doubts Board ──────────────────────────────────────
export async function apiGetSquadDoubts(squadId) {
  const res = await fetch(`${API_BASE_URL}/api/squads/${squadId}/doubts`, { headers: _authHeaders(), signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}
export async function apiGetDoubtQuota(squadId) {
  const res = await fetch(`${API_BASE_URL}/api/squads/${squadId}/doubts/quota`, { headers: _authHeaders(), signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}
export async function apiPostDoubt(squadId, data) {
  const res = await fetch(`${API_BASE_URL}/api/squads/${squadId}/doubts`, {
    method: 'POST', headers: { ..._authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data), signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) { const e = await safeJson(res).catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`) }
  return safeJson(res)
}
export async function apiGetDoubtAnswers(squadId, doubtId) {
  const res = await fetch(`${API_BASE_URL}/api/squads/${squadId}/doubts/${doubtId}/answers`, { headers: _authHeaders(), signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)

}
export async function apiPostAnswer(squadId, doubtId, data) {
  const res = await fetch(`${API_BASE_URL}/api/squads/${squadId}/doubts/${doubtId}/answers`, {
    method: 'POST', headers: { ..._authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data), signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) { const e = await safeJson(res).catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`) }
  return safeJson(res)
}
export async function apiUpvoteAnswer(squadId, doubtId, answerId) {
  const res = await fetch(`${API_BASE_URL}/api/squads/${squadId}/doubts/${doubtId}/answers/${answerId}/upvote`, {
    method: 'POST', headers: _authHeaders(), signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiPatchVerdict(squadId, doubtId, answerId, aiVerdict, aiNote) {
  const res = await fetch(`${API_BASE_URL}/api/squads/${squadId}/doubts/${doubtId}/answers/${answerId}/verdict`, {
    method: 'PATCH',
    headers: { ..._authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ai_verdict: aiVerdict, ai_note: aiNote }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

// ── Sathi — Streak + Daily + Session ─────────────────────────
export async function apiGetSquadStreak(squadId) {
  const res = await fetch(`${API_BASE_URL}/api/squads/${squadId}/streak`, { headers: _authHeaders(), signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}
export async function apiGetDailyConcept(squadId) {
  const res = await fetch(`${API_BASE_URL}/api/squads/${squadId}/daily`, { headers: _authHeaders(), signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}
export async function apiSubmitDailyExplain(squadId, explanation, xpOverride, aiVerdict, aiNote) {
  const body = { explanation }
  if (xpOverride)  body.xp_override = xpOverride
  if (aiVerdict)   body.ai_verdict  = aiVerdict
  if (aiNote)      body.ai_note     = aiNote
  const res = await fetch(`${API_BASE_URL}/api/squads/${squadId}/daily/explain`, {
    method: 'POST', headers: { ..._authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) { const e = await safeJson(res).catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`) }
  return safeJson(res)
}
export async function apiStartSession(squadId, displayName, minutes = 25) {
  const res = await fetch(`${API_BASE_URL}/api/squads/${squadId}/session/start`, {
    method: 'POST', headers: { ..._authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName, minutes }), signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

// ── Bhool Bazaar ──────────────────────────────────────────────

export async function apiCreateBhoolCard(data) {
  const res = await fetch(`${API_BASE_URL}/api/bhool/cards`, {
    method: 'POST',
    headers: { ..._authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiGetMyBhoolCards() {
  const res = await fetch(`${API_BASE_URL}/api/bhool/cards/mine`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiUpdateBhoolCard(cardId, data) {
  const res = await fetch(`${API_BASE_URL}/api/bhool/cards/${cardId}`, {
    method: 'PUT',
    headers: { ..._authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiDeleteBhoolCard(cardId) {
  const res = await fetch(`${API_BASE_URL}/api/bhool/cards/${cardId}`, {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiGetBhoolMarketplace({ subject, standard, sort, offset, limit } = {}) {
  const params = new URLSearchParams()
  if (subject)  params.set('subject', subject)
  if (standard) params.set('standard', standard)
  if (sort)     params.set('sort', sort)
  if (offset !== undefined) params.set('offset', String(offset))
  if (limit  !== undefined) params.set('limit',  String(limit))
  const res = await fetch(`${API_BASE_URL}/api/bhool/marketplace?${params}`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiGetBhoolTop(subject) {
  const params = subject ? `?subject=${encodeURIComponent(subject)}` : ''
  const res = await fetch(`${API_BASE_URL}/api/bhool/marketplace/top${params}`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiCollectBhoolCard(cardId) {
  const res = await fetch(`${API_BASE_URL}/api/bhool/cards/${cardId}/collect`, {
    method: 'POST',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiReactBhoolCard(cardId, emoji) {
  const res = await fetch(`${API_BASE_URL}/api/bhool/cards/${cardId}/react`, {
    method: 'POST',
    headers: { ..._authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ emoji }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiGetMyBhoolCollections() {
  const res = await fetch(`${API_BASE_URL}/api/bhool/collections`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

// ── Muqabla Battles ──────────────────────────────────────────

export async function apiCreateMuqablaChallenge(data) {
  const res = await fetch(`${API_BASE_URL}/api/muqabla/challenge`, {
    method: 'POST',
    headers: { ..._authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(30000), // AI generates questions
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiJoinMuqabalaBattle(battleId) {
  const res = await fetch(`${API_BASE_URL}/api/muqabla/battles/${battleId}/join`, {
    method: 'POST',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiDeclineMuqabalaBattle(battleId) {
  const res = await fetch(`${API_BASE_URL}/api/muqabla/battles/${battleId}/decline`, {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiSubmitMuqablaAnswers(battleId, data) {
  const res = await fetch(`${API_BASE_URL}/api/muqabla/battles/${battleId}/answer`, {
    method: 'POST',
    headers: { ..._authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiGetMuqabalaBattle(battleId) {
  const res = await fetch(`${API_BASE_URL}/api/muqabla/battles/${battleId}`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiGetOpenMuqabalaBattles() {
  const res = await fetch(`${API_BASE_URL}/api/muqabla/open`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiGetPendingMuqabalaBattles() {
  const res = await fetch(`${API_BASE_URL}/api/muqabla/pending`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiGetActiveMuqabalaBattles() {
  const res = await fetch(`${API_BASE_URL}/api/muqabla/active`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiGetMuqabalaHistory() {
  const res = await fetch(`${API_BASE_URL}/api/muqabla/history`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiGetMuqabalaLeaderboard() {
  const res = await fetch(`${API_BASE_URL}/api/muqabla/leaderboard`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiGetMuqabalaSchoolLeaderboard() {
  const res = await fetch(`${API_BASE_URL}/api/muqabla/school-leaderboard`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

// ── Parent Dashboard ─────────────────────────────────────────

export async function apiGetParentPin() {
  const res = await fetch(`${API_BASE_URL}/api/parent/pin`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiCreateParentPin() {
  const res = await fetch(`${API_BASE_URL}/api/parent/pin`, {
    method: 'POST',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiRevokeParentPin() {
  const res = await fetch(`${API_BASE_URL}/api/parent/pin`, {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

// Public — no auth header needed
export async function apiGetParentView(pin) {
  const res = await fetch(`${API_BASE_URL}/api/parent/view/${encodeURIComponent(pin)}`, {
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

// ── Mastery ───────────────────────────────────────────────────

export async function apiGetMastery(userId) {
  const res = await fetch(`${API_BASE_URL}/api/mastery/${userId}`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)   // { subject: score, ... }
}

export async function apiSetMastery(userId, subject, score) {
  const res = await fetch(`${API_BASE_URL}/api/mastery/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ subject, score }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

// ── Quiz Stats ────────────────────────────────────────────────

export async function apiSaveQuizResult(userId, { subject, difficulty, correct, total = 1 }) {
  const res = await fetch(`${API_BASE_URL}/api/quiz/${userId}/result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ subject, difficulty, correct, total }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiGetQuizStats(userId) {
  const res = await fetch(`${API_BASE_URL}/api/quiz/${userId}/stats`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)   // { subject: { total, correct, accuracy }, ... }
}

// ─── Notebook ────────────────────────────────────────────────

export async function apiGetSources(userId) {
  const res = await fetch(`${API_BASE_URL}/api/notebook/${userId}/sources`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)   // [{ id, name, type, content, icon, added_at }, ...]
}

export async function apiSaveSource(userId, source) {
  const res = await fetch(`${API_BASE_URL}/api/notebook/${userId}/sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({
      id: source.id,
      name: source.name,
      type: source.type,
      content: source.content,
      summary: source.summary || '',
      icon: source.icon,
      added_at: source.addedAt ?? source.added_at ?? 0,
    }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiDeleteSource(userId, sourceId) {
  const res = await fetch(`${API_BASE_URL}/api/notebook/${userId}/sources/${sourceId}`, {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiGetNotebookChat(userId) {
  const res = await fetch(`${API_BASE_URL}/api/notebook/${userId}/chat`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)   // [{ role, content }, ...]
}

export async function apiSaveChatMessage(userId, role, content) {
  const res = await fetch(`${API_BASE_URL}/api/notebook/${userId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ role, content }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiClearNotebookChat(userId) {
  const res = await fetch(`${API_BASE_URL}/api/notebook/${userId}/chat`, {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiGetStudioOutputs(userId) {
  const res = await fetch(`${API_BASE_URL}/api/notebook/${userId}/studio`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)   // [{ id, type, output_json, created_at, is_bookmarked }, ...]
}

export async function apiSaveStudioOutput(userId, type, outputJson) {
  const res = await fetch(`${API_BASE_URL}/api/notebook/${userId}/studio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ type, output_json: outputJson }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiDeleteStudioOutput(userId, outputId) {
  const res = await fetch(`${API_BASE_URL}/api/notebook/${userId}/studio/${outputId}`, {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiToggleStudioBookmark(userId, outputId) {
  const res = await fetch(`${API_BASE_URL}/api/notebook/${userId}/studio/${outputId}/bookmark`, {
    method: 'PATCH',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

// ── Notebook Upload Status & Violations ────────────────────────

export async function apiGetUploadStatus(userId) {
  const res = await fetch(`${API_BASE_URL}/api/notebook/${userId}/upload-status`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)  // { can_upload, sources_count, max_sources, violations, max_violations, blocked, block_reason }
}

export async function apiReportViolation(userId, reason = 'inappropriate_content') {
  const res = await fetch(`${API_BASE_URL}/api/notebook/${userId}/report-violation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ reason }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)  // { violations, blocked, block_reason, remaining_attempts }
}

// ── AI Vision - Extract content from images ────────────────────

export async function apiExtractImageContent(imageBase64, mimeType, prompt = '', language = 'English') {
  const res = await fetch(`${API_BASE_URL}/api/ai/vision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({
      image_base64: imageBase64,
      mime_type: mimeType,
      prompt,
      language,
    }),
    signal: AbortSignal.timeout(60000), // 60s timeout for vision
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)  // { content, is_educational, summary }
}

// ─── Chat Sessions (TutorTab, MentalLab) ─────────────────────

export async function apiGetSession(userId, session) {
  const res = await fetch(`${API_BASE_URL}/api/chat-session/${userId}/${session}`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)   // [{ role, content }, ...]
}

export async function apiSaveToSession(userId, session, role, content) {
  const res = await fetch(`${API_BASE_URL}/api/chat-session/${userId}/${session}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ role, content }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiClearSession(userId, session) {
  const res = await fetch(`${API_BASE_URL}/api/chat-session/${userId}/${session}`, {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

// ─── User Drafts (EssayLab, VideosTab, PodcastLab) ───────────

export async function apiGetDraft(userId, key) {
  const res = await fetch(`${API_BASE_URL}/api/draft/${userId}/${key}`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (res.status === 404 || (res.status === 200 && res.headers.get('content-length') === '4')) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)   // { content, extra } or null
}

export async function apiSaveDraft(userId, key, content, extra = '') {
  const res = await fetch(`${API_BASE_URL}/api/draft/${userId}/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ content, extra }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

// ── Referrals ─────────────────────────────────────────────────

export async function apiGetMyReferralCode() {
  const res = await fetch(`${API_BASE_URL}/api/referrals/code`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)  // { code, referred_count, referrer_xp_per_referral, referred_xp_bonus }
}

export async function apiApplyReferralCode(code) {
  const res = await fetch(`${API_BASE_URL}/api/referrals/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ code }),
    signal: AbortSignal.timeout(8000),
  })
  const data = await safeJson(res).catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
  return data  // { success, xp_awarded, message }
}

// ── Schools ───────────────────────────────────────────────────

export async function apiGetSchoolByCode(code) {
  const res = await fetch(`${API_BASE_URL}/api/schools/code/${encodeURIComponent(code)}`, {
    signal: AbortSignal.timeout(8000),
  })
  const data = await safeJson(res).catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `Invalid school code`)
  return data  // { name, city, is_active }
}

export async function apiJoinSchool(code) {
  const res = await fetch(`${API_BASE_URL}/api/schools/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ school_code: code }),
    signal: AbortSignal.timeout(10000),
  })
  const data = await safeJson(res).catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `Failed to join school`)
  return data  // { success, school_name, message }
}

// ── School Billing (Admin) ────────────────────────────────────

export async function apiGetSchoolPlanPrices() {
  const res = await fetch(`${API_BASE_URL}/api/payments/school-plans`, {
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)  // { school_basic: {...}, school_pro: {...} }
}

export async function apiCreateSchoolPaymentOrder(schoolId, plan, adminToken) {
  const res = await fetch(`${API_BASE_URL}/api/payments/school/create-order`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ school_id: schoolId, plan }),
    signal: AbortSignal.timeout(15000),
  })
  const data = await safeJson(res).catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
  return data  // { order_id, amount, currency, key_id, plan, school_name }
}

export async function apiVerifySchoolPayment(schoolId, orderId, paymentId, signature, adminToken) {
  const res = await fetch(`${API_BASE_URL}/api/payments/school/verify`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ 
      school_id: schoolId, 
      razorpay_order_id: orderId, 
      razorpay_payment_id: paymentId, 
      razorpay_signature: signature,
    }),
    signal: AbortSignal.timeout(15000),
  })
  const data = await safeJson(res).catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
  return data  // { success, plan, expires_at, student_limit }
}

// ── Payments (Razorpay) ───────────────────────────────────────

export async function apiGetPlanPrices() {
  const res = await fetch(`${API_BASE_URL}/api/payments/plans`, {
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)  // { basic: { amount_paise, amount_rupees, label, duration_days }, ... }
}

export async function apiCreatePaymentOrder(plan) {
  const res = await fetch(`${API_BASE_URL}/api/payments/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ plan }),
    signal: AbortSignal.timeout(15000),
  })
  const data = await safeJson(res).catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
  return data  // { order_id, amount, currency, key_id, plan, plan_label, user_name, user_email }
}

export async function apiVerifyPayment({ order_id, payment_id, signature, plan }) {
  const res = await fetch(`${API_BASE_URL}/api/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ order_id, payment_id, signature, plan }),
    signal: AbortSignal.timeout(15000),
  })
  const data = await safeJson(res).catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
  return data  // { success, plan, expires_at, message }
}

// ── Video Creator ─────────────────────────────────────────────

export async function apiVideoGenerate(data) {
  const res = await fetch(`${API_BASE_URL}/api/video/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(60000),
  })
  const json = await safeJson(res)
  if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`)
  return json
}

export async function apiVideoRender(videoId, scenes) {
  const res = await fetch(`${API_BASE_URL}/api/video/${encodeURIComponent(videoId)}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ scenes }),
    signal: AbortSignal.timeout(30000),
  })
  const json = await safeJson(res)
  if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`)
  return json
}

export async function apiVideoStatus(videoId) {
  const res = await fetch(`${API_BASE_URL}/api/video/${encodeURIComponent(videoId)}/status`, {
    headers: { ..._authHeaders() },
    signal: AbortSignal.timeout(10000),
  })
  const json = await safeJson(res)
  if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`)
  return json
}

export async function apiVideoLibrary({ limit = 20, offset = 0 } = {}) {
  const res = await fetch(`${API_BASE_URL}/api/video/library?limit=${limit}&offset=${offset}`, {
    headers: { ..._authHeaders() },
    signal: AbortSignal.timeout(10000),
  })
  const json = await safeJson(res)
  if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`)
  return json
}

export async function apiVideoDelete(videoId) {
  const res = await fetch(`${API_BASE_URL}/api/video/${encodeURIComponent(videoId)}`, {
    method: 'DELETE',
    headers: { ..._authHeaders() },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) {
    const json = await safeJson(res)
    throw new Error(json?.detail || `HTTP ${res.status}`)
  }
  return true
}

export async function apiVideoShare(videoId) {
  const res = await fetch(`${API_BASE_URL}/api/video/${encodeURIComponent(videoId)}/share`, {
    method: 'POST',
    headers: { ..._authHeaders() },
    signal: AbortSignal.timeout(10000),
  })
  const json = await safeJson(res)
  if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`)
  return json  // { share_token, share_url }
}

export async function apiVideoPublic(shareToken) {
  const res = await fetch(`${API_BASE_URL}/api/video/shared/${encodeURIComponent(shareToken)}`, {
    signal: AbortSignal.timeout(10000),
  })
  const json = await safeJson(res)
  if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`)
  return json
}

// ── Home Daily Content ────────────────────────────────────────

export async function apiGetDailyContent(contentType, language = 'English') {
  const res = await fetch(
    `${API_BASE_URL}/api/home/daily-content/${contentType}?language=${encodeURIComponent(language)}`,
    {
      headers: _authHeaders(),
      signal: AbortSignal.timeout(8000),
    }
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)  // { exists, content, language, date } or { exists: false, content: null }
}

export async function apiGetRecentPractice() {
  const res = await fetch(`${API_BASE_URL}/api/home/recent-practice`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return []
  return safeJson(res)  // [{ type, subject, score, total, difficulty, opponent_name, result, chapter_name, completed_at }]
}

export async function apiSaveDailyContent(contentType, content, language = 'English') {
  const res = await fetch(`${API_BASE_URL}/api/home/daily-content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ content_type: contentType, content, language }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)  // { content_type, content, language, date, exists }
}

// ── Chapter Progress API ──────────────────────────────────────

// Get subjects that have chapters seeded for a board+standard
export async function apiGetChapterSubjects(board, standard) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/chapters/subjects?board_id=${encodeURIComponent(board)}&standard_id=${encodeURIComponent(standard)}`, {
      headers: _authHeaders(),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = await safeJson(res)
    if (Array.isArray(data)) return data.map(s => s.subject_name || s.subject || s)
    return []
  } catch {
    return []
  }
}

// Notes
export async function apiGetChapterNotes(chapterId) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/notes`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res) || []
}

export async function apiCreateChapterNote(chapterId, content) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ content }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiUpdateChapterNote(chapterId, noteId, content) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/notes/${noteId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ content }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiDeleteChapterNote(chapterId, noteId) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/notes/${noteId}`, {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// Summary
export async function apiGetChapterSummary(chapterId) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/summary`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiSaveChapterSummary(chapterId, summary, keyPoints = []) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ summary: summary || '', key_points: keyPoints || [] }),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

// Uploads
export async function apiGetChapterUploads(chapterId) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/uploads`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res) || []
}

export async function apiCreateChapterUpload(chapterId, { name, url, file_type, file_size }) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/uploads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ name, url, file_type, file_size }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiDeleteChapterUpload(chapterId, uploadId) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/uploads/${uploadId}`, {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function apiGetChapterExtractedContent(chapterId) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/uploads/content`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res) || { content: '', has_content: false }
}

// Quiz History
export async function apiGetChapterQuizHistory(chapterId) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/quiz/history`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res) || []
}

export async function apiSaveChapterQuizHistory(chapterId, { mode, score, total, time_spent, questions }) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/quiz/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ mode, score, total, time_spent, questions }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiDeleteChapterQuizHistory(chapterId, historyId) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/quiz/history/${historyId}`, {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// Quiz Bookmarks
export async function apiGetChapterQuizBookmarks(chapterId) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/quiz/bookmarks`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res) || []
}

export async function apiSaveChapterQuizBookmark(chapterId, { question, options, correct_idx, explanation }) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/quiz/bookmarks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ question, options, correct_idx, explanation }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiDeleteChapterQuizBookmark(chapterId, bookmarkId) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/quiz/bookmarks/${bookmarkId}`, {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// Video History
export async function apiGetChapterVideoHistory(chapterId) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/videos/history`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res) || []
}

export async function apiSaveChapterVideoHistory(chapterId, { video_id, title, search_query, youtube_video_id }) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/videos/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ video_id, title, search_query, youtube_video_id }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiDeleteChapterVideoHistory(chapterId, historyId) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/videos/history/${historyId}`, {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// Video Bookmarks
export async function apiGetChapterVideoBookmarks(chapterId) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/videos/bookmarks`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res) || []
}

export async function apiSaveChapterVideoBookmark(chapterId, { video_id, title, description, concept, search_query, youtube_video_id }) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/videos/bookmarks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ video_id, title, description, concept, search_query, youtube_video_id }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiDeleteChapterVideoBookmark(chapterId, bookmarkId) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/videos/bookmarks/${bookmarkId}`, {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// Flashcard Sets
export async function apiGetChapterFlashcards(chapterId) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/flashcards`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res) || []
}

export async function apiSaveChapterFlashcards(chapterId, { chapter_name, cards }) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/flashcards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ name: chapter_name, cards }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiUpdateChapterFlashcards(chapterId, setId, { name, cards, mastery, reviewed_count }) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/flashcards/${setId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ name, cards, mastery, reviewed_count }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiDeleteChapterFlashcards(chapterId, setId) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/flashcards/${setId}`, {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// AI Chat Sessions
export async function apiGetChapterChatSessions(chapterId) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/chat/sessions`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res) || []
}

export async function apiCreateChapterChatSession(chapterId, title = 'New Chat') {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/chat/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ title }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiGetChapterChatMessages(chapterId, sessionId) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/chat/sessions/${sessionId}/messages`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res) || []
}

export async function apiSaveChapterChatMessage(chapterId, sessionId, { role, content }) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ role, content }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

export async function apiDeleteChapterChatSession(chapterId, sessionId) {
  const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/progress/chat/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

/**
 * Generate daily questions via backend AI - sends full student context.
 * Backend acts like a real teacher who knows the student.
 * @param {Object} context - Full student context
 * @returns {Promise<{questions: Array, saved: boolean}>}
 */
export async function apiGenerateDailyQuestions(context) {
  const res = await fetch(`${API_BASE_URL}/api/home/generate-daily-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({
      standard: context.standard || 'Class 8',
      board: context.board || 'CBSE',
      language: context.language || 'English',
      mood: context.mood || 'okay',
      math_mastery: context.mathMastery || 0,
      science_mastery: context.scienceMastery || 0,
      weak_topics: context.weakTopics || [],
      recent_topics: context.recentTopics || []
    }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

/**
 * Generate daily brief via backend AI - mood-aware.
 * @param {Object} context - Student context
 * @returns {Promise<{brief: string, saved: boolean}>}
 */
export async function apiGenerateDailyBrief(context) {
  const res = await fetch(`${API_BASE_URL}/api/home/generate-daily-brief`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({
      standard: context.standard || 'Class 8',
      board: context.board || 'CBSE',
      language: context.language || 'English',
      mood: context.mood || 'okay',
      subjects: context.subjects || []
    }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

/**
 * Generate study plan via backend AI.
 * @param {Object} context - Subject and student context
 * @returns {Promise<{plan: string, saved: boolean}>}
 */
export async function apiGenerateStudyPlan(context) {
  const res = await fetch(`${API_BASE_URL}/api/home/generate-study-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({
      subject: context.subject,
      mastery: context.mastery || 0,
      standard: context.standard || 'Class 10',
      board: context.board || 'CBSE',
      language: context.language || 'English'
    }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

/**
 * Generate exam oracle predictions via backend AI.
 * @param {Object} context - Student context
 * @returns {Promise<{topics: Array, saved: boolean}>}
 */
export async function apiGenerateExamOracle(context) {
  const res = await fetch(`${API_BASE_URL}/api/home/generate-exam-oracle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({
      standard: context.standard || 'Class 10',
      board: context.board || 'CBSE',
      language: context.language || 'English',
      subjects: context.subjects || []
    }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

/**
 * Generate deep dive content via backend AI.
 * @param {Object} context - Topic and student context
 * @returns {Promise<{content: string, saved: boolean}>}
 */
export async function apiGenerateDeepDive(context) {
  const res = await fetch(`${API_BASE_URL}/api/home/generate-deep-dive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({
      topic: context.topic,
      subject: context.subject,
      standard: context.standard || 'Class 10',
      board: context.board || 'CBSE',
      language: context.language || 'English'
    }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return safeJson(res)
}

// ── YouTube / LearnTV ─────────────────────────────────────────

export async function apiYouTubeSearch(query, limit = 12) {
  const res = await fetch(
    `${API_BASE_URL}/api/youtube/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    { headers: _authHeaders(), signal: AbortSignal.timeout(20000) }
  )
  if (!res.ok) return { results: [] }
  return safeJson(res)
}

export async function apiYouTubeSmartSearch(query, limit = 12, maxDuration = 180) {
  const res = await fetch(
    `${API_BASE_URL}/api/youtube/smart-search?q=${encodeURIComponent(query)}&limit=${limit}&max_duration=${maxDuration}`,
    { headers: _authHeaders(), signal: AbortSignal.timeout(38000) }
  )
  if (!res.ok) return { results: [] }
  return safeJson(res)
}

export async function apiYouTubeEduReels(query, limit = 16) {
  const res = await fetch(
    `${API_BASE_URL}/api/youtube/edu-reels?q=${encodeURIComponent(query)}&limit=${limit}`,
    { headers: _authHeaders(), signal: AbortSignal.timeout(42000) }
  )
  if (!res.ok) return { items: [] }
  return safeJson(res)
}

export async function apiYouTubeGetVideo(videoId) {
  const res = await fetch(
    `${API_BASE_URL}/api/youtube/video/${encodeURIComponent(videoId)}`,
    { headers: _authHeaders(), signal: AbortSignal.timeout(30000) }
  )
  if (!res.ok) return null
  return safeJson(res)
}
