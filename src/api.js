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

export async function apiGetProfile(deviceId) {
  const res = await fetch(`/api/profile/${deviceId}`, {
    signal: AbortSignal.timeout(5000),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

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

export async function apiUpdateProfile(deviceId, data) {
  const res = await fetch(`/api/profile/${deviceId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── XP ────────────────────────────────────────────────────────

export async function apiAddXp(deviceId, points) {
  const res = await fetch(`/api/profile/${deviceId}/xp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ streak }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // { streak: number }
}

// ── AI Config ─────────────────────────────────────────────────

export async function apiSaveAIConfig(deviceId, config) {
  // config = { provider, model, apiKey, aiKeys }
  const res = await fetch(`/api/profile/${deviceId}/ai-config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiGetAIKeys(deviceId) {
  const res = await fetch(`/api/profile/${deviceId}/ai-keys`, {
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() // { aiKeys: { gemini: "...", groq: "...", ... } }
}

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

// ── Mastery ───────────────────────────────────────────────────

export async function apiGetMastery(deviceId) {
  const res = await fetch(`/api/mastery/${deviceId}`, {
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // { subject: score, ... }
}

export async function apiSetMastery(deviceId, subject, score) {
  const res = await fetch(`/api/mastery/${deviceId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, score }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Quiz Stats ────────────────────────────────────────────────

export async function apiSaveQuizResult(deviceId, { subject, difficulty, correct, total = 1 }) {
  const res = await fetch(`/api/quiz/${deviceId}/result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, difficulty, correct, total }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiGetQuizStats(deviceId) {
  const res = await fetch(`/api/quiz/${deviceId}/stats`, {
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // { subject: { total, correct, accuracy }, ... }
}

// ─── Notebook ────────────────────────────────────────────────

export async function apiGetSources(deviceId) {
  const res = await fetch(`/api/notebook/${deviceId}/sources`, {
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // [{ id, name, type, content, icon, added_at }, ...]
}

export async function apiSaveSource(deviceId, source) {
  const res = await fetch(`/api/notebook/${deviceId}/sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

export async function apiDeleteSource(deviceId, sourceId) {
  const res = await fetch(`/api/notebook/${deviceId}/sources/${sourceId}`, {
    method: 'DELETE',
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiGetNotebookChat(deviceId) {
  const res = await fetch(`/api/notebook/${deviceId}/chat`, {
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // [{ role, content }, ...]
}

export async function apiSaveChatMessage(deviceId, role, content) {
  const res = await fetch(`/api/notebook/${deviceId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, content }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiClearNotebookChat(deviceId) {
  const res = await fetch(`/api/notebook/${deviceId}/chat`, {
    method: 'DELETE',
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiGetStudioOutputs(deviceId) {
  const res = await fetch(`/api/notebook/${deviceId}/studio`, {
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // [{ id, type, output_json, created_at }, ...]
}

export async function apiSaveStudioOutput(deviceId, type, outputJson) {
  const res = await fetch(`/api/notebook/${deviceId}/studio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, output_json: outputJson }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ─── Chat Sessions (TutorTab, MentalLab) ─────────────────────

export async function apiGetSession(deviceId, session) {
  const res = await fetch(`/api/chat-session/${deviceId}/${session}`, {
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // [{ role, content }, ...]
}

export async function apiSaveToSession(deviceId, session, role, content) {
  const res = await fetch(`/api/chat-session/${deviceId}/${session}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, content }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiClearSession(deviceId, session) {
  const res = await fetch(`/api/chat-session/${deviceId}/${session}`, {
    method: 'DELETE',
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ─── User Drafts (EssayLab, VideosTab, PodcastLab) ───────────

export async function apiGetDraft(deviceId, key) {
  const res = await fetch(`/api/draft/${deviceId}/${key}`, {
    signal: AbortSignal.timeout(5000),
  })
  if (res.status === 404 || res.status === 200 && res.headers.get('content-length') === '4') return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()   // { content, extra } or null
}

export async function apiSaveDraft(deviceId, key, content, extra = '') {
  const res = await fetch(`/api/draft/${deviceId}/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, extra }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
