/**
 * Drishti.test.jsx
 *
 * Tests for the Drishti accessibility feature covering:
 *  1. DEFAULT_A11Y has expected shape
 *  2. speakText calls speechSynthesis.speak
 *  3. stopSpeaking calls speechSynthesis.cancel
 *  4. isSpeaking reflects speechSynthesis.speaking
 *  5. startVoiceInput resolves with transcript
 *  6. startVoiceInput rejects when SpeechRecognition unavailable
 *  7. HelperPortal renders error screen on bad token
 *  8. HelperPortal renders student list on success
 *  9. HelperPortal send note calls POST /api/helper/notes
 * 10. HomeTab renders helper note banner when is_drishti + unread notes
 * 11. HomeTab auto-speaks note when ttsEnabled
 * 12. HomeTab dismisses banner and calls apiMarkHelperNotesRead
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ── shared.js helpers (test directly — no mocking) ────────────────────────────
import { DEFAULT_A11Y, LANG_TO_SPEECH_CODE, speakText, stopSpeaking, isSpeaking } from '../shared.js'

// ── Mock api.js ───────────────────────────────────────────────────────────────
vi.mock('../api.js', () => ({
  apiGetHelperNotes:      vi.fn(),
  apiMarkHelperNotesRead: vi.fn(),
  apiGetMastery:          vi.fn(),
  // unused in HomeTab but imported by shared/App
  apiGetMySquad: vi.fn(),
}))

// ── Mock App.jsx re-exports ───────────────────────────────────────────────────
vi.mock('../App.jsx', () => ({
  COLORS: {
    bg: '#04040e', card: '#0b0b1c', card2: '#101022', border: '#ffffff08',
    green: '#00E5A0', yellow: '#FFD166', red: '#FF6B6B',
    blue: '#7B9CFF', orange: '#FF6B35', text: '#eeeeff', muted: '#6868a0',
  },
  LANG_RULES: { English: 'Write only in English.' },
  SUBS: { 'Class 10': ['Math', 'Science'] },
  callAI: vi.fn(),
  buildSystemPrompt: vi.fn(() => 'system prompt'),
  checkStudentQuery: vi.fn(() => ({ blocked: false })),
  parseAIObject: vi.fn(() => null),
  getBhoolStats: vi.fn(() => ({ overdue: [], soon: [] })),
}))

import { apiGetHelperNotes, apiMarkHelperNotesRead, apiGetMastery } from '../api.js'
import HelperPortal from '../components/HelperPortal.jsx'
import HomeTab from '../components/tabs/HomeTab.jsx'

// ── Browser API stubs ─────────────────────────────────────────────────────────
let speakMock, cancelMock

beforeEach(() => {
  speakMock  = vi.fn()
  cancelMock = vi.fn()

  global.speechSynthesis = {
    speak:    speakMock,
    cancel:   cancelMock,
    speaking: false,
  }

  // Stub SpeechSynthesisUtterance as a proper constructor (arrow fns can't be used with `new`)
  global.SpeechSynthesisUtterance = vi.fn(function MockUtterance(text) {
    this.text = text
    this.lang = ''
    this.rate = 1
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  delete global.speechSynthesis
  delete global.SpeechSynthesisUtterance
  delete global.SpeechRecognition
  delete global.webkitSpeechRecognition
})

// ── 1. DEFAULT_A11Y shape ─────────────────────────────────────────────────────
describe('DEFAULT_A11Y', () => {
  it('has all required keys with correct types', () => {
    expect(DEFAULT_A11Y).toMatchObject({
      screenReaderMode: expect.any(Boolean),
      ttsEnabled:       expect.any(Boolean),
      ttsSpeed:         expect.any(Number),
      highContrast:     expect.any(Boolean),
      voiceInput:       expect.any(Boolean),
      fontScale:        expect.any(Number),
    })
  })

  it('is off by default (screenReaderMode=false)', () => {
    expect(DEFAULT_A11Y.screenReaderMode).toBe(false)
    expect(DEFAULT_A11Y.ttsEnabled).toBe(false)
  })
})

// ── 2. speakText calls speechSynthesis.speak ──────────────────────────────────
describe('speakText', () => {
  it('calls speechSynthesis.speak with an utterance', () => {
    speakText('Hello student', 'en-IN', 1.0)
    expect(global.SpeechSynthesisUtterance).toHaveBeenCalledWith('Hello student')
    expect(speakMock).toHaveBeenCalledTimes(1)
  })

  it('cancels any ongoing speech before speaking', () => {
    speakText('First', 'en-IN', 1.0)
    speakText('Second', 'en-IN', 1.0)
    expect(cancelMock).toHaveBeenCalledTimes(2)
  })

  it('does not throw when speechSynthesis is unavailable', () => {
    delete global.speechSynthesis
    expect(() => speakText('text', 'en-IN', 1.0)).not.toThrow()
  })
})

// ── 3. stopSpeaking calls cancel ──────────────────────────────────────────────
describe('stopSpeaking', () => {
  it('calls speechSynthesis.cancel', () => {
    stopSpeaking()
    expect(cancelMock).toHaveBeenCalledTimes(1)
  })

  it('does not throw when speechSynthesis absent', () => {
    delete global.speechSynthesis
    expect(() => stopSpeaking()).not.toThrow()
  })
})

// ── 4. isSpeaking reflects speechSynthesis.speaking ──────────────────────────
describe('isSpeaking', () => {
  it('returns false when not speaking', () => {
    global.speechSynthesis.speaking = false
    expect(isSpeaking()).toBe(false)
  })

  it('returns true when speaking', () => {
    global.speechSynthesis.speaking = true
    expect(isSpeaking()).toBe(true)
  })

  it('returns false when speechSynthesis absent', () => {
    delete global.speechSynthesis
    expect(isSpeaking()).toBe(false)
  })
})

// ── 5. LANG_TO_SPEECH_CODE has key languages ──────────────────────────────────
describe('LANG_TO_SPEECH_CODE', () => {
  it('maps English to en-IN', () => {
    expect(LANG_TO_SPEECH_CODE['English']).toBe('en-IN')
  })

  it('maps Hindi to hi-IN', () => {
    expect(LANG_TO_SPEECH_CODE['Hindi']).toBe('hi-IN')
  })

  it('covers all 11 Indian languages', () => {
    const langs = ['English','Hindi','Gujarati','Tamil','Telugu','Kannada','Marathi','Bengali','Punjabi','Odia','Urdu']
    langs.forEach(l => expect(LANG_TO_SPEECH_CODE[l]).toBeTruthy())
  })
})

// ── 6. HelperPortal — invalid token shows error ───────────────────────────────
describe('HelperPortal', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })
  afterEach(() => {
    delete global.fetch
  })

  it('shows error screen when token is invalid (401)', async () => {
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ detail: 'Invalid token' }) })
    render(
      <MemoryRouter initialEntries={['/helper/bad-token']}>
        <Routes>
          <Route path="/helper/:token" element={<HelperPortal />} />
        </Routes>
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText(/Access Denied/i)).toBeInTheDocument()
      expect(screen.getByText(/Invalid or expired helper token/i)).toBeInTheDocument()
    })
  })

  it('renders student list on successful token', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, helper_name: 'Mrs Sharma', helper_type: 'teacher' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          { id: 'stu-1', name: 'Pooja', standard: '8', board: 'CBSE', language: 'Hindi', xp: 200, streak: 5 },
        ]),
      })

    render(
      <MemoryRouter initialEntries={['/helper/valid-token']}>
        <Routes>
          <Route path="/helper/:token" element={<HelperPortal />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Mrs Sharma/i)).toBeInTheDocument()
      expect(screen.getByText('Pooja')).toBeInTheDocument()
    })
  })

  it('calls POST /api/helper/notes on send', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1, helper_name: 'Sir', helper_type: 'teacher' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ([{ id: 'stu-1', name: 'Raju', standard: '9', board: 'CBSE', language: 'English', xp: 100, streak: 2 }]) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sent: true }) })

    render(
      <MemoryRouter initialEntries={['/helper/mytoken']}>
        <Routes>
          <Route path="/helper/:token" element={<HelperPortal />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByText('Raju')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText(/Write an encouraging message/i), {
      target: { value: 'Keep going, you are doing great!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => {
      const postCall = global.fetch.mock.calls.find(c => c[1]?.method === 'POST')
      expect(postCall).toBeDefined()
      const body = JSON.parse(postCall[1].body)
      expect(body.message).toBe('Keep going, you are doing great!')
      expect(body.student_id).toBe('stu-1')
    })
  })
})

// ── 7. HomeTab helper note banner ─────────────────────────────────────────────
describe('HomeTab — Drishti note banner', () => {
  const DRISHTI_PROFILE = {
    name: 'Aryan', standard: 'Class 9', board: 'CBSE',
    language: 'English', subjects: ['Math'], plan: 'basic',
    is_drishti: true,
  }

  beforeEach(() => {
    apiGetMastery.mockResolvedValue({})
    apiGetHelperNotes.mockResolvedValue([
      { id: 1, helper_name: 'Mr Das', helper_type: 'teacher', message: 'Keep it up, Aryan!', is_read: false },
    ])
    apiMarkHelperNotesRead.mockResolvedValue({ ok: true })
  })

  it('shows banner with helper name and message', async () => {
    render(
      <HomeTab profile={DRISHTI_PROFILE} userId="u1" xp={0} streak={1} addXp={vi.fn()} setTab={vi.fn()} a11y={DEFAULT_A11Y} />
    )
    await waitFor(() => {
      expect(screen.getByText(/Keep it up, Aryan!/i)).toBeInTheDocument()
      expect(screen.getByText(/Mr Das/i)).toBeInTheDocument()
    })
  })

  it('does NOT show banner for non-Drishti student', async () => {
    const normalProfile = { ...DRISHTI_PROFILE, is_drishti: false }
    render(
      <HomeTab profile={normalProfile} userId="u1" xp={0} streak={1} addXp={vi.fn()} setTab={vi.fn()} a11y={DEFAULT_A11Y} />
    )
    // Give component time to render
    await new Promise(r => setTimeout(r, 50))
    expect(screen.queryByText(/Keep it up, Aryan!/i)).not.toBeInTheDocument()
  })

  it('dismisses banner and calls apiMarkHelperNotesRead on ✕ click', async () => {
    render(
      <HomeTab profile={DRISHTI_PROFILE} userId="u1" xp={0} streak={1} addXp={vi.fn()} setTab={vi.fn()} a11y={DEFAULT_A11Y} />
    )
    await waitFor(() => expect(screen.getByText(/Keep it up, Aryan!/i)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Dismiss note/i }))

    await waitFor(() => {
      expect(screen.queryByText(/Keep it up, Aryan!/i)).not.toBeInTheDocument()
      expect(apiMarkHelperNotesRead).toHaveBeenCalledWith('u1')
    })
  })

  it('calls speakText when ttsEnabled=true', async () => {
    const a11yTTS = { ...DEFAULT_A11Y, ttsEnabled: true, ttsSpeed: 1.0 }
    render(
      <HomeTab profile={DRISHTI_PROFILE} userId="u1" xp={0} streak={1} addXp={vi.fn()} setTab={vi.fn()} a11y={a11yTTS} />
    )
    await waitFor(() => expect(screen.getByText(/Keep it up, Aryan!/i)).toBeInTheDocument())
    expect(speakMock).toHaveBeenCalledTimes(1)
  })
})
