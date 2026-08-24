import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LabKey, TabKey } from '../../shared/constants/plans'
import { LANG_TO_SPEECH_CODE, startVoiceInput } from '../../shared.js'
import { parseStudentVoiceIntent } from './parser'
import type { StudentVoiceIntent, StudentVoiceResult } from './types'

const TAB_ALLOWLIST: TabKey[] = [
  'home',
  'learn',
  'practice',
  'profile',
  'coach',
  'notebook',
  'learntv',
  'labs',
  'squads',
  'mistakes',
  'battles',
]

const LAB_ALLOWLIST: LabKey[] = ['quiz', 'examiner', 'samjhao', 'podcast', 'essay', 'mental']
const VOICE_MESSAGE_TTL_MS = 3000

function executeIntent(navigate: ReturnType<typeof useNavigate>, intent: StudentVoiceIntent): StudentVoiceResult {
  if (intent.intent === 'blocked') {
    return {
      ok: false,
      message: 'Student voice control only supports learning tabs. Admin commands are blocked.',
      intent,
    }
  }

  if (intent.intent === 'open_lab') {
    if (!intent.targetLab || !LAB_ALLOWLIST.includes(intent.targetLab)) {
      return { ok: false, message: 'I could not identify which lab to open.', intent }
    }
    navigate('/app/labs', { state: { openLab: intent.targetLab } })
    return { ok: true, message: `Opening ${intent.targetLab} lab.`, intent }
  }

  if (intent.intent === 'navigate_tab') {
    if (!intent.targetTab || !TAB_ALLOWLIST.includes(intent.targetTab)) {
      return { ok: false, message: 'That tab is not available in student mode.', intent }
    }
    navigate(`/app/${intent.targetTab}`)
    return { ok: true, message: `Opening ${intent.targetTab}.`, intent }
  }

  if (intent.intent === 'ask_coach') {
    const query = (intent.query || intent.raw || '').trim()
    if (!query) {
      return { ok: false, message: 'I did not catch your question. Please try again.', intent }
    }
    navigate('/app/coach', { state: { prefillQuestion: query } })
    return { ok: true, message: 'Opening AI Coach with your question.', intent }
  }

  if (intent.alternatives && intent.alternatives.length === 2) {
    return {
      ok: false,
      message: `Did you mean ${intent.alternatives[0]} or ${intent.alternatives[1]}?`,
      intent,
    }
  }

  return {
    ok: false,
    message: 'Try commands like: open notebook, open squads, start quiz lab.',
    intent,
  }
}

export function useStudentVoiceCopilot(language?: string) {
  const navigate = useNavigate()
  const [isListening, setIsListening] = useState(false)
  const [lastTranscript, setLastTranscript] = useState('')
  const [lastMessage, setLastMessage] = useState('')
  const [pendingAlternatives, setPendingAlternatives] = useState<TabKey[]>([])

  useEffect(() => {
    if (!lastMessage) return
    const timeoutId = window.setTimeout(() => {
      setLastMessage('')
      setPendingAlternatives([])
    }, VOICE_MESSAGE_TTL_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [lastMessage])

  const chooseAlternative = useCallback((targetTab: TabKey): StudentVoiceResult => {
    const intent: StudentVoiceIntent = {
      intent: 'navigate_tab',
      targetTab,
      confidence: 1,
      raw: targetTab,
    }
    const result = executeIntent(navigate, intent)
    setPendingAlternatives([])
    setLastMessage(result.message)
    return result
  }, [navigate])

  const runVoiceCommand = useCallback(async (): Promise<StudentVoiceResult> => {
    setIsListening(true)
    try {
      const selectedLanguage = (
        language && language in LANG_TO_SPEECH_CODE ? language : 'English'
      ) as keyof typeof LANG_TO_SPEECH_CODE
      const langCode = LANG_TO_SPEECH_CODE[selectedLanguage] || 'en-IN'
      const transcript = await startVoiceInput(langCode)
      setLastTranscript(transcript)

      const intent = parseStudentVoiceIntent(transcript, { pendingAlternatives })
      const result = executeIntent(navigate, intent)

      if (intent.intent === 'unknown' && intent.alternatives?.length) {
        setPendingAlternatives(intent.alternatives)
      } else {
        setPendingAlternatives([])
      }

      setLastMessage(result.message)

      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Voice input failed'
      const fallback: StudentVoiceResult = {
        ok: false,
        message: message === 'No speech detected' ? 'No speech detected. Please try again.' : message,
        intent: { intent: 'unknown', confidence: 0, raw: '' },
      }
      setPendingAlternatives([])
      setLastMessage(fallback.message)
      return fallback
    } finally {
      setIsListening(false)
    }
  }, [language, navigate, pendingAlternatives])

  return {
    isListening,
    lastTranscript,
    lastMessage,
    pendingAlternatives,
    chooseAlternative,
    runVoiceCommand,
  }
}
