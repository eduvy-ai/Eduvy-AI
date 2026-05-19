// ─── Frontend API layer ──────────────────────────────────────
// All backend calls in one place.
// Auth token stored in localStorage under 'eduvyai_token'.
// Device ID kept as fallback for anonymous users.

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
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, standard, board, language, subjects, mobile: mobile || '', parent_mobile: parent_mobile || '' }),
    signal: AbortSignal.timeout(15000),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
  return data // { token, profile }
}

export async function apiLogin({ email, password }) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(10000),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
  return data // { token, profile }
}

export async function apiGetMe() {
  const res = await fetch('/api/auth/me', {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (res.status === 401 || res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}


// ── Profile ───────────────────────────────────────────────────
// NOTE: apiGetProfile (device-ID) removed — use apiGetMe() for auth flow.

export async function apiCreateProfile(data) {
  const res = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiUpdateProfile(userId, data) {
  const res = await fetch(`/api/profile/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── XP ────────────────────────────────────────────────────────

export async function apiAddXp(userId, points) {
  const res = await fetch(`/api/profile/${userId}/xp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ points }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // { xp: number }
}

// ── Streak ────────────────────────────────────────────────────

export async function apiUpdateStreak(deviceId, streak) {
  const res = await fetch(`/api/profile/${deviceId}/streak`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ streak }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // { streak: number }
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
  const res = await fetch('/api/squads/mine', {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(6000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // { squad: { id, name, focus_subject, members, message_count } | null }
}

export async function apiMatchSquad() {
  const res = await fetch('/api/squads/match', {
    method: 'POST',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // { squad_id, status: 'joined'|'created'|'already_matched' }
}

export async function apiGetSquadMessages(squadId, sinceId = 0) {
  const res = await fetch(`/api/squads/${squadId}/messages?since_id=${sinceId}`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // { messages: [{ id, user_id, display_name, content, msg_type, created_at }] }
}

export async function apiSendSquadMessage(squadId, content, displayName, msgType = 'chat') {
  const res = await fetch(`/api/squads/${squadId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ content, display_name: displayName, msg_type: msgType }),
    signal: AbortSignal.timeout(6000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiGetSquadMembers(squadId) {
  const res = await fetch(`/api/squads/${squadId}/members`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // { members: [{ user_id, name, role, online, last_seen_at, standard }] }
}

export async function apiGetSquadChallenge(squadId) {
  const res = await fetch(`/api/squads/${squadId}/challenge`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // { challenge: { id, subject, concept, status } | null }
}

export async function apiCreateChallenge(squadId) {
  const res = await fetch(`/api/squads/${squadId}/challenge/create`, {
    method: 'POST',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // { challenge_id, subject, concept }
}

export async function apiSubmitChallenge(squadId, challengeId, explanation) {
  const res = await fetch(`/api/squads/${squadId}/challenge/${challengeId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ explanation }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // { completed, xp_awarded }
}

export async function apiLeaveSquad(squadId) {
  const res = await fetch(`/api/squads/${squadId}/leave`, {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Sathi — Doubts Board ──────────────────────────────────────
export async function apiGetSquadDoubts(squadId) {
  const res = await fetch(`/api/squads/${squadId}/doubts`, { headers: _authHeaders(), signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
export async function apiGetDoubtQuota(squadId) {
  const res = await fetch(`/api/squads/${squadId}/doubts/quota`, { headers: _authHeaders(), signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
export async function apiPostDoubt(squadId, data) {
  const res = await fetch(`/api/squads/${squadId}/doubts`, {
    method: 'POST', headers: { ..._authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data), signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`) }
  return res.json()
}
export async function apiGetDoubtAnswers(squadId, doubtId) {
  const res = await fetch(`/api/squads/${squadId}/doubts/${doubtId}/answers`, { headers: _authHeaders(), signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
export async function apiPostAnswer(squadId, doubtId, data) {
  const res = await fetch(`/api/squads/${squadId}/doubts/${doubtId}/answers`, {
    method: 'POST', headers: { ..._authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data), signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`) }
  return res.json()
}
export async function apiUpvoteAnswer(squadId, doubtId, answerId) {
  const res = await fetch(`/api/squads/${squadId}/doubts/${doubtId}/answers/${answerId}/upvote`, {
    method: 'POST', headers: _authHeaders(), signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiPatchVerdict(squadId, doubtId, answerId, aiVerdict, aiNote) {
  const res = await fetch(`/api/squads/${squadId}/doubts/${doubtId}/answers/${answerId}/verdict`, {
    method: 'PATCH',
    headers: { ..._authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ai_verdict: aiVerdict, ai_note: aiNote }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Sathi — Streak + Daily + Session ─────────────────────────
export async function apiGetSquadStreak(squadId) {
  const res = await fetch(`/api/squads/${squadId}/streak`, { headers: _authHeaders(), signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
export async function apiGetDailyConcept(squadId) {
  const res = await fetch(`/api/squads/${squadId}/daily`, { headers: _authHeaders(), signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
export async function apiSubmitDailyExplain(squadId, explanation, xpOverride, aiVerdict, aiNote) {
  const body = { explanation }
  if (xpOverride)  body.xp_override = xpOverride
  if (aiVerdict)   body.ai_verdict  = aiVerdict
  if (aiNote)      body.ai_note     = aiNote
  const res = await fetch(`/api/squads/${squadId}/daily/explain`, {
    method: 'POST', headers: { ..._authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`) }
  return res.json()
}
export async function apiStartSession(squadId, displayName, minutes = 25) {
  const res = await fetch(`/api/squads/${squadId}/session/start`, {
    method: 'POST', headers: { ..._authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName, minutes }), signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Bhool Bazaar ──────────────────────────────────────────────

export async function apiCreateBhoolCard(data) {
  const res = await fetch('/api/bhool/cards', {
    method: 'POST',
    headers: { ..._authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiGetMyBhoolCards() {
  const res = await fetch('/api/bhool/cards/mine', {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiUpdateBhoolCard(cardId, data) {
  const res = await fetch(`/api/bhool/cards/${cardId}`, {
    method: 'PUT',
    headers: { ..._authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiDeleteBhoolCard(cardId) {
  const res = await fetch(`/api/bhool/cards/${cardId}`, {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiGetBhoolMarketplace({ subject, standard, sort, offset, limit } = {}) {
  const params = new URLSearchParams()
  if (subject)  params.set('subject', subject)
  if (standard) params.set('standard', standard)
  if (sort)     params.set('sort', sort)
  if (offset !== undefined) params.set('offset', String(offset))
  if (limit  !== undefined) params.set('limit',  String(limit))
  const res = await fetch(`/api/bhool/marketplace?${params}`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiGetBhoolTop(subject) {
  const params = subject ? `?subject=${encodeURIComponent(subject)}` : ''
  const res = await fetch(`/api/bhool/marketplace/top${params}`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiCollectBhoolCard(cardId) {
  const res = await fetch(`/api/bhool/cards/${cardId}/collect`, {
    method: 'POST',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiReactBhoolCard(cardId, emoji) {
  const res = await fetch(`/api/bhool/cards/${cardId}/react`, {
    method: 'POST',
    headers: { ..._authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ emoji }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiGetMyBhoolCollections() {
  const res = await fetch('/api/bhool/collections', {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Muqabla Battles ──────────────────────────────────────────

export async function apiCreateMuqablaChallenge(data) {
  const res = await fetch('/api/muqabla/challenge', {
    method: 'POST',
    headers: { ..._authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(30000), // AI generates questions
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiJoinMuqabalaBattle(battleId) {
  const res = await fetch(`/api/muqabla/battles/${battleId}/join`, {
    method: 'POST',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiDeclineMuqabalaBattle(battleId) {
  const res = await fetch(`/api/muqabla/battles/${battleId}/decline`, {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiSubmitMuqablaAnswers(battleId, data) {
  const res = await fetch(`/api/muqabla/battles/${battleId}/answer`, {
    method: 'POST',
    headers: { ..._authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiGetMuqabalaBattle(battleId) {
  const res = await fetch(`/api/muqabla/battles/${battleId}`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiGetOpenMuqabalaBattles() {
  const res = await fetch('/api/muqabla/open', {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiGetPendingMuqabalaBattles() {
  const res = await fetch('/api/muqabla/pending', {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiGetActiveMuqabalaBattles() {
  const res = await fetch('/api/muqabla/active', {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiGetMuqabalaHistory() {
  const res = await fetch('/api/muqabla/history', {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiGetMuqabalaLeaderboard() {
  const res = await fetch('/api/muqabla/leaderboard', {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiGetMuqabalaSchoolLeaderboard() {
  const res = await fetch('/api/muqabla/school-leaderboard', {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Parent Dashboard ─────────────────────────────────────────

export async function apiGetParentPin() {
  const res = await fetch('/api/parent/pin', {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiCreateParentPin() {
  const res = await fetch('/api/parent/pin', {
    method: 'POST',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiRevokeParentPin() {
  const res = await fetch('/api/parent/pin', {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Public — no auth header needed
export async function apiGetParentView(pin) {
  const res = await fetch(`/api/parent/view/${encodeURIComponent(pin)}`, {
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Mastery ───────────────────────────────────────────────────

export async function apiGetMastery(userId) {
  const res = await fetch(`/api/mastery/${userId}`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // { subject: score, ... }
}

export async function apiSetMastery(userId, subject, score) {
  const res = await fetch(`/api/mastery/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ subject, score }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Quiz Stats ────────────────────────────────────────────────

export async function apiSaveQuizResult(userId, { subject, difficulty, correct, total = 1 }) {
  const res = await fetch(`/api/quiz/${userId}/result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ subject, difficulty, correct, total }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiGetQuizStats(userId) {
  const res = await fetch(`/api/quiz/${userId}/stats`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // { subject: { total, correct, accuracy }, ... }
}

// ─── Notebook ────────────────────────────────────────────────

export async function apiGetSources(userId) {
  const res = await fetch(`/api/notebook/${userId}/sources`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // [{ id, name, type, content, icon, added_at }, ...]
}

export async function apiSaveSource(userId, source) {
  const res = await fetch(`/api/notebook/${userId}/sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({
      id: source.id,
      name: source.name,
      type: source.type,
      content: source.content,
      icon: source.icon,
      added_at: source.addedAt ?? source.added_at ?? 0,
    }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiDeleteSource(userId, sourceId) {
  const res = await fetch(`/api/notebook/${userId}/sources/${sourceId}`, {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiGetNotebookChat(userId) {
  const res = await fetch(`/api/notebook/${userId}/chat`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // [{ role, content }, ...]
}

export async function apiSaveChatMessage(userId, role, content) {
  const res = await fetch(`/api/notebook/${userId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ role, content }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiClearNotebookChat(userId) {
  const res = await fetch(`/api/notebook/${userId}/chat`, {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiGetStudioOutputs(userId) {
  const res = await fetch(`/api/notebook/${userId}/studio`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // [{ id, type, output_json, created_at }, ...]
}

export async function apiSaveStudioOutput(userId, type, outputJson) {
  const res = await fetch(`/api/notebook/${userId}/studio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ type, output_json: outputJson }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ─── Chat Sessions (TutorTab, MentalLab) ─────────────────────

export async function apiGetSession(userId, session) {
  const res = await fetch(`/api/chat-session/${userId}/${session}`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // [{ role, content }, ...]
}

export async function apiSaveToSession(userId, session, role, content) {
  const res = await fetch(`/api/chat-session/${userId}/${session}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ role, content }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiClearSession(userId, session) {
  const res = await fetch(`/api/chat-session/${userId}/${session}`, {
    method: 'DELETE',
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ─── User Drafts (EssayLab, VideosTab, PodcastLab) ───────────

export async function apiGetDraft(userId, key) {
  const res = await fetch(`/api/draft/${userId}/${key}`, {
    headers: _authHeaders(),
    signal: AbortSignal.timeout(5000),
  })
  if (res.status === 404 || (res.status === 200 && res.headers.get('content-length') === '4')) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // { content, extra } or null
}

export async function apiSaveDraft(userId, key, content, extra = '') {
  const res = await fetch(`/api/draft/${userId}/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ content, extra }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
